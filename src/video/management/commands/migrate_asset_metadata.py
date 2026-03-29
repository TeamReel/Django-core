"""Migrate all teamreel_assets metadata to nested role/kit/variant format.

Converts the 4 historical formats into the canonical nested structure::

    roles.{role}.{images|videos}.{asset_type}.{kit}.{variant} = variant_value

Backs up the original data in ``_legacy_assets`` for rollback safety.

Usage::

    python manage.py migrate_asset_metadata --dry-run          # preview
    python manage.py migrate_asset_metadata --org my-org-slug  # single org
    python manage.py migrate_asset_metadata                    # full run
"""

from __future__ import annotations

import copy
import logging
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

logger = logging.getLogger(__name__)

# Known kit prefixes — used to split composite keys
KNOWN_KITS = frozenset({"home", "away", "third", "goalkeeper"})

# Image asset types (stored under images.{type}.{kit} = variant_value)
IMAGE_TYPES = frozenset({"fullbody", "halfbody", "closeup", "action_photo"})


def _get_primary_role(membership: Any) -> str:
    """Determine the primary functional role for a membership."""
    meta = getattr(membership, "metadata", None) or {}
    roles = meta.get("functional_roles") or []
    if roles:
        return roles[0]
    return "player"


def _role_for_kit(membership: Any, kit: str) -> str:
    """Determine which role owns assets for a given kit."""
    if kit == "goalkeeper":
        return "keeper"
    meta = getattr(membership, "metadata", None) or {}
    roles = meta.get("functional_roles") or []
    if "player" in roles:
        return "player"
    if roles:
        return roles[0]
    return "player"


def _normalize_variant_value(raw_val: Any) -> dict | None:
    """Normalize a legacy variant value into the standard dict shape.

    Returns None if the value is empty or unrecognizable.
    """
    if raw_val is None:
        return None

    if isinstance(raw_val, str):
        if not raw_val:
            return None
        return {"raw": raw_val}

    if isinstance(raw_val, dict):
        # Already dict — ensure it has at least raw or processed
        if raw_val.get("raw") or raw_val.get("processed") or raw_val.get("processing_state"):
            return dict(raw_val)
        return None

    return None


def _split_composite_key(composite_key: str) -> tuple[str, str]:
    """Split a composite key like 'home_arms_crossed' into (kit, variant).

    If the key starts with a known kit prefix, split there.
    Otherwise treat the whole key as a variant and infer kit as 'home'.
    """
    for kit in KNOWN_KITS:
        if composite_key == kit:
            return kit, "default"
        if composite_key.startswith(kit + "_"):
            variant = composite_key[len(kit) + 1 :]
            return kit, variant if variant else "default"

    # Bare variant (no kit prefix) — this is Format 2
    return "home", composite_key if composite_key else "default"


def _set_nested(
    roles_dict: dict,
    role: str,
    media_type: str,
    asset_type: str,
    kit: str,
    variant: str,
    value: dict,
) -> None:
    """Set a value in the nested roles structure."""
    role_data = roles_dict.setdefault(role, {})
    type_data = role_data.setdefault(media_type, {})
    asset_data = type_data.setdefault(asset_type, {})
    kit_data = asset_data.setdefault(kit, {})
    kit_data[variant] = value


def _migrate_images(
    membership: Any,
    images: dict,
    roles_dict: dict,
    stats: dict,
) -> None:
    """Migrate root-level images.{type}.{key} → roles.{role}.images.{type}.{kit}.{variant}."""
    for asset_type, category_data in images.items():
        if not isinstance(category_data, dict):
            continue

        for key, raw_val in category_data.items():
            normalized = _normalize_variant_value(raw_val)
            if normalized is None:
                continue

            # Images use key directly as kit (e.g. images.fullbody.home)
            # For legacy format, key might be 'legacy' — keep as kit
            kit = key
            variant = "default"
            role = _role_for_kit(membership, kit)

            _set_nested(roles_dict, role, "images", asset_type, kit, variant, normalized)
            stats["variants_migrated"] += 1


def _migrate_videos(
    membership: Any,
    videos: dict,
    roles_dict: dict,
    stats: dict,
) -> None:
    """Migrate root-level videos.{type}.{composite_key} →
    roles.{role}.videos.{type}.{kit}.{variant}."""
    for asset_type, category_data in videos.items():
        if not isinstance(category_data, dict):
            continue

        for composite_key, raw_val in category_data.items():
            normalized = _normalize_variant_value(raw_val)
            if normalized is None:
                continue

            kit, variant = _split_composite_key(composite_key)
            role = _role_for_kit(membership, kit)

            _set_nested(roles_dict, role, "videos", asset_type, kit, variant, normalized)
            stats["variants_migrated"] += 1


def _migrate_flat_media(
    membership: Any,
    media: dict,
    roles_dict: dict,
    stats: dict,
) -> None:
    """Migrate legacy flat media.{slot}.url → roles.{role}.images.{type}.{kit}.default.

    Only migrates media entries that indicate a fullbody or kit asset
    (Format 1 — oldest format).
    """
    for slot_name, slot_data in media.items():
        if not isinstance(slot_data, dict):
            continue
        url = slot_data.get("url")
        if not url:
            continue

        # Map slot names to asset types
        if slot_name == "kit":
            asset_type = "fullbody"
        elif slot_name in IMAGE_TYPES:
            asset_type = slot_name
        else:
            # Video/other slots handled via videos dict, skip here
            continue

        role = _get_primary_role(membership)
        kit = "home"  # Flat media has no kit info, default to home
        variant_value = {"raw": url}

        # Only set if not already migrated from a more specific source
        role_data = roles_dict.get(role, {})
        existing = role_data.get("images", {}).get(asset_type, {}).get(kit, {}).get("default")
        if existing is None:
            _set_nested(roles_dict, role, "images", asset_type, kit, "default", variant_value)
            stats["variants_migrated"] += 1


def migrate_membership(
    membership: Any,
    *,
    dry_run: bool = False,
) -> dict:
    """Migrate a single membership's metadata.

    Returns stats dict with counts of what was migrated.
    """
    stats: dict[str, int] = {
        "variants_migrated": 0,
        "already_migrated": 0,
        "skipped": 0,
    }

    meta = getattr(membership, "metadata", None) or {}
    tr = meta.get("teamreel_assets")

    if not tr or not isinstance(tr, dict):
        stats["skipped"] = 1
        return stats

    # Already migrated?
    if "_legacy_assets" in tr:
        stats["already_migrated"] = 1
        return stats

    images = tr.get("images", {}) or {}
    videos = tr.get("videos", {}) or {}
    media = tr.get("media", {}) or {}

    # Already in new format? (has roles and no root images/videos)
    if tr.get("roles") and not images and not videos:
        stats["already_migrated"] = 1
        return stats

    # Build new nested structure
    roles_dict: dict = {}

    # Migrate in priority order: specific (images/videos) before generic (media)
    _migrate_images(membership, images, roles_dict, stats)
    _migrate_videos(membership, videos, roles_dict, stats)
    _migrate_flat_media(membership, media, roles_dict, stats)

    if not roles_dict:
        stats["skipped"] = 1
        return stats

    if dry_run:
        return stats

    # Backup original data
    tr["_legacy_assets"] = {
        "images": copy.deepcopy(images),
        "videos": copy.deepcopy(videos),
        "media": copy.deepcopy(media),
        "migrated_at": timezone.now().isoformat(),
    }

    # Write new structure
    tr["roles"] = roles_dict

    # Remove root-level data (now lives under roles.*)
    tr.pop("images", None)
    tr.pop("videos", None)

    # Keep media.* aliases for backward compat (frontend reads them)
    # They will be removed in a later phase (H5)

    meta["teamreel_assets"] = tr
    membership.metadata = meta
    membership.save(update_fields=["metadata", "updated_at"])

    return stats


class Command(BaseCommand):
    help = "Migrate all teamreel_assets metadata to nested role/kit/variant format"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview only — don't write changes",
        )
        parser.add_argument(
            "--org",
            type=str,
            help="Migrate only memberships for this organisation slug",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of memberships to process per batch (default: 100)",
        )

    def handle(self, *args, **options):
        from projects.models import ProjectMembership

        dry_run = options["dry_run"]
        org_slug = options.get("org")
        batch_size = options["batch_size"]

        qs = ProjectMembership.objects.select_related(
            "project__organisation",
        ).filter(deleted_at__isnull=True)

        if org_slug:
            qs = qs.filter(project__organisation__slug=org_slug)

        total = qs.count()
        self.stdout.write(f"Found {total} memberships to check")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be written"))

        totals = {"migrated": 0, "already": 0, "skipped": 0, "errors": 0, "variants": 0}

        for i, membership in enumerate(qs.iterator(chunk_size=batch_size)):
            try:
                result = migrate_membership(membership, dry_run=dry_run)

                if result["already_migrated"]:
                    totals["already"] += 1
                elif result["skipped"]:
                    totals["skipped"] += 1
                else:
                    totals["migrated"] += 1
                    totals["variants"] += result["variants_migrated"]
            except Exception:
                logger.exception(
                    "Failed to migrate membership %s",
                    membership.pk,
                )
                totals["errors"] += 1

            if (i + 1) % batch_size == 0:
                self.stdout.write(f"  Processed {i + 1}/{total}...")

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{prefix}Migration complete:\n"
                f"  Migrated: {totals['migrated']} ({totals['variants']} variants)\n"
                f"  Already migrated: {totals['already']}\n"
                f"  Skipped (no data): {totals['skipped']}\n"
                f"  Errors: {totals['errors']}"
            )
        )

"""Reset TeamReel processed assets while keeping raw AI content.

This command clears only the processed variants in
ProjectMembership.metadata.teamreel_assets and optionally deletes the
processed objects from storage.

Typical use-case: re-run background removal / format conversion after changing
processing modules or output specs.

Safety defaults:
- Dry-run by default
- Storage deletion is opt-in
- Reprocessing enqueue is opt-in
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from importlib import import_module
from typing import Any
from urllib.parse import urlparse

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from src.video.services.asset_processing_specs import ProcessingState

logger = logging.getLogger(__name__)


def _get_storage_backend():
    # Imported dynamically to avoid static-analysis path issues; runtime paths
    # are configured by manage.py / deployment environment.
    return import_module("files.utils").get_storage_backend()


@dataclass
class VariantRef:
    membership_id: str
    asset_type: str
    kit_type: str
    variant_id: str | None
    raw_url: str


def _storage_key_from_value(value: str) -> str | None:
    """Best-effort extraction of a storage key from a stored URL/path."""
    if not value:
        return None

    # Most of our code stores keys like "members/<id>/processed/...".
    if "://" not in value and not value.startswith("/"):
        return value

    parsed = urlparse(value)

    # s3://bucket/key
    if parsed.scheme == "s3":
        return parsed.path.lstrip("/")

    # http(s)://.../key or /media/key
    path = parsed.path or value

    media_url = getattr(settings, "MEDIA_URL", "/media/") or "/media/"
    if path.startswith(media_url):
        path = path[len(media_url) :]

    return path.lstrip("/") if path else None


def _normalize_reset_variant(
    variant_val: Any,
) -> tuple[dict[str, Any] | None, str | None, bool]:
    """Return (new_variant_dict, processed_to_delete, safe_to_delete).

    safe_to_delete=False when we had to salvage processed→raw.
    """

    if not variant_val:
        return None, None, False

    if isinstance(variant_val, str):
        # Old format: treat as raw.
        return (
            {
                "raw": variant_val,
                "processed": None,
                "processing_state": ProcessingState.RAW.value,
            },
            None,
            False,
        )

    if not isinstance(variant_val, dict):
        return None, None, False

    raw_url = variant_val.get("raw")
    processed_url = variant_val.get("processed")

    # If raw is missing but processed exists, we must not delete the only value.
    if not raw_url and processed_url:
        return (
            {
                **{
                    k: v
                    for k, v in variant_val.items()
                    if k not in ("processed", "processing_state")
                },
                "raw": processed_url,
                "processed": None,
                "processing_state": ProcessingState.RAW.value,
            },
            None,
            False,
        )

    return (
        {
            **{k: v for k, v in variant_val.items() if k not in ("processed", "processing_state")},
            "raw": raw_url,
            "processed": None,
            "processing_state": ProcessingState.RAW.value,
        },
        processed_url,
        True,
    )


class Command(BaseCommand):
    help = "Clear processed TeamReel assets (keep raw), optionally delete + reprocess"

    def add_arguments(self, parser):
        parser.add_argument(
            "--project-slug",
            required=True,
            help="Project slug (e.g. ajax-1)",
        )
        parser.add_argument(
            "--membership-id",
            required=False,
            help="Optional ProjectMembership UUID to target a single member",
        )
        parser.add_argument(
            "--user-email",
            required=False,
            help="Optional user email to target a single member (within this project)",
        )
        parser.add_argument(
            "--list",
            action="store_true",
            help="List memberships in this project (id + name + email) and exit",
        )
        parser.add_argument(
            "--asset-types",
            required=False,
            default="fullbody,closeup,intro,celebration",
            help=(
                "Comma-separated subset of asset types to reset:"
                " fullbody,closeup,intro,celebration"
            ),
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually write changes (default is dry-run)",
        )
        parser.add_argument(
            "--delete-processed",
            action="store_true",
            help="Delete processed objects from storage when a key can be derived",
        )
        parser.add_argument(
            "--enqueue",
            action="store_true",
            help="Enqueue reprocessing tasks for reset variants (requires Celery broker)",
        )

    def handle(self, *args, **options):
        project_slug: str = options["project_slug"]
        membership_id: str | None = options.get("membership_id")
        user_email: str | None = options.get("user_email")
        do_list: bool = bool(options.get("list"))
        do_apply: bool = options["apply"]
        delete_processed: bool = options["delete_processed"]
        enqueue: bool = options["enqueue"]
        asset_types_raw: str = options.get("asset_types") or ""

        requested_asset_types = [s.strip() for s in asset_types_raw.split(",") if s.strip()]
        allowed_asset_types = {"fullbody", "closeup", "intro", "celebration"}
        asset_types = (
            set(requested_asset_types) if requested_asset_types else set(allowed_asset_types)
        )
        unknown = sorted(asset_types - allowed_asset_types)
        if unknown:
            raise CommandError(
                f"Unknown --asset-types values: {unknown}. Allowed: {sorted(allowed_asset_types)}"
            )

        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        projects = list(Project.all_objects.filter(slug=project_slug)[:5])
        if not projects:
            raise CommandError(f"Project not found for slug={project_slug}")
        if len(projects) > 1:
            raise CommandError(
                "Multiple projects found for this slug; re-run with a unique slug. "
                f"Matches: {[str(p.id) + ':' + p.name for p in projects]}"
            )
        project = projects[0]

        qs = (
            ProjectMembership.objects.active()
            .select_related("user")
            .filter(project=project, metadata__has_key="teamreel_assets")
        )

        if membership_id and user_email:
            raise CommandError("Use only one of --membership-id or --user-email")

        if user_email:
            qs = qs.filter(user__email__iexact=user_email)

        if do_list:
            # List even if teamreel_assets missing, so user can pick someone to target.
            list_qs = (
                ProjectMembership.objects.active()
                .select_related("user")
                .filter(project=project)
                .order_by("user__email")
            )
            self.stdout.write(f"Memberships in project '{project.slug}':")
            shown = 0
            for m in list_qs.iterator(chunk_size=200):
                email = getattr(m.user, "email", "") if m.user_id else ""
                name = (
                    m.user.get_full_name() if m.user_id and hasattr(m.user, "get_full_name") else ""
                )
                has_tr = bool((m.metadata or {}).get("teamreel_assets"))
                self.stdout.write(
                    f"- {m.id} | {name or '(no name)'}"
                    f" | {email or '(no email)'} | teamreel_assets={has_tr}"
                )
                shown += 1
                if shown >= 200:
                    self.stdout.write("(stopped after 200; narrow with --user-email)")
                    break
            return

        if membership_id:
            qs = qs.filter(id=membership_id)
            if not qs.exists():
                raise CommandError(
                    f"No active membership found for id={membership_id}"
                    f" in project '{project.slug}'."
                )

        if user_email and not qs.exists():
            raise CommandError(
                f"No active membership found for user_email={user_email}"
                f" in project '{project.slug}'."
            )

        total = qs.count()
        self.stdout.write(
            f"Found {total} memberships with teamreel_assets in project '{project.slug}'."
        )

        backend = _get_storage_backend() if delete_processed else None
        to_reprocess: list[VariantRef] = []

        cleared = 0
        deletions_attempted = 0
        deletions_succeeded = 0
        salvaged = 0

        for membership in qs.iterator(chunk_size=200):
            meta = membership.metadata or {}
            tr = meta.get("teamreel_assets", {}) or {}

            roles_data = tr.get("roles", {}) or {}
            media = tr.get("media", {}) or {}

            membership_changed = False

            for _, role_data in roles_data.items():
                if not isinstance(role_data, dict):
                    continue

                # Images: roles.{role}.images.{asset_type}.{kit}.{variant}
                role_images = role_data.get("images", {}) or {}
                for asset_type in ("fullbody", "closeup"):
                    if asset_type not in asset_types:
                        continue
                    asset_data = role_images.get(asset_type, {})
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in list(asset_data.items()):
                        if not isinstance(kit_data, dict):
                            continue
                        for variant_id, variant_val in list(kit_data.items()):
                            (
                                new_variant,
                                processed_to_delete,
                                safe_to_delete,
                            ) = _normalize_reset_variant(variant_val)
                            if not new_variant:
                                continue

                            old_processed = processed_to_delete
                            if isinstance(variant_val, dict) and variant_val.get("processed"):
                                cleared += 1

                            if (
                                isinstance(variant_val, dict)
                                and not variant_val.get("raw")
                                and variant_val.get("processed")
                            ):
                                salvaged += 1

                            kit_data[variant_id] = new_variant
                            membership_changed = True

                            # Keep legacy media slots in sync
                            best_url = new_variant.get("raw")
                            if best_url:
                                media.setdefault(asset_type, {})
                                if isinstance(media[asset_type], dict):
                                    media[asset_type]["url"] = best_url
                                else:
                                    media[asset_type] = {"url": best_url, "caption": ""}

                                if asset_type == "fullbody":
                                    media.setdefault("kit", {})
                                    if isinstance(media["kit"], dict):
                                        media["kit"]["url"] = best_url
                                    else:
                                        media["kit"] = {"url": best_url, "caption": ""}

                                if asset_type == "closeup":
                                    media.setdefault("closeup", {})
                                    if isinstance(media["closeup"], dict):
                                        media["closeup"]["url"] = best_url
                                    else:
                                        media["closeup"] = {"url": best_url, "caption": ""}

                            if delete_processed and backend and old_processed and safe_to_delete:
                                key = _storage_key_from_value(old_processed)
                                raw_key = _storage_key_from_value(best_url) if best_url else None
                                if key and (not raw_key or key != raw_key):
                                    deletions_attempted += 1
                                    if do_apply:
                                        ok = backend.delete(key)
                                        if ok:
                                            deletions_succeeded += 1

                            if enqueue:
                                raw_url = new_variant.get("raw")
                                if raw_url:
                                    to_reprocess.append(
                                        VariantRef(
                                            membership_id=str(membership.id),
                                            asset_type=asset_type,
                                            kit_type=str(kit_type),
                                            variant_id=variant_id
                                            if variant_id != "default"
                                            else None,
                                            raw_url=str(raw_url),
                                        )
                                    )

                # Videos: roles.{role}.videos.{asset_type}.{kit}.{variant}
                role_videos = role_data.get("videos", {}) or {}
                for asset_type in ("intro", "celebration"):
                    if asset_type not in asset_types:
                        continue
                    asset_data = role_videos.get(asset_type, {})
                    if not isinstance(asset_data, dict):
                        continue

                    for kit_type, kit_data in list(asset_data.items()):
                        if not isinstance(kit_data, dict):
                            continue
                        for variant_id, variant_val in list(kit_data.items()):
                            (
                                new_variant,
                                processed_to_delete,
                                safe_to_delete,
                            ) = _normalize_reset_variant(variant_val)
                            if not new_variant:
                                continue

                            if isinstance(variant_val, dict) and variant_val.get("processed"):
                                cleared += 1

                            if (
                                isinstance(variant_val, dict)
                                and not variant_val.get("raw")
                                and variant_val.get("processed")
                            ):
                                salvaged += 1

                            kit_data[variant_id] = new_variant
                            membership_changed = True

                            # Sync media.intro/media.celebration
                            best_url = new_variant.get("raw")
                            if best_url:
                                media.setdefault(asset_type, {})
                                if isinstance(media[asset_type], dict):
                                    media[asset_type]["url"] = best_url
                                else:
                                    media[asset_type] = {"url": best_url, "caption": ""}

                            if (
                                delete_processed
                                and backend
                                and processed_to_delete
                                and safe_to_delete
                            ):
                                key = _storage_key_from_value(processed_to_delete)
                                raw_key = _storage_key_from_value(best_url) if best_url else None
                                if key and (not raw_key or key != raw_key):
                                    deletions_attempted += 1
                                    if do_apply:
                                        ok = backend.delete(key)
                                        if ok:
                                            deletions_succeeded += 1

                            if enqueue:
                                raw_url = new_variant.get("raw")
                                if raw_url:
                                    to_reprocess.append(
                                        VariantRef(
                                            membership_id=str(membership.id),
                                            asset_type=asset_type,
                                            kit_type=str(kit_type),
                                            variant_id=variant_id
                                            if variant_id != "default"
                                            else None,
                                            raw_url=str(raw_url),
                                        )
                                    )

            if membership_changed:
                tr["media"] = media
                meta["teamreel_assets"] = tr

                if do_apply:
                    membership.metadata = meta
                    membership.save(update_fields=["metadata", "updated_at"])

        self.stdout.write(
            f"Done. cleared={cleared}, salvaged_processed_to_raw={salvaged}, "
            f"delete_attempted={deletions_attempted}, delete_succeeded={deletions_succeeded}."
        )

        if enqueue:
            if not to_reprocess:
                self.stdout.write("No variants found to reprocess.")
                return

            if not do_apply:
                self.stdout.write(
                    f"Dry-run: would enqueue {len(to_reprocess)}"
                    " processing tasks. Re-run with --apply."
                )
                return

            try:
                from src.video.tasks.asset_processing import process_member_asset
            except Exception as exc:
                raise CommandError(f"Failed to import Celery task: {exc}") from exc

            enqueued = 0
            for ref in to_reprocess:
                process_member_asset.delay(
                    membership_id=ref.membership_id,
                    asset_type=ref.asset_type,
                    kit_type=ref.kit_type,
                    raw_url=ref.raw_url,
                    variant_id=ref.variant_id,
                )
                enqueued += 1

            self.stdout.write(f"Enqueued {enqueued} processing tasks.")

        if delete_processed and not do_apply:
            self.stdout.write("Dry-run: no storage objects were deleted.")

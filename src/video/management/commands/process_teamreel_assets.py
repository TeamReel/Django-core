"""Process (or re-process) TeamReel member assets from raw → processed.

This is an operational management command intended for batch reprocessing when
processed variants were cleared (or when specs/pipelines changed).

Key properties:
- Processes ONLY variants that have raw and are missing processed (safe default)
- Uses RVM for intro/celebration (video), rembg for fullbody/closeup (images)
- Updates ProjectMembership.metadata.teamreel_assets in-place

Run inside Railway (recommended) so it has DB + storage credentials.
"""

from __future__ import annotations

import logging
from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from src.video.services.asset_processor import AssetProcessor

logger = logging.getLogger(__name__)


def _iter_variants_to_process(
    teamreel_assets: dict[str, Any],
    *,
    asset_types: set[str],
) -> list[dict[str, Any]]:
    """Return a list of variant refs describing what should be processed."""

    refs: list[dict[str, Any]] = []

    images = teamreel_assets.get("images", {}) or {}
    videos = teamreel_assets.get("videos", {}) or {}

    if "fullbody" in asset_types:
        cat = images.get("fullbody", {})
        if isinstance(cat, dict):
            for kit_type, variant_val in cat.items():
                if not isinstance(variant_val, dict):
                    continue
                raw_url = variant_val.get("raw")
                processed_url = variant_val.get("processed")
                if raw_url and not processed_url:
                    refs.append(
                        {
                            "asset_type": "fullbody",
                            "kit_type": str(kit_type),
                            "variant_id": None,
                            "raw_url": str(raw_url),
                        }
                    )

    if "closeup" in asset_types:
        cat = images.get("closeup", {})
        if isinstance(cat, dict):
            for kit_type, variant_val in cat.items():
                if not isinstance(variant_val, dict):
                    continue
                raw_url = variant_val.get("raw")
                processed_url = variant_val.get("processed")
                if raw_url and not processed_url:
                    refs.append(
                        {
                            "asset_type": "closeup",
                            "kit_type": str(kit_type),
                            "variant_id": None,
                            "raw_url": str(raw_url),
                        }
                    )

    for video_type in ("intro", "celebration"):
        if video_type not in asset_types:
            continue
        cat = videos.get(video_type, {})
        if not isinstance(cat, dict):
            continue

        for composite_key, variant_val in cat.items():
            if not isinstance(variant_val, dict):
                continue

            raw_url = variant_val.get("raw")
            processed_url = variant_val.get("processed")
            if not raw_url or processed_url:
                continue

            kit_type = composite_key.split("_", 1)[0]
            variant_id = composite_key.split("_", 1)[1] if "_" in composite_key else None

            refs.append(
                {
                    "asset_type": video_type,
                    "kit_type": str(kit_type),
                    "variant_id": variant_id,
                    "raw_url": str(raw_url),
                }
            )

    return refs


def _update_variant_metadata(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
    variant_value: dict[str, Any],
) -> None:
    from src.video.utils.asset_metadata import (
        infer_role,
        media_type_for_asset,
        set_variant_value,
        update_media_aliases,
    )

    role = infer_role(membership, kit_type)
    mt = media_type_for_asset(asset_type)
    variant = variant_id if variant_id and variant_id != kit_type else "default"

    set_variant_value(membership, role, mt, asset_type, kit_type, variant, variant_value)

    best_url = (
        variant_value.get("preview_url")
        or variant_value.get("processed")
        or variant_value.get("raw")
    )
    if best_url:
        update_media_aliases(membership, asset_type, best_url)

    membership.save(update_fields=["metadata", "updated_at"])


class Command(BaseCommand):
    help = "Process TeamReel assets (raw → processed) for a project"

    def add_arguments(self, parser):
        parser.add_argument("--project-slug", required=True)
        parser.add_argument("--membership-id", required=False)
        parser.add_argument("--user-email", required=False)
        parser.add_argument(
            "--asset-types",
            required=False,
            default="fullbody,closeup,intro",
            help="Comma-separated subset: fullbody,closeup,intro,celebration",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually process and write updates (default is dry-run)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Optional max number of variants to process (0 = no limit)",
        )

    def handle(self, *args, **options):
        project_slug: str = options["project_slug"]
        membership_id: str | None = options.get("membership_id")
        user_email: str | None = options.get("user_email")
        do_apply: bool = bool(options.get("apply"))
        limit: int = int(options.get("limit") or 0)

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

        if membership_id and user_email:
            raise CommandError("Use only one of --membership-id or --user-email")

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
            .select_related("user", "project")
            .filter(project=project, metadata__has_key="teamreel_assets")
        )
        if membership_id:
            qs = qs.filter(id=membership_id)
        if user_email:
            qs = qs.filter(user__email__iexact=user_email)

        total_memberships = qs.count()
        self.stdout.write(
            f"Found {total_memberships} memberships with teamreel_assets in project '{project.slug}'."
        )

        processor = AssetProcessor()
        processed_count = 0
        skipped_count = 0
        error_count = 0

        for membership in qs.iterator(chunk_size=50):
            tr = (membership.metadata or {}).get("teamreel_assets", {}) or {}
            refs = _iter_variants_to_process(tr, asset_types=asset_types)

            for ref in refs:
                if limit and processed_count >= limit:
                    self.stdout.write(f"Reached --limit={limit}, stopping.")
                    if not do_apply:
                        self.stdout.write(
                            f"Dry-run: would process {processed_count} variants. Re-run with --apply."
                        )
                    else:
                        self.stdout.write(
                            f"Done. processed={processed_count}, skipped={skipped_count}, errors={error_count}."
                        )
                    return

                asset_type = ref["asset_type"]
                kit_type = ref["kit_type"]
                variant_id = ref["variant_id"]
                raw_url = ref["raw_url"]

                if not do_apply:
                    processed_count += 1
                    continue

                try:
                    bg_backend = "rvm" if asset_type in ("intro", "celebration") else "rembg"

                    result = processor.process_asset(
                        raw_url=raw_url,
                        asset_type=asset_type,
                        membership_id=str(membership.id),
                        kit_type=kit_type,
                        variant_id=variant_id,
                        organisation_id=str(membership.project.organisation_id)
                        if hasattr(membership.project, "organisation_id")
                        else None,
                        bg_removal_backend=bg_backend,
                    )

                    membership.refresh_from_db()
                    with transaction.atomic():
                        _update_variant_metadata(
                            membership,
                            asset_type=asset_type,
                            kit_type=kit_type,
                            variant_id=variant_id,
                            variant_value=result,
                        )

                    processed_count += 1

                except Exception as exc:  # noqa: BLE001
                    error_count += 1
                    logger.exception(
                        "Failed processing variant",
                        extra={
                            "membership_id": str(membership.id),
                            "asset_type": asset_type,
                            "kit_type": kit_type,
                            "variant_id": variant_id,
                        },
                    )
                    self.stderr.write(
                        f"ERROR membership={membership.id} asset={asset_type} kit={kit_type} variant={variant_id or '-'}: {exc}"
                    )

            skipped_count += 0

        if not do_apply:
            self.stdout.write(
                f"Dry-run: would process {processed_count} variants. Re-run with --apply."
            )
            return

        self.stdout.write(
            f"Done. processed={processed_count}, skipped={skipped_count}, errors={error_count}."
        )

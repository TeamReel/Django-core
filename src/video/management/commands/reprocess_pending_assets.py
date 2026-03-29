"""Reprocess stuck/unprocessed TeamReel assets.

Scans all memberships for assets stuck in 'processing', 'pending', 'raw',
or 'failed' states and re-queues them for processing. Also creates missing
closeup/halfbody crops from processed fullbodies.

Usage:
    # Dry-run for a specific project
    python manage.py reprocess_pending_assets --project-slug=helden-6 --dry-run

    # Apply for all projects
    python manage.py reprocess_pending_assets --apply

    # Fix only stuck assets (processing for >30 min)
    python manage.py reprocess_pending_assets --apply --stuck-only --stuck-minutes=30

    # Fix only missing closeup/halfbody
    python manage.py reprocess_pending_assets --apply --missing-crops-only
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.apps import apps
from django.core.management.base import BaseCommand
from django.utils import timezone

logger = logging.getLogger(__name__)

# States that mean an asset needs reprocessing
STUCK_STATES = {"processing", "cancelling"}
REPROCESS_STATES = {"pending", "failed"}


class Command(BaseCommand):
    help = "Reprocess stuck/unprocessed assets and create missing crops"

    def add_arguments(self, parser):
        parser.add_argument(
            "--project-slug",
            type=str,
            help="Only process memberships in this project slug",
        )
        parser.add_argument(
            "--project-id",
            type=str,
            help="Only process memberships in this project ID (UUID)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Actually apply changes (required to make changes)",
        )
        parser.add_argument(
            "--stuck-only",
            action="store_true",
            help="Only fix assets stuck in 'processing' state",
        )
        parser.add_argument(
            "--missing-crops-only",
            action="store_true",
            help="Only create missing closeup/halfbody from processed fullbodies",
        )
        parser.add_argument(
            "--stuck-minutes",
            type=int,
            default=30,
            help="Minutes after which 'processing' state is considered stuck (default: 30)",
        )
        parser.add_argument(
            "--requeue",
            action="store_true",
            help="Re-queue stuck assets for Celery processing instead of just resetting state",
        )

    def handle(self, *args, **options):
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        project_slug = options.get("project_slug")
        project_id = options.get("project_id")
        dry_run = options.get("dry_run", False)
        apply = options.get("apply", False)
        stuck_only = options.get("stuck_only", False)
        missing_crops_only = options.get("missing_crops_only", False)
        stuck_minutes = options.get("stuck_minutes", 30)
        requeue = options.get("requeue", False)

        if not dry_run and not apply:
            self.stderr.write(self.style.ERROR("Must specify --dry-run or --apply"))
            return

        is_dry_run = dry_run or not apply

        queryset = ProjectMembership.objects.select_related("project").all()
        if project_slug:
            queryset = queryset.filter(project__slug=project_slug)
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        self.stdout.write(
            f"Scanning {queryset.count()} memberships "
            f"({'DRY RUN' if is_dry_run else 'APPLY MODE'})..."
        )

        stuck_threshold = timezone.now() - timedelta(minutes=stuck_minutes)

        stats = {
            "images_reset": 0,
            "images_requeued": 0,
            "videos_reset": 0,
            "videos_requeued": 0,
            "closeups_created": 0,
            "halfbodies_created": 0,
            "members_modified": 0,
        }

        for membership in queryset.iterator():
            meta = getattr(membership, "metadata", None) or {}
            tr = meta.get("teamreel_assets", {})
            if not tr:
                continue

            member_changed = False
            member_name = (
                f"{membership.user.first_name} {membership.user.last_name}"
                if hasattr(membership, "user") and membership.user
                else str(membership.id)
            )

            # ── 1. Fix stuck/failed images ──────────────────────────────
            if not missing_crops_only:
                roles_data = tr.get("roles", {}) or {}
                for role_name, role_data in roles_data.items():
                    if not isinstance(role_data, dict):
                        continue
                    images = role_data.get("images", {}) or {}
                    for asset_type, asset_data in images.items():
                        if not isinstance(asset_data, dict):
                            continue
                        for kit_type, kit_data in asset_data.items():
                            if not isinstance(kit_data, dict):
                                continue
                            for _, variant in list(kit_data.items()):
                                if not isinstance(variant, dict):
                                    continue

                                state = variant.get("processing_state")
                                raw_url = variant.get("raw")

                                if state in STUCK_STATES:
                                    started_at = variant.get("processing_started_at")
                                    if started_at:
                                        try:
                                            from django.utils.dateparse import parse_datetime

                                            started = parse_datetime(started_at)
                                            if started and started > stuck_threshold:
                                                continue
                                        except (ValueError, TypeError):
                                            pass

                                    self.stdout.write(
                                        f"  [{member_name}] "
                                        f"{role_name}.images.{asset_type}.{kit_type}: "
                                        f"STUCK ({state})"
                                    )

                                    if not is_dry_run:
                                        if requeue and raw_url:
                                            self._requeue_image(
                                                membership, asset_type, kit_type, raw_url
                                            )
                                            stats["images_requeued"] += 1
                                        else:
                                            variant["processing_state"] = "pending"
                                            variant.pop("processing_started_at", None)
                                            variant.pop("cancel_requested_at", None)
                                            stats["images_reset"] += 1
                                        member_changed = True
                                    else:
                                        stats["images_reset"] += 1

                                elif state in REPROCESS_STATES and not stuck_only:
                                    self.stdout.write(
                                        f"  [{member_name}] "
                                        f"{role_name}.images.{asset_type}.{kit_type}: "
                                        f"NEEDS REPROCESS ({state})"
                                    )
                                    if not is_dry_run and requeue and raw_url:
                                        self._requeue_image(
                                            membership, asset_type, kit_type, raw_url
                                        )
                                        stats["images_requeued"] += 1
                                        member_changed = True
                                    elif not is_dry_run:
                                        stats["images_reset"] += 1
                                        member_changed = True

                # ── 1b. Fix stuck/failed videos ─────────────────────────────
                for role_name, role_data in roles_data.items():
                    if not isinstance(role_data, dict):
                        continue
                    videos = role_data.get("videos", {}) or {}
                    for asset_type, asset_data in videos.items():
                        if not isinstance(asset_data, dict):
                            continue
                        for kit_type, kit_data in asset_data.items():
                            if not isinstance(kit_data, dict):
                                continue
                            for variant_id, variant in list(kit_data.items()):
                                if not isinstance(variant, dict):
                                    continue

                                state = variant.get("processing_state")
                                raw_url = variant.get("raw")

                                if state in STUCK_STATES:
                                    started_at = variant.get("processing_started_at")
                                    if started_at:
                                        try:
                                            from django.utils.dateparse import parse_datetime

                                            started = parse_datetime(started_at)
                                            if started and started > stuck_threshold:
                                                continue
                                        except (ValueError, TypeError):
                                            pass

                                    self.stdout.write(
                                        f"  [{member_name}] "
                                        f"{role_name}.videos.{asset_type}.{kit_type}: "
                                        f"STUCK ({state})"
                                    )

                                    if not is_dry_run:
                                        if not raw_url:
                                            variant["processing_state"] = "failed"
                                            variant["error"] = "reset_stuck: no raw URL available"
                                            stats["videos_reset"] += 1
                                        elif requeue:
                                            self._requeue_video(
                                                membership,
                                                asset_type,
                                                kit_type,
                                                variant_id if variant_id != "default" else None,
                                                raw_url,
                                            )
                                            stats["videos_requeued"] += 1
                                        else:
                                            variant["processing_state"] = "pending"
                                            variant.pop("processing_started_at", None)
                                            variant.pop("cancel_requested_at", None)
                                            variant.pop("progress_frames", None)
                                            stats["videos_reset"] += 1
                                        member_changed = True
                                    else:
                                        stats["videos_reset"] += 1

            # ── 2. Create missing closeup/halfbody from processed fullbody ──
            if not stuck_only:
                roles_data = tr.get("roles", {}) or {}
                for _, role_data in roles_data.items():
                    if not isinstance(role_data, dict):
                        continue
                    images = role_data.get("images", {}) or {}
                    fullbodies = images.get("fullbody", {})
                    if not isinstance(fullbodies, dict):
                        continue
                    for kit_type, kit_data in fullbodies.items():
                        if not isinstance(kit_data, dict):
                            continue
                        # Check all variants (usually just "default")
                        for variant_id, fb_data in kit_data.items():
                            if not isinstance(fb_data, dict):
                                continue
                            if fb_data.get("processing_state") != "processed":
                                continue
                            processed_path = fb_data.get("processed")
                            if not processed_path:
                                continue

                            # Check if closeup exists for this kit_type
                            closeup_kit = (images.get("closeup", {}) or {}).get(kit_type, {})
                            closeup_val = (
                                closeup_kit.get(variant_id, {})
                                if isinstance(closeup_kit, dict)
                                else {}
                            )
                            if not isinstance(closeup_val, dict) or not closeup_val.get(
                                "processed"
                            ):
                                self.stdout.write(
                                    f"  [{member_name}] MISSING closeup/{kit_type} "
                                    f"(fullbody processed)"
                                )
                                if not is_dry_run:
                                    self._queue_closeup_crop(membership, kit_type)
                                    stats["closeups_created"] += 1
                                    member_changed = True
                                else:
                                    stats["closeups_created"] += 1

                            # Check if halfbody exists for this kit_type
                            halfbody_kit = (images.get("halfbody", {}) or {}).get(kit_type, {})
                            halfbody_val = (
                                halfbody_kit.get(variant_id, {})
                                if isinstance(halfbody_kit, dict)
                                else {}
                            )
                            if not isinstance(halfbody_val, dict) or not halfbody_val.get(
                                "processed"
                            ):
                                self.stdout.write(
                                    f"  [{member_name}] MISSING halfbody/{kit_type} "
                                    f"(fullbody processed)"
                                )
                                if not is_dry_run:
                                    self._queue_halfbody_crop(membership, kit_type)
                                    stats["halfbodies_created"] += 1
                                    member_changed = True
                                else:
                                    stats["halfbodies_created"] += 1

            # Save metadata changes if needed
            if member_changed and not is_dry_run:
                meta["teamreel_assets"] = tr
                membership.metadata = meta
                membership.save(update_fields=["metadata", "updated_at"])
                stats["members_modified"] += 1

        # Print summary
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(
            self.style.SUCCESS(f"Summary ({'DRY RUN' if is_dry_run else 'APPLIED'}):")
        )
        self.stdout.write(
            f"  Images reset/requeued: {stats['images_reset']}/{stats['images_requeued']}"
        )
        self.stdout.write(
            f"  Videos reset/requeued: {stats['videos_reset']}/{stats['videos_requeued']}"
        )
        self.stdout.write(f"  Closeups to create:    {stats['closeups_created']}")
        self.stdout.write(f"  Halfbodies to create:  {stats['halfbodies_created']}")
        self.stdout.write(f"  Members modified:      {stats['members_modified']}")
        self.stdout.write(self.style.SUCCESS("=" * 60))

    def _requeue_image(self, membership, asset_type, kit_type, raw_url):
        """Re-queue an image for Celery processing."""
        from src.video.tasks.asset_processing import process_member_asset

        try:
            process_member_asset.delay(
                membership_id=str(membership.id),
                asset_type=asset_type,
                kit_type=kit_type,
                raw_url=raw_url,
            )
            self.stdout.write(f"    → Queued process_member_asset for {asset_type}/{kit_type}")
        except Exception as exc:
            self.stderr.write(f"    ✗ Failed to queue: {exc}")

    def _requeue_video(self, membership, asset_type, kit_type, variant_id, raw_url):
        """Re-queue a video for Celery processing."""
        from src.video.tasks.asset_processing import process_member_asset

        try:
            process_member_asset.delay(
                membership_id=str(membership.id),
                asset_type=asset_type,
                kit_type=kit_type,
                raw_url=raw_url,
                variant_id=variant_id,
            )
            label = f"{kit_type}_{variant_id}" if variant_id else kit_type
            self.stdout.write(f"    → Queued process_member_asset for {asset_type}/{label}")
        except Exception as exc:
            self.stderr.write(f"    ✗ Failed to queue: {exc}")

    def _queue_closeup_crop(self, membership, kit_type):
        """Queue closeup auto-crop from processed fullbody."""
        from src.video.tasks.asset_processing import auto_crop_closeup_from_fullbody

        try:
            auto_crop_closeup_from_fullbody.delay(
                membership_id=str(membership.id),
                kit_type=kit_type,
            )
            self.stdout.write(f"    → Queued auto_crop_closeup for kit={kit_type}")
        except Exception as exc:
            self.stderr.write(f"    ✗ Failed to queue closeup crop: {exc}")

    def _queue_halfbody_crop(self, membership, kit_type):
        """Queue halfbody auto-crop from processed fullbody."""
        from src.video.tasks.asset_processing import auto_crop_halfbody_from_fullbody

        try:
            auto_crop_halfbody_from_fullbody.delay(
                membership_id=str(membership.id),
                kit_type=kit_type,
            )
            self.stdout.write(f"    → Queued auto_crop_halfbody for kit={kit_type}")
        except Exception as exc:
            self.stderr.write(f"    ✗ Failed to queue halfbody crop: {exc}")

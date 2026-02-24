"""Backfill halfbody crops for all existing fullbody assets.

This management command iterates through all ProjectMembership records,
finds fullbody assets that don't have a corresponding halfbody, and
queues Celery tasks to crop them.

Usage:
    python manage.py backfill_halfbody          # dry-run
    python manage.py backfill_halfbody --apply  # queue tasks
"""
from __future__ import annotations

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill halfbody crops from existing fullbody assets"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually queue the crop tasks (default is dry-run)",
        )

    def handle(self, *args, **options):
        from projects.models import ProjectMembership

        apply = options["apply"]
        pairs: list[tuple[str, str]] = []

        for m in ProjectMembership.objects.all().iterator():
            meta = m.metadata or {}
            images = meta.get("teamreel_assets", {}).get("images", {})
            fb = images.get("fullbody", {})
            hb = images.get("halfbody", {})
            if not isinstance(fb, dict):
                continue
            for kit_type, val in fb.items():
                if isinstance(val, dict) and (val.get("processed") or val.get("raw")):
                    existing_hb = hb.get(kit_type, {}) if isinstance(hb, dict) else {}
                    has_hb = isinstance(existing_hb, dict) and (
                        existing_hb.get("processed") or existing_hb.get("raw")
                    )
                    if not has_hb:
                        pairs.append((str(m.id), kit_type))

        self.stdout.write(f"Found {len(pairs)} fullbody assets that need halfbody crop")

        if not pairs:
            self.stdout.write(self.style.SUCCESS("Nothing to do — all halfbody assets exist"))
            return

        if not apply:
            for mid, kt in pairs:
                self.stdout.write(f"  [DRY-RUN] {mid[:8]}... kit={kt}")
            self.stdout.write(
                self.style.WARNING(f"\nRun with --apply to queue {len(pairs)} halfbody crop tasks")
            )
            return

        # Queue Celery tasks
        from src.video.tasks.asset_processing import auto_crop_halfbody_from_fullbody

        queued = 0
        failed = 0
        for mid, kt in pairs:
            try:
                auto_crop_halfbody_from_fullbody.delay(membership_id=mid, kit_type=kt)
                queued += 1
                self.stdout.write(f"  [QUEUED] {mid[:8]}... kit={kt}")
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  [FAILED] {mid[:8]}... kit={kt}: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone: {queued} queued, {failed} failed"))

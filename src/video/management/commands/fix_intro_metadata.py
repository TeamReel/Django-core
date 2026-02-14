"""Fix intro video metadata structure.

Converts plain string URLs in videos.intro.* to proper object format:
  { raw: url, processed: url, processing_state: 'processed' }

MiniMax-generated intro videos are already complete (have background),
so they don't need reprocessing - just the metadata format fix.

Usage:
    python manage.py fix_intro_metadata --dry-run  # Preview changes
    python manage.py fix_intro_metadata            # Apply changes
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.management.base import BaseCommand

from src.projects.models import ProjectMembership

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Fix intro video metadata: convert plain URLs to {raw, processed, processing_state} format"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving",
        )
        parser.add_argument(
            "--project-id",
            type=str,
            help="Only fix memberships in this project (UUID)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        project_id = options.get("project_id")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be saved\n"))

        queryset = ProjectMembership.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        total = 0
        fixed = 0
        skipped = 0

        for membership in queryset.iterator():
            meta = membership.metadata or {}
            tr = meta.get("teamreel_assets", {})
            videos = tr.get("videos", {})
            intro = videos.get("intro", {})

            if not intro or not isinstance(intro, dict):
                continue

            total += 1
            changes = {}

            for key, val in intro.items():
                if val is None:
                    continue

                # Already in correct format
                if isinstance(val, dict) and "processing_state" in val:
                    continue

                # Plain string URL - convert to object format
                if isinstance(val, str) and val.strip():
                    url = val.strip()
                    # MiniMax videos are complete - mark as processed
                    changes[key] = {
                        "raw": url,
                        "processed": url,
                        "processing_state": "processed",
                    }
                    self.stdout.write(
                        f"  {membership.id} ({self._get_name(membership)}): " f"{key} → processed"
                    )

                # Old dict format without processing_state
                elif isinstance(val, dict):
                    url = val.get("url") or val.get("raw") or val.get("processed")
                    if url:
                        changes[key] = {
                            "raw": url,
                            "processed": url,
                            "processing_state": "processed",
                        }
                        self.stdout.write(
                            f"  {membership.id} ({self._get_name(membership)}): "
                            f"{key} → processed (from dict)"
                        )

            if changes:
                fixed += 1
                if not dry_run:
                    # Update metadata
                    for key, new_val in changes.items():
                        intro[key] = new_val

                    # Ensure nested structure exists
                    if "videos" not in tr:
                        tr["videos"] = {}
                    tr["videos"]["intro"] = intro

                    if "teamreel_assets" not in meta:
                        meta["teamreel_assets"] = {}
                    meta["teamreel_assets"] = tr

                    membership.metadata = meta
                    membership.save(update_fields=["metadata"])
            else:
                skipped += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Checked {total} memberships with intro data. "
                f"Fixed: {fixed}, Already OK: {skipped}"
            )
        )
        if dry_run and fixed > 0:
            self.stdout.write(self.style.WARNING(f"Run without --dry-run to apply {fixed} changes"))

    def _get_name(self, membership: Any) -> str:
        if membership.user:
            return membership.user.get_full_name() or membership.user.email
        return "Unknown"

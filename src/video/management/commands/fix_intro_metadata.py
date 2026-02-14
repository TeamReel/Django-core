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
import re
from typing import Any

from django.core.management.base import BaseCommand

from projects.models import ProjectMembership

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fix intro video metadata: convert plain URLs to {raw, processed, processing_state} format and migrate legacy media.intro"

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
        scanned = 0

        # Regex to extract kit and style from filename
        # Example: member_intro_kit_type-home_style_variant-arms_crossed_1770805990...
        filename_pattern = re.compile(
            r"kit_type-(?P<kit>[^_]+).*?style_variant-(?P<style>[a-z_]+)_\d+"
        )

        for membership in queryset.iterator():
            scanned += 1
            meta = membership.metadata or {}
            tr = meta.get("teamreel_assets", {})
            videos = tr.get("videos", {})
            media = tr.get("media", {})

            # Ensure structure exists
            if "videos" not in tr:
                tr["videos"] = {}
                videos = tr["videos"]
            if "intro" not in videos:
                videos["intro"] = {}

            intro = videos["intro"]
            changes = {}

            # 1. Fix existing entries in videos.intro
            if isinstance(intro, dict):
                for key, val in intro.items():
                    if not val:
                        continue

                    # Already in correct format
                    if isinstance(val, dict) and "processing_state" in val:
                        continue

                    # Plain string URL - convert to object format
                    if isinstance(val, str) and val.strip():
                        url = val.strip()
                        changes[key] = {
                            "raw": url,
                            "processed": url,
                            "processing_state": "processed",
                        }

                    # Old dict format without processing_state
                    elif isinstance(val, dict):
                        url = val.get("url") or val.get("raw") or val.get("processed")
                        if url:
                            changes[key] = {
                                "raw": url,
                                "processed": url,
                                "processing_state": "processed",
                            }

            # 2. Migrate legacy media.intro if needed
            legacy_url = media.get("intro", {}).get("url")
            if legacy_url and isinstance(legacy_url, str) and legacy_url.strip():
                # Check if we already have this URL in videos.intro
                already_exists = False
                for v in intro.values():
                    v_url = v if isinstance(v, str) else v.get("processed") or v.get("raw")
                    if v_url == legacy_url:
                        already_exists = True
                        break

                if not already_exists:
                    # Try to parse filename
                    match = filename_pattern.search(legacy_url)
                    if match:
                        kit = match.group("kit")
                        style = match.group("style")
                        key = f"{kit}_{style}"
                        if key not in intro and key not in changes:
                            changes[key] = {
                                "raw": legacy_url,
                                "processed": legacy_url,
                                "processing_state": "processed",
                            }
                            self.stdout.write(f"  Migrated legacy intro to {key}")

            if changes:
                total += 1
                if dry_run:
                    self.stdout.write(f"  {membership.id}: Will update {list(changes.keys())}")
                else:
                    intro.update(changes)
                    # Helper to safeguard metadata save
                    if not membership.metadata:
                        membership.metadata = {}
                    if "teamreel_assets" not in membership.metadata:
                        membership.metadata["teamreel_assets"] = {}

                    # We modified 'intro' dict in place (it's a reference to meta...videos['intro'])
                    # but we need to ensure the parent dicts are connected up to membership.metadata
                    membership.metadata["teamreel_assets"] = tr
                    membership.save(update_fields=["metadata"])
                    fixed += 1
                    self.stdout.write(f"  Fixed {membership.id}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Scanned {scanned} memberships. Found {total} to fix. Fixed: {fixed}"
            )
        )

    def _get_name(self, membership: Any) -> str:
        if membership.user:
            return membership.user.get_full_name() or membership.user.email
        return "Unknown"

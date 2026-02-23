"""One-off fix: rename stale `transformation` key to `transformation_{style_variant}`.

Jobs approved before the composite_key fix wrote their variant under
`videos.then_vs_now.transformation` instead of `transformation_snap` etc.
This command renames the key, preserving all existing data (specs, processed
state, etc.) without re-triggering RVM processing.

Usage:
    python manage.py fix_then_vs_now_keys --dry-run
    python manage.py fix_then_vs_now_keys
"""

from __future__ import annotations

import re

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Rename stale videos.then_vs_now.transformation → transformation_{style_variant}"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Show what would change without writing anything",
        )

    def handle(self, *args, **options):
        from django.apps import apps

        dry = options["dry_run"]
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Find memberships that have a `then_vs_now.transformation` key
        qs = ProjectMembership.objects.filter(
            metadata__teamreel_assets__videos__then_vs_now__has_key="transformation",
        )

        total = qs.count()
        self.stdout.write(
            self.style.NOTICE(
                f"Found {total} membership(s) with then_vs_now.transformation"
                + (" (dry-run)" if dry else "")
            )
        )

        fixed = 0
        for m in qs:
            meta = m.metadata or {}
            tn = meta.get("teamreel_assets", {}).get("videos", {}).get("then_vs_now", {})
            old_data = tn.get("transformation")
            if not isinstance(old_data, dict):
                continue

            # Parse style_variant from the raw filename
            raw = old_data.get("raw", "")
            match = re.search(r"style_variant-([a-z][a-z_]*)", raw)
            style_variant = match.group(1).strip("_") if match else "snap"
            new_key = f"transformation_{style_variant}"

            # Skip if the correct key already exists with same or better data
            existing = tn.get(new_key)
            if isinstance(existing, dict) and existing.get("processing_state") == "processed":
                self.stdout.write(f"  {m.id}: {new_key} already exists and is processed — skipping")
                continue

            self.stdout.write(
                f"  {m.id}: transformation → {new_key}"
                f"  (raw={raw[:80]}…, state={old_data.get('processing_state')})"
            )

            if not dry:
                tn[new_key] = old_data
                del tn["transformation"]
                m.save(update_fields=["metadata"])
                fixed += 1
            else:
                fixed += 1

        self.stdout.write(
            self.style.SUCCESS(f"\nDone. {'Would fix' if dry else 'Fixed'}: {fixed} / {total}")
        )

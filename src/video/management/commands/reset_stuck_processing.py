"""Reset all members stuck in 'processing' or 'cancelling' state.

Usage:
    python manage.py reset_stuck_processing [--project-id=X] [--dry-run]
"""

import logging

from django.apps import apps
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Reset all members stuck in processing/cancelling state"

    def add_arguments(self, parser):
        parser.add_argument(
            "--project-id",
            type=int,
            help="Only reset members in this project (optional)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be reset without making changes",
        )

    def handle(self, *args, **options):
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        project_id = options.get("project_id")
        dry_run = options.get("dry_run", False)

        queryset = ProjectMembership.objects.all()
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        stuck_states = {"processing", "cancelling"}
        reset_count = 0

        for membership in queryset.iterator():
            meta = getattr(membership, "metadata", None) or {}
            tr = meta.get("teamreel_assets", {})

            changed = False

            # Check all roles
            roles_data = tr.get("roles", {}) or {}
            for _, role_data in roles_data.items():
                if not isinstance(role_data, dict):
                    continue

                # Check images (fullbody, closeup)
                for asset_type, asset_data in (role_data.get("images", {}) or {}).items():
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in asset_data.items():
                        if not isinstance(kit_data, dict):
                            continue
                        for _, variant in kit_data.items():
                            if isinstance(variant, dict):
                                state = variant.get("processing_state")
                                if state in stuck_states:
                                    self.stdout.write(
                                        f"  [{membership.id}] {asset_type}/{kit_type}: "
                                        f"state={state}"
                                    )
                                    if not dry_run:
                                        variant["processing_state"] = None
                                        variant.pop("cancel_requested_at", None)
                                    changed = True

                # Check videos (intro, celebration)
                for asset_type, asset_data in (role_data.get("videos", {}) or {}).items():
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in asset_data.items():
                        if not isinstance(kit_data, dict):
                            continue
                        for _, variant in kit_data.items():
                            if isinstance(variant, dict):
                                state = variant.get("processing_state")
                                if state in stuck_states:
                                    self.stdout.write(
                                        f"  [{membership.id}] {asset_type}/{kit_type}: "
                                        f"state={state}"
                                    )
                                    if not dry_run:
                                        variant["processing_state"] = None
                                        variant.pop("cancel_requested_at", None)
                                    changed = True

            if changed:
                reset_count += 1
                if not dry_run:
                    meta["teamreel_assets"] = tr
                    membership.metadata = meta
                    membership.save(update_fields=["metadata", "updated_at"])

        action = "Would reset" if dry_run else "Reset"
        self.stdout.write(
            self.style.SUCCESS(f"\n{action} {reset_count} membership(s) with stuck states.")
        )

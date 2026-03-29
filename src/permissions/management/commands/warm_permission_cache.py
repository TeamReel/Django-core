"""
Management command to pre-warm permission cache with global roles.

Usage:
    python manage.py warm_permission_cache

Typically run on application startup or via cron/systemd timer.
"""

from django.core.management.base import BaseCommand
from permissions.evaluator import check_permission
from permissions.models import RoleAssignment, ScopeChoices


class Command(BaseCommand):
    """Pre-warm permission cache with global roles and common permissions."""

    help = "Pre-warm permission cache with global roles and common permissions"

    def handle(self, *args, **options):
        self.stdout.write("Warming permission cache...")

        # Get all global-scoped role assignments
        global_assignments = (
            RoleAssignment.objects.filter(scope=ScopeChoices.GLOBAL)
            .select_related("role", "user")
            .prefetch_related("role__permissions")
        )

        if not global_assignments.exists():
            self.stdout.write(self.style.WARNING("No global role assignments found"))
            return

        # Common permissions to pre-cache
        common_permissions = [
            "projects.view",
            "projects.create",
            "projects.update",
            "projects.delete",
            "org.view_members",
            "org.invite_users",
        ]

        cache_count = 0
        for assignment in global_assignments:
            for permission in common_permissions:
                # Evaluate and cache
                check_permission(assignment.user_id, permission, None, "generic")
                cache_count += 1

            user_email = (
                assignment.user.email if hasattr(assignment, "user") else assignment.user_id
            )
            self.stdout.write(
                f"  OK Warmed cache for user: {user_email} "
                f"({len(common_permissions)} permissions)"
            )

        self.stdout.write(
            self.style.SUCCESS(f"OK Cache warming complete: {cache_count} evaluations cached")
        )

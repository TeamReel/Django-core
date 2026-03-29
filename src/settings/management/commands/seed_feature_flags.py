"""
Seed dark_theme feature flag at global, organisation, and project scope.

Usage:
    python manage.py seed_feature_flags

Creates:
- 1 GLOBAL dark_theme flag (default: disabled)
- 1 dark_theme flag per organisation
- 1 dark_theme flag per project (club/team)

Admins can then enable dark theme per scope level.
"""

from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project
from settings.models import FeatureFlag, ScopeType


class Command(BaseCommand):
    help = "Seed dark_theme feature flag for global, organisations, and projects"

    def handle(self, *args, **options):
        stats = {"global": 0, "org": 0, "project": 0}

        # 1. Global flag (superadmin can enable for whole app)
        self.stdout.write("\n=== Global Scope ===")
        flag, created = FeatureFlag.objects.update_or_create(
            key="dark_theme",
            scope_type=ScopeType.GLOBAL,
            organisation=None,
            project=None,
            user=None,
            defaults={
                "enabled": False,
                "description": "Enable dark theme for the application UI",
            },
        )
        stats["global"] = 1
        status = "Created" if created else "Updated"
        self.stdout.write(f"  {status}: dark_theme (GLOBAL) = {flag.enabled}")

        # 2. Organisation-scoped flags
        self.stdout.write("\n=== Organisation Scope ===")
        orgs = Organisation.objects.exclude(name__startswith="test_").exclude(
            name__startswith="Test_"
        )

        for org in orgs:
            flag, created = FeatureFlag.objects.update_or_create(
                key="dark_theme",
                scope_type=ScopeType.ORGANISATION,
                organisation=org,
                project=None,
                user=None,
                defaults={
                    "enabled": False,
                    "description": f"Enable dark theme for {org.name}",
                },
            )
            stats["org"] += 1
            self.stdout.write(f"  {org.name}: dark_theme = {flag.enabled}")

        # 3. Project-scoped flags (clubs/teams)
        self.stdout.write("\n=== Project Scope ===")
        projects = Project.objects.exclude(name__startswith="test_").exclude(
            name__startswith="Test_"
        )

        for project in projects:
            flag, created = FeatureFlag.objects.update_or_create(
                key="dark_theme",
                scope_type=ScopeType.PROJECT,
                organisation=None,
                project=project,
                user=None,
                defaults={
                    "enabled": False,
                    "description": f"Enable dark theme for {project.name}",
                },
            )
            stats["project"] += 1

        self.stdout.write(f"  Created/updated {stats['project']} project flags")

        # Summary
        total = sum(stats.values())
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ dark_theme flags seeded: {stats['global']} global, "
                f"{stats['org']} org, {stats['project']} project (total: {total})"
            )
        )
        self.stdout.write("\nUsage:")
        self.stdout.write("  - Superadmin: Enable GLOBAL to turn on dark theme for everyone")
        self.stdout.write("  - Org admin: Enable ORGANISATION to turn on for all clubs in org")
        self.stdout.write("  - Club admin: Enable PROJECT to turn on for specific club/team")

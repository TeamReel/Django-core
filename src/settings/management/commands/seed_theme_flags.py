"""
Seed feature flags for dark/light theme settings.

Permission model:
- Superadmin: can set for any organisation or club
- Land admin: can set for own organisation only
- Club admin: can set for own club only

Resolution: Organisation setting overrides club setting (highest scope wins).
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project
from settings.models import FeatureFlag, ScopeType


class Command(BaseCommand):
    """Seed dark_theme feature flag for all organisations and clubs."""

    help = "Seed dark_theme feature flag for all organisations and clubs"

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-test",
            action="store_true",
            help="Include test organisations/clubs",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        include_test = options.get("include_test", False)
        dry_run = options.get("dry_run", False)

        # Get all organisations
        orgs = Organisation.objects.all()
        if not include_test:
            orgs = orgs.exclude(name__icontains="test").exclude(name__icontains="del_")

        # Get all clubs (top-level projects)
        clubs = Project.objects.filter(parent_project__isnull=True).select_related("organisation")
        if not include_test:
            clubs = clubs.exclude(name__icontains="test").exclude(name__icontains="del_")

        self.stdout.write(f"Processing {orgs.count()} organisations, {clubs.count()} clubs...")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made\n"))

        created_flags = 0

        with transaction.atomic():
            # 1. Create GLOBAL default (dark_theme = False by default)
            if dry_run:
                self.stdout.write("  Would create GLOBAL dark_theme flag (default: False)")
            else:
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
                if created:
                    created_flags += 1
                    self.stdout.write(self.style.SUCCESS("  Created GLOBAL dark_theme flag"))

            # 2. Create per-organisation flags (can be overridden by land admin)
            for org in orgs:
                if dry_run:
                    self.stdout.write(f"  Would create ORG flag: {org.name}")
                    continue

                flag, created = FeatureFlag.objects.update_or_create(
                    key="dark_theme",
                    scope_type=ScopeType.ORGANISATION,
                    organisation=org,
                    project=None,
                    user=None,
                    defaults={
                        "enabled": False,  # Default to light theme
                        "description": f"Dark theme setting for {org.name}",
                    },
                )
                if created:
                    created_flags += 1

            if not dry_run:
                self.stdout.write(f"  Created {orgs.count()} organisation flags")

            # 3. Create per-club flags (can be overridden by club admin)
            for club in clubs:
                if dry_run:
                    self.stdout.write(f"  Would create PROJECT flag: {club.name}")
                    continue

                flag, created = FeatureFlag.objects.update_or_create(
                    key="dark_theme",
                    scope_type=ScopeType.PROJECT,
                    organisation=None,
                    project=club,
                    user=None,
                    defaults={
                        "enabled": False,  # Default to light theme
                        "description": f"Dark theme setting for {club.name}",
                    },
                )
                if created:
                    created_flags += 1

            if not dry_run:
                self.stdout.write(f"  Created {clubs.count()} club flags")

            if dry_run:
                transaction.set_rollback(True)

        # Summary
        total = FeatureFlag.objects.filter(key="dark_theme").count()
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! dark_theme flags: {total} (+{created_flags})\n"
                f"  - 1 GLOBAL (system default)\n"
                f"  - {orgs.count()} ORGANISATION (land admin controlled)\n"
                f"  - {clubs.count()} PROJECT (club admin controlled)"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "\nResolution order: GLOBAL → ORGANISATION → PROJECT\n"
                "If ORG disables, all clubs under it are disabled regardless of club setting."
            )
        )

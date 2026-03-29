"""
STAP 2: Delete organisation-wide Season 2024/2025 + competitions + player memberships
Removes ALL data for 2024/2025 before creating team-scoped replacements
"""

from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import signals
from organisations.models import Organisation
from projects.models import ProjectMembership
from search.signals import handle_delete


class Command(BaseCommand):
    help = "Delete organisation-wide Season 2024/2025 (+ competitions + player memberships)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Confirm deletion (required for actual delete)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        confirm = options["confirm"]

        self.stdout.write("=" * 70)
        self.stdout.write("STAP 2: DELETE ORG-WIDE SEASON 2024/2025")
        self.stdout.write("=" * 70)

        if not confirm and not dry_run:
            self.stdout.write(
                self.style.ERROR("\n⚠️  Use --dry-run to preview or --confirm to actually delete")
            )
            return

        try:
            knvb = Organisation.objects.get(slug="knvb")
            season_2024 = Period.objects.get(
                organisation=knvb, name="Season 2024/2025", parent_period__isnull=True
            )

            # Count what will be deleted
            competitions = Period.objects.filter(parent_period=season_2024)
            memberships = ProjectMembership.objects.filter(period=season_2024)

            self.stdout.write("\n📊 DELETION SCOPE:")
            self.stdout.write(f"  - Season: {season_2024.name} ({season_2024.id})")
            self.stdout.write(f"  - Competitions: {competitions.count()}")
            self.stdout.write(f"  - Player memberships: {memberships.count()}")

            if dry_run:
                self.stdout.write(self.style.WARNING("\n🔍 DRY RUN - Nothing deleted"))
                self.stdout.write("\nTo actually delete, run:")
                self.stdout.write("  python manage.py delete_org_wide_2024 --confirm")
                return

            # Confirm deletion
            self.stdout.write(
                self.style.WARNING(
                    f"\n⚠️  About to DELETE {memberships.count()} player memberships!"
                )
            )
            self.stdout.write("   (Backup saved in backup_season_2024_2025.json)")

            # Temporarily disconnect search signals (no local Redis)
            signals.post_delete.disconnect(handle_delete)

            try:
                with transaction.atomic():
                    # Delete in correct order (FK constraints)
                    memberships_deleted = memberships.delete()
                    competitions_deleted = competitions.delete()
                    season_deleted = season_2024.delete()

                    self.stdout.write(self.style.SUCCESS("\n✅ DELETION COMPLETE"))
                    self.stdout.write(f"  - Player memberships: {memberships_deleted[0]} deleted")
                    self.stdout.write(f"  - Competitions: {competitions_deleted[0]} deleted")
                    self.stdout.write(f"  - Season: {season_deleted[0]} deleted")
            finally:
                # Reconnect search signals
                signals.post_delete.connect(handle_delete)

            self.stdout.write("\n" + "=" * 70)
            self.stdout.write("NEXT: STAP 3 - Create team-scoped periods")
            self.stdout.write("=" * 70)

        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ KNVB organisation not found"))
        except Period.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Season 2024/2025 not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))

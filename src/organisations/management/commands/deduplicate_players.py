"""
Deduplicate players who appear in multiple seasons for the same club.

This command identifies players with the same name who have memberships in different
seasons and merges them into a single user account with multiple period-based memberships.
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Deduplicate players across historical seasons"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be merged without making changes",
        )
        parser.add_argument(
            "--club",
            type=str,
            help="Specific club to deduplicate (e.g., Ajax, PSV, Feyenoord)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        target_club = options.get("club")

        self.stdout.write("=" * 70)
        self.stdout.write("PLAYER DEDUPLICATION - Historical Seasons")
        self.stdout.write("=" * 70)
        self.stdout.write()

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
            self.stdout.write()

        knvb = Organisation.objects.get(slug="knvb")

        # Target clubs with historical data
        clubs = ["Ajax", "PSV", "Feyenoord"]
        if target_club:
            clubs = [target_club]

        total_merged = 0
        total_deleted = 0

        for club_name in clubs:
            merged, deleted = self.deduplicate_club(knvb, club_name, dry_run)
            total_merged += merged
            total_deleted += deleted

        self.stdout.write()
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("SUMMARY"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"Total player groups merged: {total_merged}")
        self.stdout.write(f"Total duplicate users removed: {total_deleted}")

        if dry_run:
            self.stdout.write()
            self.stdout.write(
                self.style.WARNING("This was a DRY RUN. Run without --dry-run to apply changes.")
            )

    def deduplicate_club(self, organisation, club_name, dry_run):
        """Deduplicate players for a specific club."""
        self.stdout.write(f"\n{'=' * 70}")
        self.stdout.write(f"Processing {club_name}")
        self.stdout.write("=" * 70)

        try:
            main_team = Project.objects.get(
                parent_project__organisation=organisation, name=f"{club_name} 1"
            )
        except Project.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Team '{club_name} 1' not found"))
            return 0, 0

        # Get all memberships for this team
        memberships = ProjectMembership.objects.filter(project=main_team).select_related(
            "user", "period"
        )

        if not memberships.exists():
            self.stdout.write(self.style.WARNING(f"No memberships found for {club_name}"))
            return 0, 0

        # Group users by name
        users_by_name = defaultdict(list)
        for membership in memberships:
            user = membership.user
            # Skip memberships without period (shouldn't happen but be safe)
            if not membership.period:
                continue
            name_key = (user.first_name.lower(), user.last_name.lower())
            users_by_name[name_key].append(
                {"user": user, "membership": membership, "period": membership.period.name}
            )

        # Find duplicates (same name, multiple users)
        duplicates = {
            name: data
            for name, data in users_by_name.items()
            if len(set(d["user"].id for d in data)) > 1
        }

        if not duplicates:
            self.stdout.write(self.style.SUCCESS(f"✓ No duplicates found for {club_name}"))
            return 0, 0

        self.stdout.write(f"Found {len(duplicates)} players with duplicate accounts:")
        self.stdout.write()

        merged_count = 0
        deleted_count = 0

        for (first_name, last_name), entries in duplicates.items():
            # Get unique users
            _user_ids = list(set(d["user"].id for d in entries))
            users = [d["user"] for d in entries]
            unique_users = {u.id: u for u in users}

            # Choose primary user (keep the one with the most recent membership or lowest ID)
            primary_user = min(unique_users.values(), key=lambda u: u.id)
            duplicate_users = [u for u in unique_users.values() if u.id != primary_user.id]

            periods = sorted(set(d["period"] for d in entries))

            self.stdout.write(
                f"  • {first_name.title()} {last_name.title()}: "
                f"{len(unique_users)} accounts → 1 account"
            )
            self.stdout.write(f"    Periods: {', '.join(periods)}")
            self.stdout.write(f"    Primary: {primary_user.email}")

            if not dry_run:
                with transaction.atomic():
                    # Update all memberships to point to primary user
                    for dup_user in duplicate_users:
                        dup_memberships = ProjectMembership.objects.filter(
                            user=dup_user, project=main_team
                        )
                        updated = dup_memberships.update(user=primary_user)
                        self.stdout.write(
                            f"      → Merged {updated} membership(s) from {dup_user.email}"
                        )

                        # Delete duplicate user
                        dup_user.delete()
                        deleted_count += 1

                merged_count += 1
            else:
                for dup_user in duplicate_users:
                    self.stdout.write(f"      → Would merge from {dup_user.email}")

            self.stdout.write()

        return merged_count, deleted_count

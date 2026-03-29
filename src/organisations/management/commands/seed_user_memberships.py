"""
Management command to create ProjectMemberships linking users to teams.

According to TeamReel data structure:
- Users must be linked to TEAMS (not clubs)
- Membership must be scoped to a SEASON (Period)
- Each user is at ONE team at any given time
- Roles: player, coach, staff, admin, viewer
"""

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed user memberships linking users to teams/seasons with appropriate roles"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to database",
        )
        parser.add_argument(
            "--org",
            type=str,
            help="Only seed memberships for specific organisation (slug)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        org_filter = options.get("org")

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved\n"))

        # Get organisations to process
        if org_filter:
            orgs = Organisation.objects.filter(slug=org_filter)
            if not orgs.exists():
                self.stdout.write(self.style.ERROR(f"❌ Organisation '{org_filter}' not found"))
                return
        else:
            orgs = Organisation.objects.all()

        self.stdout.write(f"\n📊 Processing {orgs.count()} organisation(s)...\n")

        total_created = 0
        total_skipped = 0

        with transaction.atomic():
            for org in orgs:
                self.stdout.write(f"\n🏢 {org.name} ({org.slug})")
                self.stdout.write("=" * 60)

                # Get all teams (child projects)
                teams = Project.objects.filter(
                    organisation=org, parent_project__isnull=False  # Only teams, not clubs
                ).select_related("parent_project")

                self.stdout.write(f"  Found {teams.count()} teams")

                for team in teams:
                    # Get the current season for this team
                    # Season is identified as root period (no parent)
                    season = (
                        Period.objects.filter(project=team, parent_period=None)
                        .order_by("-start_date")
                        .first()
                    )

                    if not season:
                        self.stdout.write(
                            self.style.WARNING(f"  ⚠️  {team.name}: No season found, skipping")
                        )
                        continue

                    # Check existing memberships
                    existing_count = ProjectMembership.objects.filter(
                        project=team, period=season
                    ).count()

                    if existing_count > 0:
                        self.stdout.write(
                            f"  ✓ {team.name}: Already has {existing_count} memberships"
                        )
                        total_skipped += existing_count
                        continue

                    # Get users that should be members of this team
                    # For now, we'll distribute existing users across teams
                    # In a real scenario, this would come from external data or user input

                    # Get users without any membership yet
                    users_without_membership = User.objects.filter(project_memberships__isnull=True)

                    # Assign 15-25 users per team (realistic squad size)
                    import random

                    squad_size = random.randint(15, 25)
                    assigned_users = users_without_membership[:squad_size]

                    if not assigned_users:
                        self.stdout.write(
                            self.style.WARNING(f"  ⚠️  {team.name}: No available users to assign")
                        )
                        continue

                    created_this_team = 0

                    for user in assigned_users:
                        # Determine role based on user index (simulate realistic squad)
                        # 1 admin (coach/manager), 2-3 staff, rest players
                        if created_this_team == 0:
                            roster_role = "coach"  # Team coach
                        elif created_this_team < 3:
                            roster_role = "staff"  # Assistant coaches
                        else:
                            roster_role = "player"

                        # ProjectMembership.role is used for access control (viewer/editor/admin).
                        access_role = "admin" if roster_role == "coach" else "viewer"

                        if not dry_run:
                            ProjectMembership.objects.create(
                                user=user,
                                project=team,
                                period=season,
                                role=access_role,
                                metadata={"character_role": roster_role},
                            )

                        created_this_team += 1
                        total_created += 1

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ {team.name}: Created {created_this_team} memberships "
                            f"(1 admin, {min(2, created_this_team-1)} staff, {max(0, created_this_team-3)} players)"
                        )
                    )

            if dry_run:
                transaction.set_rollback(True)

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"✅ Created {total_created} new memberships"))
        if total_skipped > 0:
            self.stdout.write(f"⏭️  Skipped {total_skipped} existing memberships")
        self.stdout.write("=" * 60 + "\n")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("🔍 This was a dry run. Run without --dry-run to apply changes.")
            )

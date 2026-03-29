"""
Management command to remove duplicate foreign clubs from KNVB.

These are duplicates - the correct versions already exist
in the proper organisations (The FA, FIGC, DFB).
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Remove duplicate foreign clubs that are incorrectly linked to KNVB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved"))

        # Get KNVB organisation
        try:
            knvb = Organisation.objects.get(slug="knvb")
        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ KNVB organisation not found"))
            return

        # Define foreign club patterns (clubs that should NOT be in KNVB)
        foreign_club_pattern = (
            r"(Tottenham|Chelsea|Manchester|Liverpool|Arsenal"
            r"|Southampton|Ipswich|Wolverhampton|Crystal Palace"
            r"|Brentford|Leicester|Everton|West Ham|Bournemouth"
            r"|Aston Villa|Fulham|Brighton|Nottingham|Newcastle"
            r"|Milan|Inter|Juventus|Roma|Lazio|Napoli|Atalanta"
            r"|Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt"
            r"|Stuttgart)"
        )

        total_deleted = 0
        total_teams_deleted = 0

        with transaction.atomic():
            # Find clubs in KNVB matching foreign patterns
            duplicate_clubs = Project.objects.filter(
                parent_project=None,  # Only root projects (clubs)
                organisation=knvb,
                name__iregex=foreign_club_pattern,
            )

            self.stdout.write(
                f"\n🗑️  Found {duplicate_clubs.count()} duplicate foreign clubs in KNVB\n"
            )

            for club in duplicate_clubs:
                # Count child teams and related data
                teams = Project.objects.filter(parent_project=club)
                team_count = teams.count()

                # Count all related data that will be deleted
                from activities.models import Activity, Period
                from projects.models import ProjectMembership

                member_count = ProjectMembership.objects.filter(project__in=teams).count()
                period_count = Period.objects.filter(project__in=teams).count()
                activity_count = Activity.objects.filter(project__in=teams).count()

                self.stdout.write(
                    f"  🗑️  DELETE: {club.name} (ID: {club.id})\n"
                    f"      - {team_count} teams\n"
                    f"      - {member_count} members\n"
                    f"      - {period_count} periods/seasons\n"
                    f"      - {activity_count} activities/matches"
                )

                if not dry_run:
                    # Disable signals during bulk deletion to avoid Celery/Redis errors
                    from django.db import connection

                    # Use raw SQL delete to bypass signals
                    team_ids = list(teams.values_list("id", flat=True))

                    if team_ids:
                        with connection.cursor() as cursor:
                            # Get all period IDs for these teams
                            cursor.execute(
                                "SELECT id FROM activities_period WHERE project_id = ANY(%s)",
                                [team_ids],
                            )
                            period_ids = [row[0] for row in cursor.fetchall()]

                            # Collect all project IDs (teams + club)
                            all_project_ids = team_ids + [club.id]

                            # Delete in correct order (child to parent)
                            if period_ids:
                                # 1. Delete activities in these periods
                                # (may reference periods from these teams)
                                cursor.execute(
                                    "DELETE FROM activities_activity WHERE period_id = ANY(%s)",
                                    [period_ids],
                                )
                            # 2. Delete activities directly on teams
                            cursor.execute(
                                "DELETE FROM activities_activity WHERE project_id = ANY(%s)",
                                [team_ids],
                            )
                            # 3. Delete periods (references project)
                            cursor.execute(
                                "DELETE FROM activities_period WHERE project_id = ANY(%s)",
                                [team_ids],
                            )
                            # 4. Delete memberships (references project)
                            cursor.execute(
                                "DELETE FROM projects_membership WHERE project_id = ANY(%s)",
                                [team_ids],
                            )
                            # 5. Delete audit events for all projects
                            cursor.execute(
                                "DELETE FROM audit_events WHERE project_id = ANY(%s)",
                                [all_project_ids],
                            )
                            # 6. Delete team projects (references parent)
                            cursor.execute(
                                "DELETE FROM projects_project WHERE parent_project_id = %s",
                                [club.id],
                            )
                            # 7. Finally delete the club
                            cursor.execute("DELETE FROM projects_project WHERE id = %s", [club.id])
                total_deleted += 1
                total_teams_deleted += team_count

            if dry_run:
                raise Exception("Dry run - rolling back transaction")

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"🗑️  Deleted {total_deleted} duplicate clubs"))
        self.stdout.write(self.style.WARNING(f"🗑️  Deleted {total_teams_deleted} teams (cascaded)"))
        self.stdout.write("=" * 60 + "\n")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("🔍 This was a dry run. Run without --dry-run to apply changes.")
            )

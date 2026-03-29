"""
STAP 3: Create team-scoped periods for Season 2024/2025
Creates 576 new periods (72 teams × 8 periods each):
- 1 season per team
- 7 competitions per team (League, Cup, European, League Cup, Play-offs, Friendly, Youth)
"""

from datetime import date

from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Create team-scoped periods for Season 2024/2025 (72 teams × 8 periods)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        self.stdout.write("=" * 70)
        self.stdout.write("STAP 3: CREATE TEAM-SCOPED PERIODS 2024/2025")
        self.stdout.write("=" * 70)

        try:
            knvb = Organisation.objects.get(slug="knvb")

            # Get all KNVB teams (child projects with parent_project)
            teams = (
                Project.objects.filter(
                    parent_project__organisation=knvb, parent_project__isnull=False
                )
                .select_related("parent_project")
                .order_by("name")
            )

            team_count = teams.count()
            total_periods = team_count * 8  # 1 season + 7 competitions

            self.stdout.write("\n📊 CREATION SCOPE:")
            self.stdout.write(f"  - Teams: {team_count}")
            self.stdout.write("  - Periods per team: 8 (1 season + 7 competitions)")
            self.stdout.write(f"  - Total periods: {total_periods}")

            if dry_run:
                self.stdout.write(self.style.WARNING("\n🔍 DRY RUN - Nothing created"))
                self.stdout.write("\nSample (first 3 teams):")
                for team in teams[:3]:
                    self.stdout.write(f"\n  {team.name}:")
                    self.stdout.write(f"    - Season 2024/2025 (project_id={team.id})")
                    for comp_type in [
                        "League",
                        "Cup",
                        "European",
                        "League Cup",
                        "Play-offs",
                        "Friendly",
                        "Youth",
                    ]:
                        self.stdout.write(f"    - {comp_type} 2024/2025 (project_id={team.id})")
                return

            # Create periods
            created_count = 0
            competition_types = [
                ("League", "🏆"),
                ("Cup", "🏆"),
                ("European", "⭐"),
                ("League Cup", "🏆"),
                ("Play-offs", "🔥"),
                ("Friendly", "🤝"),
                ("Youth", "👦"),
            ]

            with transaction.atomic():
                for team in teams:
                    # Create team-scoped season
                    season, created = Period.objects.get_or_create(
                        organisation=knvb,
                        project=team,  # ⭐ KEY DIFFERENCE: team-scoped!
                        name="Season 2024/2025",
                        parent_period=None,
                        defaults={
                            "start_date": date(2024, 8, 1),
                            "end_date": date(2025, 7, 31),
                            "metadata": {
                                "type": "season",
                                "team": team.name,
                                "club": team.parent_project.name,
                            },
                        },
                    )
                    if created:
                        created_count += 1

                    # Create team-scoped competitions
                    for comp_name, emoji in competition_types:
                        competition, created = Period.objects.get_or_create(
                            organisation=knvb,
                            project=team,  # ⭐ KEY DIFFERENCE: team-scoped!
                            name=f"{comp_name} 2024/2025",
                            parent_period=season,
                            defaults={
                                "start_date": date(2024, 8, 1),
                                "end_date": date(2025, 7, 31),
                                "metadata": {
                                    "type": comp_name.lower().replace(" ", "_"),
                                    "emoji": emoji,
                                    "team": team.name,
                                    "club": team.parent_project.name,
                                },
                            },
                        )
                        if created:
                            created_count += 1

                self.stdout.write(self.style.SUCCESS("\n✅ CREATION COMPLETE"))
                self.stdout.write(f"  - Team-scoped periods created: {created_count}")
                self.stdout.write(f"  - Teams with periods: {team_count}")

            self.stdout.write("\n" + "=" * 70)
            self.stdout.write("NEXT: STAP 4 - Re-seed players (run CSV seeders)")
            self.stdout.write("=" * 70)

        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ KNVB organisation not found"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {e}"))
            import traceback

            traceback.print_exc()

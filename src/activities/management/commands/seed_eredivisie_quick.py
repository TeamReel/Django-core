"""Quick Eredivisie seeding for testing metadata structure."""

import random
from datetime import timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Quick seed Eredivisie only with full metadata for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Delete all existing data before seeding",
        )

    def handle(self, *args, **options):
        if options["clean"]:
            self.stdout.write("Cleaning existing data...")
            with connection.cursor() as cursor:
                # Delete in correct order to avoid FK constraints
                cursor.execute("TRUNCATE TABLE activities_activity CASCADE")
                cursor.execute("TRUNCATE TABLE activities_period CASCADE")
                cursor.execute("TRUNCATE TABLE projects_project CASCADE")
                cursor.execute("TRUNCATE TABLE organisations_organisation CASCADE")
            self.stdout.write(self.style.SUCCESS("Database cleaned"))

        self.stdout.write("Seeding Eredivisie...")

        # Get first user as creator
        from django.contrib.auth import get_user_model

        User = get_user_model()
        creator = User.objects.first()

        if not creator:
            self.stdout.write(self.style.ERROR("No users found. Please create a user first."))
            return

        # League metadata
        league_metadata = {
            "federation": "KNVB",
            "country": "Netherlands",
            "level": 1,
            "type": "league",
        }

        # Create Organisation
        org, _ = Organisation.objects.get_or_create(
            name="Eredivisie",
            defaults={
                "description": "Dutch top-tier professional football league",
                "metadata": league_metadata,
                "creator": creator,
            },
        )
        org.metadata = league_metadata
        org.save(update_fields=["metadata"])

        # Teams with metadata
        teams = [
            {
                "name": "Ajax Amsterdam",
                "city": "Amsterdam",
                "colors": ["Red", "White"],
                "founded": 1900,
            },
            {
                "name": "PSV Eindhoven",
                "city": "Eindhoven",
                "colors": ["Red", "White"],
                "founded": 1913,
            },
            {
                "name": "Feyenoord Rotterdam",
                "city": "Rotterdam",
                "colors": ["Red", "White"],
                "founded": 1908,
            },
            {"name": "AZ Alkmaar", "city": "Alkmaar", "colors": ["Red", "White"], "founded": 1967},
            {"name": "FC Utrecht", "city": "Utrecht", "colors": ["Red", "White"], "founded": 1970},
        ]

        for team_data in teams:
            team_name = team_data["name"]
            project, _ = Project.objects.get_or_create(
                name=team_name,
                organisation=org,
                defaults={
                    "description": f"{team_name} - Professional Football Club",
                    "slug": team_name.lower().replace(" ", "-"),
                    "creator": creator,
                    "metadata": {
                        "stadium": f"{team_name} Stadium",
                        "city": team_data["city"],
                        "founded": team_data["founded"],
                        "colors": team_data["colors"],
                    },
                },
            )
            project.metadata = {
                "stadium": f"{team_name} Stadium",
                "city": team_data["city"],
                "founded": team_data["founded"],
                "colors": team_data["colors"],
            }
            project.save(update_fields=["metadata"])

            # Create Periods
            root_period = Period.objects.create(
                name=f"Season 25/26 - {team_name}",
                start=timezone.now().date() - timedelta(days=120),
                end=timezone.now().date() + timedelta(days=180),
                organisation=org,
                project=project,
                metadata={"type": "season", "season": "2025/2026"},
            )

            league_period = Period.objects.create(
                name=f"League Competition - {team_name}",
                start=root_period.start,
                end=root_period.end,
                parent=root_period,
                organisation=org,
                project=project,
                metadata={"type": "competition", "competition_name": "Eredivisie"},
            )

            cup_period = Period.objects.create(
                name=f"Cup Tournament - {team_name}",
                start=root_period.start + timedelta(days=30),
                end=root_period.end - timedelta(days=30),
                parent=root_period,
                organisation=org,
                project=project,
                metadata={"type": "competition", "competition_name": "KNVB Cup"},
            )

            # Seed matches
            other_teams = [t["name"] for t in teams if t["name"] != team_name]
            now = timezone.now()

            # League matches (20)
            for i in range(20):
                days_offset = (i - 10) * 7
                start_time = now + timedelta(days=days_offset)
                is_home = i % 2 == 0
                opponent = random.choice(other_teams)

                metadata = {
                    "opponent": opponent,
                    "is_home": is_home,
                    "context": f"Round {i + 1}",
                }

                # Add score/attendance for past matches
                if start_time < now and random.random() < 0.7:
                    metadata["score"] = f"{random.randint(0,4)}-{random.randint(0,3)}"
                    if is_home:
                        metadata["attendance"] = random.randint(15000, 55000)

                Activity.objects.create(
                    title=(
                        f"{team_name} vs {opponent}" if is_home else f"{team_name} @ {opponent}"
                    ),
                    start=start_time,
                    end=start_time + timedelta(hours=2),
                    period=league_period,
                    organisation=org,
                    project=project,
                    activity_type="League Match",
                    metadata=metadata,
                )

            # Cup matches (4)
            for i in range(4):
                days_offset = (i - 2) * 14 + 3
                start_time = now + timedelta(days=days_offset)
                is_home = i % 2 == 0
                opponent = random.choice(other_teams)
                round_name = ["Round of 16", "Quarter Finals", "Semi Finals", "Final"][i]

                metadata = {
                    "opponent": opponent,
                    "is_home": is_home,
                    "context": round_name,
                }

                if start_time < now and random.random() < 0.7:
                    metadata["score"] = f"{random.randint(0,3)}-{random.randint(0,2)}"
                    if is_home:
                        metadata["attendance"] = random.randint(20000, 55000)

                Activity.objects.create(
                    title=(
                        f"{team_name} vs {opponent}" if is_home else f"{team_name} @ {opponent}"
                    ),
                    start=start_time,
                    end=start_time + timedelta(hours=2),
                    period=cup_period,
                    organisation=org,
                    project=project,
                    activity_type="Cup Match",
                    metadata=metadata,
                )

            self.stdout.write(f"  {team_name}: 24 matches created")

        self.stdout.write(self.style.SUCCESS("\nEredivisie seeding complete!"))
        self.stdout.write(f"  - 1 Organisation (metadata: {league_metadata})")
        self.stdout.write("  - 5 Projects (teams with city/stadium/colors)")
        self.stdout.write("  - 15 Periods (3 per team)")
        self.stdout.write("  - 120 Activities (24 matches per team)")

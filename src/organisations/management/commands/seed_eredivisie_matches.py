"""
Management command to generate Eredivisie matches for the 2024/2025 season.
"""

from datetime import datetime, timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Generate Eredivisie matches for the 2024/2025 season"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("EREDIVISIE MATCHES SEEDING")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Get KNVB
        knvb = Organisation.objects.get(slug="knvb")

        # Get all '1' teams (Eredivisie)
        teams = list(
            Project.objects.filter(parent_project__organisation=knvb, name__endswith=" 1").order_by(
                "name"
            )
        )

        self.stdout.write(f"Found {len(teams)} Eredivisie teams")
        self.stdout.write("")

        # Track matches created
        total_matches = 0

        with transaction.atomic():
            for team in teams:
                # Get team's season
                season = Period.objects.filter(project=team, parent_period__isnull=True).first()

                if not season:
                    self.stdout.write(f"  ⚠️  {team.name}: No season found")
                    continue

                # Get League competition
                league = Period.objects.filter(parent_period=season, name="League").first()

                if not league:
                    self.stdout.write(f"  ⚠️  {team.name}: No League competition")
                    continue

                # Check existing matches
                existing = Activity.objects.filter(
                    project=team, period=league, activity_type="match"
                ).count()

                if existing > 0:
                    self.stdout.write(
                        f"  ℹ️  {team.name}: {existing} matches already exist, skipping"
                    )
                    continue

                # Generate matches (each team plays all others twice: home & away)
                opponents = [t for t in teams if t.id != team.id]
                matches_for_team = []

                # Start date: August 10, 2024 at 14:30
                match_datetime = timezone.make_aware(datetime(2024, 8, 10, 14, 30))

                # Home matches (speelronde 1-17)
                for i, opponent in enumerate(opponents[:17], 1):
                    match = Activity(
                        project=team,  # 🔹 Home team via relationship
                        period=league,  # 🔹 Competition/Season via relationship
                        activity_type="match",
                        title=f"{team.name} vs {opponent.name}",
                        description=f"Eredivisie Speelronde {i}",
                        start_time=match_datetime,  # 🔹 Explicit: match datetime
                        end_time=match_datetime + timedelta(hours=2),
                        opponent_project=opponent,  # 🔹 Away team via relationship
                        location=f"{team.parent_project.name} Stadion",  # 🔹 From home club
                        metadata={
                            "round": i,  # 🔹 Store: round number
                            "status": "scheduled",  # 🔹 Store: match status
                            # "score": {"home": 0, "away": 0},  # Future: score
                            # "goalscorers": [],  # Future: goalscorers
                        },
                    )
                    matches_for_team.append(match)
                    match_datetime += timedelta(days=7)  # Weekly matches

                # Away matches (speelronde 18-34)
                for i, opponent in enumerate(opponents[:17], 18):
                    match = Activity(
                        project=team,  # 🔹 Away team (our perspective)
                        period=league,  # 🔹 Competition/Season via relationship
                        activity_type="match",
                        title=f"{opponent.name} vs {team.name}",
                        description=f"Eredivisie Speelronde {i}",
                        start_time=match_datetime,  # 🔹 Explicit: match datetime
                        end_time=match_datetime + timedelta(hours=2),
                        opponent_project=opponent,  # 🔹 Home team via relationship
                        location=f"{opponent.parent_project.name} Stadion",  # 🔹 From opponent club
                        metadata={
                            "round": i,  # 🔹 Store: round number
                            "status": "scheduled",  # 🔹 Store: match status
                            # "score": {"home": 0, "away": 0},  # Future: score
                            # "goalscorers": [],  # Future: goalscorers
                        },
                    )
                    matches_for_team.append(match)
                    match_datetime += timedelta(days=7)

                # Bulk create
                Activity.objects.bulk_create(matches_for_team)
                total_matches += len(matches_for_team)

                self.stdout.write(
                    self.style.SUCCESS(f"  ✅ {team.name}: Created {len(matches_for_team)} matches")
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Total matches created: {total_matches}"))
        self.stdout.write("")

        # Sample verification
        ajax_1 = teams[0]
        season = Period.objects.filter(project=ajax_1, parent_period__isnull=True).first()
        if season:
            league = Period.objects.filter(parent_period=season, name="League").first()
            if league:
                matches = Activity.objects.filter(
                    project=ajax_1, period=league, activity_type="match"
                ).order_by("start_time")[:5]

                self.stdout.write(f"\nSample: {ajax_1.name} first 5 matches (LEAN DATA):")
                for match in matches:
                    date_str = match.start_time.strftime("%Y-%m-%d %H:%M")
                    ronde = match.metadata.get("round")
                    _is_home = (
                        match.project == ajax_1 and match.opponent_project.name != ajax_1.name
                    )
                    home = (
                        "(H)"
                        if match.location and ajax_1.parent_project.name in match.location
                        else "(A)"
                    )
                    self.stdout.write(f"  - R{ronde:02d} {date_str} {home}: {match.title}")
                    self.stdout.write(f"      └─ Location: {match.location}")
                    self.stdout.write(
                        f"      └─ Competition: {match.period.name} ({match.period.parent_period.name})"
                    )

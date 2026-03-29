"""
Management command to generate KNVB Beker (Cup) matches for the 2024/2025 season.
Knock-out tournament: Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Final
"""

import random
from datetime import datetime, timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Generate KNVB Beker (Cup) knock-out matches for the 2024/2025 season"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("KNVB BEKER (CUP) MATCHES SEEDING")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Get KNVB
        knvb = Organisation.objects.get(slug="knvb")

        # Get all '1' teams (18 Eredivisie teams)
        teams = list(
            Project.objects.filter(parent_project__organisation=knvb, name__endswith=" 1").order_by(
                "name"
            )
        )

        self.stdout.write(f"Found {len(teams)} Eredivisie teams for KNVB Beker")
        self.stdout.write("")

        # Knock-out rounds structure
        # 18 teams → Round of 32 needs 14 additional teams (simulate with byes)
        # For demo: only use 16 teams (Round of 16 → QF → SF → Final)
        tournament_teams = teams[:16]  # First 16 teams
        random.shuffle(tournament_teams)  # Randomize bracket

        self.stdout.write(f"Tournament bracket: {len(tournament_teams)} teams")
        self.stdout.write("")

        # Cup rounds with dates
        rounds = [
            {
                "name": "Round of 16",
                "short": "R16",
                "date": datetime(2024, 9, 18, 20, 0),
                "teams": 16,
            },
            {
                "name": "Quarter-finals",
                "short": "QF",
                "date": datetime(2024, 12, 18, 20, 0),
                "teams": 8,
            },
            {"name": "Semi-finals", "short": "SF", "date": datetime(2025, 3, 5, 20, 0), "teams": 4},
            {"name": "Final", "short": "F", "date": datetime(2025, 4, 27, 14, 30), "teams": 2},
        ]

        total_matches = 0

        with transaction.atomic():
            # Track winners per round (for demo: random assignment)
            remaining_teams = tournament_teams.copy()

            for round_info in rounds:
                round_name = round_info["name"]
                round_short = round_info["short"]
                match_datetime = timezone.make_aware(round_info["date"])
                num_teams = round_info["teams"]

                self.stdout.write(f"Generating {round_name} ({num_teams} teams)...")

                # Pair teams for this round
                num_matches = num_teams // 2
                next_round_teams = []

                for match_num in range(num_matches):
                    # Get two teams for this match
                    team1 = remaining_teams[match_num * 2]
                    team2 = remaining_teams[match_num * 2 + 1]

                    # Random home team
                    if random.choice([True, False]):
                        home_team = team1
                        away_team = team2
                    else:
                        home_team = team2
                        away_team = team1

                    # Get Cup period for home team
                    season = Period.objects.filter(
                        project=home_team, parent_period__isnull=True
                    ).first()
                    cup = Period.objects.filter(parent_period=season, name="Cup").first()

                    if not cup:
                        self.stdout.write(f"  ⚠️  {home_team.name}: No Cup competition")
                        continue

                    # Create match for home team
                    match = Activity(
                        project=home_team,  # 🔹 Home team
                        period=cup,  # 🔹 Cup competition
                        activity_type="match",
                        title=f"{home_team.name} vs {away_team.name}",
                        description=f"KNVB Beker {round_name}",
                        start_time=match_datetime,  # 🔹 Cup match date
                        end_time=match_datetime + timedelta(hours=2),
                        opponent_project=away_team,  # 🔹 Away team
                        location=f"{home_team.parent_project.name} Stadion",  # 🔹 Home stadium
                        metadata={
                            "round": round_short,  # 🔹 Store: round (R16, QF, SF, F)
                            "match_number": match_num + 1,  # 🔹 Match number in round
                            "status": "scheduled",  # 🔹 Store: match status
                            # Future: "score": {"home": 0, "away": 0}
                            # Future: "winner": team_id
                            # Future: "penalties": {"home": 0, "away": 0}
                        },
                    )
                    match.save()
                    total_matches += 1

                    # For demo: random winner advances
                    winner = random.choice([team1, team2])
                    next_round_teams.append(winner)

                self.stdout.write(f"  ✅ Created {num_matches} matches for {round_name}")

                # Update remaining teams for next round
                remaining_teams = next_round_teams

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Total cup matches created: {total_matches}"))
        self.stdout.write("")

        # Show sample cup matches for Ajax
        ajax_1 = Project.objects.filter(name="Ajax 1").first()
        if ajax_1:
            season = Period.objects.filter(project=ajax_1, parent_period__isnull=True).first()
            cup = Period.objects.filter(parent_period=season, name="Cup").first()

            if cup:
                matches = Activity.objects.filter(
                    project=ajax_1, period=cup, activity_type="match"
                ).order_by("start_time")

                self.stdout.write(f"Sample: {ajax_1.name} cup matches ({matches.count()} total):")
                for match in matches:
                    date_str = match.start_time.strftime("%Y-%m-%d %H:%M")
                    ronde = match.metadata.get("round")
                    self.stdout.write(f"  - {ronde:>3} {date_str}: {match.title}")
                    self.stdout.write(f"      └─ Location: {match.location}")

        self.stdout.write("")

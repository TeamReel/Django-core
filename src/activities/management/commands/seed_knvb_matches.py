"""
Management command to seed KNVB match data following the Ajax 1 League pattern.

Creates realistic matches for:
- Eredivisie first teams: 20 League matches + 5 Cup matches
- O21 teams: 16 O21 Divisie matches
- Jong teams: League matches
- Women's teams: League matches

Matches use real opponents from the database.
"""
import random
from datetime import datetime, timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed KNVB matches following Ajax 1 League pattern"

    def add_arguments(self, parser):
        parser.add_argument(
            "--team",
            type=str,
            help='Only seed matches for specific team (e.g., "Ajax")',
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )

    def handle(self, *args, **options):
        self.stdout.write("🏟️  KNVB Match Seeding (Following Ajax 1 Pattern)")
        self.stdout.write("=" * 70)

        # Get KNVB organisation
        try:
            knvb = Organisation.objects.get(name="KNVB")
        except Organisation.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ KNVB organisation not found"))
            return

        current_season_name = "Season 2024/2025"
        total_created = 0

        # Get Eredivisie first teams with players (ending in " 1", excluding youth/reserves)
        eredivisie_teams = (
            Project.objects.filter(
                organisation=knvb,
                name__endswith=" 1",
                parent_project__isnull=False,
            )
            .exclude(name__icontains="O21")
            .exclude(name__icontains="Jong")
            .exclude(name__icontains="Vrouwen")
            .exclude(name__icontains="Reserves")
        )

        # Filter to only teams with players
        eredivisie_teams_with_players = []
        for team in eredivisie_teams:
            has_players = ProjectMembership.objects.filter(
                project=team, period__name=current_season_name
            ).exists()
            if has_players:
                eredivisie_teams_with_players.append(team)

        self.stdout.write(
            f"\n📋 Found {len(eredivisie_teams_with_players)} Eredivisie teams with players"
        )

        with transaction.atomic():
            # 1. SEED LEAGUE MATCHES FOR EERSTE TEAMS (20 matches)
            self.stdout.write("\n⚽ Seeding League matches for Eredivisie teams...")

            for team in eredivisie_teams_with_players:
                if options.get("team") and options["team"].lower() not in team.name.lower():
                    continue

                # Get League competition
                try:
                    league_comp = Period.objects.get(
                        organisation=knvb,
                        project=team,
                        name="League",
                        parent_period__name=current_season_name,
                    )
                except Period.DoesNotExist:
                    self.stdout.write(f"  ⚠️  No League competition for {team.name}")
                    continue

                # Check if matches already exist
                existing = Activity.objects.filter(project=team, period=league_comp).count()
                if existing > 0:
                    self.stdout.write(f"  ⏭️  {team.name} - {existing} matches exist, skipping")
                    continue

                # Get potential opponents (other Eredivisie teams with players)
                opponents = [t for t in eredivisie_teams_with_players if t.id != team.id]

                if len(opponents) < 10:
                    self.stdout.write(f"  ⚠️  Not enough opponents for {team.name}")
                    continue

                # Select 10 random opponents
                selected_opponents = random.sample(opponents, min(10, len(opponents)))

                # Create 20 matches (10 home, 10 away)
                created = 0
                start_date = datetime(2024, 8, 10)

                for i, opponent in enumerate(selected_opponents):
                    # Home match
                    match_date = start_date + timedelta(days=i * 14)  # Every 2 weeks
                    match_date += timedelta(days=random.randint(-2, 2))

                    # Weekend time
                    if match_date.weekday() >= 5:
                        hour = random.choice([14, 16, 20])
                    else:
                        hour = random.choice([18, 20, 21])

                    match_time = match_date.replace(hour=hour, minute=random.choice([0, 30, 45]))

                    home_score = random.randint(0, 4)
                    away_score = random.randint(0, 3)

                    if not options.get("dry_run"):
                        Activity.objects.create(
                            organisation=knvb,
                            project=team,
                            period=league_comp,
                            name=f"{team.name} vs {opponent.name}",
                            activity_type="match",
                            start_time=match_time,
                            end_time=match_time + timedelta(hours=2),
                            location=f"{team.parent_project.name} Stadium",
                            metadata={
                                "match_type": "league",
                                "home_team": team.name,
                                "away_team": opponent.name,
                                "home_score": home_score,
                                "away_score": away_score,
                                "competition": "League",
                                "matchday": i * 2 + 1,
                                "is_home": True,
                            },
                        )
                    created += 1

                    # Away match
                    away_date = start_date + timedelta(days=i * 14 + 7)
                    away_date += timedelta(days=random.randint(-2, 2))

                    if away_date.weekday() >= 5:
                        hour = random.choice([14, 16, 20])
                    else:
                        hour = random.choice([18, 20, 21])

                    away_time = away_date.replace(hour=hour, minute=random.choice([0, 30, 45]))

                    home_score = random.randint(0, 3)
                    away_score = random.randint(0, 4)

                    if not options.get("dry_run"):
                        Activity.objects.create(
                            organisation=knvb,
                            project=team,
                            period=league_comp,
                            name=f"{opponent.name} vs {team.name}",
                            activity_type="match",
                            start_time=away_time,
                            end_time=away_time + timedelta(hours=2),
                            location=f"{opponent.parent_project.name} Stadium",
                            metadata={
                                "match_type": "league",
                                "home_team": opponent.name,
                                "away_team": team.name,
                                "home_score": home_score,
                                "away_score": away_score,
                                "competition": "League",
                                "matchday": i * 2 + 2,
                                "is_home": False,
                            },
                        )
                    created += 1

                self.stdout.write(f"  ✅ {team.name}: {created} League matches")
                total_created += created

            # 2. SEED CUP MATCHES (5 rounds)
            self.stdout.write("\n🏆 Seeding Cup matches...")

            cup_rounds = [
                {"name": "Round of 32", "date": datetime(2024, 9, 18)},
                {"name": "Round of 16", "date": datetime(2024, 10, 30)},
                {"name": "Quarter-finals", "date": datetime(2025, 1, 22)},
                {"name": "Semi-finals", "date": datetime(2025, 3, 5)},
                {"name": "Final", "date": datetime(2025, 4, 27)},
            ]

            for team in eredivisie_teams_with_players:
                if options.get("team") and options["team"].lower() not in team.name.lower():
                    continue

                try:
                    cup_comp = Period.objects.get(
                        organisation=knvb,
                        project=team,
                        name="Cup",
                        parent_period__name=current_season_name,
                    )
                except Period.DoesNotExist:
                    continue

                existing = Activity.objects.filter(project=team, period=cup_comp).count()
                if existing > 0:
                    continue

                opponents = [t for t in eredivisie_teams_with_players if t.id != team.id]
                if len(opponents) < 5:
                    continue

                selected_opponents = random.sample(opponents, 5)
                created = 0

                for _, (round_info, opponent) in enumerate(zip(cup_rounds, selected_opponents)):
                    match_date = round_info["date"]
                    match_date += timedelta(days=random.randint(-1, 1))
                    match_time = match_date.replace(hour=20, minute=45)

                    is_home = random.choice([True, False])
                    home_team = team.name if is_home else opponent.name
                    away_team = opponent.name if is_home else team.name

                    home_score = random.randint(0, 3)
                    away_score = random.randint(0, 3)

                    # Ensure no draw in cup
                    if home_score == away_score:
                        if random.choice([True, False]):
                            home_score += 1
                        else:
                            away_score += 1

                    if not options.get("dry_run"):
                        Activity.objects.create(
                            organisation=knvb,
                            project=team,
                            period=cup_comp,
                            name=f"{home_team} vs {away_team}",
                            activity_type="match",
                            start_time=match_time,
                            end_time=match_time + timedelta(hours=2, minutes=15),
                            location=f"{team.parent_project.name} Stadium"
                            if is_home
                            else f"{opponent.parent_project.name} Stadium",
                            metadata={
                                "match_type": "cup",
                                "round": round_info["name"],
                                "home_team": home_team,
                                "away_team": away_team,
                                "home_score": home_score,
                                "away_score": away_score,
                                "competition": "Cup",
                                "is_home": is_home,
                            },
                        )
                    created += 1

                if created > 0:
                    self.stdout.write(f"  ✅ {team.name}: {created} Cup matches")
                    total_created += created

            # 3. SEED O21 DIVISIE MATCHES
            self.stdout.write("\n👶 Seeding O21 Divisie matches...")

            o21_teams = Project.objects.filter(
                organisation=knvb, name__contains="O21", parent_project__isnull=False
            )

            o21_teams_with_players = []
            for team in o21_teams:
                has_players = ProjectMembership.objects.filter(
                    project=team, period__name=current_season_name
                ).exists()
                if has_players:
                    o21_teams_with_players.append(team)

            for team in o21_teams_with_players:
                if options.get("team") and options["team"].lower() not in team.name.lower():
                    continue

                try:
                    o21_comp = Period.objects.get(
                        organisation=knvb,
                        project=team,
                        name="O21 Divisie 1",
                        parent_period__name=current_season_name,
                    )
                except Period.DoesNotExist:
                    continue

                existing = Activity.objects.filter(project=team, period=o21_comp).count()
                if existing > 0:
                    continue

                opponents = [t for t in o21_teams_with_players if t.id != team.id]
                if len(opponents) < 8:
                    continue

                selected_opponents = random.sample(opponents, min(8, len(opponents)))
                created = 0
                start_date = datetime(2024, 8, 12)

                for i, opponent in enumerate(selected_opponents):
                    # Home and away
                    for is_home in [True, False]:
                        match_date = start_date + timedelta(days=i * 14 + (7 if not is_home else 0))
                        match_date += timedelta(days=random.randint(-2, 2))
                        match_time = match_date.replace(hour=random.choice([14, 15, 16]), minute=0)

                        if is_home:
                            home_team = team.name
                            away_team = opponent.name
                            location = f"{team.parent_project.name} Youth Complex"
                        else:
                            home_team = opponent.name
                            away_team = team.name
                            location = f"{opponent.parent_project.name} Youth Complex"

                        home_score = random.randint(0, 4)
                        away_score = random.randint(0, 4)

                        if not options.get("dry_run"):
                            Activity.objects.create(
                                organisation=knvb,
                                project=team,
                                period=o21_comp,
                                name=f"{home_team} vs {away_team}",
                                activity_type="match",
                                start_time=match_time,
                                end_time=match_time + timedelta(hours=1, minutes=45),
                                location=location,
                                metadata={
                                    "match_type": "youth_league",
                                    "home_team": home_team,
                                    "away_team": away_team,
                                    "home_score": home_score,
                                    "away_score": away_score,
                                    "competition": "O21 Divisie 1",
                                    "is_home": is_home,
                                },
                            )
                        created += 1

                if created > 0:
                    self.stdout.write(f"  ✅ {team.name}: {created} O21 Divisie matches")
                    total_created += created

        if options.get("dry_run"):
            self.stdout.write(f"\n🔍 Dry run complete - would have created {total_created} matches")
        else:
            self.stdout.write(f"\n✅ Total matches created: {total_created}")

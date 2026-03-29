"""
Level 10: Random Match Seeding for Teams with Players

Creates matches for all teams that have player selections:
- LEAGUE: ~10 random matches against other teams in same competition type
- CUP: ~5 knockout-style matches

Teams are matched based on competition type:
- Senior teams (1, Reserves, First Team) → League & Cup competitions
- Youth teams (O21, Jong, U21, Primavera) → Youth competitions

Matches within same organisation but ACROSS clubs:
- Jong Ajax vs Jong Feyenoord (not Jong Ajax vs Ajax 1)
- Ajax Vrouwen vs NEC Vrouwen

Usage:
    python manage.py seed_random_matches --organisation knvb
    python manage.py seed_random_matches --all
    python manage.py seed_random_matches --dry-run
"""

import random
from datetime import datetime, time, timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Seed random matches for teams with player selections"

    def add_arguments(self, parser):
        parser.add_argument(
            "--organisation",
            type=str,
            help="Organisation slug (e.g., knvb, dfb, figc)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed matches for all organisations",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview without creating records",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("[DRY-RUN] Preview mode - No records will be created")
            )

        # Determine scope
        if options["all"]:
            organisations = Organisation.objects.all()
        elif options["organisation"]:
            try:
                org = Organisation.objects.get(slug=options["organisation"])
                organisations = [org]
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"[X] Organisation '{options['organisation']}' not found")
                )
                return
        else:
            self.stdout.write(self.style.ERROR("[X] Specify --organisation <slug> or --all"))
            return

        total_created = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] {org.name} ({org.slug})")

            # Get all teams with players (players are registered to TEAMS, not seasons)
            teams_with_players = list(
                Project.objects.filter(
                    parent_project__organisation=org,  # Teams belong to clubs in this org
                    memberships__user__isnull=False,  # Teams with actual players
                    is_active=True,
                )
                .select_related("parent_project")
                .distinct()
            )

            if not teams_with_players:
                self.stdout.write("  [!] No teams with players found")
                continue

            # Split into youth and senior teams
            youth_keywords = [
                "o21",
                "jong",
                "u21",
                "youth",
                "jeugd",
                "primavera",
                "vrouwen",
                "women",
            ]
            youth_teams = [
                t for t in teams_with_players if any(kw in t.name.lower() for kw in youth_keywords)
            ]
            senior_teams = [
                t
                for t in teams_with_players
                if not any(kw in t.name.lower() for kw in youth_keywords)
            ]

            self.stdout.write(
                f"  [TEAMS] {len(senior_teams)} senior, {len(youth_teams)} youth teams with players"
            )

            # Get competitions from team seasons
            # Per DEMO_DATA_STRUCTURE.md: Season period is scoped to TEAM, not Club!
            # Period.project = Team (e.g., Ajax 1), NOT Club (Ajax)
            ref_team = (
                senior_teams[0] if senior_teams else (youth_teams[0] if youth_teams else None)
            )
            if not ref_team:
                self.stdout.write("  [!] No teams found")
                continue

            # Get the TEAM's season (not club's season!)
            team_season = Period.objects.filter(
                project=ref_team, parent_period__isnull=True  # Season belongs to the TEAM
            ).first()

            if not team_season:
                self.stdout.write(f"  [!] No season found for team {ref_team.name}")
                continue

            self.stdout.write(f"  [SEASON] {team_season.name} (Team: {ref_team.name})")

            # Get competitions from this team season
            # Try specific names first, then fall back to metadata type or name patterns
            all_comps = list(Period.objects.filter(parent_period=team_season))

            # Find league competition (by name or metadata)
            league_comp = None
            for comp in all_comps:
                comp_type = (
                    comp.metadata.get("competition_type", "").lower() if comp.metadata else ""
                )
                comp_name = comp.name.lower()
                if (
                    "league" in comp_name
                    or "eredivisie" in comp_name
                    or "bundesliga" in comp_name
                    or "serie a" in comp_name
                    or "premier" in comp_name
                    or comp_type == "league"
                ):
                    league_comp = comp
                    break

            # Find cup competition
            cup_comp = None
            for comp in all_comps:
                comp_type = (
                    comp.metadata.get("competition_type", "").lower() if comp.metadata else ""
                )
                comp_name = comp.name.lower()
                if (
                    "cup" in comp_name
                    or "beker" in comp_name
                    or "pokal" in comp_name
                    or comp_type == "cup"
                ):
                    cup_comp = comp
                    break

            # Find youth competition
            youth_comp = None
            for comp in all_comps:
                comp_type = (
                    comp.metadata.get("competition_type", "").lower() if comp.metadata else ""
                )
                comp_name = comp.name.lower()
                if (
                    "youth" in comp_name
                    or "o21" in comp_name
                    or "jong" in comp_name
                    or comp_type == "youth"
                ):
                    youth_comp = comp
                    break

            # Debug: Show what competitions exist
            comp_names = [c.name for c in all_comps]
            self.stdout.write(
                f"  [COMPS] Available: {', '.join(comp_names) if comp_names else 'None'}"
            )
            self.stdout.write(
                f"  [COMPS] League: {'✓ ' + league_comp.name if league_comp else '✗'}, "
                f"Cup: {'✓ ' + cup_comp.name if cup_comp else '✗'}, "
                f"Youth: {'✓ ' + youth_comp.name if youth_comp else '✗'}"
            )

            # Generate matches for senior teams
            if league_comp and len(senior_teams) >= 2:
                created = self._generate_matches(senior_teams, league_comp, "league", dry_run)
                total_created += created
                self.stdout.write(f"    [LEAGUE] Created {created} matches for senior teams")

            if cup_comp and len(senior_teams) >= 2:
                created = self._generate_matches(senior_teams, cup_comp, "cup", dry_run)
                total_created += created
                self.stdout.write(f"    [CUP] Created {created} matches for senior teams")

            # Generate matches for youth teams
            if youth_comp and len(youth_teams) >= 2:
                created = self._generate_matches(youth_teams, youth_comp, "league", dry_run)
                total_created += created
                self.stdout.write(f"    [YOUTH] Created {created} matches for youth teams")

                # Youth cup matches
                created = self._generate_matches(youth_teams, youth_comp, "cup", dry_run)
                total_created += created
                self.stdout.write(f"    [YOUTH CUP] Created {created} matches for youth teams")

        self.stdout.write(self.style.SUCCESS(f"\n[✓] Total: {total_created} matches created"))

    def _generate_matches(self, teams, competition, match_type, dry_run):
        """
        Generate random matches for given teams in competition.

        Args:
            teams: List of Project objects (teams)
            competition: Period object (competition)
            match_type: "league" (~10 matches) or "cup" (~5 matches)
            dry_run: If True, don't create records

        Returns:
            Number of matches created
        """
        num_matches = 10 if match_type == "league" else 5
        created_count = 0

        for team in teams:
            # Check if team already has matches in this competition
            existing = Activity.objects.filter(
                project=team, period=competition, activity_type="match"
            ).count()

            if existing > 0:
                continue  # Skip teams that already have matches

            # Generate random opponents from other teams
            possible_opponents = [t for t in teams if t.id != team.id]

            if len(possible_opponents) < 1:
                continue

            # Randomly select opponents (can repeat if not enough teams)
            opponents = random.choices(
                possible_opponents, k=min(num_matches, len(possible_opponents))
            )
            if len(opponents) < num_matches:
                # Repeat opponents to reach desired count
                opponents = opponents * ((num_matches // len(opponents)) + 1)
                opponents = opponents[:num_matches]

            # Generate match datetimes spread across season
            # Get season from competition's parent period
            season = competition.parent_period
            start_date = season.start_date or datetime(2024, 8, 1).date()
            end_date = season.end_date or datetime(2025, 7, 31).date()

            # Spread matches evenly
            total_days = (end_date - start_date).days
            day_interval = total_days // (num_matches + 1)

            matches = []
            for i, opponent in enumerate(opponents, 1):
                # Random weekend day
                days_offset = day_interval * i
                match_date = start_date + timedelta(days=days_offset)

                # Adjust to weekend (Saturday=5, Sunday=6)
                weekday = match_date.weekday()
                if weekday < 5:  # Monday-Friday
                    match_date += timedelta(days=(5 - weekday))  # Move to Saturday

                # Random kickoff time (14:30, 16:30, 18:30, 20:00)
                kickoff_times = [
                    time(14, 30),
                    time(16, 30),
                    time(18, 30),
                    time(20, 0),
                ]
                kickoff_time = random.choice(kickoff_times)

                match_datetime = timezone.make_aware(datetime.combine(match_date, kickoff_time))

                # Get location from home club
                location = None
                stadium = None
                city = None
                if team.parent_project and team.parent_project.metadata:
                    stadium = team.parent_project.metadata.get("stadium")
                    city = team.parent_project.metadata.get("city")
                    if stadium:
                        location = f"{stadium}, {city}" if city else stadium
                    elif city:
                        location = city

                match = Activity(
                    project=team,  # Home team
                    period=competition,
                    activity_type="match",
                    title=f"{team.name} vs {opponent.name}",
                    description=f"{competition.name} - Round {i}",
                    start_time=match_datetime,
                    end_time=match_datetime + timedelta(hours=2),
                    opponent_project=opponent,  # Away team
                    location=location or f"{team.parent_project.name} Stadium",
                    metadata={
                        "round": i,
                        "competition_type": match_type,
                        "season": season.name,
                        "home_club": team.parent_project.name if team.parent_project else None,
                        "away_club": (
                            opponent.parent_project.name if opponent.parent_project else None
                        ),
                        "stadium": stadium,
                        "city": city,
                        "status": "scheduled",
                    },
                )
                matches.append(match)

            if not dry_run:
                Activity.objects.bulk_create(matches)

            created_count += len(matches)

        return created_count

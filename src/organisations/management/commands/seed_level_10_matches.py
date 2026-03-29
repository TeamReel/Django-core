"""
Level 10: Activity (Match) Seeding for TeamReel Demo

Creates complete competition schedules:
- LEAGUE: Full round-robin (all teams play each other home & away)
- CUP: Knockout format (quarter-finals, semi-finals, final)

Matches are created as Activity records with:
- opponent_project: Team from same organisation
- location: From parent club metadata (stadium, city)
- start_time: Within competition date range, spread evenly
- metadata: Pre-filled with match context (round, competition_type, club data)

Usage:
    python manage.py seed_level_10_matches --organisation knvb --season "Season 2024/2025"
    python manage.py seed_level_10_matches --all  # All seasons
    python manage.py seed_level_10_matches --dry-run  # Preview without creating
"""

import random
from datetime import datetime, time, timedelta

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Seed Level 10: Complete match schedules (league round-robin + cup knockout)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--organisation",
            type=str,
            help="Organisation slug (e.g., knvb, dfb, figc)",
        )
        parser.add_argument(
            "--season",
            type=str,
            help="Season name filter (e.g., 'Season 2024/2025')",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed matches for all organisations and seasons",
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
                self.style.WARNING("[DRY-RUN] DRY RUN MODE - No records will be created")
            )

        # Determine scope
        if options["all"]:
            organisations = Organisation.objects.all()
            season_filter = None
        elif options["organisation"]:
            try:
                org = Organisation.objects.get(slug=options["organisation"])
                organisations = [org]
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"[X] Organisation '{options['organisation']}' not found")
                )
                return
            season_filter = options.get("season")
        else:
            self.stdout.write(self.style.ERROR("[X] Specify --organisation <slug> or --all"))
            return

        total_created = 0

        for org in organisations:
            self.stdout.write(f"\n[ORG] Processing {org.name} ({org.slug})")

            # Get all root periods (seasons) for this organisation
            seasons_query = Period.objects.filter(organisation=org, parent_period__isnull=True)

            if season_filter:
                seasons_query = seasons_query.filter(name__icontains=season_filter)

            seasons = list(seasons_query.order_by("start_date"))

            if not seasons:
                self.stdout.write(self.style.WARNING("   [!] No seasons found"))
                continue

            self.stdout.write(f"   [DATE] Found {len(seasons)} season(s)")

            for season in seasons:
                self.stdout.write(
                    f"\n   [SEASON] Season: {season.name}"
                    f" ({season.start_date} to {season.end_date})"
                )

                # Get all teams with players for this season ONCE (performance)

                all_teams_with_players = list(
                    Project.objects.filter(
                        memberships__period=season,  # Players registered for the SEASON
                        memberships__user__isnull=False,  # Must have actual players
                        is_active=True,
                    )
                    .select_related("parent_project")
                    .distinct()
                )

                # Split into youth and senior teams
                youth_keywords = ["o21", "jong", "u21", "youth", "jeugd", "primavera"]
                youth_teams = [
                    t
                    for t in all_teams_with_players
                    if any(kw in t.name.lower() for kw in youth_keywords)
                ]
                senior_teams = [
                    t
                    for t in all_teams_with_players
                    if not any(kw in t.name.lower() for kw in youth_keywords)
                ]

                self.stdout.write(
                    f"      [TEAMS] Found {len(senior_teams)} senior teams"
                    f" and {len(youth_teams)} youth teams with players"
                )

                # Get competitions (child periods) for this season
                competitions = list(Period.objects.filter(parent_period=season).order_by("name"))

                if not competitions:
                    self.stdout.write(f"      [!] No competitions found for {season.name}")
                    continue

                self.stdout.write(f"      [COMP] Found {len(competitions)} competition(s)")

                for competition in competitions:
                    competition_type = competition.metadata.get("competition_type", "league")
                    self.stdout.write(
                        f"\n      [LIST] Competition: {competition.name} (Type: {competition_type})"
                    )

                    # Select teams based on competition type
                    if competition_type in ["youth", "o21"]:
                        teams = youth_teams
                    else:  # league, cup, etc.
                        teams = senior_teams

                    if len(teams) < 2:
                        self.stdout.write(
                            f"         [!] Need at least 2 teams"
                            f" for {competition.name}, found {len(teams)}"
                        )
                        self.stdout.write(
                            "         [!] Run 'seed_competition_registrations'"
                            " first to register teams"
                        )
                        continue

                    self.stdout.write(f"         [TEAM] {len(teams)} registered teams")

                    # Generate matches based on competition type
                    if competition_type == "cup":
                        created = self._seed_cup_matches(competition, teams, season, dry_run)
                    else:  # league (default)
                        created = self._seed_league_matches(competition, teams, season, dry_run)

                    total_created += created

                    if not dry_run:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"         [+] Created {created} matches for {competition.name}"
                            )
                        )

        # Summary
        self.stdout.write("\n" + "=" * 70)
        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY-RUN] DRY RUN COMPLETE - No changes made"))
            self.stdout.write(f"[STAT] Would create: {total_created} matches")
        else:
            self.stdout.write(
                self.style.SUCCESS(f"[+] SEEDING COMPLETE: {total_created} matches created")
            )

    def _seed_league_matches(self, competition, teams, season, dry_run):
        """
        Generate full round-robin league schedule.
        Each team plays every other team twice (home and away).

        For N teams: N*(N-1) total matches
        E.g., 18 teams = 18*17 = 306 matches
        """
        created = 0
        all_matches = []

        # Generate all unique pairings
        for i, home_team in enumerate(teams):
            for away_team in teams[i + 1 :]:
                # Home match
                all_matches.append((home_team, away_team))
                # Away match (reverse fixture)
                all_matches.append((away_team, home_team))

        total_matches = len(all_matches)
        self.stdout.write(f"         [STAT] Generating {total_matches} league matches")

        # Generate match dates spread across competition period
        match_dates = self._generate_match_dates(
            competition.start_date, competition.end_date, total_matches
        )

        # Create matches
        for (home_team, away_team), match_date in zip(all_matches, match_dates):
            # Get stadium from parent club
            home_club = home_team.parent_project
            location = home_club.metadata.get(
                "stadium", home_club.metadata.get("city", "Unknown Stadium")
            )

            title = f"{home_team.name} vs {away_team.name}"

            # Add kickoff time (prefer weekends, prime time slots)
            kickoff_hour = random.choice([12, 14, 16, 18, 20])
            kickoff_minute = random.choice([0, 30])
            start_time = timezone.make_aware(
                datetime.combine(match_date, time(hour=kickoff_hour, minute=kickoff_minute))
            )
            end_time = start_time + timedelta(hours=2)

            # Pre-fill metadata with club data
            home_club_data = {
                "name": home_club.name,
                "city": home_club.metadata.get("city", ""),
                "logo": home_club.metadata.get("logo", ""),
                "colors": home_club.metadata.get("colors", {}),
            }

            away_club = away_team.parent_project
            away_club_data = {
                "name": away_club.name,
                "city": away_club.metadata.get("city", ""),
                "logo": away_club.metadata.get("logo", ""),
                "colors": away_club.metadata.get("colors", {}),
            }

            metadata = {
                "is_home": True,  # Always from home team perspective
                "competition_type": "league",
                "competition": competition.name,
                "season": season.name,
                "home_club": home_club_data,
                "away_club": away_club_data,
                "round": None,  # TBD: could calculate round number
                "stadium": location,
            }

            if not dry_run:
                Activity.objects.create(
                    project=home_team,
                    period=competition,
                    opponent_project=away_team,
                    title=title,
                    activity_type="match",
                    start_time=start_time,
                    end_time=end_time,
                    location=location,
                    description=f"{competition.name} - {season.name}",
                    metadata=metadata,
                )
                created += 1
            else:
                if created < 5:  # Only show first 5 in dry-run
                    self.stdout.write(
                        f"            [DRY RUN] {title} @ {location}"
                        f" on {match_date} {kickoff_hour}:{kickoff_minute:02d}"
                    )

        return created

    def _seed_cup_matches(self, competition, teams, season, dry_run):
        """
        Generate knockout cup matches.
        Structure: Quarter-finals (8 teams) → Semi-finals (4) → Final (2)
        Total: 4 + 2 + 1 = 7 matches
        """
        created = 0

        # Select teams for cup (random 8 teams)
        if len(teams) < 8:
            self.stdout.write(f"         [!] Need at least 8 teams for cup, found {len(teams)}")
            return 0

        cup_teams = random.sample(teams, 8)
        self.stdout.write(f"         [SEASON] Generating knockout cup with {len(cup_teams)} teams")

        # Split competition period into phases
        total_days = (competition.end_date - competition.start_date).days
        qf_date = competition.start_date + timedelta(days=total_days // 4)
        sf_date = competition.start_date + timedelta(days=total_days // 2)
        final_date = competition.end_date - timedelta(days=7)  # Week before end

        rounds = [
            ("Quarter-Final", qf_date, cup_teams[:8], 4),
            ("Semi-Final", sf_date, None, 2),  # Winners from QF
            ("Final", final_date, None, 1),
        ]

        winners = []

        for round_name, base_date, round_teams, num_matches in rounds:
            if round_teams is None:
                # Use winners from previous round
                round_teams = winners
                winners = []

            self.stdout.write(f"         [DATE] {round_name}: {num_matches} match(es)")

            # Pair teams
            for i in range(0, len(round_teams), 2):
                home_team = round_teams[i]
                away_team = round_teams[i + 1] if i + 1 < len(round_teams) else round_teams[0]

                # Random home advantage
                if random.random() > 0.5:
                    home_team, away_team = away_team, home_team

                home_club = home_team.parent_project
                location = home_club.metadata.get("stadium", home_club.metadata.get("city", ""))

                title = f"{home_team.name} vs {away_team.name}"

                # Cup matches typically evening kickoffs
                kickoff_hour = random.choice([19, 20, 21])
                start_time = timezone.make_aware(
                    datetime.combine(base_date, time(hour=kickoff_hour, minute=0))
                )
                end_time = start_time + timedelta(hours=2, minutes=30)  # Extra time possible

                metadata = {
                    "is_home": True,
                    "competition_type": "cup",
                    "competition": competition.name,
                    "season": season.name,
                    "round": round_name,
                    "home_club": {
                        "name": home_club.name,
                        "city": home_club.metadata.get("city", ""),
                    },
                    "away_club": {"name": away_team.parent_project.name},
                    "knockout": True,
                }

                if not dry_run:
                    Activity.objects.create(
                        project=home_team,
                        period=competition,
                        opponent_project=away_team,
                        title=f"{round_name}: {title}",
                        activity_type="match",
                        start_time=start_time,
                        end_time=end_time,
                        location=location,
                        description=f"{competition.name} {round_name} - {season.name}",
                        metadata=metadata,
                    )
                    created += 1
                else:
                    self.stdout.write(
                        f"            [DRY RUN] {round_name}: {title} @ {location} on {base_date}"
                    )

                # Randomly select winner for next round
                winners.append(random.choice([home_team, away_team]))

        return created

    def _generate_match_dates(self, start_date, end_date, count):
        """
        Generate evenly distributed dates between start and end.
        Prefers weekends (Saturday/Sunday) for match scheduling.

        Args:
            start_date: Competition start date
            end_date: Competition end date
            count: Number of dates to generate

        Returns:
            List of date objects
        """
        if count <= 0:
            return []

        total_days = (end_date - start_date).days

        if total_days < count:
            # If not enough days, use weekly intervals
            interval = 7  # One match per week
        else:
            # Calculate interval to spread matches evenly
            interval = max(7, total_days // count)  # At least weekly

        dates = []
        current_date = start_date

        while len(dates) < count and current_date <= end_date:
            # Prefer weekends (Saturday=5, Sunday=6)
            weekday = current_date.weekday()

            if weekday == 5:  # Saturday - perfect
                match_date = current_date
            elif weekday == 6:  # Sunday - also good
                match_date = current_date
            elif weekday < 5:  # Weekday - shift to next Saturday
                days_to_saturday = 5 - weekday
                match_date = current_date + timedelta(days=days_to_saturday)
            else:  # Shouldn't happen, but fallback
                match_date = current_date

            # Ensure within bounds
            if match_date > end_date:
                match_date = end_date

            if match_date not in dates:  # Avoid duplicates
                dates.append(match_date)

            # Move to next interval
            current_date += timedelta(days=interval)

        # If we still don't have enough dates, fill with remaining Saturdays
        while len(dates) < count:
            current_date += timedelta(days=7)
            if current_date <= end_date and current_date not in dates:
                dates.append(current_date)
            elif current_date > end_date:
                break

        return sorted(dates[:count])  # Return exactly count dates, sorted

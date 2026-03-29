"""
Management command to seed demo activity data.
"""

import logging
import random
from datetime import datetime, time, timedelta

from activities.models import Activity, Participation, Period
from activities.signals import (
    activity_post_delete,
    activity_post_save,
    participation_post_delete,
    participation_post_save,
)
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models.signals import post_delete, post_save
from django.utils import timezone
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership
from search.signals import handle_delete, handle_save

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo activity data (Periods, Activities, Participations)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Delete existing activity data before seeding",
        )
        parser.add_argument(
            "--league",
            type=str,
            help="Seed only specific league (e.g., 'Eredivisie')",
        )

    def handle(self, *args, **options):
        # Disconnect search signals to prevent Redis errors
        # Note: They are connected in search/apps.py without dispatch_uid
        post_save.disconnect(handle_save)
        post_delete.disconnect(handle_delete)

        # Disconnect activity audit signals to prevent DB overload/timeouts during bulk delete
        post_save.disconnect(activity_post_save, sender=Activity)
        post_delete.disconnect(activity_post_delete, sender=Activity)
        post_save.disconnect(participation_post_save, sender=Participation)
        post_delete.disconnect(participation_post_delete, sender=Participation)

        self.stdout.write("Signals disconnected (Search & Audit)")

        clean_mode = options["clean"]

        if clean_mode:
            self.stdout.write("Cleaning existing activities...")
            Participation.objects.all().delete()
            Activity.objects.all().delete()
            # Delete child periods first to avoid ProtectedError
            Period.objects.filter(parent_period__isnull=False).delete()
            Period.objects.all().delete()

        self.stdout.write("Seeding activity data...")

        # 1. Period Structure: Season -> Half -> Month
        today = timezone.now().date()
        # Default season: Aug current year -> May next year
        # If we are in Jan-May, season started Aug last year
        if today.month < 6:
            season_start = today.replace(year=today.year - 1, month=8, day=1)
        else:
            season_start = today.replace(month=8, day=1)

        season_end = season_start + timedelta(days=300)  # ~May 30th

        # Only process football leagues
        football_leagues = [
            "Eredivisie",
            "Premier League",
            "La Liga",
            "Serie A",
            "Ligue 1",
            "Bundesliga",
        ]

        # Master data mapping for leagues
        league_metadata = {
            "Eredivisie": {"federation": "KNVB", "country": "Netherlands", "level": 1},
            "Premier League": {"federation": "FA", "country": "England", "level": 1},
            "La Liga": {"federation": "RFEF", "country": "Spain", "level": 1},
            "Serie A": {"federation": "FIGC", "country": "Italy", "level": 1},
            "Ligue 1": {"federation": "FFF", "country": "France", "level": 1},
            "Bundesliga": {"federation": "DFB", "country": "Germany", "level": 1},
        }

        organisations = Organisation.objects.filter(name__in=football_leagues)

        # Filter by league if specified
        if options.get("league"):
            organisations = organisations.filter(name=options["league"])

        if not organisations.exists():
            self.stdout.write(
                self.style.WARNING("No organisations found. Run seed_football_data first.")
            )
            return

        for org in organisations:
            self.stdout.write(f"Processing Org: {org.name}")

            # Enrich Organisation metadata
            if org.name in league_metadata:
                org.metadata = league_metadata[org.name]
                org.save(update_fields=["metadata"])

            # 2. Get Real Opponents (Other Projects in same Org)
            # Use 'list' to fetch from DB so we can exclude self later in Python
            all_projects = list(Project.objects.filter(organisation=org))

            # Process EACH Project Individually (Per User Request)
            for project in all_projects:
                self.stdout.write(f" - Seeding Project: {project.name}")

                # Enrich Project metadata with team-specific master data
                project.metadata = {
                    "stadium": f"{project.name} Stadium",
                    "city": self._get_city_for_team(project.name),
                    "founded": random.randint(1880, 1950),
                    "colors": self._get_team_colors(project.name),
                }
                project.save(update_fields=["metadata"])

                # Create Root Period (Season) for THIS project
                season, created = Period.objects.get_or_create(
                    organisation=org,
                    project=project,
                    name=f"Season {season_start.year}/{season_end.year} - {project.name}",
                    defaults={
                        "start_date": season_start,
                        "end_date": season_end,
                        "description": f"Official match calendar for {project.name} ({season_start.year}/{season_end.year}).",
                    },
                )

                # Create Child Periods (Competitions)
                # League (Runs full season)
                league_period, _ = Period.objects.get_or_create(
                    organisation=org,
                    project=project,
                    parent_period=season,
                    name=f"League Competition - {project.name}",
                    defaults={
                        "start_date": season_start,
                        "end_date": season_end,
                        "description": "Main league fixtures",
                    },
                )

                # Cup (Runs mid-season)
                cup_start = season_start + timedelta(days=60)
                cup_end = season_end - timedelta(days=30)

                cup_period, _ = Period.objects.get_or_create(
                    organisation=org,
                    project=project,
                    parent_period=season,
                    name=f"Cup Tournament - {project.name}",
                    defaults={
                        "start_date": cup_start,
                        "end_date": cup_end,
                        "description": "Knockout cup competition",
                    },
                )

                # Opponents are ALL OTHER projects in this org
                possible_opponents = [p for p in all_projects if p.id != project.id]

                # If no other projects exist (e.g. single-team demo), fallback to fake names
                if not possible_opponents:
                    fallback_names = [
                        "FC Rivals",
                        "United City",
                        "Athletic Club",
                        "Real Sport",
                        "Sporting West",
                    ]
                    # We pass strings as fallback
                    self.seed_project_activities(
                        project, league_period, cup_period, fallback_names, use_real_projects=False
                    )
                else:
                    self.seed_project_activities(
                        project,
                        league_period,
                        cup_period,
                        possible_opponents,
                        use_real_projects=True,
                    )

        self.stdout.write(self.style.SUCCESS("Successfully seeded activities!"))

    def seed_project_activities(
        self, project, league_period, cup_period, opponents, use_real_projects=True
    ):
        """
        Seeds League (Weekly) and Cup (Monthly/Sporadic) matches.
        """

        # --- 1. League Fixtures (Weekly) ---
        current_date = league_period.start_date
        match_round = 1

        while current_date < league_period.end_date:
            # League matches usually on weekends (Sat/Sun)
            days_until_weekend = (5 - current_date.weekday()) % 7  # Move to Saturday
            match_date = current_date + timedelta(days=days_until_weekend)

            # 80% chance of a match this weekend (skips for intl breaks etc)
            if random.random() < 0.8:
                opponent = random.choice(opponents)
                opponent_name = opponent.name if use_real_projects else opponent
                is_home = random.choice([True, False])

                # Kickoff: Sat 18:00 or Sun 14:30
                if random.random() < 0.6:
                    # Saturday
                    day_time = time(18, 0)
                else:
                    # Sunday (add 1 day)
                    match_date += timedelta(days=1)
                    day_time = time(14, 30)

                start_dt = datetime.combine(match_date, day_time)
                start_time = timezone.make_aware(start_dt)
                end_time = start_time + timedelta(hours=2)

                self.create_match(
                    project,
                    league_period,
                    start_time,
                    end_time,
                    opponent_name,
                    is_home,
                    f"League Round {match_round}",
                    "League Match",
                )
                match_round += 1

            # Next week
            current_date += timedelta(days=7)

        # --- 2. Cup Fixtures (Mid-week, Sporadic) ---
        current_date = cup_period.start_date
        cup_round_names = ["Round of 32", "Round of 16", "Quarter Final", "Semi Final"]

        for round_name in cup_round_names:
            # Random date in the next 30-40 days for this round
            days_skip = random.randint(14, 28)
            current_date += timedelta(days=days_skip)

            if current_date > cup_period.end_date:
                break

            # Cup matches mid-week (Tuesday/Wednesday)
            days_until_tue = (1 - current_date.weekday()) % 7
            match_date = current_date + timedelta(days=days_until_tue + random.choice([0, 1]))

            opponent = random.choice(opponents)
            opponent_name = opponent.name if use_real_projects else opponent
            is_home = random.choice([True, False])  # Random draw

            start_dt = datetime.combine(match_date, time(20, 0))  # 20:00 kickoff
            start_time = timezone.make_aware(start_dt)
            end_time = start_time + timedelta(hours=2, minutes=30)  # Extra time possible

            self.create_match(
                project,
                cup_period,
                start_time,
                end_time,
                opponent_name,
                is_home,
                f"Cup {round_name}",
                "Cup Match",
            )

    def create_match(
        self, project, period, start, end, opponent_name, is_home, context_label, type_label
    ):
        title = f"vs {opponent_name}" if is_home else f"@ {opponent_name}"
        location = f"{project.name} Stadium" if is_home else f"{opponent_name} Arena"

        description = (
            f"{context_label}\n"
            f"Opponent: {opponent_name}\n"
            f"Venue: {location}\n"
            f"Kickoff: {start.strftime('%H:%M')}"
        )

        Activity.objects.get_or_create(
            project=project,
            period=period,
            start_time=start,
            defaults={
                "title": title,
                # Frontend treats match activities as activity_type=match
                "activity_type": "match",
                "end_time": end,
                "location": location,
                "description": description,
                "metadata": {
                    "opponent": opponent_name,
                    "is_home": is_home,
                    "context": context_label,
                    "match_label": type_label,
                    # Add score for past matches (40% chance)
                    **(
                        {
                            "score": f"{random.randint(0,4)}-{random.randint(0,3)}",
                            "attendance": random.randint(15000, 55000) if is_home else None,
                        }
                        if start < timezone.now() and random.random() < 0.4
                        else {}
                    ),
                },
            },
        )

    def seed_participations(self, activity):
        # Add random members as participants
        # We need PROJECT memberships, then map to ORG memberships
        project_memberships = ProjectMembership.objects.filter(project=activity.project)

        for pm in project_memberships:
            # Get the Organisation Membership for this user in this org
            try:
                # Assuming ProjectMembership links to User, we find their Org Memberhsip
                # Note: This depends on exact User->PM vs User->Membership relations
                # Most robust: Membership.objects.get(user=pm.user, organisation=activity.project.organisation)
                if hasattr(pm, "user"):
                    mem = Membership.objects.get(
                        user=pm.user, organisation=activity.project.organisation
                    )
                else:
                    # Fallback if PM structure is different (e.g. PM links to Membership directly)
                    # Based on ecosystem, PM links User.
                    continue

                status_options = ["confirmed", "confirmed", "tentative", "declined", "no_response"]
                status = random.choice(status_options)

                role = "Player"
                if "Coach" in getattr(pm, "roles", []):  # Pseudo-code check
                    role = "Coach"

                Participation.objects.create(
                    activity=activity,
                    member=mem,
                    role=role,
                    status=status,
                )
            except Membership.DoesNotExist:
                continue
            except Exception:
                # Ignore duplicate errors or structural mismatches for robustness
                continue

    def _get_city_for_team(self, team_name):
        """Extract or infer city from team name."""
        city_map = {
            "Ajax": "Amsterdam",
            "Feyenoord": "Rotterdam",
            "PSV": "Eindhoven",
            "FC Utrecht": "Utrecht",
            "AZ": "Alkmaar",
            "Liverpool": "Liverpool",
            "Manchester": "Manchester",
            "Arsenal": "London",
            "Chelsea": "London",
            "Barcelona": "Barcelona",
            "Real Madrid": "Madrid",
            "Juventus": "Turin",
            "Milan": "Milan",
            "Inter": "Milan",
            "Paris Saint-Germain": "Paris",
            "Lyon": "Lyon",
            "Bayern": "Munich",
            "Dortmund": "Dortmund",
        }

        for key, city in city_map.items():
            if key in team_name:
                return city

        return team_name.split()[0]

    def _get_team_colors(self, team_name):
        """Return team colors based on name."""
        color_map = {
            "Ajax": ["red", "white"],
            "Feyenoord": ["red", "white"],
            "PSV": ["red", "white"],
            "FC Utrecht": ["red", "white"],
            "AZ": ["red", "white"],
            "Liverpool": ["red"],
            "Manchester United": ["red"],
            "Manchester City": ["sky blue"],
            "Arsenal": ["red", "white"],
            "Chelsea": ["blue"],
            "Barcelona": ["blue", "red"],
            "Real Madrid": ["white"],
            "Juventus": ["black", "white"],
            "Milan": ["red", "black"],
            "Inter": ["blue", "black"],
            "Paris Saint-Germain": ["blue", "red"],
            "Bayern": ["red", "blue"],
            "Dortmund": ["yellow", "black"],
        }

        for key, colors in color_map.items():
            if key in team_name:
                return colors

        return ["blue", "white"]

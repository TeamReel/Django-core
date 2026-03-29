"""
TeamReel Production Demo Seeder - Version 2.0 (Clean Architecture)

This command rebuilds the production database with realistic TeamReel football data
using the new hierarchical architecture with parent_project, opponent_project, and period fields.

Hierarchy:
1. Users (base foundation)
2. Organisation: KNVB
3. Clubs (Project, parent_project=NULL): Ajax, PSV, Feyenoord
4. Teams (Project, parent_project=Club): Ajax Eerste Elftal, Jong Ajax, etc.
5. Seasons (Period, parent=NULL): 2024/2025
6. Competitions (Period, parent=Season): Eredivisie, KNVB Beker
7. Players (ProjectMembership with period=Season)
8. Matches (Activity with opponent_project=Team)

Usage:
    # Local test:
    python manage.py seed_teamreel_demo

    # Production (Railway):
    $env:DATABASE_URL="postgresql://postgres:..."; python manage.py seed_teamreel_demo
"""

from datetime import datetime

from activities.models import Activity, Period
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from organisations.models import Organisation
from projects.models.project import Project
from projects.models.project_membership import ProjectMembership

User = get_user_model()


class Command(BaseCommand):
    help = "Seed TeamReel production demo with hierarchical football data"

    def __init__(self):
        super().__init__()
        # Storage for created objects
        self.users = {}
        self.orgs = {}
        self.clubs = {}
        self.teams = {}
        self.seasons = {}
        self.competitions = {}
        self.players = {}
        self.matches = {}

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n🏟️  TeamReel Demo Seeder v2.0\n"))
        self.stdout.write("=" * 70)

        # Hierarchical seeding (strict order for ForeignKey integrity)
        self.level_1_users()
        self.level_2_organisation()
        self.level_3_clubs()
        self.level_4_teams()
        self.level_5_seasons()
        self.level_6_competitions()
        self.level_7_players()
        self.level_8_matches()

        self.stdout.write(self.style.SUCCESS("\n✅ TeamReel demo data complete!\n"))
        self.show_summary()

    def level_1_users(self):
        """Level 1: Create foundation users"""
        self.stdout.write("\n[1/8] 👥 Creating Users...")

        users_data = [
            {
                "key": "admin",
                "email": "admin@teamreel.demo",
                "first_name": "Demo",
                "last_name": "Administrator",
                "is_superuser": True,
                "is_staff": True,
            },
            {
                "key": "ajax_coach",
                "email": "john.heitinga@ajax.nl",
                "first_name": "John",
                "last_name": "Heitinga",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "key": "ajax_player",
                "email": "brian.brobbey@ajax.nl",
                "first_name": "Brian",
                "last_name": "Brobbey",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "key": "psv_coach",
                "email": "peter.bosz@psv.nl",
                "first_name": "Peter",
                "last_name": "Bosz",
                "is_superuser": False,
                "is_staff": False,
            },
            {
                "key": "psv_player",
                "email": "luuk.dejong@psv.nl",
                "first_name": "Luuk",
                "last_name": "de Jong",
                "is_superuser": False,
                "is_staff": False,
            },
        ]

        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults={
                    "first_name": user_data["first_name"],
                    "last_name": user_data["last_name"],
                    "email_verified": True,
                    "is_active": True,
                    "is_staff": user_data["is_staff"],
                    "is_superuser": user_data["is_superuser"],
                },
            )
            if created:
                user.set_password("demo123")  # Demo password
                user.save()
                self.stdout.write(f"  ✓ Created: {user.email}")
            else:
                self.stdout.write(f"  ↻ Exists: {user.email}")

            self.users[user_data["key"]] = user

        self.stdout.write(self.style.SUCCESS(f"  ✅ Level 1 complete: {len(self.users)} users"))

    def level_2_organisation(self):
        """Level 2: Create KNVB (root organisation)"""
        self.stdout.write("\n[2/8] 🏛️  Creating Organisation...")

        org, created = Organisation.objects.get_or_create(
            name="KNVB",
            defaults={
                "description": "Koninklijke Nederlandse Voetbal Bond",
                "creator": self.users["admin"],
                "metadata": {
                    "country": "Netherlands",
                    "type": "federation",
                    "sport": "football",
                    "website": "https://www.knvb.nl",
                },
            },
        )
        if created:
            self.stdout.write(f"  ✓ Created: {org.name}")
        else:
            self.stdout.write(f"  ↻ Exists: {org.name}")

        self.orgs["knvb"] = org
        self.stdout.write(
            self.style.SUCCESS(f"  ✅ Level 2 complete: {len(self.orgs)} organisation")
        )

    def level_3_clubs(self):
        """Level 3: Create Clubs (Projects with parent_project=NULL)"""
        self.stdout.write("\n[3/8] ⚽ Creating Clubs (root projects)...")

        clubs_data = [
            {
                "key": "ajax",
                "name": "Ajax",
                "description": "AFC Ajax - Amsterdam",
                "metadata": {
                    "city": "Amsterdam",
                    "stadium": "Johan Cruijff ArenA",
                    "founded": 1900,
                    "colors": ["#D2122E", "#FFFFFF"],
                },
            },
            {
                "key": "psv",
                "name": "PSV",
                "description": "PSV Eindhoven",
                "metadata": {
                    "city": "Eindhoven",
                    "stadium": "Philips Stadion",
                    "founded": 1913,
                    "colors": ["#ED1C24", "#FFFFFF"],
                },
            },
            {
                "key": "feyenoord",
                "name": "Feyenoord",
                "description": "Feyenoord Rotterdam",
                "metadata": {
                    "city": "Rotterdam",
                    "stadium": "De Kuip",
                    "founded": 1908,
                    "colors": ["#E30613", "#FFFFFF"],
                },
            },
        ]

        for club_data in clubs_data:
            club, created = Project.objects.get_or_create(
                name=club_data["name"],
                organisation=self.orgs["knvb"],
                parent_project=None,  # ROOT PROJECT (CRITICAL!)
                defaults={
                    "description": club_data["description"],
                    "creator": self.users["admin"],
                    "metadata": club_data["metadata"],
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created club: {club.name}")
            else:
                self.stdout.write(f"  ↻ Club exists: {club.name}")

            self.clubs[club_data["key"]] = club

        self.stdout.write(self.style.SUCCESS(f"  ✅ Level 3 complete: {len(self.clubs)} clubs"))

    def level_4_teams(self):
        """Level 4: Create Teams (Projects with parent_project=Club)"""
        self.stdout.write("\n[4/8] 👕 Creating Teams (child projects)...")

        teams_data = [
            # Ajax teams
            {
                "key": "ajax_1",
                "name": "Ajax Eerste Elftal",
                "club": "ajax",
                "description": "Ajax hoofdmacht",
            },
            {
                "key": "jong_ajax",
                "name": "Jong Ajax",
                "club": "ajax",
                "description": "Ajax beloftenteam",
            },
            # PSV teams
            {
                "key": "psv_1",
                "name": "PSV Eerste Elftal",
                "club": "psv",
                "description": "PSV hoofdmacht",
            },
            {
                "key": "jong_psv",
                "name": "Jong PSV",
                "club": "psv",
                "description": "PSV beloftenteam",
            },
            # Feyenoord teams
            {
                "key": "feyenoord_1",
                "name": "Feyenoord Eerste Elftal",
                "club": "feyenoord",
                "description": "Feyenoord hoofdmacht",
            },
        ]

        for team_data in teams_data:
            parent_club = self.clubs[team_data["club"]]

            team, created = Project.objects.get_or_create(
                name=team_data["name"],
                organisation=self.orgs["knvb"],
                parent_project=parent_club,  # HIERARCHICAL LINK (CRITICAL!)
                defaults={
                    "description": team_data["description"],
                    "creator": self.users["admin"],
                    "metadata": {"team_type": "professional", "age_group": "senior"},
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created team: {team.name} (parent: {parent_club.name})")
            else:
                self.stdout.write(f"  ↻ Team exists: {team.name}")

            self.teams[team_data["key"]] = team

        self.stdout.write(self.style.SUCCESS(f"  ✅ Level 4 complete: {len(self.teams)} teams"))

    def level_5_seasons(self):
        """Level 5: Create Seasons (Periods with parent=NULL)"""
        self.stdout.write("\n[5/8] 📅 Creating Seasons (root periods)...")

        seasons_data = [
            {
                "key": "2024_2025",
                "name": "Seizoen 2024/2025",
                "start": datetime(2024, 8, 1),
                "end": datetime(2025, 6, 30),
            },
        ]

        for season_data in seasons_data:
            season, created = Period.objects.get_or_create(
                name=season_data["name"],
                organisation=self.orgs["knvb"],
                parent=None,  # ROOT PERIOD (CRITICAL!)
                defaults={
                    "start_date": timezone.make_aware(season_data["start"]),
                    "end_date": timezone.make_aware(season_data["end"]),
                    "creator": self.users["admin"],
                    "metadata": {"type": "season", "year_range": "2024-2025"},
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created season: {season.name}")
            else:
                self.stdout.write(f"  ↻ Season exists: {season.name}")

            self.seasons[season_data["key"]] = season

        self.stdout.write(self.style.SUCCESS(f"  ✅ Level 5 complete: {len(self.seasons)} seasons"))

    def level_6_competitions(self):
        """Level 6: Create Competitions (Periods with parent=Season)"""
        self.stdout.write("\n[6/8] 🏆 Creating Competitions (child periods)...")

        competitions_data = [
            {
                "key": "eredivisie",
                "name": "Eredivisie 2024/2025",
                "season": "2024_2025",
                "start": datetime(2024, 8, 10),
                "end": datetime(2025, 5, 18),
            },
            {
                "key": "knvb_beker",
                "name": "KNVB Beker 2024/2025",
                "season": "2024_2025",
                "start": datetime(2024, 9, 15),
                "end": datetime(2025, 4, 20),
            },
        ]

        for comp_data in competitions_data:
            parent_season = self.seasons[comp_data["season"]]

            comp, created = Period.objects.get_or_create(
                name=comp_data["name"],
                organisation=self.orgs["knvb"],
                parent=parent_season,  # HIERARCHICAL LINK (CRITICAL!)
                defaults={
                    "start_date": timezone.make_aware(comp_data["start"]),
                    "end_date": timezone.make_aware(comp_data["end"]),
                    "creator": self.users["admin"],
                    "metadata": {"type": "competition", "competition_name": comp_data["key"]},
                },
            )
            if created:
                self.stdout.write(
                    f"  ✓ Created competition: {comp.name} (parent: {parent_season.name})"
                )
            else:
                self.stdout.write(f"  ↻ Competition exists: {comp.name}")

            self.competitions[comp_data["key"]] = comp

        self.stdout.write(
            self.style.SUCCESS(f"  ✅ Level 6 complete: {len(self.competitions)} competitions")
        )

    def level_7_players(self):
        """Level 7: Create Players (ProjectMembership with period=Season)"""
        self.stdout.write("\n[7/8] 🏃 Creating Player Memberships...")

        # Ajax players
        ajax_players = [
            {
                "user_key": "ajax_player",
                "team_key": "ajax_1",
                "access_role": "viewer",
                "character_role": "player",
            },
            {
                "user_key": "ajax_coach",
                "team_key": "ajax_1",
                "access_role": "admin",
                "character_role": "coach",
            },
        ]

        # PSV players
        psv_players = [
            {
                "user_key": "psv_player",
                "team_key": "psv_1",
                "access_role": "viewer",
                "character_role": "player",
            },
            {
                "user_key": "psv_coach",
                "team_key": "psv_1",
                "access_role": "admin",
                "character_role": "coach",
            },
        ]

        all_players = ajax_players + psv_players
        season = self.seasons["2024_2025"]

        for player_data in all_players:
            user = self.users[player_data["user_key"]]
            team = self.teams[player_data["team_key"]]

            membership, created = ProjectMembership.objects.get_or_create(
                user=user,
                project=team,
                period=season,  # SEASON LINK (CRITICAL!)
                defaults={
                    "role": player_data["access_role"],
                    "metadata": {
                        "character_role": player_data["character_role"],
                        "contract_type": "professional",
                        "jersey_number": 9,
                    },
                },
            )
            if created:
                self.stdout.write(
                    f"  ✓ Added: {user.first_name} {user.last_name} → {team.name} ({season.name})"
                )
            else:
                self.stdout.write(f"  ↻ Membership exists: {user.email} in {team.name}")

            player_key = f"{player_data['user_key']}_{player_data['team_key']}"
            self.players[player_key] = membership

        self.stdout.write(
            self.style.SUCCESS(f"  ✅ Level 7 complete: {len(self.players)} memberships")
        )

    def level_8_matches(self):
        """Level 8: Create Matches (Activities with opponent_project=Team)"""
        self.stdout.write("\n[8/8] ⚔️  Creating Matches...")

        matches_data = [
            {
                "key": "ajax_vs_psv",
                "name": "Ajax vs PSV",
                "home_team": "ajax_1",
                "away_team": "psv_1",
                "competition": "eredivisie",
                "date": datetime(2024, 9, 21, 14, 30),
            },
            {
                "key": "psv_vs_feyenoord",
                "name": "PSV vs Feyenoord",
                "home_team": "psv_1",
                "away_team": "feyenoord_1",
                "competition": "eredivisie",
                "date": datetime(2024, 10, 5, 18, 45),
            },
        ]

        for match_data in matches_data:
            home_team = self.teams[match_data["home_team"]]
            away_team = self.teams[match_data["away_team"]]
            competition = self.competitions[match_data["competition"]]

            match, created = Activity.objects.get_or_create(
                name=match_data["name"],
                period=competition,
                opponent_project=away_team,  # OPPONENT LINK (CRITICAL!)
                defaults={
                    "description": f"{home_team.name} tegen {away_team.name}",
                    "project": home_team,
                    "scheduled_at": timezone.make_aware(match_data["date"]),
                    "creator": self.users["admin"],
                    "metadata": {
                        "match_type": "league",
                        "venue": "home",
                        "home_team_id": home_team.id,
                        "away_team_id": away_team.id,
                    },
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created match: {match.name} (opponent: {away_team.name})")
            else:
                self.stdout.write(f"  ↻ Match exists: {match.name}")

            self.matches[match_data["key"]] = match

        self.stdout.write(self.style.SUCCESS(f"  ✅ Level 8 complete: {len(self.matches)} matches"))

    def show_summary(self):
        """Display final summary"""
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("📊 SEEDING SUMMARY"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"  Users:           {len(self.users)}")
        self.stdout.write(f"  Organisations:   {len(self.orgs)}")
        self.stdout.write(f"  Clubs:           {len(self.clubs)}")
        self.stdout.write(f"  Teams:           {len(self.teams)}")
        self.stdout.write(f"  Seasons:         {len(self.seasons)}")
        self.stdout.write(f"  Competitions:    {len(self.competitions)}")
        self.stdout.write(f"  Players:         {len(self.players)}")
        self.stdout.write(f"  Matches:         {len(self.matches)}")
        self.stdout.write("=" * 70)

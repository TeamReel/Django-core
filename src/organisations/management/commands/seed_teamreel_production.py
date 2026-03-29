"""
TeamReel Production Seeder - Complete Football Demo Data

This command rebuilds the production demo database with realistic football data
following the TeamReel data strategy:

Hierarchy:
1. Land/Federatie (Organisation) → KNVB
2. Club (Project, parent=NULL) → Ajax, PSV, Feyenoord
3. Team (Project, parent=Club) → Ajax Eerste Elftal, Jong Ajax
4. Seizoen (Period, parent=NULL) → 2024/2025
5. Competitie (Period, parent=Seizoen) → Eredivisie, KNVB Beker
6. Wedstrijd (Activity) → With opponent_project_id
7. Spelers (ProjectMembership + Participation with period_id)

Usage:
    python manage.py seed_teamreel_production
"""

from decimal import Decimal

from activities.models import Activity, Participation, Period
from credits.models import CreditsBalance, ProjectCreditsBalance
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone
from organisations.models import Membership, Organisation
from projects.models.project import Project
from projects.models.project_membership import ProjectMembership
from transactions.models import SourceTypeChoices, Transaction, WalletScopeChoices

User = get_user_model()


class Command(BaseCommand):
    help = "Seed TeamReel production demo with complete football data hierarchy"

    def __init__(self):
        super().__init__()
        self.users = {}
        self.organisations = {}
        self.clubs = {}
        self.teams = {}
        self.periods = {}
        self.activities = {}

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n🏟️  TeamReel Production Seeder\n"))
        self.stdout.write("=" * 60)

        # Step 1: Create demo users
        self.create_users()

        # Step 2: Create Land/Federatie (Organisation)
        self.create_federations()

        # Step 3: Create Clubs (Projects with parent=NULL)
        self.create_clubs()

        # Step 4: Create Teams (Projects with parent=Club)
        self.create_teams()

        # Step 5: Create Seizoenen (Periods)
        self.create_seasons()

        # Step 6: Create Competities (Child Periods)
        self.create_competitions()

        # Step 7: Add Spelers to Teams (ProjectMembership)
        self.create_players()

        # Step 8: Link Spelers to Seizoen (Participation with period_id)
        self.link_players_to_season()

        # Step 9: Create Wedstrijden (Activities with opponent)
        self.create_matches()

        # Step 10: Setup Credits
        self.setup_credits()

        # Step 11: Seed governance defaults (policies + routing rules)
        self.seed_governance()

        self.stdout.write(self.style.SUCCESS("\n✅ TeamReel demo data complete!\n"))

    def seed_governance(self):
        """Seed governance defaults used by TeamReel."""
        self.stdout.write("\n🛡️  Seeding governance defaults...")
        # Idempotent command (safe to run multiple times)
        call_command("seed_teamreel_governance", execute=True)

    def create_users(self):
        """Create demo users with different roles"""
        self.stdout.write("\n📋 Creating users...")

        users_data = [
            {
                "email": "admin@teamreel.app",
                "name": "Demo Admin",
                "role": "admin",
                "is_superuser": True,
            },
            {
                "email": "coach.ajax@teamreel.app",
                "name": "John Heitinga",
                "role": "coach",
                "is_superuser": False,
            },
            {
                "email": "player.ajax@teamreel.app",
                "name": "Brian Brobbey",
                "role": "player",
                "is_superuser": False,
            },
            {
                "email": "media.ajax@teamreel.app",
                "name": "Ajax Media Manager",
                "role": "club_admin",
                "is_superuser": False,
            },
        ]

        for user_data in users_data:
            # Split name into first_name and last_name
            name_parts = user_data["name"].split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email_verified": True,
                    "is_active": True,
                    "is_staff": user_data.get("is_superuser", False),
                    "is_superuser": user_data.get("is_superuser", False),
                },
            )
            if created:
                user.set_unusable_password()
                user.save()
                self.stdout.write(f"  ✓ Created user: {user.email}")
            else:
                self.stdout.write(f"  ↻ User exists: {user.email}")

            self.users[user_data["role"]] = user

    def create_federations(self):
        """Create Land/Federatie organisations"""
        self.stdout.write("\n🏛️  Creating federations...")

        federations = [
            {
                "name": "KNVB",
                "description": "Koninklijke Nederlandse Voetbal Bond",
                "metadata": {
                    "country": "Netherlands",
                    "sport": "football",
                    "type": "federation",
                    "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/KNVB_Logo.svg/200px-KNVB_Logo.svg.png",
                },
            },
        ]

        for fed_data in federations:
            org, created = Organisation.objects.get_or_create(
                name=fed_data["name"],
                defaults={
                    "description": fed_data["description"],
                    "creator": self.users["admin"],
                    "metadata": fed_data["metadata"],
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created federation: {org.name}")
            else:
                self.stdout.write(f"  ↻ Federation exists: {org.name}")

            self.organisations["knvb"] = org

    def create_clubs(self):
        """Create Clubs (Projects with parent=NULL)"""
        self.stdout.write("\n⚽ Creating clubs...")

        clubs_data = [
            {
                "name": "Ajax",
                "description": "AFC Ajax - Amsterdam",
                "metadata": {
                    "sport": "football",
                    "city": "Amsterdam",
                    "stadium": "Johan Cruijff ArenA",
                    "stadium_capacity": 54990,
                    "founded": 1900,
                    "colors": ["#D2122E", "#FFFFFF"],
                    "primary_color": "#D2122E",
                    "secondary_color": "#FFFFFF",
                    "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/200px-Ajax_Amsterdam.svg.png",
                    "sponsor": "Ziggo",
                    "kit_supplier": "adidas",
                    "goalkeeper_color": "#00FF00",
                },
            },
            {
                "name": "PSV",
                "description": "PSV Eindhoven",
                "metadata": {
                    "sport": "football",
                    "city": "Eindhoven",
                    "stadium": "Philips Stadion",
                    "stadium_capacity": 35000,
                    "founded": 1913,
                    "colors": ["#ED1B23", "#FFFFFF"],
                    "primary_color": "#ED1B23",
                    "secondary_color": "#FFFFFF",
                    "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/PSV_Eindhoven.svg/200px-PSV_Eindhoven.svg.png",
                    "sponsor": "Puma",
                    "kit_supplier": "Puma",
                    "goalkeeper_color": "#FFD700",
                },
            },
            {
                "name": "Feyenoord",
                "description": "Feyenoord Rotterdam",
                "metadata": {
                    "sport": "football",
                    "city": "Rotterdam",
                    "stadium": "De Kuip",
                    "stadium_capacity": 47500,
                    "founded": 1908,
                    "colors": ["#E30613", "#FFFFFF"],
                    "primary_color": "#E30613",
                    "secondary_color": "#FFFFFF",
                    "logo_url": "https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Feyenoord_logo.svg/200px-Feyenoord_logo.svg.png",
                    "sponsor": "Bingoal",
                    "kit_supplier": "Castore",
                    "goalkeeper_color": "#00FF00",
                },
            },
        ]

        for club_data in clubs_data:
            club, created = Project.objects.get_or_create(
                name=club_data["name"],
                organisation=self.organisations["knvb"],
                parent_project=None,
                defaults={
                    "description": club_data["description"],
                    "creator": self.users["admin"],
                    "metadata": club_data["metadata"],
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created club: {club.name}")
            else:
                self.stdout.write(f"  ↻ Club exists: {club.name}")

            club_key = club.name.lower()
            self.clubs[club_key] = club

    def create_teams(self):
        """Create Teams (Projects with parent=Club)"""
        self.stdout.write("\n👥 Creating teams...")

        teams_data = [
            {
                "club": "ajax",
                "name": "Ajax Eerste Elftal",
                "description": "Hoofdmacht van Ajax",
                "metadata": {
                    "team_type": "senior",
                    "age_group": "senior",
                    "gender": "male",
                    "formation_default": "4-3-3",
                },
            },
            {
                "club": "ajax",
                "name": "Jong Ajax",
                "description": "Reserve team",
                "metadata": {
                    "team_type": "reserve",
                    "age_group": "u23",
                    "gender": "male",
                    "formation_default": "4-3-3",
                },
            },
            {
                "club": "psv",
                "name": "PSV Eerste Elftal",
                "description": "Hoofdmacht van PSV",
                "metadata": {
                    "team_type": "senior",
                    "age_group": "senior",
                    "gender": "male",
                    "formation_default": "4-3-3",
                },
            },
            {
                "club": "feyenoord",
                "name": "Feyenoord Eerste Elftal",
                "description": "Hoofdmacht van Feyenoord",
                "metadata": {
                    "team_type": "senior",
                    "age_group": "senior",
                    "gender": "male",
                    "formation_default": "4-3-3",
                },
            },
        ]

        for team_data in teams_data:
            club = self.clubs[team_data["club"]]
            team, created = Project.objects.get_or_create(
                name=team_data["name"],
                organisation=self.organisations["knvb"],
                parent_project=club,
                defaults={
                    "description": team_data["description"],
                    "creator": self.users["admin"],
                    "metadata": team_data["metadata"],
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created team: {team.name}")
            else:
                self.stdout.write(f"  ↻ Team exists: {team.name}")

            team_key = f"{team_data['club']}_{team_data['name'].lower().replace(' ', '_')}"
            self.teams[team_key] = team

    def create_seasons(self):
        """Create Seizoenen (Periods with parent=NULL)"""
        self.stdout.write("\n📅 Creating seasons...")

        seasons_data = [
            {
                "name": "Seizoen 2024/2025",
                "start_date": "2024-08-01",
                "end_date": "2025-05-31",
                "metadata": {
                    "season": "2024/2025",
                    "type": "season",
                },
            },
        ]

        for season_data in seasons_data:
            period, created = Period.objects.get_or_create(
                name=season_data["name"],
                organisation=self.organisations["knvb"],
                project=None,
                parent_period=None,
                defaults={
                    "start_date": season_data["start_date"],
                    "end_date": season_data["end_date"],
                    "metadata": season_data["metadata"],
                    "created_by": self.users["admin"],
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created season: {period.name}")
            else:
                self.stdout.write(f"  ↻ Season exists: {period.name}")

            self.periods["season_2024"] = period

    def create_competitions(self):
        """Create Competities (Child Periods)"""
        self.stdout.write("\n🏆 Creating competitions...")

        competitions_data = [
            {
                "name": "Eredivisie 2024/2025",
                "start_date": "2024-08-09",
                "end_date": "2025-05-18",
                "metadata": {
                    "competition_name": "Eredivisie",
                    "competition_type": "league",
                    "total_rounds": 34,
                },
            },
            {
                "name": "KNVB Beker 2024/2025",
                "start_date": "2024-09-01",
                "end_date": "2025-04-20",
                "metadata": {
                    "competition_name": "KNVB Beker",
                    "competition_type": "cup",
                    "format": "knockout",
                },
            },
        ]

        for comp_data in competitions_data:
            period, created = Period.objects.get_or_create(
                name=comp_data["name"],
                organisation=self.organisations["knvb"],
                project=None,
                parent_period=self.periods["season_2024"],
                defaults={
                    "start_date": comp_data["start_date"],
                    "end_date": comp_data["end_date"],
                    "metadata": comp_data["metadata"],
                    "created_by": self.users["admin"],
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created competition: {period.name}")
            else:
                self.stdout.write(f"  ↻ Competition exists: {period.name}")

            comp_key = comp_data["metadata"]["competition_name"].lower().replace(" ", "_")
            self.periods[comp_key] = period

    def create_players(self):
        """Add players to teams via ProjectMembership"""
        self.stdout.write("\n⚽ Creating players...")

        # Ajax Eerste Elftal spelers
        ajax_players = [
            {"name": "Remko Pasveer", "role": "keeper", "number": 22},
            {"name": "Devyne Rensch", "role": "defender", "number": 2},
            {"name": "Josip Šutalo", "role": "defender", "number": 37},
            {"name": "Youri Baas", "role": "defender", "number": 15},
            {"name": "Jorrel Hato", "role": "defender", "number": 4},
            {"name": "Kenneth Taylor", "role": "midfielder", "number": 8},
            {"name": "Jordan Henderson", "role": "midfielder", "number": 6},
            {"name": "Kian Fitz-Jim", "role": "midfielder", "number": 28},
            {"name": "Bertrand Traoré", "role": "forward", "number": 25},
            {"name": "Brian Brobbey", "role": "forward", "number": 9},
            {"name": "Wout Weghorst", "role": "forward", "number": 19},
        ]

        ajax_team = self.teams["ajax_ajax_eerste_elftal"]

        for player_data in ajax_players:
            # Create user for player
            email = f"{player_data['name'].lower().replace(' ', '.')}@ajax.nl"
            name_parts = player_data["name"].split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email_verified": True,
                    "is_active": True,
                },
            )
            if created:
                user.set_unusable_password()
                user.save()

            # Add to team via ProjectMembership
            membership, created = ProjectMembership.objects.get_or_create(
                project=ajax_team,
                user=user,
                defaults={
                    # ProjectMembership.role is RBAC (viewer/editor/admin). Keep players as viewers.
                    "role": ProjectMembership.Role.VIEWER,
                    "metadata": {
                        "shirt_number": player_data["number"],
                        "position": player_data["role"],
                    },
                },
            )
            if created:
                self.stdout.write(
                    f"  ✓ Added player: {user.get_full_name()} (#{player_data['number']})"
                )
            else:
                self.stdout.write(f"  ↻ Player exists: {user.get_full_name()}")

    def link_players_to_season(self):
        """Link players to season via Participation (with period_id)"""
        self.stdout.write("\n🔗 Linking players to season...")

        ajax_team = self.teams["ajax_ajax_eerste_elftal"]
        season = self.periods["season_2024"]

        memberships = ProjectMembership.objects.filter(project=ajax_team, deleted_at__isnull=True)

        for membership in memberships:
            org_membership, _created = Membership.objects.get_or_create(
                organisation=self.organisations["knvb"],
                user=membership.user,
                defaults={
                    "role": "member",
                    "is_active": True,
                    "invited_by": self.users.get("admin"),
                },
            )
            participation, created = Participation.objects.get_or_create(
                period=season,
                member=org_membership,
                defaults={
                    "role": "squad_member",
                    "data": membership.metadata or {},
                    "created_by": self.users.get("admin"),
                },
            )
            if created:
                self.stdout.write(f"  ✓ Linked {membership.user.get_full_name()} to {season.name}")
            else:
                self.stdout.write(f"  ↻ Already linked: {membership.user.get_full_name()}")

    def create_matches(self):
        """Create matches (Activities with opponent_project_id)"""
        self.stdout.write("\n⚽ Creating matches...")

        ajax_team = self.teams["ajax_ajax_eerste_elftal"]
        psv_team = self.teams["psv_psv_eerste_elftal"]
        feyenoord_team = self.teams["feyenoord_feyenoord_eerste_elftal"]
        eredivisie = self.periods["eredivisie"]

        matches_data = [
            {
                "home_team": ajax_team,
                "away_team": psv_team,
                "name": "Ajax vs PSV",
                "start_time": timezone.now() + timezone.timedelta(days=7),
                "round": 20,
                "metadata": {
                    "match_type": "league",
                    "competition": "Eredivisie",
                    "round": 20,
                    "venue": "Johan Cruijff ArenA",
                    "referee": "Danny Makkelie",
                },
            },
            {
                "home_team": feyenoord_team,
                "away_team": ajax_team,
                "name": "Feyenoord vs Ajax",
                "start_time": timezone.now() + timezone.timedelta(days=14),
                "round": 21,
                "metadata": {
                    "match_type": "league",
                    "competition": "Eredivisie",
                    "round": 21,
                    "venue": "De Kuip",
                    "referee": "Serdar Gözübüyük",
                },
            },
        ]

        for match_data in matches_data:
            activity, created = Activity.objects.get_or_create(
                title=match_data["name"],
                project=match_data["home_team"],
                period=eredivisie,
                defaults={
                    "activity_type": "match",
                    "start_time": match_data["start_time"],
                    "end_time": match_data["start_time"] + timezone.timedelta(hours=2),
                    "opponent_project": match_data["away_team"],
                    "metadata": match_data["metadata"],
                    "created_by": self.users["admin"],
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created match: {activity.title}")
            else:
                self.stdout.write(f"  ↻ Match exists: {activity.title}")

            match_key = match_data["name"].lower().replace(" ", "_")
            self.activities[match_key] = activity

    def setup_credits(self):
        """Setup credits for demo users"""
        self.stdout.write("\n💰 Setting up credits...")

        ajax_team = self.teams["ajax_ajax_eerste_elftal"]
        knvb = self.organisations["knvb"]
        admin = self.users["admin"]

        org_txn, org_created = Transaction.objects.get_or_create(
            idempotency_key="seed:teamreel:credits:knvb:org",
            defaults={
                "organization": knvb,
                "wallet_scope": WalletScopeChoices.ORGANIZATION,
                "amount": Decimal("10000.0000"),
                "source_type": SourceTypeChoices.ADJUSTMENT,
                "created_by": admin,
                "notes": "Initial demo credits (organisation wallet)",
            },
        )

        proj_txn, proj_created = Transaction.objects.get_or_create(
            idempotency_key=f"seed:teamreel:credits:knvb:project:{ajax_team.id}",
            defaults={
                "organization": knvb,
                "wallet_scope": WalletScopeChoices.PROJECT,
                "project": ajax_team,
                "amount": Decimal("1000.0000"),
                "source_type": SourceTypeChoices.ADJUSTMENT,
                "created_by": admin,
                "notes": "Initial demo credits (project wallet)",
            },
        )

        if org_created:
            self.stdout.write(f"  ✓ Seeded org credits via transaction: {org_txn.amount}")
        else:
            self.stdout.write("  ↻ Org credits transaction already exists")

        if proj_created:
            self.stdout.write(f"  ✓ Seeded project credits via transaction: {proj_txn.amount}")
        else:
            self.stdout.write("  ↻ Project credits transaction already exists")

        # Print derived balances (maintained by transactions signals)
        org_balance = CreditsBalance.objects.filter(organisation=knvb).first()
        if org_balance:
            self.stdout.write(f"  • Organisation balance now: {org_balance.current_balance}")
        project_balance = ProjectCreditsBalance.objects.filter(project=ajax_team).first()
        if project_balance:
            self.stdout.write(f"  • Project balance now: {project_balance.current_balance}")

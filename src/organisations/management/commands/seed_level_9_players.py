"""
Seed Level 9: All Players & Coaching Staff.

Creates complete team rosters for all Dutch clubs:
- Eerste Elftal: Real players from CSV (270 players, 18 clubs)
- Jong [Club]: Generated players (15 each)
- Tweede Elftal: Generated players (15 each)
- [Club] Vrouwen: Generated players (15 each)

Each team gets:
- 1 Head Coach (Project Admin role)
- 1 Assistant Coach (Team Admin role)
- Players with positions (Keeper, Verdediger, Middenvelder, Aanvaller)

Total: 18 clubs × 4 teams × (1 coach + 1 assistant + ~15 players) = ~1,224 users
"""

import csv
import random
from pathlib import Path

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed all players and coaching staff (Eerste Elftal from CSV, reserves generated)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default="Basis123.",
            help="Password for all generated users (default: Basis123.)",
        )
        parser.add_argument(
            "--csv-path",
            type=str,
            default="documents/05-demo/players_eredivisie_2024_25.csv",
            help="Path to Eredivisie players CSV",
        )
        parser.add_argument(
            "--period",
            type=str,
            default="Season 2024/2025",
            help="Period/season name (default: Season 2024/2025)",
        )

    def handle(self, *args, **options):
        password = options.get("password")
        csv_path = options.get("csv_path")
        period_name = options.get("period")

        self.stdout.write("=" * 70)
        self.stdout.write("LEVEL 9: PLAYERS & COACHING STAFF SEEDING")
        self.stdout.write(f"Period: {period_name}")
        self.stdout.write(f"CSV: {csv_path}")
        self.stdout.write("=" * 70)

        with transaction.atomic():
            stats = self.seed_all_teams(password, csv_path, period_name)

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("PLAYERS & COACHING STAFF SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Coaches (Head):         {stats['head_coaches']}")
        self.stdout.write(f"Coaches (Assistant):    {stats['assistant_coaches']}")
        self.stdout.write(f"Players (Eerste Elftal): {stats['eerste_elftal_players']}")
        self.stdout.write(f"Players (Reserve teams): {stats['reserve_players']}")
        self.stdout.write("=" * 70)
        self.stdout.write(f"TOTAL USERS:            {stats['total_users']}")
        self.stdout.write(f"TOTAL MEMBERSHIPS:      {stats['total_memberships']}")
        self.stdout.write("=" * 70)
        self.stdout.write(
            self.style.SUCCESS("\nAll players and coaching staff seeded successfully!")
        )

    def seed_all_teams(self, password, csv_path, period_name):
        """Seed all teams with coaches and players."""
        stats = {
            "head_coaches": 0,
            "assistant_coaches": 0,
            "eerste_elftal_players": 0,
            "reserve_players": 0,
            "total_users": 0,
            "total_memberships": 0,
        }

        # Load CSV first to determine which organisations we need
        csv_data = self._load_csv(csv_path)
        if not csv_data:
            self.stdout.write(self.style.ERROR(f"Failed to load CSV from {csv_path}"))
            return stats

        # Get unique federations from CSV
        from organisations.models import Organisation

        federations_in_csv = set(row["federation"] for row in csv_data)
        self.stdout.write(f"\nFederations in CSV: {', '.join(sorted(federations_in_csv))}")

        # Store organisations (periods are now team-scoped, will be found per team)
        orgs_by_fed = {}

        for fed_slug in federations_in_csv:
            try:
                org = Organisation.objects.get(slug=fed_slug.lower())
                orgs_by_fed[fed_slug] = org
                self.stdout.write(f"  ✓ {fed_slug}: {org.name}")
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Organisation '{fed_slug}' not found. Skip or create first.")
                )
                return stats

        # Get unique clubs from CSV grouped by federation, with their team types
        clubs_by_fed = {}
        for row in csv_data:
            fed = row["federation"]
            club = row["club"]
            team_type = row["team_type"]
            if fed not in clubs_by_fed:
                clubs_by_fed[fed] = {}
            if club not in clubs_by_fed[fed]:
                clubs_by_fed[fed][club] = set()
            clubs_by_fed[fed][club].add(team_type)

        total_clubs = sum(len(clubs) for clubs in clubs_by_fed.values())
        self.stdout.write(f"\nFound {total_clubs} clubs in CSV")

        # Process each federation
        for federation, clubs in clubs_by_fed.items():
            organisation = orgs_by_fed[federation]
            self.stdout.write(f"\n{'=' * 70}")
            self.stdout.write(f"Processing {federation} ({organisation.name})")
            self.stdout.write(f"{'=' * 70}")

            for club, team_types_in_csv in sorted(clubs.items()):
                self.stdout.write(f"\n[Club] {club}")

                # Only process team types that have data in CSV
                for team_type in sorted(team_types_in_csv):
                    # Map CSV team_type to database team name
                    team = None

                    if team_type == "Eerste Elftal":
                        team_name = f"{club} 1"
                    elif team_type == "1. Mannschaft":
                        team_name = f"{club} 1. Mannschaft"
                    elif team_type == "1a Squadra":
                        team_name = f"{club} 1a Squadra"
                    elif team_type == "First Team":
                        team_name = f"{club} First Team"
                    elif team_type in ["O21", "U21"]:
                        # O21 teams: always use "[Club] O21" format
                        team_name = f"{club} O21"
                    elif team_type == "Jong":
                        # Jong teams: always use "Jong [Club]" format
                        team_name = f"Jong {club}"
                    elif team_type == "Reserves":
                        team_name = f"{club} Reserves"
                    elif team_type == "Vrouwen":
                        team_name = f"{club} Vrouwen"
                    else:
                        # Unknown type, skip
                        self.stdout.write(f"  Unknown team type: {team_type}, skipping...")
                        continue

                    # Try to find team
                    try:
                        team = Project.objects.get(
                            organisation=organisation, name=team_name, parent_project__name=club
                        )
                    except Project.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f"  Team not found: {team_name}, skipping...")
                        )
                        continue

                    if not team:
                        continue

                    # Find team-scoped period (NEW: periods are now team-specific!)
                    try:
                        period = Period.objects.get(
                            organisation=organisation,
                            project=team,
                            name=period_name,
                            parent_period__isnull=True,  # Root season
                        )
                    except Period.DoesNotExist:
                        self.stdout.write(
                            self.style.ERROR(
                                f"  Period '{period_name}' not found for team {team_name}"
                            )
                        )
                        continue

                # 1. Create Head Coach (Project Admin)
                head_coach_data = self._generate_head_coach(club, team_type)
                head_coach, created = self._create_user(
                    head_coach_data["first_name"],
                    head_coach_data["last_name"],
                    club,
                    password,
                )
                if created:
                    stats["total_users"] += 1
                    stats["head_coaches"] += 1

                membership, created = self._create_membership(head_coach, team, period, "admin")
                if created:
                    stats["total_memberships"] += 1

                # 2. Create Assistant Coach (Team Admin)
                assistant_coach_data = self._generate_assistant_coach(club, team_type)
                assistant_coach, created = self._create_user(
                    assistant_coach_data["first_name"],
                    assistant_coach_data["last_name"],
                    club,
                    password,
                )
                if created:
                    stats["total_users"] += 1
                    stats["assistant_coaches"] += 1

                membership, created = self._create_membership(
                    assistant_coach, team, period, "editor"
                )
                if created:
                    stats["total_memberships"] += 1

                # 3. Create Players from CSV
                team_players = [
                    row
                    for row in csv_data
                    if row["federation"] == federation
                    and row["club"] == club
                    and row["team_type"] == team_type
                ]

                for player_data in team_players:
                    player, created = self._create_user(
                        player_data["first_name"],
                        player_data["last_name"],
                        club,
                        password,
                    )
                    if created:
                        stats["total_users"] += 1
                        stats["eerste_elftal_players"] += 1

                    # Store position and shirt_number in metadata
                    player_metadata = {
                        "position": player_data.get("position", ""),
                        "shirt_number": player_data.get("shirt_number", ""),
                    }
                    membership, created = self._create_membership(
                        player, team, period, "viewer", metadata=player_metadata
                    )
                    if created:
                        stats["total_memberships"] += 1

                player_count = len(team_players)

                self.stdout.write(
                    f"  OK {team_name}: 1 coach + 1 assistant + {player_count} players"
                )

        return stats

    def _load_csv(self, csv_path):
        """Load CSV file and return list of dicts."""
        try:
            csv_file = Path(csv_path)
            if not csv_file.exists():
                return None

            with open(csv_file, "r", encoding="utf-8-sig") as f:  # utf-8-sig removes BOM
                reader = csv.DictReader(f)
                data = []
                for row in reader:
                    # Skip empty rows
                    if not any(row.values()):
                        continue
                    data.append(row)
                return data
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error loading CSV: {e}"))
            return None

    def _create_user(self, first_name, last_name, club, password):
        """Create user with email based on name and club."""
        email = f"{first_name.lower()}.{last_name.lower()}@{club.lower().replace(' ', '')}.demo"
        email = (
            email.replace("ë", "e")
            .replace("ö", "o")
            .replace("ü", "u")
            .replace("ó", "o")
            .replace("í", "i")
        )
        email = email.replace("š", "s").replace("ć", "c").replace("ž", "z").replace("ñ", "n")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
                "email_verified": True,
            },
        )

        if created:
            user.set_password(password)
            user.save()

        return user, created

    def _create_membership(self, user, project, period, role, metadata=None):
        """Create project membership with optional metadata (position, shirt_number)."""
        defaults = {
            "role": role,
            "period": period,
        }
        if metadata:
            defaults["metadata"] = metadata

        membership, created = ProjectMembership.objects.get_or_create(
            user=user,
            project=project,
            defaults=defaults,
        )
        return membership, created

    def _generate_head_coach(self, club, team_type):
        """Generate head coach data."""
        if team_type == "Vrouwen":
            first_names = ["Sarina", "Vera", "Hesterine", "Foeke", "Jessica", "Leonie"]
        else:
            first_names = ["Maurice", "Peter", "Arne", "John", "Danny", "Ron", "Alfred", "Dick"]

        last_names = [
            "de Jong",
            "Jansen",
            "van den Berg",
            "van Dijk",
            "Bakker",
            "Visser",
            "Smit",
            "de Boer",
            "Mulder",
            "Peters",
        ]

        return {
            "first_name": random.choice(first_names),
            "last_name": random.choice(last_names),
        }

    def _generate_assistant_coach(self, club, team_type):
        """Generate assistant coach data."""
        if team_type == "Vrouwen":
            first_names = ["Marieke", "Vera", "Hester", "Angela", "Leonie", "Natasja"]
        else:
            first_names = ["Henk", "Dennis", "Patrick", "Erwin", "Marcel", "Richard", "Raymond"]

        last_names = [
            "de Vries",
            "Meijer",
            "de Groot",
            "Bos",
            "Vos",
            "Hendriks",
            "van Leeuwen",
            "Dekker",
            "Brouwer",
            "de Wit",
        ]

        return {
            "first_name": random.choice(first_names),
            "last_name": random.choice(last_names),
        }

    def _generate_players(self, club, team_type, count):
        """Generate player data with realistic Dutch names."""
        if team_type == "Vrouwen":
            first_names = [
                "Emma",
                "Sophie",
                "Julia",
                "Lisa",
                "Anna",
                "Sanne",
                "Eva",
                "Lotte",
                "Fleur",
                "Isa",
                "Mila",
                "Tess",
                "Noa",
                "Lynn",
                "Sara",
                "Luna",
                "Roos",
                "Evi",
                "Liv",
                "Nina",
                "Fenna",
                "Iris",
                "Ivy",
                "Lieke",
                "Femke",
            ]
        else:  # Jong and Tweede Elftal
            first_names = [
                "Daan",
                "Sem",
                "Thijs",
                "Lars",
                "Finn",
                "Luca",
                "Bram",
                "Luuk",
                "Jesse",
                "Tim",
                "Milan",
                "Thomas",
                "Stijn",
                "Ruben",
                "Jasper",
                "Max",
                "Nick",
                "Sven",
                "Jelle",
                "Mike",
                "Noah",
                "Julian",
                "Kevin",
                "Rick",
                "Robin",
            ]

        last_names = [
            "de Jong",
            "Jansen",
            "de Vries",
            "van den Berg",
            "van Dijk",
            "Bakker",
            "Visser",
            "Smit",
            "Meijer",
            "de Boer",
            "Mulder",
            "de Groot",
            "Bos",
            "Vos",
            "Peters",
            "Hendriks",
            "van Leeuwen",
            "Dekker",
            "Brouwer",
            "de Wit",
            "Dijkstra",
            "Smits",
            "de Graaf",
            "van der Meer",
            "van der Linden",
            "Kok",
            "Jacobs",
            "de Haan",
            "Vermeulen",
            "van den Heuvel",
        ]

        players = []
        for _ in range(count):
            players.append(
                {
                    "first_name": random.choice(first_names),
                    "last_name": random.choice(last_names),
                }
            )

        return players

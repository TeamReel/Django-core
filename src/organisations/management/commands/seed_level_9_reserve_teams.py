"""
Seed Level 9: Reserve Team Players (Jong, Tweede & Vrouwen teams).

Creates generated players for non-Eerste Elftal teams:
- Jong [Club] (U21/Reserve teams) - 1 assistant coach + 15 players each
- Tweede Elftal (Second teams) - 1 assistant coach + 15 players each
- [Club] Vrouwen (Women's teams) - 1 assistant coach + 15 players each

Uses generated Dutch names (not real players).
Assigns Team Admin roles for assistant coaches, Team Member roles for players.
"""

import random

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed reserve team players + assistant coaches (Jong, Tweede & Vrouwen) with generated names"

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default="Basis123.",
            help="Password for all generated users (default: Basis123.)",
        )

    def handle(self, *args, **options):
        password = options.get("password")

        self.stdout.write("=" * 70)
        self.stdout.write("LEVEL 9: RESERVE TEAM PLAYERS SEEDING")
        self.stdout.write("=" * 70)

        with transaction.atomic():
            users_created, memberships_created = self.seed_reserve_players(password)

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("RESERVE TEAM PLAYERS SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Users Created:        {users_created}")
        self.stdout.write(f"Memberships Created:  {memberships_created}")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("\nReserve team players seeded successfully!"))

    def seed_reserve_players(self, password):
        """Create players for Jong, Tweede Elftal and Vrouwen teams."""
        users_created = 0
        memberships_created = 0

        # Get KNVB organisation
        from organisations.models import Organisation

        try:
            knvb = Organisation.objects.get(slug="knvb")
        except Organisation.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    "KNVB organisation not found. Run seed_level_2_organisations first."
                )
            )
            return 0, 0

        # Get Season 2024/25 period
        try:
            period = Period.objects.get(organisation=knvb, name="Seizoen 2024/25")
        except Period.DoesNotExist:
            self.stdout.write(
                self.style.ERROR("Season 2024/25 not found. Run seed_level_6_competitions first.")
            )
            return 0, 0

        # Eredivisie clubs
        clubs = [
            "Ajax",
            "PSV",
            "Feyenoord",
            "AZ",
            "FC Twente",
            "FC Utrecht",
            "Go Ahead Eagles",
            "Fortuna Sittard",
            "Sparta Rotterdam",
            "NEC Nijmegen",
            "FC Groningen",
            "PEC Zwolle",
            "Heracles Almelo",
            "Willem II",
            "NAC Breda",
            "RKC Waalwijk",
            "Almere City",
            "SC Heerenveen",
        ]

        team_types = ["Jong", "Tweede Elftal", "Vrouwen"]

        for club in clubs:
            self.stdout.write(f"\n[Club] {club}")

            for team_type in team_types:
                if team_type == "Jong":
                    team_name = f"Jong {club}"
                elif team_type == "Tweede Elftal":
                    team_name = "Tweede Elftal"
                else:
                    team_name = f"{club} Vrouwen"

                # Find the team project
                try:
                    team = Project.objects.get(
                        organisation=knvb, name=team_name, parent_project__name=club
                    )
                except Project.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"  Team not found: {team_name}, skipping...")
                    )
                    continue

                # Create assistant coach first
                coach_data = self._generate_assistant_coach(club, team_type)
                coach_email = f"{coach_data['first_name'].lower()}.{coach_data['last_name'].lower()}@{club.lower().replace(' ', '')}.demo"
                coach_email = coach_email.replace("ë", "e").replace("ö", "o").replace("ü", "u")

                coach, coach_created = User.objects.get_or_create(
                    email=coach_email,
                    defaults={
                        "first_name": coach_data["first_name"],
                        "last_name": coach_data["last_name"],
                        "is_active": True,
                        "email_verified": True,
                    },
                )

                if coach_created:
                    coach.set_password(password)
                    coach.save()
                    users_created += 1

                # Assistant coach gets Team Admin role (editor)
                (
                    coach_membership,
                    coach_membership_created,
                ) = ProjectMembership.objects.get_or_create(
                    user=coach,
                    project=team,
                    defaults={
                        "role": "editor",  # Team Admin role for assistant coaches
                        "period": period,
                    },
                )

                if coach_membership_created:
                    memberships_created += 1

                # Generate 15 players per team
                players = self._generate_players(club, team_type)

                for player_data in players:
                    # Create user
                    email = f"{player_data['first_name'].lower()}.{player_data['last_name'].lower()}@{club.lower().replace(' ', '')}.demo"
                    email = email.replace("ë", "e").replace("ö", "o").replace("ü", "u")

                    user, user_created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            "first_name": player_data["first_name"],
                            "last_name": player_data["last_name"],
                            "is_active": True,
                            "email_verified": True,
                        },
                    )

                    if user_created:
                        user.set_password(password)
                        user.save()
                        users_created += 1

                    # Create project membership
                    membership, membership_created = ProjectMembership.objects.get_or_create(
                        user=user,
                        project=team,
                        defaults={
                            "role": "viewer",  # Team Member role
                            "period": period,
                        },
                    )

                    if membership_created:
                        memberships_created += 1

                self.stdout.write(f"  ✓ {team_name}: 1 assistant coach + {len(players)} players")

        return users_created, memberships_created

    def _generate_assistant_coach(self, club, team_type):
        """Generate assistant coach data with realistic Dutch names."""
        # Dutch first names for coaches
        if team_type == "Vrouwen":
            first_names = [
                "Marieke",
                "Vera",
                "Hester",
                "Sarina",
                "Jessica",
                "Angela",
                "Leonie",
                "Foeke",
            ]
        else:
            first_names = [
                "Peter",
                "Henk",
                "John",
                "Erwin",
                "Dennis",
                "Patrick",
                "Ron",
                "Marcel",
                "Richard",
                "Raymond",
            ]

        # Dutch last names (same pool as players)
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
        ]

        return {
            "first_name": random.choice(first_names),
            "last_name": random.choice(last_names),
        }

    def _generate_players(self, club, team_type):
        """Generate player data with realistic Dutch names."""
        # Dutch first names (gender-neutral and women's names for Vrouwen teams)
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
        else:  # Jong teams and Tweede Elftal (male)
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

        # Dutch last names
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

        # Positions with distribution
        positions = [
            ("Keeper", 2),
            ("Verdediger", 5),
            ("Middenvelder", 5),
            ("Aanvaller", 3),
        ]

        players = []
        _position_index = 0
        shirt_number = 1

        for position, count in positions:
            for _ in range(count):
                player = {
                    "first_name": random.choice(first_names),
                    "last_name": random.choice(last_names),
                    "position": position,
                    "shirt_number": shirt_number,
                }
                players.append(player)
                shirt_number += 1

        # Shuffle to avoid predictable patterns
        random.shuffle(players)

        return players

"""
Django management command to clean up non-football organizations and create realistic players.

Removes old test organizations and creates realistic football players with proper roles.
"""

import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from permissions.models import Role, RoleAssignment
from projects.models import Project

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Clean up database and create realistic football players"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making changes",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        # Step 1: Remove non-football organizations
        football_leagues = ["Eredivisie", "Premier League", "Serie A", "Bundesliga", "La Liga"]

        all_orgs = Organisation.objects.all()
        football_orgs = all_orgs.filter(name__in=football_leagues)
        non_football_orgs = all_orgs.exclude(name__in=football_leagues)

        self.stdout.write("\n=== CURRENT ORGANIZATIONS ===")
        self.stdout.write(f"Total: {all_orgs.count()}")
        self.stdout.write(f"Football: {football_orgs.count()}")
        self.stdout.write(f"Non-football to remove: {non_football_orgs.count()}")

        if non_football_orgs.exists():
            self.stdout.write("\nOrganizations to remove:")
            for org in non_football_orgs:
                project_count = org.projects.count()
                self.stdout.write(f"  - {org.name} ({project_count} projects)")

                if not dry_run:
                    # Delete projects first (cascade should handle this but let's be explicit)
                    org.projects.all().delete()
                    org.delete()

            if not dry_run:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Removed {non_football_orgs.count()} non-football organizations"
                    )
                )
        else:
            self.stdout.write("No non-football organizations to remove")

        # Step 2: Create realistic players and coaches
        football_players_data = [
            # Eredivisie - Ajax
            {
                "name": "André Onana",
                "email": "onana@ajax.nl",
                "club": "Ajax",
                "role": "Player",
                "position": "Keeper",
            },
            {
                "name": "Jurriën Timber",
                "email": "timber@ajax.nl",
                "club": "Ajax",
                "role": "Player",
                "position": "Defender",
            },
            {
                "name": "Erik ten Hag",
                "email": "tenhag@ajax.nl",
                "club": "Ajax",
                "role": "Coach",
                "position": "Trainer",
            },
            {
                "name": "Johan Cruyff",
                "email": "cruyff@ajax.nl",
                "club": "Ajax",
                "role": "Legend",
                "position": "Legend",
            },
            # Eredivisie - PSV
            {
                "name": "Cody Gakpo",
                "email": "gakpo@psv.nl",
                "club": "PSV",
                "role": "Player",
                "position": "Forward",
            },
            {
                "name": "Ruud van Nistelrooy",
                "email": "nistelrooy@psv.nl",
                "club": "PSV",
                "role": "Coach",
                "position": "Trainer",
            },
            {
                "name": "Phillip Cocu",
                "email": "cocu@psv.nl",
                "club": "PSV",
                "role": "Legend",
                "position": "Legend",
            },
            # Premier League - Liverpool FC
            {
                "name": "Virgil van Dijk",
                "email": "vandijk@liverpool.com",
                "club": "Liverpool FC",
                "role": "Player",
                "position": "Defender",
            },
            {
                "name": "Mohamed Salah",
                "email": "salah@liverpool.com",
                "club": "Liverpool FC",
                "role": "Player",
                "position": "Forward",
            },
            {
                "name": "Jürgen Klopp",
                "email": "klopp@liverpool.com",
                "club": "Liverpool FC",
                "role": "Coach",
                "position": "Manager",
            },
            {
                "name": "Steven Gerrard",
                "email": "gerrard@liverpool.com",
                "club": "Liverpool FC",
                "role": "Legend",
                "position": "Legend",
            },
            # Premier League - Arsenal
            {
                "name": "Bukayo Saka",
                "email": "saka@arsenal.com",
                "club": "Arsenal",
                "role": "Player",
                "position": "Winger",
            },
            {
                "name": "Mikel Arteta",
                "email": "arteta@arsenal.com",
                "club": "Arsenal",
                "role": "Coach",
                "position": "Manager",
            },
            {
                "name": "Thierry Henry",
                "email": "henry@arsenal.com",
                "club": "Arsenal",
                "role": "Legend",
                "position": "Legend",
            },
            # Serie A - Juventus
            {
                "name": "Dusan Vlahovic",
                "email": "vlahovic@juventus.it",
                "club": "Juventus",
                "role": "Player",
                "position": "Forward",
            },
            {
                "name": "Massimiliano Allegri",
                "email": "allegri@juventus.it",
                "club": "Juventus",
                "role": "Coach",
                "position": "Allenatore",
            },
            {
                "name": "Alessandro Del Piero",
                "email": "delpiero@juventus.it",
                "club": "Juventus",
                "role": "Legend",
                "position": "Legend",
            },
            # La Liga - Real Madrid
            {
                "name": "Vinícius Jr",
                "email": "vinicius@realmadrid.es",
                "club": "Real Madrid",
                "role": "Player",
                "position": "Winger",
            },
            {
                "name": "Carlo Ancelotti",
                "email": "ancelotti@realmadrid.es",
                "club": "Real Madrid",
                "role": "Coach",
                "position": "Entrenador",
            },
            {
                "name": "Zinedine Zidane",
                "email": "zidane@realmadrid.es",
                "club": "Real Madrid",
                "role": "Legend",
                "position": "Legend",
            },
            # Bundesliga - Bayern München
            {
                "name": "Joshua Kimmich",
                "email": "kimmich@bayern.de",
                "club": "Bayern München",
                "role": "Player",
                "position": "Midfielder",
            },
            {
                "name": "Thomas Tuchel",
                "email": "tuchel@bayern.de",
                "club": "Bayern München",
                "role": "Coach",
                "position": "Trainer",
            },
            {
                "name": "Franz Beckenbauer",
                "email": "beckenbauer@bayern.de",
                "club": "Bayern München",
                "role": "Legend",
                "position": "Legend",
            },
        ]

        # Get or create roles
        coach_role, _ = Role.objects.get_or_create(
            name="Coach", defaults={"description": "Head coach with full administrative access"}
        )
        player_role, _ = Role.objects.get_or_create(
            name="Player", defaults={"description": "Active player with member access"}
        )
        legend_role, _ = Role.objects.get_or_create(
            name="Legend", defaults={"description": "Former player with viewer access"}
        )

        role_map = {"Coach": coach_role, "Player": player_role, "Legend": legend_role}

        created_users = 0
        existing_users = 0

        self.stdout.write("\n=== CREATING FOOTBALL PLAYERS ===")

        for player_data in football_players_data:
            email = player_data["email"]
            name_parts = player_data["name"].split(" ")
            first_name = name_parts[0]
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            if not dry_run:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={"first_name": first_name, "last_name": last_name, "is_active": True},
                )

                if created:
                    created_users += 1
                    self.stdout.write(
                        f"  ✅ Created: {player_data['name']}"
                        f" ({player_data['role']}) - {player_data['club']}"
                    )
                else:
                    existing_users += 1
                    self.stdout.write(
                        f"  ➡️ Exists: {player_data['name']}"
                        f" ({player_data['role']}) - {player_data['club']}"
                    )

                # Assign role to project
                try:
                    project = Project.objects.get(name=player_data["club"])
                    role = role_map[player_data["role"]]

                    role_assignment, created = RoleAssignment.objects.get_or_create(
                        user=user,
                        role=role,
                        scope="project",
                        target_project=project,
                        defaults={"assigned_by_id": 1},  # Admin user
                    )

                    if created:
                        self.stdout.write(f"    🏆 Assigned {role.name} role to {project.name}")
                    else:
                        self.stdout.write(
                            f"    ♻️ Role assignment already exists for "
                            f"{user.first_name} {user.last_name}"
                        )

                except Project.DoesNotExist:
                    self.stdout.write(
                        f"    ❌ Project '{player_data['club']}'"
                        f" not found for {player_data['name']}"
                    )
                except Exception as e:
                    self.stdout.write(f"    ❌ Error assigning role: {e}")
            else:
                self.stdout.write(
                    f"  Would create: {player_data['name']}"
                    f" ({player_data['role']}) - {player_data['club']}"
                )

        # Summary
        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n=== CLEANUP AND SEEDING COMPLETE ===\n"
                    f"🗑️ Removed non-football organizations\n"
                    f"👤 Created {created_users} new football players/staff\n"
                    f"♻️ Found {existing_users} existing users\n"
                    f"⚽ Football database ready for testing!"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("\n=== DRY RUN COMPLETE ==="))

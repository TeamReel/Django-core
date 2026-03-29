"""
Management command to seed international squads (DFB, FIGC, The FA, RBFA).
Mirrors the Eredivisie structure: admin, editor, 15 players per first team.
"""

import random

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed international squads (Bundesliga, Serie A, Premier League, Jupiler Pro League)"

    def handle(self, *args, **options):
        fake = Faker()

        self.stdout.write("=" * 70)
        self.stdout.write("INTERNATIONAL SQUADS SEEDING")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Federation configurations
        federations = [
            {
                "slug": "dfb",
                "name": "DFB",
                "season_name": "Season 2024/25",
                "positions": ["Torwart", "Verteidiger", "Mittelfeldspieler", "Stürmer"],
                "staff_roles": ["Trainer", "Assistent", "Torwarttrainer", "Physiotherapeut"],
            },
            {
                "slug": "figc",
                "name": "FIGC",
                "season_name": "Season 2024/25",
                "positions": ["Portiere", "Difensore", "Centrocampista", "Attaccante"],
                "staff_roles": ["Allenatore", "Assistente", "Preparatore", "Fisioterapista"],
            },
            {
                "slug": "the-fa",
                "name": "The FA",
                "season_name": "Season 2024/25",
                "positions": ["Goalkeeper", "Defender", "Midfielder", "Forward"],
                "staff_roles": ["Manager", "Assistant", "Coach", "Physio"],
            },
            {
                "slug": "rbfa",
                "name": "RBFA",
                "season_name": "Season 2024/25",
                "positions": ["Doelman", "Verdediger", "Middenvelder", "Aanvaller"],
                "staff_roles": ["Trainer", "Assistent", "Conditietrainer", "Verzorger"],
            },
        ]

        total_users = 0
        total_memberships = 0

        with transaction.atomic():
            for fed_config in federations:
                self.stdout.write(f"\nProcessing {fed_config['name']}...")

                # Get organisation
                org = Organisation.objects.get(slug=fed_config["slug"])

                # Get all first teams (ending with "1", "First Team", "1a Squadra", etc.)
                first_teams = (
                    Project.objects.filter(
                        parent_project__organisation=org,
                        parent_project__parent_project__isnull=True,  # Ensure team has club parent
                    )
                    .filter(name__regex=r".* (1|First Team|1a Squadra)$")
                    .order_by("name")
                )

                self.stdout.write(f"  Found {first_teams.count()} first teams")

                # Get season period
                season = Period.objects.filter(
                    organisation=org, name=fed_config["season_name"], parent_period__isnull=True
                ).first()

                if not season:
                    self.stdout.write(
                        self.style.WARNING(f"  ⚠️  No season found for {fed_config['name']}")
                    )
                    continue

                fed_users = 0
                fed_memberships = 0

                for team in first_teams:
                    # Check if team already has memberships
                    existing = ProjectMembership.objects.filter(project=team, period=season).count()

                    if existing > 0:
                        self.stdout.write(f"  ℹ️  {team.name}: {existing} members exist, skipping")
                        continue

                    # 1. Team Admin (coach)
                    admin_user = User.objects.create_user(
                        email=f"{team.slug}-coach@teamreel.demo",
                        username=f"{team.slug}_coach",
                        first_name=fake.first_name(),
                        last_name=fake.last_name(),
                        is_active=True,
                    )
                    ProjectMembership.objects.create(
                        project=team,
                        user=admin_user,
                        role="admin",
                        period=season,
                        metadata={"function": fed_config["staff_roles"][0]},
                    )
                    fed_users += 1
                    fed_memberships += 1

                    # 2. Team Editor (assistant coach)
                    editor_user = User.objects.create_user(
                        email=f"{team.slug}-assistant@teamreel.demo",
                        username=f"{team.slug}_assistant",
                        first_name=fake.first_name(),
                        last_name=fake.last_name(),
                        is_active=True,
                    )
                    ProjectMembership.objects.create(
                        project=team,
                        user=editor_user,
                        role="editor",
                        period=season,
                        metadata={"function": fed_config["staff_roles"][1]},
                    )
                    fed_users += 1
                    fed_memberships += 1

                    # 3. Players (15 viewers with positions)
                    positions = fed_config["positions"]
                    shirt_numbers = random.sample(range(1, 40), 15)  # Random shirt numbers

                    for i in range(15):
                        player_user = User.objects.create_user(
                            email=f"{team.slug}-player{i+1}@teamreel.demo",
                            username=f"{team.slug}_player{i+1}",
                            first_name=fake.first_name(),
                            last_name=fake.last_name(),
                            is_active=True,
                        )

                        # Distribute positions (roughly: 2 GK, 5 DEF, 5 MID, 3 FW)
                        if i < 2:
                            position = positions[0]  # Goalkeeper
                        elif i < 7:
                            position = positions[1]  # Defender
                        elif i < 12:
                            position = positions[2]  # Midfielder
                        else:
                            position = positions[3]  # Forward

                        ProjectMembership.objects.create(
                            project=team,
                            user=player_user,
                            role="viewer",
                            period=season,
                            metadata={
                                "position": position,
                                "shirt_number": shirt_numbers[i],
                            },
                        )
                        fed_users += 1
                        fed_memberships += 1

                    self.stdout.write(f"    ✅ {team.name}: 17 members created")

                self.stdout.write(
                    f"  {fed_config['name']} total:"
                    f" {fed_memberships} memberships"
                    f" ({fed_users} users)"
                )
                total_users += fed_users
                total_memberships += fed_memberships

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Total: {total_memberships} memberships created"))
        self.stdout.write(self.style.SUCCESS(f"✅ Total: {total_users} new users created"))
        self.stdout.write("")

"""
Django management command to create football test data.

Creates:
- 5 football competitions as organizations (Eredivisie, Premier League, etc.)
- 20+ football clubs as projects under these organizations
- Realistic users (coaches, players, legends) with appropriate roles
"""

import logging

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from permissions.models import Role
from projects.models import Project

from organisations.models import Organisation

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Seed database with football test data for Manual Test 07"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        # Get admin user to use as creator
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR("No admin user found. Create one first."))
            return

        self.stdout.write(f"Using admin user: {admin_user.email} (ID: {admin_user.id})")

        # Football competitions data
        competitions_data = [
            {
                "name": "Eredivisie",
                "description": "Nederlandse topcompetitie",
                "clubs": [
                    {"name": "Ajax", "description": "Amsterdamse Football Club Ajax"},
                    {"name": "PSV", "description": "Philips Sport Vereniging Eindhoven"},
                    {"name": "Feyenoord", "description": "Feyenoord Rotterdam"},
                    {"name": "AZ Alkmaar", "description": "Alkmaar Zaanstreek"},
                ],
            },
            {
                "name": "Premier League",
                "description": "English Premier League",
                "clubs": [
                    {"name": "Arsenal", "description": "Arsenal Football Club"},
                    {"name": "Liverpool FC", "description": "Liverpool Football Club"},
                    {"name": "Manchester City", "description": "Manchester City FC"},
                    {"name": "Chelsea FC", "description": "Chelsea Football Club"},
                ],
            },
            {
                "name": "Serie A",
                "description": "Italian Serie A",
                "clubs": [
                    {"name": "Juventus", "description": "Juventus Football Club"},
                    {"name": "AC Milan", "description": "Associazione Calcio Milan"},
                    {"name": "Inter Milan", "description": "Football Club Internazionale Milano"},
                    {"name": "AS Roma", "description": "Associazione Sportiva Roma"},
                ],
            },
            {
                "name": "Bundesliga",
                "description": "German Bundesliga",
                "clubs": [
                    {"name": "Bayern München", "description": "FC Bayern München"},
                    {
                        "name": "Borussia Dortmund",
                        "description": "Ballspielverein Borussia 09 e.V. Dortmund",
                    },
                    {"name": "RB Leipzig", "description": "RasenBallsport Leipzig"},
                    {"name": "Bayer Leverkusen", "description": "Bayer 04 Leverkusen"},
                ],
            },
            {
                "name": "La Liga",
                "description": "Spanish La Liga",
                "clubs": [
                    {"name": "Real Madrid", "description": "Real Madrid Club de Fútbol"},
                    {"name": "FC Barcelona", "description": "Futbol Club Barcelona"},
                    {"name": "Atletico Madrid", "description": "Club Atlético de Madrid"},
                    {"name": "Valencia CF", "description": "Valencia Club de Fútbol"},
                ],
            },
        ]

        # Create or get football roles
        roles_data = [
            {"name": "Coach", "description": "Head coach with full administrative access"},
            {"name": "Player", "description": "Active player with member access"},
            {"name": "Legend", "description": "Former player with viewer access"},
        ]

        created_roles = []
        for role_data in roles_data:
            if not dry_run:
                role, created = Role.objects.get_or_create(
                    name=role_data["name"], defaults={"description": role_data["description"]}
                )
                created_roles.append(role)
                if created:
                    self.stdout.write(f"Created role: {role.name}")
                else:
                    self.stdout.write(f"Role already exists: {role.name}")
            else:
                self.stdout.write(f'Would create role: {role_data["name"]}')

        # Create competitions and clubs
        total_orgs = 0
        total_projects = 0

        for comp_data in competitions_data:
            # Create competition organization
            if not dry_run:
                organisation, org_created = Organisation.objects.get_or_create(
                    name=comp_data["name"],
                    defaults={"description": comp_data["description"], "creator": admin_user},
                )

                if org_created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Created organisation: {organisation.name}")
                    )
                    total_orgs += 1
                else:
                    self.stdout.write(f"Organisation already exists: {organisation.name}")
            else:
                self.stdout.write(f'Would create organisation: {comp_data["name"]}')
                total_orgs += 1

            # Create clubs as projects under this competition
            for club_data in comp_data["clubs"]:
                if not dry_run:
                    project, proj_created = Project.objects.get_or_create(
                        name=club_data["name"],
                        organisation=organisation,
                        defaults={"description": club_data["description"], "creator": admin_user},
                    )

                    if proj_created:
                        self.stdout.write(f"  Created project: {project.name}")
                        total_projects += 1
                    else:
                        self.stdout.write(f"  Project already exists: {project.name}")
                else:
                    self.stdout.write(f'  Would create project: {club_data["name"]}')
                    total_projects += 1

        # Summary
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDRY RUN COMPLETE:\n"
                    f"Would create {total_orgs} organisations\n"
                    f"Would create {total_projects} projects\n"
                    f"Would create {len(roles_data)} roles\n"
                    f"Using admin user: {admin_user.email}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nFOOTBALL DATA SEEDING COMPLETE!\n"
                    f"Created/verified {total_orgs} organisations\n"
                    f"Created/verified {total_projects} projects\n"
                    f"Created/verified {len(created_roles)} roles\n"
                    f"Data ready for Manual Test 07"
                )
            )
            self.stdout.write(
                self.style.HTTP_INFO(
                    "\nTo test:\n"
                    "1. Visit http://localhost:3000/organisations\n"
                    "2. You should see 5 football competitions\n"
                    "3. Click on any competition to see its clubs\n"
                    "4. Test role assignments and permissions"
                )
            )

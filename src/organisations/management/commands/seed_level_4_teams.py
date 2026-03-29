"""
TeamReel Level 4 Seeder: Teams (Child Projects)

Seeds 220 teams as child Projects with parent_project=Club.

Structure:
- Netherlands: 4 teams per club (First, Reserves, Women, Youth) = 72 teams
- Germany: 2 teams per club (First, Reserves) = 36 teams
- Belgium: 2 teams per club (First, Reserves) = 32 teams
- England: 2 teams per club (First, Reserves) = 40 teams
- Italy: 2 teams per club (First, Reserves) = 40 teams

Usage:
    $env:DATABASE_URL="postgresql://..."; python manage.py seed_level_4_teams
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from projects.models.project import Project

User = get_user_model()


class Command(BaseCommand):
    help = "Seed Level 4: 220 Teams (child projects with parent_project=Club)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n👕 Level 4: Teams (Child Projects)\n"))
        self.stdout.write("=" * 70)

        # Get admin user
        try:
            admin = User.objects.get(email="admin@teamreel.demo")
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Admin user not found!"))
            return

        total_created = 0
        total_existing = 0

        # Netherlands: 4 teams per club (premium setup)
        self.stdout.write("\n🇳🇱 NETHERLANDS (4 teams per club)")
        self.stdout.write("-" * 70)

        nl_clubs = Project.objects.filter(
            organisation__name="KNVB", parent_project__isnull=True
        ).order_by("name")

        for club in nl_clubs:
            teams = [
                {
                    "name": f"{club.name} 1",
                    "description": f"{club.name} Eerste Elftal",
                    "metadata": {
                        "team_type": "senior_men",
                        "level": "professional",
                        "competition": "Eredivisie",
                    },
                },
                {
                    "name": (
                        f"Jong {club.name}"
                        if club.name in ["Ajax", "PSV", "AZ", "FC Utrecht"]
                        else f"{club.name} Reserves"
                    ),
                    "description": f"{club.name} Reserves",
                    "metadata": {
                        "team_type": "reserves",
                        "level": "professional",
                        "age_group": "U21",
                        "competition": "Eerste Divisie",
                    },
                },
                {
                    "name": f"{club.name} Vrouwen",
                    "description": f"{club.name} Women's Team",
                    "metadata": {
                        "team_type": "women",
                        "level": "professional",
                        "competition": "Vrouwen Eredivisie",
                    },
                },
                {
                    "name": f"{club.name} O21",
                    "description": f"{club.name} Youth Academy",
                    "metadata": {
                        "team_type": "youth",
                        "level": "academy",
                        "age_group": "U21",
                        "competition": "Onder 21 Eredivisie",
                    },
                },
            ]

            for team_data in teams:
                team, created = Project.objects.get_or_create(
                    name=team_data["name"],
                    organisation=club.organisation,
                    parent_project=club,  # HIERARCHICAL LINK!
                    defaults={
                        "description": team_data["description"],
                        "creator": admin,
                        "metadata": team_data["metadata"],
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {team.name} (parent: {club.name})")
                else:
                    total_existing += 1

        # Germany: 2 teams per club
        self.stdout.write("\n🇩🇪 GERMANY (2 teams per club)")
        self.stdout.write("-" * 70)

        de_clubs = Project.objects.filter(
            organisation__name="DFB", parent_project__isnull=True
        ).order_by("name")

        for club in de_clubs:
            teams = [
                {
                    "name": f"{club.name} 1. Mannschaft",
                    "description": f"{club.name} First Team",
                    "metadata": {
                        "team_type": "senior_men",
                        "level": "professional",
                        "competition": "Bundesliga",
                    },
                },
                {
                    "name": f"{club.name} II",
                    "description": f"{club.name} Reserves",
                    "metadata": {
                        "team_type": "reserves",
                        "level": "semi_professional",
                        "age_group": "U23",
                        "competition": "3. Liga",
                    },
                },
            ]

            for team_data in teams:
                team, created = Project.objects.get_or_create(
                    name=team_data["name"],
                    organisation=club.organisation,
                    parent_project=club,
                    defaults={
                        "description": team_data["description"],
                        "creator": admin,
                        "metadata": team_data["metadata"],
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {team.name}")
                else:
                    total_existing += 1

        # Belgium: 2 teams per club
        self.stdout.write("\n🇧🇪 BELGIUM (2 teams per club)")
        self.stdout.write("-" * 70)

        be_clubs = Project.objects.filter(
            organisation__name="RBFA", parent_project__isnull=True
        ).order_by("name")

        for club in be_clubs:
            teams = [
                {
                    "name": f"{club.name} A",
                    "description": f"{club.name} First Team",
                    "metadata": {
                        "team_type": "senior_men",
                        "level": "professional",
                        "competition": "Jupiler Pro League",
                    },
                },
                {
                    "name": (
                        f"{club.name} Beloften" if "Anderlecht" in club.name else f"{club.name} B"
                    ),
                    "description": f"{club.name} Reserves",
                    "metadata": {
                        "team_type": "reserves",
                        "level": "semi_professional",
                        "age_group": "U21",
                        "competition": "Challenger Pro League",
                    },
                },
            ]

            for team_data in teams:
                team, created = Project.objects.get_or_create(
                    name=team_data["name"],
                    organisation=club.organisation,
                    parent_project=club,
                    defaults={
                        "description": team_data["description"],
                        "creator": admin,
                        "metadata": team_data["metadata"],
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {team.name}")
                else:
                    total_existing += 1

        # England: 2 teams per club
        self.stdout.write("\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 ENGLAND (2 teams per club)")
        self.stdout.write("-" * 70)

        en_clubs = Project.objects.filter(
            organisation__name="The FA", parent_project__isnull=True
        ).order_by("name")

        for club in en_clubs:
            reserve_suffix = "EDS" if "Manchester City" in club.name else "U21"
            teams = [
                {
                    "name": f"{club.name} First Team",
                    "description": f"{club.name} Senior Squad",
                    "metadata": {
                        "team_type": "senior_men",
                        "level": "professional",
                        "competition": "Premier League",
                    },
                },
                {
                    "name": f"{club.name} {reserve_suffix}",
                    "description": f"{club.name} Reserves",
                    "metadata": {
                        "team_type": "reserves",
                        "level": "academy",
                        "age_group": "U21",
                        "competition": "Premier League 2",
                    },
                },
            ]

            for team_data in teams:
                team, created = Project.objects.get_or_create(
                    name=team_data["name"],
                    organisation=club.organisation,
                    parent_project=club,
                    defaults={
                        "description": team_data["description"],
                        "creator": admin,
                        "metadata": team_data["metadata"],
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {team.name}")
                else:
                    total_existing += 1

        # Italy: 2 teams per club
        self.stdout.write("\n🇮🇹 ITALY (2 teams per club)")
        self.stdout.write("-" * 70)

        it_clubs = Project.objects.filter(
            organisation__name="FIGC", parent_project__isnull=True
        ).order_by("name")

        for club in it_clubs:
            teams = [
                {
                    "name": f"{club.name} 1a Squadra",
                    "description": f"{club.name} First Team",
                    "metadata": {
                        "team_type": "senior_men",
                        "level": "professional",
                        "competition": "Serie A",
                    },
                },
                {
                    "name": f"{club.name} Primavera",
                    "description": f"{club.name} Youth Team",
                    "metadata": {
                        "team_type": "youth",
                        "level": "academy",
                        "age_group": "U19",
                        "competition": "Campionato Primavera",
                    },
                },
            ]

            for team_data in teams:
                team, created = Project.objects.get_or_create(
                    name=team_data["name"],
                    organisation=club.organisation,
                    parent_project=club,
                    defaults={
                        "description": team_data["description"],
                        "creator": admin,
                        "metadata": team_data["metadata"],
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(f"  ✓ {team.name}")
                else:
                    total_existing += 1

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Level 4 Complete"))
        self.stdout.write(f"   Created:  {total_created}")
        self.stdout.write(f"   Existing: {total_existing}")
        self.stdout.write(f"   Total:    {total_created + total_existing} teams")
        self.stdout.write("=" * 70)

        # Summary by country
        self.stdout.write("\n📊 DISTRIBUTION:")
        self.stdout.write(f"   🇳🇱 Netherlands: {nl_clubs.count() * 4} teams")
        self.stdout.write(f"   🇩🇪 Germany:     {de_clubs.count() * 2} teams")
        self.stdout.write(f"   🇧🇪 Belgium:     {be_clubs.count() * 2} teams")
        self.stdout.write(f"   🏴 England:     {en_clubs.count() * 2} teams")
        self.stdout.write(f"   🇮🇹 Italy:       {it_clubs.count() * 2} teams")
        self.stdout.write("=" * 70 + "\n")

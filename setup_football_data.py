#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model
from organisations.models import Organisation
from projects.models import Project
from permissions.models import Role, RoleAssignment

User = get_user_model()


def create_football_test_data():
    print("🏆 Creating football competition test data...\n")

    # Create Competitions (Organizations)
    competitions = [
        {
            "name": "Eredivisie",
            "description": "Nederlandse voetbalcompetitie",
            "slug": "eredivisie",
        },
        {
            "name": "Premier League",
            "description": "English Premier League",
            "slug": "premier-league",
        },
        {"name": "Serie A", "description": "Italian Serie A Championship", "slug": "serie-a"},
        {"name": "Bundesliga", "description": "German Bundesliga", "slug": "bundesliga"},
        {"name": "La Liga", "description": "Spanish La Liga", "slug": "la-liga"},
    ]

    created_orgs = {}
    for comp_data in competitions:
        org, created = Organisation.objects.get_or_create(
            slug=comp_data["slug"],
            defaults={"name": comp_data["name"], "description": comp_data["description"]},
        )
        created_orgs[comp_data["slug"]] = org
        status = "✅ NEW" if created else "♻️  EXISTS"
        print(f'{status} {comp_data["name"]}')

    print(f"\n📊 Created/Found {len(created_orgs)} competitions\n")

    # Create Clubs (Projects)
    clubs = [
        # Eredivisie
        {"name": "Ajax Amsterdam", "description": "AFC Ajax", "slug": "ajax", "org": "eredivisie"},
        {"name": "PSV Eindhoven", "description": "PSV", "slug": "psv", "org": "eredivisie"},
        {
            "name": "Feyenoord Rotterdam",
            "description": "Feyenoord",
            "slug": "feyenoord",
            "org": "eredivisie",
        },
        {"name": "AZ Alkmaar", "description": "AZ", "slug": "az-alkmaar", "org": "eredivisie"},
        # Premier League
        {
            "name": "Arsenal FC",
            "description": "The Gunners",
            "slug": "arsenal",
            "org": "premier-league",
        },
        {
            "name": "Liverpool FC",
            "description": "The Reds",
            "slug": "liverpool",
            "org": "premier-league",
        },
        {
            "name": "Manchester City",
            "description": "City",
            "slug": "man-city",
            "org": "premier-league",
        },
        {
            "name": "Chelsea FC",
            "description": "The Blues",
            "slug": "chelsea",
            "org": "premier-league",
        },
        # Serie A
        {
            "name": "Juventus",
            "description": "La Vecchia Signora",
            "slug": "juventus",
            "org": "serie-a",
        },
        {"name": "AC Milan", "description": "I Rossoneri", "slug": "ac-milan", "org": "serie-a"},
        {
            "name": "Inter Milan",
            "description": "I Nerazzurri",
            "slug": "inter-milan",
            "org": "serie-a",
        },
        {"name": "AS Roma", "description": "I Giallorossi", "slug": "as-roma", "org": "serie-a"},
        # Bundesliga
        {
            "name": "Bayern München",
            "description": "FC Bayern",
            "slug": "bayern-munich",
            "org": "bundesliga",
        },
        {
            "name": "Borussia Dortmund",
            "description": "BVB",
            "slug": "borussia-dortmund",
            "org": "bundesliga",
        },
        {
            "name": "RB Leipzig",
            "description": "Die Roten Bullen",
            "slug": "rb-leipzig",
            "org": "bundesliga",
        },
        {
            "name": "Bayer Leverkusen",
            "description": "Die Werkself",
            "slug": "bayer-leverkusen",
            "org": "bundesliga",
        },
        # La Liga
        {
            "name": "Real Madrid",
            "description": "Los Blancos",
            "slug": "real-madrid",
            "org": "la-liga",
        },
        {"name": "FC Barcelona", "description": "Barça", "slug": "fc-barcelona", "org": "la-liga"},
        {
            "name": "Atletico Madrid",
            "description": "Los Rojiblancos",
            "slug": "atletico-madrid",
            "org": "la-liga",
        },
        {"name": "Valencia CF", "description": "Los Che", "slug": "valencia", "org": "la-liga"},
    ]

    created_clubs = {}
    for club_data in clubs:
        org = created_orgs[club_data["org"]]
        project, created = Project.objects.get_or_create(
            slug=club_data["slug"],
            defaults={
                "name": club_data["name"],
                "description": club_data["description"],
                "organisation": org,
            },
        )
        created_clubs[club_data["slug"]] = project
        status = "✅ NEW" if created else "♻️  EXISTS"
        print(f'{status} {club_data["name"]} ({org.name})')

    print(f"\n⚽ Created/Found {len(created_clubs)} clubs\n")

    # Create Football Roles
    roles = [
        {
            "name": "Coach",
            "description": "Head Coach - Full administrative access",
            "slug": "coach",
        },
        {"name": "Player", "description": "Team Player - Member access", "slug": "player"},
        {"name": "Legend", "description": "Club Legend - View only access", "slug": "legend"},
    ]

    created_roles = {}
    for role_data in roles:
        role, created = Role.objects.get_or_create(
            name=role_data["name"], defaults={"description": role_data["description"]}
        )
        created_roles[role_data["slug"]] = role
        status = "✅ NEW" if created else "♻️  EXISTS"
        print(f'{status} {role_data["name"]} - {role_data["description"]}')

    print(f"\n👥 Created/Found {len(created_roles)} roles\n")

    # Create Famous Football People
    people = [
        # Coaches
        {
            "email": "pep.guardiola@mancity.com",
            "name": "Pep Guardiola",
            "role": "coach",
            "club": "man-city",
        },
        {
            "email": "jurgen.klopp@liverpool.com",
            "name": "Jürgen Klopp",
            "role": "coach",
            "club": "liverpool",
        },
        {
            "email": "carlo.ancelotti@realmadrid.com",
            "name": "Carlo Ancelotti",
            "role": "coach",
            "club": "real-madrid",
        },
        {
            "email": "xavi.hernandez@fcbarcelona.com",
            "name": "Xavi Hernández",
            "role": "coach",
            "club": "fc-barcelona",
        },
        # Current Players
        {
            "email": "virgil.vandijk@liverpool.com",
            "name": "Virgil van Dijk",
            "role": "player",
            "club": "liverpool",
        },
        {
            "email": "bukayo.saka@arsenal.com",
            "name": "Bukayo Saka",
            "role": "player",
            "club": "arsenal",
        },
        {
            "email": "robert.lewandowski@fcbarcelona.com",
            "name": "Robert Lewandowski",
            "role": "player",
            "club": "fc-barcelona",
        },
        {
            "email": "luka.modric@realmadrid.com",
            "name": "Luka Modrić",
            "role": "player",
            "club": "real-madrid",
        },
        # Legends
        {
            "email": "johan.cruyff@ajax.com",
            "name": "Johan Cruyff",
            "role": "legend",
            "club": "ajax",
        },
        {
            "email": "thierry.henry@arsenal.com",
            "name": "Thierry Henry",
            "role": "legend",
            "club": "arsenal",
        },
        {
            "email": "francesco.totti@asroma.com",
            "name": "Francesco Totti",
            "role": "legend",
            "club": "as-roma",
        },
        {
            "email": "franz.beckenbauer@bayernmunich.com",
            "name": "Franz Beckenbauer",
            "role": "legend",
            "club": "bayern-munich",
        },
    ]

    created_users = {}
    for person_data in people:
        user, created = User.objects.get_or_create(
            email=person_data["email"],
            defaults={
                "username": person_data["email"],
                "first_name": person_data["name"].split()[0],
                "last_name": " ".join(person_data["name"].split()[1:]),
                "is_active": True,
            },
        )
        if created:
            user.set_password("football2024")
            user.save()

        created_users[person_data["email"]] = user
        status = "✅ NEW" if created else "♻️  EXISTS"
        club = created_clubs[person_data["club"]]
        role = created_roles[person_data["role"]]
        print(f'{status} {person_data["name"]} ({role.name} at {club.name})')

    print(f"\n👤 Created/Found {len(created_users)} football personalities\n")

    print("🎉 Football test data setup complete!")
    print("\n📋 Summary:")
    print(f"   🏆 {len(created_orgs)} competitions")
    print(f"   ⚽ {len(created_clubs)} clubs")
    print(f"   👥 {len(created_roles)} roles")
    print(f"   👤 {len(created_users)} people")
    print("\n🔐 All users have password: football2024")


if __name__ == "__main__":
    create_football_test_data()

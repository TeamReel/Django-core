"""
Management command to seed international squads from CSV (DFB, FIGC, The FA, RBFA).
Uses real player data from players_international_2024_25.csv
"""

import csv
from pathlib import Path

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = (
        "Seed international squads from CSV"
        " (Bundesliga, Serie A, Premier League, Jupiler Pro League)"
    )

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("INTERNATIONAL SQUADS SEEDING (from CSV)")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Load CSV
        csv_path = Path("documents/05-demo/archive/csv-files/players_international_2024_25.csv")
        if not csv_path.exists():
            self.stdout.write(self.style.ERROR(f"❌ CSV not found: {csv_path}"))
            return

        # Read all players
        players_data = []
        with open(csv_path, "r", encoding="utf-8-sig") as f:  # utf-8-sig strips BOM
            reader = csv.DictReader(f)
            for row in reader:
                players_data.append(row)

        self.stdout.write(f"Loaded {len(players_data)} players from CSV")
        self.stdout.write("")

        # Federation slug mapping (CSV name → DB slug)
        fed_slug_map = {
            "FIGC": "figc",
            "DFB": "dfb",
            "The FA": "the-fa",
            "the-fa": "the-fa",  # Also accept lowercase from CSV
            "RBFA": "rbfa",
        }

        total_users = 0
        total_memberships = 0

        with transaction.atomic():
            # Group by federation → club → team
            from collections import defaultdict

            fed_data = defaultdict(lambda: defaultdict(list))

            for player in players_data:
                federation = player["federation"]
                club = player["club"]
                fed_data[federation][club].append(player)

            for federation, clubs in fed_data.items():
                self.stdout.write(f"\nProcessing {federation}...")

                fed_slug = fed_slug_map.get(federation)
                if not fed_slug:
                    self.stdout.write(self.style.WARNING(f"  ⚠️  Unknown federation: {federation}"))
                    continue

                # Get organisation
                try:
                    org = Organisation.objects.get(slug=fed_slug)
                except Organisation.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"  ⚠️  Organisation not found: {fed_slug}")
                    )
                    continue

                # Competition name mapping
                comp_names = {
                    "FIGC": "Serie A",
                    "DFB": "Bundesliga",
                    "the-fa": "Premier League",
                    "The FA": "Premier League",  # Fallback
                    "RBFA": "Jupiler Pro League",
                    "rbfa": "Jupiler Pro League",
                }
                competition_name = comp_names.get(federation)

                fed_users = 0
                fed_memberships = 0

                for club_name, club_players in clubs.items():
                    # Find club project
                    club = Project.objects.filter(
                        organisation=org, name=club_name, parent_project__isnull=True
                    ).first()

                    if not club:
                        self.stdout.write(f"    ⚠️  Club not found: {club_name}")
                        continue

                    # Find team matching CSV team_type
                    # CSV has exact team names: "1a Squadra", "1. Mannschaft", "First Team", "A"
                    team_type = club_players[0]["team_type"]

                    # Build full team name: "{club_name} {team_type}"
                    expected_team_name = f"{club_name} {team_type}"

                    team = Project.objects.filter(
                        parent_project=club, name=expected_team_name
                    ).first()

                    if not team:
                        self.stdout.write(f"    ⚠️  Team not found: {club_name} {team_type}")
                        continue

                    # Create team-level season (like Eredivisie)
                    season, _ = Period.objects.get_or_create(
                        organisation=org,
                        project=team,  # Team-scoped!
                        parent_period=None,
                        name="Season 2024/2025",
                        defaults={
                            "start_date": "2024-08-01",
                            "end_date": "2025-07-31",
                        },
                    )

                    # Create competition under season (like Eredivisie)
                    if competition_name:
                        Period.objects.get_or_create(
                            organisation=org,
                            project=team,
                            parent_period=season,
                            name=competition_name,
                            defaults={
                                "start_date": "2024-08-01",
                                "end_date": "2025-05-31",
                                "metadata": {"type": "league"},
                            },
                        )

                    # Check existing
                    existing = ProjectMembership.objects.filter(project=team, period=season).count()

                    if existing > 0:
                        self.stdout.write(
                            f"    ℹ️  {team.name}: {existing} members exist, skipping"
                        )
                        continue

                    # Create players
                    for player in club_players:
                        # Create user (email-only authentication)
                        email = (
                            f"{player['first_name'].lower()}"
                            f".{player['last_name'].lower()}"
                            f"@{club.slug}.demo"
                        )

                        user, created = User.objects.get_or_create(
                            email=email,
                            defaults={
                                "first_name": player["first_name"],
                                "last_name": player["last_name"],
                                "is_active": True,
                            },
                        )

                        if created:
                            fed_users += 1

                        # Create membership
                        ProjectMembership.objects.create(
                            project=team,
                            user=user,
                            role="viewer",  # All players as viewers
                            period=season,
                            metadata={
                                "position": player["position"],
                                "shirt_number": (
                                    int(player["shirt_number"])
                                    if player.get("shirt_number")
                                    else None
                                ),
                                "nationality": player["nationality"],
                                "birth_date": player["birth_date"],
                            },
                        )
                        fed_memberships += 1

                    self.stdout.write(f"    ✅ {team.name}: {len(club_players)} players created")

                self.stdout.write(
                    f"  {federation} total: {fed_memberships} memberships ({fed_users} new users)"
                )
                total_users += fed_users
                total_memberships += fed_memberships

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"✅ Total: {total_memberships} memberships created"))
        self.stdout.write(self.style.SUCCESS(f"✅ Total: {total_users} new users created"))
        self.stdout.write("")

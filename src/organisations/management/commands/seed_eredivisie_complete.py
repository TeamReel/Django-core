"""
Management command to seed complete Eredivisie history and other teams.
Handles:
- Main Eredivisie 2024/2025 (All teams)
- Historical Seasons (2020-2024) for top clubs
- Reserve/Youth teams (O21)
"""

import csv
from pathlib import Path

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from organisations.models import Organisation
from projects.models import Project, ProjectMembership


class Command(BaseCommand):
    help = "Seed complete Eredivisie data (History, All Teams, Youth)"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("EREDIVISIE COMPLETE SEEDING")
        self.stdout.write("=" * 70)

        base_path = Path("documents/05-demo/archive/csv-files")

        # Files to process
        files_map = [
            # Year, File
            ("2020/2021", "players_eredivisie_2020_21.csv"),
            ("2021/2022", "players_eredivisie_2021_22.csv"),
            ("2022/2023", "players_eredivisie_2022_23.csv"),
            ("2023/2024", "players_eredivisie_2023_24.csv"),
            ("2024/2025", "players_eredivisie_2024_25.csv"),
            ("2024/2025", "players_knvb_o21_2024_25.csv"),
            # Add reserves if file exists and is needed
            # ("2024/2025", "players_knvb_reserves_2024_25.csv"),
        ]

        # Mappings for team names (to match existing database structure)
        team_type_map = {
            "Eerste Elftal": "1",
            "First Team": "1",
            "O21": "O21",
            "Jong": "Jong",
            "Reserves": "Reserves",
            "Vrouwen": "Vrouwen",
        }

        # Ensure KNVB exists
        knvb, _ = Organisation.objects.get_or_create(
            slug="knvb",
            defaults={"name": "KNVB", "description": "Royal Dutch Football Association"},
        )

        # Get system/admin user for creator field
        creator = User.objects.filter(
            email__in=["admin@example.com", "system@teamreel.com"]
        ).first()
        if not creator:
            creator = User.objects.first()
        if not creator:
            self.stdout.write(
                self.style.ERROR(
                    "❌ No users found. Create at least one user first."
                )
            )
            return

        total_processed = 0

        with transaction.atomic():
            for season_name, filename in files_map:
                filepath = base_path / filename
                if not filepath.exists():
                    self.stdout.write(self.style.WARNING(f"⚠️  Skipping {filename} (not found)"))
                    continue

                self.stdout.write(f"\n📂 Processing {filename} ({season_name})...")

                # Parse dates based on season string "YYYY/YYYY"
                start_year = int(season_name.split("/")[0])
                end_year = int(season_name.split("/")[1])

                season_start = f"{start_year}-08-01"
                season_end = f"{end_year}-07-31"

                row_count = 0

                with open(filepath, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)

                    for row in reader:
                        club_name = row["club"]
                        raw_team_type = row["team_type"]

                        # Map team type to match existing database structure
                        team_suffix = team_type_map.get(raw_team_type, raw_team_type)

                        # Build team name: use "Jong {Club}" format for
                        # Jong teams, otherwise "{Club} {suffix}"
                        if team_suffix == "Jong":
                            team_name = f"Jong {club_name}"
                        else:
                            team_name = f"{club_name} {team_suffix}"

                        # 1. Get existing Club Project (should already exist)
                        try:
                            club_project = Project.objects.get(
                                organisation=knvb,
                                name=club_name,
                                parent_project=None,
                            )
                        except Project.DoesNotExist:
                            # If club doesn't exist, create it
                            club_project = Project.objects.create(
                                organisation=knvb,
                                name=club_name,
                                parent_project=None,
                                description=f"Professional Football Club: {club_name}",
                                slug=slugify(club_name),
                                creator=creator,
                            )

                        # 2. Get existing Team Project (should already exist for main teams)
                        try:
                            team_project = Project.objects.get(
                                organisation=knvb,
                                parent_project=club_project,
                                name=team_name,
                            )
                        except Project.DoesNotExist:
                            # If team doesn't exist, create it
                            team_project = Project.objects.create(
                                organisation=knvb,
                                parent_project=club_project,
                                name=team_name,
                                description=f"{team_name} Squad",
                                slug=slugify(team_name),
                                creator=creator,
                            )

                        # 3. Ensure Season Period (Team Scoped!)
                        full_season_name = f"Season {season_name}"
                        season_period, _ = Period.objects.get_or_create(
                            organisation=knvb,
                            project=team_project,
                            name=full_season_name,
                            parent_period=None,
                            defaults={
                                "start_date": season_start,
                                "end_date": season_end,
                            },
                        )

                        # 4. Ensure Competition Period (Eredivisie/Divisie)
                        # Determine competition name based on file context or generic
                        # Usually "Eredivisie" for main teams, "Danny Blind Competitie" for O21?
                        # For simplicity/demo: "Competition" or specific if verifiable.
                        # Using "Eredivisie" for main teams, "O21 Competitie" for O21.

                        competition_name = "Eredivisie"
                        if "O21" in team_name:
                            competition_name = "O21 Divisie 1"
                        elif "Jong" in team_name:
                            competition_name = (
                                "Keuken Kampioen Divisie"  # Often true, but simple fallback:
                            )

                        Period.objects.get_or_create(
                            organisation=knvb,
                            project=team_project,
                            parent_period=season_period,
                            name=competition_name,
                            defaults={
                                "start_date": season_start,
                                "end_date": f"{end_year}-05-31",
                                "metadata": {"type": "league"},
                            },
                        )

                        # 5. Create User & Membership
                        fname = row["first_name"]
                        lname = row["last_name"]
                        email = f"{fname.lower()}.{lname.lower()}@{slugify(club_name)}.demo"
                        # Handle duplicate emails in CSV (rare but possible with common names)
                        # For demo, relying on get_or_create is fine.

                        # Fix: Check for username uniqueness constraints if username field used?
                        # We are using email as primary identification here.

                        user, created = User.objects.get_or_create(
                            email=email,
                            defaults={"first_name": fname, "last_name": lname, "is_active": True},
                        )

                        # Create Membership for THIS season
                        # Unique constraint is on (project, user, period, role)
                        # Skip if this exact membership already exists
                        if not ProjectMembership.objects.filter(
                            project=team_project, user=user, period=season_period, role="viewer"
                        ).exists():
                            ProjectMembership.objects.create(
                                project=team_project,
                                user=user,
                                period=season_period,
                                role="viewer",
                                metadata={
                                    "position": row.get("position", ""),
                                    "shirt_number": (
                                        int(row["shirt_number"])
                                        if row.get("shirt_number")
                                        and str(row["shirt_number"]).isdigit()
                                        else None
                                    ),
                                    "nationality": row.get("nationality", "NED"),
                                    "birth_date": row.get("birth_date", ""),
                                    "age": row.get("age", ""),
                                },
                            )

                        row_count += 1

                self.stdout.write(f"    ✅ Imported {row_count} players/members")
                total_processed += row_count

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✨ COMPLETE: Processed {total_processed} memberships across all files."
            )
        )

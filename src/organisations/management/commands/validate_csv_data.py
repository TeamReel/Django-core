"""
Validate all CSV files against production database structure.
Checks federations, clubs, teams before seeding.
"""

import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Validate CSV files against database structure before seeding"

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv-dir",
            type=str,
            default="documents/05-demo",
            help="Directory containing CSV files",
        )

    def load_csv(self, csv_path):
        """Load CSV and return data."""
        data = []
        with open(csv_path, "r", encoding="utf-8-sig") as f:  # utf-8-sig removes BOM
            reader = csv.DictReader(f)
            for row in reader:
                # Skip empty rows
                if not any(row.values()):
                    continue
                data.append(row)
        return data

    def get_team_name_variants(self, club, team_type):
        """Get all possible team name variants based on CSV team_type."""
        # Map CSV team_type to database team name variants
        if team_type == "Eerste Elftal":
            return [f"{club} 1"]
        elif team_type == "1. Mannschaft":
            return [f"{club} 1. Mannschaft"]
        elif team_type == "1a Squadra":
            return [f"{club} 1a Squadra"]
        elif team_type == "First Team":
            return [f"{club} First Team"]
        elif team_type == "Jong/O21":
            return [f"Jong {club}", f"{club} O21", f"{club} U21"]
        elif team_type == "Reserves":
            return [f"{club} Reserves"]
        elif team_type == "Vrouwen":
            return [f"{club} Vrouwen"]
        else:
            # Fallback: use team_type as-is
            return [f"{club} {team_type}"]

    def validate_csv(self, csv_path):
        """Validate one CSV file against database."""
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write(f"VALIDATING: {csv_path}")
        self.stdout.write(f"{'='*80}")

        csv_file = Path(csv_path)
        if not csv_file.exists():
            self.stdout.write(self.style.ERROR(f"❌ CSV not found: {csv_path}"))
            return False

        data = self.load_csv(csv_path)
        self.stdout.write(f"✓ Loaded {len(data)} rows from CSV")

        # Get unique federations
        federations = set(row["federation"] for row in data)
        self.stdout.write(f"\n📋 Federations in CSV: {', '.join(sorted(federations))}")

        all_valid = True

        # Validate each federation
        for fed in sorted(federations):
            fed_slug = fed.lower()
            try:
                org = Organisation.objects.get(slug=fed_slug)
                self.stdout.write(self.style.SUCCESS(f"  ✓ {fed} → {org.name} (slug: {fed_slug})"))
            except Organisation.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"  ❌ {fed} NOT FOUND in database (looking for slug: {fed_slug})"
                    )
                )
                all_valid = False
                continue

            # Get clubs for this federation
            clubs_in_csv = sorted(set(row["club"] for row in data if row["federation"] == fed))
            self.stdout.write(f"\n  📁 {len(clubs_in_csv)} clubs for {fed}:")

            for club in clubs_in_csv:
                try:
                    _club_project = Project.objects.get(
                        organisation=org, name=club, parent_project__isnull=True
                    )
                    self.stdout.write(self.style.SUCCESS(f"    ✓ {club}"))

                    # Check teams for this club (only from CSV data)
                    team_types_in_csv = set(
                        row["team_type"]
                        for row in data
                        if row["federation"] == fed and row["club"] == club
                    )

                    for team_type in team_types_in_csv:
                        variants = self.get_team_name_variants(club, team_type)
                        team_found = False
                        found_name = None

                        for variant in variants:
                            if Project.objects.filter(
                                organisation=org, name=variant, parent_project__name=club
                            ).exists():
                                team_found = True
                                found_name = variant
                                break

                        if team_found:
                            self.stdout.write(f"      ✓ {team_type} → {found_name}")
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"      ❌ {team_type} NOT FOUND (tried: {', '.join(variants)})"
                                )
                            )
                            all_valid = False

                except Project.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f"    ❌ {club} NOT FOUND in database"))
                    all_valid = False

        return all_valid

    def handle(self, *args, **options):
        csv_dir = options.get("csv_dir")

        self.stdout.write("=" * 80)
        self.stdout.write("CSV VALIDATION AGAINST PRODUCTION DATABASE")
        self.stdout.write("=" * 80)

        csv_files = [
            f"{csv_dir}/players_eredivisie_2024_25.csv",
            f"{csv_dir}/players_eredivisie_2023_24.csv",
            f"{csv_dir}/players_eredivisie_2022_23.csv",
            f"{csv_dir}/players_eredivisie_2021_22.csv",
            f"{csv_dir}/players_eredivisie_2020_21.csv",
        ]

        results = {}
        for csv_file in csv_files:
            results[csv_file] = self.validate_csv(csv_file)

        # Summary
        self.stdout.write(f"\n{'='*80}")
        self.stdout.write("VALIDATION SUMMARY")
        self.stdout.write(f"{'='*80}")

        all_passed = True
        for csv_file, passed in results.items():
            status = "✓ PASS" if passed else "❌ FAIL"
            style = self.style.SUCCESS if passed else self.style.ERROR
            self.stdout.write(style(f"{status}: {Path(csv_file).name}"))
            if not passed:
                all_passed = False

        self.stdout.write(f"\n{'='*80}")
        if all_passed:
            self.stdout.write(self.style.SUCCESS("🎉 ALL CSV FILES VALIDATED SUCCESSFULLY!"))
            self.stdout.write(self.style.SUCCESS("✓ Ready to seed data to production"))
        else:
            self.stdout.write(self.style.ERROR("⚠️  VALIDATION FAILED - DO NOT SEED YET"))
            self.stdout.write(self.style.ERROR("❌ Fix mismatches above before seeding"))
        self.stdout.write(f"{'='*80}\n")

"""
Validate all CSV files against production database structure.
Checks federations, clubs, teams before seeding.
"""

import os
import sys
import django
import csv
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from organisations.models import Organisation, Project


def load_csv(csv_path):
    """Load CSV and return data."""
    data = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data


def get_team_name_variants(club, team_type):
    """Get all possible team name variants."""
    if team_type == "Eerste Elftal":
        return [f"{club} 1", f"{club} First Team", f"{club} 1. Mannschaft", f"{club} 1a Squadra"]
    elif team_type == "Jong/O21":
        return [f"Jong {club}", f"{club} O21", f"{club} U21", f"{club} II", f"{club} Primavera"]
    elif team_type == "Reserves":
        return [f"{club} Reserves"]
    else:  # Vrouwen
        return [f"{club} Vrouwen"]


def validate_csv(csv_path):
    """Validate one CSV file against database."""
    print(f"\n{'='*80}")
    print(f"VALIDATING: {csv_path}")
    print(f"{'='*80}")

    if not Path(csv_path).exists():
        print(f"❌ CSV not found: {csv_path}")
        return False

    data = load_csv(csv_path)
    print(f"✓ Loaded {len(data)} rows from CSV")

    # Get unique federations
    federations = set(row["federation"] for row in data)
    print(f"\n📋 Federations in CSV: {', '.join(sorted(federations))}")

    all_valid = True

    # Validate each federation
    for fed in sorted(federations):
        fed_slug = fed.lower()
        try:
            org = Organisation.objects.get(slug=fed_slug)
            print(f"  ✓ {fed} → {org.name} (slug: {fed_slug})")
        except Organisation.DoesNotExist:
            print(f"  ❌ {fed} NOT FOUND in database (looking for slug: {fed_slug})")
            all_valid = False
            continue

        # Get clubs for this federation
        clubs_in_csv = sorted(set(row["club"] for row in data if row["federation"] == fed))
        print(f"\n  📁 {len(clubs_in_csv)} clubs for {fed}:")

        for club in clubs_in_csv:
            try:
                club_project = Project.objects.get(
                    organisation=org, name=club, parent_project__isnull=True
                )
                print(f"    ✓ {club}")

                # Check teams for this club (only from CSV data)
                team_types_in_csv = set(
                    row["team_type"]
                    for row in data
                    if row["federation"] == fed and row["club"] == club
                )

                for team_type in team_types_in_csv:
                    variants = get_team_name_variants(club, team_type)
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
                        print(f"      ✓ {team_type} → {found_name}")
                    else:
                        print(f"      ❌ {team_type} NOT FOUND (tried: {', '.join(variants)})")
                        all_valid = False

            except Project.DoesNotExist:
                print(f"    ❌ {club} NOT FOUND in database")
                all_valid = False

    return all_valid


def main():
    print("=" * 80)
    print("CSV VALIDATION AGAINST PRODUCTION DATABASE")
    print("=" * 80)

    csv_files = [
        "documents/05-demo/players_eredivisie_2024_25.csv",
        "documents/05-demo/players_eredivisie_2023_24.csv",
        "documents/05-demo/players_eredivisie_2022_23.csv",
        "documents/05-demo/players_eredivisie_2021_22.csv",
        "documents/05-demo/players_eredivisie_2020_21.csv",
    ]

    results = {}
    for csv_file in csv_files:
        results[csv_file] = validate_csv(csv_file)

    # Summary
    print(f"\n{'='*80}")
    print("VALIDATION SUMMARY")
    print(f"{'='*80}")

    all_passed = True
    for csv_file, passed in results.items():
        status = "✓ PASS" if passed else "❌ FAIL"
        print(f"{status}: {Path(csv_file).name}")
        if not passed:
            all_passed = False

    print(f"\n{'='*80}")
    if all_passed:
        print("🎉 ALL CSV FILES VALIDATED SUCCESSFULLY!")
        print("✓ Ready to seed data to production")
    else:
        print("⚠️  VALIDATION FAILED - DO NOT SEED YET")
        print("❌ Fix mismatches above before seeding")
    print(f"{'='*80}\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())

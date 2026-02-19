#!/usr/bin/env python
"""
Update BrandProfile brand_assets with S3 URLs from SoccerWiki import.

This script:
1. Reads the import_results.json from the SoccerWiki import
2. Matches clubs by name to Projects in the database
3. Creates/updates BrandAsset records with S3 logo URLs

Usage:
    python scripts/update_brand_assets.py --results import_results.json
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from branding.models import BrandProfile, BrandAsset
from files.models import FileAsset
from projects.models import Project
from organisations.models import Organisation


# Mapping of SoccerWiki club names to database project name patterns
CLUB_NAME_MAPPING = {
    "Ajax": ["Ajax"],
    "PSV": ["PSV"],
    "Feyenoord": ["Feyenoord"],
    "AZ Alkmaar": ["AZ"],
    "FC Twente": ["FC Twente", "Twente"],
    "FC Utrecht": ["FC Utrecht", "Utrecht"],
    "FC Groningen": ["FC Groningen", "Groningen"],
    "SC Heerenveen": ["Heerenveen"],
    "Vitesse": ["Vitesse"],
    "NEC Nijmegen": ["NEC"],
    "Willem II": ["Willem II"],
    "Sparta Rotterdam": ["Sparta"],
    "Fortuna Sittard": ["Fortuna"],
    "RKC Waalwijk": ["RKC"],
    "Go Ahead Eagles": ["Go Ahead"],
    "Heracles Almelo": ["Heracles"],
    "SBV Excelsior": ["Excelsior"],
    "PEC Zwolle": ["PEC Zwolle"],
    "FC Volendam": ["Volendam"],
    "FC Emmen": ["Emmen"],
    "ADO Den Haag": ["ADO"],
    "NAC Breda": ["NAC"],
    "SC Cambuur": ["Cambuur"],
    "De Graafschap": ["Graafschap"],
    "Roda JC Kerkrade": ["Roda"],
    "FC Dordrecht": ["Dordrecht"],
    "FC Den Bosch": ["Den Bosch"],
    "FC Eindhoven": ["Eindhoven"],
    "MVV Maastricht": ["MVV"],
    "Almere City": ["Almere"],
    "Telstar": ["Telstar"],
    "TOP Oss": ["TOP Oss"],
    "VVV-Venlo": ["VVV"],
    "Helmond Sport": ["Helmond"],
}


def find_matching_projects(club_name: str) -> list:
    """Find projects that match the club name."""
    # Try exact mapping first
    search_terms = CLUB_NAME_MAPPING.get(club_name, [club_name])

    projects = []
    for term in search_terms:
        matches = Project.objects.filter(name__icontains=term)
        projects.extend(list(matches))

    return list(set(projects))  # Dedupe


def update_brand_assets(results_file: str, dry_run: bool = False):
    """Update brand assets with S3 URLs."""

    with open(results_file, "r", encoding="utf-8") as f:
        results = json.load(f)

    clubs = results.get("clubs", [])
    print(f"\n📦 Processing {len(clubs)} clubs from import results...")

    stats = {
        "matched": 0,
        "created": 0,
        "updated": 0,
        "not_found": 0,
    }

    # Get default organisation for FileAssets (first one)
    default_org = Organisation.objects.first()
    if not default_org and not dry_run:
        print("❌ No organisation found - cannot create FileAssets")
        return

    for club in clubs:
        club_name = club["name"]
        s3_url = club["s3_url"]
        soccerwiki_id = club["id"]

        # Find matching projects
        projects = find_matching_projects(club_name)

        if not projects:
            print(f"  ⚠️  No match: {club_name}")
            stats["not_found"] += 1
            continue

        print(f"\n✅ {club_name} (SoccerWiki ID: {soccerwiki_id})")
        print(f"   S3 URL: {s3_url}")
        print(f"   Matched {len(projects)} project(s):")

        for project in projects:
            print(f"   - {project.name} (ID: {project.id})")
            stats["matched"] += 1

            if dry_run:
                continue

            # Get or create BrandProfile for this project
            brand_profile, bp_created = BrandProfile.objects.get_or_create(
                project=project,
                defaults={"name": f"{project.name} Brand"}
            )

            if bp_created:
                print(f"     Created BrandProfile: {brand_profile.name}")

            # Determine organisation from project
            project_org = project.organisation if hasattr(project, 'organisation') else default_org

            # Create or update FileAsset for the logo
            # Use storage_path to match existing files
            storage_path = f"logos/clubs/{soccerwiki_id}.png"

            file_asset, fa_created = FileAsset.objects.get_or_create(
                storage_path=storage_path,
                defaults={
                    "organization": project_org,
                    "original_name": f"{club_name}_logo.png",
                    "file_size": 0,  # Unknown, could fetch from S3 later
                    "mime_type": "image/png",
                    "is_public": True,
                    "metadata": {
                        "soccerwiki_id": soccerwiki_id,
                        "source": "soccerwiki_import",
                        "s3_url": s3_url,
                    }
                }
            )

            if fa_created:
                print(f"     Created FileAsset: {storage_path}")

            # Create or update BrandAsset for logo
            # Check if there's an existing logo asset
            logo_asset = BrandAsset.objects.filter(
                profile=brand_profile,
                asset_type="logo"
            ).first()

            if logo_asset:
                # Update existing
                logo_asset.file = file_asset
                logo_asset.alt_text = f"{club_name} logo"
                logo_asset.save()
                print(f"     Updated logo asset")
                stats["updated"] += 1
            else:
                # Create new
                BrandAsset.objects.create(
                    profile=brand_profile,
                    asset_type="logo",
                    file=file_asset,
                    alt_text=f"{club_name} logo",
                    is_active=True
                )
                print(f"     Created logo asset")
                stats["created"] += 1

    # Print summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    print(f"Projects matched: {stats['matched']}")
    print(f"Assets created:   {stats['created']}")
    print(f"Assets updated:   {stats['updated']}")
    print(f"Clubs not found:  {stats['not_found']}")

    if dry_run:
        print("\n⚠️  DRY RUN - No changes were made")


def main():
    parser = argparse.ArgumentParser(
        description="Update BrandAssets with S3 URLs"
    )
    parser.add_argument(
        "--results",
        default="import_results.json",
        help="Path to import results JSON",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving",
    )

    args = parser.parse_args()

    print("🚀 Update Brand Assets with S3 URLs")
    print("=" * 50)

    update_brand_assets(args.results, args.dry_run)

    print("\n✅ Done!")


if __name__ == "__main__":
    main()

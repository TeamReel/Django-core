#!/usr/bin/env python
"""
Seed: Brand Assets (Logos)
Description: Seeds FileAsset + BrandAsset records with external logo URLs
Author: Copilot
Date: 2026-02-05

Usage:
    python scripts/seed_brand_assets.py

This script creates:
- FileAsset records with external URLs as storage_path
- BrandAsset records linking to those FileAssets
"""

import os
import sys

# Django setup
sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from organisations.models import Organisation
from projects.models import Project
from branding.models import BrandProfile, BrandAsset
from files.models import FileAsset
from accounts.models import User


# Logo URLs for organisations (Wikipedia/official sources)
ORGANISATION_LOGOS = {
    "knvb": {
        "name": "KNVB",
        "logo_light": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/KNVB_Logo.svg/200px-KNVB_Logo.svg.png",
        "logo_dark": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/KNVB_Logo.svg/200px-KNVB_Logo.svg.png",
    },
    "dfb": {
        "name": "DFB",
        "logo_light": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/DFB-Logo.svg/200px-DFB-Logo.svg.png",
        "logo_dark": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/DFB-Logo.svg/200px-DFB-Logo.svg.png",
    },
    "figc": {
        "name": "FIGC",
        "logo_light": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/FIGC_logo.svg/200px-FIGC_logo.svg.png",
        "logo_dark": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/FIGC_logo.svg/200px-FIGC_logo.svg.png",
    },
    "rbfa": {
        "name": "RBFA",
        "logo_light": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Royal_Belgian_Football_Association_logo.svg/200px-Royal_Belgian_Football_Association_logo.svg.png",
        "logo_dark": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Royal_Belgian_Football_Association_logo.svg/200px-Royal_Belgian_Football_Association_logo.svg.png",
    },
    "the-fa": {
        "name": "The FA",
        "logo_light": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/The_Football_Association_2009.svg/200px-The_Football_Association_2009.svg.png",
        "logo_dark": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/The_Football_Association_2009.svg/200px-The_Football_Association_2009.svg.png",
    },
}

# Logo URLs for Dutch clubs (KNVB)
DUTCH_CLUB_LOGOS = {
    "AFC Ajax": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Ajax_Amsterdam.svg/200px-Ajax_Amsterdam.svg.png",
    "Feyenoord": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Feyenoord_logo.svg/200px-Feyenoord_logo.svg.png",
    "PSV": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/PSV_Eindhoven.svg/200px-PSV_Eindhoven.svg.png",
    "AZ": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/AZ_Alkmaar.svg/200px-AZ_Alkmaar.svg.png",
    "FC Utrecht": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/FC_Utrecht.svg/200px-FC_Utrecht.svg.png",
    "Vitesse": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Vitesse_logo.svg/200px-Vitesse_logo.svg.png",
    "FC Twente": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/FC_Twente.svg/200px-FC_Twente.svg.png",
    "Heerenveen": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/SC_Heerenveen.svg/200px-SC_Heerenveen.svg.png",
    "Sparta Rotterdam": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Sparta_Rotterdam_logo.svg/200px-Sparta_Rotterdam_logo.svg.png",
    "Fortuna Sittard": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Fortuna_Sittard_logo.svg/200px-Fortuna_Sittard_logo.svg.png",
    "NEC": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/NEC_Nijmegen.svg/200px-NEC_Nijmegen.svg.png",
    "RKC Waalwijk": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/RKC_Waalwijk.svg/200px-RKC_Waalwijk.svg.png",
    "Go Ahead Eagles": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Go_Ahead_Eagles_logo.svg/200px-Go_Ahead_Eagles_logo.svg.png",
    "PEC Zwolle": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/PEC_Zwolle.svg/200px-PEC_Zwolle.svg.png",
    "Excelsior": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Excelsior_Rotterdam_logo.svg/200px-Excelsior_Rotterdam_logo.svg.png",
    "Roda": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Roda_JC_Kerkrade_logo.svg/200px-Roda_JC_Kerkrade_logo.svg.png",
}

# Logo URLs for Italian clubs (FIGC)
ITALIAN_CLUB_LOGOS = {
    "Monza": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/AC_Monza.svg/200px-AC_Monza.svg.png",
    "Venezia": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Venezia_FC_2021.svg/200px-Venezia_FC_2021.svg.png",
    "Lecce": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/US_Lecce.svg/200px-US_Lecce.svg.png",
    "Genoa": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Genoa_CFC.svg/200px-Genoa_CFC.svg.png",
    "Torino": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Torino_FC_Logo.svg/200px-Torino_FC_Logo.svg.png",
    "Bologna": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bologna_FC_1909_logo.svg/200px-Bologna_FC_1909_logo.svg.png",
    "Cagliari": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Cagliari_Calcio_1920.svg/200px-Cagliari_Calcio_1920.svg.png",
    "Parma": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Parma_Calcio_1913.svg/200px-Parma_Calcio_1913.svg.png",
    "Verona": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Hellas_Verona_FC.svg/200px-Hellas_Verona_FC.svg.png",
    "Empoli": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Empoli_FC.svg/200px-Empoli_FC.svg.png",
}

# German clubs (DFB)
GERMAN_CLUB_LOGOS = {
    "Bayern München": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg/200px-FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg.png",
    "Borussia Dortmund": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/200px-Borussia_Dortmund_logo.svg.png",
    "RB Leipzig": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/RB_Leipzig_2014_logo.svg/200px-RB_Leipzig_2014_logo.svg.png",
    "Bayer Leverkusen": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Bayer_04_Leverkusen_logo.svg/200px-Bayer_04_Leverkusen_logo.svg.png",
    "Eintracht Frankfurt": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Eintracht_Frankfurt_Logo.svg/200px-Eintracht_Frankfurt_Logo.svg.png",
    "VfL Wolfsburg": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Logo-VfL-Wolfsburg.svg/200px-Logo-VfL-Wolfsburg.svg.png",
    "SC Freiburg": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/SC-Freiburg_Logo-neu.svg/200px-SC-Freiburg_Logo-neu.svg.png",
    "FC Köln": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/1._FC_K%C3%B6ln.svg/200px-1._FC_K%C3%B6ln.svg.png",
    "Hoffenheim": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Logo_TSG_Hoffenheim.svg/200px-Logo_TSG_Hoffenheim.svg.png",
    "Werder Bremen": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/SV-Werder-Bremen-Logo.svg/200px-SV-Werder-Bremen-Logo.svg.png",
}

# Combine all club logos with org mapping
CLUB_LOGOS_BY_ORG = {
    "knvb": DUTCH_CLUB_LOGOS,
    "figc": ITALIAN_CLUB_LOGOS,
    "dfb": GERMAN_CLUB_LOGOS,
}


def get_system_user():
    """Get or create a system user for seeding."""
    user, _ = User.objects.get_or_create(
        email="system@teamreel.app",
        defaults={"first_name": "System", "last_name": "Bot"}
    )
    return user


def seed_organisation_assets():
    """Seed brand assets for organisations."""
    print("\n=== Seeding Organisation Brand Assets ===")
    system_user = get_system_user()

    created_files = 0
    created_assets = 0

    for org_slug, data in ORGANISATION_LOGOS.items():
        try:
            org = Organisation.objects.get(slug=org_slug)
        except Organisation.DoesNotExist:
            print(f"  ⚠️  Organisation '{org_slug}' not found, skipping")
            continue

        # Get brand profile
        brand_profile = BrandProfile.objects.filter(organisation=org, is_active=True).first()
        if not brand_profile:
            print(f"  ⚠️  No brand profile for {org.name}, skipping")
            continue

        # Create FileAsset + BrandAsset for each logo type
        for asset_type in ["logo_light", "logo_dark"]:
            url = data.get(asset_type)
            if not url:
                continue

            # Create FileAsset
            file_asset, file_created = FileAsset.objects.update_or_create(
                storage_path=url,
                defaults={
                    "organization": org,
                    "uploaded_by": system_user,
                    "original_name": f"{org_slug}_{asset_type}.png",
                    "file_size": 10000,  # Placeholder size
                    "mime_type": "image/png",
                    "is_public": True,
                    "metadata": {"source": "wikipedia", "seeded": True},
                }
            )
            if file_created:
                created_files += 1

            # Create BrandAsset
            brand_asset, asset_created = BrandAsset.objects.update_or_create(
                profile=brand_profile,
                asset_type=asset_type,
                defaults={
                    "file": file_asset,
                    "alt_text": f"{data['name']} Logo",
                    "is_active": True,
                }
            )
            if asset_created:
                created_assets += 1

        print(f"  ✅ {org.name}: logos seeded")

    print(f"\n  Created: {created_files} FileAssets, {created_assets} BrandAssets")


def seed_club_assets():
    """Seed brand assets for clubs."""
    print("\n=== Seeding Club Brand Assets ===")
    system_user = get_system_user()

    created_files = 0
    created_assets = 0
    matched_clubs = 0

    for org_slug, club_logos in CLUB_LOGOS_BY_ORG.items():
        try:
            org = Organisation.objects.get(slug=org_slug)
        except Organisation.DoesNotExist:
            print(f"  ⚠️  Organisation '{org_slug}' not found, skipping")
            continue

        # Get all clubs (root projects) in this org
        clubs = Project.objects.filter(
            organisation=org,
            parent_project__isnull=True
        ).select_related()

        for club in clubs:
            # Try to match by name (case-insensitive partial match)
            logo_url = None
            matched_name = None

            for logo_name, url in club_logos.items():
                if logo_name.lower() in club.name.lower() or club.name.lower() in logo_name.lower():
                    logo_url = url
                    matched_name = logo_name
                    break

            if not logo_url:
                # Use a generic placeholder for unmatched clubs
                logo_url = f"https://ui-avatars.com/api/?name={club.name.replace(' ', '+')}&background=random&size=200"
                matched_name = "placeholder"

            # Get brand profile
            brand_profile = BrandProfile.objects.filter(project=club, is_active=True).first()
            if not brand_profile:
                continue

            # Create FileAsset
            file_asset, file_created = FileAsset.objects.update_or_create(
                storage_path=logo_url,
                defaults={
                    "organization": org,
                    "uploaded_by": system_user,
                    "original_name": f"{club.slug or club.name}_logo.png",
                    "file_size": 10000,
                    "mime_type": "image/png",
                    "is_public": True,
                    "metadata": {"source": "wikipedia" if matched_name != "placeholder" else "ui-avatars", "seeded": True},
                }
            )
            if file_created:
                created_files += 1

            # Create BrandAsset (logo_light)
            brand_asset, asset_created = BrandAsset.objects.update_or_create(
                profile=brand_profile,
                asset_type="logo_light",
                defaults={
                    "file": file_asset,
                    "alt_text": f"{club.name} Logo",
                    "is_active": True,
                }
            )
            if asset_created:
                created_assets += 1
                if matched_name != "placeholder":
                    matched_clubs += 1

        print(f"  ✅ {org.name}: {clubs.count()} clubs processed")

    print(f"\n  Created: {created_files} FileAssets, {created_assets} BrandAssets")
    print(f"  Matched with real logos: {matched_clubs}")


def seed_team_assets():
    """Seed brand assets for teams (child projects)."""
    print("\n=== Seeding Team Brand Assets ===")
    system_user = get_system_user()

    created_files = 0
    created_assets = 0

    # Get teams (projects with a parent)
    teams = Project.objects.filter(
        parent_project__isnull=False
    ).select_related('organisation', 'parent_project')

    for team in teams:
        # Get brand profile
        brand_profile = BrandProfile.objects.filter(project=team, is_active=True).first()
        if not brand_profile:
            continue

        # Check if already has asset
        if BrandAsset.objects.filter(profile=brand_profile).exists():
            continue

        # Use parent club's logo if available, else placeholder
        parent_asset = BrandAsset.objects.filter(
            profile__project=team.parent_project,
            asset_type="logo_light"
        ).first()

        if parent_asset:
            logo_url = parent_asset.file.storage_path
        else:
            logo_url = f"https://ui-avatars.com/api/?name={team.name.replace(' ', '+')}&background=random&size=200"

        # Create FileAsset
        file_asset, file_created = FileAsset.objects.update_or_create(
            storage_path=logo_url if not parent_asset else f"{logo_url}#team-{team.id}",
            defaults={
                "organization": team.organisation,
                "uploaded_by": system_user,
                "original_name": f"{team.slug or team.name}_logo.png",
                "file_size": 10000,
                "mime_type": "image/png",
                "is_public": True,
                "metadata": {"source": "inherited" if parent_asset else "ui-avatars", "seeded": True},
            }
        )
        if file_created:
            created_files += 1

        # Create BrandAsset
        brand_asset, asset_created = BrandAsset.objects.update_or_create(
            profile=brand_profile,
            asset_type="logo_light",
            defaults={
                "file": file_asset,
                "alt_text": f"{team.name} Logo",
                "is_active": True,
            }
        )
        if asset_created:
            created_assets += 1

    print(f"  Processed: {teams.count()} teams")
    print(f"  Created: {created_files} FileAssets, {created_assets} BrandAssets")


def main():
    print("=" * 60)
    print("BRAND ASSETS SEEDING")
    print("=" * 60)

    seed_organisation_assets()
    seed_club_assets()
    seed_team_assets()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Total FileAssets: {FileAsset.objects.count()}")
    print(f"  Total BrandAssets: {BrandAsset.objects.count()}")
    print("=" * 60)


if __name__ == "__main__":
    main()

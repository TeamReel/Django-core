#!/usr/bin/env python
"""
Seed B31/B32 data for TeamReel production.

This script:
1. Seeds all sports via seed_sports command
2. Assigns Football (11v11) to all KNVB/FIGC/DFB/RBFA/FA clubs
3. Creates OutfitConfigurations for top clubs (Ajax, PSV, Feyenoord, etc.)

Usage:
    # Dry run (shows what would happen)
    python scripts/seed_teamreel_sports.py

    # Execute changes
    python scripts/seed_teamreel_sports.py --execute

    # With DATABASE_URL for production
    $env:DATABASE_URL="postgresql://..." ; python scripts/seed_teamreel_sports.py --execute
"""

import argparse
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.core.management import call_command

from organisations.models import Organisation
from projects.models import Project
from sport_configuration.models import Sport, SportConfiguration, OutfitConfiguration


# Top clubs with their official colors
TOP_CLUBS_CONFIG = {
    # KNVB (Netherlands)
    "Ajax": {
        "colors": {
            "home": {"primary": "#FFFFFF", "secondary": "#C8102E", "accent": "#000000"},
            "away": {"primary": "#1E3A5F", "secondary": "#FFFFFF"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    "PSV": {
        "colors": {
            "home": {"primary": "#ED1C24", "secondary": "#FFFFFF"},
            "away": {"primary": "#000000", "secondary": "#ED1C24"},
            "goalkeeper": {"primary": "#FFFF00", "secondary": "#000000"},
        }
    },
    "Feyenoord": {
        "colors": {
            "home": {"primary": "#ED1C24", "secondary": "#FFFFFF"},
            "away": {"primary": "#FFFFFF", "secondary": "#ED1C24"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    # FIGC (Italy)
    "Inter Milan": {
        "colors": {
            "home": {"primary": "#0068A8", "secondary": "#000000"},
            "away": {"primary": "#FFFFFF", "secondary": "#0068A8"},
            "goalkeeper": {"primary": "#FFA500", "secondary": "#000000"},
        }
    },
    "AC Milan": {
        "colors": {
            "home": {"primary": "#FB090B", "secondary": "#000000"},
            "away": {"primary": "#FFFFFF", "secondary": "#FB090B"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    "Juventus": {
        "colors": {
            "home": {"primary": "#FFFFFF", "secondary": "#000000"},
            "away": {"primary": "#000000", "secondary": "#FFFFFF"},
            "goalkeeper": {"primary": "#FFFF00", "secondary": "#000000"},
        }
    },
    # DFB (Germany)
    "Bayern München": {
        "colors": {
            "home": {"primary": "#DC052D", "secondary": "#FFFFFF"},
            "away": {"primary": "#FFFFFF", "secondary": "#DC052D"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    "Borussia Dortmund": {
        "colors": {
            "home": {"primary": "#FDE100", "secondary": "#000000"},
            "away": {"primary": "#000000", "secondary": "#FDE100"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    # The FA (England)
    "Manchester City": {
        "colors": {
            "home": {"primary": "#6CABDD", "secondary": "#FFFFFF"},
            "away": {"primary": "#1C2C5B", "secondary": "#6CABDD"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        }
    },
    "Liverpool": {
        "colors": {
            "home": {"primary": "#C8102E", "secondary": "#FFFFFF"},
            "away": {"primary": "#00B2A9", "secondary": "#FFFFFF"},
            "goalkeeper": {"primary": "#FFFF00", "secondary": "#000000"},
        }
    },
}

# Football federations
FOOTBALL_FEDERATIONS = ["KNVB", "FIGC", "DFB", "RBFA", "The FA"]


def seed_sports(execute: bool) -> Sport | None:
    """Seed all sports using the management command."""
    print("\n=== Step 1: Seed Sports ===")

    if execute:
        call_command('seed_sports')
        football = Sport.objects.filter(slug='football-11').first()
        print(f"✅ Sports seeded. Football ID: {football.id if football else 'NOT FOUND'}")
        return football
    else:
        print("🔍 Would run: python manage.py seed_sports")
        print("   This creates 8 sports: Football, Futsal, Handball, Basketball, etc.")
        return None


def assign_sport_to_clubs(football: Sport | None, execute: bool):
    """Assign Football (11v11) to all clubs in football federations."""
    print("\n=== Step 2: Assign Sport to Clubs ===")

    # Get all clubs (root projects) in football federations
    clubs = Project.objects.filter(
        organisation__name__in=FOOTBALL_FEDERATIONS,
        parent_project__isnull=True  # Root projects = clubs
    )

    print(f"Found {clubs.count()} clubs in {FOOTBALL_FEDERATIONS}")

    if execute and football:
        updated = clubs.update(sport=football)
        print(f"✅ Updated {updated} clubs with sport=Football (11v11)")

        # Also update child teams (they inherit, but explicit is clearer)
        teams = Project.objects.filter(
            organisation__name__in=FOOTBALL_FEDERATIONS,
            parent_project__isnull=False  # Child projects = teams
        )
        teams_updated = teams.update(sport=football)
        print(f"✅ Updated {teams_updated} teams with sport=Football (11v11)")
    else:
        for club in clubs[:10]:
            print(f"   Would update: {club.name} ({club.organisation.name})")
        if clubs.count() > 10:
            print(f"   ... and {clubs.count() - 10} more clubs")


def create_outfit_configurations(execute: bool):
    """Create OutfitConfigurations for top clubs."""
    print("\n=== Step 3: Create Outfit Configurations ===")

    created_count = 0
    skipped_count = 0

    for club_name, config in TOP_CLUBS_CONFIG.items():
        # Find the club (case-insensitive partial match)
        club = Project.objects.filter(
            name__icontains=club_name.split()[0],  # First word for matching
            parent_project__isnull=True
        ).first()

        if not club:
            print(f"⚠️  Club not found: {club_name}")
            continue

        print(f"\n📍 {club.name} ({club.organisation.name if club.organisation else 'no org'})")

        for outfit_type, colors in config["colors"].items():
            if execute:
                outfit, created = OutfitConfiguration.objects.update_or_create(
                    project=club,
                    outfit_type=outfit_type,
                    defaults={"colors": colors}
                )
                status = "created" if created else "updated"
                print(f"   ✅ {outfit_type}: {status}")
                if created:
                    created_count += 1
            else:
                existing = OutfitConfiguration.objects.filter(
                    project=club,
                    outfit_type=outfit_type
                ).exists()
                status = "exists" if existing else "would create"
                print(f"   🔍 {outfit_type}: {status} - {colors}")
                if existing:
                    skipped_count += 1

    if execute:
        print(f"\n✅ Created {created_count} outfit configurations")
    else:
        print(f"\n🔍 Would create/update outfit configs for {len(TOP_CLUBS_CONFIG)} clubs")


def show_summary():
    """Show current state of B31/B32 tables."""
    print("\n=== Current Database State ===")
    print(f"Sports: {Sport.objects.count()}")
    print(f"SportConfigurations: {SportConfiguration.objects.count()}")
    print(f"OutfitConfigurations: {OutfitConfiguration.objects.count()}")

    # Show clubs with sport assigned
    clubs_with_sport = Project.objects.filter(
        sport__isnull=False,
        parent_project__isnull=True
    ).count()
    print(f"Clubs with sport assigned: {clubs_with_sport}")


def main():
    parser = argparse.ArgumentParser(description="Seed B31/B32 data for TeamReel")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually execute changes (default: dry run)"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("TeamReel B31/B32 Seed Script")
    print("=" * 60)

    if not args.execute:
        print("\n⚠️  DRY RUN MODE - No changes will be made")
        print("   Run with --execute to apply changes\n")

    show_summary()

    # Step 1: Seed sports
    football = seed_sports(args.execute)

    # If dry run, get football sport if it exists
    if not args.execute:
        football = Sport.objects.filter(slug='football-11').first()

    # Step 2: Assign sport to clubs
    assign_sport_to_clubs(football, args.execute)

    # Step 3: Create outfit configurations
    create_outfit_configurations(args.execute)

    if args.execute:
        print("\n" + "=" * 60)
        show_summary()
        print("=" * 60)
        print("\n✅ All done! Check the webapp to verify.")
    else:
        print("\n" + "=" * 60)
        print("Run with --execute to apply these changes")
        print("=" * 60)


if __name__ == "__main__":
    main()

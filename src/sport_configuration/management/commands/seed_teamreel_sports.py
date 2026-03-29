"""
Management command to seed TeamReel sports data for top clubs.

Usage:
    # Dry run (shows what would happen)
    python manage.py seed_teamreel_sports

    # Execute changes
    python manage.py seed_teamreel_sports --execute

Sport Hierarchy:
    - Category (Organisation level): Football, Handball, Basketball
    - Variant (Competition level): Football 11v11, Futsal 5v5, Football 7v7

This allows a team to participate in different formats within one season:
    - Ajax 1 → Season 2024/2025
        - Eredivisie (Football 11v11)
        - Summer Tournament (Football 7v7)
"""

from activities.models import Period
from django.core.management import call_command
from django.core.management.base import BaseCommand
from projects.models import Project
from sport_configuration.models import OutfitConfiguration, Sport, SportConfiguration

# Top clubs with their official colors - use exact names from DB
TOP_CLUBS_CONFIG = {
    # KNVB (Netherlands) - Top 3 first
    "Ajax": {
        "match_exact": True,
        "colors": {
            "home": {"primary": "#FFFFFF", "secondary": "#C8102E", "accent": "#000000"},
            "away": {"primary": "#1E3A5F", "secondary": "#FFFFFF"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        },
    },
    "PSV": {
        "match_exact": True,
        "colors": {
            "home": {"primary": "#ED1C24", "secondary": "#FFFFFF"},
            "away": {"primary": "#000000", "secondary": "#ED1C24"},
            "goalkeeper": {"primary": "#FFFF00", "secondary": "#000000"},
        },
    },
    "Feyenoord": {
        "match_exact": True,
        "colors": {
            "home": {"primary": "#ED1C24", "secondary": "#FFFFFF"},
            "away": {"primary": "#FFFFFF", "secondary": "#ED1C24"},
            "goalkeeper": {"primary": "#00FF00", "secondary": "#000000"},
        },
    },
}

# Football federations
FOOTBALL_FEDERATIONS = ["KNVB", "FIGC", "DFB", "RBFA", "The FA"]


class Command(BaseCommand):
    help = "Seed TeamReel sports data: sports, sport assignments, and outfit configurations for top clubs"

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually execute changes (default: dry run)",
        )

    def handle(self, *args, **options):
        execute = options["execute"]

        self.stdout.write("=" * 60)
        self.stdout.write("TeamReel B31/B32 Seed Script")
        self.stdout.write("=" * 60)

        if not execute:
            self.stdout.write(self.style.WARNING("\n⚠️  DRY RUN MODE - No changes will be made"))
            self.stdout.write("   Run with --execute to apply changes\n")

        self.show_summary()

        # Step 1: Seed sports
        football = self.seed_sports(execute)

        # If dry run, get football sport if it exists
        if not execute:
            football = Sport.objects.filter(slug="football-11").first()

        # Step 2: Assign sport to clubs
        self.assign_sport_to_clubs(football, execute)

        # Step 3: Create outfit configurations
        self.create_outfit_configurations(execute)

        if execute:
            self.stdout.write("\n" + "=" * 60)
            self.show_summary()
            self.stdout.write("=" * 60)
            self.stdout.write(self.style.SUCCESS("\n✅ All done! Check the webapp to verify."))
        else:
            self.stdout.write("\n" + "=" * 60)
            self.stdout.write("Run with --execute to apply these changes")
            self.stdout.write("=" * 60)

    def show_summary(self):
        """Show current state of B31/B32 tables."""
        self.stdout.write("\n=== Current Database State ===")
        self.stdout.write(f"Sports: {Sport.objects.count()}")
        self.stdout.write(f"SportConfigurations: {SportConfiguration.objects.count()}")
        self.stdout.write(f"OutfitConfigurations: {OutfitConfiguration.objects.count()}")

        # Show competitions with sport assigned
        competitions_with_sport = Period.objects.filter(sport__isnull=False).count()
        self.stdout.write(f"Competitions with sport assigned: {competitions_with_sport}")

    def seed_sports(self, execute: bool):
        """Seed all sports using the management command."""
        self.stdout.write("\n=== Step 1: Seed Sports ===")

        if execute:
            call_command("seed_sports")
            # Get the Football 11v11 variant (teams are assigned variants, not categories)
            football = Sport.objects.filter(slug="football-11v11").first()
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Sports seeded. Football 11v11 ID: {football.id if football else 'NOT FOUND'}"
                )
            )
            return football
        else:
            self.stdout.write("🔍 Would run: python manage.py seed_sports")
            self.stdout.write(
                "   Creates 6 categories (Football, Handball, etc.) + 9 variants (11v11, Futsal, etc.)"
            )
            return None

    def assign_sport_to_clubs(self, football, execute: bool):
        """Assign Football (11v11) to all competitions in football federations."""
        self.stdout.write("\n=== Step 2: Assign Sport to Competitions ===")

        # Get all competitions (child periods with parent_period set) in football federations
        competitions = Period.objects.filter(
            organisation__name__in=FOOTBALL_FEDERATIONS,
            parent_period__isnull=False,  # Has parent = competition (not season)
        )

        self.stdout.write(f"Found {competitions.count()} competitions in {FOOTBALL_FEDERATIONS}")

        if execute and football:
            updated = competitions.update(sport=football)
            self.stdout.write(
                self.style.SUCCESS(f"✅ Updated {updated} competitions with sport=Football 11v11")
            )
        else:
            for comp in competitions[:10]:
                org_name = comp.organisation.name if comp.organisation else "no org"
                self.stdout.write(f"   Would update: {comp.name} ({org_name})")
            if competitions.count() > 10:
                self.stdout.write(f"   ... and {competitions.count() - 10} more competitions")

    def create_outfit_configurations(self, execute: bool):
        """Create OutfitConfigurations for top clubs."""
        self.stdout.write("\n=== Step 3: Create Outfit Configurations ===")

        created_count = 0

        for club_name, config in TOP_CLUBS_CONFIG.items():
            # Find the club (case-insensitive partial match)
            club = Project.objects.filter(
                name__icontains=club_name.split()[0],  # First word for matching
                parent_project__isnull=True,
            ).first()

            if not club:
                self.stdout.write(self.style.WARNING(f"⚠️  Club not found: {club_name}"))
                continue

            org_name = club.organisation.name if club.organisation else "no org"
            self.stdout.write(f"\n📍 {club.name} ({org_name})")

            for outfit_type, colors in config["colors"].items():
                if execute:
                    outfit, created = OutfitConfiguration.objects.update_or_create(
                        project=club, outfit_type=outfit_type, defaults={"colors": colors}
                    )
                    status = "created" if created else "updated"
                    self.stdout.write(f"   ✅ {outfit_type}: {status}")
                    if created:
                        created_count += 1
                else:
                    existing = OutfitConfiguration.objects.filter(
                        project=club, outfit_type=outfit_type
                    ).exists()
                    status = "exists" if existing else "would create"
                    self.stdout.write(f"   🔍 {outfit_type}: {status} - {colors}")

        if execute:
            self.stdout.write(
                self.style.SUCCESS(f"\n✅ Created {created_count} outfit configurations")
            )
        else:
            self.stdout.write(
                f"\n🔍 Would create/update outfit configs for {len(TOP_CLUBS_CONFIG)} clubs"
            )

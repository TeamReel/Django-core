"""
TeamReel Level 6: Seed Competitions (Child Periods)

Creates 350 competitions (10 seasons × 7 competitions per federation):
- League (main domestic league)
- Cup (main domestic cup)
- European (continental competition)
- League Cup (secondary cup/reserves/youth)
- Play-offs (post-season playoffs/nacompetitie)
- Friendly (pre-season/mid-season friendlies)
- Youth (youth competitions with spring/fall splits)

Product-agnostic naming allows downstream products to customize display names.
Federation-specific examples stored in metadata for reference.

Each competition:
- parent_period = Season FK (links to one of the 50 root Periods)
- start_date/end_date = inherit from parent Season
- organisation FK to federation
- metadata: competition_type + example_name (federation-specific reference)
"""

from accounts.models import User
from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation


class Command(BaseCommand):
    help = "TeamReel Level 6: Seed 350 competitions (7 per federation per season)"

    def handle(self, *args, **options):
        self.stdout.write("Level 6: Competitions (Child Periods)\n")
        self.stdout.write("=" * 70)

        admin_user = User.objects.filter(email="admin@teamreel.demo").first()
        if not admin_user:
            self.stderr.write("❌ Admin user not found. Run seed_level_1_admin_user first.")
            return

        federations = {
            "KNVB": Organisation.objects.filter(name="KNVB").first(),
            "DFB": Organisation.objects.filter(name="DFB").first(),
            "RBFA": Organisation.objects.filter(name="RBFA").first(),
            "The FA": Organisation.objects.filter(name="The FA").first(),
            "FIGC": Organisation.objects.filter(name="FIGC").first(),
        }

        missing = [name for name, org in federations.items() if org is None]
        if missing:
            self.stderr.write(f"❌ Missing federations: {', '.join(missing)}")
            return

        # Generic competition definitions (product-agnostic)
        # Real-world examples stored in metadata for reference only
        competitions = [
            {
                "name": "League",
                "type": "league",
                "examples": {
                    "KNVB": "Eredivisie",
                    "DFB": "Bundesliga",
                    "RBFA": "Pro League",
                    "The FA": "Premier League",
                    "FIGC": "Serie A",
                },
            },
            {
                "name": "Cup",
                "type": "cup",
                "examples": {
                    "KNVB": "KNVB Beker",
                    "DFB": "DFB-Pokal",
                    "RBFA": "Beker van België",
                    "The FA": "FA Cup",
                    "FIGC": "Coppa Italia",
                },
            },
            {
                "name": "European",
                "type": "european",
                "examples": {
                    "KNVB": "UEFA Competitions",
                    "DFB": "UEFA Competitions",
                    "RBFA": "UEFA Competitions",
                    "The FA": "UEFA Competitions",
                    "FIGC": "UEFA Competitions",
                },
            },
            {
                "name": "League Cup",
                "type": "league_cup",
                "examples": {
                    "KNVB": "Vrouwen Eredivisie / Jong Eredivisie",
                    "DFB": "2. Bundesliga / U19 Bundesliga",
                    "RBFA": "1B / Reserves Competition",
                    "The FA": "EFL Cup / U21 Premier League",
                    "FIGC": "Primavera 1 / Coppa Italia Serie C",
                },
            },
            {
                "name": "Play-offs",
                "type": "playoffs",
                "examples": {
                    "KNVB": "Eredivisie Play-offs",
                    "DFB": "Relegation Play-offs",
                    "RBFA": "Europe Play-offs",
                    "The FA": "Championship Play-offs",
                    "FIGC": "Serie B Play-offs",
                },
            },
            {
                "name": "Friendly",
                "type": "friendly",
                "examples": {
                    "KNVB": "Oefenwedstrijden",
                    "DFB": "Testspiele",
                    "RBFA": "Oefenmatchen",
                    "The FA": "Pre-season Friendlies",
                    "FIGC": "Amichevoli",
                },
            },
            {
                "name": "Youth",
                "type": "youth",
                "examples": {
                    "KNVB": "U19 / O21 Competitie (Voorjaar/Najaar)",
                    "DFB": "U19 Bundesliga (Hinrunde/Rückrunde)",
                    "RBFA": "U21 Competitie",
                    "The FA": "U18 Premier League",
                    "FIGC": "Primavera (Girone Andata/Ritorno)",
                },
            },
        ]

        created_count = 0
        existing_count = 0

        with transaction.atomic():
            for fed_name, org in federations.items():
                self.stdout.write(f"\n{fed_name}")
                self.stdout.write("-" * 70)

                # Get all seasons for this federation
                seasons = Period.objects.filter(
                    organisation=org, parent_period__isnull=True
                ).order_by("start_date")

                if not seasons.exists():
                    self.stderr.write(f"⚠️  No seasons found for {fed_name}")
                    continue

                # Create competitions for each season
                for season in seasons:
                    for comp_def in competitions:
                        # Format competition name with year (generic)
                        if fed_name == "KNVB":
                            year_suffix = (
                                f" {season.metadata['year_start']}/{season.metadata['year_end']}"
                            )
                        else:
                            year_suffix = f" {season.metadata['year_start']}/{str(season.metadata['year_end'])[-2:]}"

                        comp_name = f"{comp_def['name']}{year_suffix}"

                        period, created = Period.objects.get_or_create(
                            organisation=org,
                            parent_period=season,
                            name=comp_name,
                            defaults={
                                "start_date": season.start_date,
                                "end_date": season.end_date,
                                "project": None,
                                "description": f"{comp_def['name']} competition for {season.name}",
                                "created_by": admin_user,
                                "metadata": {
                                    "competition_type": comp_def["type"],
                                    "year_start": season.metadata["year_start"],
                                    "year_end": season.metadata["year_end"],
                                    "parent_season": str(season.id),
                                    "example_name": comp_def["examples"][
                                        fed_name
                                    ],  # Reference only
                                },
                            },
                        )

                        if created:
                            created_count += 1
                        else:
                            existing_count += 1

                # Show summary per federation
                fed_total = len(seasons) * len(competitions)
                self.stdout.write(
                    f"  ✓ {fed_total} competitions ({len(seasons)} seasons × {len(competitions)} types)"
                )

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("Level 6 Complete")
        self.stdout.write(f"   Created:  {created_count}")
        self.stdout.write(f"   Existing: {existing_count}")
        self.stdout.write(f"   Total:    {created_count + existing_count} competitions")
        self.stdout.write("=" * 70)
        self.stdout.write("\nDISTRIBUTION:")
        self.stdout.write("   Each federation: 70 competitions (10 seasons x 7 types)")
        self.stdout.write("   Types: League, Cup, European, League Cup, Play-offs, Friendly, Youth")
        self.stdout.write("=" * 70)

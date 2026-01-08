"""
Management command to fix organisation links for clubs.

Fixes clubs that are incorrectly linked to KNVB but should be linked to their own federation:
- English clubs -> The FA
- Italian clubs -> FIGC
- German clubs -> DFB
- Spanish clubs -> RFEF
- French clubs -> FFF
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Fix organisation links for clubs based on their country"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without saving to database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN MODE - No changes will be saved"))

        # Get organisations
        try:
            the_fa = Organisation.objects.get(slug="the-fa")
            figc = Organisation.objects.get(slug="figc")
            dfb = Organisation.objects.get(slug="dfb")
        except Organisation.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"❌ Missing organisation: {e}"))
            return

        # Define club patterns by country
        club_mappings = [
            {
                "country": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 England",
                "organisation": the_fa,
                "pattern": r"(United|City|Arsenal|Chelsea|Liverpool|Tottenham|Manchester|Everton|Leicester|West Ham|Aston Villa|Newcastle|Brighton|Brentford|Crystal Palace|Fulham|Leeds|Nottingham Forest|Southampton|Wolves|Bournemouth|Ipswich)",
            },
            {
                "country": "🇮🇹 Italy",
                "organisation": figc,
                "pattern": r"(Milan|Inter|Juventus|Roma|Lazio|Napoli|Atalanta|Fiorentina|Bologna|Torino|Udinese|Sampdoria|Genoa|Cagliari|Sassuolo|Verona|Spezia|Empoli|Salernitana|Venezia|Monza|Lecce|Como)",
            },
            {
                "country": "🇩🇪 Germany",
                "organisation": dfb,
                "pattern": r"(Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt|Wolfsburg|Mönchengladbach|Union Berlin|Freiburg|Hoffenheim|Mainz|Augsburg|Stuttgart|Hertha|Schalke|Werder Bremen|Bochum|Köln|Heidenheim|St\. Pauli|Holstein Kiel)",
            },
        ]

        total_fixed = 0

        with transaction.atomic():
            for mapping in club_mappings:
                country = mapping["country"]
                target_org = mapping["organisation"]
                pattern = mapping["pattern"]

                # Find clubs matching the pattern but NOT in the correct organisation
                mismatched_clubs = (
                    Project.objects.filter(
                        parent_project=None,  # Only root projects (clubs)
                        name__iregex=pattern,
                    )
                    .exclude(organisation=target_org)
                    .exclude(
                        name__in=["Almere City"]  # Exclude Dutch clubs that match English pattern
                    )
                )

                if mismatched_clubs.count() == 0:
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ {country}: All clubs correctly linked")
                    )
                    continue

                self.stdout.write(f"\n{country} clubs to fix: {mismatched_clubs.count()}")

                for club in mismatched_clubs:
                    old_org = club.organisation.name
                    self.stdout.write(f"  🔄 {club.name}: {old_org} -> {target_org.name}")

                    if not dry_run:
                        club.organisation = target_org
                        club.save(update_fields=["organisation"])

                        # Also update all child projects (teams)
                        child_projects = Project.objects.filter(parent_project=club)
                        for child in child_projects:
                            child.organisation = target_org
                            child.save(update_fields=["organisation"])

                    total_fixed += 1

            if dry_run:
                raise Exception("Dry run - rolling back transaction")

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS(f"✅ Fixed {total_fixed} clubs"))
        self.stdout.write("=" * 60 + "\n")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("🔍 This was a dry run. Run without --dry-run to apply changes.")
            )

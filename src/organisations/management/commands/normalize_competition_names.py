"""
Normalize competition names to generic names (League, Cup, Youth)
"""

from activities.models import Period
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Normalize competition names (Eredivisie → League, etc.)"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("NORMALIZING COMPETITION NAMES")
        self.stdout.write("=" * 70)

        league_names = [
            "Eredivisie",
            "Bundesliga",
            "Serie A",
            "Premier League",
            "La Liga",
            "Ligue 1",
        ]
        cup_names = ["KNVB Beker", "DFB-Pokal", "FA Cup", "Coppa Italia", "Copa del Rey"]
        youth_names = ["O21 Divisie 1", "U21 Bundesliga", "Primavera"]

        with transaction.atomic():
            self.stdout.write("\n[LEAGUE] Updating...")
            updated = skipped = 0
            for old_name in league_names:
                comps = Period.objects.filter(name=old_name).select_related(
                    "organisation", "project"
                )
                for comp in comps:
                    exists = Period.objects.filter(
                        organisation_id=comp.organisation_id,
                        project_id=comp.project_id,
                        name="League",
                        start_date=comp.start_date,
                    ).exists()
                    if not exists:
                        comp.name = "League"
                        comp.save()
                        updated += 1
                    else:
                        skipped += 1
            self.stdout.write(f"  Updated: {updated}, Skipped: {skipped}")

            self.stdout.write("\n[CUP] Updating...")
            updated = skipped = 0
            for old_name in cup_names:
                comps = Period.objects.filter(name=old_name).select_related(
                    "organisation", "project"
                )
                for comp in comps:
                    exists = Period.objects.filter(
                        organisation_id=comp.organisation_id,
                        project_id=comp.project_id,
                        name="Cup",
                        start_date=comp.start_date,
                    ).exists()
                    if not exists:
                        comp.name = "Cup"
                        comp.save()
                        updated += 1
                    else:
                        skipped += 1
            self.stdout.write(f"  Updated: {updated}, Skipped: {skipped}")

            self.stdout.write("\n[YOUTH] Updating...")
            updated = skipped = 0
            for old_name in youth_names:
                comps = Period.objects.filter(name=old_name).select_related(
                    "organisation", "project"
                )
                for comp in comps:
                    exists = Period.objects.filter(
                        organisation_id=comp.organisation_id,
                        project_id=comp.project_id,
                        name="Youth",
                        start_date=comp.start_date,
                    ).exists()
                    if not exists:
                        comp.name = "Youth"
                        comp.save()
                        updated += 1
                    else:
                        skipped += 1
            self.stdout.write(f"  Updated: {updated}, Skipped: {skipped}")

        self.stdout.write(self.style.SUCCESS("\n[DONE] Names normalized!"))

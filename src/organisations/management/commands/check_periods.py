"""Check which periods exist for each organization."""

from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Period


class Command(BaseCommand):
    help = "Check which periods exist for each organization"

    def handle(self, *args, **options):
        orgs = ["knvb", "dfb", "figc", "the-fa"]

        for slug in orgs:
            try:
                org = Organisation.objects.get(slug=slug)
                periods = Period.objects.filter(organisation=org).order_by("-start_date")[:10]

                self.stdout.write(f"\n=== {org.name} ({slug}) ===")
                if periods:
                    for p in periods:
                        self.stdout.write(f"  - {p.name}")
                else:
                    self.stdout.write(self.style.WARNING("  No periods found"))
            except Organisation.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"{slug}: Organisation not found"))

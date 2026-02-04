"""Management command to seed branding data."""

from django.core.management.base import BaseCommand
from django.db import transaction

from branding.models import BrandProfile, DesignToken
from projects.models import Project


CLUB_BRANDS = {
    "Ajax": {
        "name": "AFC Ajax Brand Identity",
        "tokens": {
            "primary_color": {"value": "#C8102E", "type": "color"},
            "secondary_color": {"value": "#FFFFFF", "type": "color"},
            "accent_color": {"value": "#000000", "type": "color"},
            "font_heading": {"value": "Gotham Bold", "type": "font"},
            "font_body": {"value": "Gotham Book", "type": "font"},
            "border_radius": {"value": "4px", "type": "spacing"},
        },
    },
    "PSV": {
        "name": "PSV Eindhoven Brand Identity",
        "tokens": {
            "primary_color": {"value": "#ED1C24", "type": "color"},
            "secondary_color": {"value": "#FFFFFF", "type": "color"},
            "accent_color": {"value": "#000000", "type": "color"},
            "font_heading": {"value": "PSV Eindhoven Bold", "type": "font"},
            "font_body": {"value": "Open Sans", "type": "font"},
            "border_radius": {"value": "8px", "type": "spacing"},
        },
    },
    "Feyenoord": {
        "name": "Feyenoord Rotterdam Brand Identity",
        "tokens": {
            "primary_color": {"value": "#EE1C25", "type": "color"},
            "secondary_color": {"value": "#FFFFFF", "type": "color"},
            "accent_color": {"value": "#006341", "type": "color"},
            "font_heading": {"value": "Feyenoord Display", "type": "font"},
            "font_body": {"value": "Source Sans Pro", "type": "font"},
            "border_radius": {"value": "6px", "type": "spacing"},
        },
    },
}


class Command(BaseCommand):
    """Seed branding data for Ajax, PSV, and Feyenoord."""

    help = "Seed brand profiles and design tokens for top 3 Dutch clubs"

    def handle(self, *args, **options):
        """Execute the command."""
        with transaction.atomic():
            for club_name, brand_config in CLUB_BRANDS.items():
                club = Project.objects.filter(name=club_name, parent_project__isnull=True).first()
                if not club:
                    self.stdout.write(self.style.WARNING(f"Club not found: {club_name}"))
                    continue

                profile, created = BrandProfile.objects.update_or_create(
                    project=club,
                    defaults={"name": brand_config["name"], "is_active": True},
                )
                status = "Created" if created else "Updated"
                self.stdout.write(f"{status} brand: {brand_config['name']}")

                for key, data in brand_config["tokens"].items():
                    DesignToken.objects.update_or_create(
                        profile=profile,
                        key=key,
                        defaults={"value": data["value"], "type": data["type"]},
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nTotal profiles: {BrandProfile.objects.count()}, "
                f"tokens: {DesignToken.objects.count()}"
            )
        )

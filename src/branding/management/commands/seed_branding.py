"""Management command to seed branding data for all organisations."""

from branding.models import BrandProfile, DesignToken
from django.core.management.base import BaseCommand
from django.db import transaction
from organisations.models import Organisation

# Federation brand configurations (official colors)
FEDERATION_BRANDS = {
    "DFB": {
        "name": "DFB Brand Identity",
        "tokens": {
            "primary_color": {"value": "#000000", "type": "color", "description": "German Black"},
            "secondary_color": {"value": "#FFFFFF", "type": "color", "description": "White"},
            "accent_color": {"value": "#FFCC00", "type": "color", "description": "German Gold"},
            "font_heading": {
                "value": "DFB Sans Bold",
                "type": "font",
                "description": "Heading font",
            },
            "font_body": {"value": "Open Sans", "type": "font", "description": "Body font"},
            "border_radius": {"value": "4px", "type": "spacing", "description": "UI corners"},
        },
    },
    "FIGC": {
        "name": "FIGC Brand Identity",
        "tokens": {
            "primary_color": {"value": "#0066B3", "type": "color", "description": "Azzurri Blue"},
            "secondary_color": {"value": "#FFFFFF", "type": "color", "description": "White"},
            "accent_color": {"value": "#009246", "type": "color", "description": "Italian Green"},
            "font_heading": {
                "value": "FIGC Display",
                "type": "font",
                "description": "Heading font",
            },
            "font_body": {"value": "Source Sans Pro", "type": "font", "description": "Body font"},
            "border_radius": {"value": "6px", "type": "spacing", "description": "UI corners"},
        },
    },
    "KNVB": {
        "name": "KNVB Brand Identity",
        "tokens": {
            "primary_color": {"value": "#F47920", "type": "color", "description": "Dutch Orange"},
            "secondary_color": {"value": "#FFFFFF", "type": "color", "description": "White"},
            "accent_color": {"value": "#1E3A8A", "type": "color", "description": "Royal Blue"},
            "font_heading": {
                "value": "KNVB Sans Bold",
                "type": "font",
                "description": "Heading font",
            },
            "font_body": {"value": "Open Sans", "type": "font", "description": "Body font"},
            "border_radius": {"value": "8px", "type": "spacing", "description": "UI corners"},
        },
    },
    "RBFA": {
        "name": "RBFA Brand Identity",
        "tokens": {
            "primary_color": {"value": "#EF3340", "type": "color", "description": "Belgian Red"},
            "secondary_color": {"value": "#000000", "type": "color", "description": "Black"},
            "accent_color": {"value": "#FFD700", "type": "color", "description": "Belgian Gold"},
            "font_heading": {
                "value": "RBFA Display Bold",
                "type": "font",
                "description": "Heading font",
            },
            "font_body": {"value": "Roboto", "type": "font", "description": "Body font"},
            "border_radius": {"value": "4px", "type": "spacing", "description": "UI corners"},
        },
    },
    "The FA": {
        "name": "The FA Brand Identity",
        "tokens": {
            "primary_color": {"value": "#002366", "type": "color", "description": "England Navy"},
            "secondary_color": {"value": "#FFFFFF", "type": "color", "description": "White"},
            "accent_color": {"value": "#CF142B", "type": "color", "description": "England Red"},
            "font_heading": {
                "value": "FA England Bold",
                "type": "font",
                "description": "Heading font",
            },
            "font_body": {"value": "Inter", "type": "font", "description": "Body font"},
            "border_radius": {"value": "6px", "type": "spacing", "description": "UI corners"},
        },
    },
}

# Default brand for unknown orgs
DEFAULT_BRAND = {
    "tokens": {
        "primary_color": {"value": "#3B82F6", "type": "color", "description": "Default Blue"},
        "secondary_color": {"value": "#FFFFFF", "type": "color", "description": "White"},
        "accent_color": {"value": "#10B981", "type": "color", "description": "Default Green"},
        "font_heading": {"value": "Inter Bold", "type": "font", "description": "Heading font"},
        "font_body": {"value": "Inter", "type": "font", "description": "Body font"},
        "border_radius": {"value": "8px", "type": "spacing", "description": "UI corners"},
    },
}


class Command(BaseCommand):
    """Seed branding data for all organisations in the database."""

    help = "Seed brand profiles and design tokens for all organisations"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-test",
            action="store_true",
            default=True,
            help="Skip organisations with 'test' or 'del' in name (default: True)",
        )
        parser.add_argument(
            "--include-test",
            action="store_true",
            help="Include test organisations",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        include_test = options.get("include_test", False)
        dry_run = options.get("dry_run", False)

        # Get all organisations
        orgs = Organisation.objects.all()

        if not include_test:
            # Exclude test orgs
            orgs = orgs.exclude(name__icontains="test").exclude(name__icontains="del_")

        if not orgs.exists():
            self.stdout.write(self.style.ERROR("No organisations found."))
            return

        self.stdout.write(f"Processing {orgs.count()} organisations...")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made\n"))

        created_profiles = 0
        created_tokens = 0

        with transaction.atomic():
            for org in orgs:
                # Get brand config: use known federation or default
                brand_config = FEDERATION_BRANDS.get(org.name)

                if brand_config:
                    profile_name = brand_config["name"]
                    tokens = brand_config["tokens"]
                else:
                    # Use default for unknown orgs
                    profile_name = f"{org.name} Brand Identity"
                    tokens = DEFAULT_BRAND["tokens"]
                    self.stdout.write(self.style.WARNING(f"  Using default brand for: {org.name}"))

                if dry_run:
                    self.stdout.write(f"  Would create: {profile_name}")
                    self.stdout.write(f"    Tokens: {', '.join(tokens.keys())}")
                    continue

                # Create or update BrandProfile
                profile, created = BrandProfile.objects.update_or_create(
                    organisation=org,
                    defaults={"name": profile_name, "is_active": True},
                )

                if created:
                    created_profiles += 1
                    self.stdout.write(self.style.SUCCESS(f"  Created: {profile_name}"))
                else:
                    self.stdout.write(f"  Updated: {profile_name}")

                # Create or update DesignTokens
                for key, data in tokens.items():
                    _, token_created = DesignToken.objects.update_or_create(
                        profile=profile,
                        key=key,
                        defaults={
                            "value": data["value"],
                            "type": data["type"],
                            "description": data.get("description", ""),
                        },
                    )
                    if token_created:
                        created_tokens += 1

            if dry_run:
                # Rollback in dry run
                transaction.set_rollback(True)

        # Summary
        total_profiles = BrandProfile.objects.count()
        total_tokens = DesignToken.objects.count()

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Profiles: {total_profiles} (+{created_profiles}), "
                f"Tokens: {total_tokens} (+{created_tokens})"
            )
        )

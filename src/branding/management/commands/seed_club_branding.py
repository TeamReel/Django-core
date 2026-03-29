"""Management command to seed branding data for all clubs (projects)."""

import hashlib

from branding.models import BrandProfile, DesignToken
from django.core.management.base import BaseCommand
from django.db import transaction
from projects.models import Project

# Well-known club colors (official brand colors)
CLUB_BRANDS = {
    # Italian Serie A
    "AC Milan": {"primary": "#AC1E39", "secondary": "#000000", "accent": "#FFFFFF"},
    "Inter": {"primary": "#010E80", "secondary": "#000000", "accent": "#FFCC00"},
    "Juventus": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#D4AF37"},
    "AS Roma": {"primary": "#8E1F2F", "secondary": "#F0BC42", "accent": "#FFFFFF"},
    "SSC Napoli": {"primary": "#12A0D7", "secondary": "#FFFFFF", "accent": "#0055A4"},
    "Lazio": {"primary": "#87D8F7", "secondary": "#FFFFFF", "accent": "#001F68"},
    "Fiorentina": {"primary": "#4B2882", "secondary": "#FFFFFF", "accent": "#FF5733"},
    "Atalanta": {"primary": "#1E71B8", "secondary": "#000000", "accent": "#FFFFFF"},
    "Bologna": {"primary": "#1A2F4B", "secondary": "#A31E2C", "accent": "#FFFFFF"},
    "Torino": {"primary": "#8B0000", "secondary": "#FFFFFF", "accent": "#FFD700"},
    "Udinese": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#FFCC00"},
    "Genoa": {"primary": "#A31E2C", "secondary": "#0A3161", "accent": "#FFFFFF"},
    "Cagliari": {"primary": "#A31E2C", "secondary": "#0A3161", "accent": "#FFFFFF"},
    "Empoli": {"primary": "#005BAC", "secondary": "#FFFFFF", "accent": "#E31B23"},
    "Monza": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Lecce": {"primary": "#FFCC00", "secondary": "#FF0000", "accent": "#000000"},
    "Venezia": {"primary": "#FF6600", "secondary": "#004D26", "accent": "#000000"},
    "Hellas Verona": {"primary": "#003DA5", "secondary": "#FFD100", "accent": "#FFFFFF"},
    "Parma": {"primary": "#FFFF00", "secondary": "#005BAC", "accent": "#FFFFFF"},
    "Como 1907": {"primary": "#005BAC", "secondary": "#FFFFFF", "accent": "#000000"},
    # German Bundesliga
    "Bayern Munich": {"primary": "#DC052D", "secondary": "#FFFFFF", "accent": "#0066B2"},
    "Borussia Dortmund": {"primary": "#FDE100", "secondary": "#000000", "accent": "#FFFFFF"},
    "RB Leipzig": {"primary": "#DD0741", "secondary": "#FFFFFF", "accent": "#001E3C"},
    "Bayer Leverkusen": {"primary": "#E32221", "secondary": "#000000", "accent": "#FFFFFF"},
    "Eintracht Frankfurt": {"primary": "#E1001A", "secondary": "#000000", "accent": "#FFFFFF"},
    "VfB Stuttgart": {"primary": "#E32219", "secondary": "#FFFFFF", "accent": "#000000"},
    "Wolfsburg": {"primary": "#65B32E", "secondary": "#FFFFFF", "accent": "#000000"},
    "Werder Bremen": {"primary": "#1D9053", "secondary": "#FFFFFF", "accent": "#000000"},
    "Freiburg": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#E32219"},
    "Hoffenheim": {"primary": "#1961B5", "secondary": "#FFFFFF", "accent": "#000000"},
    "Mainz 05": {"primary": "#C3141E", "secondary": "#FFFFFF", "accent": "#000000"},
    "Union Berlin": {"primary": "#EB1923", "secondary": "#FFFFFF", "accent": "#FFC72C"},
    "Augsburg": {"primary": "#BA3733", "secondary": "#FFFFFF", "accent": "#005E1F"},
    "Köln": {"primary": "#ED1C24", "secondary": "#FFFFFF", "accent": "#000000"},
    "Mönchengladbach": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#18A647"},
    "Hertha BSC": {"primary": "#005DAA", "secondary": "#FFFFFF", "accent": "#000000"},
    "Schalke 04": {"primary": "#004D9D", "secondary": "#FFFFFF", "accent": "#000000"},
    "Hamburg": {"primary": "#004D9D", "secondary": "#FFFFFF", "accent": "#E32221"},
    # Dutch Eredivisie
    "Ajax": {"primary": "#C8102E", "secondary": "#FFFFFF", "accent": "#000000"},
    "PSV": {"primary": "#ED1C24", "secondary": "#FFFFFF", "accent": "#000000"},
    "Feyenoord": {"primary": "#EE1C25", "secondary": "#FFFFFF", "accent": "#006341"},
    "AZ Alkmaar": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "FC Utrecht": {"primary": "#E4002B", "secondary": "#FFFFFF", "accent": "#000000"},
    "FC Twente": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Vitesse": {"primary": "#FFD700", "secondary": "#000000", "accent": "#FFFFFF"},
    "Heerenveen": {"primary": "#005BAC", "secondary": "#FFFFFF", "accent": "#E32221"},
    "FC Groningen": {"primary": "#1E7B34", "secondary": "#FFFFFF", "accent": "#000000"},
    "NEC Nijmegen": {"primary": "#FF0000", "secondary": "#000000", "accent": "#FFD700"},
    "Roda": {"primary": "#FFD700", "secondary": "#000000", "accent": "#FFFFFF"},
    # Belgian Pro League
    "Club Brugge": {"primary": "#0053A0", "secondary": "#000000", "accent": "#FFFFFF"},
    "Anderlecht": {"primary": "#660099", "secondary": "#FFFFFF", "accent": "#000000"},
    "KRC Genk": {"primary": "#005BAC", "secondary": "#FFFFFF", "accent": "#000000"},
    "Standard Liège": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Antwerp": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Gent": {"primary": "#1C4B9C", "secondary": "#FFFFFF", "accent": "#000000"},
    "Union SG": {"primary": "#FFD700", "secondary": "#005BAC", "accent": "#FFFFFF"},
    # English Premier League
    "Liverpool": {"primary": "#C8102E", "secondary": "#FFFFFF", "accent": "#00A398"},
    "Manchester City": {"primary": "#6CADDF", "secondary": "#FFFFFF", "accent": "#1C2C5B"},
    "Manchester United": {"primary": "#DA291C", "secondary": "#FFFFFF", "accent": "#FBE122"},
    "Arsenal": {"primary": "#EF0107", "secondary": "#FFFFFF", "accent": "#063672"},
    "Chelsea": {"primary": "#034694", "secondary": "#FFFFFF", "accent": "#DBA111"},
    "Tottenham": {"primary": "#132257", "secondary": "#FFFFFF", "accent": "#000000"},
    "Newcastle": {"primary": "#241F20", "secondary": "#FFFFFF", "accent": "#F0A000"},
    "Aston Villa": {"primary": "#670E36", "secondary": "#95BFE5", "accent": "#FFFFFF"},
    "West Ham": {"primary": "#7A263A", "secondary": "#1BB1E7", "accent": "#FFFFFF"},
    "Brighton": {"primary": "#0057B8", "secondary": "#FFFFFF", "accent": "#000000"},
    "Everton": {"primary": "#003399", "secondary": "#FFFFFF", "accent": "#000000"},
    "Wolves": {"primary": "#FDB913", "secondary": "#000000", "accent": "#FFFFFF"},
    "Leicester": {"primary": "#003090", "secondary": "#FDBE11", "accent": "#FFFFFF"},
    "Leeds": {"primary": "#FFCD00", "secondary": "#1D428A", "accent": "#FFFFFF"},
    "Crystal Palace": {"primary": "#1B458F", "secondary": "#C4122E", "accent": "#FFFFFF"},
    "Fulham": {"primary": "#000000", "secondary": "#FFFFFF", "accent": "#CC0000"},
    "Brentford": {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Nottingham Forest": {"primary": "#DD0000", "secondary": "#FFFFFF", "accent": "#000000"},
    "Bournemouth": {"primary": "#DA291C", "secondary": "#000000", "accent": "#FFFFFF"},
}


def generate_color_from_name(name: str) -> str:
    """Generate a deterministic color from a club name using hash."""
    # Use MD5 hash for deterministic colors
    hash_obj = hashlib.md5(name.encode())
    hex_dig = hash_obj.hexdigest()
    # Take first 6 characters as color
    return f"#{hex_dig[:6].upper()}"


def get_complementary_color(hex_color: str) -> str:
    """Generate a complementary (contrasting) color."""
    # Remove # and convert to RGB
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate luminance
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    # Return black or white based on luminance
    return "#000000" if luminance > 0.5 else "#FFFFFF"


def get_club_tokens(club_name: str) -> dict:
    """Get design tokens for a club, using known colors or generating them."""
    if club_name in CLUB_BRANDS:
        colors = CLUB_BRANDS[club_name]
        primary = colors["primary"]
        secondary = colors["secondary"]
        accent = colors["accent"]
    else:
        # Generate colors from club name
        primary = generate_color_from_name(club_name)
        secondary = get_complementary_color(primary)
        accent = generate_color_from_name(club_name + "_accent")

    return {
        "primary_color": {"value": primary, "type": "color", "description": "Club primary color"},
        "secondary_color": {
            "value": secondary,
            "type": "color",
            "description": "Club secondary color",
        },
        "accent_color": {"value": accent, "type": "color", "description": "Club accent color"},
        "font_heading": {"value": "Inter Bold", "type": "font", "description": "Heading font"},
        "font_body": {"value": "Inter", "type": "font", "description": "Body font"},
        "border_radius": {"value": "8px", "type": "spacing", "description": "UI corners"},
    }


class Command(BaseCommand):
    """Seed branding data for all clubs (projects) in the database."""

    help = "Seed brand profiles and design tokens for all clubs"

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-test",
            action="store_true",
            help="Include test clubs",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit number of clubs to process (0 = all)",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        include_test = options.get("include_test", False)
        dry_run = options.get("dry_run", False)
        limit = options.get("limit", 0)

        # Get all top-level projects (clubs)
        clubs = Project.objects.filter(parent_project__isnull=True).select_related("organisation")

        if not include_test:
            # Exclude test clubs
            clubs = clubs.exclude(name__icontains="test").exclude(name__icontains="del_")

        if limit > 0:
            clubs = clubs[:limit]

        if not clubs.exists():
            self.stdout.write(self.style.ERROR("No clubs found."))
            return

        self.stdout.write(f"Processing {clubs.count()} clubs...")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made\n"))

        created_profiles = 0
        created_tokens = 0
        known_count = 0
        generated_count = 0

        with transaction.atomic():
            for club in clubs:
                profile_name = f"{club.name} Brand Identity"
                tokens = get_club_tokens(club.name)
                is_known = club.name in CLUB_BRANDS

                if is_known:
                    known_count += 1
                else:
                    generated_count += 1

                if dry_run:
                    status = "known" if is_known else "generated"
                    self.stdout.write(
                        f"  [{status}] {club.name}: {tokens['primary_color']['value']}"
                    )
                    continue

                # Create or update BrandProfile for this project
                profile, created = BrandProfile.objects.update_or_create(
                    project=club,
                    defaults={"name": profile_name, "is_active": True},
                )

                if created:
                    created_profiles += 1
                    status = "✓" if is_known else "○"
                    self.stdout.write(
                        f"  {status} Created: {club.name} ({tokens['primary_color']['value']})"
                    )

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
                transaction.set_rollback(True)

        # Summary
        total_profiles = BrandProfile.objects.filter(project__isnull=False).count()
        total_tokens = DesignToken.objects.count()

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! Club profiles: {total_profiles} (+{created_profiles}), "
                f"Tokens: {total_tokens} (+{created_tokens})"
            )
        )
        self.stdout.write(f"  Known brands: {known_count}, Generated: {generated_count}")

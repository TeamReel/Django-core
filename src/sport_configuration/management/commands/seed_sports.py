"""
Management command to seed sport configuration data for development and demo environments.

Usage:
    python manage.py seed_sports [--clear]

This command is idempotent - running it multiple times will update existing records
rather than creating duplicates, thanks to update_or_create usage.

Hierarchy:
    Category (parent_sport=NULL) → Variant (parent_sport=Category)

    Example:
        Football (category) → Football 11v11, Futsal 5v5, Football 7v7 (variants)
        Handball (category) → Indoor Handball (variant)
"""

from typing import Any

from django.core.management.base import BaseCommand
from sport_configuration.models import Sport, SportConfiguration

# Sport Categories (Organisation level)
SPORT_CATEGORIES: list[dict[str, Any]] = [
    {"name": "Football", "slug": "football", "sport_icon": "⚽"},
    {"name": "Handball", "slug": "handball", "sport_icon": "🤾"},
    {"name": "Basketball", "slug": "basketball", "sport_icon": "🏀"},
    {"name": "Volleyball", "slug": "volleyball", "sport_icon": "🏐"},
    {"name": "Rugby", "slug": "rugby", "sport_icon": "🏉"},
    {"name": "Hockey", "slug": "hockey", "sport_icon": "🏒"},
]

# Sport Variants with configurations (Team level)
SPORTS_DATA: list[dict[str, Any]] = [
    # Football variants
    {
        "name": "Football 11v11",
        "slug": "football-11v11",
        "sport_icon": "⚽",
        "parent_slug": "football",
        "config": {
            "team_size_min": 11,
            "team_size_max": 11,
            "max_substitutes": 7,
            "pitch_type": "outdoor_large",
            "has_corner_kicks": True,
            "has_offside": True,
            "match_duration_minutes": 90,
            "positions": [
                "GK",
                "LB",
                "CB",
                "RB",
                "LWB",
                "RWB",
                "DM",
                "CM",
                "AM",
                "LM",
                "RM",
                "LW",
                "RW",
                "CF",
                "ST",
            ],
            "formations": {
                "4-3-3": {
                    "description": "Standard attacking formation",
                    "positions": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"],
                },
                "4-4-2": {
                    "description": "Classic balanced formation",
                    "positions": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
                },
                "3-5-2": {
                    "description": "Wingback formation",
                    "positions": [
                        "GK",
                        "CB",
                        "CB",
                        "CB",
                        "LWB",
                        "CM",
                        "CM",
                        "CM",
                        "RWB",
                        "ST",
                        "ST",
                    ],
                },
                "4-2-3-1": {
                    "description": "Modern defensive formation",
                    "positions": ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "LW", "AM", "RW", "ST"],
                },
            },
            "outfit_types": ["home", "away", "goalkeeper", "third_kit"],
            "has_goalkeeper": True,
        },
    },
    {
        "name": "Futsal 5v5",
        "slug": "futsal-5v5",
        "sport_icon": "⚽",
        "parent_slug": "football",
        "config": {
            "team_size_min": 5,
            "team_size_max": 5,
            "max_substitutes": 7,
            "pitch_type": "indoor",
            "has_corner_kicks": False,  # Futsal has kick-ins, not corners
            "has_offside": False,
            "match_duration_minutes": 40,
            "positions": ["GK", "FIXO", "ALA", "PIVOT"],
            "formations": {
                "1-2-2": {
                    "description": "Standard defensive setup",
                    "positions": ["GK", "FIXO", "ALA", "ALA", "PIVOT"],
                },
                "2-2": {
                    "description": "Flat formation without dedicated fixo",
                    "positions": ["GK", "ALA", "ALA", "PIVOT", "PIVOT"],
                },
                "1-1-2-1": {
                    "description": "Attacking diamond",
                    "positions": ["GK", "FIXO", "ALA", "ALA", "PIVOT"],
                },
            },
            "outfit_types": ["home", "away", "goalkeeper"],
            "has_goalkeeper": True,
        },
    },
    {
        "name": "Football 7v7",
        "slug": "football-7v7",
        "sport_icon": "⚽",
        "parent_slug": "football",
        "config": {
            "team_size_min": 7,
            "team_size_max": 7,
            "max_substitutes": 5,
            "pitch_type": "outdoor_small",
            "has_corner_kicks": True,
            "has_offside": False,  # No offside in 7v7 youth
            "match_duration_minutes": 50,
            "positions": ["GK", "DEF", "MID", "FWD"],
            "formations": {
                "2-3-1": {
                    "description": "Standard youth formation",
                    "positions": ["GK", "DEF", "DEF", "MID", "MID", "MID", "FWD"],
                },
                "3-2-1": {
                    "description": "Defensive formation",
                    "positions": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "FWD"],
                },
            },
            "outfit_types": ["home", "away", "goalkeeper"],
            "has_goalkeeper": True,
        },
    },
    # Handball variants
    {
        "name": "Indoor Handball",
        "slug": "handball-indoor",
        "sport_icon": "🤾",
        "parent_slug": "handball",
        "config": {
            "team_size_min": 7,
            "team_size_max": 7,
            "max_substitutes": 7,
            "pitch_type": "indoor",
            "has_corner_kicks": False,
            "has_offside": False,
            "match_duration_minutes": 60,
            "positions": ["GK", "LW", "LB", "CB", "RB", "RW", "P"],
            "formations": {
                "6-0": {
                    "description": "Standard defensive formation",
                    "positions": ["GK", "LW", "LB", "CB", "CB", "RB", "RW"],
                },
                "5-1": {
                    "description": "Aggressive defensive formation",
                    "positions": ["GK", "LW", "LB", "CB", "RB", "RW", "P"],
                },
            },
            "outfit_types": ["home", "away", "goalkeeper"],
            "has_goalkeeper": True,
        },
    },
    # Basketball variants
    {
        "name": "Basketball 5v5",
        "slug": "basketball-5v5",
        "sport_icon": "🏀",
        "parent_slug": "basketball",
        "config": {
            "team_size_min": 5,
            "team_size_max": 5,
            "max_substitutes": 7,
            "pitch_type": "court",
            "has_corner_kicks": False,
            "has_offside": False,
            "match_duration_minutes": 48,
            "positions": ["PG", "SG", "SF", "PF", "C"],
            "formations": {},
            "outfit_types": ["home", "away"],
            "has_goalkeeper": False,
        },
    },
    # Volleyball variants
    {
        "name": "Indoor Volleyball",
        "slug": "volleyball-indoor",
        "sport_icon": "🏐",
        "parent_slug": "volleyball",
        "config": {
            "team_size_min": 6,
            "team_size_max": 6,
            "max_substitutes": 6,
            "pitch_type": "court",
            "has_corner_kicks": False,
            "has_offside": False,
            "match_duration_minutes": 90,  # Approximate
            "positions": ["SETTER", "LIBERO", "OPPOSITE", "OUTSIDE", "MIDDLE"],
            "formations": {
                "5-1": {
                    "description": "One setter rotation",
                    "positions": ["SETTER", "OUTSIDE", "OUTSIDE", "MIDDLE", "MIDDLE", "OPPOSITE"],
                },
                "6-2": {
                    "description": "Two setter rotation",
                    "positions": ["SETTER", "SETTER", "OUTSIDE", "OUTSIDE", "MIDDLE", "MIDDLE"],
                },
            },
            "outfit_types": ["home", "away", "libero"],
            "has_goalkeeper": False,
        },
    },
    # Rugby variants
    {
        "name": "Rugby Union",
        "slug": "rugby-union",
        "sport_icon": "🏉",
        "parent_slug": "rugby",
        "config": {
            "team_size_min": 15,
            "team_size_max": 15,
            "max_substitutes": 8,
            "pitch_type": "outdoor_large",
            "has_corner_kicks": False,
            "has_offside": True,
            "match_duration_minutes": 80,
            "positions": [
                "PROP",
                "HOOKER",
                "LOCK",
                "FLANKER",
                "NO8",
                "SCRUMHALF",
                "FLYHALF",
                "CENTER",
                "WING",
                "FULLBACK",
            ],
            "formations": {},
            "outfit_types": ["home", "away"],
            "has_goalkeeper": False,
        },
    },
    # Hockey variants
    {
        "name": "Ice Hockey",
        "slug": "ice-hockey",
        "sport_icon": "🏒",
        "parent_slug": "hockey",
        "config": {
            "team_size_min": 6,
            "team_size_max": 6,
            "max_substitutes": 17,
            "pitch_type": "ice_rink",
            "has_corner_kicks": False,
            "has_offside": True,
            "match_duration_minutes": 60,
            "positions": ["GOALIE", "LD", "RD", "LW", "C", "RW"],
            "formations": {},
            "outfit_types": ["home", "away", "goalie"],
            "has_goalkeeper": True,
        },
    },
    {
        "name": "Field Hockey",
        "slug": "field-hockey",
        "sport_icon": "🏑",
        "parent_slug": "hockey",
        "config": {
            "team_size_min": 11,
            "team_size_max": 11,
            "max_substitutes": 5,
            "pitch_type": "outdoor_large",
            "has_corner_kicks": True,
            "has_offside": False,
            "match_duration_minutes": 70,
            "positions": ["GK", "DEF", "MID", "FWD"],
            "formations": {
                "3-3-3-1": {
                    "description": "Standard formation",
                    "positions": [
                        "GK",
                        "DEF",
                        "DEF",
                        "DEF",
                        "MID",
                        "MID",
                        "MID",
                        "FWD",
                        "FWD",
                        "FWD",
                        "FWD",
                    ],
                },
            },
            "outfit_types": ["home", "away", "goalkeeper"],
            "has_goalkeeper": True,
        },
    },
]


class Command(BaseCommand):
    """Seed sport configuration data for development and demo environments."""

    help = "Seed sport configuration data for development and demo environments"

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing sports and configurations before seeding",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if options["clear"]:
            self.stdout.write("Clearing existing sports and configurations...")
            SportConfiguration.objects.all().delete()
            Sport.objects.all().delete()
            self.stdout.write(self.style.WARNING("All sports and configurations deleted."))

        # Step 1: Create sport categories
        self.stdout.write("\n=== Creating Sport Categories ===")
        category_map: dict[str, Sport] = {}

        for cat_data in SPORT_CATEGORIES:
            category, created = Sport.objects.update_or_create(
                slug=cat_data["slug"],
                defaults={
                    "name": cat_data["name"],
                    "sport_icon": cat_data.get("sport_icon", ""),
                    "parent_sport": None,  # Categories have no parent
                    "is_active": True,
                },
            )
            category_map[cat_data["slug"]] = category
            status = "Created" if created else "Updated"
            self.stdout.write(f"  {status}: {category.name} (category)")

        # Step 2: Create sport variants with configurations
        self.stdout.write("\n=== Creating Sport Variants ===")
        created_count = 0
        updated_count = 0

        for sport_data in SPORTS_DATA:
            config_data: dict[str, Any] = sport_data.pop("config")
            parent_slug = sport_data.pop("parent_slug")
            parent = category_map.get(parent_slug)

            if not parent:
                self.stdout.write(
                    self.style.WARNING(f"  ⚠️  Parent category not found: {parent_slug}")
                )
                sport_data["config"] = config_data
                sport_data["parent_slug"] = parent_slug
                continue

            sport, created = Sport.objects.update_or_create(
                slug=sport_data["slug"],
                defaults={
                    "name": sport_data["name"],
                    "sport_icon": sport_data.get("sport_icon", ""),
                    "parent_sport": parent,  # Link to category
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {sport.name} → {parent.name}"))
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {sport.name} → {parent.name}")

            # Create/update configuration for this variant
            SportConfiguration.objects.update_or_create(
                sport=sport,
                defaults={
                    "team_size_min": config_data["team_size_min"],
                    "team_size_max": config_data["team_size_max"],
                    "max_substitutes": config_data.get("max_substitutes", 7),
                    "positions": config_data.get("positions", []),
                    "formations": config_data.get("formations", {}),
                    "outfit_types": config_data.get("outfit_types", ["home", "away"]),
                    "has_goalkeeper": config_data.get("has_goalkeeper", False),
                    # New variant-specific fields
                    "pitch_type": config_data.get("pitch_type", "outdoor_large"),
                    "has_corner_kicks": config_data.get("has_corner_kicks", True),
                    "has_offside": config_data.get("has_offside", True),
                    "match_duration_minutes": config_data.get("match_duration_minutes", 90),
                },
            )

            # Put data back for potential reuse
            sport_data["config"] = config_data
            sport_data["parent_slug"] = parent_slug

        self.stdout.write("")
        self.stdout.write("=" * 50)
        self.stdout.write(f"Categories: {len(SPORT_CATEGORIES)}")
        self.stdout.write(f"Variants: {created_count} created, {updated_count} updated")
        self.stdout.write("=" * 50)
        self.stdout.write(self.style.SUCCESS("Sport seed data loaded!"))

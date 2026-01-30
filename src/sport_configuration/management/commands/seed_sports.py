"""
Management command to seed sport configuration data for development and demo environments.

Usage:
    python manage.py seed_sports [--clear]

This command is idempotent - running it multiple times will update existing records
rather than creating duplicates, thanks to update_or_create usage.
"""

from typing import Any

from django.core.management.base import BaseCommand

from sport_configuration.models import Sport, SportConfiguration

SPORTS_DATA: list[dict[str, Any]] = [
    {
        "name": "Football (11v11)",
        "slug": "football-11",
        "sport_icon": "⚽",
        "config": {
            "team_size_min": 11,
            "team_size_max": 11,
            "max_substitutes": 7,
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
        "name": "Futsal (5v5)",
        "slug": "futsal-5",
        "sport_icon": "⚽",
        "config": {
            "team_size_min": 5,
            "team_size_max": 5,
            "max_substitutes": 7,
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
        "name": "Handball",
        "slug": "handball",
        "sport_icon": "🤾",
        "config": {
            "team_size_min": 7,
            "team_size_max": 7,
            "max_substitutes": 7,
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
    {
        "name": "Basketball",
        "slug": "basketball",
        "sport_icon": "🏀",
        "config": {
            "team_size_min": 5,
            "team_size_max": 5,
            "max_substitutes": 7,
            "positions": ["PG", "SG", "SF", "PF", "C"],
            "formations": {},
            "outfit_types": ["home", "away"],
            "has_goalkeeper": False,
        },
    },
    {
        "name": "Volleyball",
        "slug": "volleyball",
        "sport_icon": "🏐",
        "config": {
            "team_size_min": 6,
            "team_size_max": 6,
            "max_substitutes": 6,
            "positions": ["SETTER", "LIBERO", "OPPOSITE", "OUTSIDE", "MIDDLE"],
            "formations": {
                "5-1": {
                    "description": "One setter rotation",
                    "positions": ["SETTER", "OUTSIDE", "OUTSIDE", "MIDDLE", "MIDDLE", "OPPOSITE"],
                },
                "6-2": {
                    "description": "Two setter rotation",
                    "positions": [
                        "SETTER",
                        "SETTER",
                        "OUTSIDE",
                        "OUTSIDE",
                        "MIDDLE",
                        "MIDDLE",
                    ],
                },
            },
            "outfit_types": ["home", "away", "libero"],
            "has_goalkeeper": False,
        },
    },
    {
        "name": "Rugby Union",
        "slug": "rugby-union",
        "sport_icon": "🏉",
        "config": {
            "team_size_min": 15,
            "team_size_max": 15,
            "max_substitutes": 8,
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
    {
        "name": "Ice Hockey",
        "slug": "ice-hockey",
        "sport_icon": "🏒",
        "config": {
            "team_size_min": 6,
            "team_size_max": 6,
            "max_substitutes": 17,
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
        "config": {
            "team_size_min": 11,
            "team_size_max": 11,
            "max_substitutes": 5,
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

        created_count = 0
        updated_count = 0

        for sport_data in SPORTS_DATA:
            config_data: dict[str, Any] = sport_data.pop("config")

            sport, created = Sport.objects.update_or_create(
                slug=sport_data["slug"],
                defaults={
                    "name": sport_data["name"],
                    "sport_icon": sport_data.get("sport_icon", ""),
                    "is_active": True,
                },
            )

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {sport.name}"))
            else:
                updated_count += 1
                self.stdout.write(f"  Updated: {sport.name}")

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
                },
            )

            # Put config back for potential reuse
            sport_data["config"] = config_data

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Sport seed data loaded! ({created_count} created, {updated_count} updated)"
            )
        )

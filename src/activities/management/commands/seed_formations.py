"""Seed Formation stamdata for Football 11v11.

Creates/updates Formation records with position data matching the existing
frontend FORMATION_LAYOUTS and backend FORMATION_SPLITS constants.

Usage:
    python manage.py seed_formations
    python manage.py seed_formations --dry-run
"""

from django.core.management.base import BaseCommand

# Formation definitions with full position data.
# Each position has: slot, position code, x/y (field %), and line grouping.
FORMATION_DATA: dict[str, dict] = {
    "4-3-3": {
        "name": "4-3-3",
        "display_order": 1,
        "is_default": True,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "LB", "x": 15, "y": 72, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 35, "y": 75, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 65, "y": 75, "line": "defender"},
            {"slot": 5, "position": "RB", "x": 85, "y": 72, "line": "defender"},
            {"slot": 6, "position": "CM", "x": 30, "y": 50, "line": "midfielder"},
            {"slot": 7, "position": "CDM", "x": 50, "y": 55, "line": "midfielder"},
            {"slot": 8, "position": "CM", "x": 70, "y": 50, "line": "midfielder"},
            {"slot": 9, "position": "LW", "x": 20, "y": 22, "line": "attacker"},
            {"slot": 10, "position": "ST", "x": 50, "y": 18, "line": "attacker"},
            {"slot": 11, "position": "RW", "x": 80, "y": 22, "line": "attacker"},
        ],
    },
    "4-4-2": {
        "name": "4-4-2",
        "display_order": 2,
        "is_default": False,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "LB", "x": 15, "y": 72, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 35, "y": 75, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 65, "y": 75, "line": "defender"},
            {"slot": 5, "position": "RB", "x": 85, "y": 72, "line": "defender"},
            {"slot": 6, "position": "LM", "x": 15, "y": 48, "line": "midfielder"},
            {"slot": 7, "position": "CM", "x": 38, "y": 52, "line": "midfielder"},
            {"slot": 8, "position": "CM", "x": 62, "y": 52, "line": "midfielder"},
            {"slot": 9, "position": "RM", "x": 85, "y": 48, "line": "midfielder"},
            {"slot": 10, "position": "ST", "x": 35, "y": 22, "line": "attacker"},
            {"slot": 11, "position": "ST", "x": 65, "y": 22, "line": "attacker"},
        ],
    },
    "3-4-3": {
        "name": "3-4-3",
        "display_order": 3,
        "is_default": False,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "CB", "x": 25, "y": 75, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 50, "y": 78, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 75, "y": 75, "line": "defender"},
            {"slot": 5, "position": "LWB", "x": 15, "y": 50, "line": "midfielder"},
            {"slot": 6, "position": "CM", "x": 38, "y": 55, "line": "midfielder"},
            {"slot": 7, "position": "CM", "x": 62, "y": 55, "line": "midfielder"},
            {"slot": 8, "position": "RWB", "x": 85, "y": 50, "line": "midfielder"},
            {"slot": 9, "position": "LW", "x": 20, "y": 22, "line": "attacker"},
            {"slot": 10, "position": "ST", "x": 50, "y": 18, "line": "attacker"},
            {"slot": 11, "position": "RW", "x": 80, "y": 22, "line": "attacker"},
        ],
    },
}

SPORT_SLUG = "football-11v11"
SPORT_NAME = "Football 11v11"
CATEGORY_SLUG = "football"
CATEGORY_NAME = "Football"


class Command(BaseCommand):
    help = "Seed Formation stamdata for Football 11v11"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without writing to DB",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        from sport_configuration.models import Formation, Sport, SportConfiguration

        # Ensure sport category exists
        category, cat_created = Sport.objects.get_or_create(
            slug=CATEGORY_SLUG,
            defaults={"name": CATEGORY_NAME, "sport_icon": "\u26bd"},
        )
        if cat_created:
            self.stdout.write(f"  Created sport category: {category.name}")

        # Ensure sport variant exists
        sport, sport_created = Sport.objects.get_or_create(
            slug=SPORT_SLUG,
            defaults={
                "name": SPORT_NAME,
                "parent_sport": category,
                "sport_icon": "\u26bd",
            },
        )
        if sport_created:
            self.stdout.write(f"  Created sport variant: {sport.name}")

        # Ensure SportConfiguration exists
        sport_config, sc_created = SportConfiguration.objects.get_or_create(
            sport=sport,
            defaults={
                "team_size_min": 7,
                "team_size_max": 11,
                "max_substitutes": 7,
                "positions": ["GK", "LB", "CB", "RB", "CM", "CDM", "LM", "RM", "LW", "RW", "ST"],
                "has_goalkeeper": True,
                "match_duration_minutes": 90,
            },
        )
        if sc_created:
            self.stdout.write(f"  Created sport configuration: {sport_config}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] Would seed formations:"))
            for code, data in FORMATION_DATA.items():
                self.stdout.write(f"  {code}: {len(data['positions'])} positions, default={data['is_default']}")
            return

        # Seed formations (idempotent via update_or_create on sport_config+code)
        created_count = 0
        updated_count = 0

        for code, data in FORMATION_DATA.items():
            _obj, created = Formation.objects.update_or_create(
                sport_config=sport_config,
                code=code,
                defaults={
                    "name": data["name"],
                    "positions": data["positions"],
                    "display_order": data["display_order"],
                    "is_default": data["is_default"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created formation: {code}")
            else:
                updated_count += 1
                self.stdout.write(f"  Updated formation: {code}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created_count} created, {updated_count} updated"
            )
        )

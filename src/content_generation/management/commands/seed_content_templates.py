"""
Management command to seed GLOBAL content templates with formations.

Creates a complete set of templates for Football 11v11 including:
- Sport and SportConfiguration
- Formations (4-3-3, 4-4-2, 3-5-2, etc.)
- Content templates for lineup, match flyer, goal celebration, etc.
- Input requirements per template

Templates are GLOBAL (organisation=None, created_by=None) and can only be edited by superadmins.

Safe to run multiple times - uses update_or_create.
"""

import logging

from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)


# =============================================================================
# Formation Definitions
# =============================================================================

FOOTBALL_11V11_FORMATIONS = [
    {
        "code": "4-3-3",
        "name": "4-3-3",
        "is_default": True,
        "display_order": 1,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "LB", "x": 15, "y": 75},
            {"slot": 3, "position": "CB", "x": 35, "y": 80},
            {"slot": 4, "position": "CB", "x": 65, "y": 80},
            {"slot": 5, "position": "RB", "x": 85, "y": 75},
            {"slot": 6, "position": "CDM", "x": 50, "y": 60},
            {"slot": 7, "position": "CM", "x": 30, "y": 50},
            {"slot": 8, "position": "CM", "x": 70, "y": 50},
            {"slot": 9, "position": "LW", "x": 15, "y": 25},
            {"slot": 10, "position": "ST", "x": 50, "y": 20},
            {"slot": 11, "position": "RW", "x": 85, "y": 25},
        ],
    },
    {
        "code": "4-4-2",
        "name": "4-4-2",
        "is_default": False,
        "display_order": 2,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "LB", "x": 15, "y": 75},
            {"slot": 3, "position": "CB", "x": 35, "y": 80},
            {"slot": 4, "position": "CB", "x": 65, "y": 80},
            {"slot": 5, "position": "RB", "x": 85, "y": 75},
            {"slot": 6, "position": "LM", "x": 15, "y": 50},
            {"slot": 7, "position": "CM", "x": 35, "y": 55},
            {"slot": 8, "position": "CM", "x": 65, "y": 55},
            {"slot": 9, "position": "RM", "x": 85, "y": 50},
            {"slot": 10, "position": "ST", "x": 35, "y": 20},
            {"slot": 11, "position": "ST", "x": 65, "y": 20},
        ],
    },
    {
        "code": "3-5-2",
        "name": "3-5-2",
        "is_default": False,
        "display_order": 3,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "CB", "x": 25, "y": 80},
            {"slot": 3, "position": "CB", "x": 50, "y": 82},
            {"slot": 4, "position": "CB", "x": 75, "y": 80},
            {"slot": 5, "position": "LWB", "x": 10, "y": 55},
            {"slot": 6, "position": "CDM", "x": 35, "y": 60},
            {"slot": 7, "position": "CDM", "x": 65, "y": 60},
            {"slot": 8, "position": "RWB", "x": 90, "y": 55},
            {"slot": 9, "position": "CAM", "x": 50, "y": 40},
            {"slot": 10, "position": "ST", "x": 35, "y": 20},
            {"slot": 11, "position": "ST", "x": 65, "y": 20},
        ],
    },
    {
        "code": "4-2-3-1",
        "name": "4-2-3-1",
        "is_default": False,
        "display_order": 4,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "LB", "x": 15, "y": 75},
            {"slot": 3, "position": "CB", "x": 35, "y": 80},
            {"slot": 4, "position": "CB", "x": 65, "y": 80},
            {"slot": 5, "position": "RB", "x": 85, "y": 75},
            {"slot": 6, "position": "CDM", "x": 35, "y": 60},
            {"slot": 7, "position": "CDM", "x": 65, "y": 60},
            {"slot": 8, "position": "LW", "x": 20, "y": 40},
            {"slot": 9, "position": "CAM", "x": 50, "y": 35},
            {"slot": 10, "position": "RW", "x": 80, "y": 40},
            {"slot": 11, "position": "ST", "x": 50, "y": 18},
        ],
    },
]

FOOTBALL_7V7_FORMATIONS = [
    {
        "code": "2-3-1",
        "name": "2-3-1",
        "is_default": True,
        "display_order": 1,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "CB", "x": 30, "y": 75},
            {"slot": 3, "position": "CB", "x": 70, "y": 75},
            {"slot": 4, "position": "LM", "x": 20, "y": 50},
            {"slot": 5, "position": "CM", "x": 50, "y": 50},
            {"slot": 6, "position": "RM", "x": 80, "y": 50},
            {"slot": 7, "position": "ST", "x": 50, "y": 20},
        ],
    },
    {
        "code": "3-2-1",
        "name": "3-2-1",
        "is_default": False,
        "display_order": 2,
        "positions": [
            {"slot": 1, "position": "GK", "x": 50, "y": 95},
            {"slot": 2, "position": "CB", "x": 25, "y": 75},
            {"slot": 3, "position": "CB", "x": 50, "y": 78},
            {"slot": 4, "position": "CB", "x": 75, "y": 75},
            {"slot": 5, "position": "CM", "x": 35, "y": 50},
            {"slot": 6, "position": "CM", "x": 65, "y": 50},
            {"slot": 7, "position": "ST", "x": 50, "y": 20},
        ],
    },
]


# =============================================================================
# Input Requirements Helpers
# =============================================================================


def get_lineup_requirements(player_count: int, use_formation: bool = True) -> dict:
    """Get standard lineup VIDEO template requirements.

    Requires in_tenue, closeup, and short_intro for each member.
    1 goalkeeper + (player_count - 1) players.
    """
    return {
        "members": {
            "goalkeeper": {
                "count": 1,
                "asset_types": ["in_tenue", "closeup", "short_intro"],
            },
            "player": {
                "count": player_count - 1,  # -1 for goalkeeper
                "asset_types": ["in_tenue", "closeup", "short_intro"],
            },
        },
        "use_formation": use_formation,
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "background", "required": False},
        ],
        "match_data": {
            "required": ["opponent", "date", "venue"],
            "optional": ["kickoff_time", "competition"],
        },
    }


def get_lineup_flyer_requirements(player_count: int) -> dict:
    """Get lineup FLYER (static PNG) template requirements.

    Only requires in_tenue and closeup — no intro video needed for flyers.
    1 goalkeeper + (player_count - 1) players.
    """
    return {
        "members": {
            "goalkeeper": {
                "count": 1,
                "asset_types": ["in_tenue", "closeup"],
            },
            "player": {
                "count": player_count - 1,  # -1 for goalkeeper
                "asset_types": ["in_tenue", "closeup"],
            },
        },
        "use_formation": True,
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "background", "required": False},
        ],
        "match_data": {
            "required": ["opponent", "date", "venue"],
            "optional": ["kickoff_time", "competition"],
        },
    }


def get_match_flyer_requirements() -> dict:
    """Get match flyer template requirements."""
    return {
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "opponent_logo", "required": True},
            {"type": "background", "required": False},
            {"type": "sponsor_logo", "required": False},
        ],
        "match_data": {
            "required": ["opponent", "date", "venue", "kickoff_time"],
            "optional": ["competition", "ticket_info"],
        },
    }


def get_goal_celebration_requirements() -> dict:
    """Get goal celebration template requirements."""
    return {
        "players": {
            "use_formation": False,
            "min_count": 1,
            "max_count": 3,
        },
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "player_photos", "required": True},
        ],
        "match_data": {
            "required": ["opponent", "score", "minute"],
            "optional": ["assist", "competition"],
        },
    }


def get_score_update_requirements() -> dict:
    """Get score update template requirements."""
    return {
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "opponent_logo", "required": True},
        ],
        "match_data": {
            "required": ["score", "minute"],
            "optional": ["scorer", "competition"],
        },
    }


def get_match_summary_requirements() -> dict:
    """Get match summary template requirements."""
    return {
        "players": {
            "use_formation": False,
            "min_count": 0,
            "max_count": 11,
        },
        "staff": [
            {"role": "coach", "required": False, "count": 1},
        ],
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "opponent_logo", "required": True},
            {"type": "match_photos", "required": False},
        ],
        "match_data": {
            "required": ["score", "opponent", "date"],
            "optional": ["scorers", "assists", "highlights", "stats"],
        },
    }


# Lineup templates per formation (created separately with formation FK)
LINEUP_TEMPLATE_STYLES = [
    {
        "style_variant": "Modern",
        "ai_workflow_id": "lineup_modern_v1",
        "description": "Clean, minimalist lineup graphic with player photos",
    },
    {
        "style_variant": "Classic",
        "ai_workflow_id": "lineup_classic_v1",
        "description": "Traditional formation view with jersey numbers",
    },
    {
        "style_variant": "Neon",
        "ai_workflow_id": "lineup_neon_v1",
        "description": "Vibrant neon-style lineup with glow effects",
    },
]


class Command(BaseCommand):
    """Seed GLOBAL content templates with formations for demo/development."""

    help = "Create global content templates with formations (organisation=None, superadmin-only)"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--category",
            type=str,
            choices=["pre_match", "during_match", "post_match", "season", "member", "all"],
            default="all",
            help="Which category to seed (default: all)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Delete all existing global templates before seeding (WARNING: destructive)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the seed command with lazy imports."""
        # Lazy imports - must use src. prefix for content_generation
        from sport_configuration.models import Formation, Sport, SportConfiguration

        from src.content_generation.models import ContentTemplate, TemplateSubtype, TemplateType

        category = options.get("category", "all")
        dry_run = options.get("dry_run", False)
        cleanup = options.get("cleanup", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made"))

        # Cleanup: Delete all global templates first
        if cleanup:
            global_count = ContentTemplate.objects.filter(organisation=None).count()
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n[CLEANUP DRY] Would delete {global_count} existing global templates"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"\n[CLEANUP] Deleting {global_count} existing global templates..."
                    )
                )
                ContentTemplate.objects.filter(organisation=None).delete()
                self.stdout.write(self.style.SUCCESS("  Done - Deleted all global templates"))

        self.stdout.write("[GLOBAL] Seeding GLOBAL templates (organisation=None)")
        self.stdout.write("   These can only be edited by superadmins.\n")

        # Step 1: Create Sports
        self.stdout.write("[1/5] Creating sports...")
        football_cat, _ = Sport.objects.update_or_create(
            slug="football",
            defaults={
                "name": "Football",
                "sport_icon": "⚽",
                "is_active": True,
            },
        )
        self.stdout.write(f"  + Sport category: {football_cat.name}")

        football_11v11, _ = Sport.objects.update_or_create(
            slug="football-11v11",
            defaults={
                "name": "Football 11v11",
                "parent_sport": football_cat,
                "sport_icon": "⚽",
                "is_active": True,
            },
        )

        football_7v7, _ = Sport.objects.update_or_create(
            slug="football-7v7",
            defaults={
                "name": "Football 7v7",
                "parent_sport": football_cat,
                "sport_icon": "⚽",
                "is_active": True,
            },
        )

        futsal_5v5, _ = Sport.objects.update_or_create(
            slug="futsal-5v5",
            defaults={
                "name": "Futsal 5v5",
                "parent_sport": football_cat,
                "sport_icon": "⚽",
                "is_active": True,
            },
        )
        self.stdout.write(
            f"  + Sport variants: {football_11v11.name}, {football_7v7.name}, {futsal_5v5.name}"
        )

        # Step 2: Create SportConfigurations
        self.stdout.write("\n[2/5] Creating sport configurations...")
        config_11v11, _ = SportConfiguration.objects.update_or_create(
            sport=football_11v11,
            defaults={
                "team_size_min": 11,
                "team_size_max": 11,
                "max_substitutes": 7,
                "has_goalkeeper": True,
                "positions": [
                    "GK",
                    "LB",
                    "CB",
                    "RB",
                    "LM",
                    "CM",
                    "RM",
                    "LW",
                    "RW",
                    "ST",
                    "CAM",
                    "CDM",
                    "LWB",
                    "RWB",
                ],
            },
        )

        config_7v7, _ = SportConfiguration.objects.update_or_create(
            sport=football_7v7,
            defaults={
                "team_size_min": 7,
                "team_size_max": 7,
                "max_substitutes": 5,
                "has_goalkeeper": True,
                "positions": ["GK", "CB", "LM", "CM", "RM", "ST"],
            },
        )
        self.stdout.write("  + Configurations created for 11v11 and 7v7")

        # Step 3: Create Formations
        self.stdout.write("\n[3/5] Creating formations...")
        formations_11v11 = []
        for f_data in FOOTBALL_11V11_FORMATIONS:
            formation, _ = Formation.objects.update_or_create(
                sport_config=config_11v11,
                code=f_data["code"],
                defaults={
                    "name": f_data["name"],
                    "positions": f_data["positions"],
                    "is_default": f_data["is_default"],
                    "display_order": f_data["display_order"],
                    "is_active": True,
                },
            )
            formations_11v11.append(formation)
            self.stdout.write(f"  + 11v11: {formation.code}")

        formations_7v7 = []
        for f_data in FOOTBALL_7V7_FORMATIONS:
            formation, _ = Formation.objects.update_or_create(
                sport_config=config_7v7,
                code=f_data["code"],
                defaults={
                    "name": f_data["name"],
                    "positions": f_data["positions"],
                    "is_default": f_data["is_default"],
                    "display_order": f_data["display_order"],
                    "is_active": True,
                },
            )
            formations_7v7.append(formation)
            self.stdout.write(f"  + 7v7: {formation.code}")

        # Step 4: Create templates by category
        template_count = 0

        # Build template definitions based on category filter
        template_definitions = []

        # Sport variants for all templates
        sport_variants = [
            ("11v11", "Football 11v11"),
            ("7v7", "Football 7v7"),
            ("futsal", "Futsal 5v5"),
        ]

        if category in ["all", "pre_match"]:
            # Pre-match Flyer templates (all sport variants)
            flyer_styles = [("Modern", "modern"), ("Classic", "classic")]
            for sport_key, sport_label in sport_variants:
                for style_name, style_id in flyer_styles:
                    template_definitions.append(
                        {
                            "name": f"Match Flyer - {style_name} ({sport_label})",
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.FLYER,
                            "style_variant": style_name,
                            "ai_workflow_id": f"wf_flyer_{style_id}_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": {
                                "match_data": {
                                    "required": ["opponent", "date", "venue", "kickoff_time"],
                                    "optional": ["competition", "ticket_info"],
                                },
                                "club_data": {
                                    "required": ["name", "logo"],
                                    "optional": ["colors", "stadium"],
                                },
                                "assets": [
                                    {"type": "team_logo", "required": True},
                                    {"type": "opponent_logo", "required": True},
                                    {"type": "background", "required": False},
                                ],
                            },
                            "description": f"{style_name} style match announcement flyer for {sport_label}",
                        }
                    )

            # Lineup Flyer templates (static PNG) - all sport variants
            lineup_flyer_styles = [("Modern", "modern"), ("Classic", "classic")]
            for sport_key, sport_label in sport_variants:
                if sport_key == "11v11":
                    player_count = 11
                elif sport_key == "7v7":
                    player_count = 7
                else:  # futsal
                    player_count = 5

                for style_name, style_id in lineup_flyer_styles:
                    template_definitions.append(
                        {
                            "name": f"Lineup Flyer - {style_name} ({sport_label})",
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.LINEUP_FLYER,
                            "style_variant": style_name,
                            "ai_workflow_id": f"wf_lineup_flyer_{style_id}_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": get_lineup_flyer_requirements(player_count),
                            "description": f"{style_name} static lineup flyer for {sport_label}",
                        }
                    )

            # Walk-on templates: in_tenue required (all sport variants)
            walkon_styles = [("Dramatic", "dramatic"), ("Epic", "epic")]
            for sport_key, sport_label in sport_variants:
                # Determine player count based on sport
                if sport_key == "11v11":
                    gk_count, player_count = 1, 10
                elif sport_key == "7v7":
                    gk_count, player_count = 1, 6
                else:  # futsal
                    gk_count, player_count = 1, 4

                for style_name, style_id in walkon_styles:
                    template_definitions.append(
                        {
                            "name": f"Walk-on Video - {style_name} ({sport_label})",
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.WALKON,
                            "style_variant": style_name,
                            "ai_workflow_id": f"wf_walkon_{style_id}_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": {
                                "members": {
                                    "goalkeeper": {"count": gk_count, "asset_types": ["in_tenue"]},
                                    "player": {"count": player_count, "asset_types": ["in_tenue"]},
                                },
                                "assets": [
                                    {"type": "team_logo", "required": True},
                                ],
                            },
                            "description": f"{style_name} player walk-on introduction video for {sport_label}",
                        }
                    )

            # Anthem templates: in_tenue required (all sport variants)
            anthem_styles = [("Stadium", "stadium"), ("Cinematic", "cinematic")]
            for sport_key, sport_label in sport_variants:
                # Determine player count based on sport
                if sport_key == "11v11":
                    gk_count, player_count = 1, 10
                elif sport_key == "7v7":
                    gk_count, player_count = 1, 6
                else:  # futsal
                    gk_count, player_count = 1, 4

                for style_name, style_id in anthem_styles:
                    template_definitions.append(
                        {
                            "name": f"Anthem Video - {style_name} ({sport_label})",
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.ANTHEM,
                            "style_variant": style_name,
                            "ai_workflow_id": f"wf_anthem_{style_id}_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": {
                                "members": {
                                    "goalkeeper": {"count": gk_count, "asset_types": ["in_tenue"]},
                                    "player": {"count": player_count, "asset_types": ["in_tenue"]},
                                },
                                "assets": [
                                    {"type": "team_logo", "required": True},
                                    {"type": "anthem_audio", "required": True},
                                    {"type": "stadium_footage", "required": False},
                                ],
                            },
                            "description": f"{style_name} anthem video with team lineup for {sport_label}",
                        }
                    )

            # NOTE: Lineup templates are created separately per formation (see below)

        if category in ["all", "during_match"]:
            # During-match Goal Celebration templates
            # 1 member required, variants for keeper/coach/player/assistant
            # Same styles as member celebrations (Fist Pump, Slide, Arms Wide, Point to Sky)
            # Created for each sport variant (11v11, 7v7, Futsal)
            roles = ["goalkeeper", "player", "coach", "assistant"]
            celebration_styles = [
                ("Fist Pump", "fist_pump", "Celebrating with fist pump"),
                ("Slide", "slide", "Knee slide celebration"),
                ("Arms Wide", "arms_wide", "Arms spread wide celebration"),
                ("Point to Sky", "point_sky", "Pointing to the sky"),
            ]

            for sport_key, sport_label in sport_variants:
                for role in roles:
                    role_label = role.capitalize()
                    role_key = role

                    for style_name, style_id, style_desc in celebration_styles:
                        template_definitions.append(
                            {
                                "name": f"Goal Celebration {role_label} - {style_name} ({sport_label})",
                                "template_type": TemplateType.DURING_MATCH,
                                "template_subtype": TemplateSubtype.GOAL,
                                "style_variant": style_name,
                                "ai_workflow_id": f"wf_goal_celebration_{role}_{style_id}_{sport_key}",
                                "sport_variant": sport_key,
                                "input_requirements": {
                                    "members": {
                                        role_key: {"count": 1, "asset_types": ["in_tenue"]},
                                    },
                                    "match_data": {
                                        "required": ["opponent", "score", "minute"],
                                        "optional": ["assist", "competition"],
                                    },
                                },
                                "description": f"Goal celebration for {role}: {style_desc}",
                            }
                        )

            # Score Update - for each sport variant
            for sport_key, sport_label in sport_variants:
                template_definitions.append(
                    {
                        "name": f"Score Update - Live ({sport_label})",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.SCORE_UPDATE,
                        "style_variant": "Live",
                        "ai_workflow_id": f"wf_score_live_{sport_key}",
                        "sport_variant": sport_key,
                        "input_requirements": get_score_update_requirements(),
                        "description": "Real-time score update graphic",
                    }
                )

            # Final Score - for each sport variant
            for sport_key, sport_label in sport_variants:
                template_definitions.append(
                    {
                        "name": f"Final Score - Victory ({sport_label})",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.END_SCORE,
                        "style_variant": "Victory",
                        "ai_workflow_id": f"wf_endscore_victory_{sport_key}",
                        "sport_variant": sport_key,
                        "input_requirements": get_score_update_requirements(),
                        "description": "Final whistle score announcement with celebration theme",
                    }
                )

        if category in ["all", "post_match"]:
            # Post-match templates for each sport variant
            for sport_key, sport_label in sport_variants:
                template_definitions.extend(
                    [
                        {
                            "name": f"Match Summary - Editorial ({sport_label})",
                            "template_type": TemplateType.POST_MATCH,
                            "template_subtype": TemplateSubtype.MATCH_SUMMARY,
                            "style_variant": "Editorial",
                            "ai_workflow_id": f"summary_editorial_v1_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": get_match_summary_requirements(),
                            "description": f"Magazine-style match recap with key moments for {sport_label}",
                        },
                        {
                            "name": f"Highlights Reel - Dynamic ({sport_label})",
                            "template_type": TemplateType.POST_MATCH,
                            "template_subtype": TemplateSubtype.HIGHLIGHTS,
                            "style_variant": "Dynamic",
                            "ai_workflow_id": f"highlights_dynamic_v1_{sport_key}",
                            "sport_variant": sport_key,
                            "input_requirements": {
                                "assets": [
                                    {"type": "match_footage", "required": True},
                                    {"type": "team_logo", "required": True},
                                ],
                                "match_data": {
                                    "required": ["opponent", "score"],
                                    "optional": ["key_moments", "duration"],
                                },
                            },
                            "description": f"Fast-paced highlight compilation with transitions for {sport_label}",
                        },
                    ]
                )

        if category in ["all", "season"]:
            template_definitions.extend(
                [
                    {
                        "name": "Then vs Now - Transformation",
                        "template_type": TemplateType.SEASON,
                        "template_subtype": TemplateSubtype.TRANSFORMATION,
                        "style_variant": "Split",
                        "ai_workflow_id": "transformation_split_v1",
                        "input_requirements": {
                            "players": {
                                "use_formation": False,
                                "min_count": 1,
                                "max_count": 1,
                            },
                            "assets": [
                                {"type": "player_photo_old", "required": True},
                                {"type": "player_photo_new", "required": True},
                            ],
                        },
                        "description": "Side-by-side comparison of player progression",
                    },
                    {
                        "name": "Season Recap - Montage",
                        "template_type": TemplateType.SEASON,
                        "template_subtype": TemplateSubtype.SEASON_RECAP,
                        "style_variant": "Montage",
                        "ai_workflow_id": "recap_montage_v1",
                        "input_requirements": {
                            "assets": [
                                {"type": "season_highlights", "required": True},
                                {"type": "team_logo", "required": True},
                                {"type": "stats_data", "required": False},
                            ],
                            "match_data": {
                                "required": ["season"],
                                "optional": ["achievements", "top_scorer", "record"],
                            },
                        },
                        "description": "End of season highlight montage with stats overlay",
                    },
                ]
            )

        if category in ["all", "member"]:
            # Member templates for each role: goalkeeper, player, coach, assistant
            # Each subtype × each role × style variants × sport variants = templates
            roles = ["goalkeeper", "player", "coach", "assistant"]

            # Style variants for Short Intro
            intro_styles = [
                ("Arms Crossed", "arms_crossed", "Standing with arms crossed"),
                ("Thumbs Up", "thumbs_up", "Giving thumbs up gesture"),
                ("Hand Up", "hand_up", "Waving with hand up"),
            ]

            # Style variants for Goal Celebration
            celebration_styles = [
                ("Fist Pump", "fist_pump", "Celebrating with fist pump"),
                ("Slide", "slide", "Knee slide celebration"),
                ("Arms Wide", "arms_wide", "Arms spread wide celebration"),
                ("Point to Sky", "point_sky", "Pointing to the sky"),
            ]

            for sport_key, sport_label in sport_variants:
                for role in roles:
                    role_label = role.capitalize()
                    role_key = role

                    # Short Intro - multiple style variants
                    for style_name, style_id, style_desc in intro_styles:
                        template_definitions.append(
                            {
                                "name": f"{role_label} Short Intro - {style_name} ({sport_label})",
                                "template_type": TemplateType.MEMBER,
                                "template_subtype": TemplateSubtype.MEMBER_INTRO,
                                "style_variant": style_name,
                                "ai_workflow_id": f"wf_member_intro_{role}_{style_id}_{sport_key}",
                                "sport_variant": sport_key,
                                "credits_required": 1,
                                "input_requirements": {
                                    "members": {
                                        role_key: {"count": 1, "asset_types": ["in_tenue"]},
                                    },
                                },
                                "description": f"Short intro for {role}: {style_desc}",
                            }
                        )

                    # Goal Celebration - multiple style variants
                    for style_name, style_id, style_desc in celebration_styles:
                        template_definitions.append(
                            {
                                "name": f"{role_label} Goal Celebration - {style_name} ({sport_label})",
                                "template_type": TemplateType.MEMBER,
                                "template_subtype": TemplateSubtype.MEMBER_GOAL_CELEBRATION,
                                "style_variant": style_name,
                                "ai_workflow_id": f"wf_member_goal_celebration_{role}_{style_id}_{sport_key}",
                                "sport_variant": sport_key,
                                "credits_required": 1,
                                "input_requirements": {
                                    "members": {
                                        role_key: {"count": 1, "asset_types": ["in_tenue"]},
                                    },
                                },
                                "description": f"Goal celebration for {role}: {style_desc}",
                            }
                        )

                    # Profile Photo - clean professional headshot
                    template_definitions.append(
                        {
                            "name": f"{role_label} Profile Photo - Professional ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.PROFILE_PHOTO,
                            "style_variant": "Professional",
                            "ai_workflow_id": f"wf_member_profile_photo_{role}_professional_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["raw_photo"]},
                                },
                            },
                            "description": f"Professional profile photo for {role}",
                        }
                    )

                    # Legacy Photo - vintage style portrait
                    template_definitions.append(
                        {
                            "name": f"{role_label} Legacy Photo - Vintage ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.LEGACY_PHOTO,
                            "style_variant": "Vintage",
                            "ai_workflow_id": f"wf_member_legacy_photo_{role}_vintage_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                },
                            },
                            "description": f"Vintage-style legacy photo for {role}",
                        }
                    )

                    # Close-up - dramatic portrait
                    template_definitions.append(
                        {
                            "name": f"{role_label} Close-up - Dramatic ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.CLOSEUP,
                            "style_variant": "Dramatic",
                            "ai_workflow_id": f"wf_member_closeup_{role}_dramatic_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                },
                            },
                            "description": f"Dramatic close-up portrait for {role}",
                        }
                    )

                    # In Tenue - requires profile_photo and tenue (season asset)
                    template_definitions.append(
                        {
                            "name": f"{role_label} In Tenue - Modern ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.MEMBER_IN_TENUE,
                            "style_variant": "Modern",
                            "ai_workflow_id": f"wf_member_in_tenue_{role}_modern_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                },
                                "season_assets": {
                                    "required": [{"type": "tenue", "label": "Team Tenue"}],
                                },
                            },
                            "description": f"Generate {role} in-tenue photo from profile photo",
                        }
                    )

                    # Legacy Closeup
                    template_definitions.append(
                        {
                            "name": f"{role_label} Legacy Closeup - Modern ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.MEMBER_LEGACY_CLOSEUP,
                            "style_variant": "Modern",
                            "ai_workflow_id": f"wf_member_legacy_closeup_{role}_modern_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                },
                            },
                            "description": f"Legacy-style closeup portrait for {role}",
                        }
                    )

                    # Legacy In Tenue
                    template_definitions.append(
                        {
                            "name": f"{role_label} Legacy In Tenue - Modern ({sport_label})",
                            "template_type": TemplateType.MEMBER,
                            "template_subtype": TemplateSubtype.MEMBER_LEGACY_IN_TENUE,
                            "style_variant": "Modern",
                            "ai_workflow_id": f"wf_member_legacy_in_tenue_{role}_modern_{sport_key}",
                            "sport_variant": sport_key,
                            "credits_required": 1,
                            "input_requirements": {
                                "members": {
                                    role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                },
                                "season_assets": {
                                    "required": [{"type": "tenue", "label": "Team Tenue"}],
                                },
                            },
                            "description": f"Legacy-style {role} in team tenue",
                        }
                    )

                    # Action Photo - 6 style variants
                    action_photo_styles = [
                        ("dribbling", "Dribbelen"),
                        ("shooting", "Schieten"),
                        ("ball_at_feet", "Bal aan de voet"),
                        ("celebrating", "Vieren"),
                        ("heading", "Koppen"),
                        ("sliding_tackle", "Sliding"),
                        ("karate_kick", "Karatetrap"),
                    ]
                    for style_key, style_label in action_photo_styles:
                        template_definitions.append(
                            {
                                "name": f"{role_label} Actiefoto - {style_label} ({sport_label})",
                                "template_type": TemplateType.MEMBER,
                                "template_subtype": TemplateSubtype.MEMBER_ACTION_PHOTO,
                                "style_variant": style_key,
                                "ai_workflow_id": f"wf_member_action_photo_{role}_{style_key}_{sport_key}",
                                "sport_variant": sport_key,
                                "credits_required": 2,
                                "input_requirements": {
                                    "members": {
                                        role_key: {"count": 1, "asset_types": ["profile_photo"]},
                                    },
                                    "season_assets": {
                                        "required": [{"type": "tenue", "label": "Team Tenue"}],
                                    },
                                },
                                "description": f"Dynamic {style_label.lower()} action photo for {role}",
                            }
                        )

        # Create the templates
        if template_definitions:
            self.stdout.write(f"\n[4/5] Creating {category} templates...")
            for t_data in template_definitions:
                if dry_run:
                    self.stdout.write(f"  [DRY] Would create: {t_data['name']}")
                    template_count += 1
                    continue

                # Determine sport based on sport_variant flag
                sport_variant = t_data.get("sport_variant")
                if sport_variant == "11v11":
                    template_sport = football_11v11
                elif sport_variant == "7v7":
                    template_sport = football_7v7
                elif sport_variant == "futsal":
                    template_sport = futsal_5v5
                else:
                    # Default to Football 11v11 (most common variant)
                    template_sport = football_11v11

                template, created = ContentTemplate.objects.update_or_create(
                    # Global templates: organisation=None
                    organisation=None,
                    name=t_data["name"],
                    defaults={
                        "description": t_data.get("description", ""),
                        "template_type": t_data["template_type"],
                        "template_subtype": t_data.get("template_subtype"),
                        "style_variant": t_data.get("style_variant"),
                        "ai_workflow_id": t_data["ai_workflow_id"],
                        "input_requirements": t_data.get("input_requirements", {}),
                        "credits_required": t_data.get("credits_required", 1),
                        "sport": template_sport,
                        "is_active": True,
                        "created_by": None,  # Global template
                    },
                )
                template_count += 1
                status = "created" if created else "updated"
                self.stdout.write(f"  + {template.name} ({status})")

        # Step 5: Create lineup templates per formation (only if category matches)
        if category in ["all", "pre_match"]:
            self.stdout.write("\n[5/5] Creating lineup templates per formation...")

            # 11v11 lineup templates
            for formation in formations_11v11:
                for style in LINEUP_TEMPLATE_STYLES:
                    name = f"Lineup {formation.code} - {style['style_variant']}"

                    if dry_run:
                        self.stdout.write(f"  [DRY] Would create: {name}")
                        template_count += 1
                        continue

                    template, created = ContentTemplate.objects.update_or_create(
                        organisation=None,  # Global
                        name=name,
                        defaults={
                            "description": style["description"],
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.LINEUP,
                            "style_variant": style["style_variant"],
                            "ai_workflow_id": f"{style['ai_workflow_id']}_{formation.code.replace('-', '')}",
                            "input_requirements": get_lineup_requirements(11, use_formation=True),
                            "sport": football_11v11,
                            "formation": formation,
                            "is_active": True,
                            "created_by": None,  # Global
                        },
                    )
                    template_count += 1
                    status = "created" if created else "updated"
                    self.stdout.write(f"  + {name} ({status})")

            # 7v7 lineup templates
            for formation in formations_7v7:
                for style in LINEUP_TEMPLATE_STYLES[:2]:  # Only Modern and Classic for 7v7
                    name = f"Lineup {formation.code} - {style['style_variant']} (7v7)"

                    if dry_run:
                        self.stdout.write(f"  [DRY] Would create: {name}")
                        template_count += 1
                        continue

                    template, created = ContentTemplate.objects.update_or_create(
                        organisation=None,  # Global
                        name=name,
                        defaults={
                            "description": style["description"],
                            "template_type": TemplateType.PRE_MATCH,
                            "template_subtype": TemplateSubtype.LINEUP,
                            "style_variant": style["style_variant"],
                            "ai_workflow_id": f"{style['ai_workflow_id']}_{formation.code.replace('-', '')}_7v7",
                            "input_requirements": get_lineup_requirements(7, use_formation=True),
                            "sport": football_7v7,
                            "formation": formation,
                            "is_active": True,
                            "created_by": None,  # Global
                        },
                    )
                    template_count += 1
                    status = "created" if created else "updated"
                    self.stdout.write(f"  + {name} ({status})")

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n[DONE] Seed complete! {'Would create' if dry_run else 'Created/updated'} {template_count} templates"
            )
        )
        self.stdout.write(f"   - {len(formations_11v11)} formations for 11v11")
        self.stdout.write(f"   - {len(formations_7v7)} formations for 7v7")

        if category in ["all", "pre_match"]:
            self.stdout.write(
                f"   - {len(LINEUP_TEMPLATE_STYLES) * len(formations_11v11)} lineup templates for 11v11"
            )
            self.stdout.write(f"   - {2 * len(formations_7v7)} lineup templates for 7v7")

        self.stdout.write("\n[INFO] All templates are GLOBAL (organisation=None)")
        self.stdout.write("   Only superadmins can edit these templates.")

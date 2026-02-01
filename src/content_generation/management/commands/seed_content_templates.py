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
    """Get standard lineup template requirements."""
    return {
        "players": {
            "use_formation": use_formation,
            "min_count": player_count,
            "max_count": player_count,
        },
        "staff": [
            {"role": "coach", "required": True, "count": 1},
            {"role": "assistant", "required": False, "count": 1},
        ],
        "assets": [
            {"type": "team_logo", "required": True},
            {"type": "player_photos", "required": True},
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

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the seed command with lazy imports."""
        # Lazy imports - must use src. prefix for content_generation
        from src.content_generation.models import ContentTemplate, TemplateType, TemplateSubtype
        from sport_configuration.models import Sport, SportConfiguration, Formation

        category = options.get("category", "all")
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made"))

        self.stdout.write("🌍 Seeding GLOBAL templates (organisation=None)")
        self.stdout.write("   These can only be edited by superadmins.\n")

        # Step 1: Create Sports
        self.stdout.write("📌 Creating sports...")
        football_cat, _ = Sport.objects.update_or_create(
            slug="football",
            defaults={
                "name": "Football",
                "sport_icon": "⚽",
                "is_active": True,
            },
        )
        self.stdout.write(f"  ✓ Sport category: {football_cat.name}")

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
        self.stdout.write(f"  ✓ Sport variants: {football_11v11.name}, {football_7v7.name}")

        # Step 2: Create SportConfigurations
        self.stdout.write("\n⚙️  Creating sport configurations...")
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
        self.stdout.write("  ✓ Configurations created for 11v11 and 7v7")

        # Step 3: Create Formations
        self.stdout.write("\n🔢 Creating formations...")
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
            self.stdout.write(f"  ✓ 11v11: {formation.code}")

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
            self.stdout.write(f"  ✓ 7v7: {formation.code}")

        # Step 4: Create templates by category
        template_count = 0

        # Build template definitions based on category filter
        template_definitions = []

        if category in ["all", "pre_match"]:
            template_definitions.extend(
                [
                    {
                        "name": "Match Flyer - Modern",
                        "template_type": TemplateType.PRE_MATCH,
                        "template_subtype": TemplateSubtype.FLYER,
                        "style_variant": "Modern",
                        "ai_workflow_id": "flyer_modern_v1",
                        "input_requirements": get_match_flyer_requirements(),
                        "description": "Clean, modern match announcement with bold typography",
                    },
                    {
                        "name": "Match Flyer - Classic",
                        "template_type": TemplateType.PRE_MATCH,
                        "template_subtype": TemplateSubtype.FLYER,
                        "style_variant": "Classic",
                        "ai_workflow_id": "flyer_classic_v1",
                        "input_requirements": get_match_flyer_requirements(),
                        "description": "Traditional match poster style with club heritage feel",
                    },
                    {
                        "name": "Match Flyer - Neon",
                        "template_type": TemplateType.PRE_MATCH,
                        "template_subtype": TemplateSubtype.FLYER,
                        "style_variant": "Neon",
                        "ai_workflow_id": "flyer_neon_v1",
                        "input_requirements": get_match_flyer_requirements(),
                        "description": "Vibrant neon-style match flyer with glow effects",
                    },
                    {
                        "name": "Walk-on Video - Dramatic",
                        "template_type": TemplateType.PRE_MATCH,
                        "template_subtype": TemplateSubtype.WALKON,
                        "style_variant": "Dramatic",
                        "ai_workflow_id": "walkon_dramatic_v1",
                        "input_requirements": get_lineup_requirements(11),
                        "description": "Cinematic player introduction with dramatic lighting",
                    },
                    {
                        "name": "Anthem Video - Stadium",
                        "template_type": TemplateType.PRE_MATCH,
                        "template_subtype": TemplateSubtype.ANTHEM,
                        "style_variant": "Stadium",
                        "ai_workflow_id": "anthem_stadium_v1",
                        "input_requirements": {
                            "assets": [
                                {"type": "team_logo", "required": True},
                                {"type": "anthem_audio", "required": True},
                                {"type": "stadium_footage", "required": False},
                            ],
                        },
                        "description": "Anthem video with stadium atmosphere and crowd sounds",
                    },
                ]
            )

        if category in ["all", "during_match"]:
            template_definitions.extend(
                [
                    {
                        "name": "Goal Celebration - Explosive",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.GOAL,
                        "style_variant": "Explosive",
                        "ai_workflow_id": "goal_explosive_v1",
                        "input_requirements": get_goal_celebration_requirements(),
                        "description": "High-energy goal celebration with particle effects",
                    },
                    {
                        "name": "Goal Celebration - Clean",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.GOAL,
                        "style_variant": "Clean",
                        "ai_workflow_id": "goal_clean_v1",
                        "input_requirements": get_goal_celebration_requirements(),
                        "description": "Minimal, elegant goal graphic with player focus",
                    },
                    {
                        "name": "Score Update - Live",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.SCORE_UPDATE,
                        "style_variant": "Live",
                        "ai_workflow_id": "score_live_v1",
                        "input_requirements": get_score_update_requirements(),
                        "description": "Real-time score update graphic",
                    },
                    {
                        "name": "Final Score - Victory",
                        "template_type": TemplateType.DURING_MATCH,
                        "template_subtype": TemplateSubtype.END_SCORE,
                        "style_variant": "Victory",
                        "ai_workflow_id": "endscore_victory_v1",
                        "input_requirements": get_score_update_requirements(),
                        "description": "Final whistle score announcement with celebration theme",
                    },
                ]
            )

        if category in ["all", "post_match"]:
            template_definitions.extend(
                [
                    {
                        "name": "Match Summary - Editorial",
                        "template_type": TemplateType.POST_MATCH,
                        "template_subtype": TemplateSubtype.MATCH_SUMMARY,
                        "style_variant": "Editorial",
                        "ai_workflow_id": "summary_editorial_v1",
                        "input_requirements": get_match_summary_requirements(),
                        "description": "Magazine-style match recap with key moments",
                    },
                    {
                        "name": "Highlights Reel - Dynamic",
                        "template_type": TemplateType.POST_MATCH,
                        "template_subtype": TemplateSubtype.HIGHLIGHTS,
                        "style_variant": "Dynamic",
                        "ai_workflow_id": "highlights_dynamic_v1",
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
                        "description": "Fast-paced highlight compilation with transitions",
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
            # Each subtype × each role = template
            roles = ["goalkeeper", "player", "coach", "assistant"]

            for role in roles:
                role_label = role.capitalize()
                role_key = role

                # Short Intro - requires in_tenue asset
                template_definitions.append(
                    {
                        "name": f"{role_label} Short Intro - Modern",
                        "template_type": TemplateType.MEMBER,
                        "template_subtype": TemplateSubtype.MEMBER_INTRO,
                        "style_variant": "Modern",
                        "ai_workflow_id": f"wf_member_intro_{role}_modern",
                        "credits_required": 1,
                        "input_requirements": {
                            "members": {
                                role_key: {"count": 1, "asset_types": ["in_tenue"]},
                            },
                        },
                        "description": f"Short intro video for {role} with in-tenue photo",
                    }
                )

                # Goal Celebration - requires in_tenue asset
                template_definitions.append(
                    {
                        "name": f"{role_label} Goal Celebration - Modern",
                        "template_type": TemplateType.MEMBER,
                        "template_subtype": TemplateSubtype.MEMBER_GOAL_CELEBRATION,
                        "style_variant": "Modern",
                        "ai_workflow_id": f"wf_member_goal_celebration_{role}_modern",
                        "credits_required": 1,
                        "input_requirements": {
                            "members": {
                                role_key: {"count": 1, "asset_types": ["in_tenue"]},
                            },
                        },
                        "description": f"Goal celebration video for {role} with in-tenue photo",
                    }
                )

                # In Tenue - requires profile_photo and tenue (season asset)
                template_definitions.append(
                    {
                        "name": f"{role_label} In Tenue - Modern",
                        "template_type": TemplateType.MEMBER,
                        "template_subtype": TemplateSubtype.MEMBER_IN_TENUE,
                        "style_variant": "Modern",
                        "ai_workflow_id": f"wf_member_in_tenue_{role}_modern",
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
                        "name": f"{role_label} Legacy Closeup - Modern",
                        "template_type": TemplateType.MEMBER,
                        "template_subtype": TemplateSubtype.MEMBER_LEGACY_CLOSEUP,
                        "style_variant": "Modern",
                        "ai_workflow_id": f"wf_member_legacy_closeup_{role}_modern",
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
                        "name": f"{role_label} Legacy In Tenue - Modern",
                        "template_type": TemplateType.MEMBER,
                        "template_subtype": TemplateSubtype.MEMBER_LEGACY_IN_TENUE,
                        "style_variant": "Modern",
                        "ai_workflow_id": f"wf_member_legacy_in_tenue_{role}_modern",
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

        # Create the templates
        if template_definitions:
            self.stdout.write(f"\n📄 Creating {category} templates...")
            for t_data in template_definitions:
                if dry_run:
                    self.stdout.write(f"  [DRY] Would create: {t_data['name']}")
                    template_count += 1
                    continue

                # Member and custom templates don't need sport
                template_sport = (
                    None
                    if t_data["template_type"] in [TemplateType.MEMBER, TemplateType.CUSTOM]
                    else football_11v11
                )

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
                self.stdout.write(f"  ✓ {template.name} ({status})")

        # Step 5: Create lineup templates per formation (only if category matches)
        if category in ["all", "pre_match"]:
            self.stdout.write("\n📋 Creating lineup templates per formation...")

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
                    self.stdout.write(f"  ✓ {name} ({status})")

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
                    self.stdout.write(f"  ✓ {name} ({status})")

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Seed complete! {'Would create' if dry_run else 'Created/updated'} {template_count} templates"
            )
        )
        self.stdout.write(f"   - {len(formations_11v11)} formations for 11v11")
        self.stdout.write(f"   - {len(formations_7v7)} formations for 7v7")

        if category in ["all", "pre_match"]:
            self.stdout.write(
                f"   - {len(LINEUP_TEMPLATE_STYLES) * len(formations_11v11)} lineup templates for 11v11"
            )
            self.stdout.write(f"   - {2 * len(formations_7v7)} lineup templates for 7v7")

        self.stdout.write("\n🔒 All templates are GLOBAL (organisation=None)")
        self.stdout.write("   Only superadmins can edit these templates.")

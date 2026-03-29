"""Seed GenerationTemplates for all organisations.

Creates standard content generation templates per context:
- Member: Profile photos, intro videos, celebrations
- Season: Transformation, season recap
- Match: Pre-match (flyer, lineup, walkon, anthem), during (goal, score),
         post-match (final score, summary, highlights)
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from organisations.models import Organisation

from src.generative.models import (
    GenerationTemplate,
    OutputType,
    ProviderChoices,
    TemplateSubtype,
    TemplateType,
)

User = get_user_model()


# Template definitions: (type, subtype, name, description, output_type, estimated_credits)
TEMPLATE_DEFINITIONS = [
    # =========================================================================
    # MEMBER TEMPLATES
    # =========================================================================
    (
        TemplateType.MEMBER,
        TemplateSubtype.PROFILE_PHOTO,
        "Profile Photo",
        "Generate professional profile photo with club branding overlay",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.LEGACY_PHOTO,
        "Legacy Photo",
        "Nostalgic vintage-style portrait with retro effects",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.IN_TENUE,
        "In Tenue",
        "Player in full team kit with dynamic pose",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.CLOSEUP,
        "Close-up",
        "Dramatic close-up portrait with club colors",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.SHORT_INTRO,
        "Short Intro",
        "15-second player introduction video with stats overlay",
        OutputType.VIDEO,
        3,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.CELEBRATION,
        "Celebration",
        "Goal celebration animation with particle effects",
        OutputType.VIDEO,
        2,
    ),
    (
        TemplateType.MEMBER,
        TemplateSubtype.LEGACY_IN_TENUE,
        "Legacy in Tenue",
        "Vintage style player card in historical kit design",
        OutputType.IMAGE,
        1,
    ),
    # =========================================================================
    # SEASON TEMPLATES
    # =========================================================================
    (
        TemplateType.SEASON,
        TemplateSubtype.TRANSFORMATION,
        "Then vs Now",
        "Side-by-side comparison showing player/team evolution over season",
        OutputType.VIDEO,
        3,
    ),
    (
        TemplateType.SEASON,
        TemplateSubtype.SEASON_RECAP,
        "Season Recap",
        "Highlight montage of best moments from the season",
        OutputType.VIDEO,
        5,
    ),
    # =========================================================================
    # PRE-MATCH TEMPLATES
    # =========================================================================
    (
        TemplateType.PRE_MATCH,
        TemplateSubtype.FLYER,
        "Match Flyer",
        "Pre-match announcement flyer with team logos and match details",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.PRE_MATCH,
        TemplateSubtype.LINEUP,
        "Lineup Video",
        "Starting XI reveal video with player photos, formation and animations",
        OutputType.VIDEO,
        3,
    ),
    (
        TemplateType.PRE_MATCH,
        TemplateSubtype.LINEUP_FLYER,
        "Lineup Flyer",
        "Static lineup image with player photos and formation",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.PRE_MATCH,
        TemplateSubtype.WALKON,
        "Walk-on Video",
        "Epic team entrance video with dramatic music",
        OutputType.VIDEO,
        3,
    ),
    (
        TemplateType.PRE_MATCH,
        TemplateSubtype.ANTHEM,
        "Anthem Video",
        "Club anthem visualization with lyrics and fan footage",
        OutputType.VIDEO,
        3,
    ),
    # =========================================================================
    # DURING-MATCH TEMPLATES
    # =========================================================================
    (
        TemplateType.DURING_MATCH,
        TemplateSubtype.GOAL,
        "Goal Celebration",
        "Instant goal celebration graphic with scorer info",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.DURING_MATCH,
        TemplateSubtype.SCORE_UPDATE,
        "Score Update",
        "Live score graphic for social media posting",
        OutputType.IMAGE,
        1,
    ),
    # =========================================================================
    # POST-MATCH TEMPLATES
    # =========================================================================
    (
        TemplateType.POST_MATCH,
        TemplateSubtype.END_SCORE,
        "Final Score",
        "Match result graphic with final score and key stats",
        OutputType.IMAGE,
        1,
    ),
    (
        TemplateType.POST_MATCH,
        TemplateSubtype.MATCH_SUMMARY,
        "Match Summary",
        "Editorial-style match report with highlights",
        OutputType.TEXT,
        2,
    ),
    (
        TemplateType.POST_MATCH,
        TemplateSubtype.HIGHLIGHTS,
        "Highlights Reel",
        "Auto-generated highlights video from match footage",
        OutputType.VIDEO,
        5,
    ),
]


def get_input_schema(template_type: str, subtype: str, output_type: str) -> dict:
    """Generate appropriate JSON Schema based on template context."""
    base_schema = {
        "type": "object",
        "required": [],
        "properties": {},
    }

    # Add context-specific required fields
    if template_type == TemplateType.MEMBER:
        base_schema["required"].extend(["member_id"])
        base_schema["properties"]["member_id"] = {
            "type": "integer",
            "description": "ID of the member/player",
        }
        base_schema["properties"]["member_name"] = {
            "type": "string",
            "description": "Display name (auto-filled if not provided)",
        }
        base_schema["properties"]["squad_number"] = {
            "type": "integer",
            "description": "Jersey number",
        }

    elif template_type == TemplateType.SEASON:
        base_schema["required"].extend(["season_id"])
        base_schema["properties"]["season_id"] = {
            "type": "integer",
            "description": "ID of the season",
        }
        base_schema["properties"]["team_id"] = {
            "type": "integer",
            "description": "ID of the team (optional, uses project default)",
        }

    elif template_type in [
        TemplateType.PRE_MATCH,
        TemplateType.DURING_MATCH,
        TemplateType.POST_MATCH,
    ]:
        base_schema["required"].extend(["match_id"])
        base_schema["properties"]["match_id"] = {
            "type": "integer",
            "description": "ID of the match",
        }
        base_schema["properties"]["home_team"] = {
            "type": "string",
            "description": "Home team name (auto-filled from match)",
        }
        base_schema["properties"]["away_team"] = {
            "type": "string",
            "description": "Away team name (auto-filled from match)",
        }

        # Goal celebration needs scorer
        if subtype == TemplateSubtype.GOAL:
            base_schema["required"].append("scorer_id")
            base_schema["properties"]["scorer_id"] = {
                "type": "integer",
                "description": "ID of the goal scorer",
            }
            base_schema["properties"]["minute"] = {
                "type": "integer",
                "description": "Minute of the goal",
            }

        # Score update needs current score
        if subtype in [TemplateSubtype.SCORE_UPDATE, TemplateSubtype.END_SCORE]:
            base_schema["required"].extend(["home_score", "away_score"])
            base_schema["properties"]["home_score"] = {
                "type": "integer",
                "description": "Home team score",
            }
            base_schema["properties"]["away_score"] = {
                "type": "integer",
                "description": "Away team score",
            }

    # Common optional fields
    base_schema["properties"]["style_variant"] = {
        "type": "string",
        "enum": ["classic", "neon", "minimal", "epic", "editorial"],
        "default": "classic",
        "description": "Visual style variant",
    }
    base_schema["properties"]["use_brand_colors"] = {
        "type": "boolean",
        "default": True,
        "description": "Apply organisation brand colors",
    }

    return base_schema


def get_pipeline_config(output_type: str, estimated_credits: int) -> dict:
    """Generate pipeline config based on output type."""
    if output_type == OutputType.VIDEO:
        return {
            "provider": ProviderChoices.LANGGRAPH,
            "graph_id": "video_generation_v1",
            "estimated_cost": float(estimated_credits),
            "timeout_seconds": 300,
            "max_retries": 2,
        }
    elif output_type == OutputType.TEXT:
        return {
            "provider": ProviderChoices.OPENAI,
            "model": "gpt-4o",
            "estimated_cost": float(estimated_credits),
            "timeout_seconds": 60,
            "max_retries": 3,
        }
    else:  # IMAGE
        return {
            "provider": ProviderChoices.OPENAI,
            "model": "dall-e-3",
            "estimated_cost": float(estimated_credits),
            "timeout_seconds": 120,
            "max_retries": 2,
        }


class Command(BaseCommand):
    help = "Seed GenerationTemplates for all organisations"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Get system user for created_by
        system_user = User.objects.filter(is_superuser=True).first()
        if not system_user:
            self.stderr.write(self.style.ERROR("No superuser found. Create one first."))
            return

        organisations = Organisation.objects.filter(is_active=True)
        if not organisations.exists():
            self.stderr.write(self.style.ERROR("No active organisations found."))
            return

        self.stdout.write(
            f"Processing {organisations.count()} organisations, "
            f"{len(TEMPLATE_DEFINITIONS)} template types..."
        )

        created_count = 0
        skipped_count = 0

        for org in organisations:
            if dry_run:
                self.stdout.write(f"\n  [{org.name}]")

            for (
                template_type,
                template_subtype,
                name,
                description,
                output_type,
                estimated_credits,
            ) in TEMPLATE_DEFINITIONS:
                slug = template_subtype.replace("_", "-")

                if dry_run:
                    self.stdout.write(f"    Would create: {name} ({template_type}/{slug})")
                    created_count += 1
                    continue

                # Check if exists
                existing = GenerationTemplate.objects.filter(
                    organisation=org,
                    slug=slug,
                    version="1.0.0",
                ).exists()

                if existing:
                    skipped_count += 1
                    continue

                GenerationTemplate.objects.create(
                    organisation=org,
                    name=name,
                    slug=slug,
                    version="1.0.0",
                    description=description,
                    template_type=template_type,
                    template_subtype=template_subtype,
                    input_schema=get_input_schema(template_type, template_subtype, output_type),
                    pipeline_config=get_pipeline_config(output_type, estimated_credits),
                    retention_days=90,  # 3 months default
                    created_by=system_user,
                )
                created_count += 1

        # Summary
        total = GenerationTemplate.objects.count()
        prefix = "Would create" if dry_run else "Created"

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! {prefix} {created_count} templates " f"(skipped {skipped_count} existing)"
            )
        )
        self.stdout.write(f"Total templates in database: {total}")
        self.stdout.write(
            f"\nTemplate breakdown:\n"
            f"  - {len([t for t in TEMPLATE_DEFINITIONS if t[0] == TemplateType.MEMBER])} Member templates\n"
            f"  - {len([t for t in TEMPLATE_DEFINITIONS if t[0] == TemplateType.SEASON])} Season templates\n"
            f"  - {len([t for t in TEMPLATE_DEFINITIONS if t[0] == TemplateType.PRE_MATCH])} Pre-Match templates\n"
            f"  - {len([t for t in TEMPLATE_DEFINITIONS if t[0] == TemplateType.DURING_MATCH])} During-Match templates\n"
            f"  - {len([t for t in TEMPLATE_DEFINITIONS if t[0] == TemplateType.POST_MATCH])} Post-Match templates"
        )

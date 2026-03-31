"""Prompt template service for B34 Generative Pipelines.

Provides cached template lookup, prompt resolution with parameter substitution,
and signal-based cache invalidation. Migrates logic from legacy teamreel_prompts.py.
"""

from __future__ import annotations

import logging
from typing import Any

from django.db.models import F, Q

from src.core.cache.decorators import cache_result
from src.core.cache.services import CacheService
from src.generative.models import GenerationTemplate

logger = logging.getLogger(__name__)


# ==============================================================================
# Exceptions
# ==============================================================================


class GenerationTemplateNotFoundError(Exception):
    """Raised when a template slug is not found in the database."""

    def __init__(self, slug: str) -> None:
        self.slug = slug
        super().__init__(f"Generation template not found: {slug}")


# ==============================================================================
# Constants — migrated from legacy teamreel_prompts.py
# ==============================================================================

PARAM_RESOLVERS: dict[str, dict[str, str]] = {
    "background": {
        "transparent": "Fully TRANSPARENT (alpha channel). No background at all.",
        "white": "Pure WHITE (#FFFFFF) background.",
        "light_grey": "Light grey (#F0F0F0) background.",
    },
    "style": {
        "original": "Keep the original design exactly as-is, only clean up edges and background.",
        "clean_vector": "Clean vector-style rendering with crisp edges.",
        "minimalist": "Simplified, minimalist interpretation maintaining core identity.",
        "modern_slim": "Modern slim-fit athletic cut.",
        "classic": "Classic relaxed-fit style.",
        "windbreaker": "Lightweight windbreaker style.",
        "hoodie": "Hooded tracksuit style with drawstring hood.",
    },
    "orientation": {
        "landscape": "Landscape rectangle (2:1 aspect ratio, 512x256px).",
        "square": "Perfect square (1:1 aspect ratio, 512x512px).",
    },
    "sleeves": {
        "short": "SHORT SLEEVES",
        "long": "LONG SLEEVES",
    },
    "neck": {
        "round": "ROUND NECK (crew neck)",
        "collar": "POLO COLLAR (button-up collar)",
        "v_neck": "V-NECK",
        "crew": "MODERN CREW NECK",
    },
    "kit_type": {
        "home": "HOME KIT (primary team colors)",
        "away": "AWAY KIT (secondary/inverted colors)",
        "third": "THIRD KIT (alternative design)",
        "goalkeeper": "GOALKEEPER KIT (distinctive keeper colors)",
        "coach": "COACH / TRAINER outfit (tracksuit or training wear)",
        "assistant": "ASSISTANT COACH outfit (same as coach/trainer)",
        "training": "TRAINING KIT (casual training wear)",
    },
    "shirt_base": {
        "auto_home": "Use the team's PRIMARY HOME colors from the reference photo analysis.",
        "auto_away_contrast": "Use CONTRASTING colors to the home kit (inverted/opposite scheme).",
        "white": "WHITE base shirt color.",
        "black": "BLACK base shirt color.",
        "red": "RED base shirt color.",
        "blue": "BLUE base shirt color.",
        "green": "GREEN base shirt color.",
        "yellow": "YELLOW base shirt color.",
        "orange": "ORANGE base shirt color.",
        "purple": "PURPLE base shirt color.",
        "navy": "NAVY BLUE base shirt color.",
        "maroon": "MAROON / DARK RED base shirt color.",
        "sky_blue": "SKY BLUE / LIGHT BLUE base shirt color.",
    },
    "pattern_style": {
        "solid": "SOLID single color — no pattern, clean monochrome shirt.",
        "vertical_stripes": "VERTICAL STRIPES — alternating colored vertical stripes down the shirt.",  # noqa: E501
        "horizontal_hoops": "HORIZONTAL HOOPS — horizontal bands/stripes across the shirt.",
        "diagonal_sash": "DIAGONAL SASH — a bold diagonal stripe across the chest.",
        "half_half": "HALF & HALF — shirt split vertically into two distinct colors.",
        "pinstripes": "PINSTRIPES — thin, subtle vertical pinstripes.",
        "subtle_graphic": "SUBTLE GRAPHIC — a modern tonal graphic/texture pattern (e.g. geometric, camo-like).",  # noqa: E501
        "graphic_print": "GRAPHIC PRINT — bold all-over graphic/artistic print pattern.",
        "camo": "CAMOUFLAGE — military-inspired camo pattern.",
        "geometric": "GEOMETRIC — angular geometric shapes and patterns.",
        "gradient": "GRADIENT — smooth color gradient transition (top to bottom or left to right).",
    },
    "shorts_style": {
        "match_shirt": "MATCH SHIRT color — shorts use the same primary color as the shirt.",
        "white": "WHITE shorts.",
        "black": "BLACK shorts.",
        "navy": "NAVY BLUE shorts.",
        "contrast": "CONTRASTING color — shorts use a contrasting/accent color from the kit.",
    },
    "socks_style": {
        "match_shirt": "MATCH SHIRT color — socks use the same primary color as the shirt.",
        "match_shorts": "MATCH SHORTS color — socks use the same color as the shorts.",
        "white": "WHITE socks.",
        "black": "BLACK socks.",
        "contrast": "CONTRASTING color — socks use an accent color from the kit.",
    },
    "keeper_color": {
        "neon_green": "NEON GREEN / Fluorescent Green",
        "neon_orange": "NEON ORANGE / Fluorescent Orange",
        "purple": "DEEP PURPLE / Violet",
        "neon_yellow": "NEON YELLOW / Fluorescent Yellow",
        "pink": "BRIGHT PINK / Magenta",
        "black": "BLACK — classic dark goalkeeper kit",
        "red": "RED — bold red goalkeeper kit",
        "blue": "BLUE — royal blue goalkeeper kit",
        "grey": "GREY — neutral grey goalkeeper kit",
    },
    "tracksuit_color": {
        "team_primary": "Use the team's PRIMARY color from the kit/brand identity.",
        "black": "BLACK base tracksuit.",
        "navy": "NAVY BLUE base tracksuit.",
        "grey": "GREY base tracksuit.",
        "team_secondary": "Use the team's SECONDARY/accent color from the kit/brand identity.",
        "red": "RED base tracksuit.",
        "blue": "BLUE base tracksuit.",
    },
    "accent_color": {
        "team_secondary": "Use the team's SECONDARY color as accent/trim.",
        "white": "WHITE accent trim, zippers, and stripes.",
        "black": "BLACK accent trim, zippers, and stripes.",
        "neon": "NEON / Fluorescent accent highlights for a modern look.",
        "gold": "GOLD / Metallic gold accent details.",
        "silver": "SILVER / Metallic silver accent details.",
    },
    "outfit_style": {
        "net_pak": "FORMAL SUIT (Net Pak) — tailored blazer/sport coat + dress trousers, professional touchline look",  # noqa: E501
        "trainings_sweater": "TRAINING SWEATER — half-zip or quarter-zip training top + training trousers, athletic coaching look",  # noqa: E501
        "coltrui": "TURTLENECK (Coltrui) — elegant turtleneck/rollneck sweater + trousers, sophisticated touchline style",  # noqa: E501
        "polo": "POLO SHIRT — professional polo shirt + chinos/dress trousers, smart-casual coaching look",  # noqa: E501
        "windbreaker": "WINDBREAKER — lightweight rain/wind jacket + training trousers, all-weather coaching gear",  # noqa: E501
    },
    "outfit_color": {
        "team_primary": "Use the team's PRIMARY color from the kit/brand identity.",
        "black": "BLACK — classic, authoritative black.",
        "navy": "NAVY BLUE — professional dark navy.",
        "charcoal": "CHARCOAL GREY — dark sophisticated grey.",
        "grey": "GREY — neutral medium grey.",
        "team_secondary": "Use the team's SECONDARY/accent color from the kit/brand identity.",
    },
    "pose": {
        "standing_front": "Standing facing camera, arms at sides, confident stance",
        "standing_arms_crossed": "Standing with arms crossed, confident power pose",
        "action_running": "Dynamic running pose, mid-stride",
        "ball_at_feet": "Standing with one foot on a football",
    },
    "expression": {
        "neutral_confident": "Neutral, confident expression — match-day focus",
        "smiling": "Friendly, approachable smile",
        "intense": "Intense, competitive game-face",
    },
    "role": {
        "player": "Field player",
        "goalkeeper": "Goalkeeper",
        "coach": "Head coach / Trainer",
        "assistant": "Assistant coach / Staff member",
    },
    "color_scheme": {
        "team_colors": "Use the team's primary and secondary colors from the kit analysis.",
        "black_accent": "Black base with team color accents on zippers, stripes, and logo area.",
        "navy_accent": "Navy blue base with team color accents.",
    },
    "style_variant": {
        "arms_crossed": "The player slowly crosses both arms over their chest, standing tall with a confident powerful stance. Chin slightly raised.",  # noqa: E501
        "hand_up": "The player slowly raises one hand in a greeting wave toward the camera, friendly and approachable. Small natural smile.",  # noqa: E501
        "thumbs_up": "The player gives a thumbs up with one hand toward the camera, positive and confident. Slight nod.",  # noqa: E501
        "arms_wide": "The player spreads both arms wide open to the sides, triumphant celebration. Looks up briefly then back to camera.",  # noqa: E501
        "fist_pump": "The player pumps one fist into the air with intensity, powerful celebration. Other arm bent at side.",  # noqa: E501
        "point_to_sky": "The player points to the sky with one index finger, emotional dedication gesture. Other hand on chest.",  # noqa: E501
        "slide": "The player drops to both knees in a knee slide, arms spread wide. Then stands back up to starting position.",  # noqa: E501
    },
}

ROLE_EQUIPMENT: dict[str, str] = {
    "player": "- Football boots (modern style).",
    "goalkeeper": "- Football boots (modern style).\n- Goalkeeper gloves (matching team colors).",
    "coach": "- Training shoes / sneakers (no football boots).\n- Optional: whistle on lanyard, stopwatch.",  # noqa: E501
    "assistant": "- Training shoes / sneakers (no football boots).",
}

OUTFIT_STYLE_DETAILS: dict[str, str] = {
    "net_pak": """- TOP: Tailored single-breasted blazer / sport coat, modern slim fit.
  - Two or three buttons, narrow lapels.
  - Pocket square optional (team accent color).
  - Club badge/logo embroidered on breast pocket.
- SHIRT: Dress shirt underneath (white or light color), open collar (no tie).
- TROUSERS: Matching tailored dress trousers, slim modern cut.
- SHOES: Smart dress shoes or clean leather sneakers.""",
    "trainings_sweater": """- TOP: Half-zip or quarter-zip training pullover, athletic fit.
  - Technical moisture-wicking fabric look.
  - Raglan sleeves with accent color piping/stripes on shoulders.
  - Club logo embroidered on left chest.
- UNDERSHIRT: Team-color base layer visible at collar.
- TROUSERS: Matching tapered training trousers with side stripe.
- SHOES: Modern training/running shoes.""",
    "coltrui": """- TOP: Elegant fine-knit turtleneck / rollneck sweater, slim fit.
  - Clean lines, no visible zippers or buttons.
  - Club logo small embroidery on left chest.
  - Premium wool or cashmere look.
- TROUSERS: Tailored chinos or dress trousers, modern slim cut.
- SHOES: Clean smart-casual shoes or leather sneakers.""",
    "polo": """- TOP: Professional polo shirt, modern athletic fit.
  - Flat knit collar, 2-3 button placket.
  - Club logo embroidered on left chest.
  - Optional: accent color on collar trim and sleeve bands.
- TROUSERS: Smart chinos or tailored trousers.
- SHOES: Clean smart-casual shoes or leather sneakers.""",
    "windbreaker": """- TOP: Lightweight windbreaker / rain jacket, sport fit.
  - Full-zip front, high collar with hood (stowable).
  - Club logo on left chest, accent color on side panels.
  - Water-resistant technical fabric look.
- UNDERSHIRT: Team training shirt visible at collar.
- TROUSERS: Matching waterproof training trousers.
- SHOES: Modern training shoes.""",
}

# Home-kit design parameters that should follow reference photo analysis
_HOME_KIT_OVERRIDE_PARAMS = frozenset(
    {"shirt_base", "pattern_style", "shorts_style", "socks_style"}
)


# ==============================================================================
# Service Functions
# ==============================================================================


@cache_result(
    key_pattern="prompt_template:{slug}:{organisation_id}",
    ttl=300,
    tags=["prompt_templates", "prompt_template:{slug}"],
)
def get_template(slug: str, organisation_id: int | None = None) -> GenerationTemplate:
    """Look up an active template by slug with 300s cache.

    Args:
        slug: Template slug identifier.
        organisation_id: Optional org scope. When provided, returns org-specific
            or global (org=NULL) templates.

    Returns:
        The matching active GenerationTemplate.

    Raises:
        GenerationTemplateNotFoundError: When no active template matches.
    """
    qs = GenerationTemplate.objects.filter(slug=slug, is_active=True)
    if organisation_id is not None:
        qs = qs.filter(Q(organisation_id=organisation_id) | Q(organisation__isnull=True))
    # Org-specific templates take priority over global (org=NULL) ones
    template = qs.order_by(F("organisation").asc(nulls_last=True)).first()
    if template is None:
        raise GenerationTemplateNotFoundError(slug)
    return template


@cache_result(
    key_pattern="prompt_templates:active_list:{organisation_id}",
    ttl=300,
    tags=["prompt_templates"],
)
def get_active_templates(
    organisation_id: int | None = None,
) -> list[GenerationTemplate]:
    """Return all active templates, optionally scoped to an organisation.

    Args:
        organisation_id: Optional org scope. When provided, returns org-specific
            and global templates.

    Returns:
        List of active GenerationTemplate instances.
    """
    qs = GenerationTemplate.objects.filter(is_active=True).select_related("organisation")
    if organisation_id is not None:
        qs = qs.filter(Q(organisation_id=organisation_id) | Q(organisation__isnull=True))
    return list(qs)


def resolve_prompt(
    template: GenerationTemplate,
    params: dict[str, Any],
    kit_analysis: str = "",
    extra_context: dict[str, str] | None = None,
    *,
    is_home_kit_design: bool = False,
) -> str:
    """Resolve a template into a final prompt string.

    Substitutes ``{placeholder}`` variables in ``template.prompt_text`` using:
    - ``PARAM_RESOLVERS`` for known parameter labels/descriptions
    - ``ROLE_EQUIPMENT`` for role-specific equipment text
    - ``OUTFIT_STYLE_DETAILS`` for outfit detail blocks
    - ``kit_analysis`` injected directly
    - ``extra_context`` dict merged into replacements
    - ``user_instruction`` from params appended at the end

    The home-kit override forces design parameters (shirt_base, pattern_style,
    shorts_style, socks_style) to follow the reference photo analysis instead
    of user-selected values.

    Args:
        template: The GenerationTemplate instance.
        params: User-selected parameter values.
        kit_analysis: Gemini analysis of the reference photo.
        extra_context: Additional context variables to inject.
        is_home_kit_design: When True, override design params with reference.

    Returns:
        Fully resolved prompt string.
    """
    prompt = template.prompt_text
    if not prompt:
        return ""

    replacements: dict[str, str] = {
        "kit_analysis": kit_analysis,
    }

    # Build parameter defaults from template's parameters_schema
    param_defaults: dict[str, str] = {}
    if template.parameters_schema:
        for pkey, pdef in template.parameters_schema.items():
            if isinstance(pdef, dict) and "default" in pdef:
                param_defaults[pkey] = pdef["default"]

    # Resolve each parameter
    for param_key in {*param_defaults.keys(), *params.keys()}:
        value = params.get(param_key, param_defaults.get(param_key, ""))
        if not value:
            continue

        # Home-kit override: force design params to follow reference analysis
        if is_home_kit_design and param_key in _HOME_KIT_OVERRIDE_PARAMS:
            replacements[f"{param_key}_label"] = "MATCH REFERENCE"
            replacements[f"{param_key}_description"] = (
                "Strictly follow the design pattern and colors "
                "from the reference photo team context."
            )
            continue

        # Resolve through PARAM_RESOLVERS
        if param_key in PARAM_RESOLVERS and value in PARAM_RESOLVERS[param_key]:
            resolved_text = PARAM_RESOLVERS[param_key][value]
            replacements[f"{param_key}_label"] = resolved_text
            replacements[f"{param_key}_description"] = resolved_text
        else:
            replacements[f"{param_key}_label"] = str(value).upper()
            replacements[f"{param_key}_description"] = str(value)

    # Role equipment
    role = params.get("role", "player")
    replacements["role_equipment"] = ROLE_EQUIPMENT.get(str(role), "")

    # Outfit style details
    outfit_style = params.get("outfit_style", "net_pak")
    replacements["outfit_style_details"] = OUTFIT_STYLE_DETAILS.get(str(outfit_style), "")

    # Extra context
    if extra_context:
        replacements.update(extra_context)

    # Apply replacements
    for key, value in replacements.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))

    # Append user instruction for iterative feedback
    user_instruction = str(params.get("user_instruction", "")).strip()
    if user_instruction:
        prompt += f"\n\nADDITIONAL USER INSTRUCTIONS:\n{user_instruction}"
        prompt += (
            "\n\nIMPORTANT: Please strictly follow the additional user "
            "instructions above to refine the result."
        )

    return prompt


def invalidate_template_cache(slug: str | None = None) -> None:
    """Invalidate prompt template cache tags.

    Args:
        slug: Optional specific template slug. When provided, invalidates
            both the global tag and the slug-specific tag. When None,
            invalidates the global tag only.
    """
    cache_service = CacheService()
    tags = ["prompt_templates"]
    if slug:
        tags.append(f"prompt_template:{slug}")
    cache_service.invalidate_tags(tags)

"""
TeamReel AI Prompt Templates Library
=====================================

Reusable, parameterized prompt templates for the TeamReel AI generation pipeline.
Each template defines:
  - id: unique slug
  - name: human label
  - category: logo | sponsor | tenue | keeper | tracksuit | fullbody | closeup
  - input_requirements: what files are needed
  - parameters: user-configurable options (with defaults)
  - prompt_template: the actual prompt string with {placeholders}
  - preprocessing: any image preprocessing steps needed
"""

from dataclasses import dataclass, field
from typing import Optional

# =============================================================================
# TEMPLATE DEFINITIONS
# =============================================================================

TEMPLATES = {

    # =========================================================================
    # 1. LOGO STANDARDIZATION
    # =========================================================================
    "logo_standardize": {
        "id": "logo_standardize",
        "name": "Logo Standaardiseren",
        "category": "logo",
        "description": "Zet een clublogo om naar een vierkant formaat met transparante achtergrond.",
        "input_requirements": ["logo"],
        "parameters": {
            "background": {
                "label": "Achtergrond",
                "type": "select",
                "options": ["transparent", "white", "light_grey"],
                "default": "transparent",
            },
            "style": {
                "label": "Stijl",
                "type": "select",
                "options": ["original", "clean_vector", "minimalist"],
                "default": "original",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",  # Center on 512x512 transparent canvas
        },
        "prompt_template": """Convert this club logo into a clean, standardized format.

OUTPUT SPECIFICATIONS:
- Format: Perfect square (1:1 aspect ratio).
- Background: {background_description}.
- The logo must be CENTERED and fill approximately 80% of the canvas.
- Style: {style_description}.
- Preserve ALL original colors, shapes, text, and details of the logo EXACTLY.
- No added decorations, shadows, or effects unless present in the original.
- Output should look like a professional brand asset file.
""",
    },

    # =========================================================================
    # 2. SPONSOR STANDARDIZATION
    # =========================================================================
    "sponsor_standardize": {
        "id": "sponsor_standardize",
        "name": "Sponsor Standaardiseren",
        "category": "sponsor",
        "description": "Zet een sponsorlogo om naar standaard formaat met transparante achtergrond.",
        "input_requirements": ["sponsor"],
        "parameters": {
            "background": {
                "label": "Achtergrond",
                "type": "select",
                "options": ["transparent", "white"],
                "default": "transparent",
            },
            "orientation": {
                "label": "Oriëntatie",
                "type": "select",
                "options": ["landscape", "square"],
                "default": "landscape",
            },
        },
        "preprocessing": {
            "sponsor": "pad_512_landscape",  # Center on 512x256 or 512x512
        },
        "prompt_template": """Convert this sponsor logo into a clean, standardized format for printing on sportswear.

OUTPUT SPECIFICATIONS:
- Format: {orientation_description}.
- Background: {background_description}.
- The sponsor logo must be CENTERED and fill ~80% of the canvas width.
- Preserve ALL original colors, text, and graphic elements EXACTLY.
- Clean edges, no artifacts, no added effects.
- Must be suitable for heat-press printing on fabric.
""",
    },

    # =========================================================================
    # 3. TENUE (KIT) GENERATION
    # =========================================================================
    "tenue_generate": {
        "id": "tenue_generate",
        "name": "Tenue Genereren",
        "category": "tenue",
        "description": "Genereer een realistisch voetbaltenue (shirt + broek + sokken).",
        "input_requirements": ["logo", "sponsor", "reference_photo"],
        "parameters": {
            "sleeves": {
                "label": "Mouwen",
                "type": "select",
                "options": ["short", "long"],
                "default": "short",
            },
            "neck": {
                "label": "Hals",
                "type": "select",
                "options": ["round", "collar", "v_neck", "crew"],
                "default": "round",
            },
            "kit_type": {
                "label": "Type",
                "type": "select",
                "options": ["home", "away", "third"],
                "default": "home",
            },
            "shirt_base": {
                "label": "Shirt Kleur",
                "type": "select",
                "options": ["auto_home", "auto_away_contrast", "white", "black", "red", "blue", "green", "yellow", "orange", "purple", "navy", "maroon", "sky_blue"],
                "default": "auto_home",
            },
            "pattern_style": {
                "label": "Patroon",
                "type": "select",
                "options": ["solid", "vertical_stripes", "horizontal_hoops", "diagonal_sash", "half_half", "pinstripes", "subtle_graphic"],
                "default": "solid",
            },
            "shorts_style": {
                "label": "Broek Kleur",
                "type": "select",
                "options": ["match_shirt", "white", "black", "navy", "contrast"],
                "default": "match_shirt",
            },
            "socks_style": {
                "label": "Sokken Kleur",
                "type": "select",
                "options": ["match_shirt", "match_shorts", "white", "black", "contrast"],
                "default": "match_shirt",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a MODERN, REALISTIC football kit layout (Flat Lay Photography).

DESIGN CONFIGURATION (PRIORITY OVER CONTEXT):
- SHIRT COLOR: {shirt_base_description}.
- PATTERN: {pattern_style_description}.
- SHORTS COLOR: {shorts_style_description}.
- SOCKS COLOR: {socks_style_description}.
- KIT TYPE: {kit_type_label}.
- SLEEVES: {sleeves_label}.
- NECKLINE: {neck_label}.

TEAM CONTEXT (Use for crest/sponsor style and secondary accents, but apply the specific colors defined above):
{kit_analysis}

COMPOSITION & FRAMING (CRITICAL):
- FULL BODY SHOT: You must show the ENTIRE shirt, ENTIRE shorts, and complete pair of socks.
- DO NOT CROP: Do not cut off the bottom of the socks or the top of the collar.
- MAXIMIZE SPACE: The kit should fill the frame but keep a small margin.
- Orientation: Vertical Portrait.

INTEGRATION:
- LOGO: Use provided Club Logo on LEFT CHEST. Realistic embroidery.
- SPONSOR: Use provided Sponsor image CENTERED on chest.

STYLE:
- Clean, high-end commercial sportswear photography.
- Neutral light grey concrete texture background.
- Natural cloth folds.
""",
    },

    # =========================================================================
    # 4. KEEPER TENUE
    # =========================================================================
    "keeper_tenue": {
        "id": "keeper_tenue",
        "name": "Keeperstenue Genereren",
        "category": "keeper",
        "description": "Genereer een keeperstenue met opvallende kleur.",
        "input_requirements": ["logo", "sponsor", "reference_photo"],
        "parameters": {
            "sleeves": {
                "label": "Mouwen",
                "type": "select",
                "options": ["long", "short"],
                "default": "long",
            },
            "neck": {
                "label": "Hals",
                "type": "select",
                "options": ["round", "collar", "v_neck"],
                "default": "round",
            },
            "keeper_color": {
                "label": "Hoofdkleur",
                "type": "select",
                "options": ["neon_green", "neon_orange", "purple", "neon_yellow", "pink", "black", "red", "blue", "grey"],
                "default": "neon_green",
            },
            "pattern_style": {
                "label": "Patroon",
                "type": "select",
                "options": ["solid", "graphic_print", "camo", "geometric", "gradient"],
                "default": "solid",
            },
            "shorts_style": {
                "label": "Broek Kleur",
                "type": "select",
                "options": ["match_shirt", "black", "contrast"],
                "default": "match_shirt",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a MODERN, REALISTIC GOALKEEPER football kit layout (Flat Lay Photography).

GOALKEEPER SPECIFICATIONS:
- Primary Color: {keeper_color_label}.
- Pattern: {pattern_style_description}.
- Shorts: {shorts_style_description}.
- Socks: Matching goalkeeper primary color.
- SLEEVES: {sleeves_label}.
- NECKLINE: {neck_label}.
- Design: Padded elbows and protective elements characteristic of goalkeeper gears.
- GLOVES: Place a pair of matching professional goalkeeper gloves next to the kit.

IMPORTANT: The goalkeeper kit must be DISTINCT from standard outfield players.

TEAM CONTEXT (for logo/style reference):
{kit_analysis}

COMPOSITION & FRAMING:
- FULL BODY SHOT: ENTIRE shirt, shorts, socks, and gloves visible.
- Vertically oriented, do not crop.

INTEGRATION:
- LOGO: Left chest, realistic embroidery.
- SPONSOR: Center chest, realistic heat-press.

STYLE:
- Clean, high-end sportswear photography.
- Neutral light grey background.
""",
    },

    # =========================================================================
    # 5. TRAININGSPAK
    # =========================================================================
    "tracksuit_generate": {
        "id": "tracksuit_generate",
        "name": "Trainingspak Genereren",
        "category": "tracksuit",
        "description": "Genereer een trainingspak (jas + broek).",
        "input_requirements": ["logo", "reference_photo"],
        "parameters": {
            "style": {
                "label": "Stijl",
                "type": "select",
                "options": ["modern_slim", "classic", "windbreaker", "hoodie"],
                "default": "modern_slim",
            },
            "tracksuit_color": {
                "label": "Kleur",
                "type": "select",
                "options": ["team_primary", "black", "navy", "grey", "team_secondary", "red", "blue"],
                "default": "team_primary",
            },
            "accent_color": {
                "label": "Accent",
                "type": "select",
                "options": ["team_secondary", "white", "black", "neon", "gold", "silver"],
                "default": "team_secondary",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
        },
        "prompt_template": """Create a MODERN, REALISTIC football TRACKSUIT layout (Flat Lay Photography).

TRACKSUIT CONFIGURATION:
- Base Color: {tracksuit_color_description}.
- Accent/Trim Color: {accent_color_description}.
- Style: {style_label} fit.
- Components: Full-zip jacket (or hoodie if specified) + Matching pants.

TEAM CONTEXT (Use for color reference if 'team_primary' selected):
{kit_analysis}

COMPOSITION:
- FULL SHOT: Show ENTIRE jacket/top and ENTIRE pants.
- Organized layout (top above pants).
- No cropping.

INTEGRATION:
- LOGO: Left chest, highly visible realistic embroidery.

STYLE:
- Professional presentation.
- Neutral background.
""",
    },

    # =========================================================================
    # 6. FULLBODY PLAYER IN KIT
    # =========================================================================
    "fullbody_in_tenue": {
        "id": "fullbody_in_tenue",
        "name": "Speler in Tenue (Fullbody)",
        "category": "fullbody",
        "description": "Plaats een persoon in het volledige tenue met voetbalschoenen.",
        "input_requirements": ["person_photo", "logo", "sponsor", "reference_photo"],
        "parameters": {
            "sleeves": {
                "label": "Mouwen",
                "type": "select",
                "options": ["short", "long"],
                "default": "short",
            },
            "pose": {
                "label": "Pose",
                "type": "select",
                "options": ["standing_front", "standing_arms_crossed", "action_running", "ball_at_feet"],
                "default": "standing_front",
            },
            "role": {
                "label": "Rol",
                "type": "select",
                "options": ["player", "goalkeeper"],
                "default": "player",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a FULL BODY portrait of this person wearing a complete football kit.

PERSON: Use the provided person photo. Preserve their face, hair, and body proportions EXACTLY.

KIT SPECIFICATIONS:
{kit_analysis}
- SLEEVES: {sleeves_label}.
- Role: {role_label}.

POSE: {pose_label}.

EQUIPMENT:
- Football boots (modern style, matching team colors).
{role_equipment}

COMPOSITION:
- FULL BODY: Head to toe must be visible. No cropping.
- The person should be standing upright on a flat surface.
- Professional sports photography lighting.
- Background: PURE SOLID COLOR BACKGROUND (single flat color, no gradients, no scenery, no stadium). Use a bright green (#00FF00) or bright blue (#0000FF) chroma-key background so it can be easily removed later.

INTEGRATION:
- LOGO: Use the provided Club Logo EXACTLY as-is on LEFT CHEST of shirt. Do NOT alter.
- SPONSOR: Use the provided Sponsor image EXACTLY as-is CENTERED on chest of shirt.

STYLE:
- High-end professional football player portrait.
- Sharp focus on person, clean edges, no shadows on background.
- Even studio lighting, slight rim light for depth.
- The person must be FULLY SEPARATED from the background (no blending).
""",
    },

    # =========================================================================
    # 7. CLOSEUP PLAYER IN KIT
    # =========================================================================
    "closeup_in_tenue": {
        "id": "closeup_in_tenue",
        "name": "Speler Close-up (In Tenue)",
        "category": "closeup",
        "description": "Close-up portret van speler in tenue, borst en gezicht.",
        "input_requirements": ["person_photo", "logo", "sponsor", "reference_photo"],
        "parameters": {
            "neck": {
                "label": "Hals",
                "type": "select",
                "options": ["round", "collar", "v_neck"],
                "default": "round",
            },
            "expression": {
                "label": "Uitdrukking",
                "type": "select",
                "options": ["neutral_confident", "smiling", "intense"],
                "default": "neutral_confident",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a CLOSE-UP portrait of this person wearing the football kit.

PERSON: Use the provided person photo. Preserve their face EXACTLY.

KIT SPECIFICATIONS:
{kit_analysis}
- NECKLINE: {neck_label}.

FRAMING:
- Close-up: From MID-CHEST up to top of head. BOTH SHOULDERS must be FULLY visible.
- The head must NEVER be cropped at the top.
- Face, neck, both shoulders, and upper chest clearly visible.
- Club logo on left chest must be visible.
- Sponsor on center chest should be partially visible.

EXPRESSION: {expression_label}.

COMPOSITION:
- Professional sports portrait photography.
- Background: PURE SOLID COLOR BACKGROUND (single flat color, no gradients, no scenery). Use bright green (#00FF00) or bright blue (#0000FF) chroma-key background for easy removal.
- Sharp focus on face and upper body.

INTEGRATION:
- LOGO: Use the provided Club Logo EXACTLY as-is visible on LEFT CHEST.
- SPONSOR: Use the provided Sponsor image EXACTLY as-is visible CENTERED on chest.

STYLE:
- High-end player card / media day photography style.
- Natural skin tones, professional even studio lighting.
- Person must be FULLY SEPARATED from the background (clean edges, no shadow bleed).
""",
    },
}


# =============================================================================
# PARAMETER RESOLVERS (Map option values to prompt text)
# =============================================================================

PARAM_RESOLVERS = {
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
    },
    "keeper_color": {
        "neon_green": "NEON GREEN / Fluorescent Green",
        "neon_orange": "NEON ORANGE / Fluorescent Orange",
        "purple": "DEEP PURPLE / Violet",
        "neon_yellow": "NEON YELLOW / Fluorescent Yellow",
        "pink": "BRIGHT PINK / Magenta",
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
    },
    "color_scheme": {
        "team_colors": "Use the team's primary and secondary colors from the kit analysis.",
        "black_accent": "Black base with team color accents on zippers, stripes, and logo area.",
        "navy_accent": "Navy blue base with team color accents.",
    },
}

ROLE_EQUIPMENT = {
    "player": "- Football boots (modern style).",
    "goalkeeper": "- Football boots (modern style).\n- Goalkeeper gloves (matching team colors).",
}


def resolve_prompt(template_id: str, params: dict, kit_analysis: str = "", extra_context: dict = None) -> str:
    """
    Resolve a template into a final prompt string.

    Args:
        template_id: Key from TEMPLATES dict
        params: User-selected parameter values (e.g. {"sleeves": "long", "neck": "collar"})
        kit_analysis: The Gemini analysis of the reference photo
        extra_context: Any additional context variables

    Returns:
        Fully resolved prompt string
    """
    template = TEMPLATES[template_id]
    prompt = template["prompt_template"]

    replacements = {
        "kit_analysis": kit_analysis,
    }

    # Determine effectively active kit_type for logic controls
    kit_type_default = template["parameters"].get("kit_type", {}).get("default", "home")
    active_kit_type = params.get("kit_type", kit_type_default)
    is_home_kit_design = (template_id == "tenue_generate" and active_kit_type == "home")

    # Resolve each parameter
    for param_key, param_def in template["parameters"].items():
        value = params.get(param_key, param_def["default"])

        # FIX: For Home Kit, force design parameters to follow reference analysis
        # avoiding accidental overrides by default values (e.g. "solid" pattern)
        if is_home_kit_design and param_key in ["shirt_base", "pattern_style", "shorts_style", "socks_style"]:
             replacements[f"{param_key}_label"] = "MATCH REFERENCE"
             replacements[f"{param_key}_description"] = "Strictly follow the design pattern and colors from the reference photo team context."
             continue

        # Get human-readable description
        if param_key in PARAM_RESOLVERS and value in PARAM_RESOLVERS[param_key]:
            replacements[f"{param_key}_label"] = PARAM_RESOLVERS[param_key][value]
            replacements[f"{param_key}_description"] = PARAM_RESOLVERS[param_key][value]
        else:
            replacements[f"{param_key}_label"] = value.upper()
            replacements[f"{param_key}_description"] = value

    # Role equipment (for fullbody)
    role = params.get("role", "player")
    replacements["role_equipment"] = ROLE_EQUIPMENT.get(role, "")

    # Extra context
    if extra_context:
        replacements.update(extra_context)

    # Apply replacements
    for key, value in replacements.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))

    # Append user instruction if present in params (for iterative feedback)
    user_instruction = params.get("user_instruction", "").strip()
    if user_instruction:
        prompt += f"\n\nADDITIONAL USER INSTRUCTIONS:\n{user_instruction}"
        prompt += "\n\nIMPORTANT: Please strictly follow the additional user instructions above to refine the result."

    return prompt


def get_template_summary():
    """Print a summary of all available templates."""
    for tid, t in TEMPLATES.items():
        params = ", ".join(
            f"{p['label']} ({'/'.join(p['options'])})"
            for p in t["parameters"].values()
        )
        print(f"  [{t['category'].upper():10}] {t['name']:35} | Params: {params}")

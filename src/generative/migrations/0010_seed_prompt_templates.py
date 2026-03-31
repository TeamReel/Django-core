"""Seed 10 existing prompt templates from teamreel_prompts.py into GenerationTemplate.

Reads template definitions and creates GenerationTemplate rows with prompt_text,
parameters_schema, and preprocessing_config fields populated.
Uses organisation=None for global/default templates.
"""

from django.db import migrations

# Category → template_type mapping
CATEGORY_TO_TYPE = {
    "logo": "custom",
    "sponsor": "custom",
    "tenue": "custom",
    "keeper": "custom",
    "tracksuit": "custom",
    "coach": "custom",
    "fullbody": "member",
    "closeup": "member",
    "intro": "member",
    "celebration": "member",
}

# Category → template_subtype mapping
CATEGORY_TO_SUBTYPE = {
    "logo": "custom_logo",
    "sponsor": "",
    "tenue": "custom_tenue_logo_sponsor",
    "keeper": "custom_tenue_logo_sponsor",
    "tracksuit": "custom_tenue",
    "coach": "custom_tenue_logo_sponsor",
    "fullbody": "in_tenue",
    "closeup": "closeup",
    "intro": "short_intro",
    "celebration": "celebration",
}

# Template definitions (extracted from archive/legacy-root-cleanup/scripts/teamreel_prompts.py)
TEMPLATES = [
    {
        "slug": "logo_standardize",
        "name": "Logo Standaardiseren",
        "category": "logo",
        "description": "Zet een clublogo om naar een vierkant formaat met transparante achtergrond.",
        "prompt_text": """Convert this club logo into a clean, standardized format.

OUTPUT SPECIFICATIONS:
- Format: Perfect square (1:1 aspect ratio).
- Background: {background_description}.
- The logo must be CENTERED and fill approximately 80% of the canvas.
- Style: {style_description}.
- Preserve ALL original colors, shapes, text, and details of the logo EXACTLY.
- No added decorations, shadows, or effects unless present in the original.
- Output should look like a professional brand asset file.
""",
        "parameters_schema": {
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
        "preprocessing_config": {
            "logo": "square_pad_512",
        },
    },
    {
        "slug": "sponsor_standardize",
        "name": "Sponsor Standaardiseren",
        "category": "sponsor",
        "description": "Zet een sponsorlogo om naar standaard formaat met transparante achtergrond.",
        "prompt_text": """Convert this sponsor logo into a clean, standardized format for printing on sportswear.

OUTPUT SPECIFICATIONS:
- Format: {orientation_description}.
- Background: {background_description}.
- The sponsor logo must be CENTERED and fill ~80% of the canvas width.
- Preserve ALL original colors, text, and graphic elements EXACTLY.
- Clean edges, no artifacts, no added effects.
- Must be suitable for heat-press printing on fabric.
""",
        "parameters_schema": {
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
        "preprocessing_config": {
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "tenue_generate",
        "name": "Tenue Genereren",
        "category": "tenue",
        "description": "Genereer een realistisch voetbaltenue (shirt + broek + sokken).",
        "prompt_text": """Create a MODERN, REALISTIC football kit layout (Flat Lay Photography).

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
- Orientation: Vertical Portrait (9:16 Aspect Ratio). Image must be taller than it is wide.

INTEGRATION:
- LOGO: Use provided Club Logo on LEFT CHEST. Realistic embroidery.
- SPONSOR: Use provided Sponsor image CENTERED on chest.

STYLE:
- Clean, high-end commercial sportswear photography.
- Neutral light grey concrete texture background.
- Natural cloth folds.
""",
        "parameters_schema": {
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
        "preprocessing_config": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "keeper_tenue",
        "name": "Keeperstenue Genereren",
        "category": "keeper",
        "description": "Genereer een keeperstenue met opvallende kleur.",
        "prompt_text": """Create a MODERN, REALISTIC GOALKEEPER football kit layout (Flat Lay Photography).

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
        "parameters_schema": {
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
        "preprocessing_config": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "tracksuit_generate",
        "name": "Trainingspak Genereren",
        "category": "tracksuit",
        "description": "Genereer een trainingspak (jas + broek).",
        "prompt_text": """Create a MODERN, REALISTIC football TRACKSUIT layout (Flat Lay Photography).

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
        "parameters_schema": {
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
        "preprocessing_config": {
            "logo": "square_pad_512",
        },
    },
    {
        "slug": "coach_outfit",
        "name": "Coach Outfit Genereren",
        "category": "coach",
        "description": "Genereer een coach/trainer outfit (net pak, sweater, coltrui, etc.).",
        "prompt_text": """Create a REALISTIC football COACH / TRAINER OUTFIT layout (Flat Lay Photography).

OUTFIT CONFIGURATION:
- Outfit Type: {outfit_style_description}.
- Base Color: {outfit_color_description}.
- Accent/Trim Color: {accent_color_description}.
- This is a COACHING STAFF outfit — professional, authoritative appearance for the technical area / touchline.

TEAM CONTEXT (Use for color reference if 'team_primary' selected):
{kit_analysis}

OUTFIT DETAILS (based on style):
{outfit_style_details}

COMPOSITION & FRAMING (CRITICAL):
- FULL SHOT: Show ENTIRE top garment and ENTIRE trousers / pants.
- DO NOT CROP: Do not cut off the bottom of the trousers or the top of the collar.
- MAXIMIZE SPACE: The outfit should fill the frame but keep a small margin.
- Orientation: Vertical Portrait (9:16 Aspect Ratio). Image must be taller than it is wide.
- If the outfit includes multiple layers (e.g. shirt + jacket), show them layered naturally.

INTEGRATION:
- CLUB LOGO: Left chest, highly visible realistic embroidery or badge.
- SPONSOR: Use provided Sponsor image CENTERED on chest/jacket or on the back (depending on style), realistic heat-press.
- The logo must be clearly recognizable and professionally placed.

STYLE:
- Professional product photography presentation.
- Neutral background (white or light grey).
- Fabric texture must be realistic (wool for suit, knit for sweater, cotton for polo).
- Clean, sharp details — stitching, buttons, zippers clearly visible.
""",
        "parameters_schema": {
            "outfit_style": {
                "label": "Stijl",
                "type": "select",
                "options": ["net_pak", "trainings_sweater", "coltrui", "polo", "windbreaker"],
                "default": "net_pak",
            },
            "outfit_color": {
                "label": "Hoofdkleur",
                "type": "select",
                "options": ["team_primary", "black", "navy", "charcoal", "grey", "team_secondary"],
                "default": "black",
            },
            "accent_color": {
                "label": "Accentkleur",
                "type": "select",
                "options": ["team_secondary", "white", "black", "gold", "silver"],
                "default": "team_secondary",
            },
        },
        "preprocessing_config": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "fullbody_in_tenue",
        "name": "Speler in Tenue (Fullbody)",
        "category": "fullbody",
        "description": "Plaats een persoon in het volledige tenue met voetbalschoenen.",
        "prompt_text": """DRESS this person in the football kit shown in the reference image.

MANDATORY OVERRIDES:
- SLEEVES: {sleeves_label}. If the reference shows different sleeves, IGNORE the reference and use {sleeves_label}.
- POSE: {pose_label}. The player MUST be in this exact pose regardless of the input photo pose.
- ROLE: {role_label}.

KIT FROM REFERENCE (use for colors, patterns, logos, sponsor ONLY):
- Match the EXACT colors, patterns, stripes, and design details from the reference kit
- SAME logo placement and appearance
- SAME sponsor placement and appearance
- DO NOT modify, reinterpret, or "improve" the color scheme or pattern design
- The person should look like they are WEARING this team's kit

PERSON: Use the provided person photo. Preserve their face, hair, skin tone, and body proportions EXACTLY.

EQUIPMENT:
- Football boots (modern style, matching the kit colors from reference).
{role_equipment}

COMPOSITION:
- FULL BODY: Head to toe must be visible. No cropping.
- The person should be standing upright on a flat surface.
- Professional sports photography lighting.
- Background: PURE SOLID COLOR BACKGROUND (single flat color, no gradients, no scenery, no stadium). Use a bright green (#00FF00) or bright blue (#0000FF) chroma-key background so it can be easily removed later.

STYLE:
- High-end professional football player portrait.
- Sharp focus on person, clean edges, no shadows on background.
- Even studio lighting, slight rim light for depth.
- The person must be FULLY SEPARATED from the background (no blending).

FINAL CHECK:
- Does the kit match the reference colors/patterns/logos?
- Are the sleeves {sleeves_label}? (MANDATORY)
- Is the player in this pose: {pose_label}? (MANDATORY)
- Is the full body visible from head to toe?
- Is the background a solid chroma-key color?
""",
        "parameters_schema": {
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
                "options": ["player", "goalkeeper", "coach", "assistant"],
                "default": "player",
            },
        },
        "preprocessing_config": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "closeup_in_tenue",
        "name": "Speler Close-up (In Tenue)",
        "category": "closeup",
        "description": "Close-up portret van speler in tenue, borst en gezicht.",
        "prompt_text": """DRESS this person in the football kit shown in the reference image.

MANDATORY OVERRIDES:
- NECKLINE: {neck_label}. Use this neckline style regardless of what the reference shows.
- EXPRESSION: {expression_label}. The person MUST have this facial expression.

KIT FROM REFERENCE (use for colors, patterns, logos, sponsor ONLY):
- Match the EXACT colors, patterns, stripes, and design details from the reference kit
- SAME logo placement and appearance
- SAME sponsor placement and appearance
- DO NOT modify, reinterpret, or "improve" the color scheme or pattern design

PERSON: Use the provided person photo. Preserve their face, hair, skin tone EXACTLY.

FRAMING:
- Close-up: From MID-CHEST up to top of head. BOTH SHOULDERS must be FULLY visible.
- The head must NEVER be cropped at the top.
- Face, neck, both shoulders, and upper chest clearly visible.
- Club logo on left chest must be visible (as shown in reference kit).
- Sponsor on center chest should be partially visible (as shown in reference kit).

COMPOSITION:
- Professional sports portrait photography.
- Background: PURE SOLID COLOR BACKGROUND (single flat color, no gradients, no scenery). Use bright green (#00FF00) or bright blue (#0000FF) chroma-key background for easy removal.
- Sharp focus on face and upper body.

STYLE:
- High-end player card / media day photography style.
- Natural skin tones, professional even studio lighting.
- Person must be FULLY SEPARATED from the background (clean edges, no shadow bleed).

FINAL CHECK:
- Does the visible kit portion match the reference colors/patterns/logos?
- Is the neckline {neck_label}? (MANDATORY)
- Is the expression: {expression_label}? (MANDATORY)
- Is the background a solid chroma-key color?
- Are both shoulders fully visible?
""",
        "parameters_schema": {
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
        "preprocessing_config": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
    },
    {
        "slug": "member_intro",
        "name": "Speler Intro Video",
        "category": "intro",
        "description": "Genereer een korte intro video (6 sec) van speler in tenue met een karakteristieke pose.",
        "prompt_text": """6-second realistic player intro video. Living portrait style.

The provided image is the FIRST FRAME. Keep the player EXACTLY as shown — same face, hair, skin tone, body, clothing, and kit.
Kit type: {kit_type_label}.

MOVEMENT:
- The player starts in the EXACT pose from the input image.
- Subtle, natural motion only: breathing, slight weight shift, small head turn toward camera.
- Pose action: {style_variant_label}
- The player returns to the EXACT starting pose by the end of the video (seamless loop).
- Movement must be slow, controlled, and realistic. No sudden jerks.

BACKGROUND:
- Plain solid color background (bright green #00FF00 or bright blue #0000FF chroma-key).
- NO stadium, NO pitch, NO scenery, NO environment of any kind.
- The player must be completely isolated against the flat color.

RULES:
- NO visual effects, NO particles, NO lens flares, NO fire, NO lightning, NO glow.
- NO text overlays, NO graphics, NO logos added.
- NO camera movement. Static locked-off camera. The player moves, not the camera.
- Photorealistic quality. Natural lighting. Professional studio setup.
- Full body must remain visible at all times (head to toe, no cropping).
- 9:16 vertical aspect ratio.
""",
        "parameters_schema": {
            "kit_type": {
                "label": "Tenue Type",
                "type": "select",
                "options": ["home", "away", "third"],
                "default": "home",
            },
            "style_variant": {
                "label": "Pose Stijl",
                "type": "select",
                "options": ["arms_crossed", "hand_up", "thumbs_up"],
                "default": "arms_crossed",
            },
        },
        "preprocessing_config": {},
    },
    {
        "slug": "member_goal_celebration",
        "name": "Speler Doelpunt Viering Video",
        "category": "celebration",
        "description": "Genereer een korte viering video (6 sec) van speler met een doelpunt-viering pose.",
        "prompt_text": """6-second realistic goal celebration video.

The provided image is the FIRST FRAME. Keep the player EXACTLY as shown — same face, hair, skin tone, body, clothing, and kit.
Kit type: {kit_type_label}.

MOVEMENT:
- The player starts in the EXACT pose from the input image.
- The player transitions into a celebration: {style_variant_label}
- Expression: joyful, triumphant, natural emotion.
- The movement should be energetic but controlled and realistic.
- The player returns to the STARTING POSE by the final frame (seamless loop back to first frame).
- Full body must remain visible at all times (head to toe, no cropping).

BACKGROUND:
- Plain solid color background (bright green #00FF00 or bright blue #0000FF chroma-key).
- NO stadium, NO pitch, NO scenery, NO crowd, NO environment of any kind.
- The player must be completely isolated against the flat color.

RULES:
- NO visual effects, NO particles, NO confetti, NO lens flares, NO fire, NO glow.
- NO text overlays, NO graphics, NO logos added.
- NO camera movement. Static locked-off camera. The player moves, not the camera.
- NO slow motion. Normal speed, real-time movement.
- Photorealistic quality. Natural lighting. Professional studio setup.
- 9:16 vertical aspect ratio.
""",
        "parameters_schema": {
            "kit_type": {
                "label": "Tenue Type",
                "type": "select",
                "options": ["home", "away", "third"],
                "default": "home",
            },
            "style_variant": {
                "label": "Viering Stijl",
                "type": "select",
                "options": ["arms_wide", "fist_pump", "point_to_sky", "slide"],
                "default": "arms_wide",
            },
        },
        "preprocessing_config": {},
    },
]


def seed_templates(apps, schema_editor):
    """Seed 10 prompt templates from teamreel_prompts.py definitions."""
    GenerationTemplate = apps.get_model("generative", "GenerationTemplate")
    User = apps.get_model("accounts", "User")

    # Get or create a system user for created_by
    system_user, _ = User.objects.get_or_create(
        email="system@teamreel.app",
        defaults={
            "is_staff": True,
            "is_active": True,
        },
    )

    for tmpl in TEMPLATES:
        category = tmpl["category"]
        template_type = CATEGORY_TO_TYPE.get(category, "custom")
        template_subtype = CATEGORY_TO_SUBTYPE.get(category, "")

        GenerationTemplate.objects.update_or_create(
            slug=tmpl["slug"],
            organisation=None,
            version="1.0.0",
            defaults={
                "name": tmpl["name"],
                "description": tmpl["description"],
                "prompt_text": tmpl["prompt_text"],
                "parameters_schema": tmpl["parameters_schema"],
                "preprocessing_config": tmpl["preprocessing_config"],
                "template_type": template_type,
                "template_subtype": template_subtype,
                "input_schema": {"type": "object", "properties": {}},
                "pipeline_config": {"provider": "openai", "model": "gpt-4"},
                "is_active": True,
                "is_latest": True,
                "created_by": system_user,
            },
        )


def reverse_seed(apps, schema_editor):
    """Remove seeded templates."""
    GenerationTemplate = apps.get_model("generative", "GenerationTemplate")
    slugs = [t["slug"] for t in TEMPLATES]
    GenerationTemplate.objects.filter(
        slug__in=slugs,
        organisation__isnull=True,
        version="1.0.0",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("generative", "0009_add_prompt_template_fields"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_templates, reverse_seed),
    ]

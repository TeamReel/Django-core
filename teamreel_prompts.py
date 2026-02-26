"""
TeamReel AI Prompt Templates Library
=====================================

Reusable, parameterized prompt templates for the TeamReel AI generation pipeline.
Each template defines:
  - id: unique slug
  - name: human label
  - category: logo | sponsor | tenue | keeper | tracksuit | coach | fullbody | closeup
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
        "prompt_template": """You are given an uploaded club logo image as input. Your task is to EDIT this exact logo into a clean, standardized brand asset.

CRITICAL: Use the PROVIDED IMAGE as the source. Do NOT invent or generate a new logo. Reproduce the EXACT same logo from the input image.

STEP 1 — ANALYZE THE LOGO TYPE:
Before editing, identify the logo structure: Is it a shield/badge, circle/oval, rectangle, freeform shape, or text-only? Note which areas are INSIDE the logo boundary and which are OUTSIDE (background).

STEP 2 — EDIT INSTRUCTIONS:
1. REMOVE the background OUTSIDE the logo boundary — output must have a {background_description} background.
2. PRESERVE WHITE/LIGHT AREAS INSIDE THE LOGO: Many club logos contain white text (e.g. club name), white fills, or white sections as part of their design. These MUST remain white and fully opaque. For example: a shield with white letters "ASC" inside it — the white text and any white fill area within the badge must stay solid white. Only the area OUTSIDE the logo shape should become transparent.
3. KEEP the logo itself pixel-perfect: preserve ALL original colors, shapes, text, emblems, and details EXACTLY as they appear in the input image.
4. SCALE THE LOGO UP to fill approximately 85-90% of the canvas. The logo must be LARGE and DOMINANT — it should nearly touch the edges. Do NOT leave excessive empty space around it.
5. CENTER the logo precisely on the canvas.
6. Output format: Perfect square (1:1 aspect ratio), high resolution.
7. Style: {style_description}.
8. Clean up any compression artifacts or rough edges around the logo boundary.
9. Do NOT add any decorations, shadows, glows, or effects not present in the original.
10. The result should look like a professional brand asset file ready for print and digital use.

CRITICAL MISTAKES TO AVOID:
- Making the logo too small. The logo MUST be large and fill the canvas.
- Making white parts inside the logo transparent. White text, white badge fills, and white stripes INSIDE the logo shape must remain opaque white.
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
        "prompt_template": """You are given an uploaded sponsor logo image as input. Your task is to EDIT this exact sponsor logo into a clean, standardized brand asset suitable for printing on sportswear.

CRITICAL: Use the PROVIDED IMAGE as the source. Do NOT invent or generate a new logo. Reproduce the EXACT same sponsor logo from the input image.

STEP 1 — ANALYZE THE SPONSOR LOGO TYPE:
Before editing, identify the sponsor logo structure:
- TEXT-ONLY: The logo is purely text/typography (e.g. "JUMBO", "NIKE"). These are often white, black, or coloured letters with no graphic frame around them.
- GRAPHIC + TEXT: A combination of a graphic symbol/icon with text.
- GRAPHIC ONLY: A pure graphic mark (icon, symbol, shape).

STEP 2 — EDIT INSTRUCTIONS:
1. REMOVE the background OUTSIDE the logo — output must have a {background_description} background.
2. PRESERVE ALL CONTENT INSIDE THE LOGO:
   - For TEXT-ONLY logos: keep every letter fully opaque in its original colour. White text must stay solid white. Do NOT make any part of the text transparent.
   - For GRAPHIC + TEXT logos: keep both the graphic and text fully opaque. If there are white elements inside a shape (e.g. white text inside a coloured badge), those white areas must remain solid white.
   - For GRAPHIC ONLY logos: keep the graphic fully opaque. White fills or stripes inside the shape must remain.
3. CENTER the sponsor logo on the canvas and fill approximately 80% of the canvas width.
4. Output format: {orientation_description}.
5. Clean up any compression artifacts or rough edges around the logo boundary.
6. Do NOT add any decorations, shadows, glows, or effects not present in the original.
7. Must be suitable for heat-press printing on fabric.

CRITICAL MISTAKE TO AVOID:
- Making white/light parts of the logo transparent. If the sponsor's brand colour IS white (white text, white icon), those pixels must remain opaque white, not transparent.
""",
    },

    # =========================================================================
    # 2b. LOCATION / STADIUM BACKGROUND STANDARDIZATION
    # =========================================================================
    "location_standardize": {
        "id": "location_standardize",
        "name": "Locatie Achtergrond",
        "category": "location",
        "description": "Zet een voetbalveld/stadion foto om naar portrait formaat voor lineup video en flyer.",
        "input_requirements": ["location"],
        "parameters": {
            "time_of_day": {
                "label": "Tijdstip",
                "type": "select",
                "options": ["as_is", "golden_hour", "evening_lights", "overcast"],
                "default": "as_is",
            },
            "style": {
                "label": "Stijl",
                "type": "select",
                "options": ["realistic", "vibrant", "cinematic"],
                "default": "realistic",
            },
            "pitch_type": {
                "label": "Veldtype",
                "type": "select",
                "options": ["professional", "amateur", "worn"],
                "default": "professional",
            },
        },
        "preprocessing": {
            "location": "pad_portrait_1080",
        },
        "prompt_template": """You are given an uploaded photo of a football field / stadium as input. Your task is to create a PORTRAIT background image of a football pitch for a lineup overlay.

CRITICAL: Use the PROVIDED IMAGE as style/color reference. The output must show a COMPLETE FOOTBALL PITCH.

EDIT INSTRUCTIONS:
1. Output: PORTRAIT orientation (9:16 aspect ratio, 1080x1920).
2. CAMERA ANGLE: Bird's eye / top-down view looking straight down at the pitch. The viewer sees the ENTIRE football field from above.
3. The FULL PITCH must be visible: both goals, both penalty areas, center circle, all lines. The pitch fills the ENTIRE frame from top to bottom.
4. The pitch runs VERTICALLY in the portrait frame (goals at top and bottom).
5. GREEN GRASS must fill the entire image — no sky, no stands, no surrounding area. Just the pitch itself edge-to-edge.
6. White pitch markings (lines, circles, penalty areas) must be clearly visible.
7. Time of day / lighting: {time_of_day_description}.
8. Style: {style_description}.
9. The image will be used as a BACKGROUND for a lineup overlay (player names, photos, formation dots). Keep the surface clean and uniform.
10. Pitch quality: {pitch_type_description}.
11. No text, logos, watermarks, or people on the pitch.
""",
    },

    # =========================================================================
    # 2c. POST-PROCESSING TEMPLATES (bg removal, resize, optimize)
    # =========================================================================
    "logo_postprocess": {
        "id": "logo_postprocess",
        "name": "Logo Bewerken",
        "category": "postprocess",
        "description": "Achtergrond verwijderen en logo optimaliseren voor print en flyers.",
        "input_requirements": ["source"],
        "parameters": {
            "target_size": {
                "label": "Formaat",
                "type": "select",
                "options": ["512", "1024", "2048"],
                "default": "1024",
            },
            "fill_percentage": {
                "label": "Vulling",
                "type": "select",
                "options": ["80", "85", "90", "95"],
                "default": "90",
            },
        },
        "preprocessing": {},
        "prompt_template": """You are given an AI-generated club logo image. Your ONLY task is to clean it up for production use.

STEP-BY-STEP:
1. FIND the logo within the image. Ignore ALL background areas.
2. CROP tightly around the logo — remove ALL empty/transparent/colored space around it. Get the tightest possible bounding box.
3. REMOVE any remaining background — the output MUST have a 100% transparent background (alpha channel). No grey, no white, no checkerboard — FULLY transparent.
4. ENLARGE the cropped logo to fill {fill_percentage}% of a {target_size}x{target_size} square canvas. The logo must be BIG. If the original has lots of empty space, the logo in the output should be MUCH larger than in the input.
5. CENTER the enlarged logo on the canvas.
6. CLEAN edges: remove any halos, fringes, or semi-transparent pixels around the logo boundary. The edge between logo and transparent background must be pixel-sharp.
7. Preserve the logo's colors, shapes, text, and details EXACTLY.
8. Output: {target_size}x{target_size} PNG, transparent background.

COMMON MISTAKE TO AVOID: Do NOT just copy the input at the same size. The logo must FILL the canvas. If the input logo is small within a large image, you must crop it out and scale it UP dramatically.
""",
    },

    "sponsor_postprocess": {
        "id": "sponsor_postprocess",
        "name": "Sponsor Bewerken",
        "category": "postprocess",
        "description": "Achtergrond verwijderen en sponsor logo optimaliseren voor print.",
        "input_requirements": ["source"],
        "parameters": {
            "orientation": {
                "label": "Oriëntatie",
                "type": "select",
                "options": ["landscape", "square"],
                "default": "landscape",
            },
        },
        "preprocessing": {},
        "prompt_template": """You are given an AI-generated sponsor logo image. Your ONLY task is to clean it up for production use on sportswear.

STEP-BY-STEP:
1. FIND the sponsor logo within the image. Ignore ALL background areas.
2. CROP tightly around the logo — remove ALL empty/transparent/colored space.
3. REMOVE any remaining background completely — output MUST have a 100% transparent background (alpha channel).
4. ENLARGE the cropped logo to fill approximately 85% of the canvas width.
5. CENTER the logo on the canvas.
6. CLEAN edges: remove halos, fringes, semi-transparent pixels. The cutout must be pixel-sharp and suitable for heat-press printing on fabric.
7. Preserve ALL original colors, text, and graphic elements EXACTLY.
8. Output format: {orientation_description} with transparent background.

COMMON MISTAKE TO AVOID: Do NOT just copy the input at the same size. Crop out the logo tightly, then enlarge it to fill the canvas.
""",
    },

    "kit_postprocess": {
        "id": "kit_postprocess",
        "name": "Tenue Bewerken",
        "category": "postprocess",
        "description": "Achtergrond verwijderen van tenue en optimaliseren voor flyers.",
        "input_requirements": ["source"],
        "parameters": {
            "output_format": {
                "label": "Resultaat",
                "type": "select",
                "options": ["cutout", "on_mannequin"],
                "default": "cutout",
            },
        },
        "preprocessing": {},
        "prompt_template": """You are given an AI-generated football kit image (shirt + shorts + socks). Your task is to POST-PROCESS it for production use in lineup flyers and matchday graphics.

CRITICAL INSTRUCTIONS:
1. REMOVE the background completely — output MUST have a fully transparent background.
2. Keep the ENTIRE kit visible: full shirt, shorts, and socks. Do NOT crop any part.
3. The kit should fill approximately 85-90% of the canvas height.
4. CENTER the kit vertically on a portrait-oriented canvas.
5. CLEAN UP all artifacts: rough edges, background remnants, shadows, surface texture noise.
6. SHARPEN the boundary: the kit cutout must have crisp, clean edges — no halos or fringing.
7. Preserve all kit details: colors, patterns, logos, sponsor text EXACTLY as in the input.
8. Output: portrait orientation (9:16) with transparent background.
9. Result format: {output_format_description}.
10. The final image should look like a professional product shot suitable for e-commerce or matchday programs.
""",
    },

    "location_postprocess": {
        "id": "location_postprocess",
        "name": "Locatie Bewerken",
        "category": "postprocess",
        "description": "Optimaliseer stadion achtergrond voor lineup en flyers.",
        "input_requirements": ["source"],
        "parameters": {
            "brightness": {
                "label": "Helderheid",
                "type": "select",
                "options": ["darker", "normal", "brighter"],
                "default": "normal",
            },
            "blur_center": {
                "label": "Centrum blur",
                "type": "select",
                "options": ["none", "subtle", "medium"],
                "default": "subtle",
            },
            "pitch_type": {
                "label": "Veldtype",
                "type": "select",
                "options": ["professional", "amateur", "worn"],
                "default": "professional",
            },
        },
        "preprocessing": {},
        "prompt_template": """You are given an AI-generated football pitch background image. Your task is to optimize it for use as a lineup overlay background.

CRITICAL INSTRUCTIONS:
1. The image MUST be PORTRAIT (9:16, 1080x1920).
2. The FULL FOOTBALL PITCH must be visible from a bird's eye / top-down view. Both goals, penalty areas, center circle — the complete field.
3. The pitch runs VERTICALLY (goals at top and bottom of the frame).
4. GREEN GRASS fills the ENTIRE image edge-to-edge. No sky, no stands, no surroundings.
5. Brightness: {brightness_description}.
6. Apply a {blur_center_description} blur to the central area to ensure text/photo readability when lineup is overlaid.
7. Pitch quality: {pitch_type_description}.
8. White pitch lines must be visible but not overpowering.
9. Do NOT add text, logos, or watermarks.
10. The result must work as a clean background for compositing player photos and formation dots on top.
11. Colors should be rich, professional, broadcast-quality.
""",
    },

    "background_standardize": {
        "id": "background_standardize",
        "name": "Achtergrond Standaardiseren",
        "category": "postprocess",
        "description": "Zet een geüploade afbeelding om naar een geoptimaliseerde portrait achtergrond (1080×1920) voor video compositing met spelers.",
        "input_requirements": ["source"],
        "parameters": {},
        "preprocessing": {},
        "prompt_template": """You are given an uploaded image. Transform it into a PORTRAIT background (9:16, 1080x1920px) for a football video where a CUTOUT of a real player will be pasted on top later.

COMPOSITING CONTEXT — HOW THE PLAYER WILL BE PLACED:
- The player cutout shows the person from approximately the KNEES UP (knees, upper legs, hips, torso, arms, shoulders, head).
- The player cutout will be placed in the CENTER-BOTTOM of the frame.
- The player's FEET/SHOES ARE NOT VISIBLE — the cutout starts at roughly knee height.
- The player will occupy approximately the bottom 70-75% of the frame height, centered horizontally.
- The player cutout has a TRANSPARENT background, so whatever is behind it in your output will show through.

LAYOUT REQUIREMENTS (design the background accordingly):
1. The BOTTOM 25-30% of the image should be a clean, relatively uniform area (e.g., grass, floor, ground, blurred surface). This area will be mostly BEHIND the player's legs/torso — it should NOT have strong patterns or distracting details.
2. The MIDDLE 40% (roughly from 30% to 70% height) is where the player's torso will be. Keep this area visually interesting but NOT too busy — no sharp objects, no dominant lines cutting through.
3. The TOP 30% should contain the main "scene" atmosphere (sky, stadium lights, architecture, etc.) — this part will be fully visible above the player's head.
4. The HORIZONTAL CENTER must be clean and free of dominant objects — the player stands there.
5. Make the left and right edges slightly more detailed/interesting since those will remain visible beside the player.

CROPPING & ZOOMING:
6. FILL the entire 1080x1920 canvas — absolutely NO black bars, letterboxing, or empty space.
7. If the source image is landscape or doesn't naturally fill portrait format, ZOOM IN / CROP to select the most interesting section that works as a portrait background. Don't stretch or distort — just pick a compelling crop.
8. Use the uploaded image as the PRIMARY visual source — recompose and enhance it, but keep it recognizable.
VISUAL QUALITY:
9. Apply subtle darkening (10-15%) across the image for text overlay readability.
10. The lighting must feel natural and directional (as if a real person could stand in the scene with consistent shadows).
11. Colors: rich, saturated, broadcast-quality — suitable for sports content.
12. Maintain sharp image quality — no blur, no distortion, no artifacts.
13. Do NOT add any text, logos, watermarks, or people.
14. The result must look like a professional broadcast sports backdrop where a real player photo will be seamlessly composited.
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
                "options": ["long", "short"],
                "default": "long",
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
- Orientation: Vertical Portrait (9:16 Aspect Ratio). Image must be taller than it is wide.

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
    # 3b. LEGACY TENUE (Retro / Historical Kit)
    # =========================================================================
    "legacy_tenue_generate": {
        "id": "legacy_tenue_generate",
        "name": "Legacy Tenue Genereren",
        "category": "tenue",
        "description": "Genereer een retro/legacy tenue gebaseerd op een historisch shirt. Kies een tijdperk voor de stijl.",
        "input_requirements": ["logo", "sponsor", "reference_photo"],
        "parameters": {
            "era_style": {
                "label": "Tijdperk",
                "type": "select",
                "options": ["default", "jaren80", "jaren90", "jaren00"],
                "default": "default",
            },
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
                "default": "collar",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a REALISTIC RETRO / LEGACY football kit layout (Flat Lay Photography) based on the reference shirt.

ERA STYLE: {era_style_description}

KIT FROM REFERENCE (use for colors, badge, sponsor, graphic design ONLY):
- Faithfully reproduce the EXACT color scheme, pattern, stripes, and graphic style of the reference kit.
- Use the reference as the PRIMARY design source — do not modernise or redesign it.
- SAME logo placement as reference (typically left chest).
- SAME sponsor placement as reference.

ERA-SPECIFIC DESIGN RULES:
{era_style_details}

SLEEVES: {sleeves_label}.
NECKLINE: {neck_label}.

COMPOSITION & FRAMING (CRITICAL):
- FULL BODY SHOT: Show ENTIRE shirt, ENTIRE shorts, and complete pair of socks.
- DO NOT CROP: Do not cut off the bottom of the socks or the top of the collar.
- Orientation: Vertical Portrait (9:16 Aspect Ratio).

INTEGRATION:
- LOGO: Use provided Club Logo on LEFT CHEST. Retro embroidery / woven badge style.
- SPONSOR: Use provided Sponsor image on chest. Retro heat-press or embroidery depending on era.

STYLE:
- Vintage sportswear photography aesthetic appropriate for the era.
- Slightly muted color palette (less saturated than modern kits).
- Subtle fabric texture — cotton or nylon weave visible.
- Neutral light background.
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
    # 5b. COACH OUTFIT GENERATION
    # =========================================================================
    "coach_outfit": {
        "id": "coach_outfit",
        "name": "Coach Outfit Genereren",
        "category": "coach",
        "description": "Genereer een coach/trainer outfit (net pak, sweater, coltrui, etc.).",
        "input_requirements": ["logo", "sponsor", "reference_photo"],
        "parameters": {
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
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """Create a REALISTIC football COACH / TRAINER OUTFIT layout (Flat Lay Photography).

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
                "options": ["long", "short"],
                "default": "long",
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
            "shoe_color": {
                "label": "Voetbalschoenen kleur",
                "type": "select",
                "options": ["zwart", "wit", "rood", "blauw", "geel", "oranje", "groen", "roze"],
                "default": "zwart",
            },
        },
        "preprocessing": {
            "logo": "square_pad_512",
            "sponsor": "pad_512_landscape",
        },
        "prompt_template": """DRESS this person in the football kit shown in the reference image.

═══════════════════════════════════════════════════════════
MANDATORY OVERRIDES — These settings OVERRIDE the reference image:
═══════════════════════════════════════════════════════════
- SLEEVES: {sleeves_label}. If the reference shows different sleeves, IGNORE the reference and use {sleeves_label}.
- POSE: {pose_label}. The player MUST be in this exact pose regardless of the input photo pose.
- ROLE: {role_label}.
═══════════════════════════════════════════════════════════

KIT FROM REFERENCE (use for colors, patterns, logos, sponsor ONLY):
- Match the EXACT colors, patterns, stripes, and design details from the reference kit
- SAME logo placement and appearance
- SAME sponsor placement and appearance
- DO NOT modify, reinterpret, or "improve" the color scheme or pattern design
- The person should look like they are WEARING this team's kit

PERSON — FACIAL IDENTITY (HIGHEST PRIORITY):
The face in the output MUST be the SAME PERSON as in the input photo. This is the most critical requirement.
- REPRODUCE the exact facial structure: bone structure, jawline, cheekbones, forehead shape
- REPRODUCE the exact facial features: eyes (shape, color, spacing), nose, mouth, eyebrows EXACTLY
- PRESERVE skin tone, complexion, and any distinguishing features (beard, wrinkles, dimples)
- PRESERVE hair color, hairline, and hairstyle EXACTLY as shown in the input photo
- PRESERVE body build and proportions from the input photo
- DO NOT generate a generic/stock athlete face. The resulting face must be RECOGNISABLE as the specific person in the input photo.
- If in doubt: MATCH THE FACE MORE PRECISELY rather than improve or idealise it.

EQUIPMENT:
- Football boots ({shoe_color_label} colored, modern style).
{role_equipment}

COMPOSITION:
- IMAGE FORMAT: PORTRAIT ORIENTATION — the output image MUST be significantly taller than it is wide (9:16 aspect ratio). Think of a vertical smartphone photo, not a landscape/square one.
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
- Is the image in PORTRAIT orientation (taller than wide, 9:16)? ✓ (MANDATORY)
- Is the face RECOGNISABLE as the specific person from the input photo? ✓ (HIGHEST PRIORITY)
- Does the kit match the reference colors/patterns/logos? ✓
- Are the sleeves {sleeves_label}? ✓ (THIS IS MANDATORY)
- Is the player in this pose: {pose_label}? ✓ (THIS IS MANDATORY)
- Is the full body visible from head to toe? ✓
- Is the background a solid chroma-key color? ✓
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
        "prompt_template": """DRESS this person in the football kit shown in the reference image.

═══════════════════════════════════════════════════════════
MANDATORY OVERRIDES — These settings OVERRIDE the reference image:
═══════════════════════════════════════════════════════════
- NECKLINE: {neck_label}. Use this neckline style regardless of what the reference shows.
- EXPRESSION: {expression_label}. The person MUST have this facial expression.
═══════════════════════════════════════════════════════════

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
- Does the visible kit portion match the reference colors/patterns/logos? ✓
- Is the neckline {neck_label}? ✓ (THIS IS MANDATORY)
- Is the expression: {expression_label}? ✓ (THIS IS MANDATORY)
- Is the background a solid chroma-key color? ✓
- Are both shoulders fully visible? ✓
""",
    },

    # =========================================================================
    # 8. MEMBER SHORT INTRO (5-6 second intro video)
    # =========================================================================
    "member_intro": {
        "id": "member_intro",
        "name": "Speler Intro Video",
        "category": "intro",
        "output_type": "video",  # VIDEO output (6 seconds)
        "description": "Genereer een korte intro video (6 sec) van speler in tenue met een karakteristieke pose.",
        "input_requirements": ["person_photo"],
        "parameters": {
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
        "video_config": {
            "duration_seconds": 6,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",  # Vertical for social media
            "loop": True,  # Start shot == End shot
            "minimax_model": "video-01",
        },
        "prompt_template": """6-second realistic player intro video. Living portrait style.

The provided image is the FIRST FRAME. Keep the player EXACTLY as shown — same face, hair, skin tone, body, clothing, and kit.
Kit type: {kit_type_label}.

OUTFIT CONSISTENCY (CRITICAL — applies to EVERY SINGLE FRAME):
- The kit must be IDENTICAL in every frame from start to finish. No exceptions.
- SLEEVE LENGTH: The sleeve length visible in the input image is FIXED. If the input shows short sleeves, every frame must have short sleeves. If the input shows long sleeves, every frame must have long sleeves. The sleeve length MUST NOT change at any point in the video.
- SHIRT COLORS AND PATTERNS: The shirt colors, stripes, badges, and sponsor logos must remain 100% consistent across all frames.
- SHORTS: Same color and length in every frame.
- SOCKS: Same color and height in every frame.
- BOOTS: Same color and style in every frame.
- Any deviation in clothing between frames is FORBIDDEN.

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
    },

    # =========================================================================
    # 9. MEMBER GOAL CELEBRATION (5-6 second celebration video)
    # =========================================================================
    "member_goal_celebration": {
        "id": "member_goal_celebration",
        "name": "Speler Doelpunt Viering Video",
        "category": "celebration",
        "output_type": "video",  # VIDEO output (6 seconds)
        "description": "Genereer een korte viering video (6 sec) van speler met een doelpunt-viering pose.",
        "input_requirements": ["person_photo"],
        "parameters": {
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
        "video_config": {
            "duration_seconds": 6,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",  # Vertical for social media
            "minimax_model": "video-01",
        },
        "prompt_template": """6-second realistic goal celebration video.

The provided image is the FIRST FRAME. Keep the player EXACTLY as shown — same face, hair, skin tone, body, clothing, and kit.
Kit type: {kit_type_label}.

OUTFIT CONSISTENCY (CRITICAL — applies to EVERY SINGLE FRAME):
- The kit must be IDENTICAL in every frame from start to finish. No exceptions.
- SLEEVE LENGTH: The sleeve length visible in the input image is FIXED. If the input shows short sleeves, every frame must have short sleeves. If the input shows long sleeves, every frame must have long sleeves. The sleeve length MUST NOT change at any point in the video.
- SHIRT COLORS AND PATTERNS: The shirt colors, stripes, badges, and sponsor logos must remain 100% consistent across all frames.
- SHORTS: Same color and length in every frame.
- SOCKS: Same color and height in every frame.
- BOOTS: Same color and style in every frame.
- Any deviation in clothing between frames is FORBIDDEN.

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
    },

    # =========================================================================
    # 10. THEN VS NOW — SIDE BY SIDE (6-second video)
    # =========================================================================
    "then_vs_now_sidebyside": {
        "id": "then_vs_now_sidebyside",
        "name": "Then vs Now (Naast Elkaar)",
        "category": "then_vs_now",
        "output_type": "video",
        "description": "6 seconden portretvideo: legacyfoto (links) en huidige speler (rechts) naast elkaar. Ze kijken naar elkaar en lachen.",
        "input_requirements": ["person_photo", "reference_photo"],
        "parameters": {},
        "video_config": {
            "duration_seconds": 6,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",
            "loop": True,
            "minimax_model": "video-01",
            "composite_mode": "side_by_side",  # Pipeline preprocessing flag
        },
        "prompt_template": """6-second side-by-side "Then vs Now" portrait video. Two versions of the SAME person standing next to each other.

The provided image is the FIRST FRAME showing TWO people side by side:
- LEFT person: the younger / legacy version (old photo)
- RIGHT person: the current / present-day version

IDENTITY (CRITICAL):
- Both people are the SAME person at different ages. Keep their facial features consistent.
- LEFT person clothing stays EXACTLY as shown in the input image throughout the entire video.
- RIGHT person clothing stays EXACTLY as shown in the input image throughout the entire video.
- NO clothing changes. NO appearance changes. What they wear in frame 1 is what they wear in the last frame.

MOVEMENT SEQUENCE (must be precise):
1. FRAMES 0-1s: Both stand facing the camera, looking straight ahead. Neutral expression. Minimal movement (natural breathing only).
2. FRAMES 1-2.5s: They slowly turn their heads to look at EACH OTHER. Left person turns head RIGHT. Right person turns head LEFT. Their eyes meet.
3. FRAMES 2.5-4s: They begin to smile, then laugh together. Natural, genuine laughter. Their bodies can shift slightly toward each other. Keep it subtle and warm.
4. FRAMES 4-5.5s: Still laughing/smiling, they slowly turn their heads back to face the camera.
5. FRAMES 5.5-6s: Both face forward again with a warm smile. Return to near-starting pose for seamless loop.

BACKGROUND:
- Plain solid color background (bright green #00FF00 or bright blue #0000FF chroma-key).
- NO stadium, NO environment, NO scenery of any kind.
- Both people must be completely isolated against the flat color.

RULES:
- NO visual effects, NO particles, NO lens flares, NO glow, NO transitions.
- NO text overlays, NO graphics, NO logos added.
- NO camera movement. Static locked-off camera.
- Photorealistic quality. Natural lighting. Professional studio setup.
- Both people must remain fully visible at all times (head to at least mid-thigh, no cropping).
- 9:16 vertical aspect ratio.
- Movement is slow, natural, and controlled. No sudden jerks.
""",
    },

    # =========================================================================
    # 11. THEN VS NOW — TRANSFORMATION (4-second video)
    # =========================================================================
    "then_vs_now_transformation": {
        "id": "then_vs_now_transformation",
        "name": "Then vs Now (Transformatie)",
        "category": "then_vs_now",
        "output_type": "video",
        "description": "4 seconden portretvideo: de speler transformeert van legacy-look naar huidige look in tenue.",
        "input_requirements": ["person_photo", "reference_photo"],
        "parameters": {
            "style_variant": {
                "label": "Transformatie Stijl",
                "type": "select",
                "options": ["hands_on_head", "spin", "clap", "jersey_pull", "arms_wide", "fist_pump", "snap"],
                "default": "hands_on_head",
            },
        },
        "video_config": {
            "duration_seconds": 4,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",
            "loop": False,
            "minimax_model": "MiniMax-Hailuo-02",  # FL2V: only this model supports first+last frame
            "composite_mode": "first_last_frame",  # Pipeline preprocessing flag
        },
        "prompt_template": """4-second realistic transformation video. One person morphs from their old appearance to their current appearance.

The provided image is the FIRST FRAME showing the person in their OLD / legacy appearance.

TRANSFORMATION SEQUENCE (must be precise):
1. FRAMES 0-0.5s: The person stands still, looking at the camera. Old appearance exactly as shown in the input image.
2. FRAMES 0.5-1.5s: {style_variant_label}
3. FRAMES 1.5-3s: During this gesture/motion, a smooth realistic transformation happens:
   - Clothing morphs and changes color to modern football kit
   - The person visibly ages/matures slightly (if the legacy photo shows a younger version)
   - Hair may update to current style
   - The transformation should feel magical but REALISTIC — like a time-lapse, NOT like a cartoon or glitch effect
4. FRAMES 3-4s: The person completes the gesture, now in their CURRENT / modern appearance. They look at themselves briefly (looking down at their new kit), then look up at the camera with a big proud smile.

BACKGROUND:
- Plain solid color background (bright green #00FF00 or bright blue #0000FF chroma-key).
- NO stadium, NO environment, NO scenery of any kind.
- The person must be completely isolated against the flat color.

RULES:
- NO visual effects like sparkles, fire, lightning, lens flares. The transformation should be SMOOTH and REALISTIC, like morphing.
- NO text overlays, NO graphics, NO logos added.
- NO camera movement. Static locked-off camera. The person moves, not the camera.
- Photorealistic quality. Natural lighting. Professional studio setup.
- Full body must remain visible at all times (head to toe, no cropping).
- 9:16 vertical aspect ratio.
- The transformation is the ONLY "magical" element — everything else must look real.
""",
    },

    # =========================================================================
    # 12. PHOTO COMPOSITE — GEMINI (image: realistic composite of 2 players on bg)
    # =========================================================================
    "photo_composite_gemini": {
        "id": "photo_composite_gemini",
        "name": "Foto Composite (Gemini)",
        "category": "photo_composite",
        "output_type": "image",
        "description": "AI-composiet: twee versies van dezelfde speler (legacy + current) realistisch op een achtergrond geplaatst.",
        "input_requirements": ["person_photo", "reference_photo", "background"],
        "parameters": {},
        "prompt_template": """Create a photorealistic composite image in PORTRAIT orientation (9:16, 1080x1920px).

TASK:
Generate a MEDIUM SHOT (Waist-Up Portrait) of two football players standing side-by-side on the provided background.
Imagine this is a cover photo for a magazine or a hero image for a website.

COMPOSITION & FRAMING:
- **Shot Type:** classic waist-up medium shot.
- **Framing:** The top of the frame should be slightly above their heads. The BOTTOM of the frame must cut off exactly at their waists.
- **Scale:** The players should dominate the frame. They should appear large and powerful.
- **Positioning:**
    - Player 1 (Legacy) on the LEFT.
    - Player 2 (Current) on the RIGHT.
    - They stand close (shoulder-to-shoulder distance), creating a unified team feeling.

CRITICAL - NO LEGS VISIBLE:
- The image MUST end at the waist line.
- Do NOT generate legs, knees, or feet.
- If the model tries to generate legs, CROP them out. The output image height (1920px) represents the view from slightly above the head down to the waist ONLY.
- There should be NO ground visible at the bottom edge, only the players' jerseys/kits at the waist level.

REALISM & LIGHTING:
- Match the lighting of the background scene perfectly.
- Soft, cinematic lighting on the faces.
- Realistic shadows and depth.
- The players must look integrated into the environment, not just pasted on top.

PRESERVE IDENTITY:
- Use the EXACT faces provided in the source images. Do NOT change facial features.
- Use the EXACT kits/uniforms provided.
- Maintain the source image poses.

OUTPUT:
- A single 1080x1920 portrait image.
- Photorealistic quality.
- No text, graphics, or overlays.
""",
    },

    # =========================================================================
    # 12b. WALKING COMPOSITE — FAR IMAGE (Gemini: players far/background)
    # =========================================================================
    "walking_composite_far": {
        "id": "walking_composite_far",
        "name": "Walking Composite (Ver)",
        "category": "walking_composite",
        "output_type": "image",
        "description": "AI-composiet: twee full-body spelers (legacy + current) op afstand geplaatst op de achtergrond.",
        "input_requirements": ["person_photo", "reference_photo", "background"],
        "parameters": {},
        "prompt_template": """Create a photorealistic composite image in PORTRAIT orientation (9:16, 1080x1920px).

TASK:
Place two full-body football players walking towards the camera on the background image.
They should appear to be IN THE BACKGROUND — at a distance of roughly 15-20 meters from the camera.
This is the STARTING FRAME of a walking video: they are far away and will walk towards the camera.

COMPOSITION:
- The background fills the entire frame (portrait 9:16). Every pixel must be covered.
- Player 1 (Legacy kit) on the LEFT. Player 2 (Current kit) on the RIGHT.
- Players should be SMALL in the frame — approximately 40-50% of the image height.
- They should be standing on the ground/surface realistically (feet touching ground, correct perspective).
- Players should be vertically centered or slightly lower in the frame.
- There should be natural space/environment above and around them (sky, buildings, stadium).
- Both players are mid-stride walking forward (toward the camera), weight on one foot.

REALISM:
- Match the lighting, color temperature, and perspective of the background perfectly.
- Players must look like they BELONG in the scene — correct shadows on the ground.
- The distance should feel natural — they are far away but clearly recognizable.
- Atmospheric perspective: slight reduction in contrast/saturation due to distance.
- Both players fully visible: head to feet.

PRESERVE IDENTITY:
- Use the EXACT faces from the source images.
- Use the EXACT kits/uniforms from the source images.
- Full body visible (head to feet, including shoes/boots).

OUTPUT:
- A single 1080x1920 portrait image.
- Photorealistic quality.
- No text, graphics, or overlays.
""",
    },

    # =========================================================================
    # 12c. WALKING COMPOSITE — NEAR IMAGE (Gemini: players near/foreground)
    # =========================================================================
    "walking_composite_near": {
        "id": "walking_composite_near",
        "name": "Walking Composite (Dichtbij)",
        "category": "walking_composite",
        "output_type": "image",
        "description": "AI-composiet: twee full-body spelers (legacy + current) op de voorgrond geplaatst op de achtergrond.",
        "input_requirements": ["person_photo", "reference_photo", "background"],
        "parameters": {},
        "prompt_template": """Create a photorealistic composite image in PORTRAIT orientation (9:16, 1080x1920px).

TASK:
Place two full-body football players on the background image.
They should appear to be IN THE FOREGROUND — close to the camera, roughly 3-5 meters away.
This is the ENDING FRAME of a walking video: they have walked close to the camera.

COMPOSITION:
- The background fills the entire frame (portrait 9:16). Every pixel must be covered.
- Player 1 (Legacy kit) on the LEFT. Player 2 (Current kit) on the RIGHT.
- Players should be LARGE in the frame — approximately 85-90% of the image height.
- Full body visible: top of head near the top edge.
- CRITICAL: Players' feet MUST be anchored to the very BOTTOM EDGE of the image. Their soles/boots should be AT or within 2% of the bottom pixel row. There must be NO empty space or gap below the players' feet.
- Players must stand ON the ground surface of the background (grass, pitch, floor). Their feet blend naturally with the ground — no floating, no hovering, no visible gap between soles and surface.
- Small gap between them (shoulder width apart).
- Both players facing the camera, mid-stride walking, confident pose.

REALISM:
- Match the lighting, color temperature, and perspective of the background perfectly.
- Players must look integrated into the environment — correct shadows under feet, proper depth.
- Ground contact is essential: feet press into the surface with natural shadow contact.
- Close-up means more detail visible on faces and kits.
- Natural shallow depth of field — background slightly softer than players.
- Both players fully visible: head to feet.

PRESERVE IDENTITY:
- Use the EXACT faces from the source images (same as the "far" image).
- Use the EXACT kits/uniforms from the source images.
- Full body visible (head to feet, including shoes/boots).
- Same players, same kits, same poses — just CLOSER to the camera.

OUTPUT:
- A single 1080x1920 portrait image.
- Photorealistic quality.
- No text, graphics, or overlays.
""",
    },

    # =========================================================================
    # 12d. WALKING COMPOSITE — VIDEO (MiniMax: far→near walking animation)
    # =========================================================================
    "walking_composite_video": {
        "id": "walking_composite_video",
        "name": "Walking Composite Video",
        "category": "walking_composite",
        "output_type": "video",
        "description": "6 seconden video: twee spelers lopen langzaam naar de camera toe (ver → dichtbij).",
        "input_requirements": ["person_photo", "reference_photo"],
        "parameters": {},
        "video_config": {
            "duration_seconds": 6,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",
            "loop": False,
            "minimax_model": "MiniMax-Hailuo-02",
            "composite_mode": "first_last_frame",
        },
        "prompt_template": """A cinematic 6-second portrait video of two football players walking slowly towards the camera.

The FIRST FRAME shows two players far away in the background, walking forward.
The LAST FRAME shows the same two players up close in the foreground.

MOVEMENT:
- Both players walk SLOWLY and CONFIDENTLY toward the camera.
- They walk in sync, side by side, maintaining the same gap between them.
- Player on the LEFT stays on the left. Player on the RIGHT stays on the right.
- Walking is natural and athletic — like a hero entrance in a sports documentary.
- The players grow larger in the frame as they approach.

TIMING:
1. 0-1s: Players are far away, small in the frame. They begin walking forward.
2. 1-3s: Steady walk toward camera. They grow noticeably larger.
3. 3-5s: They are now close, filling most of the frame.
4. 5-6s: They reach the foreground, large and imposing. Final pose facing camera.

RULES:
- NO camera movement. Static locked-off camera. Only the players move.
- Both players visible at ALL times (no one walks out of frame).
- Background stays consistent throughout the walk.
- Walking motion is smooth, steady, and realistic — no jerky movements.
- Photorealistic quality. Cinematic lighting.
- 9:16 vertical aspect ratio.
- NO text, NO graphics, NO visual effects, NO overlays.
""",
    },

    # =========================================================================
    # 13. PHOTO COMPOSITE — VIDEO (MiniMax: 6s video from composite image)
    # =========================================================================
    "photo_composite_video": {
        "id": "photo_composite_video",
        "name": "Foto Composite Video",
        "category": "photo_composite",
        "output_type": "video",
        "description": "6 seconden video van de Gemini-composiet: spelers kijken naar elkaar, lachen, kijken terug. Greenscreen background.",
        "input_requirements": ["person_photo"],
        "parameters": {},
        "video_config": {
            "duration_seconds": 6,
            "fps": 30,
            "resolution": "1080p",
            "aspect_ratio": "9:16",
            "loop": True,
            "minimax_model": "video-01",
            "composite_mode": None,  # No preprocessing — single image input
        },
        "prompt_template": """A cinematic 6-second portrait video of two football players standing side by side.

The provided image shows the FIRST FRAME: two people standing next to each other in football kits.
- The LEGACY player (older photo) is on the LEFT side of the frame.
- The CURRENT player (recent photo) is on the RIGHT side of the frame.
- There is a small gap between them — they are NOT touching.

CRITICAL — WHAT MOVES:
- ONLY the HEAD rotates. The head pivots on the neck axis (like turning to look at someone).
- The neck stays straight and upright. Do NOT tilt the neck forward, backward, or sideways.
- The shoulders, body, and torso remain COMPLETELY STILL. No leaning.
- The players do NOT move closer to each other. They do NOT touch at any point.

HEAD ROTATION DIRECTION:
- LEFT person: Head rotates to the RIGHT (chin moves right, toward center of frame).
- RIGHT person: Head rotates to the LEFT (chin moves left, toward center of frame).
- They look AT EACH OTHER. Both heads turn INWARD toward the center.

MOVEMENT SEQUENCE:
1. 0-1.5s: Both face camera. Neutral expression. Still pose. Natural breathing only.
2. 1.5-3s: Heads SLOWLY rotate toward each other. Only head pivots — neck stays vertical. Eyes meet in the middle.
3. 3-4.5s: While looking at each other, a gentle smile appears. Smile grows into a warm, natural laugh. Shoulders stay still — only facial expression changes.
4. 4.5-5.5s: Heads SLOWLY rotate back to face camera. Still smiling softly.
5. 5.5-6s: Both face forward with content smile. Return to starting pose for loop.

REALISM RULES:
- Head rotation is natural and subtle (about 45 degrees, not exaggerated).
- Neck remains straight and vertical throughout — no bending or tilting.
- Bodies frozen in place — no swaying, no leaning, no shoulder movement.
- The gap between players stays constant — they never touch or get closer.
- Laughter is genuine but subtle — mouth opens slightly, eyes crinkle.

BACKGROUND:
- Keep the background from the input image exactly as-is. Do NOT change it.
- Players remain in their exact positions from frame 1.

STRICT RULES:
- NO visual effects, NO particles, NO glow, NO transitions.
- NO text, NO graphics, NO logos added.
- NO camera movement. Static locked-off camera.
- Photorealistic quality. Natural lighting.
- Both people fully visible at all times.
- Movement is slow, controlled, natural. No jerky or fast motion.
- 9:16 vertical aspect ratio.
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
        "hoodie": "Hooded tracksuit style with drawstring hood.",
        "realistic": "Realistic, true-to-life photographic quality.",
        "vibrant": "Vibrant, saturated colors for a punchy, eye-catching look.",
        "cinematic": "Cinematic, dramatic look with rich contrast and depth.",
    },
    "pitch_type": {
        "professional": "PROFESSIONAL, pristine pitch — perfectly maintained, even grass, crisp mowing stripes, Eredivisie/Champions League quality surface.",
        "amateur": "AMATEUR club field — slightly uneven grass, some patches thinner or slightly different shade, a few worn areas near the goals and center circle, realistic recreational-level pitch. NOT a disaster, just clearly not a top-tier stadium.",
        "worn": "HEAVILY WORN amateur pitch — visible bare/brown patches, uneven surface, muddy goal areas, sparse grass in high-traffic zones. A real Sunday league field after a rainy season.",
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
        "vertical_stripes": "VERTICAL STRIPES — alternating colored vertical stripes down the shirt.",
        "horizontal_hoops": "HORIZONTAL HOOPS — horizontal bands/stripes across the shirt.",
        "diagonal_sash": "DIAGONAL SASH — a bold diagonal stripe across the chest.",
        "half_half": "HALF & HALF — shirt split vertically into two distinct colors.",
        "pinstripes": "PINSTRIPES — thin, subtle vertical pinstripes.",
        "subtle_graphic": "SUBTLE GRAPHIC — a modern tonal graphic/texture pattern (e.g. geometric, camo-like).",
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
        "net_pak": "FORMAL SUIT (Net Pak) — tailored blazer/sport coat + dress trousers, professional touchline look",
        "trainings_sweater": "TRAINING SWEATER — half-zip or quarter-zip training top + training trousers, athletic coaching look",
        "coltrui": "TURTLENECK (Coltrui) — elegant turtleneck/rollneck sweater + trousers, sophisticated touchline style",
        "polo": "POLO SHIRT — professional polo shirt + chinos/dress trousers, smart-casual coaching look",
        "windbreaker": "WINDBREAKER — lightweight rain/wind jacket + training trousers, all-weather coaching gear",
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
        # Intro poses — subtle, controlled movements
        "arms_crossed": "The player slowly crosses both arms over their chest, standing tall with a confident powerful stance. Chin slightly raised.",
        "hand_up": "The player slowly raises one hand in a greeting wave toward the camera, friendly and approachable. Small natural smile.",
        "thumbs_up": "The player gives a thumbs up with one hand toward the camera, positive and confident. Slight nod.",
        # Goal celebration poses — more energetic but still controlled
        "arms_wide": "The player spreads both arms wide open to the sides, triumphant celebration. Looks up briefly then back to camera.",
        "fist_pump": "The player pumps one fist into the air with intensity, powerful celebration. Other arm bent at side.",
        "point_to_sky": "The player points to the sky with one index finger, emotional dedication gesture. Other hand on chest.",
        "slide": "The player drops to both knees in a knee slide, arms spread wide. Then stands back up to starting position.",
        # Transformation poses — gesture triggers the then-vs-now morph
        "hands_on_head": "The person raises both hands and places them on their head (like a surprised/amazed gesture). Expression shifts to excitement and wonder.",
        "spin": "The person does a slow 360-degree spin, turning away from the camera and back. The transformation happens mid-spin as the person turns back to face the camera.",
        "clap": "The person claps both hands together once, hard and decisive. The clap triggers the transformation. Arms then lower to reveal the new appearance.",
        "jersey_pull": "The person grabs the front of their shirt/jersey with both hands and pulls it outward proudly. The clothing morphs in their grip as the transformation happens.",
        "snap": "The person raises one hand and snaps their fingers dramatically. The snap triggers the transformation. Confident, cool demeanor throughout.",
    },
    "time_of_day": {
        "as_is": "Keep the original lighting and time of day as-is from the photo.",
        "golden_hour": "Golden hour lighting — warm sunset tones, long shadows, orange/amber sky.",
        "evening_lights": "Evening with stadium floodlights on — dramatic lighting, darker sky, bright artificial field lights.",
        "overcast": "Overcast/cloudy day — soft, diffused, even lighting without harsh shadows.",
    },
    # Postprocess parameters
    "target_size": {
        "512": "512x512 pixels",
        "1024": "1024x1024 pixels",
        "2048": "2048x2048 pixels",
    },
    "fill_percentage": {
        "80": "80",
        "85": "85",
        "90": "90",
        "95": "95",
    },
    "output_format": {
        "cutout": "Clean product-style cutout on transparent background.",
        "on_mannequin": "Displayed on an invisible mannequin / ghost mannequin for a 3D look.",
    },
    "brightness": {
        "darker": "Slightly DARKER — darken the overall image for better text contrast overlay.",
        "normal": "NORMAL brightness — keep as-is.",
        "brighter": "Slightly BRIGHTER — lighten the image for a fresh, daytime look.",
    },
    "blur_center": {
        "none": "No blur — keep the center area sharp.",
        "subtle": "Subtle, gentle depth-of-field blur in the center area for text readability.",
        "medium": "Medium gaussian blur in the center area — names and stats will overlay here.",
    },
    "era_style": {
        "jaren80": "1980s retro era — thick cotton, boxy fit, bold chest stripe, early sponsor iron-on",
        "jaren90": "1990s retro era — nylon/polyester, bold geometric prints, oversized cut, large sponsor",
        "jaren00": "2000s retro era — lightweight mesh, subtle tonal pattern, slim raglan sleeves, V-neck",
        "default": "Classic retro football kit, era unspecified",
    },
    "shoe_color": {
        "zwart": "BLACK",
        "wit": "WHITE",
        "rood": "RED",
        "blauw": "BLUE",
        "geel": "YELLOW",
        "oranje": "ORANGE",
        "groen": "GREEN",
        "roze": "PINK",
    },
}

ROLE_EQUIPMENT = {
    "player": "- Football boots (modern style).",
    "goalkeeper": "- Football boots (modern style).\n- Goalkeeper gloves (matching team colors).",
    "coach": "- Training shoes / sneakers (no football boots).\n- Optional: whistle on lanyard, stopwatch.",
    "assistant": "- Training shoes / sneakers (no football boots).",
}

# Coach outfit style-specific prompt details
OUTFIT_STYLE_DETAILS = {
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

# Era-style design rules injected into legacy_tenue_generate prompt
ERA_STYLE_DETAILS: dict[str, str] = {
    "jaren80": """- FABRIC: Thick heavy cotton or early synthetic.
  - FIT: Boxy, loose fit (NOT slim or tapered).
  - SLEEVES: Wide-cut, set-in sleeves.
  - PATTERNS: Bold single or double horizontal chest stripe, or plain block color.
  - SPONSOR: Large iron-on or screen-printed block text. No fine detail.
  - COLLAR: Round crew neck or wide spread polo collar. No modern V-cuts.
  - SOCKS: Long over-the-knee socks, ribbed finish.
  - SHORTS: High-waisted, shorter inseam, straight cut.""",
    "jaren90": """- FABRIC: Lightweight nylon or early wicking polyester with visible weave texture.
  - FIT: Slightly oversized through body and sleeves.
  - PATTERNS: Bold geometric prints, zig-zags, diagonal blocks, abstract multi-color.
  - SPONSOR: Large high-contrast screen print across chest.
  - COLLAR: Varying — polo collar, mandarin/band collar, or ribbed crew neck. Often with tonal stripe.
  - SOCKS: Mid-calf to over-the-knee, ribbed with color-band at top.
  - SHORTS: Knee-length or just above, slightly baggy, elasticated waist.""",
    "jaren00": """- FABRIC: Lightweight mesh or micro-polyester, slightly shiny finish.
  - FIT: Slim through body, shorter sleeves.
  - PATTERNS: Subtle tonal all-over print, pinstripes, or shadow patterns.
  - SLEEVES: Tight-set raglan sleeves with tonal piping.
  - SPONSOR: Embroidered or heat-pressed with detail. Often smaller and cleaner than 90s.
  - COLLAR: V-neck standard, some with small trim collar.
  - SOCKS: Standard mid-calf length, thin ribbing.
  - SHORTS: Slim mid-length, small side vents.""",
    "default": "",
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

    # Outfit style details (for coach_outfit)
    outfit_style = params.get("outfit_style", "net_pak")
    replacements["outfit_style_details"] = OUTFIT_STYLE_DETAILS.get(outfit_style, "")

    # Era style details (for legacy_tenue_generate)
    era_style = params.get("era_style", "default")
    replacements["era_style_details"] = ERA_STYLE_DETAILS.get(era_style, "")

    # Extra context
    if extra_context:
        replacements.update(extra_context)

    # Apply replacements
    for key, value in replacements.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))

    # Team-level kit generation: preserve the reference kit exactly, only add sponsor
    is_team_level = params.get("team_level", "").strip().lower() in ("true", "1", "yes")
    if is_team_level and template_id in ("tenue_generate", "legacy_tenue_generate", "keeper_tenue"):
        prompt += "\n\nTEAM-LEVEL PRESERVATION (HIGHEST PRIORITY):"
        prompt += "\n- This is a TEAM-LEVEL generation. The reference photo shows the CLUB kit."
        prompt += "\n- You MUST reproduce the reference kit EXACTLY: same colors, same pattern, same shorts, same socks. Do NOT alter ANY design element."
        prompt += "\n- The ONLY change allowed is adding the provided SPONSOR logo to the chest area."
        prompt += "\n- If there is no sponsor provided, reproduce the kit 100% identically."
        prompt += "\n- Do NOT reinterpret, modernize, or creatively alter the original kit design in any way."

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

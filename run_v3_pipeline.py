"""
TeamReel V3 Pipeline: High-Fidelity Kit Generation
==================================================

Goal: Generate a minimalist football kit where the Logo and Sponsor match the input references as closely as possible.

Strategy:
1. FORENSIC ANALYSIS (Gemini 2.5 Pro):
   - Extract kit structure (Colors, Sleeves, Collar) from 'actie.png'
   - Analyze Logo structure (Shape, Text, Iconography, Colors) from 'logo.png'
   - Analyze Sponsor structure (Font style, Graphic elements, Colors) from 'sponsor.png'

2. SYNTHESIS (Imagen 4 Ultra / Gemini 3):
   - Generate the kit with specific instructions to recreate the graphical elements.
"""

import os
import sys
import json
from pathlib import Path

# Paths
INPUT_DIR = Path("asc/input")
OUTPUT_DIR = Path("asc/output_v3")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ install google-genai first")
    sys.exit(1)

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def load_image(path):
    with open(path, "rb") as f:
        return f.read()

# =============================================================================
# STAGE 1: COMPONENT ANALYSIS
# =============================================================================
def analyze_components():
    print("\n🧐 STAGE 1: Forensic Component Analysis")
    print("-" * 50)

    actie_bytes = load_image(INPUT_DIR / "actie.png")
    logo_bytes = load_image(INPUT_DIR / "logo.png")
    sponsor_bytes = load_image(INPUT_DIR / "sponsor.png")

    print("   🔍 Analyzing Kit, Logo, and Sponsor...")

    prompt = """You are a Senior Graphic Designer. Analyze these three images to create a manufacturing specification.

    IMAGE 1: Action Photo (Reference for Kit Construction)
    IMAGE 2: Club Logo (Reference for Badge)
    IMAGE 3: Sponsor Logo (Reference for Commercial Print)

    Output a strictly valid JSON object with detailed visual descriptions:
    {
        "kit_construction": {
            "shirt_base_color": "exact color",
            "collar_style": "crew, v-neck, polo",
            "collar_color": "color",
            "sleeve_type": "long/short",
            "sleeve_detail": "cuffs colors, stripe details",
            "shorts_color": "color",
            "socks_color": "color"
        },
        "club_logo_visuals": {
             "shape": "shield, round, crest...",
             "background_color": "color",
             "foreground_elements": "describe symbols/icons roughly",
             "text_content": "exact text visible",
             "text_color": "color",
             "border_color": "color"
        },
        "sponsor_visuals": {
             "text_content": "exact text",
             "font_style": "serif, sans-serif, script, handwritten...",
             "text_color": "color",
             "graphic_icon_description": "describe any leaf, ball, shape next to text",
             "layout": "text beside icon, text below icon..."
        }
    }
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash", # Flash is consistent for JSON extraction
        contents=types.Content(
            parts=[
                types.Part(text=prompt),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=actie_bytes)),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_bytes)),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=sponsor_bytes)),
            ]
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    try:
        data = json.loads(response.text)
        print("   ✅ Analysis Complete.")
        print(json.dumps(data, indent=2))
        return data
    except json.JSONDecodeError:
        print("   ❌ Failed to parse JSON analysis.")
        return None

# =============================================================================
# STAGE 2: HIGH-FIDELITY GENERATION
# =============================================================================
def generate_high_fidelity_kit(specs):
    print("\n🎨 STAGE 2: High-Fidelity Generation")
    print("-" * 50)

    if not specs:
        print("   ❌ Skipping generation due to analysis failure.")
        return

    # Constructing a hyper-descriptive prompt

    kit = specs['kit_construction']
    logo = specs['club_logo_visuals']
    sponsor = specs['sponsor_visuals']

    prompt = f"""Create a FLAT LAY vector illustration of a football kit.

    BASE KIT STRUCTURE:
    - Shirt: {kit['shirt_base_color']} with {kit['sleeve_type']} sleeves.
    - Accents: {kit['collar_color']} {kit['collar_style']} collar. {kit['sleeve_detail']}.
    - Shorts: {kit['shorts_color']}.
    - Socks: {kit['socks_color']}.

    GRAPHIC OVERLAYS (Must Match Descriptions):

    1. CLUB BADGE (Left Chest):
       - Shape: {logo['shape']}
       - Colors: {logo['background_color']} background with {logo['border_color']} border.
       - Content: Text "{logo['text_content']}" in {logo['text_color']}. {logo['foreground_elements']}.
       - Style: Clean vector crest.

    2. SPONSOR PRINT (Center Chest):
       - Text: "{sponsor['text_content']}"
       - Font: {sponsor['font_style']}
       - Color: {sponsor['text_color']}
       - Icon: {sponsor['graphic_icon_description']}
       - Arrangement: {sponsor['layout']}

    VISUAL STYLE:
    - Flat Lay perspective (shirt center, shorts below, socks sides).
    - Minimalist Vector Art style.
    - Zero gradients, zero shadows. Flat solid colors.
    - Pure White Background.
    - High contrast, crisp lines.
    """

    print("   🤖 Prompting Gemini 3 Pro Image Preview (Best for instruction following)...")

    # Test 1: Gemini 3 Pro Image (Usually follows complex prompts best)
    try:
        response = client.models.generate_content(
            model='gemini-3-pro-image-preview',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'],
            )
        )

        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    out = OUTPUT_DIR / 'kit_v3_gemini3.png'
                    with open(out, 'wb') as f:
                        f.write(part.inline_data.data)
                    print(f'   ✅ Saved: {out}')
        else:
            print("   ❌ No image produced by Gemini 3")

    except Exception as e:
        print(f"   ❌ Gemini 3 Error: {e}")

    # Test 2: Imagen 4 Ultra (Best for photorealism/detail, checking if it handles vector style well)
    print("\n   🤖 Prompting Imagen 4 Ultra (Best for detail)...")
    try:
        response = client.models.generate_images(
            model='imagen-4.0-ultra-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio='4:3',
                safety_filter_level='BLOCK_LOW_AND_ABOVE',
            )
        )
        if response.generated_images:
            out = OUTPUT_DIR / 'kit_v3_imagen4ultra.png'
            response.generated_images[0].image.save(str(out))
            print(f'   ✅ Saved: {out}')
    except Exception as e:
        print(f"   ❌ Imagen 4 Error: {e}")

if __name__ == "__main__":
    print("🚀 Starting V3 High-Fidelity Pipeline...")
    specs = analyze_components()
    generate_high_fidelity_kit(specs)

"""
TeamReel Advanced Kit Pipeline (Two-Stage)
==========================================

Strategy:
1. ANAYLZE: Extract specific design elements (JSON-structured)
2. GENERATE: Create design components separately or with specific focus
3. ASSEMBLE (via Prompting): Create the final flat design

This script focuses on the "Two-Stage Rocket" approach requested.
"""

import os
import sys
import json
from pathlib import Path

# Paths
BASE_DIR = Path("asc")
OUTPUT_DIR = BASE_DIR / "output_v2"
OUTPUT_DIR.mkdir(exist_ok=True)

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
# STAGE 1: DEEP ANALYSIS (The "First Stage Rocket")
# =============================================================================
def stage_1_analyze_kit():
    print("\n🚀 STAGE 1: Deep Analysis")
    print("-" * 50)

    asc1 = load_image(BASE_DIR / "ASC 1.jpg")
    asc2 = load_image(BASE_DIR / "asc 2.png")
    logo = load_image(BASE_DIR / "asc logo raw.png")

    print("   🔍 Extracting design DNA...")

    # We ask for JSON output to enforce structure
    prompt = """Analyze these football kit images and extract design specifications.

    Output purely strictly valid JSON with this structure:
    {
        "shirt": {
            "base_color": "exact color name",
            "sleeve_type": "long or short",
            "collar_color": "color name",
            "sleeve_cuff_color": "color name, if distinct",
            "shoulder_panels": "description if any",
            "patterns": "description if any"
        },
        "shorts": {
            "color": "color name",
            "stripes": "description if any"
        },
        "socks": {
            "color": "color name",
            "top_band_color": "color name if exists"
        },
        "logo": {
            "dominant_colors": ["color1", "color2"],
            "shape": "shield, circle, etc",
            "text_content": "exact text"
        },
        "sponsor": {
            "text": "exact text",
            "text_color": "color",
            "graphic_element": "description of icon/logo next to text"
        }
    }
    """

    response = client.models.generate_content(
        model="gemini-2.0-flash", # Flash is great for structured extraction
        contents=types.Content(
            parts=[
                types.Part(text=prompt),
                types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=asc1)),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=asc2)),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=logo)),
            ]
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    data = json.loads(response.text)
    print("   ✅ Extracted Data:")
    print(json.dumps(data, indent=2))

    # Save extraction for debug
    with open(OUTPUT_DIR / "analysis.json", "w") as f:
        json.dump(data, f, indent=2)

    return data

# =============================================================================
# STAGE 2: GENERATION (The "Second Stage Rocket")
# =============================================================================
def stage_2_generate_design(specs):
    print("\n🚀 STAGE 2: Minimalist Generation (Gemini 3)")
    print("-" * 50)

    # Constructing a prompt that "forces" the AI to think in layers
    prompt = f"""Create a vector-style flat lay football kit illustration.

    REFERENCE SPECIFICATIONS:
    - Shirt Base: {specs['shirt']['base_color']}
    - Sleeves: {specs['shirt']['sleeve_type']} with {specs['shirt']['sleeve_cuff_color']} cuffs
    - Collar: {specs['shirt']['collar_color']}
    - Shorts: {specs['shorts']['color']}
    - Socks: {specs['socks']['color']}

    BRANDING DETAILS (CRITICAL):
    1. Club Logo (Left Chest): {specs['logo']['shape']} shape in {', '.join(specs['logo']['dominant_colors'])}. Text: "{specs['logo']['text_content']}".
    2. Sponsor (Center Chest): Text "{specs['sponsor']['text']}" in {specs['sponsor']['text_color']}. {specs['sponsor']['graphic_element']}.

    LAYOUT & STYLE:
    - Composition: Shirt in center. Shorts below. Socks floating to the left. (See flat lay style).
    - Style: 2D Vector Illustration. Flat colors.
    - NO: No shadows, no gradients, no photorealism, no mannequin.
    - Stroke: Thin distinct outlines.
    - Background: Pure White.

    This must look like a clean digital design template.
    """

    print("   🎨 Generating with Gemini 3 Pro Image Preview...")

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
                    out = OUTPUT_DIR / 'tenue_v2_gemini3.png'
                    with open(out, 'wb') as f:
                        f.write(part.inline_data.data)
                    print(f'   ✅ Saved: {out}')
        else:
            print("   ❌ No image produced")

    except Exception as e:
        print(f"   ❌ Error: {e}")

# =============================================================================
# STAGE 3: LOGO RECONSTRUCTION (Bonus)
# =============================================================================
def stage_3_reconstruct_logo(specs):
    print("\n🚀 STAGE 3: Logo Reconstruction (Imagen 4 Ultra)")
    print("-" * 50)

    prompt = f"""Design a vector logo for a football club.

    Text: "{specs['logo']['text_content']}"
    Colors: {', '.join(specs['logo']['dominant_colors'])}
    Shape: {specs['logo']['shape']}
    Style: Minimalist, Flat, Vector Icon.

    The logo must look exactly like a modern digital recreation of a crest.
    White background.
    """

    try:
        response = client.models.generate_images(
            model='imagen-4.0-ultra-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio='1:1',
                safety_filter_level='BLOCK_LOW_AND_ABOVE',
            )
        )
        if response.generated_images:
            out = OUTPUT_DIR / 'logo_v2_ultra.png'
            response.generated_images[0].image.save(str(out))
            print(f'   ✅ Saved: {out}')
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    print("Starting Two-Stage Pipeline...")

    # 1. Analyze
    kit_specs = stage_1_analyze_kit()

    # 2. Generate Kit using specs
    stage_2_generate_design(kit_specs)

    # 3. Generate Logo using specs
    stage_3_reconstruct_logo(kit_specs)

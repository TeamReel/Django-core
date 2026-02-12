"""
TeamReel V8 Pipeline: Standardized Logo + V6 Quality
====================================================

Goal:
1. Restore V6 visual quality (better kit likeness).
2. Standardize Logo input (Square padding) to ensure consistent placement.
3. Maintain V7 parameter controls (Sleeves/Neck) & Full Body framing.

Changes:
- Reverted Analysis Prompt to V6 (Detailed manufacturing specs).
- Added `preprocess_logo` function using Pillow to square-crop/pad logos.
"""

import os
import sys
import time
import io
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types

# Configuration
OUTPUT_DIR = Path("asc/output_v8")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def load_image_raw(path):
    if not path.exists():
        print(f"⚠️ Warning: Image not found: {path}, skipping...")
        return None
    with open(path, "rb") as f:
        return f.read()

def preprocess_logo(path):
    """
    Reads an image, places it in the center of a 512x512 transparent square.
    This helps the model understand the logo as a distinct object.
    """
    if not path.exists():
        print(f"⚠️ Warning: Logo not found: {path}!")
        return None

    try:
        img = Image.open(path).convert("RGBA")

        # Canvas Settings
        canvas_size = (512, 512)
        target_max_dim = 400  # Leave some breathing room

        # Create transparent canvas
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))

        # Resize logo preserving aspect ratio
        img.thumbnail((target_max_dim, target_max_dim), Image.Resampling.LANCZOS)

        # Center position
        x = (canvas_size[0] - img.width) // 2
        y = (canvas_size[1] - img.height) // 2

        # Paste
        canvas.paste(img, (x, y), img)

        # Export to bytes
        b = io.BytesIO()
        canvas.save(b, format="PNG")
        return b.getvalue()

    except Exception as e:
        print(f"❌ Error processing logo {path}: {e}")
        return None

# =============================================================================
# STEP 1: ANALYZE KIT DNA (Reverted to V6 Logic)
# =============================================================================
def analyze_kit_dna(team_name, reference_paths):
    print(f"\n🔍 Analyzing {team_name} kit structure (V6 Logic)...")

    # Back to the V6 prompt which worked better
    parts = [
        types.Part(text=f"""Analyze the football kit design in these images for {team_name}.
        Describe the kit specifications in detail for a manufacturing design:
        1. Shirt: Base color, collar style, sleeve style, specific trim details on cuffs/collar/shoulders, patterns/texture.
        2. Shorts: Color and any side details.
        3. Socks: Color and any top band details.

        Be concise but specific about colors (e.g., 'white', 'ruby red', 'royal blue').
        Focus purely on the fabric design.
        """)
    ]

    valid_images = 0
    for p in reference_paths:
        data = load_image_raw(p)
        if data:
            mime = "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
            parts.append(types.Part(inline_data=types.Blob(mime_type=mime, data=data)))
            valid_images += 1

    if valid_images == 0:
        return "Standard football kit: White shirt, Blue shorts, Blue socks."

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=types.Content(parts=parts)
    )

    description = response.text
    print(f"   📝 Extracted: {description[:100]}...")
    return description

# =============================================================================
# STEP 2: GENERATE VARIANTS
# =============================================================================
def generate_variants(team_name, kit_description, logo_path, sponsor_path):
    print(f"\n🎨 Generating 5 variants for {team_name}...")
    print("-" * 50)

    team_output = OUTPUT_DIR / team_name.lower()
    team_output.mkdir(exist_ok=True)

    # Use the preprocessor for the logo
    logo_data = preprocess_logo(logo_path)

    # Use raw for sponsor (sponsor usually good as is, but we could process too. keeping raw for now)
    sponsor_data = load_image_raw(sponsor_path)

    if not logo_data or not sponsor_data:
        print("❌ Missing logo or sponsor, skipping generation.")
        return

    variants_config = [
        {"sleeves": "Short Sleeves", "neck": "Round Neck", "label": "short_round"},
        {"sleeves": "Short Sleeves", "neck": "Polo Collar", "label": "short_collar"},
        {"sleeves": "Long Sleeves", "neck": "Round Neck", "label": "long_round"},
        {"sleeves": "Long Sleeves", "neck": "Polo Collar", "label": "long_collar"},
        {"sleeves": "Short Sleeves", "neck": "V-Neck", "label": "short_vneck"},
    ]

    for i, config in enumerate(variants_config):
        print(f"   🍌 Variant {i+1}: {config['sleeves']} + {config['neck']}...")

        # Fusion Search: Using the V6 detailed description BUT forcing the V7 parameters
        prompt = f"""Create a MODERN, REALISTIC football kit layout (Flat Lay Photography).

        CORE DESIGN DNA (Follow these colors/patterns strictly):
        {kit_description}

        PHYSICAL OVERRIDES (Apply these cuts to the design above):
        - SLEEVES: {config['sleeves'].upper()} (Must be clearly visible).
        - NECKLINE: {config['neck'].upper()}.

        COMPOSITION & FRAMING:
        - FULL BODY SHOT: You must show the ENTIRE shirt, ENTIRE shorts, and complete pair of socks.
        - DO NOT CROP: Do not cut off the bottom of the socks or the top of the collar.
        - MAXIMIZE SPACE: The kit should fill the frame.
        - Orientation: Vertical Portrait.

        INTEGRATION:
        - LOGO: Use provided Club Logo on LEFT CHEST. Realistic embroidery texture.
        - SPONSOR: Use provided Sponsor image CENTERED on chest. Realistic heat-press texture.

        STYLE:
        - Aesthetic: Clean, high-end commercial sportswear photography.
        - Background: Neutral light grey concrete texture.
        - Cloth Physics: Natural folds.
        """

        try:
            response = client.models.generate_content(
                model='nano-banana-pro-preview',
                contents=types.Content(
                    parts=[
                        types.Part(text=prompt),
                        types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_data)),
                        types.Part(inline_data=types.Blob(mime_type="image/png", data=sponsor_data)),
                    ]
                ),
                config=types.GenerateContentConfig(
                    response_modalities=['IMAGE'],
                    safety_settings=[types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_ONLY_HIGH"
                    )]
                )
            )

            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        filename = f'{team_name}_v8_{i+1}_{config["label"]}.png'
                        out = team_output / filename
                        with open(out, 'wb') as f:
                            f.write(part.inline_data.data)
                        print(f'      ✅ Saved: {out}')
            else:
                print("      ❌ No image generated.")

        except Exception as e:
            print(f"      ❌ Error: {e}")

        time.sleep(1)

# =============================================================================
# MAIN EXECUTION
# =============================================================================
if __name__ == "__main__":

    # --- TEAM 1: ASC DALFSEN ---
    asc_refs = [
        Path("asc/input/actie.png")
    ]
    asc_logo = Path("asc/input/logo.png")
    asc_sponsor = Path("asc/input/sponsor.png")

    asc_desc = analyze_kit_dna("ASC Dalfsen", asc_refs)
    generate_variants("ASC", asc_desc, asc_logo, asc_sponsor)

    # --- TEAM 2: AJAX ---
    ajax_refs = [
        Path("asc/input/ajax/ajax.JPG")
    ]
    ajax_logo = Path("asc/input/ajax/logo.jpg")
    ajax_sponsor = Path("asc/input/ajax/sponsor.png")

    ajax_desc = analyze_kit_dna("Ajax", ajax_refs)
    generate_variants("Ajax", ajax_desc, ajax_logo, ajax_sponsor)

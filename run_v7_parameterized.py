"""
TeamReel V7 Pipeline: Parameterized Realism (Nano Banana)
=========================================================

Goal: Generate realistic, modern football kit concepts with control over physical attributes.
Updates:
1.  **View Control**: Enforce full visibility (Shirt + Shorts + Socks) with no cropping. "Fill the frame".
2.  **Parameters**: Explicit control over Sleeve Length (Short/Long) and Neck Style (Round/Collar).
3.  **Inspiration**: strictly follow the clean "Modern Minimalist Flat Lay" aesthetic of V6 variants 1 & 2.

Process:
1. ANALYZE references to extract kit DNA (Colors, Layout).
2. GENERATE 5 variants per team, rotating through physical configuration parameters.
"""

import os
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

# Configuration
OUTPUT_DIR = Path("asc/output_v7")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def load_image(path):
    if not path.exists():
        print(f"⚠️ Warning: Image not found: {path}, skipping...")
        return None
    with open(path, "rb") as f:
        return f.read()

# =============================================================================
# STEP 1: ANALYZE KIT DNA
# =============================================================================
def analyze_kit_dna(team_name, reference_paths):
    print(f"\n🔍 Analyzing {team_name} kit structure...")

    parts = [
        types.Part(text=f"""Analyze the football kit design in these images for {team_name}.
        Describe the kit specifications in detail for a manufacturing design:
        1. Shirt: Base color, patterns/texture.
        2. Shorts: Color and any side details.
        3. Socks: Color and any top band details.

        Do NOT describe the collar or sleeves, as I will override these with specific parameters.
        Focus purely on the COLORS and GRAPHIC PATTERNS.
        """)
    ]

    valid_images = 0
    for p in reference_paths:
        data = load_image(p)
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
    print(f"\n🎨 Generating 5 variants for {team_name} with specific parameters...")
    print("-" * 50)

    team_output = OUTPUT_DIR / team_name.lower()
    team_output.mkdir(exist_ok=True)

    logo_data = load_image(logo_path)
    sponsor_data = load_image(sponsor_path)

    if not logo_data or not sponsor_data:
        print("❌ Missing logo or sponsor, skipping generation.")
        return

    # Define the variants configurations to ensure we get exactly what the user asked for
    variants_config = [
        {"sleeves": "Short Sleeves", "neck": "Round Neck", "label": "short_round"},
        {"sleeves": "Short Sleeves", "neck": "Polo Collar", "label": "short_collar"},
        {"sleeves": "Long Sleeves", "neck": "Round Neck", "label": "long_round"},
        {"sleeves": "Long Sleeves", "neck": "Polo Collar", "label": "long_collar"},
        {"sleeves": "Short Sleeves", "neck": "Modern Crew Neck", "label": "short_crew"}, # Variation
    ]

    for i, config in enumerate(variants_config):
        print(f"   🍌 Variant {i+1}: {config['sleeves']} + {config['neck']}...")

        prompt = f"""Create a MODERN, REALISTIC football kit layout (Flat Lay Photography).

        KIT CONFIGURATION:
        - SLEEVES: {config['sleeves'].upper()} (Must be clearly visible).
        - NECKLINE: {config['neck'].upper()}.
        - COLORS/PATTERN: {kit_description}

        COMPOSITION & FRAMING (CRITICAL):
        - FULL BODY SHOT: You must show the ENTIRE shirt, ENTIRE shorts, and complete pair of socks.
        - DO NOT CROP: Do not cut off the bottom of the socks or the top of the collar.
        - MAXIMIZE SPACE: The kit should fill the frame but keep a small margin so nothing is cut off.
        - Orientation: Vertical Portrait.

        INTEGRATION:
        - LOGO: Use provided Club Logo on LEFT CHEST. Realistic embroidery texture.
        - SPONSOR: Use provided Sponsor image CENTERED on chest. Realistic heat-press texture.

        STYLE:
        - Aesthetic: Clean, high-end commercial sportswear photography.
        - Background: Neutral light grey/concrete texture. Soft shadows.
        - Cloth Physics: Natural folds, not perfectly flat, looks like it's laying on a table.
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
                        # Naming convention: team_v7_1_short_round.png
                        filename = f'{team_name}_v7_{i+1}_{config["label"]}.png'
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

    # Analyze only once
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

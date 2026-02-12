"""
TeamReel V6 Pipeline: Multi-Team Realism Test (Nano Banana)
===========================================================

Goal: Generate realistic, modern football kit concepts for multiple teams (ASC, AJAX).
Process:
1. ANAYLZE references to extract kit DNA (Colors, Layout).
2. GENERATE 5 variants per team using 'nano-banana-pro-preview' with specific focus on realistic integration of Logo & Sponsor.
"""

import os
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

# Configuration
OUTPUT_DIR = Path("asc/output_v6")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def load_image(path):
    if not path.exists():
        print(f"⚠️ Warning: Image not found: {path}")
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
        1. Shirt: Base color, collar style/color, sleeve style (long/short), sleeve details (cuffs), any patterns/texture.
        2. Shorts: Color and any side details.
        3. Socks: Color and any top band details.

        Be concise but specific about colors (e.g., 'white', 'ruby red', 'royal blue').
        Ignore the specific logo/sponsor in the analysis (we have the files), just focus on the fabric design.
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
def generate_variants(team_name, kit_description, logo_path, sponsor_path, variant_count=5):
    print(f"\n🎨 Generating {variant_count} variants for {team_name}...")
    print("-" * 50)

    team_output = OUTPUT_DIR / team_name.lower()
    team_output.mkdir(exist_ok=True)

    logo_data = load_image(logo_path)
    sponsor_data = load_image(sponsor_path)

    if not logo_data or not sponsor_data:
        print("❌ Missing logo or sponsor, skipping generation.")
        return

    # Base prompt strategy
    prompt = f"""Create a MODERN, REALISTIC football kit layout (Flat Lay Photography).

    KIT SPECIFICATIONS based on analysis:
    {kit_description}

    COMPOSITION & INTEGRATION:
    - Main Subject: The football kit (Shirt, Shorts, Socks) laid out on a clean surface.
    - LOGO: Use the provided Club Logo image. Place it realistically on the LEFT CHEST of the shirt. It must look embroidered or printed on the fabric.
    - SPONSOR: Use the provided Sponsor image. Place it CENTRALLY on the chest. It must look heat-pressed or printed realistically.

    STYLE GUIDELINES:
    - "Modern Minimalist" aesthetic.
    - High-end sportswear photography.
    - Subtle fabric textures and natural lighting.
    - Slight folds/ripples in fabric to show realism.
    - Neutral, clean background (white or light grey concrete).
    - NO random text. Only the provided logo and sponsor.
    """

    for i in range(1, variant_count + 1):
        print(f"   🍌 Generating Variant {i}/{variant_count}...")

        try:
            # Slight prompt variations for diversity could be added here if needed,
            # but model variance usually handles it.

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
                        out = team_output / f'{team_name}_v6_variant_{i}.png'
                        with open(out, 'wb') as f:
                            f.write(part.inline_data.data)
                        print(f'      ✅ Saved: {out}')
            else:
                print("      ❌ No image generated.")

        except Exception as e:
            print(f"      ❌ Error: {e}")

        # Brief pause to mimic thoughtful batching
        time.sleep(1)

# =============================================================================
# MAIN EXECUTION
# =============================================================================
if __name__ == "__main__":

    # --- TEAM 1: ASC DALFSEN ---
    asc_refs = [
        Path("asc/ASC 1.jpg"),
        Path("asc/asc 2.png"),
        Path("asc/input/actie.png")
    ]
    asc_logo = Path("asc/input/logo.png")
    asc_sponsor = Path("asc/input/sponsor.png")

    asc_desc = analyze_kit_dna("ASC Dalfsen", asc_refs)
    generate_variants("ASC", asc_desc, asc_logo, asc_sponsor, variant_count=5)

    # --- TEAM 2: AJAX ---
    # Assuming ajax.JPG is the reference
    ajax_refs = [
        Path("asc/input/ajax/ajax.JPG")
    ]
    ajax_logo = Path("asc/input/ajax/logo.jpg")
    ajax_sponsor = Path("asc/input/ajax/sponsor.png")

    ajax_desc = analyze_kit_dna("Ajax", ajax_refs)
    generate_variants("Ajax", ajax_desc, ajax_logo, ajax_sponsor, variant_count=5)

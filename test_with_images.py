"""
Quick test script - plaats eerst de afbeeldingen in deze folder:
- portrait.jpg (de pasfoto van de man)
- tenue_raw.jpg (de ASC Dalfsen kit afbeelding)
- logo_raw.png (optioneel: een ruwe club logo)

Run: python test_with_images.py
"""

import os
import sys
from pathlib import Path

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ $env:GOOGLE_API_KEY niet ingesteld!")
    sys.exit(1)

from google import genai
from google.genai import types

client = genai.Client(api_key=GOOGLE_API_KEY)


def load_image(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def test_portrait_to_fullbody():
    """Test: Pasfoto → Full body in tenue"""

    portrait_path = None
    for name in ["portrait.jpg", "portrait.png", "pasfoto.jpg", "face.jpg"]:
        if Path(name).exists():
            portrait_path = name
            break

    if not portrait_path:
        print("❌ Geen portrait gevonden. Plaats 'portrait.jpg' in deze folder.")
        return

    print(f"\n🧑 PORTRAIT → FULL BODY")
    print(f"   Input: {portrait_path}")

    # Analyze portrait
    print("   🔍 Analyzing face...")
    portrait_bytes = load_image(portrait_path)

    analysis = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=types.Content(
            parts=[
                types.Part(text="""Describe this person for image generation:
- Hair: color, style, length
- Face: shape, eye color, distinctive features
- Age: approximate range
- Skin tone
Be detailed but concise."""),
                types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=portrait_bytes))
            ]
        )
    )

    person_desc = analysis.text
    print(f"   📝 {person_desc[:150]}...")

    # Generate full body
    print("   🖼️ Generating full body...")

    prompt = f"""Realistic full-body front-facing photo of a male football player:

IMPORTANT - Person appearance (match exactly):
{person_desc}

Football kit (ASC Dalfsen):
- White long-sleeve shirt with blue collar and cuffs
- Blue shorts
- Blue knee-high socks
- Black football boots

Shirt details:
- Small club badge on left chest (blue shield with "ASC" text)
- Sponsor "Jopies Groene Wereld" in green text, centered on chest

Photo style:
- Professional team photo
- Simple white/gray studio background
- Standing straight, arms at sides
- Natural lighting
- High resolution, sharp details
"""

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="3:4",
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        )
    )

    if response.generated_images:
        output = "player_fullbody_result.png"
        response.generated_images[0].image.save(output)
        print(f"   ✅ Saved: {output}")
    else:
        print("   ❌ Generation failed")


def test_tenue_simplification():
    """Test: Raw tenue foto → Simplistisch ontwerp"""

    tenue_path = None
    for name in ["tenue_raw.jpg", "tenue_raw.png", "tenue.jpg", "kit.jpg", "kit.png"]:
        if Path(name).exists():
            tenue_path = name
            break

    if not tenue_path:
        print("\n⚠️ Geen tenue foto gevonden. Genereer puur op basis van specs...")

    print(f"\n👕 TENUE SIMPLIFICATION")

    if tenue_path:
        print(f"   Input: {tenue_path}")
        tenue_bytes = load_image(tenue_path)

        # Analyze the kit
        print("   🔍 Analyzing kit...")

        analysis = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=types.Content(
                parts=[
                    types.Part(text="""Analyze this football kit image. Extract:
1. Shirt color and style (short/long sleeve)
2. Shorts color
3. Socks color
4. Logo position and description
5. Sponsor text and position
6. Any patterns, stripes, or details

Be very specific."""),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=tenue_bytes))
                ]
            )
        )

        kit_desc = analysis.text
        print(f"   📝 {kit_desc[:200]}...")
    else:
        kit_desc = """
Shirt: White long-sleeve with blue collar and blue cuffs on sleeves
Shorts: Blue/azure
Socks: Blue/azure, knee-high
Logo: Small ASC Dalfsen badge on left chest
Sponsor: "Jopies Groene Wereld" in green, centered on front
"""

    # Generate simplified version
    print("   🖼️ Generating simplified design...")

    prompt = f"""Create a minimalist flat-lay football kit template:

Based on this kit description:
{kit_desc}

Design requirements:
- FLAT illustration style, like a design template
- NO shadows, NO gradients, NO 3D effects
- Pure white background
- Show shirt, shorts, and socks arranged flat
- Clean vector-style appearance
- Shirt: white with blue collar/cuffs
- Shorts: blue
- Socks: blue, tall
- ASC Dalfsen logo on left chest (simple shield design)
- "Jopies Groene Wereld" sponsor text in GREEN on shirt center
- Simple, clean, professional sports apparel template
- Style similar to a kit design mockup
"""

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="4:3",
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        )
    )

    if response.generated_images:
        output = "tenue_simplified_result.png"
        response.generated_images[0].image.save(output)
        print(f"   ✅ Saved: {output}")
    else:
        print("   ❌ Generation failed")


def test_logo_cleanup():
    """Test: Raw logo → Clean uniform logo"""

    logo_path = None
    for name in ["logo_raw.png", "logo_raw.jpg", "logo.png", "logo.jpg", "club_logo.png"]:
        if Path(name).exists():
            logo_path = name
            break

    print(f"\n🎨 LOGO CLEANUP")

    if logo_path:
        print(f"   Input: {logo_path}")
        logo_bytes = load_image(logo_path)

        # Analyze logo
        print("   🔍 Analyzing logo...")

        analysis = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=types.Content(
                parts=[
                    types.Part(text="""Describe this club logo in detail:
1. Main shape (shield, circle, etc.)
2. Colors used (be specific)
3. Any symbols or imagery
4. Text content
5. Overall style

Create a prompt to recreate this as a clean, minimalist version."""),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_bytes))
                ]
            )
        )

        logo_desc = analysis.text
        print(f"   📝 {logo_desc[:150]}...")
    else:
        print("   ⚠️ No logo file found, using ASC Dalfsen description...")
        logo_desc = """
ASC Dalfsen club logo:
- Shield shape
- Blue primary color
- White text "ASC" at top
- Football/soccer ball element
- Clean, simple sports club aesthetic
"""

    # Generate clean version
    print("   🖼️ Generating clean logo...")

    prompt = f"""Create a clean, professional football club logo:

Based on: {logo_desc}

Requirements:
- Simple shield shape
- FLAT design, no gradients, no shadows
- Maximum 3 colors (blue, white, accent)
- "ASC" text prominent
- Clean vector style
- Transparent/white background
- Square format
- Suitable for small sizes (favicon) and large (banner)
- Modern minimalist sports club logo aesthetic
"""

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1",
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        )
    )

    if response.generated_images:
        output = "logo_cleaned_result.png"
        response.generated_images[0].image.save(output)
        print(f"   ✅ Saved: {output}")
    else:
        print("   ❌ Generation failed")


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 TEAMREEL IMAGE PIPELINES - QUICK TEST")
    print("=" * 60)

    test_logo_cleanup()
    test_tenue_simplification()
    test_portrait_to_fullbody()

    print("\n" + "=" * 60)
    print("📁 Check generated files:")
    for f in Path(".").glob("*_result.png"):
        print(f"   🖼️ {f}")
    print("=" * 60)

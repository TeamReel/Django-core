"""
TeamReel AI Image Pipelines Test
=================================
Test de image processing pipelines voor:
1. Logo cleanup (uniform, vierkant, transparant)
2. Tenue generator (raw foto → simplistisch ontwerp)
3. Player full body (pasfoto → full body in tenue)

Gebruik:
    $env:GOOGLE_API_KEY = 'AIza...'
    python test_teamreel_pipelines.py
"""

import os
import sys
import base64
from pathlib import Path

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ GOOGLE_API_KEY niet gevonden!")
    sys.exit(1)

print(f"✅ API Key gevonden: {GOOGLE_API_KEY[:10]}...")
print("=" * 60)


def load_image_as_bytes(path: str) -> bytes:
    """Load image file as bytes."""
    with open(path, "rb") as f:
        return f.read()


def save_image(image_obj, output_path: str):
    """Save generated image to file."""
    image_obj.save(output_path)
    print(f"   💾 Saved: {output_path}")


# =============================================================================
# PIPELINE 1: Logo Cleanup
# =============================================================================
def test_logo_cleanup(input_image_path: str, club_name: str = "ASC Dalfsen"):
    """
    Clean up a logo: make it uniform, square, no background.

    Process:
    1. Analyze input logo with Gemini Vision
    2. Generate clean version with Imagen
    """
    print("\n🎨 PIPELINE 1: Logo Cleanup")
    print("-" * 50)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GOOGLE_API_KEY)

        # Load input image
        image_bytes = load_image_as_bytes(input_image_path)
        print(f"   📥 Input: {input_image_path}")

        # Step 1: Analyze logo with Gemini Vision
        print("   🔍 Analyzing logo...")

        analysis_content = types.Content(
            parts=[
                types.Part(text=f"""Analyze this logo image for {club_name}. Describe:
1. The main shape/symbol
2. The colors used (be specific with hex codes if possible)
3. Any text present
4. The overall style (modern, classic, minimalist, etc.)

Then create a detailed prompt for regenerating this logo as a:
- Clean, minimalist vector-style logo
- Square format with transparent background
- No shadows, no gradients, flat design
- Suitable for use on jerseys, flyers, and videos

Output the regeneration prompt only, starting with "Create a..."
"""),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=image_bytes))
            ]
        )

        analysis = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=analysis_content,
        )

        enhanced_prompt = analysis.text
        print(f"   📝 Generated prompt: {enhanced_prompt[:200]}...")

        # Step 2: Generate clean logo with Imagen
        print("   🖼️ Generating clean logo...")

        # Add specific instructions for clean logo
        final_prompt = f"""
{enhanced_prompt}

Style requirements:
- Flat design, no gradients or shadows
- Clean vector-style appearance
- White/transparent background
- Square aspect ratio
- High contrast colors
- Suitable for small and large sizes
- Professional sports club logo aesthetic
"""

        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=final_prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1",  # Square for logo
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )
        )

        if response.generated_images:
            output_path = Path(input_image_path).stem + "_cleaned.png"
            save_image(response.generated_images[0].image, output_path)
            print("   ✅ Logo cleanup SUCCESS!")
            return True
        else:
            print("   ❌ No image generated")
            return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


# =============================================================================
# PIPELINE 2: Tenue Generator
# =============================================================================
def test_tenue_generator(
    input_image_path: str = None,
    club_name: str = "ASC Dalfsen",
    colors: dict = None,
    sponsor: str = "Jopies Groene Wereld"
):
    """
    Generate a simplified football kit design.

    Can work from:
    - An action photo of a player in kit
    - A raw photo of the kit
    - Just the specifications (colors, logo, sponsor)
    """
    print("\n👕 PIPELINE 2: Tenue Generator")
    print("-" * 50)

    if colors is None:
        colors = {
            "shirt": "white",
            "shorts": "blue",
            "socks": "blue",
            "accents": "blue"
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GOOGLE_API_KEY)

        # If we have an input image, analyze it first
        if input_image_path and Path(input_image_path).exists():
            image_bytes = load_image_as_bytes(input_image_path)
            print(f"   📥 Analyzing reference: {input_image_path}")

            analysis_content = types.Content(
                parts=[
                    types.Part(text="""Analyze this football kit image. Describe:
1. Shirt color and design details
2. Shorts color
3. Socks color and length
4. Logo placement and design
5. Sponsor text and placement
6. Any patterns or stripes

Be very specific about colors and positions."""),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=image_bytes))
                ]
            )

            analysis = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=analysis_content,
            )

            kit_description = analysis.text
            print(f"   📝 Kit analysis: {kit_description[:200]}...")
        else:
            kit_description = f"""
Shirt: {colors['shirt']} with {colors['accents']} collar and sleeve cuffs
Shorts: {colors['shorts']}
Socks: {colors['socks']}, knee-length
Logo: {club_name} logo on left chest
Sponsor: '{sponsor}' text centered on front of shirt
"""

        # Generate simplified tenue design
        print("   🖼️ Generating simplified kit design...")

        prompt = f"""Create a minimalist football kit template design, flat lay style:

Kit details from analysis:
{kit_description}

Requirements:
- Clean, minimalist illustration style
- Flat design, NO shadows, NO gradients
- White background
- Show: long-sleeve shirt, shorts, and knee-high socks arranged as a flat lay
- {club_name} logo on left chest of shirt
- Sponsor text "{sponsor}" centered on shirt front (green text)
- Colors: {colors['shirt']} shirt with {colors['accents']} accents, {colors['shorts']} shorts, {colors['socks']} socks
- Simple, clean template style suitable for variations
- Professional sports apparel illustration
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
            output_path = f"tenue_{club_name.lower().replace(' ', '_')}_clean.png"
            save_image(response.generated_images[0].image, output_path)
            print("   ✅ Tenue generation SUCCESS!")
            return True
        else:
            print("   ❌ No image generated")
            return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


# =============================================================================
# PIPELINE 3: Player Full Body Generator
# =============================================================================
def test_player_fullbody(
    portrait_path: str,
    club_name: str = "ASC Dalfsen",
    sponsor: str = "Jopies Groene Wereld",
    kit_colors: dict = None
):
    """
    Generate full-body player image from portrait photo.

    Process:
    1. Analyze portrait with Gemini Vision (face features)
    2. Generate full body in kit with Imagen
    """
    print("\n🧑 PIPELINE 3: Player Full Body Generator")
    print("-" * 50)

    if kit_colors is None:
        kit_colors = {
            "shirt": "white long-sleeve",
            "shorts": "blue",
            "socks": "blue knee-high"
        }

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GOOGLE_API_KEY)

        # Load portrait
        portrait_bytes = load_image_as_bytes(portrait_path)
        print(f"   📥 Portrait: {portrait_path}")

        # Step 1: Analyze portrait features
        print("   🔍 Analyzing portrait...")

        analysis_content = types.Content(
            parts=[
                types.Part(text="""Describe this person's appearance in detail for image generation:
1. Hair color, style, and length
2. Facial features (eye color, face shape, any distinctive features)
3. Approximate age range
4. Build/body type if visible
5. Skin tone

Provide a detailed description that would help recreate their likeness in a full-body image."""),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=portrait_bytes))
            ]
        )

        analysis = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=analysis_content,
        )

        person_description = analysis.text
        print(f"   📝 Person analysis: {person_description[:200]}...")

        # Step 2: Generate full body
        print("   🖼️ Generating full body image...")

        prompt = f"""High-resolution, realistic full-body front-facing photo of a football player:

Person appearance (match this closely):
{person_description}

Outfit - {club_name} football kit:
- {kit_colors['shirt']} shirt
- {kit_colors['shorts']} shorts
- {kit_colors['socks']} socks reaching just below knees
- Simple football boots

Shirt details:
- {club_name} club logo on left chest
- Sponsor text "{sponsor}" in green, centered on front

Image style:
- Professional sports portrait
- Clean white/light gray studio background
- Natural proportions and lifelike details
- Standing pose, arms relaxed at sides
- Looking directly at camera
- Good lighting, no harsh shadows
"""

        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="3:4",  # Portrait orientation
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )
        )

        if response.generated_images:
            output_path = Path(portrait_path).stem + "_fullbody.png"
            save_image(response.generated_images[0].image, output_path)
            print("   ✅ Full body generation SUCCESS!")
            return True
        else:
            print("   ❌ No image generated")
            return False

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


# =============================================================================
# MAIN - Run all tests
# =============================================================================
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 TEAMREEL AI IMAGE PIPELINES TEST")
    print("=" * 60)

    results = {}

    # Check for test images
    # Look for common image extensions
    test_files = list(Path(".").glob("*.png")) + list(Path(".").glob("*.jpg")) + list(Path(".").glob("*.jpeg"))

    print(f"\n📁 Found {len(test_files)} image files in current directory")
    for f in test_files[:10]:  # Show max 10
        print(f"   - {f.name}")

    # Test 1: Tenue Generator (without input image - pure generation)
    print("\n" + "=" * 60)
    results["Tenue Generator"] = test_tenue_generator(
        club_name="ASC Dalfsen",
        colors={
            "shirt": "white",
            "shorts": "blue",
            "socks": "blue",
            "accents": "blue"
        },
        sponsor="Jopies Groene Wereld"
    )

    # Test 2: If we have a portrait, test full body
    portrait_files = [f for f in test_files if "portrait" in f.name.lower() or "face" in f.name.lower() or "foto" in f.name.lower()]

    # Also check for the attached images (they might have generic names)
    if not portrait_files:
        # Try to find any jpg/png that might be a portrait
        for f in test_files:
            if f.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                portrait_files.append(f)
                break

    if portrait_files:
        print("\n" + "=" * 60)
        results["Player Full Body"] = test_player_fullbody(
            portrait_path=str(portrait_files[0]),
            club_name="ASC Dalfsen",
            sponsor="Jopies Groene Wereld"
        )
    else:
        print("\n⚠️ No portrait image found for full body test")
        print("   Place a portrait image named 'portrait.jpg' in the current directory")
        results["Player Full Body"] = None

    # Summary
    print("\n" + "=" * 60)
    print("📊 RESULTATEN")
    print("=" * 60)

    for test_name, passed in results.items():
        if passed is None:
            status = "⏭️ SKIPPED"
        elif passed:
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        print(f"   {test_name}: {status}")

    print("\n" + "=" * 60)
    print("📁 Generated files:")
    for f in Path(".").glob("*_clean*.png"):
        print(f"   🖼️ {f.name}")
    for f in Path(".").glob("*_fullbody*.png"):
        print(f"   🧑 {f.name}")
    for f in Path(".").glob("*_cleaned*.png"):
        print(f"   🎨 {f.name}")
    print("=" * 60)

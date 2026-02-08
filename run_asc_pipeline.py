"""
ASC Dalfsen Image Pipeline
==========================
1. Analyze ASC 1.jpg, asc 2.png, asc logo raw.png → Generate flat tenue design
2. Clean up logo → vector style, no background
3. Use flat tenue + Henk.jpg → Full body player in kit
4. Full body → Close-up portrait

Output: asc/output/
"""

import os
import sys
from pathlib import Path

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ GOOGLE_API_KEY niet gevonden!")
    sys.exit(1)

from google import genai
from google.genai import types

client = genai.Client(api_key=GOOGLE_API_KEY)

# Paths
ASC_DIR = Path("asc")
OUTPUT_DIR = ASC_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def load_image(path: Path) -> bytes:
    """Load image as bytes."""
    with open(path, "rb") as f:
        return f.read()


def get_mime_type(path: Path) -> str:
    """Get MIME type from extension."""
    ext = path.suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext, "image/png")


# =============================================================================
# STEP 1: Generate Flat Tenue Design
# =============================================================================
def step1_generate_flat_tenue():
    """Analyze ASC images and generate flat tenue design."""
    print("\n" + "=" * 60)
    print("📋 STEP 1: Generate Flat Tenue Design")
    print("=" * 60)

    # Load all reference images
    asc1_path = ASC_DIR / "ASC 1.jpg"
    asc2_path = ASC_DIR / "asc 2.png"
    logo_path = ASC_DIR / "asc logo raw.png"

    print(f"   📥 Loading: {asc1_path.name}")
    print(f"   📥 Loading: {asc2_path.name}")
    print(f"   📥 Loading: {logo_path.name}")

    asc1_bytes = load_image(asc1_path)
    asc2_bytes = load_image(asc2_path)
    logo_bytes = load_image(logo_path)

    # Step 1a: Analyze all images together
    print("\n   🔍 Analyzing kit references...")

    analysis_content = types.Content(
        parts=[
            types.Part(text="""Analyze these football kit reference images for ASC Dalfsen.

IMAGE 1 and 2 show the actual kit (possibly action photos or product shots).
IMAGE 3 is the club logo.

Extract and describe:
1. SHIRT: Color, sleeve length, collar style, any patterns
2. SHORTS: Color, style
3. SOCKS: Color, length
4. LOGO: Describe the ASC Dalfsen logo design, colors, text
5. SPONSOR: What sponsor text is visible? Position on shirt?
6. ACCENT COLORS: Any trim, stripes, or accent colors

Be very specific about exact colors (e.g., "azure blue", "royal blue", "white")."""),
            types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=asc1_bytes)),
            types.Part(inline_data=types.Blob(mime_type="image/png", data=asc2_bytes)),
            types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_bytes)),
        ]
    )

    analysis = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=analysis_content,
    )

    kit_analysis = analysis.text
    print(f"\n   📝 Kit Analysis:\n   {kit_analysis[:500]}...")

    # Step 1b: Generate flat design tenue
    print("\n   🎨 Generating flat design tenue...")

    prompt = f"""Create a FLAT DESIGN football kit template illustration based on this analysis:

{kit_analysis}

CRITICAL DESIGN REQUIREMENTS:
- FLAT LAY arrangement: shirt in center, shorts below, socks on either side
- MINIMALIST illustration style - like a design mockup/template
- ABSOLUTELY NO shadows, NO gradients, NO 3D effects
- PURE WHITE background
- Clean vector-style appearance

KIT DETAILS (ASC Dalfsen):
- Shirt: White base with blue (azure) collar and sleeve cuffs, LONG SLEEVES
- Shorts: Blue/azure color
- Socks: Blue/azure, knee-high length

LOGO & SPONSOR:
- ASC Dalfsen club badge on LEFT CHEST of shirt (small, shield shape)
- Sponsor "Jopies Groene Wereld" text in GREEN color, CENTERED on shirt front

STYLE:
- Simple, clean template suitable for merchandise mockups
- Professional sports apparel illustration
- Colors should be solid, flat fills
- Like a kit design document or uniform template
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
        output_path = OUTPUT_DIR / "01_tenue_flat_design.png"
        response.generated_images[0].image.save(str(output_path))
        print(f"   ✅ Saved: {output_path}")
        return output_path
    else:
        print("   ❌ Failed to generate tenue")
        return None


# =============================================================================
# STEP 2: Clean Logo
# =============================================================================
def step2_clean_logo():
    """Create clean, uniform logo without background."""
    print("\n" + "=" * 60)
    print("🎨 STEP 2: Clean Logo (Vector Style, No Background)")
    print("=" * 60)

    logo_path = ASC_DIR / "asc logo raw.png"
    print(f"   📥 Loading: {logo_path.name}")

    logo_bytes = load_image(logo_path)

    # Analyze logo first
    print("   🔍 Analyzing logo...")

    analysis = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=types.Content(
            parts=[
                types.Part(text="""Analyze this football club logo in detail:
1. Main shape (shield, circle, crest, etc.)
2. All colors used (be specific)
3. Any symbols, icons, or imagery
4. All text content and font style
5. Layout and arrangement of elements

Create a detailed prompt to recreate this as a CLEAN, MINIMALIST logo."""),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=logo_bytes)),
            ]
        )
    )

    logo_analysis = analysis.text
    print(f"   📝 Logo Analysis: {logo_analysis[:300]}...")

    # Generate clean logo
    print("\n   🎨 Generating clean logo...")

    prompt = f"""Create a clean, professional football club logo based on:

{logo_analysis}

CRITICAL REQUIREMENTS:
- FLAT DESIGN - absolutely no gradients, no shadows, no 3D effects
- VECTOR STYLE appearance - clean sharp edges
- TRANSPARENT or PURE WHITE background
- SQUARE format (1:1 aspect ratio)
- Maximum 3-4 solid colors
- Simple, bold, recognizable at small sizes

STYLE:
- Modern minimalist sports club logo
- Clean geometric shapes
- Bold readable text
- Professional football/soccer club aesthetic
- Suitable for: jerseys, websites, social media, print

The logo should look like a proper vector graphic, not a photograph or realistic image.
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
        output_path = OUTPUT_DIR / "02_logo_clean.png"
        response.generated_images[0].image.save(str(output_path))
        print(f"   ✅ Saved: {output_path}")
        return output_path
    else:
        print("   ❌ Failed to generate logo")
        return None


# =============================================================================
# STEP 3: Full Body Player
# =============================================================================
def step3_full_body_player(tenue_path: Path = None):
    """Generate full body player from Henk.jpg portrait."""
    print("\n" + "=" * 60)
    print("🧑 STEP 3: Full Body Player in Kit")
    print("=" * 60)

    henk_path = ASC_DIR / "Henk.jpg"
    print(f"   📥 Loading portrait: {henk_path.name}")

    henk_bytes = load_image(henk_path)

    # Analyze Henk's appearance
    print("   🔍 Analyzing portrait...")

    parts = [
        types.Part(text="""Describe this person's appearance in DETAIL for image generation:
1. HAIR: Color, style, length, texture
2. FACE: Shape, distinctive features, expression
3. EYES: Color, shape
4. SKIN: Tone, complexion
5. BUILD: If visible, estimate body type
6. AGE: Approximate age range
7. OVERALL: General impression, look

Be very specific - this description will be used to generate a full-body image that resembles this person."""),
        types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=henk_bytes)),
    ]

    # Also include tenue reference if available
    if tenue_path and tenue_path.exists():
        print(f"   📥 Including tenue reference: {tenue_path.name}")
        tenue_bytes = load_image(tenue_path)
        parts.append(types.Part(text="\n\nAlso note the kit design from this image for the uniform:"))
        parts.append(types.Part(inline_data=types.Blob(mime_type="image/png", data=tenue_bytes)))

    analysis = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=types.Content(parts=parts)
    )

    person_analysis = analysis.text
    print(f"   📝 Person Analysis: {person_analysis[:400]}...")

    # Generate full body
    print("\n   🎨 Generating full body player...")

    prompt = f"""Create a HIGH-QUALITY, REALISTIC full-body photograph of a football player:

PERSON APPEARANCE (MUST MATCH CLOSELY):
{person_analysis}

OUTFIT - ASC Dalfsen Football Kit:
- WHITE long-sleeve shirt with BLUE collar and cuffs
- ASC Dalfsen club badge on LEFT CHEST (small shield logo)
- Sponsor text "Jopies Groene Wereld" in GREEN, centered on shirt
- BLUE shorts
- BLUE knee-high football socks
- BLACK football boots/cleats (Nike, Adidas style)

POSE & COMPOSITION:
- Full body shot, head to toe including shoes
- Standing straight, front-facing
- Arms relaxed at sides or hands on hips
- Confident, professional athlete pose
- Looking directly at camera

PHOTOGRAPHY STYLE:
- Professional team photo / sports portrait
- Clean white or light gray studio background
- High resolution, sharp details
- Natural lighting, no harsh shadows
- Realistic proportions, lifelike appearance
"""

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="3:4",  # Portrait orientation for full body
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        )
    )

    if response.generated_images:
        output_path = OUTPUT_DIR / "03_player_fullbody.png"
        response.generated_images[0].image.save(str(output_path))
        print(f"   ✅ Saved: {output_path}")
        return output_path
    else:
        print("   ❌ Failed to generate full body")
        return None


# =============================================================================
# STEP 4: Close-Up from Full Body
# =============================================================================
def step4_closeup_portrait(fullbody_path: Path = None):
    """Generate close-up portrait from full body image."""
    print("\n" + "=" * 60)
    print("📸 STEP 4: Close-Up Portrait from Full Body")
    print("=" * 60)

    if not fullbody_path or not fullbody_path.exists():
        print("   ❌ No full body image available")
        return None

    print(f"   📥 Loading full body: {fullbody_path.name}")
    fullbody_bytes = load_image(fullbody_path)

    # Analyze the full body to get consistent appearance
    print("   🔍 Analyzing full body for close-up...")

    analysis = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=types.Content(
            parts=[
                types.Part(text="""Describe this football player for a CLOSE-UP portrait:
1. Face and hair details
2. The kit/uniform visible (shirt color, collar, logo, sponsor)
3. Expression and pose
4. Any distinctive features

This will be used to generate a close-up/headshot version showing head and upper chest."""),
                types.Part(inline_data=types.Blob(mime_type="image/png", data=fullbody_bytes)),
            ]
        )
    )

    closeup_analysis = analysis.text
    print(f"   📝 Analysis: {closeup_analysis[:300]}...")

    # Generate close-up
    print("\n   🎨 Generating close-up portrait...")

    prompt = f"""Create a CLOSE-UP portrait photograph of this football player:

{closeup_analysis}

COMPOSITION:
- Head and shoulders shot (from chest up)
- Face is the main focus
- Show top of the shirt with ASC Dalfsen logo and sponsor text
- Slight angle or straight-on

DETAILS:
- White shirt with blue collar visible
- ASC Dalfsen badge on left chest
- "Jopies Groene Wereld" sponsor text in green visible
- Same person, same expression, same lighting as reference

STYLE:
- Professional sports headshot
- Clean background (white/light gray)
- Sharp focus on face
- Natural lighting
- High resolution
"""

    response = client.models.generate_images(
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="1:1",  # Square for portrait
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        )
    )

    if response.generated_images:
        output_path = OUTPUT_DIR / "04_player_closeup.png"
        response.generated_images[0].image.save(str(output_path))
        print(f"   ✅ Saved: {output_path}")
        return output_path
    else:
        print("   ❌ Failed to generate close-up")
        return None


# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 ASC DALFSEN IMAGE PIPELINE")
    print("=" * 60)
    print(f"Input folder: {ASC_DIR.absolute()}")
    print(f"Output folder: {OUTPUT_DIR.absolute()}")

    # Run all steps
    tenue_path = step1_generate_flat_tenue()
    logo_path = step2_clean_logo()
    fullbody_path = step3_full_body_player(tenue_path)
    closeup_path = step4_closeup_portrait(fullbody_path)

    # Summary
    print("\n" + "=" * 60)
    print("📊 PIPELINE COMPLETE - RESULTS")
    print("=" * 60)

    results = [
        ("01_tenue_flat_design.png", "Flat design tenue template"),
        ("02_logo_clean.png", "Clean logo (vector style)"),
        ("03_player_fullbody.png", "Full body player in kit"),
        ("04_player_closeup.png", "Close-up portrait"),
    ]

    for filename, description in results:
        path = OUTPUT_DIR / filename
        if path.exists():
            size_kb = path.stat().st_size / 1024
            print(f"   ✅ {filename} ({size_kb:.1f} KB) - {description}")
        else:
            print(f"   ❌ {filename} - FAILED")

    print(f"\n📁 Open output folder: {OUTPUT_DIR.absolute()}")
    print("=" * 60)

"""
Gemini API Test Script
======================
Test Gemini text, vision en Imagen image generation.

Gebruik:
    set GOOGLE_API_KEY=AIza...
    python test_gemini.py
"""

import os
import sys
from pathlib import Path

# Zorg dat de API key is ingesteld
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("❌ GOOGLE_API_KEY niet gevonden!")
    print("   Voer uit: set GOOGLE_API_KEY=jouw-api-key")
    sys.exit(1)

print(f"✅ API Key gevonden: {GOOGLE_API_KEY[:10]}...")
print("-" * 50)


# =============================================================================
# TEST 1: Gemini Text Generation (nieuwe SDK)
# =============================================================================
def test_gemini_text():
    """Test basis text generation met Gemini 2.0 Flash."""
    print("\n🧪 TEST 1: Gemini Text Generation")
    print("-" * 40)

    try:
        from google import genai

        client = genai.Client(api_key=GOOGLE_API_KEY)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Geef een korte, enthousiaste beschrijving van een voetbalwedstrijd "
                     "tussen Ajax en Feyenoord. Max 2 zinnen."
        )

        print(f"✅ Response: {response.text}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


# =============================================================================
# TEST 2: Gemini Vision (Image Analysis)
# =============================================================================
def test_gemini_vision():
    """Test image analysis met Gemini 2.0 Flash."""
    print("\n🧪 TEST 2: Gemini Vision (Image Analysis)")
    print("-" * 40)

    try:
        from google import genai
        from google.genai import types
        import base64
        import urllib.request

        client = genai.Client(api_key=GOOGLE_API_KEY)

        # Download een test image (Public domain image)
        test_image_url = "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
        image_path = Path("test_image.png")

        print("   Downloading test image...")
        req = urllib.request.Request(test_image_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(image_path, 'wb') as f:
                f.write(response.read())

        # Read and encode image
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(
                    parts=[
                        types.Part(text="Beschrijf wat je ziet in deze afbeelding in 1 zin."),
                        types.Part(inline_data=types.Blob(mime_type="image/png", data=image_bytes))
                    ]
                )
            ]
        )

        print(f"✅ Vision Response: {response.text}")

        # Cleanup
        image_path.unlink(missing_ok=True)
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


# =============================================================================
# TEST 3: Imagen 4 Image Generation
# =============================================================================
def test_imagen_generation():
    """Test image generation met Imagen 4."""
    print("\n🧪 TEST 3: Imagen 4 Image Generation")
    print("-" * 40)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GOOGLE_API_KEY)

        print("   Generating image with Imagen 4...")
        response = client.models.generate_images(
            model="imagen-4.0-generate-001",
            prompt="A dramatic football stadium at sunset, photorealistic, golden hour lighting",
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )
        )

        # Save the generated image
        if response.generated_images:
            output_path = Path("generated_stadium.png")
            response.generated_images[0].image.save(output_path)
            print(f"✅ Image saved: {output_path}")
            print(f"   Open het bestand om de gegenereerde afbeelding te zien!")
            return True
        else:
            print("❌ No images generated")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        print("   Tip: Imagen vereist mogelijk Vertex AI setup of billing")
        return False


# =============================================================================
# TEST 4: List Available Models
# =============================================================================
def test_list_models():
    """Lijst beschikbare Gemini modellen."""
    print("\n🧪 TEST 4: Available Models")
    print("-" * 40)

    try:
        from google import genai

        client = genai.Client(api_key=GOOGLE_API_KEY)

        print("   Relevante modellen:")
        for model in client.models.list():
            name = model.name.lower()
            if "gemini-2" in name or "gemini-3" in name or "imagen" in name:
                print(f"   - {model.name}")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("🚀 GEMINI API TEST SUITE")
    print("=" * 50)

    results = {
        "Text Generation": test_gemini_text(),
        "Vision Analysis": test_gemini_vision(),
        "Image Generation": test_imagen_generation(),
        "List Models": test_list_models(),
    }

    print("\n" + "=" * 50)
    print("📊 RESULTATEN")
    print("=" * 50)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name}: {status}")

    print("\n" + "=" * 50)

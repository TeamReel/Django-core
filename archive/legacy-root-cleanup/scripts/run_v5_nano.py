"""
TeamReel V5 Pipeline: Nano Banana Experiment
============================================

Trying the 'models/nano-banana-pro-preview' model with the user's specific prompt.
"""

import os
import sys
from pathlib import Path
from google import genai
from google.genai import types

# Paths
INPUT_DIR = Path("asc/input")
OUTPUT_DIR = Path("asc/output_v5")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

def load_image(path):
    with open(path, "rb") as f:
        return f.read()

def run_nano_banana():
    print("\n🍌 V5: Testing 'nano-banana-pro-preview'...")
    print("-" * 50)

    # Load images
    actie = load_image(INPUT_DIR / "actie.png")
    logo = load_image(INPUT_DIR / "logo.png")
    sponsor = load_image(INPUT_DIR / "sponsor.png")

    # User's exact prompt
    prompt = """Combineer de aangeleverde foto’s tot één minimalistisch voetbaltenue-ontwerp.
    Het tenue moet bestaan uit: blauwe sokken, een blauw broekje en een wit shirt.
    Plaats het logo van ASC Dalfsen op de linkerborst van het shirt en zet de sponsor 'Jopies Groene Wereld' centraal op de voorkant.
    Houd de stijl strak en eenvoudig, zonder schaduwen of extra details, zodat het een clean template vormt dat later voor varianten gebruikt kan worden."""

    try:
        print("   🤖 Sending request to nano-banana-pro-preview...")

        response = client.models.generate_content(
            model='nano-banana-pro-preview',
            contents=types.Content(
                parts=[
                    types.Part(text=prompt),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=actie)),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=logo)),
                    types.Part(inline_data=types.Blob(mime_type="image/png", data=sponsor)),
                ]
            ),
            config=types.GenerateContentConfig(
                response_modalities=['IMAGE'], # Asking for image output
                safety_settings=[types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold="BLOCK_ONLY_HIGH"
                )]
            )
        )

        if response.candidates and response.candidates[0].content.parts:
            image_count = 0
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    image_count += 1
                    out = OUTPUT_DIR / f'tenue_nano_{image_count}.png'
                    with open(out, 'wb') as f:
                        f.write(part.inline_data.data)
                    print(f'   ✅ Saved: {out}')

            if image_count == 0:
                print("   ❌ Model returned text instead of image:")
                print(response.text)
        else:
            print("   ❌ No content generated.")

    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    run_nano_banana()

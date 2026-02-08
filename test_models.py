"""
Test different image generation models for better kit quality.
"""

import os
from pathlib import Path
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get('GOOGLE_API_KEY'))
OUTPUT = Path('asc/output')

def load_image(path):
    with open(path, 'rb') as f:
        return f.read()

# Load reference images
asc1 = load_image('asc/ASC 1.jpg')
asc2 = load_image('asc/asc 2.png')
logo = load_image('asc/asc logo raw.png')

print('🔍 Analyzing kit with Gemini 2.5 Pro (better analysis)...')

# Use Gemini 2.5 Pro for better analysis
analysis = client.models.generate_content(
    model='gemini-2.5-pro',
    contents=types.Content(
        parts=[
            types.Part(text="""Analyze these ASC Dalfsen football kit images VERY carefully.

IMAGE 1: Action photo or product shot of the kit
IMAGE 2: Kit illustration/template
IMAGE 3: Club logo

Describe EXACTLY what you see:
1. Shirt: EXACT colors, sleeve style, collar type
2. The sponsor text - what does it say exactly? What color is the text?
3. Logo position and design
4. Shorts and socks colors

Be VERY specific - I need to recreate this kit EXACTLY."""),
            types.Part(inline_data=types.Blob(mime_type='image/jpeg', data=asc1)),
            types.Part(inline_data=types.Blob(mime_type='image/png', data=asc2)),
            types.Part(inline_data=types.Blob(mime_type='image/png', data=logo)),
        ]
    )
)

kit_desc = analysis.text
print(f'📝 Analysis:\n{kit_desc[:800]}...\n')

# Prompt for exact recreation
prompt = """Create a FLAT LAY football kit template illustration for ASC Dalfsen:

EXACT KIT SPECIFICATIONS:
- WHITE long-sleeve shirt
- BLUE (azure/royal blue) collar on shirt
- BLUE (azure/royal blue) cuffs on sleeves
- BLUE shorts
- BLUE knee-high socks

SHIRT DETAILS:
- ASC Dalfsen club logo on LEFT CHEST (small blue/white shield)
- Sponsor text "Jopies Groene Wereld" - the word "Jopies" with a green leaf/plant icon, "Groene" in green, "WERELD" in yellow/gold below
- Sponsor is CENTERED on shirt front

LAYOUT:
- FLAT LAY arrangement: shirt in center, shorts below, socks on either side
- Clean WHITE background
- NO shadows, NO gradients
- Minimalist vector-style illustration
- Like a professional kit design template/mockup

STYLE: Clean, modern sports apparel template illustration"""

print('=' * 60)
print('🎨 TEST 1: Imagen 4 Ultra (highest quality)')
print('=' * 60)

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
        out = OUTPUT / '01b_tenue_ULTRA.png'
        response.generated_images[0].image.save(str(out))
        print(f'✅ Saved: {out}')
except Exception as e:
    print(f'❌ Error: {e}')

print()
print('=' * 60)
print('🎨 TEST 2: Gemini 3 Pro Image Preview (newest!)')
print('=' * 60)

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
                out = OUTPUT / '01c_tenue_GEMINI3.png'
                with open(out, 'wb') as f:
                    f.write(part.inline_data.data)
                print(f'✅ Saved: {out}')
                break
        else:
            print('❌ No image in response')
except Exception as e:
    print(f'❌ Error: {e}')

print()
print('=' * 60)
print('🎨 TEST 3: Gemini 2.5 Flash Image')
print('=' * 60)

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash-image',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=['IMAGE'],
        )
    )

    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                out = OUTPUT / '01d_tenue_GEMINI25.png'
                with open(out, 'wb') as f:
                    f.write(part.inline_data.data)
                print(f'✅ Saved: {out}')
                break
        else:
            print('❌ No image in response')
except Exception as e:
    print(f'❌ Error: {e}')

print()
print('=' * 60)
print('📁 Results in asc/output/:')
print('   - 01b_tenue_ULTRA.png (Imagen 4 Ultra)')
print('   - 01c_tenue_GEMINI3.png (Gemini 3 Pro)')
print('   - 01d_tenue_GEMINI25.png (Gemini 2.5 Flash)')
print('=' * 60)

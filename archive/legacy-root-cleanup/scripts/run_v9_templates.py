"""
TeamReel V9 Pipeline: Template-Driven Multi-Output
===================================================

Uses teamreel_prompts.py template library.
Runs all template types for both ASC and Ajax to validate.
"""

import os
import io
import time
from pathlib import Path
from PIL import Image
from google import genai
from google.genai import types
from teamreel_prompts import TEMPLATES, resolve_prompt

# Configuration
OUTPUT_DIR = Path("asc/output_v9")
client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))

# =============================================================================
# IMAGE PREPROCESSING
# =============================================================================

def square_pad(path, size=512):
    """Center image on transparent square canvas."""
    img = Image.open(path).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    img.thumbnail((int(size * 0.8), int(size * 0.8)), Image.Resampling.LANCZOS)
    x = (size - img.width) // 2
    y = (size - img.height) // 2
    canvas.paste(img, (x, y), img)
    b = io.BytesIO()
    canvas.save(b, format="PNG")
    return b.getvalue()


def landscape_pad(path, w=512, h=256):
    """Center image on transparent landscape canvas."""
    img = Image.open(path).convert("RGBA")
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    img.thumbnail((int(w * 0.8), int(h * 0.8)), Image.Resampling.LANCZOS)
    x = (w - img.width) // 2
    y = (h - img.height) // 2
    canvas.paste(img, (x, y), img)
    b = io.BytesIO()
    canvas.save(b, format="PNG")
    return b.getvalue()


def load_raw(path):
    if not path.exists():
        return None
    with open(path, "rb") as f:
        return f.read()


def prepare_image(path, preprocessing=None):
    """Apply preprocessing rule to image."""
    if not path.exists():
        print(f"  ⚠️  Not found: {path}")
        return None
    if preprocessing == "square_pad_512":
        return square_pad(path)
    elif preprocessing == "pad_512_landscape":
        return landscape_pad(path)
    else:
        return load_raw(path)


# =============================================================================
# KIT ANALYSIS (Gemini Flash)
# =============================================================================

def analyze_kit(team_name, ref_paths):
    print(f"  🔍 Analyzing {team_name} kit...")
    parts = [types.Part(text=f"""Analyze the football kit design in these images for {team_name}.
    Describe: 1. Shirt colors, trim details, patterns.  2. Shorts color, details.  3. Socks color, bands.
    Be concise and specific about colors. Ignore logo/sponsor (we have separate files).""")]

    count = 0
    for p in ref_paths:
        data = load_raw(p)
        if data:
            mime = "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
            parts.append(types.Part(inline_data=types.Blob(mime_type=mime, data=data)))
            count += 1

    if count == 0:
        return "White shirt with blue trim, blue shorts, blue socks."

    resp = client.models.generate_content(model="gemini-2.0-flash", contents=types.Content(parts=parts))
    return resp.text


# =============================================================================
# GENERATION ENGINE
# =============================================================================

def generate(template_id, params, image_parts, output_path, count=1):
    """
    Call nano-banana-pro-preview with resolved prompt + image parts.

    Args:
        template_id: Template key
        params: dict of resolved parameter values
        image_parts: list of types.Part(inline_data=...)
        output_path: Path for output files
        count: How many variants to generate
    """
    output_path.mkdir(parents=True, exist_ok=True)

    for i in range(1, count + 1):
        label = "_".join(f"{k}-{v}" for k, v in params.items() if not k.startswith("_"))
        filename = f"{template_id}_{i}_{label}.png"

        print(f"    🍌 [{i}/{count}] {filename}...")

        prompt_text = params.get("_resolved_prompt", "Generate a football kit.")

        all_parts = [types.Part(text=prompt_text)] + image_parts

        try:
            resp = client.models.generate_content(
                model='nano-banana-pro-preview',
                contents=types.Content(parts=all_parts),
                config=types.GenerateContentConfig(
                    response_modalities=['IMAGE'],
                    safety_settings=[types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_ONLY_HIGH"
                    )]
                )
            )

            if resp.candidates and resp.candidates[0].content.parts:
                for part in resp.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        out = output_path / filename
                        with open(out, 'wb') as f:
                            f.write(part.inline_data.data)
                        print(f"       ✅ {out}")
            else:
                print(f"       ❌ No image returned")
        except Exception as e:
            print(f"       ❌ {e}")

        time.sleep(1)


# =============================================================================
# TEAM DEFINITIONS
# =============================================================================

TEAMS = {
    "asc": {
        "name": "ASC Dalfsen",
        "reference": [Path("asc/input/actie.png")],
        "logo": Path("asc/input/logo.png"),
        "sponsor": Path("asc/input/sponsor.png"),
        "person": Path("asc/Henk.jpg"),
    },
    "ajax": {
        "name": "Ajax",
        "reference": [Path("asc/input/ajax/ajax.JPG")],
        "logo": Path("asc/input/ajax/logo.jpg"),
        "sponsor": Path("asc/input/ajax/sponsor.png"),
        "person": Path("asc/Henk.jpg"),  # Same person for demo
    },
}

# =============================================================================
# JOBS: What to generate per team
# =============================================================================

JOBS = [
    # --- Logo & Sponsor Cleanup ---
    {
        "template": "logo_standardize",
        "params": {"background": "transparent", "style": "original"},
        "images": ["logo"],
        "count": 1,
    },
    {
        "template": "sponsor_standardize",
        "params": {"background": "transparent", "orientation": "landscape"},
        "images": ["sponsor"],
        "count": 1,
    },
    # --- Tenue Variants ---
    {
        "template": "tenue_generate",
        "params": {"sleeves": "short", "neck": "round", "kit_type": "home"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    {
        "template": "tenue_generate",
        "params": {"sleeves": "short", "neck": "collar", "kit_type": "home"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    {
        "template": "tenue_generate",
        "params": {"sleeves": "long", "neck": "round", "kit_type": "home"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    {
        "template": "tenue_generate",
        "params": {"sleeves": "long", "neck": "collar", "kit_type": "home"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    # --- Keeper (contrasting colors) ---
    {
        "template": "keeper_tenue",
        "params": {"sleeves": "long", "neck": "round", "keeper_color": "neon_green"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    {
        "template": "keeper_tenue",
        "params": {"sleeves": "long", "neck": "round", "keeper_color": "purple"},
        "images": ["logo", "sponsor"],
        "count": 1,
    },
    # --- Tracksuit ---
    {
        "template": "tracksuit_generate",
        "params": {"style": "modern_slim", "color_scheme": "team_colors"},
        "images": ["logo"],
        "count": 1,
    },
    # --- Fullbody (chroma-key background) ---
    {
        "template": "fullbody_in_tenue",
        "params": {"sleeves": "short", "pose": "standing_front", "role": "player"},
        "images": ["person", "logo", "sponsor"],
        "count": 1,
    },
    {
        "template": "fullbody_in_tenue",
        "params": {"sleeves": "long", "pose": "standing_arms_crossed", "role": "goalkeeper"},
        "images": ["person", "logo", "sponsor"],
        "count": 1,
    },
    # --- Closeup (chroma-key background, shoulders visible) ---
    {
        "template": "closeup_in_tenue",
        "params": {"neck": "round", "expression": "neutral_confident"},
        "images": ["person", "logo", "sponsor"],
        "count": 1,
    },
]


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  TeamReel V9 — Template-Driven Generation Pipeline")
    print("=" * 60)

    for team_key, team in TEAMS.items():
        print(f"\n{'='*60}")
        print(f"  TEAM: {team['name']}")
        print(f"{'='*60}")

        # 1. Analyze kit DNA
        kit_analysis = analyze_kit(team["name"], team["reference"])
        team_output = OUTPUT_DIR / team_key

        # 2. Run each job
        for job_idx, job in enumerate(JOBS):
            template_id = job["template"]
            tmpl = TEMPLATES[template_id]
            params = job["params"].copy()

            print(f"\n  📋 Job {job_idx+1}/{len(JOBS)}: {tmpl['name']} ({template_id})")

            # Resolve the prompt
            resolved = resolve_prompt(template_id, params, kit_analysis=kit_analysis)
            params["_resolved_prompt"] = resolved

            # Build image parts
            image_parts = []
            preproc = tmpl.get("preprocessing", {})

            for img_key in job["images"]:
                path = team.get(img_key) or team.get("reference", [None])[0]
                if path and path.exists():
                    # Determine preprocessing
                    prep_rule = preproc.get(img_key)
                    data = prepare_image(path, prep_rule)
                    if data:
                        image_parts.append(
                            types.Part(inline_data=types.Blob(mime_type="image/png", data=data))
                        )

            # Generate
            job_output = team_output / tmpl["category"]
            generate(template_id, params, image_parts, job_output, count=job["count"])

    print(f"\n{'='*60}")
    print(f"  ✅ DONE — All outputs in: {OUTPUT_DIR}")
    print(f"{'='*60}")

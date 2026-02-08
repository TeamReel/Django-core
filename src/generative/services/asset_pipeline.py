"""Asset generation pipeline service for TeamReel.

Integrates teamreel_prompts.py templates with Google Gemini for:
1. Kit analysis (Gemini 2.0 Flash → text description)
2. Prompt resolution (template + params + analysis → final prompt)
3. Image generation (nano-banana-pro-preview → variants)

This is the backend counterpart of the frontend AssetGenerationModal.
"""

from __future__ import annotations

import base64
import logging
import time
from io import BytesIO
from typing import Any

from django.conf import settings

logger = logging.getLogger("generative.services.asset_pipeline")


# =============================================================================
# Image preprocessing helpers (mirrors Pillow logic from run_v9_templates.py)
# =============================================================================


def _preprocess_logo(image_bytes: bytes) -> bytes:
    """Pad logo to 512×512 transparent square (centered)."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))

    # Scale to fit within 480×480 (keep margin)
    img.thumbnail((480, 480), Image.Resampling.LANCZOS)
    offset = ((512 - img.width) // 2, (512 - img.height) // 2)
    canvas.paste(img, offset, img)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def _preprocess_sponsor(image_bytes: bytes) -> bytes:
    """Pad sponsor to 512×256 transparent landscape (centered)."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (512, 256), (0, 0, 0, 0))

    img.thumbnail((500, 240), Image.Resampling.LANCZOS)
    offset = ((512 - img.width) // 2, (256 - img.height) // 2)
    canvas.paste(img, offset, img)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


PREPROCESSORS = {
    "square_pad_512": _preprocess_logo,
    "pad_512_landscape": _preprocess_sponsor,
}


# =============================================================================
# Kit Analysis (Gemini 2.0 Flash)
# =============================================================================


def analyze_kit(reference_image_bytes: bytes) -> str:
    """Analyze a reference photo to extract kit design specifications.

    Uses Gemini 2.0 Flash for multimodal image understanding.

    Returns:
        Text description of kit design DNA (colors, patterns, etc.)
    """
    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    client = genai.Client(api_key=api_key)

    analysis_prompt = """Analyze this football (soccer) team's kit and describe EXACTLY:

1. PRIMARY COLOR(S): Exact colors (use color names AND hex codes if possible)
2. SECONDARY COLOR(S): Any accent/trim colors
3. PATTERN: Stripes (horizontal/vertical/diagonal), solid, gradient, halves, hoops, etc.
4. STRIPE/PATTERN DETAILS: Width, spacing, direction, any special design elements
5. COLLAR STYLE: Round neck, V-neck, polo collar, etc.
6. SLEEVE STYLE: Any different color/pattern on sleeves
7. SHORTS COLOR: Color and any trim/stripe details
8. SOCKS: Color, any horizontal stripes or solid
9. ANY DISTINCTIVE FEATURES: Special design elements, watermarks, subtle patterns

Describe as if writing a MANUFACTURING SPECIFICATION for a factory to reproduce this EXACT kit.
Be VERY specific about colors and patterns. Use the format: "Primary: [color]. Secondary: [color]. Pattern: [description]."
"""

    # Build content parts
    image_part = types.Part.from_bytes(
        data=reference_image_bytes,
        mime_type="image/png",
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[analysis_prompt, image_part],
    )

    return response.text


# =============================================================================
# Image Generation (nano-banana-pro-preview)
# =============================================================================


def generate_asset(
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    variant_count: int = 1,
) -> list[dict[str, Any]]:
    """Generate asset variants using the TeamReel prompt pipeline.

    Args:
        template_id: Template key from teamreel_prompts.TEMPLATES
        params: Parameter values (e.g. {"sleeves": "short", "neck": "round"})
        input_images: Dict of input images as bytes (keys: logo, sponsor, reference_photo, person_photo)
        variant_count: Number of variants to generate (1-4)

    Returns:
        List of dicts with keys: {image_bytes, mime_type, filename, metadata}
    """
    # Import the prompts module (root-level)
    import importlib.util
    import os

    prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
    if not os.path.exists(prompts_path):
        # Try alternate path (when BASE_DIR is project root)
        prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")

    spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
    prompts_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prompts_module)

    TEMPLATES = prompts_module.TEMPLATES
    resolve_prompt = prompts_module.resolve_prompt
    PREPROCESSORS_MAP = prompts_module.TEMPLATES[template_id].get("preprocessing", {})

    if template_id not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_id}")

    template = TEMPLATES[template_id]

    # Step 1: Preprocess input images
    processed_images = {}
    for img_key, img_bytes in input_images.items():
        preprocess_fn_name = PREPROCESSORS_MAP.get(img_key)
        if preprocess_fn_name and preprocess_fn_name in PREPROCESSORS:
            processed_images[img_key] = PREPROCESSORS[preprocess_fn_name](img_bytes)
            logger.info("Preprocessed %s with %s", img_key, preprocess_fn_name)
        else:
            processed_images[img_key] = img_bytes

    # Step 2: Kit analysis (if template requires reference_photo)
    kit_analysis = ""
    if "reference_photo" in template.get("input_requirements", []):
        ref_img = processed_images.get("reference_photo")
        if ref_img:
            kit_analysis = analyze_kit(ref_img)
            logger.info("Kit analysis complete: %d chars", len(kit_analysis))

    # Step 3: Resolve prompt
    final_prompt = resolve_prompt(template_id, params, kit_analysis)
    logger.info("Resolved prompt for %s: %d chars", template_id, len(final_prompt))

    # Step 4: Generate variants
    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    client = genai.Client(api_key=api_key)

    results = []
    for i in range(variant_count):
        try:
            # Build content parts: prompt text + all input images
            content_parts = [final_prompt]

            for img_key in template.get("input_requirements", []):
                img_data = processed_images.get(img_key)
                if img_data:
                    content_parts.append(
                        types.Part.from_bytes(data=img_data, mime_type="image/png")
                    )

            response = client.models.generate_content(
                model="models/nano-banana-pro-preview",
                contents=content_parts,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

            # Extract generated image
            image_bytes = None
            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    image_bytes = part.inline_data.data
                    break

            if image_bytes:
                # Generate unique filename
                param_str = "_".join(f"{k}-{v}" for k, v in sorted(params.items()))
                filename = f"{template_id}_{param_str}_v{i+1}_{int(time.time())}.png"

                results.append(
                    {
                        "image_bytes": image_bytes,
                        "image_base64": base64.b64encode(image_bytes).decode("utf-8"),
                        "mime_type": "image/png",
                        "filename": filename,
                        "variant_index": i,
                        "metadata": {
                            "template_id": template_id,
                            "params": params,
                            "kit_analysis_length": len(kit_analysis),
                        },
                    }
                )
                logger.info("Generated variant %d/%d for %s", i + 1, variant_count, template_id)
            else:
                logger.warning("No image in response for variant %d", i + 1)
                results.append(
                    {
                        "image_bytes": None,
                        "image_base64": None,
                        "mime_type": None,
                        "filename": None,
                        "variant_index": i,
                        "error": "No image generated",
                    }
                )

        except Exception as e:  # noqa: BLE001
            logger.exception("Error generating variant %d: %s", i + 1, e)
            results.append(
                {
                    "image_bytes": None,
                    "image_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "variant_index": i,
                    "error": str(e),
                }
            )

    return results

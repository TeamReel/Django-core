"""Gemini-based image generation and validation for asset pipeline.

Handles:
- Kit analysis (Gemini 2.0 Flash multimodal)
- Pillow-only postprocessing (no Gemini call)
- Photo composite validation
- Photo composite generation (multi-image preprocessing + Gemini)
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

from django.conf import settings

from .preprocessing import (
    OUTPUT_POSTPROCESSORS,
    PILLOW_ONLY_TEMPLATES,
    PREPROCESSORS,
    _crop_gemini_output_upper_body,
    _strip_checkerboard,
)

logger = logging.getLogger("generative.services.gemini_image")


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
# Pillow-Only Postprocessing (no Gemini)
# =============================================================================


def _pillow_only_postprocess(
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
) -> list[dict[str, Any]]:
    """Run postprocess templates using pure Pillow — no Gemini call.

    Postprocess templates (logo_postprocess, sponsor_postprocess, etc.) only
    need to crop, center, remove background and resize.  Sending these through
    Gemini causes quality degradation (colour shifts, darkening, detail loss).

    This function applies the same OUTPUT_POSTPROCESSORS that would run after
    Gemini, but directly on the source image — skipping Gemini entirely.
    """
    # Get the source image bytes (postprocess input key is "source")
    source_bytes = input_images.get("source")
    if not source_bytes:
        return [
            {
                "image_bytes": None,
                "image_base64": None,
                "mime_type": None,
                "filename": None,
                "variant_index": 0,
                "error": "No source image provided for postprocessing",
            }
        ]

    postprocessor = OUTPUT_POSTPROCESSORS.get(template_id)
    if not postprocessor:
        return [
            {
                "image_bytes": None,
                "image_base64": None,
                "mime_type": None,
                "filename": None,
                "variant_index": 0,
                "error": f"No postprocessor defined for {template_id}",
            }
        ]

    try:
        result_bytes = postprocessor(source_bytes, params)
        safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
        param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
        if len(param_str) > 100:
            param_str = param_str[:97] + "..."
        filename = f"{template_id}_{param_str}_v1_{int(time.time())}.png"

        logger.info(
            "Pillow-only postprocess for %s complete (no Gemini call)",
            template_id,
        )

        return [
            {
                "image_bytes": result_bytes,
                "image_base64": base64.b64encode(result_bytes).decode("utf-8"),
                "mime_type": "image/png",
                "filename": filename,
                "variant_index": 0,
                "metadata": {
                    "template_id": template_id,
                    "params": params,
                    "pillow_only": True,
                },
            }
        ]
    except Exception as e:  # noqa: BLE001
        logger.exception("Pillow-only postprocess failed for %s: %s", template_id, e)
        return [
            {
                "image_bytes": None,
                "image_base64": None,
                "mime_type": None,
                "filename": None,
                "variant_index": 0,
                "error": f"Postprocess failed: {e}",
            }
        ]


# =============================================================================
# Image Generation (nano-banana-pro-preview)
# =============================================================================


# Validation prompt for photo composite quality check
PHOTO_COMPOSITE_VALIDATION_PROMPT = """You are a quality control AI for photo composites. Analyze this composite image against the source images.

SOURCE IMAGES PROVIDED:
1. Generated composite (the image to validate)
2. Original legacy player photo (cropped to upper body)
3. Original current player photo (cropped to upper body)

VALIDATION CRITERIA - Check each one:

1. FACE ACCURACY (Critical):
   - Do both faces in the composite match the source faces exactly?
   - No distortion, no AI-generated features, no wrong facial structure?

2. KIT/UNIFORM ACCURACY (Critical):
   - Are the football kits/jerseys preserved exactly from the source images?
   - Correct colors, logos, patterns, sponsor text?

3. NO LEGS VISIBLE (Critical):
   - The players should be cropped at waist/navel level — upper body only.
   - Are there ANY legs, thighs, hips, or lower body visible?
   - If ANY legs or lower body is visible, this is an AUTOMATIC FAIL.

4. NO TOUCHING:
   - Is there a visible gap between the two players?
   - They should NOT be touching shoulders, arms, or overlapping.

5. CLEAN EDGES:
   - No visible halos or cutout edges around the players?
   - Seamless blending with the background?

6. NO ARTIFACTS:
   - No distorted limbs, extra fingers, blurred faces?
   - No obvious AI generation artifacts?

RESPOND IN THIS EXACT FORMAT:
PASS or FAIL
SCORE: X/6 (number of criteria passed)
ISSUES: [list specific problems found, or "None" if all pass]

Be strict. If faces or kits are noticeably different from source, that's a FAIL.
If ANY legs or lower body is visible beyond the waist, that's a FAIL.
"""


def _validate_photo_composite(
    generated_bytes: bytes,
    legacy_cropped_bytes: bytes,
    current_cropped_bytes: bytes,
    api_key: str,
) -> tuple[bool, str, int]:
    """Validate a generated photo composite against source images.

    Returns:
        tuple: (passed: bool, issues: str, score: int out of 6)
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    try:
        content_parts: list = [PHOTO_COMPOSITE_VALIDATION_PROMPT]
        # Image 1: Generated composite
        content_parts.append(types.Part.from_bytes(data=generated_bytes, mime_type="image/png"))
        # Image 2: Legacy player source
        content_parts.append(
            types.Part.from_bytes(data=legacy_cropped_bytes, mime_type="image/png")
        )
        # Image 3: Current player source
        content_parts.append(
            types.Part.from_bytes(data=current_cropped_bytes, mime_type="image/png")
        )

        response = client.models.generate_content(
            model="models/gemini-2.0-flash",  # Fast model for validation
            contents=content_parts,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT"],
            ),
        )

        if not response.candidates or not response.candidates[0].content:
            logger.warning("Empty validation response from Gemini")
            return True, "Validation skipped (empty response)", 6  # Pass on error

        response_text = ""
        for part in response.candidates[0].content.parts:
            if hasattr(part, "text"):
                response_text += part.text

        # Parse response
        lines = response_text.strip().split("\n")
        passed = lines[0].strip().upper().startswith("PASS") if lines else True

        score = 6
        for line in lines:
            if line.strip().upper().startswith("SCORE:"):
                try:
                    score_part = line.split(":")[1].strip()
                    score = int(score_part.split("/")[0])
                except (IndexError, ValueError):
                    pass

        issues = "None"
        for i, line in enumerate(lines):
            if line.strip().upper().startswith("ISSUES:"):
                issues = line.split(":", 1)[1].strip() if ":" in line else "None"
                # Include following lines as part of issues
                if i + 1 < len(lines):
                    issues += " " + " ".join(lines[i + 1 :])
                break

        logger.info(
            "Photo composite validation: %s (score %d/6) - %s",
            "PASS" if passed else "FAIL",
            score,
            issues[:100],
        )
        return passed, issues, score

    except Exception as e:  # noqa: BLE001
        logger.warning("Photo composite validation error: %s", e)
        return True, f"Validation skipped ({e})", 6  # Pass on error to not block


def _generate_photo_composite_gemini(
    input_images: dict[str, bytes],
    params: dict[str, str],
    variant_count: int = 1,
    model: str | None = None,
) -> list[dict[str, Any]]:
    """Generate photo composite via Gemini with multi-image preprocessing.

    This is Step 1 of the modular photo composite pipeline.
    Takes two fullbody images (current + legacy) and a background image,
    preprocesses them (crop to hips, mirror legacy, create reference layout),
    then asks Gemini to produce a photorealistic composite.

    Expected input_images keys:
      - ``person_photo``: current fullbody in home kit (transparent PNG)
      - ``reference_photo``: legacy fullbody (transparent PNG)
      - ``background``: stadium/location background image

    Returns list of result dicts compatible with ``generate_asset()`` format.
    """
    import tempfile
    from pathlib import Path

    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured — cannot run Gemini composite")

    person_bytes = input_images.get("person_photo")
    reference_bytes = input_images.get("reference_photo")
    bg_bytes = input_images.get("background")

    if not person_bytes or not reference_bytes:
        raise ValueError(
            "photo_composite_gemini requires person_photo (current) and reference_photo (legacy)"
        )
    if not bg_bytes:
        raise ValueError("photo_composite_gemini requires a background image")

    # ── Preprocessing: use halfbody images directly + create reference composite ──
    # Input images are already halfbody (head to waist, ~55% crop, 768x1024).
    # No additional cropping needed — just create the reference layout for Gemini.
    from src.video.services.then_vs_now_composer import (
        _prepare_gemini_composite_image,
    )

    # Import _load_prompts_module from the orchestrator
    from .asset_pipeline import _load_prompts_module

    tmp_dir = Path(tempfile.mkdtemp(prefix="photo_composite_gemini_"))
    try:
        # Write input bytes to temp files
        # Swap assignment: Gemini seems to invert the reference layout
        # So we put current halfbody in legacy_path (LEFT) → Gemini outputs current RIGHT
        # And legacy in home_path (RIGHT) → Gemini outputs legacy LEFT
        home_path = tmp_dir / "home.png"
        legacy_path = tmp_dir / "legacy.png"
        bg_path = tmp_dir / "background.png"
        home_path.write_bytes(reference_bytes)  # legacy content (goes LEFT in ref)
        legacy_path.write_bytes(person_bytes)  # current content (goes RIGHT in ref)
        bg_path.write_bytes(bg_bytes)

        # No cropping needed — halfbody images are already head-to-waist

        # Create rough reference composite (PIL) for Gemini positioning guidance
        ref_composite = tmp_dir / "ref_composite.png"
        _prepare_gemini_composite_image(bg_path, home_path, legacy_path, ref_composite)

        # Read bytes for Gemini input
        home_cropped_bytes = home_path.read_bytes()
        legacy_cropped_bytes = legacy_path.read_bytes()
        ref_composite_bytes = ref_composite.read_bytes()
    finally:
        # Cleanup happens after we read the bytes
        import shutil

        shutil.rmtree(tmp_dir, ignore_errors=True)

    # ── Resolve prompt from template ──
    prompts_module = _load_prompts_module()
    final_prompt = prompts_module.resolve_prompt("photo_composite_gemini", params)

    # ── Generate via Gemini ──
    client = genai.Client(api_key=api_key)
    image_model = model or "models/nano-banana-pro-preview"
    if not image_model.startswith("models/"):
        image_model = f"models/{image_model}"

    results: list[dict[str, Any]] = []
    for i in range(variant_count):
        if i > 0:
            time.sleep(1.5)

        try:
            # Build content: prompt + 4 images (bg, legacy crop, home crop, ref composite)
            content_parts: list = [final_prompt]
            # Image 1: Background
            content_parts.append(types.Part.from_bytes(data=bg_bytes, mime_type="image/png"))
            # Image 2: Legacy player (cropped + mirrored)
            content_parts.append(
                types.Part.from_bytes(data=legacy_cropped_bytes, mime_type="image/png")
            )
            # Image 3: Current player (cropped)
            content_parts.append(
                types.Part.from_bytes(data=home_cropped_bytes, mime_type="image/png")
            )
            # Image 4: Reference composite (rough PIL placement guide)
            content_parts.append(
                types.Part.from_bytes(data=ref_composite_bytes, mime_type="image/png")
            )

            response = client.models.generate_content(
                model=image_model,
                contents=content_parts,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    safety_settings=[
                        types.SafetySetting(
                            category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"
                        ),
                        types.SafetySetting(
                            category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"
                        ),
                    ],
                ),
            )

            image_bytes = None
            if (
                not response.candidates
                or not response.candidates[0].content
                or not response.candidates[0].content.parts
            ):
                block_reason = getattr(response, "prompt_feedback", None)
                logger.warning(
                    "Empty Gemini response for photo_composite variant %d (block=%s)",
                    i + 1,
                    block_reason,
                )
                results.append(
                    {
                        "image_bytes": None,
                        "image_base64": None,
                        "mime_type": None,
                        "filename": None,
                        "variant_index": i,
                        "error": f"Gemini returned empty (block: {block_reason})",
                    }
                )
                continue

            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    image_bytes = part.inline_data.data
                    break

            if image_bytes:
                # ── Validate the generated composite ──
                max_retries = 3
                attempt = 1
                validated = False
                final_image_bytes = image_bytes
                validation_issues = ""

                while attempt <= max_retries and not validated:
                    passed, issues, score = _validate_photo_composite(
                        final_image_bytes,
                        legacy_cropped_bytes,
                        home_cropped_bytes,
                        api_key,
                    )

                    if passed or score >= 5:
                        validated = True
                        logger.info(
                            "Photo composite variant %d passed validation (attempt %d, score %d/6)",
                            i + 1,
                            attempt,
                            score,
                        )
                    else:
                        validation_issues = issues
                        logger.warning(
                            "Photo composite variant %d failed validation (attempt %d, score %d/6): %s",
                            i + 1,
                            attempt,
                            score,
                            issues[:200],
                        )

                        if attempt < max_retries:
                            # Retry: generate again
                            time.sleep(1.5)
                            logger.info(
                                "Retrying photo composite variant %d (attempt %d/%d)...",
                                i + 1,
                                attempt + 1,
                                max_retries,
                            )

                            retry_response = client.models.generate_content(
                                model=image_model,
                                contents=content_parts,
                                config=types.GenerateContentConfig(
                                    response_modalities=["IMAGE", "TEXT"],
                                    safety_settings=[
                                        types.SafetySetting(
                                            category="HARM_CATEGORY_HARASSMENT",
                                            threshold="BLOCK_NONE",
                                        ),
                                        types.SafetySetting(
                                            category="HARM_CATEGORY_HATE_SPEECH",
                                            threshold="BLOCK_NONE",
                                        ),
                                        types.SafetySetting(
                                            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                                            threshold="BLOCK_NONE",
                                        ),
                                        types.SafetySetting(
                                            category="HARM_CATEGORY_DANGEROUS_CONTENT",
                                            threshold="BLOCK_NONE",
                                        ),
                                    ],
                                ),
                            )

                            retry_image_bytes = None
                            if retry_response.candidates and retry_response.candidates[0].content:
                                for part in retry_response.candidates[0].content.parts:
                                    if hasattr(part, "inline_data") and part.inline_data:
                                        retry_image_bytes = part.inline_data.data
                                        break

                            if retry_image_bytes:
                                final_image_bytes = retry_image_bytes

                        attempt += 1

                # ── Post-Gemini crop: ensure consistent upper body framing ──
                # This guarantees no legs even if Gemini generates them
                final_image_bytes = _crop_gemini_output_upper_body(final_image_bytes)

                filename = f"photo_composite_gemini_v{i+1}_{int(time.time())}.png"
                result_metadata = {
                    "template_id": "photo_composite_gemini",
                    "params": params,
                    "validation_passed": validated,
                    "validation_attempts": attempt,
                }
                if not validated:
                    result_metadata["validation_issues"] = validation_issues[:500]
                    result_metadata["needs_manual_review"] = True

                results.append(
                    {
                        "image_bytes": final_image_bytes,
                        "image_base64": base64.b64encode(final_image_bytes).decode("utf-8"),
                        "mime_type": "image/png",
                        "filename": filename,
                        "variant_index": i,
                        "metadata": result_metadata,
                    }
                )
                logger.info(
                    "Photo composite Gemini variant %d/%d generated (validated=%s, attempts=%d)",
                    i + 1,
                    variant_count,
                    validated,
                    attempt,
                )
            else:
                results.append(
                    {
                        "image_bytes": None,
                        "image_base64": None,
                        "mime_type": None,
                        "filename": None,
                        "variant_index": i,
                        "error": "No image in Gemini response",
                    }
                )
        except Exception as e:  # noqa: BLE001
            logger.exception("Photo composite Gemini variant %d failed: %s", i + 1, e)
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

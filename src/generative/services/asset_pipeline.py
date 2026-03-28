"""Asset generation pipeline service for TeamReel.

Orchestration layer that delegates to focused modules:
- preprocessing.py  — Pillow image pre/post-processing
- gemini_image.py   — Gemini-based image generation & validation
- video_providers.py — MiniMax, Runway, Pika, Veo video generation

Public API (backward-compatible imports):
- generate_asset()
- generate_video()
- analyze_kit()
- _strip_checkerboard()
- _get_template_output_type()
- PILLOW_ONLY_TEMPLATES
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

from django.conf import settings

# ── Barrel imports for backward compatibility ──
# These symbols are imported from sub-modules but re-exported here so that
# existing code (views, tasks, video services) keeps working unchanged.
from .gemini_image import (  # noqa: F401
    PHOTO_COMPOSITE_VALIDATION_PROMPT,
    _generate_photo_composite_gemini,
    _pillow_only_postprocess,
    _validate_photo_composite,
    analyze_kit,
)
from .preprocessing import (  # noqa: F401
    OUTPUT_POSTPROCESSORS,
    PILLOW_ONLY_TEMPLATES,
    PREPROCESSORS,
    _composite_side_by_side,
    _crop_gemini_output_upper_body,
    _strip_checkerboard,
)
from .video_providers import (  # noqa: F401
    _generate_video_minimax,
    _generate_video_pika,
    _generate_video_runway,
    _generate_video_veo,
)

logger = logging.getLogger("generative.services.asset_pipeline")


def _get_template_output_type(template_id: str) -> str:
    """Get the output type for a template (image or video).

    Args:
        template_id: Template key from teamreel_prompts.TEMPLATES

    Returns:
        'image' or 'video'

    Raises:
        ValueError: If template not found
    """
    import importlib.util
    import os

    prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
    if not os.path.exists(prompts_path):
        prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")

    spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
    prompts_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prompts_module)

    TEMPLATES = prompts_module.TEMPLATES

    if template_id not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_id}")

    template = TEMPLATES[template_id]
    return template.get("output_type", "image")


# =============================================================================


def generate_asset(
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    variant_count: int = 1,
    model: str | None = None,
) -> list[dict[str, Any]]:
    """Generate asset variants using the TeamReel prompt pipeline.

    Special handling for ``photo_composite_gemini``: crops player fullbodies
    to hips, creates a rough PIL reference composite, then sends all 4 images
    (background + 2 cropped players + reference) to Gemini for photorealistic
    compositing.

    Args:
        template_id: Template key from teamreel_prompts.TEMPLATES
        params: Parameter values (e.g. {"sleeves": "short", "neck": "round"})
        input_images: Dict of input images as bytes (keys: logo, sponsor, reference_photo, person_photo)
        variant_count: Number of variants to generate (1-4)

    Returns:
        List of dicts with keys: {image_bytes, mime_type, filename, metadata}
    """
    # =========================================================================
    # Fast path: postprocess templates are pure Pillow (no Gemini).
    # These only crop, center and resize — sending through Gemini would
    # degrade quality (colours shift, details lost, logo gets darker).
    # =========================================================================
    if template_id in PILLOW_ONLY_TEMPLATES:
        return _pillow_only_postprocess(template_id, params, input_images)

    # =========================================================================
    # Photo composite Gemini: custom multi-image preprocessing.
    # Crops fullbodies to hips, creates reference composite, sends 4 images.
    # =========================================================================
    if template_id == "photo_composite_gemini":
        return _generate_photo_composite_gemini(input_images, params, variant_count, model)

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

    # Step 2b: Guest player — generate a silhouette as person_photo if not provided
    is_guest_player = params.get("guest_player", False)
    if is_guest_player and "person_photo" not in processed_images:
        from src.video.services.header_generator import generate_guest_silhouette
        import io

        silhouette_img = generate_guest_silhouette(width=1080, height=1920)
        buf = io.BytesIO()
        silhouette_img.save(buf, format="PNG")
        processed_images["person_photo"] = buf.getvalue()
        logger.info("Guest player mode: injected silhouette as person_photo")

    # Step 3: Resolve prompt
    final_prompt = resolve_prompt(template_id, params, kit_analysis)

    # Append guest-specific instructions to prompt
    if is_guest_player:
        guest_hint = (
            "\n\nIMPORTANT OVERRIDE — GUEST PLAYER MODE:\n"
            "The person in the reference is a GREY SILHOUETTE placeholder. "
            "Generate a GENERIC, ANONYMOUS football player figure (NO recognisable face). "
            "The face MUST be a featureless, smooth oval (like a mannequin) — "
            "do NOT add eyes, nose, mouth or any facial features. "
            "The body should be athletic and realistic, wearing the specified kit. "
            "Keep the same pose and proportions as instructed."
        )
        final_prompt = final_prompt + guest_hint
        logger.info("Guest player mode: appended anonymous face instructions")

    logger.info("Resolved prompt for %s: %d chars", template_id, len(final_prompt))

    # Step 4: Generate variants
    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    client = genai.Client(api_key=api_key)

    # Resolve image generation model (user override or default)
    image_model = model or "models/nano-banana-pro-preview"
    # Ensure model has "models/" prefix for Gemini API
    if not image_model.startswith("models/"):
        image_model = f"models/{image_model}"
    logger.info("Using image model: %s", image_model)

    results = []
    for i in range(variant_count):
        # Inter-request delay to prevent Gemini rate limiting (skip first)
        if i > 0:
            delay = 1.5  # 1.5s between variants
            logger.info("Waiting %.1fs before variant %d (rate-limit protection)", delay, i + 1)
            time.sleep(delay)

        try:
            # Build content parts: prompt text + all input images
            content_parts = [final_prompt]

            for img_key in template.get("input_requirements", []):
                img_data = processed_images.get(img_key)
                if img_data:
                    content_parts.append(
                        types.Part.from_bytes(data=img_data, mime_type="image/png")
                    )

            # Check for generation config in template
            # Note: nano-banana-pro-preview does not support aspect_ratio in GenerateContentConfig yet.
            # We rely on the prompt instructions for image aspect ratio.

            response = client.models.generate_content(
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

            # Extract generated image — guard against empty/blocked responses
            image_bytes = None
            if (
                not response.candidates
                or not response.candidates[0].content
                or not response.candidates[0].content.parts
            ):
                block_reason = getattr(response, "prompt_feedback", None)
                logger.warning(
                    "Empty Gemini response for %s variant %d (block_reason=%s)",
                    template_id,
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
                        "error": f"Gemini returned empty response (possibly content-blocked): {block_reason}",
                    }
                )
                continue

            for part in response.candidates[0].content.parts:
                if hasattr(part, "inline_data") and part.inline_data:
                    image_bytes = part.inline_data.data
                    break

            if image_bytes:
                # === Output Postprocessor: tight-crop + center (Pillow-based) ===
                output_pp = OUTPUT_POSTPROCESSORS.get(template_id)
                if output_pp:
                    try:
                        image_bytes = output_pp(image_bytes, params)
                        logger.info("Applied output postprocessor for %s", template_id)
                    except Exception as pp_err:  # noqa: BLE001
                        logger.warning(
                            "Output postprocessor failed for %s (using raw Gemini output): %s",
                            template_id,
                            pp_err,
                        )

                # Generate unique filename
                # Exclude user_instruction to prevent filename explosion (>255 chars)
                safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
                param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))

                # Truncate param string to ~100 chars to satisfy DB limits (FileAsset.original_name is 255)
                # and filesystem limits.
                if len(param_str) > 100:
                    param_str = param_str[:97] + "..."

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


# =============================================================================
# Video Generation (MiniMax / Hailuo — primary, Google Veo — fallback)


def _load_prompts_module():
    """Helper to load teamreel_prompts.py module dynamically."""
    import importlib.util
    import os

    prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
    if not os.path.exists(prompts_path):
        prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")

    spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
    prompts_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prompts_module)
    return prompts_module


def generate_video(
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None = None,
    organisation_id: int | None = None,
    context: dict | None = None,
    poll_interval: int = 10,
    max_wait_seconds: int = 300,
    variant_count: int = 1,
    provider: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Generate a short video using MiniMax, Runway, Pika, or Google Veo.

    Provider selection (if ``provider`` is not explicitly set):
    - If MINIMAX_API_KEY is set → use MiniMax (Hailuo) video-01
    - Else if RUNWAYML_API_SECRET is set → use Runway Gen (gen4_turbo)
    - Else if FAL_KEY is set → use Pika 2.2 via fal.ai
    - Else if GOOGLE_API_KEY is set → use Google Veo 3.1 (legacy, often content-blocked)
    - Else → error

    If ``provider`` is explicitly set (e.g. ``"runway"``), use that provider directly.

    Args:
        template_id: Template key from teamreel_prompts.TEMPLATES (must have output_type='video')
        params: Parameter values (e.g. {"style_variant": "arms_crossed", "kit_type": "home"})
        input_images: Dict of input images as bytes (keys: person_photo, etc.)
        user_id: User ID for file ownership
        organisation_id: Organisation ID for S3 path
        context: Optional context for S3 path (club_slug, team_slug, membership_id, etc.)
        poll_interval: Seconds between status checks (default 10)
        max_wait_seconds: Maximum wait time before timeout (default 300 = 5 min)
        variant_count: Number of variants to generate (default 1)
        provider: Explicit provider choice (``"minimax"``, ``"runway"``, ``"pika"``, ``"veo"``).
                  If None, auto-selects based on available API keys.

    Returns:
        Dict with keys: {video_bytes, video_url, mime_type, filename, file_asset_id, metadata, variants} or {error}
    """
    prompts_module = _load_prompts_module()
    TEMPLATES = prompts_module.TEMPLATES
    resolve_prompt = prompts_module.resolve_prompt

    if template_id not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_id}")

    template = TEMPLATES[template_id]

    if template.get("output_type") != "video":
        raise ValueError(f"Template {template_id} is not a video template (output_type != 'video')")

    # Resolve prompt
    final_prompt = resolve_prompt(template_id, params)
    logger.info("Resolved video prompt for %s: %d chars", template_id, len(final_prompt))

    # Template-specific preprocessing: composite modes for Then vs Now
    composite_mode = (
        video_config.get("composite_mode")
        if (video_config := template.get("video_config", {}))
        else None
    )
    if composite_mode == "side_by_side":
        # Composite legacy (person_photo) + current (reference_photo) into one image
        person_img = input_images.get("person_photo")
        reference_img = input_images.get("reference_photo")
        if person_img and reference_img:
            composite = _composite_side_by_side(person_img, reference_img)
            input_images = {**input_images, "person_photo": composite}
            logger.info(
                "Composited side-by-side image for %s (%d bytes)", template_id, len(composite)
            )
        else:
            logger.warning(
                "Side-by-side composite requested but missing images (person=%s, reference=%s)",
                bool(person_img),
                bool(reference_img),
            )
    elif composite_mode == "first_last_frame":
        # For transformation: person_photo is the first frame (legacy), reference_photo is the last frame (current)
        # MiniMax uses person_photo as first_frame_image and reference_photo as last_frame_image
        reference_img = input_images.get("reference_photo")
        if reference_img:
            input_images = {**input_images, "_last_frame": reference_img}
            logger.info(
                "Transformation mode: person_photo=first_frame, reference_photo=last_frame for %s",
                template_id,
            )
        else:
            logger.warning("Transformation mode: reference_photo missing for %s", template_id)

    # Provider selection
    minimax_key = getattr(settings, "MINIMAX_API_KEY", None)
    minimax_group = getattr(settings, "MINIMAX_GROUP_ID", None)
    runway_key = getattr(settings, "RUNWAYML_API_SECRET", None)
    pika_key = getattr(settings, "FAL_KEY", None)
    google_key = getattr(settings, "GOOGLE_API_KEY", None)

    # Explicit provider override (from frontend selector)
    if provider == "runway":
        if not runway_key:
            raise ValueError("Runway provider selected but RUNWAYML_API_SECRET is not configured.")
        logger.info("Using Runway Gen provider (explicit) for video generation")
        return _generate_video_runway(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=runway_key,
            variant_count=variant_count,
            model_override=model,
        )
    elif provider == "minimax":
        if not minimax_key:
            raise ValueError("MiniMax provider selected but MINIMAX_API_KEY is not configured.")
        logger.info("Using MiniMax/Hailuo provider (explicit) for video generation")
        return _generate_video_minimax(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=minimax_key,
            group_id=minimax_group,
            variant_count=variant_count,
            model_override=model,
        )
    elif provider == "pika":
        if not pika_key:
            raise ValueError("Pika provider selected but FAL_KEY is not configured.")
        logger.info("Using Pika 2.2 provider (explicit) for video generation")
        return _generate_video_pika(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=pika_key,
            variant_count=variant_count,
        )
    elif provider == "veo":
        if not google_key:
            raise ValueError("Veo provider selected but GOOGLE_API_KEY is not configured.")
        logger.info("Using Google Veo provider (explicit) for video generation")
        return _generate_video_veo(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=google_key,
            poll_interval=poll_interval,
            max_wait_seconds=max_wait_seconds,
            variant_count=variant_count,
            model_override=model,
        )

    # Auto-select provider based on available API keys
    if minimax_key:
        logger.info("Using MiniMax/Hailuo provider for video generation")
        return _generate_video_minimax(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=minimax_key,
            group_id=minimax_group,
            variant_count=variant_count,
            model_override=model,
        )
    elif runway_key:
        logger.info("Using Runway Gen provider (auto-fallback) for video generation")
        return _generate_video_runway(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=runway_key,
            variant_count=variant_count,
            model_override=model,
        )
    elif pika_key:
        logger.info("Using Pika 2.2 provider (auto-fallback) for video generation")
        return _generate_video_pika(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=pika_key,
            variant_count=variant_count,
        )
    elif google_key:
        logger.warning(
            "MiniMax/Runway/Pika not configured. Falling back to Google Veo (may be content-blocked)."
        )
        return _generate_video_veo(
            template_id=template_id,
            template=template,
            final_prompt=final_prompt,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=context,
            api_key=google_key,
            poll_interval=poll_interval,
            max_wait_seconds=max_wait_seconds,
            variant_count=variant_count,
            model_override=model,
        )
    else:
        raise ValueError(
            "No video generation provider configured. "
            "Set MINIMAX_API_KEY, RUNWAYML_API_SECRET, FAL_KEY, or GOOGLE_API_KEY in environment."
        )


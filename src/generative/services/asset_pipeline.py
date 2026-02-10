"""Asset generation pipeline service for TeamReel.

Integrates teamreel_prompts.py templates with Google Gemini for:
1. Kit analysis (Gemini 2.0 Flash → text description)
2. Prompt resolution (template + params + analysis → final prompt)
3. Image generation (nano-banana-pro-preview → variants)
4. Video generation (Veo 3.1 → 5-8 second videos)

This is the backend counterpart of the frontend AssetGenerationModal.
"""

from __future__ import annotations

import base64
import logging
import tempfile
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
# Template Helpers
# =============================================================================


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
# Video Generation (Veo 3.1)
# =============================================================================


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
) -> dict[str, Any]:
    """Generate a short video using Veo 3.1.

    Args:
        template_id: Template key from teamreel_prompts.TEMPLATES (must have output_type='video')
        params: Parameter values (e.g. {"style_variant": "arms_crossed", "kit_type": "home"})
        input_images: Dict of input images as bytes (keys: person_photo, etc.)
        user_id: User ID for file ownership (required for S3 upload)
        organisation_id: Organisation ID for S3 path (required for S3 upload)
        context: Optional context for S3 path (club_slug, team_slug, membership_id, etc.)
        poll_interval: Seconds between status checks (default 10)
        max_wait_seconds: Maximum wait time before timeout (default 300 = 5 min)
        variant_count: Number of variants to generate (default 1, max usually 4)

    Returns:
        Dict with keys: {video_bytes, video_url, mime_type, filename, file_asset_id, metadata, variants} or {error}
    """
    # Import the prompts module (root-level)
    import importlib.util
    import os

    prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
    if not os.path.exists(prompts_path):
        prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")

    spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
    prompts_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(prompts_module)

    TEMPLATES = prompts_module.TEMPLATES
    resolve_prompt = prompts_module.resolve_prompt

    if template_id not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_id}")

    template = TEMPLATES[template_id]

    # Verify this is a video template
    if template.get("output_type") != "video":
        raise ValueError(f"Template {template_id} is not a video template (output_type != 'video')")

    # Step 1: Resolve prompt
    final_prompt = resolve_prompt(template_id, params)
    logger.info("Resolved video prompt for %s: %d chars", template_id, len(final_prompt))

    # Step 2: Generate video with Veo 3.1
    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    client = genai.Client(api_key=api_key)

    # Get video config from template
    video_config = template.get("video_config", {})
    duration = video_config.get("duration_seconds", 6)
    aspect_ratio = video_config.get("aspect_ratio", "9:16")
    resolution = video_config.get("resolution", "720p")
    loop_video = video_config.get("loop", False)

    # If we have an input image (person_photo), use image-to-video
    person_img = input_images.get("person_photo")
    image_obj = None

    if person_img:
        # Pass explicit dict with raw bytes - SDK handles base64 encoding and serialization
        image_obj = {
            "image_bytes": person_img,
            "mime_type": "image/png",
        }

    # Prepare config (per google-genai SDK codegen instructions)
    veo_config = types.GenerateVideosConfig(
        person_generation="allow_adult",
        aspect_ratio=aspect_ratio,
        number_of_videos=variant_count,
        duration_seconds=duration,
        last_frame=image_obj if (loop_video and image_obj) else None,
    )

    try:
        if person_img:
            # Image-to-video: use person photo as starting frame / reference
            logger.info(
                "Generating %d video(s) with image input (image-to-video, loop=%s)",
                variant_count,
                loop_video,
            )

            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=final_prompt,
                image=image_obj,
                config=veo_config,
            )
        else:
            # Text-to-video only
            logger.info(
                "Generating %d video(s) with text prompt only (text-to-video)", variant_count
            )
            operation = client.models.generate_videos(
                model="veo-3.1-generate-preview",
                prompt=final_prompt,
                config=veo_config,
            )

        # Poll for completion
        start_time = time.time()
        while not operation.done:
            elapsed = time.time() - start_time
            if elapsed > max_wait_seconds:
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"Video generation timed out after {max_wait_seconds}s",
                }

            logger.info("Waiting for video generation... (%.0fs elapsed)", elapsed)
            time.sleep(poll_interval)
            operation = client.operations.get(operation)

        # Collect all generated videos
        generated_variants = []

        # Helper to process one video
        def process_video_result(vid_obj, idx):
            # Download video using official SDK pattern (download → save → read)
            client.files.download(file=vid_obj.video)
            _tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            _tmp_path = _tmp.name
            _tmp.close()
            try:
                vid_obj.video.save(_tmp_path)
                with open(_tmp_path, "rb") as _vf:
                    v_bytes = _vf.read()
            finally:
                os.unlink(_tmp_path)

            # Generate filename
            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{idx}.mp4"

            # Upload to S3 if user_id and organisation_id provided
            v_url = None
            f_asset_id = None

            if user_id and organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    # Store video in S3
                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    # Get presigned URL
                    from files.utils import get_storage_backend
                    from files.models import FileAsset

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True, expires_in=3600)

                    logger.info("Video variant %d uploaded to S3: %s", idx, fname)

                except Exception as e:
                    logger.exception("Failed to upload video variant %d to S3: %s", idx, e)

            return {
                "video_bytes": v_bytes,
                "video_url": v_url,
                "filename": fname,
                "file_asset_id": f_asset_id,
                "mime_type": "video/mp4",
            }

        # Process all variants
        for i, vid in enumerate(operation.response.generated_videos):
            generated_variants.append(process_video_result(vid, i))

        if not generated_variants:
            raise ValueError("No videos generated in response")

        # Prepare main return (backward compatibility: return first variant as main)
        main_variant = generated_variants[0]

        return {
            "video_bytes": main_variant["video_bytes"] if not main_variant["video_url"] else None,
            "video_base64": base64.b64encode(main_variant["video_bytes"]).decode("utf-8")
            if not main_variant["video_url"]
            else None,
            "video_url": main_variant["video_url"],
            "mime_type": "video/mp4",
            "filename": main_variant["filename"],
            "file_asset_id": main_variant["file_asset_id"],
            "variants": generated_variants,  # Include all variants including first
            "metadata": {
                "template_id": template_id,
                "params": params,
                "duration_seconds": duration,
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "loop": loop_video,
                "variant_count": len(generated_variants),
            },
        }

    except Exception as e:  # noqa: BLE001
        logger.exception("Error generating video: %s", e)
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": str(e),
        }

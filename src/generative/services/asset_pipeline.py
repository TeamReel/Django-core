"""Asset generation pipeline service for TeamReel.

Integrates teamreel_prompts.py templates with Google Gemini for:
1. Kit analysis (Gemini 2.0 Flash → text description)
2. Prompt resolution (template + params + analysis → final prompt)
3. Image generation (nano-banana-pro-preview → variants)
4. Video generation (MiniMax/Hailuo video-01 → 6 second videos)

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


def _preprocess_location(image_bytes: bytes) -> bytes:
    """Fit location photo into 1080×1920 portrait canvas."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    canvas = Image.new("RGB", (1080, 1920), (34, 34, 34))

    # Scale to fit width, keep aspect ratio
    img.thumbnail((1080, 1920), Image.Resampling.LANCZOS)
    offset = ((1080 - img.width) // 2, (1920 - img.height) // 2)
    canvas.paste(img, offset)

    buf = BytesIO()
    canvas.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


PREPROCESSORS = {
    "square_pad_512": _preprocess_logo,
    "pad_512_landscape": _preprocess_sponsor,
    "pad_portrait_1080": _preprocess_location,
}


# =============================================================================
# Output Postprocessors (Pillow-based, run AFTER Gemini output)
# =============================================================================


def _border_connected_mask(is_candidate, h, w):  # noqa: ANN001, ANN201
    """Return a mask of candidate pixels that are connected to the image border.

    Uses a BFS flood-fill from every border candidate pixel to find all
    connected candidate pixels reachable from the edges.  Interior groups
    (e.g. white text/fill inside a badge) that don't touch any edge are
    preserved.

    Pure numpy + collections.deque — no scipy dependency.
    """
    import numpy as np
    from collections import deque

    result = np.zeros((h, w), dtype=bool)

    # Seed queue with every candidate pixel on any border
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        if is_candidate[0, x]:
            queue.append((0, x))
            result[0, x] = True
        if is_candidate[h - 1, x]:
            queue.append((h - 1, x))
            result[h - 1, x] = True
    for y in range(1, h - 1):
        if is_candidate[y, 0]:
            queue.append((y, 0))
            result[y, 0] = True
        if is_candidate[y, w - 1]:
            queue.append((y, w - 1))
            result[y, w - 1] = True

    # BFS: expand from border seeds through adjacent candidate pixels
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and is_candidate[ny, nx] and not result[ny, nx]:
                result[ny, nx] = True
                queue.append((ny, nx))

    return result


def _check_alternating_grid(is_candidate, brightness, block, h, w):  # noqa: ANN001, ANN201
    """Check whether candidate pixels form an alternating grid at the given block size.

    Returns (is_checkerboard: bool, alternating_ratio: float, shade_diff: float).
    """
    import numpy as np

    bh, bw = h // block, w // block
    if bh < 3 or bw < 3:
        return False, 0.0, 0.0

    block_brightness = np.full((bh, bw), np.nan)
    for by in range(bh):
        for bx in range(bw):
            y0, y1 = by * block, (by + 1) * block
            x0, x1 = bx * block, (bx + 1) * block
            mask = is_candidate[y0:y1, x0:x1]
            pct = mask.sum() / (block * block)
            if pct > 0.4:
                block_brightness[by, bx] = brightness[y0:y1, x0:x1][mask].mean()

    valid_blocks = block_brightness[~np.isnan(block_brightness)]
    if len(valid_blocks) < 4:
        return False, 0.0, 0.0

    bmin, bmax = float(valid_blocks.min()), float(valid_blocks.max())
    shade_diff = bmax - bmin
    if shade_diff < 5:
        return False, 0.0, shade_diff

    mid = (bmin + bmax) / 2.0
    block_class = np.full((bh, bw), -1, dtype=np.int8)
    for by in range(bh):
        for bx in range(bw):
            if not np.isnan(block_brightness[by, bx]):
                block_class[by, bx] = 1 if block_brightness[by, bx] >= mid else 0

    alternating = 0
    total_pairs = 0
    for by in range(bh):
        for bx in range(bw):
            if block_class[by, bx] < 0:
                continue
            if bx + 1 < bw and block_class[by, bx + 1] >= 0:
                total_pairs += 1
                if block_class[by, bx] != block_class[by, bx + 1]:
                    alternating += 1
            if by + 1 < bh and block_class[by + 1, bx] >= 0:
                total_pairs += 1
                if block_class[by, bx] != block_class[by + 1, bx]:
                    alternating += 1

    if total_pairs == 0:
        return False, 0.0, shade_diff

    ratio = alternating / total_pairs
    return ratio >= 0.45, ratio, shade_diff


def _strip_checkerboard(img, logo_type: str = "logo"):  # noqa: ANN001, ANN201
    """Remove checkerboard artifacts from AI-generated RGBA images.

    Gemini sometimes renders a visible grey/white checkerboard grid into the
    RGB pixels (with alpha=255) instead of making the background truly
    transparent.

    Uses block-level pattern detection at multiple scales (4, 8, 16, 32 px)
    so it catches checkerboards of varying coarseness.

    For sponsors (logo_type='sponsor'): if the logo is mostly text (i.e. the
    non-candidate content area is very small), skip cleanup entirely — the
    'background' IS the logo.
    """
    import numpy as np

    data = np.array(img)
    h, w = data.shape[:2]
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    rgb_stack = np.stack([r, g, b], axis=-1).astype(np.int16)
    spread = rgb_stack.max(axis=-1) - rgb_stack.min(axis=-1)
    brightness = rgb_stack.mean(axis=-1)

    # Candidate mask: achromatic, light, opaque
    is_candidate = (spread < 30) & (brightness > 160) & (a > 0)
    total_candidates = int(is_candidate.sum())

    if total_candidates == 0:
        return img

    candidate_ratio = total_candidates / (h * w)
    if candidate_ratio < 0.03:
        logger.debug("checkerboard_cleanup: only %.1f%% candidates, skip", candidate_ratio * 100)
        return img

    # ── Text-logo safety check (sponsors) ─────────────────────────────
    # Text-only sponsor logos (e.g. "JUMBO", "NIKE") are almost entirely
    # white/light text on a transparent bg.  After Gemini processes them the
    # 'candidate' pixels ARE the logo content.  Detect this by checking how
    # much non-candidate opaque content exists — if very little, the logo is
    # text-only and should not be stripped.
    if logo_type == "sponsor":
        opaque = a > 0
        non_candidate_opaque = opaque & ~is_candidate
        non_cand_ratio = int(non_candidate_opaque.sum()) / (h * w)
        if non_cand_ratio < 0.05:
            # Almost no coloured/dark content → text-only logo, skip cleanup
            logger.info(
                "checkerboard_cleanup: sponsor text-only logo detected "
                "(non_cand=%.1f%%), skipping",
                non_cand_ratio * 100,
            )
            return img

    # Try multiple block sizes — Gemini can produce different-sized checkerboard grids
    for block_size in (4, 8, 16, 32):
        is_cb, ratio, shade_diff = _check_alternating_grid(
            is_candidate,
            brightness,
            block_size,
            h,
            w,
        )
        if is_cb:
            # Only strip candidate pixels connected to the image border.
            # Interior white areas (text, fills inside a badge) are preserved.
            bg_mask = _border_connected_mask(is_candidate, h, w)
            stripped = int(bg_mask.sum())
            data[bg_mask, 3] = 0
            logger.info(
                "checkerboard_cleanup stripped %d/%d pixels (block=%d, %.0f%% alt, shade_diff=%.0f)",
                stripped,
                total_candidates,
                block_size,
                ratio * 100,
                shade_diff,
            )
            from PIL import Image as _Img

            return _Img.fromarray(data, "RGBA")
        logger.debug(
            "checkerboard_cleanup: block=%d ratio=%.2f shade=%.0f — no match",
            block_size,
            ratio,
            shade_diff,
        )

    # ── Fallback: border-based detection ──
    # If no alternating grid was found but the image edges are mostly
    # light achromatic pixels, the background is still fake (solid white/grey
    # or a pattern we didn't catch).  Logos are always centred, so the
    # borders should be background, never logo content.
    border_size = max(4, min(h, w) // 20)  # ~5% of image edge
    top = is_candidate[:border_size, :].mean()
    bot = is_candidate[-border_size:, :].mean()
    lft = is_candidate[:, :border_size].mean()
    rgt = is_candidate[:, -border_size:].mean()
    border_avg = (top + bot + lft + rgt) / 4.0

    if border_avg > 0.60 and candidate_ratio > 0.08:
        # Only strip candidate pixels connected to the image border.
        # Interior white areas (text, fills inside a badge) are preserved.
        bg_mask = _border_connected_mask(is_candidate, h, w)
        stripped = int(bg_mask.sum())
        data[bg_mask, 3] = 0
        logger.info(
            "checkerboard_cleanup fallback: stripped %d/%d bg pixels "
            "(border_avg=%.0f%%, candidate_ratio=%.0f%%)",
            stripped,
            total_candidates,
            border_avg * 100,
            candidate_ratio * 100,
        )
        from PIL import Image as _Img

        return _Img.fromarray(data, "RGBA")

    logger.debug(
        "checkerboard_cleanup: no pattern found (border_avg=%.0f%%, ratio=%.0f%%)",
        border_avg * 100,
        candidate_ratio * 100,
    )
    return img


def _postprocess_crop_and_center(
    image_bytes: bytes, target_size: int = 1024, fill_pct: float = 0.90
) -> bytes:
    """Tight-crop an RGBA image on its alpha bounding box, then enlarge to fill a square canvas.

    This does what Gemini cannot reliably do: remove all empty space around a logo
    and scale it up to fill the canvas.
    """
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")

    # Step 1: Strip checkerboard artifacts FIRST — Gemini sometimes renders a
    # visible checkerboard into the RGB pixels with alpha=255 instead of true
    # transparency.  If we don't strip these before getbbox(), the bounding box
    # includes the entire image and the logo never gets zoomed in.
    img = _strip_checkerboard(img, logo_type="logo")

    # Step 2: Get bounding box of non-transparent pixels (now only the real logo)
    bbox = img.getbbox()
    if not bbox:
        # Fully transparent — return as-is
        return image_bytes

    # Crop to tight bounding box
    cropped = img.crop(bbox)
    cw, ch = cropped.size

    # Calculate scale to fill fill_pct of target canvas
    target_inner = int(target_size * fill_pct)
    scale = min(target_inner / cw, target_inner / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))

    # Only upscale if significantly smaller, otherwise just pad
    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Center on transparent canvas
    canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    offset_x = (target_size - new_w) // 2
    offset_y = (target_size - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def _postprocess_sponsor_crop(image_bytes: bytes, orientation: str = "landscape") -> bytes:
    """Tight-crop a sponsor logo on alpha bbox and center on appropriate canvas."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")

    # Strip checkerboard BEFORE bbox so we crop only the real logo.
    # Pass logo_type='sponsor' so text-only logos are not destroyed.
    img = _strip_checkerboard(img, logo_type="sponsor")

    bbox = img.getbbox()
    if not bbox:
        return image_bytes

    cropped = img.crop(bbox)
    cw, ch = cropped.size

    if orientation == "square":
        canvas_w, canvas_h = 1024, 1024
    else:
        canvas_w, canvas_h = 1024, 512  # landscape

    fill_pct = 0.85
    target_w = int(canvas_w * fill_pct)
    target_h = int(canvas_h * fill_pct)
    scale = min(target_w / cw, target_h / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))

    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    offset_x = (canvas_w - new_w) // 2
    offset_y = (canvas_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


# Map template_id → postprocess function that runs on Gemini's output
OUTPUT_POSTPROCESSORS: dict[str, Any] = {
    "logo_postprocess": lambda img_bytes, params: _postprocess_crop_and_center(
        img_bytes,
        target_size=int(params.get("target_size", "1024")),
        fill_pct=int(params.get("fill_percentage", "90")) / 100.0,
    ),
    "logo_standardize": lambda img_bytes, params: _postprocess_crop_and_center(
        img_bytes,
        target_size=1024,
        fill_pct=0.90,
    ),
    "sponsor_postprocess": lambda img_bytes, params: _postprocess_sponsor_crop(
        img_bytes,
        orientation=params.get("orientation", "landscape"),
    ),
    "sponsor_standardize": lambda img_bytes, params: _postprocess_sponsor_crop(
        img_bytes,
        orientation=params.get("orientation", "landscape"),
    ),
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
    # =========================================================================
    # Fast path: postprocess templates are pure Pillow (no Gemini).
    # These only crop, center and resize — sending through Gemini would
    # degrade quality (colours shift, details lost, logo gets darker).
    # =========================================================================
    PILLOW_ONLY_TEMPLATES = {
        "logo_postprocess",
        "sponsor_postprocess",
        "kit_postprocess",
        "location_postprocess",
    }

    if template_id in PILLOW_ONLY_TEMPLATES:
        return _pillow_only_postprocess(template_id, params, input_images)

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
                model="models/nano-banana-pro-preview",
                contents=content_parts,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
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
# =============================================================================


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
) -> dict[str, Any]:
    """Generate a short video using MiniMax/Hailuo (primary) or Google Veo (legacy fallback).

    Provider selection:
    - If MINIMAX_API_KEY is set → use MiniMax (Hailuo) video-01
    - Else if GOOGLE_API_KEY is set → use Google Veo 3.1 (legacy, often content-blocked)
    - Else → error

    Videos are 4 seconds, 9:16 vertical, with chroma-key background for compositing.
    Input: player in tenue image as first_frame_image for image-to-video generation.

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

    # Provider selection
    minimax_key = getattr(settings, "MINIMAX_API_KEY", None)
    minimax_group = getattr(settings, "MINIMAX_GROUP_ID", None)
    google_key = getattr(settings, "GOOGLE_API_KEY", None)

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
        )
    elif google_key:
        logger.warning(
            "MiniMax not configured. Falling back to Google Veo (may be content-blocked)."
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
        )
    else:
        raise ValueError(
            "No video generation provider configured. "
            "Set MINIMAX_API_KEY (preferred) or GOOGLE_API_KEY in environment."
        )


# -----------------------------------------------------------------------------
# MiniMax / Hailuo Provider
# -----------------------------------------------------------------------------


def _generate_video_minimax(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    group_id: str | None,
    variant_count: int = 1,
) -> dict[str, Any]:
    """Generate video using MiniMax (Hailuo) video-01 model.

    Supports:
    - Text-to-video (prompt only)
    - Image-to-video (person_photo as first frame + prompt)

    MiniMax currently generates 1 video per request (720p, 25fps, ~6s).
    For multiple variants, we make sequential requests.
    """
    from .minimax_client import MiniMaxClient

    video_config = template.get("video_config", {})
    model = video_config.get("minimax_model", "video-01")

    # MiniMax supports max 2000 chars prompt
    if len(final_prompt) > 2000:
        logger.warning(
            "Prompt too long for MiniMax (%d chars). Truncating to 2000.", len(final_prompt)
        )
        final_prompt = final_prompt[:1997] + "..."

    # Check for input image (person_photo for image-to-video)
    person_img = input_images.get("person_photo")

    results = []
    effective_count = min(variant_count, 4)  # Reasonable limit

    for i in range(effective_count):
        try:
            client = MiniMaxClient(
                api_key=api_key,
                group_id=group_id or "",
                timeout=120.0,
                poll_interval=5.0,
                max_wait=600.0,
            )

            logger.info(
                "MiniMax: generating variant %d/%d (%s, model=%s, has_image=%s)",
                i + 1,
                effective_count,
                "I2V" if person_img else "T2V",
                model,
                bool(person_img),
            )

            # Generate video (handles create → poll → download internally)
            gen_result = client.generate_video(
                prompt=final_prompt,
                image=person_img if person_img else None,
                model=model,
            )

            v_bytes = gen_result["video_bytes"]

            logger.info(
                "MiniMax: variant %d task completed. task_id=%s, file_id=%s, %d bytes",
                i + 1,
                gen_result["task_id"],
                gen_result["file_id"],
                len(v_bytes),
            )

            if not v_bytes or len(v_bytes) < 1000:
                raise ValueError(
                    f"Downloaded video is too small ({len(v_bytes) if v_bytes else 0} bytes)"
                )

            # Generate filename
            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{i}.mp4"

            # Upload to S3 if organisation_id provided
            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path

                    logger.info("MiniMax video variant %d uploaded to S3: %s", i, fname)
                except Exception as e:
                    logger.exception("Failed to upload MiniMax video variant %d to S3: %s", i, e)

            results.append(
                {
                    "video_bytes": v_bytes,
                    "video_url": v_url,
                    "storage_path": storage_path,
                    "filename": fname,
                    "file_asset_id": f_asset_id,
                    "mime_type": "video/mp4",
                }
            )

            logger.info(
                "MiniMax: variant %d/%d complete (%d bytes)", i + 1, effective_count, len(v_bytes)
            )

            client.close()

        except Exception as e:
            logger.exception("MiniMax: error generating variant %d: %s", i + 1, e)
            if not results:
                # If first variant fails, bail out
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"MiniMax video generation failed: {e}",
                }
            # For subsequent variants, just log and continue
            break

    if not results:
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": "No video variants generated",
        }

    # Build response (backward compatible: first variant as main)
    main = results[0]
    video_config_out = template.get("video_config", {})

    return {
        "video_bytes": main["video_bytes"] if not main["video_url"] else None,
        "video_base64": (
            base64.b64encode(main["video_bytes"]).decode("utf-8")
            if main["video_bytes"] and not main["video_url"]
            else None
        ),
        "video_url": main["video_url"],
        "mime_type": "video/mp4",
        "filename": main["filename"],
        "file_asset_id": main["file_asset_id"],
        "variants": results,
        "metadata": {
            "template_id": template_id,
            "params": params,
            "provider": "minimax",
            "model": model,
            "duration_seconds": video_config_out.get("duration_seconds", 6),
            "aspect_ratio": video_config_out.get("aspect_ratio", "9:16"),
            "resolution": "720p",
            "variant_count": len(results),
        },
    }


# -----------------------------------------------------------------------------
# Google Veo Provider (legacy fallback)
# -----------------------------------------------------------------------------


def _generate_video_veo(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    poll_interval: int = 10,
    max_wait_seconds: int = 300,
    variant_count: int = 1,
) -> dict[str, Any]:
    """Generate video using Google Veo 3.1 (legacy fallback).

    WARNING: Google Veo frequently blocks person/sports content due to content policy.
    Use MiniMax as the primary provider.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    video_config = template.get("video_config", {})
    duration = video_config.get(
        "duration_seconds", 4
    )  # 4s default (reduced from 6s for cost/speed)
    aspect_ratio = video_config.get("aspect_ratio", "9:16")
    resolution = video_config.get("resolution", "720p")
    loop_video = video_config.get("loop", False)

    person_img = input_images.get("person_photo")
    image_obj = None
    if person_img:
        image_obj = {"image_bytes": person_img, "mime_type": "image/png"}

    if variant_count > 1:
        logger.warning("Veo supports max 1 video. Clamping to 1.")

    config_args = {"number_of_videos": 1}
    if not person_img:
        config_args["aspect_ratio"] = aspect_ratio

    veo_config = types.GenerateVideosConfig(**config_args)

    try:
        if person_img:
            operation = client.models.generate_videos(
                model="veo-3.1-fast-generate-preview",
                prompt=final_prompt,
                image=image_obj,
                config=veo_config,
            )
        else:
            operation = client.models.generate_videos(
                model="veo-3.1-fast-generate-preview",
                prompt=final_prompt,
                config=veo_config,
            )

        start_time = time.time()
        while not operation.done:
            elapsed = time.time() - start_time
            if elapsed > max_wait_seconds:
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"Veo: timed out after {max_wait_seconds}s",
                }
            logger.info("Veo: waiting... (%.0fs elapsed)", elapsed)
            time.sleep(poll_interval)
            operation = client.operations.get(operation)

        generated_variants = []

        def process_veo_result(vid_obj, idx):
            if not vid_obj.video:
                raise ValueError(f"Veo variant {idx}: no video reference")

            try:
                v_bytes = client.files.download(file=vid_obj.video.name)
            except Exception as e:
                try:
                    v_bytes = client.files.download(file=vid_obj.video)
                except Exception as e2:
                    raise RuntimeError(f"Veo download failed: {e} / {e2}") from e

            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{idx}.mp4"

            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path
                except Exception as e:
                    logger.exception("Veo: S3 upload failed for variant %d: %s", idx, e)

            return {
                "video_bytes": v_bytes,
                "video_url": v_url,
                "storage_path": storage_path,
                "filename": fname,
                "file_asset_id": f_asset_id,
                "mime_type": "video/mp4",
            }

        generated_videos = (
            operation.response.generated_videos
            if operation.response and operation.response.generated_videos
            else []
        )

        if not generated_videos:
            block_reason = None
            if operation.response:
                block_reason = getattr(operation.response, "block_reason", None)
            if block_reason:
                raise ValueError(f"Veo: blocked: {block_reason}")
            raise ValueError(
                "Veo: No videos generated (generated_videos is empty/None). "
                "Content policy filtering or API issue. Consider using MiniMax instead."
            )

        for i, vid in enumerate(generated_videos):
            generated_variants.append(process_veo_result(vid, i))

        if not generated_variants:
            raise ValueError("Veo: No videos generated")

        main = generated_variants[0]

        return {
            "video_bytes": main["video_bytes"] if not main["video_url"] else None,
            "video_base64": (
                base64.b64encode(main["video_bytes"]).decode("utf-8")
                if main["video_bytes"] and not main["video_url"]
                else None
            ),
            "video_url": main["video_url"],
            "mime_type": "video/mp4",
            "filename": main["filename"],
            "file_asset_id": main["file_asset_id"],
            "variants": generated_variants,
            "metadata": {
                "template_id": template_id,
                "params": params,
                "provider": "google_veo",
                "duration_seconds": duration,
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "loop": loop_video,
                "variant_count": len(generated_variants),
            },
        }

    except Exception as e:
        logger.exception("Veo: error: %s", e)
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": str(e),
        }

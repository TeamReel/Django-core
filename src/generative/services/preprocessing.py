"""Image preprocessing and postprocessing for asset generation pipeline.

Pillow-based image manipulation for:
- Input preprocessing (logo/sponsor/location padding)
- Compositing (side-by-side for Then vs Now)
- Checkerboard artifact removal
- Output postprocessing (crop, center, standardize)
"""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

logger = logging.getLogger("generative.services.preprocessing")


# =============================================================================
# Image preprocessing helpers (mirrors Pillow logic from run_v9_templates.py)
# =============================================================================


def _preprocess_logo(image_bytes: bytes) -> bytes:
    """Pad logo to 512x512 transparent square (centered)."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))

    # Scale to fit within 480x480 (keep margin)
    img.thumbnail((480, 480), Image.Resampling.LANCZOS)
    offset = ((512 - img.width) // 2, (512 - img.height) // 2)
    canvas.paste(img, offset, img)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def _preprocess_sponsor(image_bytes: bytes) -> bytes:
    """Pad sponsor to 512x256 transparent landscape (centered)."""
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
    """Fit location photo into 1080x1920 portrait canvas."""
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


def _composite_side_by_side(left_bytes: bytes, right_bytes: bytes) -> bytes:
    """Composite two images side by side on a chroma-key background for Then vs Now.

    Creates a 1080x1920 (9:16 portrait) canvas with:
    - Left half: legacy/old fullbody image
    - Right half: current fullbody image
    - Bright green (#00FF00) chroma-key background
    Both images are scaled to fit their half while maintaining aspect ratio.
    """
    from PIL import Image

    CANVAS_W, CANVAS_H = 1080, 1920
    HALF_W = CANVAS_W // 2
    BG_COLOR = (0, 255, 0)  # Chroma-key green

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), BG_COLOR)

    for i, img_bytes in enumerate([left_bytes, right_bytes]):
        img = Image.open(BytesIO(img_bytes))
        # Convert to RGBA to handle transparency, then composite onto green
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Scale to fit within half-width x full-height with padding
        max_w = HALF_W - 20  # 10px margin on each side
        max_h = CANVAS_H - 40  # 20px margin top/bottom
        img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

        # Center in the half
        x_offset = (i * HALF_W) + (HALF_W - img.width) // 2
        y_offset = (CANVAS_H - img.height) // 2

        # Paste with alpha mask for transparency
        canvas.paste(img, (x_offset, y_offset), img)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


# =============================================================================
# Output Postprocessors (Pillow-based, run AFTER Gemini output)
# =============================================================================


def _border_connected_mask(is_candidate, h, w):  # noqa: ANN001, ANN201
    """Return a mask of candidate pixels that are connected to the image border.

    Uses a BFS flood-fill from every border candidate pixel to find all
    connected candidate pixels reachable from the edges.  Interior groups
    (e.g. white text/fill inside a badge) that don't touch any edge are
    preserved.

    Pure numpy + collections.deque -- no scipy dependency.
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
    non-candidate content area is very small), skip cleanup entirely -- the
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

    # -- Text-logo safety check (sponsors) --
    if logo_type == "sponsor":
        opaque = a > 0
        non_candidate_opaque = opaque & ~is_candidate
        non_cand_ratio = int(non_candidate_opaque.sum()) / (h * w)
        if non_cand_ratio < 0.05:
            logger.info(
                "checkerboard_cleanup: sponsor text-only logo detected "
                "(non_cand=%.1f%%), skipping",
                non_cand_ratio * 100,
            )
            return img

    # Try multiple block sizes
    for block_size in (4, 8, 16, 32):
        is_cb, ratio, shade_diff = _check_alternating_grid(
            is_candidate,
            brightness,
            block_size,
            h,
            w,
        )
        if is_cb:
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
            "checkerboard_cleanup: block=%d ratio=%.2f shade=%.0f -- no match",
            block_size,
            ratio,
            shade_diff,
        )

    # -- Fallback: border-based detection --
    border_size = max(4, min(h, w) // 20)
    top = is_candidate[:border_size, :].mean()
    bot = is_candidate[-border_size:, :].mean()
    lft = is_candidate[:, :border_size].mean()
    rgt = is_candidate[:, -border_size:].mean()
    border_avg = (top + bot + lft + rgt) / 4.0

    if border_avg > 0.60 and candidate_ratio > 0.08:
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
    """Tight-crop an RGBA image on its alpha bounding box, then enlarge to fill a square canvas."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    img = _strip_checkerboard(img, logo_type="logo")

    bbox = img.getbbox()
    if not bbox:
        return image_bytes

    cropped = img.crop(bbox)
    cw, ch = cropped.size

    target_inner = int(target_size * fill_pct)
    scale = min(target_inner / cw, target_inner / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))

    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

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
    img = _strip_checkerboard(img, logo_type="sponsor")

    bbox = img.getbbox()
    if not bbox:
        return image_bytes

    cropped = img.crop(bbox)
    cw, ch = cropped.size

    if orientation == "square":
        canvas_w, canvas_h = 1024, 1024
    else:
        canvas_w, canvas_h = 1024, 512

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


def _postprocess_kit_standardize(
    image_bytes: bytes, canvas_w: int = 820, canvas_h: int = 1024
) -> bytes:
    """Standardize a kit image: resize to portrait canvas preserving aspect ratio."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size

    scale = min(canvas_w / w, canvas_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    offset_x = (canvas_w - new_w) // 2
    offset_y = (canvas_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def _postprocess_location_standardize(
    image_bytes: bytes, canvas_w: int = 1920, canvas_h: int = 1080
) -> bytes:
    """Standardize a location/stadium image: resize to landscape canvas."""
    from PIL import Image

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    scale = min(canvas_w / w, canvas_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (canvas_w, canvas_h), (0, 0, 0))
    offset_x = (canvas_w - new_w) // 2
    offset_y = (canvas_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))

    buf = BytesIO()
    canvas.save(buf, format="PNG")
    return buf.getvalue()


def _postprocess_background_portrait(
    image_bytes: bytes, canvas_w: int = 1080, canvas_h: int = 1920
) -> bytes:
    """Convert any image to portrait (1080x1920) for video backgrounds.

    Uses cover-crop: scales to fill the canvas entirely, then center-crops.
    Applies subtle darkening (10%) for text overlay readability.
    """
    from PIL import Image, ImageEnhance

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    scale = max(canvas_w / w, canvas_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = (new_w - canvas_w) // 2
    top = (new_h - canvas_h) // 2
    cropped = resized.crop((left, top, left + canvas_w, top + canvas_h))

    enhancer = ImageEnhance.Brightness(cropped)
    darkened = enhancer.enhance(0.90)

    buf = BytesIO()
    darkened.save(buf, format="PNG")
    return buf.getvalue()


def _crop_gemini_output_upper_body(image_bytes: bytes) -> bytes:
    """Post-process Gemini composite output: strip black bars and fill 1080x1920.

    Gemini sometimes outputs images with solid-black padding at the bottom (or top).
    This function:
      1. Detects and removes black bars (rows where mean brightness < 10).
      2. Scales the remaining content to cover the full 1080x1920 canvas
         (cover-crop, no padding, no black bars).

    Returns the processed image as PNG bytes at 1080x1920.
    """
    import io

    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)

    # Detect black bars (rows whose mean pixel value is < 10)
    row_means = arr.mean(axis=(1, 2))
    non_black = np.where(row_means >= 10)[0]

    if len(non_black) > 0:
        top_row = int(non_black[0])
        bot_row = int(non_black[-1]) + 1
    else:
        top_row = 0
        bot_row = arr.shape[0]

    col_means = arr.mean(axis=(0, 2))
    non_black_cols = np.where(col_means >= 10)[0]
    if len(non_black_cols) > 0:
        left_col = int(non_black_cols[0])
        right_col = int(non_black_cols[-1]) + 1
    else:
        left_col = 0
        right_col = arr.shape[1]

    cropped = img.crop((left_col, top_row, right_col, bot_row))

    stripped_pct = 100.0 * (1.0 - (cropped.width * cropped.height) / (img.width * img.height))

    # Scale to cover 1080x1920 (no padding / letterboxing)
    target_w = 1080
    target_h = 1920

    scale = max(target_w / cropped.width, target_h / cropped.height)
    new_w = int(cropped.width * scale)
    new_h = int(cropped.height * scale)
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    left = (new_w - target_w) // 2
    if new_h > target_h:
        max_top = new_h - target_h
        top = int(max_top * 0.2)
    else:
        top = 0

    result = scaled.crop((left, top, left + target_w, top + target_h))

    output = io.BytesIO()
    result.save(output, format="PNG")
    result_bytes = output.getvalue()

    logger.info(
        "Post-Gemini strip: %dx%d -> stripped %.0f%% black -> %dx%d -> cover-crop 1080x1920 (%d bytes)",
        img.width,
        img.height,
        stripped_pct,
        cropped.width,
        cropped.height,
        len(result_bytes),
    )
    return result_bytes


# Map template_id -> postprocess function that runs on Gemini's output
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
    "kit_postprocess": lambda img_bytes, params: _postprocess_kit_standardize(
        img_bytes,
    ),
    "location_postprocess": lambda img_bytes, params: _postprocess_location_standardize(
        img_bytes,
    ),
    "background_standardize": lambda img_bytes, params: _postprocess_background_portrait(
        img_bytes,
    ),
}

# Postprocess templates that use pure Pillow (no AI / Gemini call).
PILLOW_ONLY_TEMPLATES: set[str] = {
    "logo_postprocess",
    "sponsor_postprocess",
    "kit_postprocess",
    "location_postprocess",
}

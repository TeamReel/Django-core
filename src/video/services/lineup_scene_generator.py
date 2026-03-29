"""Lineup scene generator.

Generates per-line Instagram-format frames by compositing:
- a background image (pitch/stadium)
- a top header layer with match data
- multiple player kit cutouts positioned on the pitch
- accumulated closeup thumbnails from previously introduced players
- an optional "featured" player shown large (full body reveal)

Outputs a single PNG uploaded to storage and returns a presigned URL.

This is intentionally simple (80/20): still-image scenes, later concatenated by
LineupProcessor.
"""

from __future__ import annotations

import io
import logging
import tempfile
import uuid as uuid_module
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from src.video.services._common import (
    download_image_cached,
    get_pil_font,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory image cache (cleared per-job via reset_image_cache)
# ---------------------------------------------------------------------------
_image_cache: dict[str, Image.Image | None] = {}


def reset_image_cache() -> None:
    """Clear the download cache. Call at start/end of a lineup build job."""
    _image_cache.clear()


@dataclass(frozen=True)
class ScenePlayer:
    name: str
    kit_url: str
    x_pct: int
    y_pct: int


@dataclass(frozen=True)
class CloseupOverlay:
    """A small closeup/kit thumbnail pinned at a field position (persists across scenes)."""

    name: str
    image_url: str  # closeup_url preferred, falls back to kit_url
    x_pct: int
    y_pct: int


@dataclass(frozen=True)
class FeaturedPlayer:
    """The player currently being 'revealed' — shown large and prominent."""

    name: str
    kit_url: str


def _upload_and_get_url(img: Image.Image, prefix: str = "lineup_scene") -> str:
    """Upload image to storage and return presigned URL.

    Falls back to local file path if storage upload fails.
    """
    try:
        from files.utils import get_storage_backend

        img_bytes = io.BytesIO()
        img.save(img_bytes, "PNG")
        img_bytes.seek(0)

        storage_path = f"generated/lineup/{prefix}/{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()
        backend.save(storage_path, img_bytes)
        return backend.get_url(storage_path, signed=True, expiry_seconds=3600)

    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to upload %s image to storage: %s", prefix, exc)
        temp_dir = Path(tempfile.gettempdir()) / "lineup_scenes"
        temp_dir.mkdir(exist_ok=True)
        output_path = temp_dir / f"{prefix}_{uuid_module.uuid4().hex}.png"
        img.save(str(output_path), "PNG")
        return f"file://{output_path}"


def _download_image(url: str) -> Image.Image | None:
    """Download an image from url, using in-memory cache to avoid repeated S3 round-trips."""
    return download_image_cached(url, _image_cache)


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return get_pil_font(size, bold=bold)


def generate_line_scene_image(
    *,
    width: int,
    height: int,
    background_url: str,
    header_url: str | None,
    title: str | None,
    players: list[ScenePlayer],
) -> str:
    """Generate a single lineup scene frame.

    Coordinates:
    - x_pct/y_pct are 0..100 percentages within the *field area* (below the header).
    """

    bg_img = _download_image(background_url)
    if bg_img is None:
        bg_img = Image.new("RGB", (width, height), "#228B22")

    bg_img = bg_img.convert("RGBA")
    bg_img = bg_img.resize((width, height))

    draw = ImageDraw.Draw(bg_img)

    header_h = 0
    if header_url:
        header_img = _download_image(header_url)
        if header_img is not None:
            header_img = header_img.convert("RGBA")
            # Keep header height as-is, but fit to width
            header_h = header_img.height
            if header_img.width != width:
                header_h = int(header_img.height * (width / header_img.width))
                header_img = header_img.resize((width, header_h))
            bg_img.paste(header_img, (0, 0), header_img)

    field_top = header_h
    field_height = max(1, height - field_top)

    if title:
        font = _get_font(52, bold=True)
        bbox = draw.textbbox((0, 0), title, font=font)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        y = field_top + int(field_height * 0.05)
        # Simple shadow for readability
        draw.text((x + 2, y + 2), title, font=font, fill=(0, 0, 0, 180))
        draw.text((x, y), title, font=font, fill=(255, 255, 255, 255))

    # Sizing heuristic: more players => smaller cutouts
    # Keep within 18-26% of field height
    max_h = int(field_height * (0.26 if len(players) <= 1 else 0.20 if len(players) <= 3 else 0.18))
    name_font = _get_font(30, bold=True)

    for p in players:
        kit = _download_image(p.kit_url)
        if kit is None:
            continue

        kit = kit.convert("RGBA")
        kit.thumbnail((int(width * 0.35), max_h), Image.Resampling.LANCZOS)

        # Map percent coordinates into field area
        x_px = int((p.x_pct / 100.0) * width)
        y_px = field_top + int((p.y_pct / 100.0) * field_height)

        # Anchor: bottom-center on (x_px, y_px)
        paste_x = max(0, min(width - kit.width, x_px - kit.width // 2))
        paste_y = max(field_top, min(height - kit.height, y_px - kit.height))

        bg_img.paste(kit, (paste_x, paste_y), kit)

        # Name label under the player
        name = p.name.strip()
        if not name:
            continue

        nb = draw.textbbox((0, 0), name, font=name_font)
        nw = nb[2] - nb[0]
        nh = nb[3] - nb[1]

        tx = max(0, min(width - nw, paste_x + (kit.width - nw) // 2))
        ty = min(height - nh - 8, paste_y + kit.height + 6)

        # Semi-transparent box
        pad = 8
        box = (tx - pad, ty - pad, tx + nw + pad, ty + nh + pad)
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rounded_rectangle(box, radius=10, fill=(0, 0, 0, 140))
        bg_img.alpha_composite(overlay)

        draw.text((tx, ty), name, font=name_font, fill=(255, 255, 255, 255))

    return _upload_and_get_url(
        bg_img, prefix=f"scene_{(title or 'line').lower().replace(' ', '_')}"
    )


# ---------------------------------------------------------------------------
# Composite scene generator (per-player reveal with accumulated closeups)
# ---------------------------------------------------------------------------

_CLOSEUP_SIZE_PCT = 0.12  # closeup thumbnail = 12% of field height
_FEATURED_SIZE_PCT = 0.50  # featured full body = 50% of field height


def _render_closeups(
    canvas: Image.Image,
    draw: ImageDraw.Draw,
    closeups: list[CloseupOverlay],
    field_top: int,
    field_height: int,
    width: int,
    height: int,
) -> None:
    """Render accumulated closeup thumbnails at their field positions."""
    if not closeups:
        return

    thumb_h = max(60, int(field_height * _CLOSEUP_SIZE_PCT))
    thumb_w = int(thumb_h * 0.75)

    pad = 4
    # Fixed label width (constant) so labels don't jump as names change.
    # Keep it proportional to the thumbnail to avoid overlap.
    fixed_label_w = int(thumb_w * 1.45)
    name_font_base = 22

    for cu in closeups:
        img = _download_image(cu.image_url)
        if img is None:
            continue
        img = img.convert("RGBA")
        img.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)

        x_px = int((cu.x_pct / 100.0) * width)
        y_px = field_top + int((cu.y_pct / 100.0) * field_height)

        paste_x = max(0, min(width - img.width, x_px - img.width // 2))
        paste_y = max(field_top, min(height - img.height, y_px - img.height))

        # Circle mask for closeup
        mask = Image.new("L", img.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0, img.width, img.height), fill=255)

        # White border ring
        border = 3
        ring = Image.new("RGBA", (img.width + border * 2, img.height + border * 2), (0, 0, 0, 0))
        ring_draw = ImageDraw.Draw(ring)
        ring_draw.ellipse((0, 0, ring.width, ring.height), fill=(255, 255, 255, 220))
        canvas.paste(ring, (paste_x - border, paste_y - border), ring)

        canvas.paste(img, (paste_x, paste_y), mask)

        # Name label below (fixed width)
        name = cu.name.strip()
        if name:
            # Fit font size so the name stays inside the fixed label width.
            fs = name_font_base
            name_font = _get_font(fs, bold=True)
            nb = draw.textbbox((0, 0), name, font=name_font)
            nw = nb[2] - nb[0]
            nh = nb[3] - nb[1]
            max_w = max(1, fixed_label_w - 2 * pad)
            while nw > max_w and fs > 16:
                fs -= 1
                name_font = _get_font(fs, bold=True)
                nb = draw.textbbox((0, 0), name, font=name_font)
                nw = nb[2] - nb[0]
                nh = nb[3] - nb[1]
            # Center the fixed-width label under the thumbnail
            lx = max(0, min(width - fixed_label_w, paste_x + (img.width - fixed_label_w) // 2))
            ty = min(height - nh - 4, paste_y + img.height + 2)

            box = (lx, ty - pad, lx + fixed_label_w, ty + nh + pad)
            overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            od = ImageDraw.Draw(overlay)
            od.rounded_rectangle(box, radius=6, fill=(0, 0, 0, 140))
            canvas.alpha_composite(overlay)

            # Center text within the fixed-width label
            tx = lx + (fixed_label_w - nw) // 2
            draw.text((tx, ty), name, font=name_font, fill=(255, 255, 255, 255))


def _render_featured_player(
    canvas: Image.Image,
    draw: ImageDraw.Draw,
    player: FeaturedPlayer,
    field_top: int,
    field_height: int,
    width: int,
    height: int,
) -> None:
    """Render a single large full-body image prominently in the field area."""
    kit_img = _download_image(player.kit_url)
    if kit_img is None:
        return
    kit_img = kit_img.convert("RGBA")

    max_h = int(field_height * _FEATURED_SIZE_PCT)
    max_w = int(width * 0.45)
    kit_img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    # Center horizontally, vertically in lower-middle of field area
    paste_x = (width - kit_img.width) // 2
    paste_y = field_top + int(field_height * 0.30)
    paste_y = min(paste_y, height - kit_img.height - 60)

    canvas.paste(kit_img, (paste_x, paste_y), kit_img)

    # Name label below full body (fixed width so it doesn't jump between players)
    name = player.name.strip()
    if name:
        pad = 10
        fixed_label_w = int(width * 0.70)
        fixed_label_w = min(fixed_label_w, width - 2 * 40)
        lx = (width - fixed_label_w) // 2
        ty = paste_y + kit_img.height + 10

        fs = 38
        name_font = _get_font(fs, bold=True)
        nb = draw.textbbox((0, 0), name, font=name_font)
        nw = nb[2] - nb[0]
        nh = nb[3] - nb[1]
        max_w = max(1, fixed_label_w - 2 * pad)
        while nw > max_w and fs > 24:
            fs -= 1
            name_font = _get_font(fs, bold=True)
            nb = draw.textbbox((0, 0), name, font=name_font)
            nw = nb[2] - nb[0]
            nh = nb[3] - nb[1]

        tx = lx + (fixed_label_w - nw) // 2
        box = (lx, ty - pad, lx + fixed_label_w, ty + nh + pad)
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rounded_rectangle(box, radius=12, fill=(0, 0, 0, 160))
        canvas.alpha_composite(overlay)

        draw.text((tx, ty), name, font=name_font, fill=(255, 255, 255, 255))


def generate_composite_scene(
    *,
    width: int,
    height: int,
    background_url: str,
    header_url: str | None,
    title: str | None,
    accumulated_closeups: list[CloseupOverlay] | None = None,
    featured_player: FeaturedPlayer | None = None,
    prefix: str = "composite",
) -> str:
    """Generate a composite scene with accumulated closeups and optional featured player.

    Used for the per-player reveal sequence:
    - Background + header + line title (always)
    - Accumulated closeup thumbnails at field positions (from previous players)
    - Optional featured player full body (large, centered)

    Returns presigned URL to uploaded PNG.
    """
    bg_img = _download_image(background_url)
    if bg_img is None:
        bg_img = Image.new("RGB", (width, height), "#228B22")

    bg_img = bg_img.convert("RGBA")
    bg_img = bg_img.resize((width, height))

    draw = ImageDraw.Draw(bg_img)

    # Header
    header_h = 0
    if header_url:
        header_img = _download_image(header_url)
        if header_img is not None:
            header_img = header_img.convert("RGBA")
            header_h = header_img.height
            if header_img.width != width:
                header_h = int(header_img.height * (width / header_img.width))
                header_img = header_img.resize((width, header_h))
            bg_img.paste(header_img, (0, 0), header_img)

    field_top = header_h
    field_height = max(1, height - field_top)

    # Line title
    if title:
        font = _get_font(52, bold=True)
        bbox = draw.textbbox((0, 0), title, font=font)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        y = field_top + int(field_height * 0.05)
        draw.text((x + 2, y + 2), title, font=font, fill=(0, 0, 0, 180))
        draw.text((x, y), title, font=font, fill=(255, 255, 255, 255))

    # Accumulated closeups (persist from previous lines)
    _render_closeups(
        bg_img, draw, accumulated_closeups or [], field_top, field_height, width, height
    )

    # Featured full body player (large, centered)
    if featured_player:
        _render_featured_player(
            bg_img, draw, featured_player, field_top, field_height, width, height
        )

    return _upload_and_get_url(bg_img, prefix=prefix)

"""Lineup scene generator.

Generates per-line Instagram-format frames by compositing:
- a background image (pitch/stadium)
- a top header layer with match data
- multiple player kit cutouts positioned on the pitch

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

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScenePlayer:
    name: str
    kit_url: str
    x_pct: int
    y_pct: int


def _upload_and_get_url(img: Image.Image, prefix: str = "lineup_scene") -> str:
    """Upload image to storage and return presigned URL.

    Falls back to local file path if storage upload fails.
    """
    try:
        from src.files.utils import get_storage_backend

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
    if not url:
        return None
    try:
        response = requests.get(url, timeout=45)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image from %s", url)
        return None


def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    font_names = [
        "arial.ttf",
        "Arial.ttf",
        "DejaVuSans.ttf",
        "FreeSans.ttf",
        "LiberationSans-Regular.ttf",
    ]
    if bold:
        font_names = [
            "arialbd.ttf",
            "Arial Bold.ttf",
            "DejaVuSans-Bold.ttf",
            "FreeSansBold.ttf",
            "LiberationSans-Bold.ttf",
        ] + font_names

    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size)
        except OSError:
            continue

    return ImageFont.load_default()


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

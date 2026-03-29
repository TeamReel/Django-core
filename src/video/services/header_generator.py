"""Header Generator for Lineup Videos.

Generates a header image with:
- Club logo (left)
- Match info (center): date, teams, score/time, coach
- Sponsor logo (right)

Uses PIL/Pillow for image composition.
"""

from __future__ import annotations

import io
import logging
import tempfile
import uuid as uuid_module
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from src.video.services._common import (
    download_image as _common_download_image,
)
from src.video.services._common import (
    get_pil_font,
)

logger = logging.getLogger(__name__)


def generate_guest_silhouette(
    width: int = 1080,
    height: int = 1920,
    fill_color: tuple[int, int, int, int] = (180, 180, 180, 200),
) -> Image.Image:
    """Generate a generic player silhouette for guest players without assets.

    Creates a simple head + body silhouette on a transparent canvas.
    Used when a player is in the lineup but has no photos/videos uploaded.

    Args:
        width: Canvas width (should match fullbody spec)
        height: Canvas height (should match fullbody spec)
        fill_color: RGBA fill for the silhouette

    Returns:
        PIL Image (RGBA) with silhouette.
    """
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    cx = width // 2
    # Head: circle at ~25% from top
    head_r = int(width * 0.12)
    head_cy = int(height * 0.18)
    draw.ellipse(
        (cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r),
        fill=fill_color,
    )

    # Body: trapezoid from neck to ~70% height
    neck_y = head_cy + head_r
    body_top_w = int(width * 0.22)
    body_bot_w = int(width * 0.35)
    body_bot_y = int(height * 0.70)
    draw.polygon(
        [
            (cx - body_top_w, neck_y),
            (cx + body_top_w, neck_y),
            (cx + body_bot_w, body_bot_y),
            (cx - body_bot_w, body_bot_y),
        ],
        fill=fill_color,
    )

    # Legs: two rectangles
    leg_w = int(width * 0.08)
    leg_gap = int(width * 0.04)
    leg_bot_y = int(height * 0.95)
    for lx in [cx - leg_gap - leg_w, cx + leg_gap]:
        draw.rectangle(
            (lx, body_bot_y, lx + leg_w, leg_bot_y),
            fill=fill_color,
        )

    return canvas


def _upload_and_get_url(img: Image.Image, prefix: str = "lineup") -> str:
    """Upload image to storage and return presigned URL.

    Falls back to local file path if storage upload fails.
    """
    try:
        from files.utils import get_storage_backend

        # Save to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, "PNG")
        img_bytes.seek(0)

        # Generate storage path
        storage_path = f"generated/{prefix}/{uuid_module.uuid4().hex}.png"

        # Upload to storage
        backend = get_storage_backend()
        backend.save(storage_path, img_bytes)

        # Get presigned URL (1 hour expiry)
        url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        logger.info("Uploaded %s image to storage: %s", prefix, storage_path)
        return url

    except Exception as e:
        logger.warning("Failed to upload %s image to storage: %s, using local file", prefix, e)
        # Fallback to local file (works for local dev, not production)
        temp_dir = Path(tempfile.gettempdir()) / f"lineup_{prefix}s"
        temp_dir.mkdir(exist_ok=True)
        output_path = temp_dir / f"{prefix}_{uuid_module.uuid4().hex}.png"
        img.save(str(output_path), "PNG")
        return f"file://{output_path}"


# Default colors (can be overridden by brand colors)
DEFAULT_COLORS = {
    "background": "#1a365d",  # Dark blue
    "text_primary": "#ffffff",
    "text_secondary": "#e2e8f0",
    "accent": "#3182ce",
    "border": "#2d3748",
}


def download_image(url: str) -> Image.Image | None:
    """Download image from URL and return PIL Image."""
    return _common_download_image(url, timeout=30)


def _clean_logo_alpha(img: Image.Image) -> Image.Image:
    """Remove checkerboard artifacts from AI-generated logo PNGs.

    Uses block-level pattern detection (imported from asset_pipeline) so
    only pixels forming a genuine alternating-shade grid are erased.
    Solid white, light-grey or coloured parts of the logo are preserved.

    After stripping, the image is cropped to its alpha bounding box so the
    visible logo fills as much of the canvas as possible (prevents the
    "tiny logo in huge transparent canvas" problem).
    """
    from src.generative.services.asset_pipeline import _strip_checkerboard

    img = img.convert("RGBA")
    img = _strip_checkerboard(img)

    # Crop to alpha bounding box so thumbnail() sizes on actual content
    bbox = img.getchannel("A").getbbox()
    if bbox:
        img = img.crop(bbox)

    return img


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Get a font, falling back to default if custom fonts not available."""
    return get_pil_font(size, bold=bold)


def _hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    """Convert hex color to RGBA tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, 255)


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    cx: int,
    cy: int,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    stroke_fill: tuple[int, int, int, int] | None = None,
    stroke_width: int = 0,
) -> None:
    """Draw text centered at (cx, cy)."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = cx - tw // 2
    y = cy - th // 2
    if stroke_fill and stroke_width:
        draw.text(
            (x, y), text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill
        )
    else:
        draw.text((x, y), text, font=font, fill=fill)


def generate_header_image(  # noqa: PLR0913
    width: int,
    height: int,
    logo_url: str | None = None,
    opponent_logo_url: str | None = None,
    sponsor_url: str | None = None,
    match_date: str = "",
    own_team_name: str = "",
    opponent_name: str = "",
    is_home: bool = True,
    score_home: int | None = None,  # noqa: ARG001 - kept for API compat
    score_away: int | None = None,  # noqa: ARG001 - kept for API compat
    kickoff_time: str | None = None,
    coach_name: str | None = None,  # noqa: ARG001 - kept for API compat
    competition_name: str | None = None,
    venue: str | None = None,
    background_color: str | None = None,
    text_color: str | None = None,  # noqa: ARG001 - kept for API compat
    title_text: str | None = None,
) -> str:
    """Generate header image and return presigned URL.

    This is a convenience wrapper around ``render_header_pil`` that uploads
    the result to object storage (S3) and returns a presigned URL.  For
    callers that need the raw PIL Image (e.g. the lineup-flyer compositor)
    use ``render_header_pil`` directly.
    """
    img = render_header_pil(
        width=width,
        height=height,
        logo_url=logo_url,
        opponent_logo_url=opponent_logo_url,
        sponsor_url=sponsor_url,
        match_date=match_date,
        own_team_name=own_team_name,
        opponent_name=opponent_name,
        is_home=is_home,
        kickoff_time=kickoff_time,
        competition_name=competition_name,
        venue=venue,
        background_color=background_color,
        title_text=title_text,
    )
    # Flatten RGBA → RGB so FFmpeg never renders alpha as a checkerboard.
    # All compositing is done on a white base, so this is lossless.
    img = img.convert("RGB")
    return _upload_and_get_url(img, "header")


def render_header_pil(  # noqa: PLR0913
    width: int,
    height: int,
    logo_url: str | None = None,
    opponent_logo_url: str | None = None,
    sponsor_url: str | None = None,
    match_date: str = "",
    own_team_name: str = "",
    opponent_name: str = "",
    is_home: bool = True,
    kickoff_time: str | None = None,
    competition_name: str | None = None,
    venue: str | None = None,
    background_color: str | None = None,
    title_text: str | None = None,
) -> Image.Image:
    """Render header as a PIL Image (no upload).

    Layout: [Home logo] [Brand color center: STARTING XI / match / comp / venue / date] [Away logo]

    This is the single source of truth for the header layout.  Both the
    lineup-video compositor and the lineup-flyer generator call this.

    Returns:
        PIL ``Image`` in RGBA mode.
    """
    # Colors
    white = (255, 255, 255, 255)
    brand_primary = _hex_to_rgba(background_color) if background_color else (210, 18, 46, 255)

    # Create base with light tint of brand color for logo panels
    brand_rgb = brand_primary[:3]
    light_tint = tuple(min(255, c + int((255 - c) * 0.82)) for c in brand_rgb) + (255,)
    img = Image.new("RGBA", (width, height), light_tint)
    draw = ImageDraw.Draw(img)

    # Panel boundaries: left 25%, center 50%, right 25%
    x_left_end = int(width * 0.25)
    x_right_start = int(width * 0.75)

    # Draw 3 panels
    draw.rectangle([(0, 0), (x_left_end, height)], fill=light_tint)
    draw.rectangle([(x_left_end, 0), (x_right_start, height)], fill=brand_primary)
    draw.rectangle([(x_right_start, 0), (width, height)], fill=light_tint)

    # Fonts (scaled relative to header height)
    scale = height / 300.0
    fonts = {
        "xl": get_font(int(72 * scale), bold=True),  # STARTING XI
        "match": get_font(int(44 * scale), bold=True),  # match title (Home - Away)
        "lg": get_font(int(32 * scale), bold=True),  # competition name
        "sm": get_font(int(26 * scale), bold=True),  # date/time
        "xs": get_font(int(28 * scale), bold=True),  # venue
    }

    # Center panel text
    cx = width // 2

    # "STARTING XI" (or custom title) at top center (with black stroke for readability)
    black = (0, 0, 0, 255)
    header_title = title_text or "STARTING XI"
    _draw_centered_text(
        draw, header_title, cx, int(height * 0.15), fonts["xl"], white, black, stroke_width=4
    )

    # Match title: "Home - Away" (e.g., "Ajax - Heracles Almelo")
    home_name = own_team_name if is_home else opponent_name
    away_name = opponent_name if is_home else own_team_name
    match_title = f"{home_name} - {away_name}"
    _draw_centered_text(draw, match_title.upper(), cx, int(height * 0.38), fonts["match"], white)

    # Competition name (larger font)
    if competition_name:
        comp_text = competition_name.upper()
        _draw_centered_text(draw, comp_text, cx, int(height * 0.56), fonts["lg"], white)

    # Venue (home club location) — prefixed with "LOCATIE:"
    if venue:
        venue_text = f"LOCATIE: {venue.upper()}"
        _draw_centered_text(draw, venue_text, cx, int(height * 0.70), fonts["sm"], white)

    # Date + kickoff time
    date_str = match_date or ""
    time_str = kickoff_time or ""
    if time_str:
        dt_text = f"{date_str}  \u2022  {time_str}"
    else:
        dt_text = date_str
    if dt_text.strip():
        _draw_centered_text(draw, dt_text.upper(), cx, int(height * 0.84), fonts["sm"], white)

    # Determine home/away logos based on is_home
    home_logo_url = logo_url if is_home else opponent_logo_url
    away_logo_url = opponent_logo_url if is_home else logo_url

    # Logo sizing: fill 80% of the 25%-width panel, centered
    panel_w = x_left_end  # 25% of total width
    padding = int(panel_w * 0.10)  # 10% padding on each side
    max_logo_w = panel_w - 2 * padding
    max_logo_h = height - 2 * padding

    # Left panel: Home team logo (centered in panel)
    logger.info(
        "header_logo_urls home=%s away=%s (is_home=%s)",
        home_logo_url[:120] if home_logo_url else None,
        away_logo_url[:120] if away_logo_url else None,
        is_home,
    )
    if home_logo_url:
        logo_img = download_image(home_logo_url)
        if logo_img:
            logo_img = _clean_logo_alpha(logo_img)
            logo_img.thumbnail((max_logo_w, max_logo_h), Image.Resampling.LANCZOS)
            logo_x = (panel_w - logo_img.width) // 2
            logo_y = (height - logo_img.height) // 2
            img.paste(logo_img, (logo_x, logo_y), logo_img)
            logger.info("header_logo_left_pasted size=%dx%d", logo_img.width, logo_img.height)
        else:
            logger.warning("header_logo_left_download_failed url=%s", home_logo_url[:200])
    else:
        logger.warning("header_logo_left_url_missing is_home=%s", is_home)

    # Right panel: Away team logo (centered in panel)
    if away_logo_url:
        logo_img = download_image(away_logo_url)
        if logo_img:
            logo_img = _clean_logo_alpha(logo_img)
            logo_img.thumbnail((max_logo_w, max_logo_h), Image.Resampling.LANCZOS)
            logo_x = x_right_start + (panel_w - logo_img.width) // 2
            logo_y = (height - logo_img.height) // 2
            img.paste(logo_img, (logo_x, logo_y), logo_img)
            logger.info("header_logo_right_pasted size=%dx%d", logo_img.width, logo_img.height)
        else:
            logger.warning("header_logo_right_download_failed url=%s", away_logo_url[:200])
    else:
        logger.info("header_logo_right_url_missing (no opponent logo)")

    # Note: sponsor is intentionally NOT rendered into the header.
    # The lineup compositor overlays sponsor at bottom-left of the full video frame.

    return img


def generate_field_background(
    width: int,
    height: int,
    field_color: str = "#228B22",
    line_color: str = "#ffffff",
) -> str:
    """Generate a simple football field background.

    Args:
        width: Image width
        height: Image height
        field_color: Grass color
        line_color: Line color

    Returns:
        Path to generated image file
    """
    img = Image.new("RGB", (width, height), field_color)
    draw = ImageDraw.Draw(img)

    # Calculate field dimensions (vertical orientation for 9:16)
    margin = int(min(width, height) * 0.05)
    field_left = margin
    field_right = width - margin
    field_top = margin
    field_bottom = height - margin
    field_width = field_right - field_left
    field_height = field_bottom - field_top
    center_x = width // 2
    center_y = height // 2
    line_width = 3

    # Draw grass stripes (alternating shades)
    stripe_height = field_height // 10
    for i in range(10):
        y_start = field_top + i * stripe_height
        stripe_color = "#1e7b1e" if i % 2 == 0 else "#228B22"
        draw.rectangle(
            [field_left, y_start, field_right, y_start + stripe_height],
            fill=stripe_color,
        )

    # Outer boundary
    draw.rectangle(
        [field_left, field_top, field_right, field_bottom],
        outline=line_color,
        width=line_width,
    )

    # Center line
    draw.line(
        [(field_left, center_y), (field_right, center_y)],
        fill=line_color,
        width=line_width,
    )

    # Center circle
    circle_radius = int(field_width * 0.15)
    draw.ellipse(
        [
            center_x - circle_radius,
            center_y - circle_radius,
            center_x + circle_radius,
            center_y + circle_radius,
        ],
        outline=line_color,
        width=line_width,
    )

    # Center spot
    draw.ellipse(
        [center_x - 5, center_y - 5, center_x + 5, center_y + 5],
        fill=line_color,
    )

    # Penalty areas (top and bottom)
    penalty_width = int(field_width * 0.6)
    penalty_height = int(field_height * 0.15)

    # Top penalty area
    draw.rectangle(
        [
            center_x - penalty_width // 2,
            field_top,
            center_x + penalty_width // 2,
            field_top + penalty_height,
        ],
        outline=line_color,
        width=line_width,
    )

    # Bottom penalty area
    draw.rectangle(
        [
            center_x - penalty_width // 2,
            field_bottom - penalty_height,
            center_x + penalty_width // 2,
            field_bottom,
        ],
        outline=line_color,
        width=line_width,
    )

    # Goal areas
    goal_width = int(field_width * 0.3)
    goal_height = int(field_height * 0.05)

    # Top goal area
    draw.rectangle(
        [
            center_x - goal_width // 2,
            field_top,
            center_x + goal_width // 2,
            field_top + goal_height,
        ],
        outline=line_color,
        width=line_width,
    )

    # Bottom goal area
    draw.rectangle(
        [
            center_x - goal_width // 2,
            field_bottom - goal_height,
            center_x + goal_width // 2,
            field_bottom,
        ],
        outline=line_color,
        width=line_width,
    )

    # Upload to storage and return URL
    return _upload_and_get_url(img, "field")

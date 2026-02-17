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

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


def _upload_and_get_url(img: Image.Image, prefix: str = "lineup") -> str:
    """Upload image to storage and return presigned URL.

    Falls back to local file path if storage upload fails.
    """
    try:
        from src.files.utils import get_storage_backend

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
    if not url:
        return None
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image from %s", url)
        return None


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Get a font, falling back to default if custom fonts not available."""
    # Try common system fonts
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

    # Fallback to default
    return ImageFont.load_default()


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
    sponsor_url: str | None = None,  # noqa: ARG001 - kept for API compat
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
) -> str:
    """Generate header image with 3-panel layout and return presigned URL.

    Layout: [Home logo + name] [Brand color center: STARTING XI / comp / venue / date] [Away logo + name]

    Args:
        width: Image width (typically 1080)
        height: Header height (typically 300px)
        logo_url: URL to own club logo
        opponent_logo_url: URL to opponent club logo
        sponsor_url: URL to sponsor logo (unused in new design)
        match_date: Date string (e.g., "15 FEB 2026")
        own_team_name: Club/team name
        opponent_name: Opponent name
        is_home: True if home match
        score_home: Home score (if match completed)
        score_away: Away score (if match completed)
        kickoff_time: Kickoff time string (e.g., "20:00")
        coach_name: Coach name (unused in new design)
        competition_name: Competition/league name (e.g., "EREDIVISIE")
        venue: Stadium/venue name (e.g., "Johan Cruijff Arena")
        background_color: Brand primary color hex for center panel (default: #D2122E)
        text_color: Text color hex (unused, uses white/black per panel)

    Returns:
        Presigned URL to uploaded header image
    """
    # Colors
    white = (255, 255, 255, 255)
    black = (0, 0, 0, 255)
    brand_primary = _hex_to_rgba(background_color) if background_color else (210, 18, 46, 255)

    # Create opaque white base
    img = Image.new("RGBA", (width, height), white)
    draw = ImageDraw.Draw(img)

    # Panel boundaries: left 25%, center 50%, right 25%
    x_left_end = int(width * 0.25)
    x_right_start = int(width * 0.75)

    # Draw 3 panels
    draw.rectangle([(0, 0), (x_left_end, height)], fill=white)
    draw.rectangle([(x_left_end, 0), (x_right_start, height)], fill=brand_primary)
    draw.rectangle([(x_right_start, 0), (width, height)], fill=white)

    # Fonts (scaled relative to header height)
    scale = height / 300.0
    fonts = {
        "xl": get_font(int(72 * scale), bold=True),  # STARTING XI
        "lg": get_font(int(32 * scale), bold=True),  # competition
        "team": get_font(int(56 * scale), bold=True),  # team names
        "sm": get_font(int(26 * scale), bold=True),  # date/time
        "xs": get_font(int(28 * scale), bold=True),  # venue
    }

    # Center panel text
    cx = width // 2

    # "STARTING XI" at top center (with black stroke for readability)
    _draw_centered_text(
        draw, "STARTING XI", cx, int(height * 0.22), fonts["xl"], white, black, stroke_width=4
    )

    # Competition name
    if competition_name:
        comp_text = competition_name.upper()
        _draw_centered_text(draw, comp_text, cx, int(height * 0.48), fonts["lg"], white)

    # Venue
    if venue:
        venue_text = venue.upper()
        _draw_centered_text(draw, venue_text, cx, int(height * 0.65), fonts["xs"], white)

    # Date + kickoff time
    date_str = match_date or ""
    time_str = kickoff_time or ""
    if time_str:
        dt_text = f"{date_str}  •  {time_str}"
    else:
        dt_text = date_str
    if dt_text.strip():
        _draw_centered_text(draw, dt_text.upper(), cx, int(height * 0.85), fonts["sm"], white)

    # Determine home/away teams
    home_name = own_team_name.upper() if is_home else opponent_name.upper()
    away_name = opponent_name.upper() if is_home else own_team_name.upper()
    home_logo_url = logo_url if is_home else opponent_logo_url
    away_logo_url = opponent_logo_url if is_home else logo_url

    # Left panel: Home team name + logo
    left_cx = x_left_end // 2
    _draw_centered_text(draw, home_name, left_cx, int(height * 0.18), fonts["team"], black)

    if home_logo_url:
        logo_img = download_image(home_logo_url)
        if logo_img:
            logo_img = logo_img.convert("RGBA")
            logo_size = int(height * 0.6)
            logo_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            logo_x = left_cx - logo_img.width // 2
            logo_y = int(height * 0.65) - logo_img.height // 2
            img.paste(logo_img, (logo_x, logo_y), logo_img)

    # Right panel: Away team name + logo
    right_cx = x_right_start + (width - x_right_start) // 2
    _draw_centered_text(draw, away_name, right_cx, int(height * 0.18), fonts["team"], black)

    if away_logo_url:
        logo_img = download_image(away_logo_url)
        if logo_img:
            logo_img = logo_img.convert("RGBA")
            logo_size = int(height * 0.6)
            logo_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            logo_x = right_cx - logo_img.width // 2
            logo_y = int(height * 0.65) - logo_img.height // 2
            img.paste(logo_img, (logo_x, logo_y), logo_img)

    # Upload to storage and return URL
    return _upload_and_get_url(img, "header")


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

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
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


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


def generate_header_image(
    width: int,
    height: int,
    logo_url: str | None = None,
    sponsor_url: str | None = None,
    match_date: str = "",
    own_team_name: str = "",
    opponent_name: str = "",
    is_home: bool = True,
    score_home: int | None = None,
    score_away: int | None = None,
    kickoff_time: str | None = None,
    coach_name: str | None = None,
    background_color: str | None = None,
    text_color: str | None = None,
) -> str:
    """Generate header image and return path to saved file.

    Args:
        width: Image width
        height: Header height (typically 200-300px)
        logo_url: URL to club logo
        sponsor_url: URL to sponsor logo
        match_date: Date string (e.g., "Za 27-09-2025")
        own_team_name: Club/team name
        opponent_name: Opponent name
        is_home: True if home match
        score_home: Home score (if match completed)
        score_away: Away score (if match completed)
        kickoff_time: Kickoff time string (if match not started)
        coach_name: Coach name
        background_color: Background color hex
        text_color: Text color hex

    Returns:
        Path to generated image file
    """
    bg_color = background_color or DEFAULT_COLORS["background"]
    txt_color = text_color or DEFAULT_COLORS["text_primary"]
    txt_secondary = DEFAULT_COLORS["text_secondary"]

    # Create image
    img = Image.new("RGBA", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Layout constants
    logo_size = int(height * 0.6)
    logo_margin = int(width * 0.05)
    center_x = width // 2

    # Download and place logo (left side)
    if logo_url:
        logo_img = download_image(logo_url)
        if logo_img:
            logo_img = logo_img.convert("RGBA")
            logo_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            logo_x = logo_margin
            logo_y = (height - logo_img.height) // 2
            img.paste(logo_img, (logo_x, logo_y), logo_img)

    # Download and place sponsor (right side)
    if sponsor_url:
        sponsor_img = download_image(sponsor_url)
        if sponsor_img:
            sponsor_img = sponsor_img.convert("RGBA")
            sponsor_img.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            sponsor_x = width - logo_margin - sponsor_img.width
            sponsor_y = (height - sponsor_img.height) // 2
            img.paste(sponsor_img, (sponsor_x, sponsor_y), sponsor_img)

    # Fonts
    font_date = get_font(24)
    font_teams = get_font(36, bold=True)
    font_score = get_font(32, bold=True)
    font_coach = get_font(20)

    # Draw date (top center)
    date_text = match_date
    date_bbox = draw.textbbox((0, 0), date_text, font=font_date)
    date_width = date_bbox[2] - date_bbox[0]
    draw.text(
        (center_x - date_width // 2, int(height * 0.15)),
        date_text,
        font=font_date,
        fill=txt_secondary,
    )

    # Draw teams (center)
    if is_home:
        teams_text = f"{own_team_name} - {opponent_name}"
    else:
        teams_text = f"{opponent_name} - {own_team_name}"

    teams_bbox = draw.textbbox((0, 0), teams_text, font=font_teams)
    teams_width = teams_bbox[2] - teams_bbox[0]
    draw.text(
        (center_x - teams_width // 2, int(height * 0.35)),
        teams_text,
        font=font_teams,
        fill=txt_color,
    )

    # Draw score or kickoff time
    if score_home is not None and score_away is not None:
        score_text = f"{score_home} - {score_away}"
    else:
        score_text = kickoff_time or ""

    if score_text:
        score_bbox = draw.textbbox((0, 0), score_text, font=font_score)
        score_width = score_bbox[2] - score_bbox[0]
        draw.text(
            (center_x - score_width // 2, int(height * 0.55)),
            score_text,
            font=font_score,
            fill=txt_color,
        )

    # Draw coach (bottom center)
    if coach_name:
        coach_text = f"Coach: {coach_name}"
        coach_bbox = draw.textbbox((0, 0), coach_text, font=font_coach)
        coach_width = coach_bbox[2] - coach_bbox[0]
        draw.text(
            (center_x - coach_width // 2, int(height * 0.75)),
            coach_text,
            font=font_coach,
            fill=txt_secondary,
        )

    # Save to temp file
    temp_dir = Path(tempfile.gettempdir()) / "lineup_headers"
    temp_dir.mkdir(exist_ok=True)

    import uuid as uuid_module

    output_path = temp_dir / f"header_{uuid_module.uuid4().hex}.png"
    img.save(str(output_path), "PNG")

    return str(output_path)


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

    # Save to temp file
    temp_dir = Path(tempfile.gettempdir()) / "lineup_backgrounds"
    temp_dir.mkdir(exist_ok=True)

    import uuid as uuid_module

    output_path = temp_dir / f"field_{uuid_module.uuid4().hex}.png"
    img.save(str(output_path), "PNG")

    return str(output_path)

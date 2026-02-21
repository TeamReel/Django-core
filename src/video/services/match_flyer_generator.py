"""Match Flyer Generator Service.

Generates a static match announcement flyer (PNG) with 3 design variants:
1. Classic — clean design with header, match info, and team logos
2. Stadium — Gemini AI-generated atmospheric stadium background
3. Bold — large typography, high-contrast design

Uses PIL/Pillow for composition, Gemini/Imagen for variant 2.
Output: 1080×1920 portrait PNG uploaded to S3.
"""

from __future__ import annotations

import io
import logging
import uuid as uuid_module
from dataclasses import dataclass

import requests
from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger(__name__)

# ── Output dimensions (portrait 9:16) ──────────────────────────────────────
WIDTH = 1080
HEIGHT = 1920
HEADER_HEIGHT = 300


@dataclass
class MatchFlyerData:
    """All data needed to build a match flyer."""

    activity_id: str
    match_date: str
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str | None
    season_name: str | None
    competition_name: str | None

    # Brand assets
    logo_url: str | None
    opponent_logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None

    # Brand colours
    brand_primary: str  # hex e.g. "#D2122E"
    brand_secondary: str  # hex e.g. "#FFFFFF"


# ── Helpers ────────────────────────────────────────────────────────────────


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex to (R, G, B)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _download_image(url: str) -> Image.Image | None:
    """Download an image from URL."""
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=45)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image from %s", url[:120] if url else "None")
        return None


def _upload_flyer(img: Image.Image, activity_id: str) -> dict:
    """Upload flyer PNG to S3 and return info dict."""
    try:
        from src.files.utils import get_storage_backend

        img_bytes = io.BytesIO()
        img.convert("RGB").save(img_bytes, "PNG", optimize=True)
        img_bytes.seek(0)
        file_size = img_bytes.getbuffer().nbytes

        storage_path = f"generated/match/flyers/{activity_id}/{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()
        backend.save(storage_path, img_bytes)
        url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        logger.info("Uploaded match flyer to S3: %s", storage_path)
        return {
            "presigned_url": url,
            "storage_path": storage_path,
            "file_size_bytes": file_size,
        }
    except Exception as exc:
        logger.warning("Failed to upload match flyer to S3: %s", exc)
        return {"presigned_url": None, "storage_path": None, "file_size_bytes": 0}


def _get_font(size: int, bold: bool = False):
    """Get a font, with fallback."""
    from src.video.services.header_generator import get_font

    return get_font(size, bold=bold)


def _draw_centered(
    draw: ImageDraw.ImageDraw,
    text: str,
    cx: int,
    cy: int,
    font,
    fill,
    stroke_fill=None,
    stroke_width: int = 0,
    max_width: int | None = None,
):
    """Draw text centered at (cx, cy), optionally capping width."""
    from src.video.services.header_generator import _draw_centered_text

    _draw_centered_text(
        draw,
        text,
        cx,
        cy,
        font,
        fill,
        stroke_fill=stroke_fill,
        stroke_width=stroke_width,
    )


def _clean_logo(img: Image.Image) -> Image.Image:
    """Strip checkerboard and crop to alpha bbox."""
    from src.video.services.header_generator import _clean_logo_alpha

    return _clean_logo_alpha(img)


# ── Variant Renderers ─────────────────────────────────────────────────────


def _render_classic(data: MatchFlyerData) -> Image.Image:
    """Variant 1: Classic — header + clean match announcement layout.

    Layout (top to bottom):
    - Header bar (same as lineup)
    - VS block with team logos
    - Match details (comp, venue, date/time)
    - Sponsor bar
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)

    # -- Background --
    bg_img = _download_image(data.field_background_url)
    if bg_img:
        bg_img = bg_img.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        # Darken
        overlay = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
        bg_img = Image.blend(bg_img, overlay, alpha=0.55)
    else:
        bg_img = Image.new("RGB", (WIDTH, HEIGHT), (20, 20, 30))

    canvas = bg_img.copy()
    draw = ImageDraw.Draw(canvas)

    # -- Header --
    from src.video.services.header_generator import render_header_pil

    header = render_header_pil(
        width=WIDTH,
        height=HEADER_HEIGHT,
        logo_url=data.logo_url,
        opponent_logo_url=data.opponent_logo_url,
        sponsor_url=data.sponsor_url,
        match_date=data.match_date or "",
        own_team_name=data.own_team_name,
        opponent_name=data.opponent_name,
        is_home=data.is_home,
        kickoff_time=data.kickoff_time,
        competition_name=data.competition_name,
        venue=data.venue,
        background_color=data.brand_primary,
        title_text="MATCH DAY",
    )
    canvas.paste(header.convert("RGB"), (0, 0))

    # -- "VS" section (y = 400..1100) --
    cx = WIDTH // 2
    vs_top = 420
    logo_size = 280

    # Home logo (left side)
    home_logo_url = data.logo_url if data.is_home else data.opponent_logo_url
    away_logo_url = data.opponent_logo_url if data.is_home else data.logo_url
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    left_cx = int(WIDTH * 0.25)
    right_cx = int(WIDTH * 0.75)

    for logo_url, lx in [(home_logo_url, left_cx), (away_logo_url, right_cx)]:
        logo = _download_image(logo_url)
        if logo:
            logo = _clean_logo(logo)
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            lx_off = lx - logo.width // 2
            ly_off = vs_top + 50
            # White circle background behind logo
            circle_d = logo_size + 40
            circle_img = Image.new("RGBA", (circle_d, circle_d), (0, 0, 0, 0))
            circle_draw = ImageDraw.Draw(circle_img)
            circle_draw.ellipse(
                (0, 0, circle_d - 1, circle_d - 1),
                fill=(255, 255, 255, 220),
            )
            circle_x = lx - circle_d // 2
            circle_y = vs_top + 50 - (circle_d - logo.height) // 2
            canvas.paste(
                circle_img.convert("RGB"),
                (circle_x, circle_y),
                circle_img,
            )
            canvas.paste(logo.convert("RGBA"), (lx_off, ly_off), logo.convert("RGBA"))

    # VS text
    vs_y = vs_top + 50 + logo_size // 2
    vs_font = _get_font(96, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        vs_y,
        vs_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(0, 0, 0, 255),
        stroke_width=5,
    )

    # Team names below logos
    name_y = vs_top + logo_size + 120
    name_font = _get_font(40, bold=True)
    _draw_centered(
        draw,
        home_name.upper(),
        left_cx,
        name_y,
        name_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(0, 0, 0, 255),
        stroke_width=2,
    )
    _draw_centered(
        draw,
        away_name.upper(),
        right_cx,
        name_y,
        name_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(0, 0, 0, 255),
        stroke_width=2,
    )

    # -- Match details section (below logos) --
    details_y = name_y + 100

    # Accent bar
    bar_h = 6
    bar_w = 600
    draw.rectangle(
        [(cx - bar_w // 2, details_y), (cx + bar_w // 2, details_y + bar_h)],
        fill=(*primary_rgb, 255),
    )

    # Competition
    info_font = _get_font(36, bold=True)
    detail_font = _get_font(30, bold=False)
    y_cursor = details_y + 50

    if data.competition_name:
        _draw_centered(
            draw,
            data.competition_name.upper(),
            cx,
            y_cursor,
            info_font,
            fill=(*primary_rgb, 255),
        )
        y_cursor += 70

    # Date + Time
    if data.match_date:
        date_str = data.match_date
        if data.kickoff_time:
            date_str += f"  •  {data.kickoff_time}"
        _draw_centered(
            draw,
            date_str,
            cx,
            y_cursor,
            _get_font(44, bold=True),
            fill=(255, 255, 255, 255),
        )
        y_cursor += 80

    # Venue
    if data.venue:
        _draw_centered(
            draw,
            f"📍 {data.venue}",
            cx,
            y_cursor,
            detail_font,
            fill=(200, 200, 200, 255),
        )
        y_cursor += 60

    # Season
    if data.season_name and data.season_name != data.competition_name:
        _draw_centered(
            draw,
            data.season_name,
            cx,
            y_cursor,
            _get_font(26, bold=False),
            fill=(180, 180, 180, 255),
        )
        y_cursor += 50

    # -- Sponsor bar at bottom --
    sponsor_img = _download_image(data.sponsor_url)
    if sponsor_img:
        sponsor_img = _clean_logo(sponsor_img)
        sponsor_img.thumbnail((220, 80), Image.Resampling.LANCZOS)
        # White pill background
        pill_w = sponsor_img.width + 30
        pill_h = sponsor_img.height + 20
        pill_x = cx - pill_w // 2
        pill_y = HEIGHT - 120 - pill_h // 2
        pill = Image.new("RGBA", (pill_w, pill_h), (255, 255, 255, 200))
        canvas.paste(pill.convert("RGB"), (pill_x, pill_y), pill)
        sx = cx - sponsor_img.width // 2
        sy = pill_y + (pill_h - sponsor_img.height) // 2
        canvas.paste(
            sponsor_img.convert("RGBA"),
            (sx, sy),
            sponsor_img.convert("RGBA"),
        )

    return canvas


def _render_bold(data: MatchFlyerData) -> Image.Image:
    """Variant 2: Bold — large typography, high-contrast, full-bleed color.

    Layout:
    - Full brand-color background with diagonal stripe
    - Huge team names stacked vertically
    - Large date/time block
    - Logos at bottom
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)

    # Darker shade of primary for background
    dark_primary = tuple(max(0, c - 40) for c in primary_rgb)

    canvas = Image.new("RGB", (WIDTH, HEIGHT), dark_primary)
    draw = ImageDraw.Draw(canvas)

    # Diagonal stripe accent
    stripe_color = primary_rgb
    # Draw a fat diagonal stripe
    points = [
        (0, int(HEIGHT * 0.35)),
        (WIDTH, int(HEIGHT * 0.20)),
        (WIDTH, int(HEIGHT * 0.50)),
        (0, int(HEIGHT * 0.65)),
    ]
    draw.polygon(points, fill=stripe_color)

    cx = WIDTH // 2

    # "MATCH DAY" at top
    title_font = _get_font(48, bold=True)
    _draw_centered(
        draw,
        "MATCH DAY",
        cx,
        80,
        title_font,
        fill=(*secondary_rgb, 255),
    )

    # Competition name
    if data.competition_name:
        comp_font = _get_font(30, bold=True)
        _draw_centered(
            draw,
            data.competition_name.upper(),
            cx,
            140,
            comp_font,
            fill=(*secondary_rgb, 180),
        )

    # Home team name (huge)
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    big_font = _get_font(80, bold=True)

    _draw_centered(
        draw,
        home_name.upper(),
        cx,
        int(HEIGHT * 0.32),
        big_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(0, 0, 0, 255),
        stroke_width=3,
    )

    # "VS"
    vs_font = _get_font(72, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        int(HEIGHT * 0.43),
        vs_font,
        fill=(*secondary_rgb, 255),
    )

    # Away team name (huge)
    _draw_centered(
        draw,
        away_name.upper(),
        cx,
        int(HEIGHT * 0.54),
        big_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(0, 0, 0, 255),
        stroke_width=3,
    )

    # Date/time block
    date_y = int(HEIGHT * 0.68)

    # Background block
    block_h = 160
    draw.rectangle(
        [(0, date_y - block_h // 2), (WIDTH, date_y + block_h // 2)],
        fill=(0, 0, 0, 120) if isinstance(draw, ImageDraw.ImageDraw) else (0, 0, 0),
    )

    # Semi-transparent overlay for readability
    date_overlay = Image.new("RGBA", (WIDTH, block_h), (0, 0, 0, 100))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(date_overlay, (0, date_y - block_h // 2), date_overlay)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    date_font = _get_font(48, bold=True)
    if data.match_date:
        date_str = data.match_date
        if data.kickoff_time:
            date_str += f"  •  {data.kickoff_time}"
        _draw_centered(
            draw,
            date_str,
            cx,
            date_y - 20,
            date_font,
            fill=(255, 255, 255),
        )

    if data.venue:
        venue_font = _get_font(28, bold=False)
        _draw_centered(
            draw,
            data.venue.upper(),
            cx,
            date_y + 40,
            venue_font,
            fill=(200, 200, 200),
        )

    # Logos at bottom
    logo_y = int(HEIGHT * 0.82)
    logo_size = 200

    home_logo_url = data.logo_url if data.is_home else data.opponent_logo_url
    away_logo_url = data.opponent_logo_url if data.is_home else data.logo_url

    for logo_url, lx in [(home_logo_url, int(WIDTH * 0.25)), (away_logo_url, int(WIDTH * 0.75))]:
        logo = _download_image(logo_url)
        if logo:
            logo = _clean_logo(logo)
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            canvas.paste(
                logo.convert("RGBA"),
                (lx - logo.width // 2, logo_y),
                logo.convert("RGBA"),
            )

    # Sponsor at very bottom
    sponsor_img = _download_image(data.sponsor_url)
    if sponsor_img:
        sponsor_img = _clean_logo(sponsor_img)
        sponsor_img.thumbnail((180, 60), Image.Resampling.LANCZOS)
        sx = cx - sponsor_img.width // 2
        canvas.paste(
            sponsor_img.convert("RGBA"),
            (sx, HEIGHT - 100),
            sponsor_img.convert("RGBA"),
        )

    return canvas


def _render_stadium_ai(data: MatchFlyerData) -> Image.Image:
    """Variant 3: Stadium — AI-generated atmospheric stadium background.

    Uses Gemini/Imagen to generate a dramatic stadium atmosphere image,
    then overlays match information.

    Falls back to Classic variant if AI generation fails.
    """
    from django.conf import settings

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    ai_bg = None

    if api_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            prompt = (
                f"A dramatic, atmospheric football stadium at night, viewed from the pitch. "
                f"The stadium is packed with fans, dramatic floodlights creating light beams "
                f"through slight fog or smoke. The pitch is pristine green. "
                f"The overall color mood should lean towards the team colors "
                f"(primary: {data.brand_primary}). "
                f"Photorealistic style, cinematic lighting, no text, no logos, no people "
                f"in the foreground. Wide-angle lens, portrait orientation (9:16 aspect ratio)."
            )

            config = types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="9:16",
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            )

            response = client.models.generate_images(
                model="imagen-4.0-generate-001",
                prompt=prompt,
                config=config,
            )

            if response.generated_images:
                image = response.generated_images[0]
                buf = io.BytesIO()
                image.image.save(buf, format="PNG")
                buf.seek(0)
                ai_bg = (
                    Image.open(buf).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
                )
                logger.info("Generated stadium AI background for match flyer")

        except Exception as exc:  # noqa: BLE001
            logger.warning("AI stadium background generation failed: %s", exc)

    # Fallback: use field_background_url or solid dark bg
    if ai_bg is None:
        ai_bg = _download_image(data.field_background_url)
        if ai_bg:
            ai_bg = ai_bg.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        else:
            ai_bg = Image.new("RGB", (WIDTH, HEIGHT), (15, 15, 25))
        # Apply blur for depth effect
        ai_bg = ai_bg.filter(ImageFilter.GaussianBlur(radius=3))

    # Darken slightly for text readability
    dark_overlay = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    canvas = Image.blend(ai_bg, dark_overlay, alpha=0.3)

    draw = ImageDraw.Draw(canvas)
    primary_rgb = _hex_to_rgb(data.brand_primary)
    cx = WIDTH // 2

    # Top gradient bar with brand color
    gradient = Image.new("RGBA", (WIDTH, 200), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(gradient)
    for i in range(200):
        alpha = int(200 * (1 - i / 200))
        gdraw.line([(0, i), (WIDTH, i)], fill=(*primary_rgb, alpha))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(gradient, (0, 0), gradient)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    # "MATCH DAY" title
    title_font = _get_font(64, bold=True)
    _draw_centered(
        draw,
        "MATCH DAY",
        cx,
        80,
        title_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=4,
    )

    # Competition
    if data.competition_name:
        comp_font = _get_font(30, bold=True)
        _draw_centered(
            draw,
            data.competition_name.upper(),
            cx,
            150,
            comp_font,
            fill=(220, 220, 220),
            stroke_fill=(0, 0, 0),
            stroke_width=2,
        )

    # Center VS block
    vs_center_y = int(HEIGHT * 0.45)

    # Logos
    logo_size = 260
    home_logo_url = data.logo_url if data.is_home else data.opponent_logo_url
    away_logo_url = data.opponent_logo_url if data.is_home else data.logo_url
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    left_cx = int(WIDTH * 0.25)
    right_cx = int(WIDTH * 0.75)

    for logo_url, lx in [(home_logo_url, left_cx), (away_logo_url, right_cx)]:
        logo = _download_image(logo_url)
        if logo:
            logo = _clean_logo(logo)
            logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
            canvas.paste(
                logo.convert("RGBA"),
                (lx - logo.width // 2, vs_center_y - logo.height // 2),
                logo.convert("RGBA"),
            )

    # VS
    vs_font = _get_font(84, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        vs_center_y,
        vs_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=5,
    )

    # Team names
    name_y = vs_center_y + logo_size // 2 + 40
    name_font = _get_font(38, bold=True)
    _draw_centered(
        draw,
        home_name.upper(),
        left_cx,
        name_y,
        name_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=2,
    )
    _draw_centered(
        draw,
        away_name.upper(),
        right_cx,
        name_y,
        name_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=2,
    )

    # Bottom info block with semi-transparent bg
    info_y = int(HEIGHT * 0.75)
    block_h = 220
    info_bg = Image.new("RGBA", (WIDTH, block_h), (0, 0, 0, 140))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(info_bg, (0, info_y), info_bg)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    y_cursor = info_y + 30

    # Date/time
    if data.match_date:
        date_str = data.match_date
        if data.kickoff_time:
            date_str += f"  •  {data.kickoff_time}"
        date_font = _get_font(48, bold=True)
        _draw_centered(draw, date_str, cx, y_cursor, date_font, fill=(255, 255, 255))
        y_cursor += 70

    # Venue
    if data.venue:
        venue_font = _get_font(32, bold=False)
        _draw_centered(
            draw,
            f"📍 {data.venue}",
            cx,
            y_cursor,
            venue_font,
            fill=(200, 200, 200),
        )
        y_cursor += 50

    # Season
    if data.season_name and data.season_name != data.competition_name:
        season_font = _get_font(24, bold=False)
        _draw_centered(
            draw,
            data.season_name,
            cx,
            y_cursor,
            season_font,
            fill=(180, 180, 180),
        )

    # Sponsor at very bottom
    sponsor_img = _download_image(data.sponsor_url)
    if sponsor_img:
        sponsor_img = _clean_logo(sponsor_img)
        sponsor_img.thumbnail((180, 60), Image.Resampling.LANCZOS)
        sx = cx - sponsor_img.width // 2
        canvas.paste(
            sponsor_img.convert("RGBA"),
            (sx, HEIGHT - 100),
            sponsor_img.convert("RGBA"),
        )

    return canvas


# ── Variant registry ──────────────────────────────────────────────────────

VARIANT_RENDERERS = {
    "classic": (_render_classic, "Klassiek — schone layout met header"),
    "bold": (_render_bold, "Bold — groot typografie, hoog contrast"),
    "stadium": (_render_stadium_ai, "Stadium — AI-gegenereerde stadion sfeer"),
}


# ── Public API ────────────────────────────────────────────────────────────


def generate_match_flyer(
    data: MatchFlyerData,
    variants: list[str] | None = None,
) -> list[dict]:
    """Generate match flyer in requested variants.

    Args:
        data: Match info + brand assets.
        variants: List of variant keys (classic/bold/stadium).
                  If None, all 3 are generated.

    Returns:
        List of dicts with variant info + presigned_url.
    """
    if variants is None:
        variants = list(VARIANT_RENDERERS.keys())

    results = []
    for variant_key in variants:
        renderer, label = VARIANT_RENDERERS.get(variant_key, (_render_classic, "Classic"))
        try:
            logger.info("Generating match flyer variant: %s", variant_key)
            img = renderer(data)
            upload_info = _upload_flyer(img, data.activity_id)
            results.append(
                {
                    "variant_key": variant_key,
                    "variant_label": label,
                    "presigned_url": upload_info["presigned_url"],
                    "storage_path": upload_info.get("storage_path"),
                    "file_size_bytes": upload_info.get("file_size_bytes", 0),
                    "mime_type": "image/png",
                    "error": None,
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to render variant %s: %s", variant_key, exc)
            results.append(
                {
                    "variant_key": variant_key,
                    "variant_label": label,
                    "presigned_url": None,
                    "error": str(exc),
                }
            )
    return results


def build_match_flyer(
    activity_id: str,
    variants: list[str] | None = None,
) -> list[dict]:
    """High-level entry point: gather data from DB, resolve brand, generate.

    Args:
        activity_id: Match/activity UUID
        variants: Optional variant keys to generate

    Returns:
        List of variant results with presigned_url.
    """
    from django.apps import apps

    Activity = apps.get_model("activities", "Activity")
    BrandProfile = apps.get_model("branding", "BrandProfile")

    activity = Activity.objects.select_related(
        "project__parent_project",
        "opponent_project",
        "period",
    ).get(id=activity_id)

    project = activity.project
    meta = activity.metadata or {}

    # -- Match info (same pattern as goal celebration builder) --
    match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
    kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None

    own_team_name = project.name or ""
    opponent_name = activity.opponent_project.name if activity.opponent_project else ""
    is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")

    # Venue: prefer location field + teamreel metadata
    raw_venue = (
        getattr(activity, "location", None)
        or meta.get("teamreel", {}).get("vars", {}).get("match_location")
        or meta.get("teamreel", {}).get("match_context", {}).get("location")
        or meta.get("teamreel", {}).get("match_context", {}).get("home_club_default_location")
        or meta.get("venue")
    )
    venue = (
        None
        if raw_venue and raw_venue.strip().lower() in ("home", "away", "thuis", "uit", "")
        else raw_venue
    )

    season_name = activity.period.name if activity.period else None
    competition_name = meta.get("teamreel", {}).get("vars", {}).get("competition_name")
    if not competition_name:
        competition_name = meta.get("competition_name")
    if not competition_name and activity.period:
        competition_name = activity.period.name

    # -- Brand assets (logos, sponsor, background) --
    BrandAsset = apps.get_model("branding", "BrandAsset")

    organisation = project.organisation if hasattr(project, "organisation") else None

    # Collect brand profiles in priority order: team → club → org
    brand_profiles: list = []
    team_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
    if team_brand:
        brand_profiles.append(team_brand)
    club_project = project.parent_project if hasattr(project, "parent_project") else None
    if club_project:
        club_brand = BrandProfile.objects.filter(project=club_project, is_active=True).first()
        if club_brand and club_brand not in brand_profiles:
            brand_profiles.append(club_brand)
    if organisation:
        org_brand = BrandProfile.objects.filter(organisation=organisation, is_active=True).first()
        if org_brand and org_brand not in brand_profiles:
            brand_profiles.append(org_brand)

    # Club/org profiles (skip team brand — for logo we want the club logo)
    club_org_profiles = [p for p in brand_profiles if p != team_brand]

    def _resolve_asset_url(asset_types: list[str], *, skip_team: bool = False) -> str | None:
        profiles = club_org_profiles if skip_team else brand_profiles
        for profile in profiles:
            for at in asset_types:
                asset = (
                    BrandAsset.objects.filter(profile=profile, asset_type=at, is_active=True)
                    .select_related("file")
                    .first()
                )
                if not asset:
                    continue
                if asset.file and getattr(asset.file, "file_size", 0) in (None, 0):
                    continue
                url = getattr(asset, "url", None)
                if url:
                    return url
                if asset.file:
                    return _get_presigned_url(asset.file.storage_path)
        return None

    def _get_presigned_url(storage_path: str) -> str | None:
        try:
            from src.files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        except Exception:  # noqa: BLE001
            return None

    logo_url = _resolve_asset_url(["logo"], skip_team=True)
    sponsor_url = _resolve_asset_url(["sponsor_logo"])
    field_background_url = _resolve_asset_url(["stadium_background"])

    # Opponent logo
    opponent_logo_url: str | None = None
    if activity.opponent_project:
        opp_club = getattr(activity.opponent_project, "parent_project", None)
        if opp_club:
            opp_brand = BrandProfile.objects.filter(project=opp_club, is_active=True).first()
            if opp_brand:
                asset = (
                    BrandAsset.objects.filter(profile=opp_brand, asset_type="logo", is_active=True)
                    .select_related("file")
                    .first()
                )
                if asset:
                    opponent_logo_url = getattr(asset, "url", None)
                    if not opponent_logo_url and asset.file:
                        opponent_logo_url = _get_presigned_url(asset.file.storage_path)

    # -- Brand colours --
    brand_primary = "#D2122E"  # default red
    brand_secondary = "#FFFFFF"

    for proj in [project, getattr(project, "parent_project", None)]:
        if not proj:
            continue
        brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
        if brand:
            tokens = brand.get_tokens()
            if tokens.get("primary_color"):
                brand_primary = tokens["primary_color"]
            if tokens.get("secondary_color"):
                brand_secondary = tokens["secondary_color"]
            break
    else:
        # Fallback: org-level brand
        org = getattr(project, "organisation", None)
        if org:
            brand = BrandProfile.objects.filter(organisation=org, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                if tokens.get("primary_color"):
                    brand_primary = tokens["primary_color"]
                if tokens.get("secondary_color"):
                    brand_secondary = tokens["secondary_color"]

    flyer_data = MatchFlyerData(
        activity_id=str(activity_id),
        match_date=match_date,
        kickoff_time=kickoff_time,
        own_team_name=own_team_name,
        opponent_name=opponent_name,
        is_home=is_home,
        venue=venue,
        season_name=season_name,
        competition_name=competition_name,
        logo_url=logo_url,
        opponent_logo_url=opponent_logo_url,
        sponsor_url=sponsor_url,
        field_background_url=field_background_url,
        brand_primary=brand_primary,
        brand_secondary=brand_secondary,
    )

    return generate_match_flyer(flyer_data, variants=variants)

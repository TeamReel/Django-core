"""Match Flyer Generator Service.

Generates a static match announcement flyer (PNG) with 3 design variants:
1. Modern — clean geometric design with brand colors, shapes, and match details
2. Action — incorporates player action photos with brand color accents
3. Stadium — AI-generated atmospheric stadium background with clean overlay

Uses PIL/Pillow for composition, Gemini/Imagen for variant 3.
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

    # Player action photos (for variant 2 — "action")
    action_photo_urls: list[str] | None = None


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


def _render_header_bar(canvas: Image.Image, data: MatchFlyerData) -> Image.Image:
    """Render the shared header bar with logos at the top.

    Header layout (left to right):
    - Home logo | "MATCH DAY" title | Away logo
    - Background: brand primary color
    """
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
    return canvas


def _draw_sponsor_bar(canvas: Image.Image, data: MatchFlyerData) -> Image.Image:
    """Draw sponsor logo at the bottom of the flyer."""
    sponsor_img = _download_image(data.sponsor_url)
    if sponsor_img:
        sponsor_img = _clean_logo(sponsor_img)
        sponsor_img.thumbnail((200, 65), Image.Resampling.LANCZOS)
        cx = WIDTH // 2
        # Semi-transparent pill background
        pill_w = sponsor_img.width + 30
        pill_h = sponsor_img.height + 16
        pill_x = cx - pill_w // 2
        pill_y = HEIGHT - 100 - pill_h // 2
        pill = Image.new("RGBA", (pill_w, pill_h), (255, 255, 255, 180))
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba.paste(pill, (pill_x, pill_y), pill)
        canvas = canvas_rgba.convert("RGB")
        sx = cx - sponsor_img.width // 2
        sy = pill_y + (pill_h - sponsor_img.height) // 2
        canvas.paste(
            sponsor_img.convert("RGBA"),
            (sx, sy),
            sponsor_img.convert("RGBA"),
        )
    return canvas


def _render_modern(data: MatchFlyerData) -> Image.Image:
    """Variant 1: Modern — geometric shapes with brand colors, clean typography.

    Design principles:
    - Header bar at top with BOTH logos (no logos repeated in body)
    - Brand primary & secondary colors as geometric shapes/accents
    - Large team names with "VS" divider
    - Clean match details block
    - Subtle field background with heavy brand color overlay
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)

    # Darker and lighter shades of primary
    dark_primary = tuple(max(0, c - 60) for c in primary_rgb)
    light_primary = tuple(min(255, c + 40) for c in primary_rgb)

    # -- Background: brand gradient feel --
    bg_img = _download_image(data.field_background_url)
    if bg_img:
        bg_img = bg_img.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        # Heavy brand color overlay
        color_overlay = Image.new("RGB", (WIDTH, HEIGHT), dark_primary)
        bg_img = Image.blend(bg_img, color_overlay, alpha=0.75)
    else:
        bg_img = Image.new("RGB", (WIDTH, HEIGHT), dark_primary)

    canvas = bg_img.copy()
    draw = ImageDraw.Draw(canvas)

    # -- Geometric shapes (brand accents) --
    # Large diagonal shape from top-right
    shape_points_1 = [
        (int(WIDTH * 0.55), 0),
        (WIDTH, 0),
        (WIDTH, int(HEIGHT * 0.45)),
        (int(WIDTH * 0.35), int(HEIGHT * 0.30)),
    ]
    shape_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shape_draw = ImageDraw.Draw(shape_overlay)
    shape_draw.polygon(shape_points_1, fill=(*primary_rgb, 60))

    # Accent triangle bottom-left
    shape_points_2 = [
        (0, int(HEIGHT * 0.65)),
        (int(WIDTH * 0.45), HEIGHT),
        (0, HEIGHT),
    ]
    shape_draw.polygon(shape_points_2, fill=(*light_primary, 45))

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba = Image.alpha_composite(canvas_rgba, shape_overlay)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    # -- Header bar with logos --
    canvas = _render_header_bar(canvas, data)
    draw = ImageDraw.Draw(canvas)

    cx = WIDTH // 2

    # -- "MATCH DAY" subtitle below header --
    subtitle_y = HEADER_HEIGHT + 60
    subtitle_font = _get_font(28, bold=False)
    if data.competition_name:
        _draw_centered(
            draw,
            data.competition_name.upper(),
            cx,
            subtitle_y,
            subtitle_font,
            fill=(*secondary_rgb, 200),
        )

    # -- Team names (large, centered, stacked with VS) --
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    # Accent line
    line_y = HEADER_HEIGHT + 110
    line_w = 200
    draw.rectangle(
        [(cx - line_w // 2, line_y), (cx + line_w // 2, line_y + 4)],
        fill=(*secondary_rgb, 255),
    )

    # Home team
    team_font = _get_font(72, bold=True)
    home_y = int(HEIGHT * 0.30)
    _draw_centered(
        draw,
        home_name.upper(),
        cx,
        home_y,
        team_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(*dark_primary, 255),
        stroke_width=2,
    )

    # VS circle
    vs_y = int(HEIGHT * 0.40)
    circle_r = 65
    # Draw filled circle with brand secondary
    for offset in range(circle_r, 0, -1):
        draw.ellipse(
            [cx - offset, vs_y - offset, cx + offset, vs_y + offset],
            fill=(*secondary_rgb,) if offset < circle_r - 3 else (*primary_rgb,),
        )
    vs_font = _get_font(56, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        vs_y,
        vs_font,
        fill=(*dark_primary, 255),
    )

    # Away team
    away_y = int(HEIGHT * 0.50)
    _draw_centered(
        draw,
        away_name.upper(),
        cx,
        away_y,
        team_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(*dark_primary, 255),
        stroke_width=2,
    )

    # -- Match details block --
    details_y = int(HEIGHT * 0.62)

    # Date/time in a bold block
    if data.match_date:
        date_str = data.match_date
        if data.kickoff_time:
            date_str += f"  •  {data.kickoff_time}"
        date_font = _get_font(52, bold=True)

        # Background pill for date
        try:
            bbox = draw.textbbox((0, 0), date_str, font=date_font)
            text_w = bbox[2] - bbox[0]
        except Exception:
            text_w = len(date_str) * 30
        pill_w = text_w + 80
        pill_h = 80
        pill = Image.new("RGBA", (pill_w, pill_h), (*primary_rgb, 220))
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba.paste(pill, (cx - pill_w // 2, details_y - pill_h // 2), pill)
        canvas = canvas_rgba.convert("RGB")
        draw = ImageDraw.Draw(canvas)

        _draw_centered(
            draw,
            date_str,
            cx,
            details_y,
            date_font,
            fill=(255, 255, 255, 255),
        )
        details_y += 90

    # Venue
    if data.venue:
        venue_font = _get_font(32, bold=False)
        _draw_centered(
            draw,
            f"📍 {data.venue}",
            cx,
            details_y,
            venue_font,
            fill=(220, 220, 220, 255),
        )
        details_y += 60

    # Season (if different from competition)
    if data.season_name and data.season_name != data.competition_name:
        season_font = _get_font(24, bold=False)
        _draw_centered(
            draw,
            data.season_name,
            cx,
            details_y,
            season_font,
            fill=(180, 180, 180, 255),
        )

    # -- Sponsor at bottom --
    canvas = _draw_sponsor_bar(canvas, data)

    return canvas


def _render_action(data: MatchFlyerData) -> Image.Image:
    """Variant 2: Action — incorporates player action photos.

    Design principles:
    - Header bar at top with BOTH logos
    - Player action photos as hero images (up to 3 players)
    - Brand color shapes/overlays
    - Match details over the action imagery
    - No logos repeated in body
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)
    dark_primary = tuple(max(0, c - 50) for c in primary_rgb)

    # -- Background --
    canvas = Image.new("RGB", (WIDTH, HEIGHT), dark_primary)

    # -- Load action photos (up to 3) --
    action_photos: list[Image.Image] = []
    if data.action_photo_urls:
        for url in data.action_photo_urls[:3]:
            img = _download_image(url)
            if img:
                action_photos.append(img.convert("RGBA"))

    if action_photos:
        # Compose action photos into the body
        photo_count = len(action_photos)
        # Zone: from below header to about 70% height
        photo_top = HEADER_HEIGHT + 20
        photo_bottom = int(HEIGHT * 0.68)
        photo_height = photo_bottom - photo_top

        if photo_count == 1:
            # Single photo centered, large
            photo = action_photos[0]
            # Scale to fill width
            scale = max(WIDTH / photo.width, photo_height / photo.height)
            new_w = int(photo.width * scale)
            new_h = int(photo.height * scale)
            photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
            # Center crop
            crop_x = (new_w - WIDTH) // 2
            crop_y = (new_h - photo_height) // 2
            photo = photo.crop((crop_x, crop_y, crop_x + WIDTH, crop_y + photo_height))
            canvas.paste(photo.convert("RGB"), (0, photo_top))

        elif photo_count == 2:
            # Two photos side by side with small gap
            gap = 8
            col_w = (WIDTH - gap) // 2
            for i, photo in enumerate(action_photos[:2]):
                scale = max(col_w / photo.width, photo_height / photo.height)
                new_w = int(photo.width * scale)
                new_h = int(photo.height * scale)
                photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
                crop_x = (new_w - col_w) // 2
                crop_y = (new_h - photo_height) // 2
                photo = photo.crop((crop_x, crop_y, crop_x + col_w, crop_y + photo_height))
                x_pos = i * (col_w + gap)
                canvas.paste(photo.convert("RGB"), (x_pos, photo_top))

        else:
            # Three photos: one large left, two stacked right
            gap = 8
            left_w = int(WIDTH * 0.55)
            right_w = WIDTH - left_w - gap
            half_h = (photo_height - gap) // 2

            # Left photo (large)
            photo = action_photos[0]
            scale = max(left_w / photo.width, photo_height / photo.height)
            new_w = int(photo.width * scale)
            new_h = int(photo.height * scale)
            photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
            crop_x = (new_w - left_w) // 2
            crop_y = (new_h - photo_height) // 2
            photo = photo.crop((crop_x, crop_y, crop_x + left_w, crop_y + photo_height))
            canvas.paste(photo.convert("RGB"), (0, photo_top))

            # Right top
            for j, idx in enumerate([1, 2]):
                if idx < len(action_photos):
                    photo = action_photos[idx]
                    scale = max(right_w / photo.width, half_h / photo.height)
                    new_w = int(photo.width * scale)
                    new_h = int(photo.height * scale)
                    photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    crop_x = (new_w - right_w) // 2
                    crop_y = (new_h - half_h) // 2
                    photo = photo.crop((crop_x, crop_y, crop_x + right_w, crop_y + half_h))
                    y_pos = photo_top + j * (half_h + gap)
                    canvas.paste(photo.convert("RGB"), (left_w + gap, y_pos))

        # Brand color gradient overlay on photos (bottom fade for text readability)
        gradient = Image.new("RGBA", (WIDTH, photo_height), (0, 0, 0, 0))
        gradient_draw = ImageDraw.Draw(gradient)
        for y in range(photo_height):
            progress = y / photo_height
            # Light overlay at top, heavy at bottom
            alpha = int(20 + progress * 180)
            gradient_draw.rectangle(
                [(0, y), (WIDTH, y + 1)],
                fill=(*dark_primary, alpha),
            )
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba.paste(gradient, (0, photo_top), gradient)
        canvas = canvas_rgba.convert("RGB")

    else:
        # No action photos: fallback to field background or solid color
        bg_img = _download_image(data.field_background_url)
        if bg_img:
            bg_img = bg_img.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
            color_overlay = Image.new("RGB", (WIDTH, HEIGHT), dark_primary)
            canvas = Image.blend(bg_img, color_overlay, alpha=0.65)
        # Add diagonal brand stripe for visual interest
        draw = ImageDraw.Draw(canvas)
        stripe_points = [
            (0, int(HEIGHT * 0.35)),
            (WIDTH, int(HEIGHT * 0.20)),
            (WIDTH, int(HEIGHT * 0.45)),
            (0, int(HEIGHT * 0.60)),
        ]
        stripe_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        stripe_draw = ImageDraw.Draw(stripe_overlay)
        stripe_draw.polygon(stripe_points, fill=(*primary_rgb, 70))
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba = Image.alpha_composite(canvas_rgba, stripe_overlay)
        canvas = canvas_rgba.convert("RGB")

    draw = ImageDraw.Draw(canvas)

    # -- Header bar with logos --
    canvas = _render_header_bar(canvas, data)
    draw = ImageDraw.Draw(canvas)

    cx = WIDTH // 2

    # -- Bottom section: match info over solid/semi-transparent block --
    info_block_top = int(HEIGHT * 0.66)
    info_block_height = HEIGHT - info_block_top - 120  # leave room for sponsor

    # Solid block with brand color
    block = Image.new("RGBA", (WIDTH, info_block_height), (*dark_primary, 230))
    # Add accent line at top of block
    block_draw = ImageDraw.Draw(block)
    block_draw.rectangle([(0, 0), (WIDTH, 5)], fill=(*primary_rgb, 255))

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(block, (0, info_block_top), block)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    # Team names
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    y_cursor = info_block_top + 40

    team_font = _get_font(56, bold=True)
    _draw_centered(
        draw,
        home_name.upper(),
        cx,
        y_cursor,
        team_font,
        fill=(255, 255, 255, 255),
    )
    y_cursor += 60

    # VS
    vs_font = _get_font(36, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        y_cursor,
        vs_font,
        fill=(*secondary_rgb, 255),
    )
    y_cursor += 50

    _draw_centered(
        draw,
        away_name.upper(),
        cx,
        y_cursor,
        team_font,
        fill=(255, 255, 255, 255),
    )
    y_cursor += 80

    # Accent line
    line_w = 120
    draw.rectangle(
        [(cx - line_w // 2, y_cursor), (cx + line_w // 2, y_cursor + 3)],
        fill=(*primary_rgb, 255),
    )
    y_cursor += 30

    # Date/time
    if data.match_date:
        date_str = data.match_date
        if data.kickoff_time:
            date_str += f"  •  {data.kickoff_time}"
        date_font = _get_font(40, bold=True)
        _draw_centered(
            draw,
            date_str,
            cx,
            y_cursor,
            date_font,
            fill=(255, 255, 255, 255),
        )
        y_cursor += 55

    # Venue
    if data.venue:
        venue_font = _get_font(26, bold=False)
        _draw_centered(
            draw,
            f"📍 {data.venue}",
            cx,
            y_cursor,
            venue_font,
            fill=(200, 200, 200, 255),
        )
        y_cursor += 45

    # Competition
    if data.competition_name:
        comp_font = _get_font(22, bold=False)
        _draw_centered(
            draw,
            data.competition_name,
            cx,
            y_cursor,
            comp_font,
            fill=(180, 180, 180, 255),
        )

    # -- Sponsor at bottom --
    canvas = _draw_sponsor_bar(canvas, data)

    return canvas


def _render_stadium_ai(data: MatchFlyerData) -> Image.Image:
    """Variant 3: Stadium — AI-generated atmospheric stadium background.

    Uses Gemini/Imagen to generate a dramatic stadium atmosphere image,
    then overlays match information with clean typography.
    Header at top with logos — no logos repeated in body.

    Falls back to field background or solid dark if AI fails.
    """
    from django.conf import settings

    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)

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
    canvas = Image.blend(ai_bg, dark_overlay, alpha=0.35)
    cx = WIDTH // 2

    # -- Header bar with logos --
    canvas = _render_header_bar(canvas, data)
    draw = ImageDraw.Draw(canvas)

    # -- Competition name below header --
    if data.competition_name:
        comp_y = HEADER_HEIGHT + 50
        comp_font = _get_font(28, bold=False)
        _draw_centered(
            draw,
            data.competition_name.upper(),
            cx,
            comp_y,
            comp_font,
            fill=(*secondary_rgb, 200),
        )

    # -- Team names (centered, stacked with VS — no logos in body) --
    home_name = data.own_team_name if data.is_home else data.opponent_name
    away_name = data.opponent_name if data.is_home else data.own_team_name

    team_font = _get_font(68, bold=True)
    home_y = int(HEIGHT * 0.33)
    _draw_centered(
        draw,
        home_name.upper(),
        cx,
        home_y,
        team_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=3,
    )

    # VS
    vs_y = int(HEIGHT * 0.43)
    vs_font = _get_font(60, bold=True)
    _draw_centered(
        draw,
        "VS",
        cx,
        vs_y,
        vs_font,
        fill=(*secondary_rgb, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=2,
    )

    away_y = int(HEIGHT * 0.53)
    _draw_centered(
        draw,
        away_name.upper(),
        cx,
        away_y,
        team_font,
        fill=(255, 255, 255),
        stroke_fill=(0, 0, 0),
        stroke_width=3,
    )

    # -- Bottom info block with semi-transparent bg --
    info_y = int(HEIGHT * 0.68)
    block_h = 260
    info_bg = Image.new("RGBA", (WIDTH, block_h), (0, 0, 0, 150))
    # Accent line at top
    info_draw = ImageDraw.Draw(info_bg)
    info_draw.rectangle([(0, 0), (WIDTH, 5)], fill=(*primary_rgb, 255))

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(info_bg, (0, info_y), info_bg)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)

    y_cursor = info_y + 40

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
        y_cursor += 55

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

    # -- Sponsor at bottom --
    canvas = _draw_sponsor_bar(canvas, data)

    return canvas


# ── Variant registry ──────────────────────────────────────────────────────

VARIANT_RENDERERS = {
    "modern": (_render_modern, "Modern — geometrische vormen met teamkleuren"),
    "action": (_render_action, "Actie — met actiefoto's van spelers"),
    "stadium": (_render_stadium_ai, "Stadium — AI-gegenereerde stadion sfeer"),
}


# ── Public API ────────────────────────────────────────────────────────────


def generate_match_flyer(
    data: MatchFlyerData,
    variant: str = "classic",
) -> str:
    """Generate a single match flyer variant and upload to S3.

    Args:
        data: Match info + brand assets.
        variant: Variant key (classic / bold / stadium).

    Returns:
        Presigned URL to the generated PNG on S3.
    """
    # Map old variant names to new ones for backward compatibility
    variant_map = {"classic": "modern", "bold": "action"}
    variant = variant_map.get(variant, variant)

    renderer, label = VARIANT_RENDERERS.get(variant, (_render_modern, "Modern"))
    logger.info("Generating match flyer variant: %s (%s)", variant, label)
    img = renderer(data)
    upload_info = _upload_flyer(img, data.activity_id)
    url = upload_info.get("presigned_url")
    if not url:
        raise RuntimeError(f"Failed to upload match flyer variant '{variant}' to S3")
    return url


def build_match_flyer(
    activity_id: str,
    variant: str = "modern",
) -> str:
    """High-level entry point: gather data from DB, resolve brand, generate.

    Args:
        activity_id: Match/activity UUID
        variant: Variant key to generate (modern / action / stadium)

    Returns:
        Presigned URL to the generated PNG.
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

    # -- Gather action photo URLs for the "action" variant --
    action_photo_urls: list[str] = []
    if variant in ("action", "bold"):  # bold maps to action
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        memberships = ProjectMembership.objects.filter(project=project)
        for m in memberships[:6]:  # Limit to 6 members to avoid overloading
            tr = (m.metadata or {}).get("teamreel_assets", {})
            action_imgs = tr.get("images", {}).get("action_photo", {})
            for _key, val in action_imgs.items():
                url = None
                if isinstance(val, dict):
                    url = val.get("processed") or val.get("raw")
                elif isinstance(val, str):
                    url = val
                if url:
                    action_photo_urls.append(url)
                    break  # One photo per member is enough
            if len(action_photo_urls) >= 3:
                break

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
        action_photo_urls=action_photo_urls or None,
    )

    return generate_match_flyer(flyer_data, variant=variant)

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

from PIL import Image, ImageDraw, ImageFilter

from src.video.services._common import download_image

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

    # Photo layout for action variant: single / triple / hero_duo
    photo_layout: str = "single"

    # Club names (parent project) — displayed large, team names shown smaller
    own_club_name: str | None = None
    opponent_club_name: str | None = None

    # Match summary (post-match) fields
    score_home: int | None = None
    score_away: int | None = None
    goal_scorers: list[str] | None = None  # e.g. ["De Jong 23'", "Berghuis 67'"]


# ── Helpers ────────────────────────────────────────────────────────────────


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex to (R, G, B)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _download_image(url: str) -> Image.Image | None:
    """Download an image from URL."""
    return download_image(url)


def _upload_flyer(img: Image.Image, activity_id: str) -> dict:
    """Upload flyer PNG to S3 and return info dict."""
    try:
        from files.utils import get_storage_backend

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


# ── Name helpers ───────────────────────────────────────────────────────────


def _resolve_display_names(data: MatchFlyerData) -> tuple[str, str | None, str, str | None]:
    """Return (home_club, home_team, away_club, away_team) for display.

    Club name is the primary (large) label; team name is the secondary
    (small) label shown underneath.  When no club name is set, the team
    name is promoted to primary and no secondary is drawn.
    """
    own_club = data.own_club_name or data.own_team_name
    own_team = data.own_team_name if data.own_club_name else None
    opp_club = data.opponent_club_name or data.opponent_name
    opp_team = data.opponent_name if data.opponent_club_name else None

    # Skip secondary if it equals the primary (no point repeating)
    if own_team and own_team == own_club:
        own_team = None
    if opp_team and opp_team == opp_club:
        opp_team = None

    if data.is_home:
        return own_club, own_team, opp_club, opp_team
    return opp_club, opp_team, own_club, own_team


def _draw_team_block(
    draw: ImageDraw.ImageDraw,
    cx: int,
    y: int,
    club_name: str,
    team_name: str | None,
    club_font,
    team_font,
    fill=(255, 255, 255),
    stroke_fill=None,
    stroke_width: int = 0,
) -> int:
    """Draw a club name (large) + optional team name (smaller) centred at *cx*.

    Returns the new y cursor position after the block.
    """
    _draw_centered(
        draw,
        club_name.upper(),
        cx,
        y,
        club_font,
        fill=fill,
        stroke_fill=stroke_fill,
        stroke_width=stroke_width,
    )
    y += int(club_font.size * 1.1) if hasattr(club_font, "size") else 60
    if team_name:
        _draw_centered(
            draw,
            team_name,
            cx,
            y,
            team_font,
            fill=(*fill[:3], 180) if len(fill) >= 3 else fill,
        )
        y += int(team_font.size * 1.3) if hasattr(team_font, "size") else 30
    return y


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


def _draw_sponsor_bar(canvas: Image.Image, data: MatchFlyerData, footer_h: int = 0) -> Image.Image:
    """Overlay sponsor logo above the footer area of the flyer (no background)."""
    sponsor_img = _download_image(data.sponsor_url)
    if sponsor_img:
        sponsor_img = _clean_logo(sponsor_img)
        sponsor_img.thumbnail((440, 140), Image.Resampling.LANCZOS)
        # Paste directly — no pill background, just the logo with alpha
        margin = 24
        sx = margin
        sy = HEIGHT - footer_h - margin - sponsor_img.height
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba.paste(
            sponsor_img.convert("RGBA"),
            (sx, sy),
            sponsor_img.convert("RGBA"),
        )
        canvas = canvas_rgba.convert("RGB")
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

    # -- Club + team names (large club, small team, stacked with VS) --
    home_club, home_team, away_club, away_team = _resolve_display_names(data)

    # Accent line
    line_y = HEADER_HEIGHT + 110
    line_w = 200
    draw.rectangle(
        [(cx - line_w // 2, line_y), (cx + line_w // 2, line_y + 4)],
        fill=(*secondary_rgb, 255),
    )

    club_font = _get_font(72, bold=True)
    sub_font = _get_font(28, bold=False)

    # Home club + team
    home_y = int(HEIGHT * 0.28)
    home_y = _draw_team_block(
        draw,
        cx,
        home_y,
        home_club,
        home_team,
        club_font,
        sub_font,
        fill=(255, 255, 255, 255),
        stroke_fill=(*dark_primary, 255),
        stroke_width=2,
    )

    # VS circle
    vs_y = int(HEIGHT * 0.40)
    circle_r = 65
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

    # Away club + team
    away_y = int(HEIGHT * 0.48)
    _draw_team_block(
        draw,
        cx,
        away_y,
        away_club,
        away_team,
        club_font,
        sub_font,
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
    canvas = _draw_sponsor_bar(canvas, data, footer_h=0)

    return canvas


def _render_brand_shade_band(
    canvas: Image.Image,
    y_start: int,
    band_height: int,
    primary_rgb: tuple[int, int, int],
    secondary_rgb: tuple[int, int, int],
    *,
    direction: str = "down",
) -> Image.Image:
    """Render a horizontal gradient band using shades of the brand colours.

    Creates a smooth multi-stop gradient from primary-dark → primary → secondary-tint.
    ``direction`` can be ``"down"`` (dark-to-light, used below header) or
    ``"up"`` (light-to-dark, used above info panel).
    """
    band = Image.new("RGB", (WIDTH, band_height))
    draw = ImageDraw.Draw(band)

    dark = tuple(max(0, c - 80) for c in primary_rgb)
    mid = primary_rgb
    light = tuple(min(255, (p + s) // 2) for p, s in zip(primary_rgb, secondary_rgb))

    stops = [dark, mid, light] if direction == "down" else [light, mid, dark]

    for y in range(band_height):
        t = y / max(band_height - 1, 1)
        if t < 0.5:
            u = t * 2
            r = int(stops[0][0] + (stops[1][0] - stops[0][0]) * u)
            g = int(stops[0][1] + (stops[1][1] - stops[0][1]) * u)
            b = int(stops[0][2] + (stops[1][2] - stops[0][2]) * u)
        else:
            u = (t - 0.5) * 2
            r = int(stops[1][0] + (stops[2][0] - stops[1][0]) * u)
            g = int(stops[1][1] + (stops[2][1] - stops[1][1]) * u)
            b = int(stops[1][2] + (stops[2][2] - stops[1][2]) * u)
        draw.rectangle([(0, y), (WIDTH, y + 1)], fill=(r, g, b))

    canvas.paste(band, (0, y_start))
    return canvas


def _render_action(data: MatchFlyerData) -> Image.Image:
    """Variant 2: Action — composed flyer with hero action photo & brand shades.

    Layout (top → bottom):
    1. Header bar (300 px) — logos + «MATCH DAY»
    2. Brand-shade gradient band (40 px) — smooth transition from header
    3. Hero action photo — single photo, center-cropped, fills body zone
    4. Brand-shade gradient band (40 px) — smooth transition into info panel
    5. Info panel (~350 px) — team names VS, date, venue, brand colour bg
    6. Sponsor bar (bottom)

    Brand colour *shades* (dark/mid/light) are derived from design tokens and
    used for the gradient bands, info panel background, and subtle edge accents.
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)
    dark_primary = tuple(max(0, c - 70) for c in primary_rgb)
    darker_primary = tuple(max(0, c - 120) for c in primary_rgb)

    BAND_H = 40  # height of each gradient band
    INFO_H = 170  # height of the compact info panel (clubs + VS only)
    PHOTO_TOP = HEADER_HEIGHT + BAND_H
    PHOTO_BOTTOM = HEIGHT - BAND_H - INFO_H
    photo_zone_h = PHOTO_BOTTOM - PHOTO_TOP

    # -- Canvas with dark brand background --
    canvas = Image.new("RGB", (WIDTH, HEIGHT), darker_primary)

    # -- Optional background image behind the action photo --
    if data.field_background_url:
        bg_img = _download_image(data.field_background_url)
        if bg_img:
            bg_img = bg_img.convert("RGB").resize((WIDTH, photo_zone_h), Image.Resampling.LANCZOS)
            # Blend with canvas colour so the photo still pops
            color_layer = Image.new("RGB", (WIDTH, photo_zone_h), darker_primary)
            bg_img = Image.blend(bg_img, color_layer, alpha=0.45)
            canvas.paste(bg_img, (0, PHOTO_TOP))

    # -- Load action photo(s) --
    loaded_photos: list[Image.Image] = []
    if data.action_photo_urls:
        for url in data.action_photo_urls:
            img = _download_image(url)
            if img:
                loaded_photos.append(img.convert("RGBA"))
            if len(loaded_photos) >= 3:
                break

    layout = data.photo_layout or "single"

    def _contain_paste(
        target: Image.Image,
        photo: Image.Image,
        zone_x: int,
        zone_y: int,
        zone_w: int,
        zone_h: int,
    ) -> Image.Image:
        """Scale photo to *contain* inside zone and alpha-composite onto target."""
        scale = min(zone_w / photo.width, zone_h / photo.height)
        new_w = int(photo.width * scale)
        new_h = int(photo.height * scale)
        photo = photo.resize((new_w, new_h), Image.Resampling.LANCZOS)
        paste_x = zone_x + (zone_w - new_w) // 2
        paste_y = zone_y + (zone_h - new_h) // 2
        target_rgba = target.convert("RGBA")
        target_rgba.paste(photo, (paste_x, paste_y), photo)
        return target_rgba.convert("RGB")

    if loaded_photos:
        if layout == "triple" and len(loaded_photos) >= 3:
            # ── 3 photos side by side ──
            gap = 12
            col_w = (WIDTH - gap * 4) // 3  # 3 columns with gaps
            for i, photo in enumerate(loaded_photos[:3]):
                col_x = gap + i * (col_w + gap)
                canvas = _contain_paste(canvas, photo, col_x, PHOTO_TOP, col_w, photo_zone_h)

        elif layout == "hero_duo" and len(loaded_photos) >= 2:
            # ── 1 large hero (left 60%) + 2 small stacked (right 40%) ──
            gap = 10
            hero_w = int(WIDTH * 0.58)
            side_w = WIDTH - hero_w - gap * 3
            side_h = (photo_zone_h - gap) // 2

            # Large hero on the left
            canvas = _contain_paste(canvas, loaded_photos[0], gap, PHOTO_TOP, hero_w, photo_zone_h)
            # Top-right small
            canvas = _contain_paste(
                canvas, loaded_photos[1], hero_w + gap * 2, PHOTO_TOP, side_w, side_h
            )
            # Bottom-right small (use 3rd photo if available, else mirror 2nd)
            third = loaded_photos[2] if len(loaded_photos) >= 3 else loaded_photos[1]
            canvas = _contain_paste(
                canvas,
                third,
                hero_w + gap * 2,
                PHOTO_TOP + side_h + gap,
                side_w,
                side_h,
            )

        else:
            # ── Single hero (default) ──
            canvas = _contain_paste(canvas, loaded_photos[0], 0, PHOTO_TOP, WIDTH, photo_zone_h)

        # Subtle side accents: thin vertical brand-color bars
        accent_w = 6
        accent_overlay = Image.new("RGBA", (WIDTH, photo_zone_h), (0, 0, 0, 0))
        accent_draw = ImageDraw.Draw(accent_overlay)
        accent_draw.rectangle([(0, 0), (accent_w, photo_zone_h)], fill=(*primary_rgb, 140))
        accent_draw.rectangle(
            [(WIDTH - accent_w, 0), (WIDTH, photo_zone_h)], fill=(*primary_rgb, 140)
        )
        canvas_rgba = canvas.convert("RGBA")
        canvas_rgba.paste(accent_overlay, (0, PHOTO_TOP), accent_overlay)
        canvas = canvas_rgba.convert("RGB")
    else:
        # Fallback: field background or solid with diagonal brand stripes
        bg_img = _download_image(data.field_background_url)
        if bg_img:
            bg_img = bg_img.convert("RGB").resize((WIDTH, photo_zone_h), Image.Resampling.LANCZOS)
            color_overlay = Image.new("RGB", (WIDTH, photo_zone_h), dark_primary)
            bg_img = Image.blend(bg_img, color_overlay, alpha=0.55)
            canvas.paste(bg_img, (0, PHOTO_TOP))
        else:
            # Diagonal brand stripes as placeholder for missing photo
            stripe_overlay = Image.new("RGBA", (WIDTH, photo_zone_h), (0, 0, 0, 0))
            stripe_draw = ImageDraw.Draw(stripe_overlay)
            stripe_h = photo_zone_h
            stripe_draw.polygon(
                [
                    (0, int(stripe_h * 0.2)),
                    (WIDTH, 0),
                    (WIDTH, int(stripe_h * 0.4)),
                    (0, int(stripe_h * 0.6)),
                ],
                fill=(*primary_rgb, 60),
            )
            stripe_draw.polygon(
                [
                    (0, int(stripe_h * 0.7)),
                    (WIDTH, int(stripe_h * 0.5)),
                    (WIDTH, int(stripe_h * 0.9)),
                    (0, stripe_h),
                ],
                fill=(*primary_rgb, 40),
            )
            canvas_rgba = canvas.convert("RGBA")
            canvas_rgba.paste(stripe_overlay, (0, PHOTO_TOP), stripe_overlay)
            canvas = canvas_rgba.convert("RGB")

        # "No photo" hint
        draw_tmp = ImageDraw.Draw(canvas)
        hint_font = _get_font(28, bold=False)
        _draw_centered(
            draw_tmp,
            "Geen actiefoto beschikbaar",
            WIDTH // 2,
            PHOTO_TOP + photo_zone_h // 2,
            hint_font,
            fill=(255, 255, 255, 120),
        )

    # -- Header bar (logos + MATCH DAY) --
    canvas = _render_header_bar(canvas, data)

    # -- Brand shade bands --
    canvas = _render_brand_shade_band(
        canvas,
        HEADER_HEIGHT,
        BAND_H,
        primary_rgb,
        secondary_rgb,
        direction="down",
    )
    canvas = _render_brand_shade_band(
        canvas,
        PHOTO_BOTTOM,
        BAND_H,
        primary_rgb,
        secondary_rgb,
        direction="up",
    )

    # -- Info panel (brand primary background) --
    info_top = PHOTO_BOTTOM + BAND_H
    info_panel = Image.new("RGB", (WIDTH, INFO_H), dark_primary)
    info_draw = ImageDraw.Draw(info_panel)

    # Accent line at very top of panel
    info_draw.rectangle([(0, 0), (WIDTH, 5)], fill=(*primary_rgb, 255))

    # Subtle gradient stripe on the left edge
    for y in range(INFO_H):
        t = y / max(INFO_H - 1, 1)
        fade = int(80 * (1 - t))
        shade = tuple(min(255, c + fade) for c in primary_rgb)
        info_draw.rectangle([(0, y), (8, y + 1)], fill=shade)

    canvas.paste(info_panel, (0, info_top))
    draw = ImageDraw.Draw(canvas)

    cx = WIDTH // 2
    home_club, home_team, away_club, away_team = _resolve_display_names(data)

    # -- Side-by-side layout: HOME  VS  AWAY --
    left_cx = WIDTH // 4  # center of left half
    right_cx = WIDTH * 3 // 4  # center of right half

    club_font = _get_font(52, bold=True)
    sub_font = _get_font(24, bold=False)

    row_top = info_top + 25

    # Home club + team (left side)
    _draw_team_block(
        draw,
        left_cx,
        row_top,
        home_club,
        home_team,
        club_font,
        sub_font,
        fill=(255, 255, 255),
    )

    # VS badge (center)
    vs_font = _get_font(30, bold=True)
    vs_y = row_top + 10
    vs_badge = Image.new("RGBA", (70, 40), (*primary_rgb, 220))
    vs_badge_draw = ImageDraw.Draw(vs_badge)
    vs_badge_draw.rectangle([(0, 0), (70, 40)], fill=(*primary_rgb, 220))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(vs_badge, (cx - 35, vs_y - 8), vs_badge)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)
    _draw_centered(draw, "VS", cx, vs_y + 8, vs_font, fill=(*secondary_rgb,))

    # Away club + team (right side)
    _draw_team_block(
        draw,
        right_cx,
        row_top,
        away_club,
        away_team,
        club_font,
        sub_font,
        fill=(255, 255, 255),
    )

    # Accent line below clubs row
    y_cursor = row_top + 110
    line_w = 200
    draw.rectangle(
        [(cx - line_w // 2, y_cursor), (cx + line_w // 2, y_cursor + 3)], fill=(*primary_rgb,)
    )

    # -- Sponsor at bottom --
    canvas = _draw_sponsor_bar(canvas, data, footer_h=BAND_H + INFO_H)

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

    # -- Club + team names (centered, stacked with VS — no logos in body) --
    home_club, home_team, away_club, away_team = _resolve_display_names(data)

    club_font = _get_font(68, bold=True)
    sub_font = _get_font(26, bold=False)

    home_y = int(HEIGHT * 0.31)
    _draw_team_block(
        draw,
        cx,
        home_y,
        home_club,
        home_team,
        club_font,
        sub_font,
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

    away_y = int(HEIGHT * 0.51)
    _draw_team_block(
        draw,
        cx,
        away_y,
        away_club,
        away_team,
        club_font,
        sub_font,
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
    canvas = _draw_sponsor_bar(canvas, data, footer_h=HEIGHT - int(HEIGHT * 0.68))

    return canvas


def _render_summary(data: MatchFlyerData) -> Image.Image:
    """Variant 4: Match Summary — post-match result with score & goal scorers.

    Layout (top to bottom):
    - Header bar (logos + "EINDSTAND")
    - Gradient band
    - Background image (or solid dark brand)
    - Large score display
    - Goal scorers list
    - Gradient band
    - Compact info panel (clubs + VS replacement = score)
    - Sponsor overlay
    """
    primary_rgb = _hex_to_rgb(data.brand_primary)
    secondary_rgb = _hex_to_rgb(data.brand_secondary)
    dark_primary = tuple(max(0, c - 70) for c in primary_rgb)
    darker_primary = tuple(max(0, c - 120) for c in primary_rgb)
    light_primary = tuple(min(255, c + 80) for c in primary_rgb)

    BAND_H = 40
    FOOTER_H = 140
    PHOTO_TOP = HEADER_HEIGHT + BAND_H
    PHOTO_BOTTOM = HEIGHT - BAND_H - FOOTER_H
    content_h = PHOTO_BOTTOM - PHOTO_TOP

    # -- Canvas --
    canvas = Image.new("RGB", (WIDTH, HEIGHT), darker_primary)

    # -- Background image --
    if data.field_background_url:
        bg_img = _download_image(data.field_background_url)
        if bg_img:
            bg_img = bg_img.convert("RGB").resize((WIDTH, content_h), Image.Resampling.LANCZOS)
            color_layer = Image.new("RGB", (WIDTH, content_h), darker_primary)
            bg_img = Image.blend(bg_img, color_layer, alpha=0.55)
            canvas.paste(bg_img, (0, PHOTO_TOP))

    # -- Action photo as background if available --
    if data.action_photo_urls:
        photo_img = _download_image(data.action_photo_urls[0])
        if photo_img:
            photo_img = photo_img.convert("RGBA")
            scale = max(WIDTH / photo_img.width, content_h / photo_img.height)
            new_w = int(photo_img.width * scale)
            new_h = int(photo_img.height * scale)
            photo_img = photo_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            px = (WIDTH - new_w) // 2
            py = PHOTO_TOP + (content_h - new_h) // 2
            canvas_rgba = canvas.convert("RGBA")
            canvas_rgba.paste(photo_img, (px, py), photo_img)
            # Dark overlay so text is readable
            overlay = Image.new("RGBA", (WIDTH, content_h), (*darker_primary, 160))
            canvas_rgba.paste(overlay, (0, PHOTO_TOP), overlay)
            canvas = canvas_rgba.convert("RGB")

    draw = ImageDraw.Draw(canvas)
    cx = WIDTH // 2

    # -- Score display --
    score_home = data.score_home if data.score_home is not None else 0
    score_away = data.score_away if data.score_away is not None else 0

    home_club, home_team, away_club, away_team = _resolve_display_names(data)

    # Club names above score
    club_font = _get_font(42, bold=True)
    score_area_top = PHOTO_TOP + int(content_h * 0.08)

    _draw_centered(
        draw, home_club.upper(), WIDTH // 4, score_area_top, club_font, fill=(255, 255, 255)
    )
    _draw_centered(
        draw, away_club.upper(), WIDTH * 3 // 4, score_area_top, club_font, fill=(255, 255, 255)
    )

    # Team names (smaller)
    sub_font = _get_font(22, bold=False)
    if home_team and home_team != home_club:
        _draw_centered(
            draw, home_team, WIDTH // 4, score_area_top + 55, sub_font, fill=(200, 200, 200)
        )
    if away_team and away_team != away_club:
        _draw_centered(
            draw, away_team, WIDTH * 3 // 4, score_area_top + 55, sub_font, fill=(200, 200, 200)
        )

    # Large score
    score_font = _get_font(160, bold=True)
    score_y = score_area_top + 100
    score_text = f"{score_home}  -  {score_away}"
    _draw_centered(draw, score_text, cx, score_y, score_font, fill=(255, 255, 255))

    # "EINDSTAND" badge below score
    badge_font = _get_font(24, bold=True)
    badge_y = score_y + 180
    badge_w, badge_h = 220, 38
    badge = Image.new("RGBA", (badge_w, badge_h), (*primary_rgb, 230))
    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.paste(badge, (cx - badge_w // 2, badge_y), badge)
    canvas = canvas_rgba.convert("RGB")
    draw = ImageDraw.Draw(canvas)
    _draw_centered(draw, "EINDSTAND", cx, badge_y + 8, badge_font, fill=(255, 255, 255))

    # -- Goal scorers --
    if data.goal_scorers:
        scorer_font = _get_font(28, bold=False)
        y = badge_y + 60

        # Section title
        _draw_centered(draw, "DOELPUNTEN", cx, y, _get_font(18, bold=True), fill=(*light_primary,))
        y += 40

        for scorer in data.goal_scorers[:8]:  # max 8 scorers
            _draw_centered(draw, f"⚽  {scorer}", cx, y, scorer_font, fill=(255, 255, 255))
            y += 42

    # -- Header bar (logos + EINDSTAND) --
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
        title_text="EINDSTAND",
    )
    canvas.paste(header.convert("RGB"), (0, 0))

    # -- Gradient bands --
    canvas = _render_brand_shade_band(
        canvas, HEADER_HEIGHT, BAND_H, primary_rgb, secondary_rgb, direction="down"
    )
    canvas = _render_brand_shade_band(
        canvas, PHOTO_BOTTOM, BAND_H, primary_rgb, secondary_rgb, direction="up"
    )

    # -- Footer panel --
    footer_top = PHOTO_BOTTOM + BAND_H
    footer = Image.new("RGB", (WIDTH, FOOTER_H), dark_primary)
    footer_draw = ImageDraw.Draw(footer)
    footer_draw.rectangle([(0, 0), (WIDTH, 5)], fill=(*primary_rgb, 255))

    # Subtle gradient stripe on left edge
    for y in range(FOOTER_H):
        t = y / max(FOOTER_H - 1, 1)
        fade = int(80 * (1 - t))
        shade = tuple(min(255, c + fade) for c in primary_rgb)
        footer_draw.rectangle([(0, y), (8, y + 1)], fill=shade)

    canvas.paste(footer, (0, footer_top))
    draw = ImageDraw.Draw(canvas)

    # Competition + date in footer (compact)
    footer_cx = WIDTH // 2
    footer_y = footer_top + 30
    if data.competition_name:
        comp_font = _get_font(26, bold=True)
        _draw_centered(
            draw, data.competition_name, footer_cx, footer_y, comp_font, fill=(255, 255, 255)
        )
        footer_y += 40
    if data.match_date:
        date_str = data.match_date
        if data.venue:
            date_str += f"  •  {data.venue}"
        date_font = _get_font(20, bold=False)
        _draw_centered(draw, date_str, footer_cx, footer_y, date_font, fill=(180, 180, 180))

    # -- Sponsor --
    canvas = _draw_sponsor_bar(canvas, data, footer_h=BAND_H + FOOTER_H)

    return canvas


# ── Variant registry ──────────────────────────────────────────────────────

VARIANT_RENDERERS = {
    "modern": (_render_modern, "Modern — geometrische vormen met teamkleuren"),
    "action": (_render_action, "Actie — samengestelde flyer met actiefoto & clubkleuren"),
    "stadium": (_render_stadium_ai, "Stadium — AI-gegenereerde stadion sfeer"),
    "summary": (_render_summary, "Summary — nabeschouwing met uitslag & doelpunten"),
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
    member_id: str | None = None,
    style_variant: str | None = None,
    background_url: str | None = None,
    photo_layout: str = "single",
    photo_slots: list[dict] | None = None,
    score_home: int | None = None,
    score_away: int | None = None,
    goal_scorers: list[str] | None = None,
) -> str:
    """High-level entry point: gather data from DB, resolve brand, generate.

    Args:
        activity_id: Match/activity UUID
        variant: Variant key to generate (modern / action / stadium)
        member_id: Optional membership UUID — use this member's action photo
        style_variant: Optional style (dribbling, ball_at_feet, etc.)
        background_url: Optional background image URL
        photo_layout: Photo layout for action variant (single / triple / hero_duo)
        photo_slots: Optional list of per-slot dicts [{member_id, style_variant}, ...]

    Returns:
        Presigned URL to the generated PNG.
    """
    from django.apps import apps

    Activity = apps.get_model("activities", "Activity")
    BrandProfile = apps.get_model("branding", "BrandProfile")

    activity = Activity.objects.select_related(
        "project__parent_project",
        "opponent_project__parent_project",
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

    # Resolve club names from parent project (club → team hierarchy)
    club_project = getattr(project, "parent_project", None)
    own_club_name = club_project.name if club_project else None

    opponent_project = activity.opponent_project
    opp_club_project = (
        getattr(opponent_project, "parent_project", None) if opponent_project else None
    )
    opponent_club_name = opp_club_project.name if opp_club_project else None

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
            from files.utils import get_storage_backend

            backend = get_storage_backend()
            return backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        except Exception:  # noqa: BLE001
            return None

    logo_url = _resolve_asset_url(["logo"], skip_team=True)
    sponsor_url = _resolve_asset_url(["sponsor_logo"])
    field_background_url = background_url or _resolve_asset_url(["stadium_background"])

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

    # -- Brand colours (priority: club brand → team brand → org brand) --
    brand_primary = "#333333"  # neutral dark default (not red)
    brand_secondary = "#FFFFFF"

    # Search club (parent_project) first, then team, then org
    brand_search_projects = []
    parent = getattr(project, "parent_project", None)
    if parent:
        brand_search_projects.append(parent)
    brand_search_projects.append(project)

    found_colors = False
    for proj in brand_search_projects:
        if not proj:
            continue
        brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
        if brand:
            tokens = brand.get_tokens()
            if tokens.get("primary_color"):
                brand_primary = tokens["primary_color"]
                found_colors = True
            if tokens.get("secondary_color"):
                brand_secondary = tokens["secondary_color"]
            if found_colors:
                break

    if not found_colors:
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

        def _resolve_member_photo(mid: str, style: str | None = None) -> str | None:
            """Look up a single processed action photo for a membership."""
            try:
                membership = ProjectMembership.objects.get(id=mid)
            except ProjectMembership.DoesNotExist:
                logger.warning("build_match_flyer: member_id %s not found", mid)
                return None
            tr = (membership.metadata or {}).get("teamreel_assets", {})
            action_imgs = tr.get("images", {}).get("action_photo", {})
            # First pass: filter by style if given
            for _key, val in action_imgs.items():
                if style and style not in _key:
                    continue
                url = None
                if isinstance(val, dict):
                    url = val.get("processed")  # processed only
                if url:
                    if not url.startswith("http"):
                        url = _get_presigned_url(url)
                    if url:
                        return url
            # Second pass: any processed photo (fallback when style not found)
            if style:
                for _key, val in action_imgs.items():
                    url = None
                    if isinstance(val, dict):
                        url = val.get("processed")
                    if url:
                        if not url.startswith("http"):
                            url = _get_presigned_url(url)
                        if url:
                            return url
            return None

        if photo_slots:
            # Per-slot selection: each slot has {member_id, style_variant}
            for slot in photo_slots:
                slot_mid = slot.get("member_id")
                slot_style = slot.get("style_variant")
                if slot_mid:
                    url = _resolve_member_photo(slot_mid, slot_style)
                    if url:
                        action_photo_urls.append(url)

        elif member_id:
            # Single member selection — gather up to N photos
            need = 3 if photo_layout in ("triple", "hero_duo") else 1
            try:
                membership = ProjectMembership.objects.get(id=member_id)
                tr = (membership.metadata or {}).get("teamreel_assets", {})
                action_imgs = tr.get("images", {}).get("action_photo", {})

                for _key, val in action_imgs.items():
                    if style_variant and style_variant not in _key:
                        continue
                    url = None
                    if isinstance(val, dict):
                        url = val.get("processed")  # processed only
                    if url:
                        if not url.startswith("http"):
                            url = _get_presigned_url(url)
                        if url:
                            action_photo_urls.append(url)
                            if len(action_photo_urls) >= need:
                                break

                # If we need more photos and have a style filter, retry without filter
                if len(action_photo_urls) < need and style_variant:
                    for _key, val in action_imgs.items():
                        if style_variant in _key:
                            continue
                        url = None
                        if isinstance(val, dict):
                            url = val.get("processed")
                        if url:
                            if not url.startswith("http"):
                                url = _get_presigned_url(url)
                            if url:
                                action_photo_urls.append(url)
                                if len(action_photo_urls) >= need:
                                    break
            except ProjectMembership.DoesNotExist:
                logger.warning("build_match_flyer: member_id %s not found", member_id)
        else:
            # Auto-scan: pick first available processed action photos from team members
            memberships = ProjectMembership.objects.filter(project=project)
            for m in memberships[:6]:
                tr = (m.metadata or {}).get("teamreel_assets", {})
                action_imgs = tr.get("images", {}).get("action_photo", {})
                for _key, val in action_imgs.items():
                    url = None
                    if isinstance(val, dict):
                        url = val.get("processed")  # processed only
                    if url:
                        if not url.startswith("http"):
                            url = _get_presigned_url(url)
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
        photo_layout=photo_layout,
        own_club_name=own_club_name,
        opponent_club_name=opponent_club_name,
        score_home=score_home,
        score_away=score_away,
        goal_scorers=goal_scorers,
    )

    return generate_match_flyer(flyer_data, variant=variant)

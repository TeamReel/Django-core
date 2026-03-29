"""Lineup Flyer Generator Service.

Generates a static lineup flyer (PNG) from LineupData.
Uses PIL/Pillow for header + labels, FFmpeg for final compositing.

This is the production version of local_lineup_test/build_flyers.py,
adapted to work with S3-backed assets and the LineupData dataclass.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
import tempfile
import uuid as uuid_module
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from src.video.services._common import (
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    HEADER_HEIGHT,
    download_image_cached,
    get_ffmpeg_path,
    get_pil_font,
)
from src.video.services.lineup_builder import LineupData

logger = logging.getLogger(__name__)

# ── Output dimensions (portrait 9:16) ─────────────────────────────────────────
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT

# ── Player sizing ───────────────────────────────────────────────────────────
FLYER_SCALE = 0.16  # fullbody height as fraction of HEIGHT
CLOSEUP_SCALE = 0.11  # for label sizing reference
BADGE_SIZE = 160  # diameter for badge/circle closeup style

# ── Label styling ───────────────────────────────────────────────────────────
LABEL_TEXT_COLOR = "#FFFFFF"
LABEL_STROKE_COLOR = "#000000"
LABEL_STROKE_WIDTH = 3
LABEL_FONTSIZE = 36
LABEL_HEIGHT = 44
LABEL_GAP = 10  # px between player bottom and label top
LABEL_EXTRA_W = 70  # extra width around text

# ── Sponsor sizing ─────────────────────────────────────────────────────────
SPONSOR_W = 220
SPONSOR_PAD = 15
SPONSOR_MARGIN = 20
SPONSOR_BOX_H = 100

# ── Watermark ──────────────────────────────────────────────────────────────
WATERMARK_PATH = Path(__file__).resolve().parent.parent / "assets" / "watermark.png"
WATERMARK_OPACITY = 0.25  # 25% opacity
WATERMARK_MARGIN = 30  # px from edge

# ── Y positions (0-1 fraction of HEIGHT) per role ──────────────────────────
# Positions account for 300px header at top — all players below header.
Y_POS = {
    "keeper": 0.90,
    "defender": 0.72,
    "midfielder": 0.53,
    "attacker": 0.36,
}

# ── Flyer Y adjustment (fine-tuning within field area) ──────────────────────
FLYER_Y_ADJUST = {
    "keeper": 0.0,
    "defender": 0.0,
    "midfielder": 0.0,
    "attacker": 0.0,
}

# ── Header dimensions ─────────────────────────────────────────────────────
HEADER_WIDTH = CANVAS_WIDTH


# ── Image download cache ──────────────────────────────────────────────────
_image_cache: dict[str, Image.Image | None] = {}


def _reset_cache() -> None:
    _image_cache.clear()


def _download_image(url: str) -> Image.Image | None:
    """Download an image from URL with caching."""
    return download_image_cached(url, _image_cache)


def _get_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    """Get a font, trying bold first then regular, with multiple fallbacks."""
    return get_pil_font(size, bold=bold)


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary."""
    return get_ffmpeg_path()


# ── Label helpers ──────────────────────────────────────────────────────────


def _surname_label(name: str) -> str:
    """Extract surname in uppercase for display."""
    parts = name.strip().upper().split()
    if not parts:
        return ""
    # If only one word, return it. Otherwise skip the first name.
    if len(parts) == 1:
        return parts[0]
    return " ".join(parts[1:])


def _measure_label(text: str, font_size: int) -> tuple[int, int]:
    """Measure rendered label text dimensions."""
    font = _get_font(font_size, bold=True)
    img = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    left, top, right, bottom = draw.textbbox(
        (0, 0),
        text,
        font=font,
        stroke_width=LABEL_STROKE_WIDTH,
    )
    return (right - left, bottom - top)


def _render_label_png(
    text: str,
    width: int,
    height: int,
    font_size: int,
) -> Image.Image:
    """Render a name label as a transparent RGBA image."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = _get_font(font_size, bold=True)
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    tw, th = right - left, bottom - top
    x = (width - tw) // 2
    y = (height - th) // 2
    draw.text(
        (x, y),
        text,
        font=font,
        fill=LABEL_TEXT_COLOR,
        stroke_width=LABEL_STROKE_WIDTH,
        stroke_fill=LABEL_STROKE_COLOR,
    )
    return img


# ── Formation helpers ──────────────────────────────────────────────────────


def _get_x_positions(count: int, role: str) -> list[float]:
    """Get evenly-spaced x positions (0-1) for a group of players."""
    if count == 0:
        return []
    if count == 1:
        return [0.5]

    # Edge margins depend on line size
    if count <= 2:
        margin = 0.30
    elif count <= 3:
        margin = 0.18
    else:
        margin = 0.12

    return [margin + i * (1 - 2 * margin) / max(count - 1, 1) for i in range(count)]


def _apply_formation_tweaks(
    formation: str,
    group_name: str,
    idx: int,
    x: float,
    y: float,
) -> tuple[float, float]:
    """Per-formation position tweaks (copied from local prototype)."""

    def _clamp(v: float) -> float:
        return max(0.0, min(1.0, v))

    if formation == "4-3-3":
        if group_name == "keeper":
            y += 0.015
        if group_name == "defenders":
            if idx in (0, 3):
                y -= 0.015
            if idx == 1:
                x -= 0.03
                y += 0.015
            elif idx == 2:
                x += 0.03
                y += 0.015
        if group_name == "midfielders":
            if idx == 0:
                x += 0.075
                y -= 0.015
            elif idx == 2:
                x -= 0.075
                y -= 0.015
            if idx == 1:
                y += 0.015
        if group_name == "attackers":
            y -= 0.025
            if idx == 0:
                x -= 0.020
            elif idx == 2:
                x += 0.020
            if idx == 1:
                y -= 0.010

    elif formation == "4-4-2":
        if group_name == "midfielders":
            if idx in (0, 3):
                y -= 0.02
            if idx in (1, 2):
                y += 0.015
        if group_name == "defenders":
            if idx == 1:
                x -= 0.03
                y += 0.030
            elif idx == 2:
                x += 0.03
                y += 0.030
        if group_name == "attackers":
            y -= 0.025

    elif formation == "3-4-3":
        if group_name == "keeper":
            x += 0.015
        if group_name == "defenders":
            if idx == 0:
                x += 0.05
            elif idx == 2:
                x -= 0.05
            elif idx == 1:
                x += (0.5 - x) * 0.35
                y -= 0.020
                x += 0.020
        if group_name == "attackers":
            if idx == 0:
                x += 0.05
            elif idx == 2:
                x -= 0.05
            elif idx == 1:
                y -= 0.015

    return _clamp(x), _clamp(y)


# ── Alpha bounding box helper ─────────────────────────────────────────────


def _get_alpha_bbox(img: Image.Image) -> tuple[int, int, int, int] | None:
    """Get tight bounding box based on alpha channel."""
    if img.mode not in ("RGBA", "LA"):
        return None
    alpha = img.split()[-1]
    return alpha.getbbox()


# ── Main flyer compositor ─────────────────────────────────────────────────


def generate_lineup_flyer(
    data: LineupData,
    formation: str = "4-3-3",
    brand_primary_hex: str = "#D2122E",
    brand_secondary_hex: str = "#FFFFFF",
    closeup_style: str = "popout",
) -> str:
    """Generate a lineup flyer PNG and upload to S3.

    Args:
        data: LineupData with all match/player/brand info
        formation: Formation string (e.g. "4-3-3")
        brand_primary_hex: Primary brand color hex
        brand_secondary_hex: Secondary brand color hex
        closeup_style: "popout" (full-body kit) or "badge" (circular closeup)

    Returns:
        Presigned URL to the generated PNG on S3.
    """
    _reset_cache()
    tmp_dir = Path(tempfile.mkdtemp(prefix="lineup_flyer_"))

    try:
        return _compose_flyer(
            data=data,
            formation=formation,
            brand_primary_hex=brand_primary_hex,
            tmp_dir=tmp_dir,
            closeup_style=closeup_style,
        )
    finally:
        _reset_cache()
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _make_circle_badge(img: Image.Image, diameter: int) -> Image.Image:
    """Crop image to a circle with the given diameter."""
    img = img.convert("RGBA").resize((diameter, diameter), Image.Resampling.LANCZOS)
    mask = Image.new("L", (diameter, diameter), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, diameter - 1, diameter - 1), fill=255)
    result = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    # Add white border ring
    border_draw = ImageDraw.Draw(result)
    border_draw.ellipse(
        (1, 1, diameter - 2, diameter - 2),
        outline=(255, 255, 255, 255),
        width=3,
    )
    return result


def _compose_flyer(
    data: LineupData,
    formation: str,
    brand_primary_hex: str,
    tmp_dir: Path,
    closeup_style: str = "popout",
) -> str:
    """Core compositor: download assets, render with PIL, composite with FFmpeg."""

    is_badge = closeup_style == "badge"
    full_h = int(HEIGHT * FLYER_SCALE)

    # ── 1. Download background ─────────────────────────────────────────────
    bg_img = _download_image(data.field_background_url) if data.field_background_url else None
    if bg_img is None:
        bg_img = Image.new("RGB", (1920, 1080), "#228B22")
    bg_w, bg_h = bg_img.size
    bg_is_landscape = bg_w > bg_h  # only rotate if background is landscape
    bg_path = tmp_dir / "background.jpg"
    bg_img.convert("RGB").save(str(bg_path), "JPEG", quality=95)

    # ── 2. Generate header (shared with lineup video) ────────────────────
    from src.video.services.header_generator import render_header_pil

    header_img = render_header_pil(
        width=HEADER_WIDTH,
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
        background_color=brand_primary_hex,
    )
    header_path = tmp_dir / "header.png"
    # Flatten RGBA → RGB so no alpha artifacts appear.
    header_img.convert("RGB").save(str(header_path), "PNG")

    # ── 3. Download sponsor logo ───────────────────────────────────────────
    sponsor_img = _download_image(data.sponsor_url) if data.sponsor_url else None
    if sponsor_img is None:
        # Create transparent placeholder
        sponsor_img = Image.new("RGBA", (SPONSOR_W, 80), (0, 0, 0, 0))
    else:
        # Safety net: ensure any remaining background is transparent
        from src.generative.services.asset_pipeline import _strip_checkerboard

        sponsor_img = _strip_checkerboard(sponsor_img.convert("RGBA"))
        bbox = sponsor_img.getchannel("A").getbbox()
        if bbox:
            sponsor_img = sponsor_img.crop(bbox)
    sponsor_path = tmp_dir / "sponsor.png"
    sponsor_img.convert("RGBA").save(str(sponsor_path), "PNG")

    # ── 4. Split players into formation lines ──────────────────────────────
    keepers = data.keepers[:1]
    defenders = data.defenders
    midfielders = data.midfielders
    attackers = data.attackers

    phases = [
        ("keeper", keepers),
        ("defenders", defenders),
        ("midfielders", midfielders),
        ("attackers", attackers),
    ]

    # ── 5. Calculate positions and download player images ──────────────────
    @dataclass
    class RenderPlayer:
        path: Path
        x: float
        y: float
        name: str
        label_y_extra: int = 0
        label_x_extra: int = 0
        label_font_size: int | None = None

    render_players: list[RenderPlayer] = []

    role_map = {
        "keeper": "keeper",
        "defenders": "defender",
        "midfielders": "midfielder",
        "attackers": "attacker",
    }

    for group_name, group in phases:
        role = role_map.get(group_name, "midfielder")
        base_y = Y_POS.get(role, 0.5) + FLYER_Y_ADJUST.get(role, 0.0)
        xs = _get_x_positions(len(group), role)

        for idx, player in enumerate(group):
            # Download player image — badge uses closeup, popout uses kit
            if is_badge:
                img_url = player.closeup_url or player.kit_url
            else:
                img_url = player.kit_url or player.closeup_url

            player_img = None
            if img_url:
                player_img = _download_image(img_url)

            # Guest player: generate silhouette placeholder
            if player_img is None:
                from src.video.services.header_generator import generate_guest_silhouette

                logger.info(
                    "Using guest silhouette for %s (is_guest=%s)",
                    player.member_name,
                    getattr(player, "is_guest_player", False),
                )
                player_img = generate_guest_silhouette()

            # Badge mode: crop to circle
            if is_badge:
                player_img = _make_circle_badge(player_img, BADGE_SIZE)

            # Save to temp
            p_path = tmp_dir / f"player_{len(render_players)}.png"
            player_img.convert("RGBA").save(str(p_path), "PNG")

            x_t, y_t = _apply_formation_tweaks(
                formation,
                group_name,
                idx,
                xs[idx],
                base_y,
            )

            render_players.append(
                RenderPlayer(
                    path=p_path,
                    x=x_t,
                    y=y_t,
                    name=player.member_name,
                )
            )

    if not render_players:
        raise ValueError("No player images available to generate flyer")

    # ── 6. Calculate label positions (collision avoidance) ─────────────────
    label_w = int(HEIGHT * CLOSEUP_SCALE) + LABEL_EXTRA_W
    label_h = LABEL_HEIGHT

    # Get header height for safe zone
    header_safe_y = HEADER_HEIGHT + 6

    # Calculate player bounding rects using alpha bbox
    player_rects: list[tuple[float, float, float, float]] = []
    for rp in render_players:
        cx = WIDTH * rp.x
        y_bottom = HEIGHT * rp.y
        y_top = y_bottom - full_h

        try:
            with Image.open(rp.path) as im:
                ow, oh = im.size
                bbox = _get_alpha_bbox(im.convert("RGBA")) if im.mode in ("RGBA", "LA") else None
        except Exception:
            ow, oh = (1080, 1920)
            bbox = None

        scale = full_h / float(oh or 1)
        scaled_w = ow * scale

        if bbox:
            bl, bt, br, bb = bbox
            img_left = cx - scaled_w / 2
            x1 = img_left + bl * scale
            x2 = img_left + br * scale
            y1 = y_top + bt * scale
            y2 = y_top + bb * scale
        else:
            x1 = cx - scaled_w / 2
            x2 = cx + scaled_w / 2
            y1, y2 = y_top, y_bottom

        margin = 2
        player_rects.append((x1 - margin, y1 - margin, x2 + margin, y2 + margin))

    def _rects_intersect(a: tuple, b: tuple) -> bool:
        return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]

    # Label placement: always below, with collision avoidance
    step_px = 8
    max_nudge_px = 280
    bottom_margin = 6

    for i, rp in enumerate(render_players):
        cx = WIDTH * rp.x
        base_y_label = HEIGHT * rp.y + LABEL_GAP
        label_text = _surname_label(rp.name)
        base_font = min(LABEL_FONTSIZE, _adaptive_fontsize(label_text))

        chosen_offset = None
        chosen_dx = 0
        chosen_font = base_font

        for attempt in range(6):
            font_size = max(16, base_font - attempt * 4)
            cw, ch = _measure_label(label_text, font_size)

            max_down = min(int(HEIGHT - bottom_margin - base_y_label - ch), max_nudge_px)
            max_steps = max(0, max_down // step_px)

            dx_candidates = [0, -20, 20, -40, 40, -60, 60, -80, 80]
            candidates = [(0, 0)]
            for dx in dx_candidates[1:]:
                candidates.append((0, dx))
            for k in range(1, max_steps + 1):
                d = k * step_px
                for dx in dx_candidates:
                    candidates.append((d, dx))
            candidates.sort(key=lambda t: (t[0] + abs(t[1]), abs(t[1])))

            for dy, dx in candidates:
                ly1 = base_y_label + dy
                ly2 = ly1 + ch
                if ly1 < header_safe_y or ly2 > HEIGHT - bottom_margin:
                    continue
                cx2 = cx + dx
                if cx2 - cw / 2 < 0 or cx2 + cw / 2 > WIDTH:
                    continue
                label_rect = (cx2 - cw / 2, ly1, cx2 + cw / 2, ly2)
                collision = False
                for j, pr in enumerate(player_rects):
                    if j == i:
                        continue
                    if _rects_intersect(label_rect, pr):
                        collision = True
                        break
                if not collision:
                    chosen_offset = dy
                    chosen_dx = dx
                    chosen_font = font_size
                    break

            if chosen_offset is not None:
                break

        rp.label_y_extra = int(chosen_offset or 0)
        rp.label_x_extra = int(chosen_dx or 0)
        rp.label_font_size = chosen_font

    # ── 7. Render labels as PNGs ───────────────────────────────────────────
    label_paths: list[Path] = []
    for i, rp in enumerate(render_players):
        label_text = _surname_label(rp.name)
        font_size = rp.label_font_size or base_font
        label_img = _render_label_png(label_text, label_w, label_h, font_size)
        lp = tmp_dir / f"label_{i}.png"
        label_img.save(str(lp), "PNG")
        label_paths.append(lp)

    # ── 8. Build FFmpeg filter_complex ─────────────────────────────────────
    ffmpeg = _get_ffmpeg_path()
    out_path = tmp_dir / "flyer_output.png"

    cmd = [ffmpeg, "-y"]

    # Inputs: bg, header, sponsor, players..., labels...
    cmd += ["-loop", "1", "-i", str(bg_path)]
    cmd += ["-loop", "1", "-i", str(header_path)]
    cmd += ["-loop", "1", "-i", str(sponsor_path)]
    for rp in render_players:
        cmd += ["-loop", "1", "-i", str(rp.path)]
    for lp in label_paths:
        cmd += ["-loop", "1", "-i", str(lp)]

    # Filter graph — only rotate if background is landscape (raw upload)
    fc = []
    if bg_is_landscape:
        fc.append(f"[0:v]transpose=1,scale={WIDTH}:{HEIGHT}[field]")
    else:
        fc.append(f"[0:v]scale={WIDTH}:{HEIGHT}[field]")
    fc.append(f"[1:v]scale={WIDTH}:-1[header]")
    fc.append("[field][header]overlay=0:0[bg0]")

    # Sponsor box — light green background for visibility
    sponsor_box_w = SPONSOR_W + 2 * SPONSOR_PAD
    fc.append(
        f"[bg0]drawbox=x={SPONSOR_MARGIN}:y=ih-{SPONSOR_BOX_H}-{SPONSOR_MARGIN}"
        f":w={sponsor_box_w}:h={SPONSOR_BOX_H}:color=0x90EE90@0.85:t=fill[bg0b]"
    )
    fc.append(f"[2:v]scale={SPONSOR_W}:-1,format=rgba[sponsor]")
    fc.append(
        f"[bg0b][sponsor]overlay="
        f"({SPONSOR_MARGIN + SPONSOR_PAD}):(H-h-{SPONSOR_MARGIN + SPONSOR_PAD})"
        f":format=auto[bg0s]"
    )

    last_bg = "bg0s"
    base_idx = 3
    label_base_idx = base_idx + len(render_players)

    for i, rp in enumerate(render_players):
        in_idx = base_idx + i
        next_bg = f"bg_p{i}"
        if is_badge:
            # Badge: small circle, center on position
            fc.append(
                f"[{in_idx}:v]scale={BADGE_SIZE}:{BADGE_SIZE}[p{i}];"
                f"[{last_bg}][p{i}]overlay=(W*{rp.x}-{BADGE_SIZE // 2}):"
                f"(H*{rp.y}-{BADGE_SIZE // 2})[{next_bg}]"
            )
        else:
            # Popout: full-body, bottom aligned
            y_expr = f"(H*{rp.y}-{full_h})"
            fc.append(
                f"[{in_idx}:v]scale=-1:{full_h}[p{i}];"
                f"[{last_bg}][p{i}]overlay=(W*{rp.x}-w/2):{y_expr}[{next_bg}]"
            )

        # Label overlay
        l_idx = label_base_idx + i
        fc.append(f"[{l_idx}:v]scale={label_w}:{label_h}[lb_in{i}]")
        fc.append(f"[lb_in{i}]format=rgba[lb{i}]")
        name_bg = f"bg_n{i}"
        fc.append(
            f"[{next_bg}][lb{i}]overlay="
            f"(W*{rp.x}-w/2+{rp.label_x_extra}):"
            f"(H*{rp.y}+{LABEL_GAP}+{rp.label_y_extra})"
            f"[{name_bg}]"
        )
        last_bg = name_bg

    # ── Watermark overlay (bottom-right, semi-transparent) ─────────────────
    wm_idx = label_base_idx + len(render_players)
    if WATERMARK_PATH.exists():
        cmd += ["-loop", "1", "-i", str(WATERMARK_PATH)]
        fc.append(f"[{wm_idx}:v]format=rgba," f"colorchannelmixer=aa={WATERMARK_OPACITY}[wm]")
        fc.append(
            f"[{last_bg}][wm]overlay=" f"W-w-{WATERMARK_MARGIN}:H-h-{WATERMARK_MARGIN}" f"[bg_wm]"
        )
        last_bg = "bg_wm"

    fc.append(f"[{last_bg}]format=rgb24[out]")

    cmd += [
        "-filter_complex",
        ";".join(fc),
        "-map",
        "[out]",
        "-frames:v",
        "1",
        str(out_path),
    ]

    logger.info("Running FFmpeg for lineup flyer (%d players)", len(render_players))
    result = subprocess.run(cmd, capture_output=True, timeout=120, check=False)
    if result.returncode != 0:
        stderr = (result.stderr or b"").decode(errors="replace")[-3000:]
        logger.error("FFmpeg failed: %s", stderr)
        raise RuntimeError(f"FFmpeg failed to generate flyer: {stderr}")

    # ── 9. Upload to S3 ───────────────────────────────────────────────────
    return _upload_flyer(out_path, data.activity_id)


def _adaptive_fontsize(text: str) -> int:
    """Reduce font size for long names."""
    if len(text) > 18:
        return 24
    if len(text) > 14:
        return 28
    return LABEL_FONTSIZE


def _upload_flyer(file_path: Path, activity_id: str) -> str:
    """Upload generated flyer to S3 and return presigned URL."""
    try:
        from files.utils import get_storage_backend

        storage_path = f"generated/lineup/flyers/{activity_id}/{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()
        with open(file_path, "rb") as f:
            backend.save(storage_path, f)
        url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        logger.info("Uploaded lineup flyer to S3: %s", storage_path)
        return url

    except Exception as exc:
        logger.warning("Failed to upload flyer to S3: %s", exc)
        # Fallback: return local file path (dev only)
        return f"file://{file_path}"


# ── Convenience function ──────────────────────────────────────────────────


def build_lineup_flyer(
    activity_id: str,
    template_id: str | None = None,
    formation: str = "4-3-3",
    selected_member_ids: list[str] | None = None,
    brand_primary_hex: str | None = None,
    brand_secondary_hex: str | None = None,
    closeup_style: str = "popout",
    background_url: str | None = None,
) -> str:
    """Build a lineup flyer from activity data.

    High-level entry point that:
    1. Gathers data from DB via LineupSegmentBuilder
    2. Generates the flyer PNG
    3. Uploads to S3

    Args:
        activity_id: Match/activity UUID
        template_id: Optional ContentTemplate ID
        formation: Formation string
        selected_member_ids: Optional player IDs from frontend
        brand_primary_hex: Override brand primary color
        brand_secondary_hex: Override brand secondary color
        background_url: Override field background URL (app-level location)

    Returns:
        Presigned URL to the generated flyer PNG
    """
    from src.video.services.lineup_builder import LineupSegmentBuilder

    # 1. Gather data from DB (reuses the video builder's data layer)
    builder = LineupSegmentBuilder(
        activity_id=activity_id,
        template_id=template_id,
        output_resolution="vertical_1080p",
        selected_member_ids=selected_member_ids,
        formation=formation,
    )
    lineup_data = builder._gather_lineup_data()

    # Override field background if a specific URL was provided
    if background_url:
        lineup_data.field_background_url = background_url

    # 2. Resolve brand colors (from DB or defaults)
    if not brand_primary_hex:
        brand_primary_hex = _resolve_brand_color(activity_id, "primary") or "#D2122E"
    if not brand_secondary_hex:
        brand_secondary_hex = _resolve_brand_color(activity_id, "secondary") or "#FFFFFF"

    # 3. Generate
    return generate_lineup_flyer(
        data=lineup_data,
        formation=formation,
        brand_primary_hex=brand_primary_hex,
        brand_secondary_hex=brand_secondary_hex,
        closeup_style=closeup_style,
    )


def _resolve_brand_color(activity_id: str, color_key: str) -> str | None:
    """Look up brand color from the project's BrandProfile."""
    try:
        from django.apps import apps

        Activity = apps.get_model("activities", "Activity")
        BrandProfile = apps.get_model("branding", "BrandProfile")

        activity = Activity.objects.select_related("project__parent_project").get(id=activity_id)
        project = activity.project

        # Try team brand first, then club brand
        for proj in [project, project.parent_project]:
            if not proj:
                continue
            brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()  # {key: value} dict from DesignToken rows
                value = tokens.get(f"{color_key}_color") or tokens.get(color_key)
                if value:
                    return value
        # Fallback: check organisation-level brand
        org = getattr(project, "organisation", None)
        if org:
            brand = BrandProfile.objects.filter(organisation=org, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                value = tokens.get(f"{color_key}_color") or tokens.get(color_key)
                if value:
                    return value
        return None
    except Exception:  # noqa: BLE001
        return None

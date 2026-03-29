"""Lineup Video Composer — Production port of local_lineup_test/build_lineup.py.

Creates a formation-based lineup announcement video with:
- Per-phase player reveals (keeper → defense → midfield → attack)
- Slide-up fullbody animation
- Intro video overlays (WebM with alpha)
- Crossfade transition from fullbody to closeup badge
- Persistent closeup badges that accumulate across phases
- Header overlay with club logos, match info
- Sponsor box overlay
- Final hold frame showing all badges

All assets are downloaded from S3 presigned URLs to a local temp dir.
FFmpeg compositing produces per-phase clips, then concat demuxer joins them.
"""

from __future__ import annotations

import logging
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from PIL import Image

from src.video.services._common import (
    CANVAS_FPS,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    HEADER_HEIGHT,
    SPONSOR_BOX_H,
    SPONSOR_MARGIN,
    SPONSOR_PAD,
    download_file,
    get_ffmpeg_path,
    resolve_brand_color,
    resolve_ffmpeg_font_path,
    run_ffmpeg,
)

if TYPE_CHECKING:
    from src.video.services.lineup_builder import LineupData

logger = logging.getLogger(__name__)


# ── Aliases for backward compat ──
_get_ffmpeg_path = get_ffmpeg_path

# ── Video / canvas settings ──
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT
FPS = CANVAS_FPS

# ── Player sizing ──
PLAYER_SCALE_FULLBODY = 0.28  # fraction of HEIGHT
PLAYER_SCALE_CLOSEUP = 0.11  # 11% of HEIGHT
PLAYER_SCALE_SOLO = 0.45  # fraction of HEIGHT — solo "per player" mode

# ── Badge style ──
BADGE_CUT_FRACTION = 0.25
BADGE_SHIFT_PX = 28
BADGE_FILL_COLOR = "#90EE90"
BADGE_ZOOM_POPOUT = 1.3
BADGE_BODY_OFFSET_POPOUT = 35
BADGE_ZOOM_INSIDE = 1.25
BADGE_BODY_OFFSET_INSIDE = -60
BADGE_HEAD_FRAC = 0.45

# ── Badge name label ──
BADGE_LABEL_FONTSIZE = 36
BADGE_LABEL_H = 52
BADGE_LABEL_GAP = 4
BADGE_LABEL_EXTRA_W = 60
BADGE_LABEL_BG = "white"
BADGE_LABEL_TEXT_COLOR = "black"

# ── Sponsor box (from _common) ──

# ── Watermark ──
WATERMARK_PATH = Path(__file__).resolve().parent.parent / "assets" / "watermark.png"
WATERMARK_OPACITY = 0.25  # 25% opacity
WATERMARK_MARGIN = 30  # px from edge

# ── Closeup vertical shifts (per role) ──
CLOSEUP_SHIFT_DEFENDER_PCT = 0.03
CLOSEUP_SHIFT_MIDFIELDER_PCT = 0.04
CLOSEUP_SHIFT_ATTACKER_PCT = -0.02
KEEPER_CLOSEUP_FIELD_Y_SHIFT_PCT = 0.06

# ── Row-4 stagger ──
ROW4_STAGGER_PCT = 0.015
CLOSEUP_ROW4_STAGGER_PCT = 0.02

# ── Formation Y positions (%) ──
Y_POS = {
    "coach": 70,
    "keeper": 97,
    "defender": 80,
    "midfielder": 57,
    "attacker": 40,
}


_resolve_font_path = resolve_ffmpeg_font_path
FONT_PATH = resolve_ffmpeg_font_path()


# ─────────────────────────────────────────────────────────────────
# Helper functions (ported from build_lineup.py)
# ─────────────────────────────────────────────────────────────────


_download_file = download_file
_resolve_brand_color = resolve_brand_color


def _generate_circle_mask(size: int, dest: Path) -> None:
    """Generate a white circle on black background (mask for badges)."""
    img = Image.new("L", (size, size), 0)
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size - 1, size - 1], fill=255)
    img.save(str(dest))


def _generate_circle_border(size: int, dest: Path, border_width: int = 6) -> None:
    """Generate a circle border (RGBA) for badge outlines."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size - 1, size - 1], outline=(255, 255, 255, 255), width=border_width)
    img.save(str(dest))


def get_x_positions(count: int) -> list[float]:
    if count == 1:
        return [0.5]
    if count == 4:
        return [0.11, 0.36, 0.64, 0.89]
    margin = 0.15
    effective = 1.0 - 2 * margin
    step = effective / (count - 1)
    return [margin + step * i for i in range(count)]


def get_x_positions_for_group(count: int, role: str, formation: str) -> list[float]:
    if formation == "4-4-2" and role == "attacker" and count == 2:
        return [0.33, 0.67]
    return get_x_positions(count)


def get_y_stagger_offsets(count: int, amount: float = ROW4_STAGGER_PCT) -> list[float]:
    if count == 4:
        return [-amount, amount, amount, -amount]
    return [0.0] * count


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def closeup_y_for_role(role: str, fullbody_y: float) -> float:
    shifts = {
        "keeper": KEEPER_CLOSEUP_FIELD_Y_SHIFT_PCT,
        "defender": CLOSEUP_SHIFT_DEFENDER_PCT,
        "midfielder": CLOSEUP_SHIFT_MIDFIELDER_PCT,
        "attacker": CLOSEUP_SHIFT_ATTACKER_PCT,
    }
    return clamp01(fullbody_y + shifts.get(role, 0.0))


def fullbody_scale_for_role(role: str) -> float:
    return 0.34 if role == "coach" else PLAYER_SCALE_FULLBODY


def ffmpeg_escape(text: str) -> str:
    return text.replace("'", "").replace("\\", "\\\\").replace(":", "\\:")


def surname_only(name: str) -> str:
    parts = [p for p in name.split() if p]
    return " ".join(parts[1:]) if len(parts) > 1 else name


def split_two_lines(name: str) -> str:
    words = [w for w in name.split() if w]
    if len(words) <= 1:
        return name
    best_idx, best_score = 1, 10**9
    for idx in range(1, len(words)):
        score = max(len(" ".join(words[:idx])), len(" ".join(words[idx:])))
        if score < best_score:
            best_score = score
            best_idx = idx
    return "\\n".join([" ".join(words[:best_idx]), " ".join(words[best_idx:])])


def fullbody_label(name: str, role: str, count: int) -> str:  # noqa: ARG001
    safe = ffmpeg_escape(surname_only(name).upper())
    if len(safe) >= 16:
        safe = split_two_lines(safe)
    if role == "coach":
        return f"Coach\\: {safe}"
    return safe


def _max_line_len(t: str) -> int:
    return max((len(p) for p in t.split("\\n")), default=0)


def fullbody_fontsize(role: str, count: int, label: str) -> int:
    if role == "coach":
        return 56
    base = 42
    if count >= 4:
        base = 32
    elif count == 3:
        base = 36
    if "\\n" in label:
        base -= 2
    ml = _max_line_len(label)
    if ml >= 18:
        base -= 2
    if ml >= 22:
        base -= 2
    return max(26, base)


def text_x_expr(x_pct: float) -> str:
    return f"'max(0,min(w-text_w,w*{x_pct}-text_w/2))'"


def closeup_label(name: str) -> str:
    safe = ffmpeg_escape(surname_only(name).upper())
    if len(safe) >= 16:
        safe = split_two_lines(safe)
    return safe


def closeup_fontsize(label: str) -> int:
    base = 32
    if "\\n" in label:
        base = 28
    ml = _max_line_len(label)
    if ml >= 18:
        base -= 1
    if ml >= 22:
        base -= 1
    return max(24, base)


def role_from_group(name: str) -> str:
    return name[:-1] if name.endswith("s") else name


# ─────────────────────────────────────────────────────────────────
# Badge generator (FFmpeg filter_complex fragment)
# ─────────────────────────────────────────────────────────────────


def _badge_filter(
    fc: list[str],
    uid: str,
    input_idx: int,
    mask_idx: int,
    border_idx: int,
    x_pct: float,
    y_pct: float,
    name: str,
    prev_bg: str,
    circle_size: int,
    popout: bool = True,
) -> str:
    """Append filter commands for one player badge. Return new bg label."""
    cutoff_h = int(circle_size * BADGE_CUT_FRACTION)
    visible_h = circle_size - cutoff_h
    shift = BADGE_SHIFT_PX
    total_h = circle_size + shift
    zoom = BADGE_ZOOM_POPOUT if popout else BADGE_ZOOM_INSIDE
    body_off = BADGE_BODY_OFFSET_POPOUT if popout else BADGE_BODY_OFFSET_INSIDE

    # Flat-bottom mask
    fc.append(f"[{mask_idx}:v]scale={circle_size}:{circle_size},format=gray,setsar=1[mb_{uid}]")
    fc.append(f"[mb_{uid}]crop={circle_size}:{visible_h}:0:0,format=gray[mc_{uid}]")
    fc.append(f"color=c=black:s={circle_size}x{circle_size},format=gray[mcv_{uid}]")
    fc.append(f"[mcv_{uid}][mc_{uid}]overlay=0:0,format=gray[mf_{uid}]")
    fc.append(f"[mf_{uid}]split=2[ma_{uid}][mff_{uid}]")

    # Flat-bottom border
    fc.append(f"[{border_idx}:v]scale={circle_size}:{circle_size},format=rgba,setsar=1[bb_{uid}]")
    fc.append(f"[bb_{uid}]crop={circle_size}:{visible_h}:0:0,format=rgba[bc_{uid}]")
    fc.append(f"color=c=black@0:s={circle_size}x{circle_size},format=rgba[bcv_{uid}]")
    fc.append(f"[bcv_{uid}][bc_{uid}]overlay=0:0,format=rgba[bf_{uid}]")

    # Player source
    sw = int(circle_size * zoom)
    fc.append(
        f"[{input_idx}:v]scale={sw}:{sw}:force_original_aspect_ratio=increase,"
        f"format=rgba,setsar=1[ps_{uid}]"
    )
    fc.append(f"[ps_{uid}]crop={circle_size}:{total_h}:(iw-ow)/2:0.0[psrc_{uid}]")

    if popout:
        fc.append(f"[psrc_{uid}]split=2[pbs_{uid}][phs_{uid}]")
        bcy = max(0, min(shift + body_off, total_h - circle_size))
        fc.append(f"[pbs_{uid}]crop={circle_size}:{circle_size}:0:{bcy}[pbr_{uid}]")
    else:
        eff = shift + body_off
        pad_top = max(0, int(-eff) + 40) if eff < 0 else 0
        if pad_top > 0:
            fc.append(
                f"[psrc_{uid}]pad=iw:ih+{pad_top}:0:{pad_top}:color=black@0,"
                f"format=rgba[pbs_{uid}]"
            )
        else:
            fc.append(f"[psrc_{uid}]null[pbs_{uid}]")
        bcy = max(0, shift + body_off + pad_top)
        fc.append(f"[pbs_{uid}]crop={circle_size}:{circle_size}:0:{bcy}[pbr_{uid}]")

    # Alpha multiplication
    fc.append(f"[pbr_{uid}]split=2[prgb_{uid}][paf_{uid}]")
    fc.append(f"[paf_{uid}]alphaextract,format=gray[pa_{uid}]")
    fc.append(f"[pa_{uid}][ma_{uid}]blend=all_mode=multiply:all_opacity=1,format=gray[pam_{uid}]")
    fc.append(f"[prgb_{uid}][pam_{uid}]alphamerge[pmsk_{uid}]")

    # Fill + border + canvas
    fc.append(f"color=c={BADGE_FILL_COLOR}@1:s={circle_size}x{circle_size},format=rgba[fl_{uid}]")
    fc.append(f"[fl_{uid}][mff_{uid}]alphamerge[fls_{uid}]")
    fc.append(f"[fls_{uid}][pmsk_{uid}]overlay=0:0,format=rgba[pwf_{uid}]")
    fc.append(f"[pwf_{uid}][bf_{uid}]overlay=0:0,format=rgba[prd_{uid}]")

    fc.append(f"color=c=black@0:s={circle_size}x{total_h},format=rgba[cv_{uid}]")
    fc.append(f"[cv_{uid}][prd_{uid}]overlay=0:{shift},format=rgba[cvb_{uid}]")

    if popout:
        popout_h = int(shift + circle_size * BADGE_HEAD_FRAC)
        fc.append(f"[phs_{uid}]crop={circle_size}:{popout_h}:0:0[phc_{uid}]")
        fc.append(f"[cvb_{uid}][phc_{uid}]overlay=0:0,format=rgba[pfin_{uid}]")
    else:
        fc.append(f"[cvb_{uid}]copy,format=rgba[pfin_{uid}]")

    # Overlay on field
    next_bg = f"bg_{uid}"
    fc.append(f"[{prev_bg}][pfin_{uid}]overlay=" f"(W*{x_pct}-w/2):(H*{y_pct}-h)[{next_bg}]")

    # Name label
    lbl = closeup_label(name)
    fs = min(BADGE_LABEL_FONTSIZE, closeup_fontsize(lbl))
    label_w = circle_size + BADGE_LABEL_EXTRA_W
    lx = f"({WIDTH}*{x_pct}-{label_w // 2})"
    ly = f"({HEIGHT}*{y_pct}-{cutoff_h}+{BADGE_LABEL_GAP})"
    name_bg = f"bg_n_{uid}"
    fc.append(
        f"[{next_bg}]"
        f"drawbox=x={lx}:y={ly}:w={label_w}:h={BADGE_LABEL_H}:"
        f"color={BADGE_LABEL_BG}:t=fill,"
        f"drawtext=fontfile='{FONT_PATH}':text='{lbl}':"
        f"fontcolor={BADGE_LABEL_TEXT_COLOR}:fontsize={fs}:"
        f"x={lx}+({label_w}-text_w)/2:"
        f"y={ly}+({BADGE_LABEL_H}-text_h)/2"
        f"[{name_bg}]"
    )
    return name_bg


def _render_badge_body_png(
    src_path: Path,
    mask_path: Path,
    border_path: Path,
    out_path: Path,
    circle_size: int,
    popout: bool = True,
) -> None:
    """Render a badge *body* (no name label) to a transparent PNG.

    This is an optimisation: the full badge mask pipeline is expensive. We render
    it once per player closeup and then just overlay the PNG in phase filters.
    """

    cutoff_h = int(circle_size * BADGE_CUT_FRACTION)
    visible_h = circle_size - cutoff_h
    shift = BADGE_SHIFT_PX
    total_h = circle_size + shift
    zoom = BADGE_ZOOM_POPOUT if popout else BADGE_ZOOM_INSIDE
    body_off = BADGE_BODY_OFFSET_POPOUT if popout else BADGE_BODY_OFFSET_INSIDE
    sw = int(circle_size * zoom)

    # Inputs: 0=mask, 1=border, 2=player closeup
    filters: list[str] = []
    filters.append(f"[0:v]scale={circle_size}:{circle_size},format=gray,setsar=1[mb]")
    filters.append(f"[mb]crop={circle_size}:{visible_h}:0:0,format=gray[mc]")
    filters.append(f"color=c=black:s={circle_size}x{circle_size},format=gray[mcv]")
    filters.append("[mcv][mc]overlay=0:0,format=gray[mf]")
    filters.append("[mf]split=2[ma][mff]")

    filters.append(f"[1:v]scale={circle_size}:{circle_size},format=rgba,setsar=1[bb]")
    filters.append(f"[bb]crop={circle_size}:{visible_h}:0:0,format=rgba[bc]")
    filters.append(f"color=c=black@0:s={circle_size}x{circle_size},format=rgba[bcv]")
    filters.append("[bcv][bc]overlay=0:0,format=rgba[bf]")

    filters.append(
        f"[2:v]scale={sw}:{sw}:force_original_aspect_ratio=increase," f"format=rgba,setsar=1[ps]"
    )
    filters.append(f"[ps]crop={circle_size}:{total_h}:(iw-ow)/2:0.0[psrc]")

    if popout:
        bcy = max(0, min(shift + body_off, total_h - circle_size))
        popout_h = int(shift + circle_size * BADGE_HEAD_FRAC)
        filters.append("[psrc]split=2[pbs][phs]")
        filters.append(f"[pbs]crop={circle_size}:{circle_size}:0:{bcy}[pbr]")
        filters.append(f"[phs]crop={circle_size}:{popout_h}:0:0[phc]")
    else:
        eff = shift + body_off
        pad_top = max(0, int(-eff) + 40) if eff < 0 else 0
        if pad_top > 0:
            filters.append(f"[psrc]pad=iw:ih+{pad_top}:0:{pad_top}:color=black@0,format=rgba[pbs]")
        else:
            filters.append("[psrc]null[pbs]")
        bcy = max(0, shift + body_off + pad_top)
        filters.append(f"[pbs]crop={circle_size}:{circle_size}:0:{bcy}[pbr]")

    filters.append("[pbr]split=2[prgb][paf]")
    filters.append("[paf]alphaextract,format=gray[pa]")
    filters.append("[pa][ma]blend=all_mode=multiply:all_opacity=1,format=gray[pam]")
    filters.append("[prgb][pam]alphamerge[pmsk]")

    filters.append(f"color=c={BADGE_FILL_COLOR}@1:s={circle_size}x{circle_size},format=rgba[fl]")
    filters.append("[fl][mff]alphamerge[fls]")
    filters.append("[fls][pmsk]overlay=0:0,format=rgba[pwf]")
    filters.append("[pwf][bf]overlay=0:0,format=rgba[prd]")

    filters.append(f"color=c=black@0:s={circle_size}x{total_h},format=rgba[cv]")
    filters.append(f"[cv][prd]overlay=0:{shift},format=rgba[cvb]")

    if popout:
        filters.append("[cvb][phc]overlay=0:0,format=rgba[out]")
    else:
        filters.append("[cvb]copy,format=rgba[out]")

    cmd = [
        _get_ffmpeg_path(),
        "-y",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-filter_complex_threads",
        "1",
        "-loop",
        "1",
        "-i",
        str(mask_path),
        "-loop",
        "1",
        "-i",
        str(border_path),
        "-loop",
        "1",
        "-i",
        str(src_path),
        "-filter_complex",
        ";".join(filters),
        "-map",
        "[out]",
        "-frames:v",
        "1",
        "-pix_fmt",
        "rgba",
        str(out_path),
    ]
    _run_ffmpeg(cmd, f"Render badge body: {src_path.name}")


# ─────────────────────────────────────────────────────────────────
# Asset downloader
# ─────────────────────────────────────────────────────────────────


@dataclass
class _LocalPlayer:
    """Player with local file paths (after downloading from S3)."""

    name: str
    role: str  # keeper / defender / midfielder / attacker / coach
    fullbody: Path | None
    closeup: Path | None
    intro: Path | None


def _download_player_assets(
    players: list,  # PlayerSegment
    role: str,
    asset_dir: Path,
) -> list[_LocalPlayer]:
    """Download player assets for one formation line."""
    result = []
    for idx, p in enumerate(players):
        prefix = f"{role}_{idx}"
        fullbody = closeup = intro = None

        if p.kit_url:
            dest = asset_dir / f"{prefix}_fullbody.png"
            if _download_file(p.kit_url, dest):
                fullbody = dest
            else:
                logger.warning(
                    "Failed to download fullbody for %s: %s", p.member_name, p.kit_url[:120]
                )

        if p.closeup_url:
            dest = asset_dir / f"{prefix}_closeup.png"
            if _download_file(p.closeup_url, dest):
                closeup = dest
            else:
                logger.warning(
                    "Failed to download closeup for %s: %s", p.member_name, p.closeup_url[:120]
                )

        if p.intro_url:
            intro_lower = p.intro_url.lower()
            if ".mov" in intro_lower:
                ext = ".mov"
            elif ".webm" in intro_lower:
                ext = ".webm"
            else:
                ext = ".mp4"
            dest = asset_dir / f"{prefix}_intro{ext}"
            if _download_file(p.intro_url, dest):
                intro = dest
            else:
                logger.warning(
                    "Failed to download intro for %s: %s", p.member_name, p.intro_url[:120]
                )

        if not fullbody and not closeup:
            # Guest player: generate silhouette placeholder
            from src.video.services.header_generator import generate_guest_silhouette

            logger.info(
                "Generating guest silhouette for %s (%s) — no visual assets available",
                p.member_name,
                role,
            )
            dest = asset_dir / f"{prefix}_fullbody.png"
            silhouette = generate_guest_silhouette()
            silhouette.save(str(dest), "PNG")
            fullbody = dest

        result.append(
            _LocalPlayer(
                name=p.member_name,
                role=role,
                fullbody=fullbody,
                closeup=closeup,
                intro=intro,
            )
        )
    return result


# ─────────────────────────────────────────────────────────────────
# Phase composer (one line of the formation)
# ─────────────────────────────────────────────────────────────────


def _get_animation_expr(
    animation_style: str,
    ty: str,
    tx: str,
    active_x: float,
) -> tuple[str, str, str]:
    """Generate FFmpeg expressions for player animation.

    Args:
        animation_style: One of 'slide_up', 'appear', 'slide_in', 'zoom', 'fade'
        ty: The target y position expression (e.g., '(main_h*0.5-height)')
        tx: The target x position expression (e.g., '(W*0.5-w/2)')
        active_x: The x-position ratio (0-1) used to determine slide direction

    Returns:
        Tuple of (y_expression, x_expression, extra_filter).
        extra_filter is appended after the scale filter (e.g. fade for 'fade' style).
    """
    anim_dur = 2.2  # seconds

    if animation_style == "appear":
        return (f"'{ty}'", tx, "")
    elif animation_style == "slide_in":
        # Slide from edges; centre players (x ≈ 0.5) slide from bottom instead
        is_center = abs(active_x - 0.5) < 0.01
        if is_center:
            ye = f"'{ty} + (main_h - {ty}) * (1 - min(t/{anim_dur}, 1))'"
            return (ye, tx, "")
        elif active_x < 0.5:
            xe = f"'-w + ({tx} + w) * min(t/{anim_dur}, 1)'"
        else:
            xe = f"'W + ({tx} - W) * min(t/{anim_dur}, 1)'"
        return (f"'{ty}'", xe, "")
    elif animation_style == "fade":
        # Actual fade-in via alpha channel
        return (f"'{ty}'", tx, f",fade=in:st=0:d={anim_dur}:alpha=1")
    else:
        # Default: slide_up - slide from bottom
        ye = f"'{ty} + (main_h - {ty}) * (1 - min(t/{anim_dur}, 1))'"
        return (ye, tx, "")


def _get_label_animation_expr(
    animation_style: str,
    active_x: float,
    x_pct: float,
    ty_t: str,
    fh: int,
) -> tuple[str, str, str]:
    """Generate FFmpeg expressions for label animation matching player motion.

    Returns:
        Tuple of (txt_x, txt_y, txt_alpha) for drawtext.
    """
    anim_dur = 2.2
    target_y = f"({ty_t}) + {fh} + 10"
    target_x = text_x_expr(x_pct)

    if animation_style == "appear":
        return (target_x, f"'{target_y}'", "1")
    elif animation_style == "slide_in":
        is_center = abs(active_x - 0.5) < 0.01
        if is_center:
            # Centre player slides from bottom
            ys = f"{ty_t} + (h - {ty_t}) * (1 - min(t/{anim_dur}, 1))"
            return (target_x, f"'({ys}) + {fh} + 10'", "1")
        elif active_x < 0.5:
            # Label slides from left edge
            txt_xe = f"'-text_w + (w*{x_pct} - text_w/2 + text_w) * min(t/{anim_dur}, 1)'"
            return (txt_xe, f"'{target_y}'", "1")
        else:
            # Label slides from right edge
            txt_xe = f"'w + (w*{x_pct} - text_w/2 - w) * min(t/{anim_dur}, 1)'"
            return (txt_xe, f"'{target_y}'", "1")
    elif animation_style == "fade":
        return (target_x, f"'{target_y}'", f"'min(t/{anim_dur},1)'")
    else:
        # Default: slide_up — label slides up with the player
        ys = f"{ty_t} + (h - {ty_t}) * (1 - min(t/{anim_dur}, 1))"
        return (target_x, f"'({ys}) + {fh} + 10'", "1")


_run_ffmpeg = run_ffmpeg


def _compose_phase(
    phase_idx: int,
    group_name: str,
    active_players: list[_LocalPlayer],
    persistent_players: list[dict],
    bg_path: Path,
    header_path: Path,
    sponsor_path: Path | None,
    mask_path: Path,
    border_path: Path,
    tmp_dir: Path,
    formation: str,
    popout: bool = True,
    animation_style: str = "slide_up",
    bg_is_landscape: bool = True,
    solo_mode: bool = False,
    badge_xs: list[float] | None = None,
    badge_ys: list[float] | None = None,
) -> list[Path] | None:
    """Generate clips for one phase (e.g. 'defenders').

    Args:
        solo_mode: If True, render a single player centered and larger on screen.
        badge_xs: Target X positions for the closeup badge (formation spot).
            Defaults to active_xs if not provided.
        badge_ys: Target Y positions for the closeup badge (formation spot).
            Defaults to closeup_ys if not provided.
    """
    role = role_from_group(group_name)
    active_y = Y_POS.get(role, 50) / 100.0
    active_xs = get_x_positions_for_group(len(active_players), role, formation)
    y_offsets = get_y_stagger_offsets(len(active_players))
    active_ys = [clamp01(active_y + off) for off in y_offsets]

    # Solo mode: centre single player and scale up
    if solo_mode:
        active_xs = [0.5]
        active_ys = [0.60]

    closeup_base = closeup_y_for_role(role, active_y)
    cu_offsets = get_y_stagger_offsets(len(active_players), CLOSEUP_ROW4_STAGGER_PCT)
    closeup_ys = [clamp01(closeup_base + off) for off in cu_offsets]

    # Final badge positions (formation spots). Default to active/closeup if not overridden.
    badge_xs = badge_xs or list(active_xs)
    badge_ys = badge_ys or list(closeup_ys)

    circle_size = int(HEIGHT * PLAYER_SCALE_CLOSEUP)
    if circle_size % 2 != 0:
        circle_size += 1

    # ── Common inputs ──
    input_args: list[str] = ["-loop", "1", "-i", str(bg_path)]
    input_args += ["-loop", "1", "-i", str(header_path)]
    input_args += ["-loop", "1", "-i", str(mask_path)]
    input_args += ["-loop", "1", "-i", str(border_path)]

    # Sponsor logo overlay (bottom-left of the full video). Keep input index 4 stable.
    if sponsor_path:
        input_args += ["-loop", "1", "-i", str(sponsor_path)]
    else:
        input_args += ["-f", "lavfi", "-i", "color=c=black@0:s=1x1:r=1,format=rgba"]

    persist_start = 5

    for pp in persistent_players:
        badge_path = pp.get("badge_body") or pp.get("path")
        if not badge_path:
            raise ValueError("Persistent player missing badge_body/path")
        input_args += ["-loop", "1", "-i", str(badge_path)]

    # ── Base filter chain ──
    fc: list[str] = []
    fc.append(f"color=c=white:s={WIDTH}x{HEIGHT}:r={FPS}[base]")
    fc.append(f"[1:v]scale={WIDTH}:-1[header]")
    # Only rotate if background is landscape (raw upload); portrait backgrounds are already correct
    if bg_is_landscape:
        fc.append(f"[0:v]transpose=1,scale={WIDTH}:{HEIGHT - HEADER_HEIGHT}[field]")
    else:
        fc.append(f"[0:v]scale={WIDTH}:{HEIGHT - HEADER_HEIGHT}[field]")
    fc.append("[base][header]overlay=0:0[b1]")
    fc.append(f"[b1][field]overlay=0:{HEADER_HEIGHT}[bg0]")

    last_bg = "bg0"
    if sponsor_path:
        sponsor_w = int(WIDTH * 0.22)
        sponsor_box_w = sponsor_w + 2 * SPONSOR_PAD
        # Light green background box behind sponsor for visibility
        fc.append(
            f"[{last_bg}]drawbox="
            f"x={SPONSOR_MARGIN}:y=ih-{SPONSOR_BOX_H}-{SPONSOR_MARGIN}"
            f":w={sponsor_box_w}:h={SPONSOR_BOX_H}"
            f":color=0x90EE90@0.85:t=fill[bg0b]"
        )
        # Ensure we keep alpha when scaling the PNG.
        fc.append(f"[4:v]scale={sponsor_w}:-1,format=rgba[sponsor]")
        fc.append(
            f"[bg0b][sponsor]overlay="
            f"({SPONSOR_MARGIN + SPONSOR_PAD}):(main_h-h-{SPONSOR_MARGIN + SPONSOR_PAD})"
            f":format=auto[bg_sponsor]"
        )
        last_bg = "bg_sponsor"

    # Persistent badges (pre-rendered body + cheap overlay + label)
    cutoff_h = int(circle_size * BADGE_CUT_FRACTION)
    label_w = circle_size + BADGE_LABEL_EXTRA_W
    for i, pp in enumerate(persistent_players):
        idx = persist_start + i
        next_bg = f"bg_persist_{i}"
        fc.append(f"[{last_bg}][{idx}:v]overlay=(W*{pp['x']}-w/2):(H*{pp['y']}-h)[{next_bg}]")

        lbl = closeup_label(pp["name"])
        fs = min(BADGE_LABEL_FONTSIZE, closeup_fontsize(lbl))
        lx = f"({WIDTH}*{pp['x']}-{label_w // 2})"
        ly = f"({HEIGHT}*{pp['y']}-{cutoff_h}+{BADGE_LABEL_GAP})"
        name_bg = f"bg_persist_n_{i}"
        fc.append(
            f"[{next_bg}]"
            f"drawbox=x={lx}:y={ly}:w={label_w}:h={BADGE_LABEL_H}:"
            f"color={BADGE_LABEL_BG}:t=fill,"
            f"drawtext=fontfile='{FONT_PATH}':text='{lbl}':"
            f"fontcolor={BADGE_LABEL_TEXT_COLOR}:fontsize={fs}:"
            f"x={lx}+({label_w}-text_w)/2:"
            f"y={ly}+({BADGE_LABEL_H}-text_h)/2"
            f"[{name_bg}]"
        )
        last_bg = name_bg

    # Ensure RGBA base so alpha-bearing overlays (intro WebM) composite correctly.
    fc.append(f"[{last_bg}]format=rgba[bg]")
    base_filter = ";".join(fc) + ";"
    base_cnt = persist_start + len(persistent_players)
    is_coach = role == "coach"
    scale_full = PLAYER_SCALE_SOLO if solo_mode else fullbody_scale_for_role(role)

    # ── Part 1: Fullbody slide-up (3 s) ──
    part1 = tmp_dir / f"phase_{phase_idx}_1_full.mp4"
    cmd1 = [
        _get_ffmpeg_path(),
        "-y",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-filter_complex_threads",
        "1",
    ] + input_args
    f1 = base_filter

    actual_inp1 = base_cnt
    for i, p in enumerate(active_players):
        path = p.fullbody or p.closeup
        if not path:
            raise ValueError(
                f"Phase {phase_idx} player {i} ({p.name}) has no fullbody or closeup asset. "
                f"Cannot compose lineup — all players must have visual assets."
            )
        inp = actual_inp1
        actual_inp1 += 1
        cmd1 += ["-loop", "1", "-i", str(path)]
        fh = int(HEIGHT * scale_full)
        ty = f"(main_h*{active_ys[i]}-{fh})"
        tx = f"(W*{active_xs[i]}-w/2)"
        ye, xe, extra_filt = _get_animation_expr(animation_style, ty, tx, active_xs[i])
        f1 += f"[{inp}:v]scale=-1:{fh}{extra_filt}[act{i}];"
        f1 += f"[bg][act{i}]overlay={xe}:{ye}[bg_tmp{i}];"
        lbl = fullbody_label(p.name, role, len(active_players))
        ty_t = f"(h*{active_ys[i]}-{fh})"
        txt_x, txt_y, txt_alpha = _get_label_animation_expr(
            animation_style,
            active_xs[i],
            active_xs[i],
            ty_t,
            fh,
        )
        fs = fullbody_fontsize(role, len(active_players), lbl)
        f1 += (
            f"[bg_tmp{i}]drawtext=fontfile='{FONT_PATH}':text='{lbl}':"
            f"fontcolor=black:fontsize={fs}:x={txt_x}:y={txt_y}:"
            f"alpha={txt_alpha}:"
            f"box=1:boxcolor=white@1:boxborderw=10[bg];"
        )

    f1 += "[bg]format=yuv420p[out]"
    cmd1 += [
        "-filter_complex",
        f1,
        "-map",
        "[out]",
        "-t",
        "3",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        str(part1),
    ]
    _run_ffmpeg(cmd1, f"Phase {phase_idx} Part 1 (Fullbody)")

    # ── Part 2: Intros (variable) ──
    part2 = tmp_dir / f"phase_{phase_idx}_2_intro.mp4"
    cmd2 = [
        _get_ffmpeg_path(),
        "-y",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-filter_complex_threads",
        "1",
    ] + input_args
    f2 = base_filter

    actual_inp2 = base_cnt
    for i, p in enumerate(active_players):
        fh = int(HEIGHT * scale_full)
        oy = f"(main_h*{active_ys[i]}-{fh})"
        ny_expr = f"({oy}+{fh}+10)"

        if p.intro:
            inp = actual_inp2
            actual_inp2 += 1
            cmd2 += ["-i", str(p.intro)]
            # Intro videos can be VP9 WebM with alpha — keep alpha through the chain.
            f2 += f"[{inp}:v]scale=-1:{fh},format=rgba[act{i}];"
            f2 += f"[bg][act{i}]overlay=(W*{active_xs[i]}-w/2):{oy}:eof_action=pass[bg_tmp{i}];"
        else:
            path = p.fullbody or p.closeup
            if not path:
                raise ValueError(
                    f"Phase {phase_idx} player {i} ({p.name}) has no intro, fullbody, or closeup asset. "
                    f"Cannot compose intro phase — all players must have visual assets."
                )
            inp = actual_inp2
            actual_inp2 += 1
            cmd2 += ["-loop", "1", "-i", str(path)]
            f2 += f"[{inp}:v]scale=-1:{fh},format=rgba[act{i}];"
            f2 += f"[bg][act{i}]overlay=(W*{active_xs[i]}-w/2):{oy}[bg_tmp{i}];"

        lbl = fullbody_label(p.name, role, len(active_players))
        fs = fullbody_fontsize(role, len(active_players), lbl)
        f2 += (
            f"[bg_tmp{i}]drawtext=fontfile='{FONT_PATH}':text='{lbl}':"
            f"fontcolor=black:fontsize={fs}:x={text_x_expr(active_xs[i])}:y={ny_expr}:"
            f"box=1:boxcolor=white@1:boxborderw=10[bg];"
        )

    f2 += "[bg]format=yuv420p[out]"
    cmd2 += [
        "-filter_complex",
        f2,
        "-map",
        "[out]",
        "-t",
        "5",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        str(part2),
    ]
    _run_ffmpeg(cmd2, f"Phase {phase_idx} Part 2 (Intro)")

    if is_coach:
        return [part1, part2]

    # ── Part 3: Transition fullbody→closeup (1 s) ──
    part3 = tmp_dir / f"phase_{phase_idx}_3_trans.mp4"
    cmd3 = [
        _get_ffmpeg_path(),
        "-y",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-filter_complex_threads",
        "1",
    ] + input_args
    f3 = base_filter
    trans_dur = 1.0
    cutoff_h = int(circle_size * BADGE_CUT_FRACTION)
    visible_h = circle_size - cutoff_h
    shift = BADGE_SHIFT_PX
    total_h = circle_size + shift
    zoom = BADGE_ZOOM_POPOUT if popout else BADGE_ZOOM_INSIDE
    body_off = BADGE_BODY_OFFSET_POPOUT if popout else BADGE_BODY_OFFSET_INSIDE

    actual_inp3 = base_cnt
    for i, p in enumerate(active_players):
        path_full = p.fullbody or p.closeup
        path_close = p.closeup or p.fullbody
        if not path_full or not path_close:
            raise ValueError(
                f"Phase {phase_idx} player {i} ({p.name}) has no fullbody/closeup pair. "
                f"Cannot compose transition phase — all players must have visual assets."
            )
        idx_full = actual_inp3
        idx_close = actual_inp3 + 1
        actual_inp3 += 2
        cmd3 += ["-loop", "1", "-i", str(path_full)]
        cmd3 += ["-loop", "1", "-i", str(path_close)]

        sw = int(circle_size * zoom)
        # Closeup mask / border / source
        f3 += (
            f"[2:v]scale={circle_size}:{circle_size},format=gray,setsar=1[tmb_{i}];"
            f"[tmb_{i}]crop={circle_size}:{visible_h}:0:0,format=gray[tmc_{i}];"
            f"color=c=black:s={circle_size}x{circle_size},format=gray[tmcv_{i}];"
            f"[tmcv_{i}][tmc_{i}]overlay=0:0,format=gray[tmf_{i}];"
            f"[tmf_{i}]split=2[tma_{i}][tmff_{i}];"
        )
        f3 += (
            f"[3:v]scale={circle_size}:{circle_size},format=rgba,setsar=1[tbb_{i}];"
            f"[tbb_{i}]crop={circle_size}:{visible_h}:0:0,format=rgba[tbc_{i}];"
            f"color=c=black@0:s={circle_size}x{circle_size},format=rgba[tbcv_{i}];"
            f"[tbcv_{i}][tbc_{i}]overlay=0:0,format=rgba[tbf_{i}];"
        )
        f3 += (
            f"[{idx_close}:v]scale={sw}:{sw}:force_original_aspect_ratio=increase,"
            f"format=rgba,setsar=1[tps_{i}];"
            f"[tps_{i}]crop={circle_size}:{total_h}:(iw-ow)/2:0.0[tsrc_{i}];"
        )

        if popout:
            bcy = max(0, min(shift + body_off, total_h - circle_size))
            f3 += (
                f"[tsrc_{i}]split=2[tpbs_{i}][tphs_{i}];"
                f"[tpbs_{i}]crop={circle_size}:{circle_size}:0:{bcy}[tpbr_{i}];"
            )
        else:
            eff = shift + body_off
            pad_top = max(0, int(-eff) + 40) if eff < 0 else 0
            if pad_top > 0:
                f3 += (
                    f"[tsrc_{i}]pad=iw:ih+{pad_top}:0:{pad_top}:color=black@0,"
                    f"format=rgba[tpbs_{i}];"
                )
            else:
                f3 += f"[tsrc_{i}]null[tpbs_{i}];"
            bcy = max(0, shift + body_off + pad_top)
            f3 += f"[tpbs_{i}]crop={circle_size}:{circle_size}:0:{bcy}[tpbr_{i}];"

        f3 += (
            f"[tpbr_{i}]split=2[tprgb_{i}][tpaf_{i}];"
            f"[tpaf_{i}]alphaextract,format=gray[tpa_{i}];"
            f"[tpa_{i}][tma_{i}]blend=all_mode=multiply:all_opacity=1,format=gray[tpam_{i}];"
            f"[tprgb_{i}][tpam_{i}]alphamerge[tpmsk_{i}];"
        )
        f3 += (
            f"color=c={BADGE_FILL_COLOR}@1:s={circle_size}x{circle_size},format=rgba[tfl_{i}];"
            f"[tfl_{i}][tmff_{i}]alphamerge[tfls_{i}];"
            f"[tfls_{i}][tpmsk_{i}]overlay=0:0,format=rgba[tpwf_{i}];"
            f"[tpwf_{i}][tbf_{i}]overlay=0:0,format=rgba[tprd_{i}];"
        )
        f3 += (
            f"color=c=black@0:s={circle_size}x{total_h},format=rgba[tcv_{i}];"
            f"[tcv_{i}][tprd_{i}]overlay=0:{shift},format=rgba[tcvb_{i}];"
        )
        if popout:
            popout_h = int(shift + circle_size * BADGE_HEAD_FRAC)
            f3 += (
                f"[tphs_{i}]crop={circle_size}:{popout_h}:0:0[tphc_{i}];"
                f"[tcvb_{i}][tphc_{i}]overlay=0:0,format=rgba[pc_fin{i}];"
            )
        else:
            f3 += f"[tcvb_{i}]copy,format=rgba[pc_fin{i}];"

        # Fullbody
        f3 += f"[{idx_full}:v]scale=-1:{int(HEIGHT * scale_full)}[pf_fin{i}];"

        # Fades
        f3 += f"[pf_fin{i}]format=rgba,fade=t=out:st=0:d={trans_dur}:alpha=1[pf_fade{i}];"
        f3 += f"[pc_fin{i}]format=rgba,fade=t=in:st=0:d={trans_dur}:alpha=1[pc_fade{i}];"

        # Fullbody overlay: static at active position, fades out
        f3 += f"[bg][pf_fade{i}]overlay=(W*{active_xs[i]}-w/2):(H*{active_ys[i]}-h)[bg_step1_{i}];"
        # Closeup overlay: animate from active position → badge position
        start_bx = active_xs[i]
        start_by = active_ys[i]
        end_bx = badge_xs[i]
        end_by = badge_ys[i]
        anim_bx = f"(W*({start_bx}+({end_bx}-{start_bx})*t/{trans_dur})-w/2)"
        anim_by = f"(H*({start_by}+({end_by}-{start_by})*t/{trans_dur})-h)"
        f3 += f"[bg_step1_{i}][pc_fade{i}]overlay={anim_bx}:{anim_by}[bg_step2_{i}];"

        # Name transitions
        lbl_full = fullbody_label(p.name, role, len(active_players))
        lbl_close = closeup_label(p.name)
        fs_full = fullbody_fontsize(role, len(active_players), lbl_full)
        fs_close = min(BADGE_LABEL_FONTSIZE, closeup_fontsize(lbl_close))
        alpha_out = f"if(lte(t,{trans_dur}), 1-(t/{trans_dur}), 0)"
        alpha_in = f"if(lte(t,{trans_dur}), t/{trans_dur}, 1)"

        f3 += (
            f"[bg_step2_{i}]drawtext=fontfile='{FONT_PATH}':text='{lbl_full}':"
            f"fontcolor=black:fontsize={fs_full}:x={text_x_expr(active_xs[i])}:"
            f"y=(h*{active_ys[i]}+10):"
            f"box=1:boxcolor=white@1:boxborderw=10:"
            f"alpha='{alpha_out}'[bg_step3_{i}];"
        )
        label_w = circle_size + BADGE_LABEL_EXTRA_W
        lx = f"({WIDTH}*{badge_xs[i]}-{label_w // 2})"
        ly = f"({HEIGHT}*{badge_ys[i]}-{cutoff_h}+{BADGE_LABEL_GAP})"
        # Use drawtext with large boxborderw for consistent label background
        # Fixed-width drawbox (matches persistent + hold labels) then
        # drawtext with alpha fade — box appears instantly, text fades in.
        f3 += (
            f"[bg_step3_{i}]"
            f"drawbox=x={lx}:y={ly}:w={label_w}:h={BADGE_LABEL_H}:"
            f"color={BADGE_LABEL_BG}:t=fill,"
            f"drawtext=fontfile='{FONT_PATH}':text='{lbl_close}':"
            f"fontcolor={BADGE_LABEL_TEXT_COLOR}:fontsize={fs_close}:"
            f"x={lx}+({label_w}-text_w)/2:"
            f"y={ly}+({BADGE_LABEL_H}-text_h)/2:"
            f"alpha='{alpha_in}'[bg];"
        )

    f3 += "[bg]format=yuv420p[out]"
    cmd3 += [
        "-filter_complex",
        f3,
        "-map",
        "[out]",
        "-t",
        str(trans_dur),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        str(part3),
    ]
    _run_ffmpeg(cmd3, f"Phase {phase_idx} Part 3 (Transition)")

    return [part1, part2, part3]


# ─────────────────────────────────────────────────────────────────
# Final hold frame
# ─────────────────────────────────────────────────────────────────


def _compose_hold(
    persistent_players: list[dict],
    bg_path: Path,
    header_path: Path,
    sponsor_path: Path | None,
    mask_path: Path,
    border_path: Path,
    tmp_dir: Path,
    popout: bool = True,
    bg_is_landscape: bool = True,
) -> Path | None:
    """Generate 3-second hold frame showing all accumulated badges."""
    hold_out = tmp_dir / "phase_hold.mp4"
    circle_size = int(HEIGHT * PLAYER_SCALE_CLOSEUP)
    if circle_size % 2 != 0:
        circle_size += 1

    fc: list[str] = []
    fc.append(f"color=c=white:s={WIDTH}x{HEIGHT}:r={FPS}[base]")
    fc.append(f"[1:v]scale={WIDTH}:-1[header]")
    # Only rotate if background is landscape (raw upload); portrait backgrounds are already correct
    if bg_is_landscape:
        fc.append(f"[0:v]transpose=1,scale={WIDTH}:{HEIGHT - HEADER_HEIGHT}[field]")
    else:
        fc.append(f"[0:v]scale={WIDTH}:{HEIGHT - HEADER_HEIGHT}[field]")
    fc.append("[base][header]overlay=0:0[b1]")
    fc.append(f"[b1][field]overlay=0:{HEADER_HEIGHT}[bg0]")

    last_bg = "bg0"
    if sponsor_path:
        sponsor_w = int(WIDTH * 0.22)
        sponsor_box_w = sponsor_w + 2 * SPONSOR_PAD
        # Light green background box behind sponsor for visibility
        fc.append(
            f"[{last_bg}]drawbox="
            f"x={SPONSOR_MARGIN}:y=ih-{SPONSOR_BOX_H}-{SPONSOR_MARGIN}"
            f":w={sponsor_box_w}:h={SPONSOR_BOX_H}"
            f":color=0x90EE90@0.85:t=fill[bg0b]"
        )
        # Ensure we keep alpha when scaling the PNG.
        fc.append(f"[4:v]scale={sponsor_w}:-1,format=rgba[sponsor]")
        fc.append(
            f"[bg0b][sponsor]overlay="
            f"({SPONSOR_MARGIN + SPONSOR_PAD}):(main_h-h-{SPONSOR_MARGIN + SPONSOR_PAD})"
            f":format=auto[bg_sponsor]"
        )
        last_bg = "bg_sponsor"

    cmd = [
        _get_ffmpeg_path(),
        "-y",
        "-threads",
        "1",
        "-filter_threads",
        "1",
        "-filter_complex_threads",
        "1",
        "-loop",
        "1",
        "-i",
        str(bg_path),
        "-loop",
        "1",
        "-i",
        str(header_path),
        "-loop",
        "1",
        "-i",
        str(mask_path),
        "-loop",
        "1",
        "-i",
        str(border_path),
    ]
    # Sponsor logo overlay (keep input index 4 stable)
    if sponsor_path:
        cmd += ["-loop", "1", "-i", str(sponsor_path)]
    else:
        cmd += ["-f", "lavfi", "-i", "color=c=black@0:s=1x1:r=1,format=rgba"]

    persist_start = 5
    cutoff_h = int(circle_size * BADGE_CUT_FRACTION)
    label_w = circle_size + BADGE_LABEL_EXTRA_W

    for i, pp in enumerate(persistent_players):
        badge_path = pp.get("badge_body") or pp.get("path")
        if not badge_path:
            raise ValueError("Persistent player missing badge_body/path")
        cmd += ["-loop", "1", "-i", str(badge_path)]

        idx = persist_start + i
        next_bg = f"bg_hold_persist_{i}"
        fc.append(f"[{last_bg}][{idx}:v]overlay=(W*{pp['x']}-w/2):(H*{pp['y']}-h)[{next_bg}]")

        lbl = closeup_label(pp["name"])
        fs = min(BADGE_LABEL_FONTSIZE, closeup_fontsize(lbl))
        lx = f"({WIDTH}*{pp['x']}-{label_w // 2})"
        ly = f"({HEIGHT}*{pp['y']}-{cutoff_h}+{BADGE_LABEL_GAP})"
        name_bg = f"bg_hold_persist_n_{i}"
        fc.append(
            f"[{next_bg}]"
            f"drawbox=x={lx}:y={ly}:w={label_w}:h={BADGE_LABEL_H}:"
            f"color={BADGE_LABEL_BG}:t=fill,"
            f"drawtext=fontfile='{FONT_PATH}':text='{lbl}':"
            f"fontcolor={BADGE_LABEL_TEXT_COLOR}:fontsize={fs}:"
            f"x={lx}+({label_w}-text_w)/2:"
            f"y={ly}+({BADGE_LABEL_H}-text_h)/2"
            f"[{name_bg}]"
        )
        last_bg = name_bg

    fc.append(f"[{last_bg}]format=yuv420p[out]")
    cmd += [
        "-filter_complex",
        ";".join(fc),
        "-map",
        "[out]",
        "-t",
        "3",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        str(hold_out),
    ]
    _run_ffmpeg(cmd, "Hold Frame")
    return hold_out


# ─────────────────────────────────────────────────────────────────
# Main composer entry point
# ─────────────────────────────────────────────────────────────────


def compose_lineup_video(
    lineup_data: "LineupData",
    formation: str = "4-3-3",
    closeup_style: str = "popout",
    animation_style: str = "slide_up",
    intro_style: str = "per_line",
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose lineup video from LineupData (database-sourced).

    Args:
        lineup_data: Fully resolved player data, brand assets, match info
        formation: Formation string (4-3-3, 4-4-2, 3-4-3)
        closeup_style: Badge style (popout / inside)
        animation_style: Player reveal animation (slide_up, appear, slide_in, zoom, fade)
        intro_style: Intro mode — 'per_line' (group by line) or 'per_player' (one by one)
        output_dir: Where to write the final MP4. Uses tempfile if None.
        progress_callback: Optional fn(percent: int) for progress updates.

    Returns:
        Path to the composed MP4 file.

    Raises:
        ValueError: If required assets are missing.
        RuntimeError: If FFmpeg compositing fails.
    """
    popout = closeup_style == "popout"

    # Create working dirs
    tmp_dir = Path(tempfile.mkdtemp(prefix="lineup_compose_"))
    asset_dir = tmp_dir / "assets"
    asset_dir.mkdir()

    if output_dir is None:
        output_dir = tmp_dir

    # ── 1. Download brand assets ──
    logger.info("Downloading brand assets...")
    bg_path = asset_dir / "field_background.jpg"
    header_path = asset_dir / "header.png"
    sponsor_path = asset_dir / "sponsor.png"

    if not lineup_data.field_background_url:
        logger.warning(
            "No stadium_background BrandAsset found — generating synthetic field background",
            extra={"activity_id": str(getattr(lineup_data, "activity_id", None))},
        )
        from src.video.services.header_generator import generate_field_background

        fallback_url = generate_field_background(width=WIDTH, height=HEIGHT - HEADER_HEIGHT)
        lineup_data.field_background_url = fallback_url

    if not _download_file(lineup_data.field_background_url, bg_path):
        raise ValueError("Failed to download field background image.")

    # Check if background is landscape (raw upload) or portrait (AI-generated)
    # Only apply 90° rotation if landscape — portrait backgrounds are already correct
    _bg_check = Image.open(bg_path)
    bg_is_landscape = _bg_check.width > _bg_check.height
    _bg_check.close()

    # Resolve brand primary color for header
    brand_primary_hex = _resolve_brand_color(lineup_data.activity_id)

    # Generate header using the production header_generator
    from src.video.services.header_generator import generate_header_image

    header_url = generate_header_image(
        width=WIDTH,
        height=HEADER_HEIGHT,
        logo_url=lineup_data.logo_url,
        opponent_logo_url=lineup_data.opponent_logo_url,
        sponsor_url=lineup_data.sponsor_url,
        match_date=lineup_data.match_date or "",
        own_team_name=lineup_data.own_team_name,
        opponent_name=lineup_data.opponent_name,
        is_home=lineup_data.is_home,
        score_home=lineup_data.score_home,
        score_away=lineup_data.score_away,
        kickoff_time=lineup_data.kickoff_time,
        coach_name=lineup_data.coach_name,
        competition_name=lineup_data.competition_name,
        venue=lineup_data.venue,
        background_color=brand_primary_hex,
    )
    if not _download_file(header_url, header_path):
        # header_url may be a file:// URL
        from urllib.parse import urlparse

        parsed = urlparse(header_url)
        if parsed.scheme == "file":
            src = parsed.path
            if src.startswith("/") and len(src) > 2 and src[2] == ":":
                src = src[1:]
            shutil.copy(src, header_path)
        else:
            raise ValueError("Failed to download generated header image.")

    if lineup_data.sponsor_url:
        _download_file(lineup_data.sponsor_url, sponsor_path)
        # Safety net: ensure any remaining background is transparent
        try:
            from src.generative.services.asset_pipeline import _strip_checkerboard

            sp_img = Image.open(sponsor_path).convert("RGBA")
            sp_img = _strip_checkerboard(sp_img)
            bbox = sp_img.getchannel("A").getbbox()
            if bbox:
                sp_img = sp_img.crop(bbox)
            sp_img.save(str(sponsor_path), "PNG")
        except Exception:  # noqa: BLE001
            logger.warning("sponsor_bg_cleanup failed, using raw file")
    else:
        sponsor_path = None

    # Generate circle mask & border
    circle_size = int(HEIGHT * PLAYER_SCALE_CLOSEUP)
    if circle_size % 2 != 0:
        circle_size += 1
    mask_path = asset_dir / "circle_mask.png"
    border_path = asset_dir / "circle_border.png"
    _generate_circle_mask(circle_size * 2, mask_path)
    _generate_circle_border(circle_size * 2, border_path)

    badge_body_dir = asset_dir / "badge_bodies"
    badge_body_dir.mkdir(exist_ok=True)

    if progress_callback:
        progress_callback(10)

    # ── 2. Pre-validate player assets (log guests, no longer fail) ──
    guest_count = 0
    for phase_name, segment_list in [
        ("keeper", lineup_data.keepers),
        ("defender", lineup_data.defenders),
        ("midfielder", lineup_data.midfielders),
        ("attacker", lineup_data.attackers),
    ]:
        for seg in segment_list:
            if not seg.kit_url and not seg.closeup_url:
                guest_count += 1
                logger.info(
                    "Guest player: %s (%s) — will use silhouette placeholder",
                    seg.member_name,
                    phase_name,
                )
    if guest_count:
        logger.info(
            "%d guest player(s) will use silhouette placeholders",
            guest_count,
        )

    # ── 3. Download player assets ──
    logger.info("Downloading player assets...")
    keepers = _download_player_assets(lineup_data.keepers, "keeper", asset_dir)
    field_players = (
        _download_player_assets(lineup_data.defenders, "defender", asset_dir)
        + _download_player_assets(lineup_data.midfielders, "midfielder", asset_dir)
        + _download_player_assets(lineup_data.attackers, "attacker", asset_dir)
    )

    # Split field players by formation
    if formation == "4-4-2":
        defenders = field_players[:4]
        midfielders = field_players[4:8]
        attackers = field_players[8:10]
    elif formation == "3-4-3":
        defenders = field_players[:3]
        midfielders = field_players[3:7]
        attackers = field_players[7:10]
    else:  # 4-3-3 default
        defenders = field_players[:4]
        midfielders = field_players[4:7]
        attackers = field_players[7:10]

    # ── 3b. Validate we have enough players for the formation (fail fast) ──
    formation_requirements = {
        "4-4-2": {"defenders": 4, "midfielders": 4, "attackers": 2},
        "3-4-3": {"defenders": 3, "midfielders": 4, "attackers": 3},
        "4-3-3": {"defenders": 4, "midfielders": 3, "attackers": 3},
    }
    req = formation_requirements.get(formation, formation_requirements["4-3-3"])
    required_field = req["defenders"] + req["midfielders"] + req["attackers"]

    if not keepers:
        raise ValueError(
            "Cannot generate lineup video — no goalkeeper resolved. "
            "Select a goalkeeper and ensure they have goalkeeper fullbody/closeup assets."
        )

    if len(field_players) < required_field:
        resolved_names = ", ".join([p.name for p in field_players]) if field_players else "(none)"
        raise ValueError(
            "Cannot generate lineup video — not enough field players resolved for formation "
            f"{formation}. Required {required_field}, got {len(field_players)}. "
            "This usually means the Activity has no usable lineup/participation data for the selected members, "
            "or members are missing required assets. "
            f"Resolved field players: {resolved_names}"
        )

    if (
        len(defenders) != req["defenders"]
        or len(midfielders) != req["midfielders"]
        or len(attackers) != req["attackers"]
    ):
        raise ValueError(
            "Cannot generate lineup video — formation slicing produced incomplete groups. "
            f"Expected D/M/A={req['defenders']}/{req['midfielders']}/{req['attackers']} for {formation} "
            f"but got {len(defenders)}/{len(midfielders)}/{len(attackers)}."
        )

    # Assign correct roles
    for p in defenders:
        p.role = "defender"
    for p in midfielders:
        p.role = "midfielder"
    for p in attackers:
        p.role = "attacker"

    if progress_callback:
        progress_callback(20)

    # ── 4. Compose phases ──
    phases = [
        ("keeper", keepers),
        ("defenders", defenders),
        ("midfielders", midfielders),
        ("attackers", attackers),
    ]

    persistent_players: list[dict] = []
    all_segments: list[Path] = []

    if intro_style == "per_player":
        # ── Per-player mode: introduce each player solo, centred & large ──
        solo_items: list[tuple[str, _LocalPlayer, int]] = []
        for group_name, group in phases:
            for gi, p in enumerate(group):
                solo_items.append((group_name, p, gi))

        total_solo = len(solo_items)
        for solo_idx, (group_name, player, group_offset) in enumerate(solo_items):
            logger.info(
                "Composing solo phase %d/%d: %s (%s)",
                solo_idx + 1,
                total_solo,
                player.name,
                group_name,
            )
            if not (player.fullbody or player.closeup):
                logger.warning(
                    "Solo phase %d player %s has NO visual assets", solo_idx, player.name
                )

            # Compute badge target position (formation spot, not centre)
            role = role_from_group(group_name)
            ay = Y_POS.get(role, 50) / 100.0
            full_group = [p for gn, g in phases if gn == group_name for p in g]
            axs = get_x_positions_for_group(len(full_group), role, formation)
            cu_base = closeup_y_for_role(role, ay)
            cu_offsets = get_y_stagger_offsets(len(full_group), CLOSEUP_ROW4_STAGGER_PCT)
            cu_ys = [clamp01(cu_base + off) for off in cu_offsets]

            segs = _compose_phase(
                solo_idx,
                group_name,
                [player],
                persistent_players,
                bg_path,
                header_path,
                sponsor_path,
                mask_path,
                border_path,
                tmp_dir,
                formation,
                popout,
                animation_style,
                bg_is_landscape,
                solo_mode=True,
                badge_xs=[axs[group_offset]],
                badge_ys=[cu_ys[group_offset]],
            )
            if segs:
                all_segments.extend(segs)
            else:
                raise ValueError(
                    f"Cannot generate lineup video — solo phase for '{player.name}' produced no output."
                )

            # Badge at correct formation position (not centre)
            if group_name != "coach" and player.closeup:
                badge_out = badge_body_dir / f"badge_{len(persistent_players):02d}.png"
                _render_badge_body_png(
                    src_path=player.closeup,
                    mask_path=mask_path,
                    border_path=border_path,
                    out_path=badge_out,
                    circle_size=circle_size,
                    popout=popout,
                )
                persistent_players.append(
                    {
                        "path": player.closeup,
                        "badge_body": badge_out,
                        "x": axs[group_offset],
                        "y": cu_ys[group_offset],
                        "name": player.name,
                    }
                )

            if progress_callback:
                pct = 20 + int((solo_idx + 1) / total_solo * 60)
                progress_callback(pct)

    else:
        # ── Per-line mode (default): introduce players per positional group ──
        for idx, (name, group) in enumerate(phases):
            if not group:
                raise ValueError(
                    f"Cannot generate lineup video — phase '{name}' has 0 players. "
                    "Fix the lineup selection / participation data so all formation lines are populated."
                )

            logger.info("Composing phase %d: %s (%d players)", idx, name, len(group))

            # Log asset availability for diagnostics
            for pi, p in enumerate(group):
                has_fb = bool(p.fullbody)
                has_cu = bool(p.closeup)
                has_in = bool(p.intro)
                if not (has_fb or has_cu):
                    logger.warning(
                        "Phase %d player %d (%s) has NO visual assets (fullbody=%s, closeup=%s, intro=%s)",
                        idx,
                        pi,
                        p.name,
                        has_fb,
                        has_cu,
                        has_in,
                    )

            segs = _compose_phase(
                idx,
                name,
                group,
                persistent_players,
                bg_path,
                header_path,
                sponsor_path,
                mask_path,
                border_path,
                tmp_dir,
                formation,
                popout,
                animation_style,
                bg_is_landscape,
            )
            if segs:
                all_segments.extend(segs)
            else:
                raise ValueError(
                    f"Cannot generate lineup video — phase '{name}' produced no output. "
                    "This indicates missing input assets or an FFmpeg composition failure for that phase."
                )

            # Add to persistent (skip coach)
            if name == "coach":
                continue

            role = role_from_group(name)
            ay = Y_POS.get(role, 50) / 100.0
            axs = get_x_positions_for_group(len(group), role, formation)
            cu_base = closeup_y_for_role(role, ay)
            cu_offsets = get_y_stagger_offsets(len(group), CLOSEUP_ROW4_STAGGER_PCT)
            cu_ys = [clamp01(cu_base + off) for off in cu_offsets]

            for i, p in enumerate(group):
                if p.closeup:
                    badge_out = badge_body_dir / f"badge_{len(persistent_players):02d}.png"
                    _render_badge_body_png(
                        src_path=p.closeup,
                        mask_path=mask_path,
                        border_path=border_path,
                        out_path=badge_out,
                        circle_size=circle_size,
                        popout=popout,
                    )
                    persistent_players.append(
                        {
                            "path": p.closeup,
                            "badge_body": badge_out,
                            "x": axs[i],
                            "y": cu_ys[i],
                            "name": p.name,
                        }
                    )

            if progress_callback:
                pct = 20 + int((idx + 1) / len(phases) * 60)
                progress_callback(pct)

    # ── 5. Final hold ──
    logger.info("Composing final hold frame...")
    hold = _compose_hold(
        persistent_players,
        bg_path,
        header_path,
        sponsor_path,
        mask_path,
        border_path,
        tmp_dir,
        popout,
        bg_is_landscape,
    )
    if hold:
        all_segments.append(hold)

    if not all_segments:
        raise RuntimeError("No video segments were produced.")

    if progress_callback:
        progress_callback(85)

    # ── 6. Concatenate ──
    logger.info("Concatenating %d segments...", len(all_segments))
    concat_list = tmp_dir / "concat.txt"
    with open(concat_list, "w", encoding="utf-8") as f:
        for seg in all_segments:
            f.write(f"file '{seg.absolute()}'\n")

    output_file = output_dir / "lineup_video.mp4"
    _run_ffmpeg(
        [
            _get_ffmpeg_path(),
            "-y",
            "-threads",
            "1",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c:v",
            "copy",
            "-an",
            str(output_file),
        ],
        "Final Concat",
    )

    # ── 7. Watermark overlay ──
    if WATERMARK_PATH.exists():
        logger.info("Adding watermark overlay...")
        watermarked = output_dir / "lineup_video_wm.mp4"
        _run_ffmpeg(
            [
                _get_ffmpeg_path(),
                "-y",
                "-threads",
                "1",
                "-i",
                str(output_file),
                "-i",
                str(WATERMARK_PATH),
                "-filter_complex",
                f"[1:v]format=rgba,colorchannelmixer=aa={WATERMARK_OPACITY}[wm];"
                f"[0:v][wm]overlay=W-w-{WATERMARK_MARGIN}:H-h-{WATERMARK_MARGIN}[out]",
                "-map",
                "[out]",
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-an",
                str(watermarked),
            ],
            "Watermark Overlay",
        )
        # Replace original with watermarked version
        import os

        os.replace(str(watermarked), str(output_file))

    if progress_callback:
        progress_callback(95)

    logger.info("Lineup video composed: %s", output_file)
    return output_file

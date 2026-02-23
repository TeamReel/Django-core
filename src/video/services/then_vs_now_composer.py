"""Then vs Now Compilation Video Composer.

Creates a compilation video from individual member then_vs_now clips:
- Persistent header with club logos and "THEN VS NOW" title
- Location background (slightly darkened)
- Sequential member clips with name labels
- Crossfade transitions between members
- Optional sponsor logo (bottom-left)

Output: 1080×1920 vertical MP4 at 30fps.
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import requests
from PIL import Image, ImageDraw

logger = logging.getLogger(__name__)

# ── Video / canvas settings ──
WIDTH = 1080
HEIGHT = 1920
FPS = 30
HEADER_HEIGHT = 300
NAME_BAR_HEIGHT = 80  # reduced — name label sits just below the video
CONTENT_HEIGHT = HEIGHT - HEADER_HEIGHT - NAME_BAR_HEIGHT
XFADE_DURATION = 0.8  # seconds crossfade between members

# ── Sponsor overlay settings (mirrored from lineup_composer) ──
SPONSOR_W = 220
SPONSOR_MARGIN = 36
SPONSOR_PAD = 16
SPONSOR_BOX_H = 120


@dataclass
class MemberClip:
    """A single member's data for the compilation."""

    member_id: str
    name: str
    video_url: str


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary (delegates to lineup_composer)."""
    from src.video.services.lineup_composer import _get_ffmpeg_path as _lineup_ffmpeg

    return _lineup_ffmpeg()


def _resolve_font_path() -> str:
    """Find FFmpeg-safe font path (delegates to lineup_composer)."""
    from src.video.services.lineup_composer import _resolve_font_path as _lineup_font

    return _lineup_font()


def _download_file(url: str, dest: Path, timeout: int = 120) -> bool:
    """Download a file from URL to dest."""
    if not url:
        return False
    try:
        r = requests.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception:
        logger.warning("Failed to download %s", url, exc_info=True)
        return False


def _probe_duration(video_path: Path) -> float:
    """Get video duration in seconds using ffprobe."""
    ffmpeg = _get_ffmpeg_path()
    ffprobe = ffmpeg.replace("ffmpeg", "ffprobe")
    try:
        result = subprocess.run(  # noqa: S603
            [
                ffprobe,
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return float(result.stdout.strip())
    except Exception:
        logger.warning("Failed to probe duration for %s", video_path, exc_info=True)
        return 5.0  # Default 5 seconds


def _render_header(
    logo_url: str | None,
    team_name: str,
    season_name: str | None,
    brand_color: str | None,
    asset_dir: Path,
) -> Path:
    """Render the Then vs Now header image using PIL.

    Layout: [Club Logo] [THEN VS NOW / Team / Season] [Club Logo]
    """
    from src.video.services.header_generator import (
        _clean_logo_alpha,
        _draw_centered_text,
        _hex_to_rgba,
        download_image,
        get_font,
    )

    white = (255, 255, 255, 255)
    black = (0, 0, 0, 255)
    brand = _hex_to_rgba(brand_color) if brand_color else (210, 18, 46, 255)

    img = Image.new("RGBA", (WIDTH, HEADER_HEIGHT), white)
    draw = ImageDraw.Draw(img)

    # Panel boundaries: left 25%, center 50%, right 25%
    x_left_end = int(WIDTH * 0.25)
    x_right_start = int(WIDTH * 0.75)
    panel_w = x_left_end

    # Draw 3 panels
    draw.rectangle([(0, 0), (x_left_end, HEADER_HEIGHT)], fill=white)
    draw.rectangle([(x_left_end, 0), (x_right_start, HEADER_HEIGHT)], fill=brand)
    draw.rectangle([(x_right_start, 0), (WIDTH, HEADER_HEIGHT)], fill=white)

    # Fonts (scaled relative to header height)
    scale = HEADER_HEIGHT / 300.0
    fonts = {
        "xl": get_font(int(72 * scale), bold=True),
        "lg": get_font(int(36 * scale), bold=True),
        "sm": get_font(int(28 * scale), bold=True),
    }

    cx = WIDTH // 2

    # Title: "THEN VS NOW"
    _draw_centered_text(
        draw,
        "THEN VS NOW",
        cx,
        int(HEADER_HEIGHT * 0.25),
        fonts["xl"],
        white,
        black,
        stroke_width=4,
    )

    # Team name
    if team_name:
        _draw_centered_text(
            draw,
            team_name.upper(),
            cx,
            int(HEADER_HEIGHT * 0.55),
            fonts["lg"],
            white,
        )

    # Season name
    if season_name:
        _draw_centered_text(
            draw,
            season_name.upper(),
            cx,
            int(HEADER_HEIGHT * 0.78),
            fonts["sm"],
            white,
        )

    # Club logo on BOTH sides
    if logo_url:
        logo_img = download_image(logo_url)
        if logo_img:
            logo_img = _clean_logo_alpha(logo_img)
            padding = int(panel_w * 0.10)
            max_logo_w = panel_w - 2 * padding
            max_logo_h = HEADER_HEIGHT - 2 * padding

            logo_img.thumbnail((max_logo_w, max_logo_h), Image.Resampling.LANCZOS)

            # Left panel
            lx = (panel_w - logo_img.width) // 2
            ly = (HEADER_HEIGHT - logo_img.height) // 2
            img.paste(logo_img, (lx, ly), logo_img)

            # Right panel (same logo)
            rx = x_right_start + (panel_w - logo_img.width) // 2
            img.paste(logo_img, (rx, ly), logo_img)

    # Save as RGB (no alpha for FFmpeg)
    header_path = asset_dir / "header.png"
    img = img.convert("RGB")
    img.save(str(header_path), "PNG")
    return header_path


def compose_then_vs_now_video(
    members: list[MemberClip],
    background_url: str,
    logo_url: str | None,
    team_name: str,
    season_name: str | None,
    brand_color: str | None,
    sponsor_url: str | None = None,
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose compilation video from member then_vs_now clips.

    For each member:
    1. Location background (scaled/rotated to 1080x1920, slightly darkened)
    2. Header overlay at top
    3. Member's then_vs_now video centered in content area
    4. Name text at bottom

    All member clips are concatenated into a final MP4.

    Args:
        members: List of MemberClip with name and video URL.
        background_url: Location/stadium background image URL.
        logo_url: Club logo URL (shown on both sides of header).
        team_name: Team name for header.
        season_name: Season/period name for header.
        brand_color: Brand primary hex color (e.g. "#D2122E").
        sponsor_url: Optional sponsor logo URL (bottom-left overlay).
        output_dir: Output directory. Uses tempfile if None.
        progress_callback: Optional fn(percent: int).

    Returns:
        Path to the composed MP4 file.

    Raises:
        ValueError: If required assets are missing.
        RuntimeError: If FFmpeg compositing fails.
    """
    font_path = _resolve_font_path()
    ffmpeg = _get_ffmpeg_path()

    tmp_dir = Path(tempfile.mkdtemp(prefix="then_vs_now_"))
    asset_dir = tmp_dir / "assets"
    asset_dir.mkdir()
    clips_dir = tmp_dir / "clips"
    clips_dir.mkdir()

    if output_dir is None:
        output_dir = tmp_dir

    # ── 1. Download background ──
    bg_path = asset_dir / "background.jpg"
    if not _download_file(background_url, bg_path):
        raise ValueError("Failed to download background image.")

    # Check orientation
    bg_img = Image.open(bg_path)
    bg_is_landscape = bg_img.width > bg_img.height
    bg_img.close()

    # ── 2. Render header ──
    header_path = _render_header(logo_url, team_name, season_name, brand_color, asset_dir)

    # ── 2b. Download sponsor logo (optional) ──
    sponsor_path: Path | None = None
    if sponsor_url:
        _sp = asset_dir / "sponsor.png"
        if _download_file(sponsor_url, _sp):
            sponsor_path = _sp

    # ── 3. Download all member videos ──
    member_paths: list[tuple[MemberClip, Path]] = []
    for i, member in enumerate(members):
        video_path = asset_dir / f"member_{i}.mp4"
        if _download_file(member.video_url, video_path):
            member_paths.append((member, video_path))
        else:
            logger.warning("Skipping member %s: failed to download video", member.name)

    if not member_paths:
        raise ValueError("No member videos could be downloaded.")

    total = len(member_paths)
    clip_paths: list[Path] = []

    # ── 4. Compose a clip per member ──
    for idx, (member, video_path) in enumerate(member_paths):
        if progress_callback:
            progress_callback(int(idx / total * 80))

        duration = _probe_duration(video_path)
        clip_path = clips_dir / f"clip_{idx:03d}.mp4"

        # Escape name for FFmpeg drawtext
        safe_name = (
            member.name.replace("\\", "\\\\")
            .replace("'", "'\\''")
            .replace(":", "\\:")
            .replace("%", "\\%")
        )

        # ── Build FFmpeg filter complex ──
        # [0] = background image (looped)
        # [1] = header image
        # [2] = member video

        # Background: scale+crop to 1080x1920, darken slightly
        bg_parts = []
        if bg_is_landscape:
            bg_parts.append("transpose=1")
        bg_parts.append(f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase")
        bg_parts.append(f"crop={WIDTH}:{HEIGHT}")
        bg_parts.append("setsar=1")
        # Darken background so video stands out
        bg_parts.append("colorbalance=rs=-0.15:gs=-0.15:bs=-0.15")
        bg_filter = f"[0:v]{','.join(bg_parts)}[bg]"

        # Header: ensure correct width
        hdr_filter = f"[1:v]scale={WIDTH}:{HEADER_HEIGHT}[hdr]"

        # Member video: scale to fill content area (preserving aspect ratio)
        content_w = int(WIDTH * 0.96)  # almost full width
        content_h = CONTENT_HEIGHT  # fill entire content zone
        vid_filter = (
            f"[2:v]scale='min({content_w},iw)':'min({content_h},ih)'"
            f":force_original_aspect_ratio=decrease,setsar=1[vid]"
        )

        # Overlay header on background
        overlay1 = "[bg][hdr]overlay=0:0[bgh]"

        # Center video in content area
        vid_x = f"({WIDTH}-w)/2"
        vid_y = f"({HEADER_HEIGHT}+({CONTENT_HEIGHT}-h)/2)"
        overlay2 = f"[bgh][vid]overlay={vid_x}:{vid_y}[main]"

        # Name text — positioned just below the video (not at very bottom)
        # Use a dynamic Y: end of content area minus a small margin
        name_y = HEADER_HEIGHT + CONTENT_HEIGHT - 20
        text_filter = (
            f"[main]drawtext=text='{safe_name}'"
            f":fontfile='{font_path}'"
            f":fontsize=56:fontcolor=white"
            f":x=(w-tw)/2:y={name_y}"
            f":shadowcolor=black@0.7:shadowx=3:shadowy=3"
        )

        # Sponsor logo overlay (bottom-left, like lineup videos)
        if sponsor_path:
            sponsor_w = int(WIDTH * 0.22)
            sponsor_box_w = sponsor_w + 2 * SPONSOR_PAD
            text_filter += "[main_txt]"
            sponsor_filter = (
                f";[main_txt]drawbox="
                f"x={SPONSOR_MARGIN}:y=ih-{SPONSOR_BOX_H}-{SPONSOR_MARGIN}"
                f":w={sponsor_box_w}:h={SPONSOR_BOX_H}"
                f":color=0x90EE90@0.85:t=fill[main_sb]"
                f";[3:v]scale={sponsor_w}:-1,format=rgba[sponsor]"
                f";[main_sb][sponsor]overlay="
                f"({SPONSOR_MARGIN + SPONSOR_PAD}):(main_h-h-{SPONSOR_MARGIN + SPONSOR_PAD})"
                f":format=auto[out]"
            )
            text_filter += sponsor_filter
        else:
            text_filter += "[out]"

        filter_complex = ";".join(
            [bg_filter, hdr_filter, vid_filter, overlay1, overlay2, text_filter]
        )

        cmd = [
            ffmpeg,
            "-y",
            "-loop",
            "1",
            "-i",
            str(bg_path),
            "-i",
            str(header_path),
            "-i",
            str(video_path),
        ]
        # Add sponsor as input [3] if present
        if sponsor_path:
            cmd += ["-loop", "1", "-i", str(sponsor_path)]
        cmd += [
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-t",
            str(duration),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            "-an",
            str(clip_path),
        ]

        logger.info(
            "Composing clip %d/%d for %s (%.1fs)",
            idx + 1,
            total,
            member.name,
            duration,
        )

        result = subprocess.run(  # noqa: S603
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            logger.error(
                "FFmpeg failed for member %s: %s",
                member.name,
                result.stderr[-2000:],
            )
            continue

        clip_paths.append(clip_path)

    if not clip_paths:
        raise ValueError("No member clips were successfully composed.")

    # ── 5. Concatenate all clips (with crossfade transitions) ──
    final_output = output_dir / "then_vs_now_compilation.mp4"

    if len(clip_paths) == 1:
        # Single clip: just copy
        import shutil

        shutil.copy2(str(clip_paths[0]), str(final_output))
    else:
        # Build xfade chain between consecutive clips
        # Each clip needs to be re-encoded for xfade to work
        input_args: list[str] = []
        for clip in clip_paths:
            input_args += ["-i", str(clip)]

        # Probe durations for xfade offset calculation
        durations = [_probe_duration(p) for p in clip_paths]

        # Build xfade filter chain:
        # [0:v][1:v]xfade=transition=fade:duration=0.8:offset=D0-0.8[v01]
        # [v01][2:v]xfade=transition=fade:duration=0.8:offset=D0+D1-2*0.8[v012]
        fc_parts: list[str] = []
        cumulative_dur = durations[0]
        prev_label = "0:v"
        for i in range(1, len(clip_paths)):
            offset = max(0.1, cumulative_dur - XFADE_DURATION)
            out_label = f"v{i}"
            fc_parts.append(
                f"[{prev_label}][{i}:v]xfade="
                f"transition=fade:duration={XFADE_DURATION}:offset={offset:.2f}"
                f"[{out_label}]"
            )
            cumulative_dur = offset + durations[i]
            prev_label = out_label

        concat_cmd = [
            ffmpeg,
            "-y",
            *input_args,
            "-filter_complex",
            ";".join(fc_parts),
            "-map",
            f"[{prev_label}]",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            "-an",
            str(final_output),
        ]

        logger.info("Concatenating %d clips with crossfade into final output", len(clip_paths))
        result = subprocess.run(  # noqa: S603
            concat_cmd,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            logger.warning(
                "xfade concat failed, falling back to simple concat: %s",
                result.stderr[-1000:],
            )
            # Fallback: simple concat without crossfade
            concat_file = tmp_dir / "concat.txt"
            with open(concat_file, "w") as f:
                for path in clip_paths:
                    f.write(f"file '{path}'\n")
            fallback_cmd = [
                ffmpeg,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_file),
                "-c",
                "copy",
                str(final_output),
            ]
            result = subprocess.run(  # noqa: S603
                fallback_cmd,
                capture_output=True,
                text=True,
                timeout=600,
            )
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg concat failed: {result.stderr[-2000:]}")

    if progress_callback:
        progress_callback(100)

    logger.info(
        "Then vs Now compilation complete: %s (%d members, xfade=%.1fs)",
        final_output,
        len(clip_paths),
        XFADE_DURATION,
    )
    return final_output

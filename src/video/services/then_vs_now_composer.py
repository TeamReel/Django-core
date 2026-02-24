"""Then vs Now Compilation Video Composer.

Creates a compilation video from individual member then_vs_now clips:
- Persistent header with club logos and "THEN VS NOW" title
- Location background (slightly darkened)
- Sequential member clips with name labels
- Smooth transitions: freeze last frame → empty field → next member fades in
- Optional sponsor logo (bottom-left)

Supports two video types with different sizing:
- sidebyside: video fills full width between header and name/sponsor zone
- transformation: video slightly smaller, centered in the same zone

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
# Transition duration used for fade-in/out between members.
# Important: we do NOT overlap members anymore (no xfade), because that makes
# the next member start before the previous ends.
XFADE_DURATION = 2.0

# ── Reserved zones ──
SPONSOR_BOX_H = 120
SPONSOR_MARGIN = 36
SPONSOR_PAD = 16
SPONSOR_W = 220
NAME_LABEL_H = 60  # space for name text
BOTTOM_RESERVED = SPONSOR_BOX_H + SPONSOR_MARGIN + NAME_LABEL_H  # ~216px

# ── Content area (between header and reserved bottom zone) ──
CONTENT_HEIGHT = HEIGHT - HEADER_HEIGHT - BOTTOM_RESERVED  # ~1404px

# ── Per-type sizing ──
# sidebyside: large, nearly full content area (cover-crop)
SBS_SCALE = 1.05
# transformation: fit-inside, no cropping, centered in content zone
TRANSFORM_SCALE = 0.80

# ── Transition timing ──
# Playback is slowed down to 1.5x duration (setpts=1.5*PTS) for a cinematic feel.
# After the slowed clip, freeze last frame briefly, then a short bg pause.
PLAY_SECONDS = 5.0  # trim from source (before slow-mo)
SLOWMO_FACTOR = 1.5  # 1.5 = 50% slower playback
FREEZE_SECONDS = 2.0  # freeze on last frame
EMPTY_FIELD_SECONDS = 1.0  # short background pause between members


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
    # Only replace the binary name, not the entire path
    # e.g. /usr/local/ffmpeg/bin/ffmpeg -> /usr/local/ffmpeg/bin/ffprobe
    ffmpeg_path = Path(ffmpeg)
    ffprobe = str(ffmpeg_path.parent / "ffprobe")
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
    video_type: str = "sidebyside",
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose compilation video from member then_vs_now clips.

    For each member:
    1. Location background (scaled/rotated to 1080×1920, slightly darkened)
    2. Header overlay at top
    3. Member's then_vs_now video in content area (sized per video_type)
    4. Name text above sponsor zone
    5. Freeze last frame → empty background → crossfade to next member

    Args:
        members: List of MemberClip with name and video URL.
        background_url: Location/stadium background image URL.
        logo_url: Club logo URL (shown on both sides of header).
        team_name: Team name for header.
        season_name: Season/period name for header.
        brand_color: Brand primary hex color (e.g. "#D2122E").
        sponsor_url: Optional sponsor logo URL (bottom-left overlay).
        video_type: "sidebyside" or "transformation" (controls video sizing).
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

    # ── Video sizing per type ──
    scale = SBS_SCALE if video_type == "sidebyside" else TRANSFORM_SCALE
    vid_w = int(WIDTH * scale)
    vid_h = int(CONTENT_HEIGHT * scale)

    # ── 3b. Pre-render background+header as a REAL video file ──
    # This is the key to reliable duration control: overlaying a member
    # video on a real .mp4 (not looped images) guarantees the output
    # duration matches the base video, not the overlay.
    # Fixed per-member duration (independent of input clip length).
    per_member_clip_dur = PLAY_SECONDS + FREEZE_SECONDS + EMPTY_FIELD_SECONDS
    # Add a small buffer for encoder rounding.
    bg_video_dur = per_member_clip_dur + 2.0

    bg_video_path = asset_dir / "bg_loop.mp4"
    bg_fc: list[str] = []
    bg_parts = []
    if bg_is_landscape:
        bg_parts.append("transpose=1")
    bg_parts.append(f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase")
    bg_parts.append(f"crop={WIDTH}:{HEIGHT}")
    bg_parts.append("setsar=1")
    bg_parts.append("colorbalance=rs=-0.15:gs=-0.15:bs=-0.15")
    bg_fc.append(f"[0:v]{','.join(bg_parts)}[bg_img]")
    bg_fc.append(f"[1:v]scale={WIDTH}:{HEADER_HEIGHT}[hdr]")
    bg_fc.append(f"color=c=black:s={WIDTH}x{HEIGHT}:r={FPS}:d={bg_video_dur:.2f}[canvas]")
    bg_fc.append("[canvas][bg_img]overlay=0:0:eof_action=repeat[bg]")
    bg_fc.append("[bg][hdr]overlay=0:0:eof_action=repeat[out]")

    bg_cmd = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        str(bg_path),
        "-loop",
        "1",
        "-i",
        str(header_path),
        "-filter_complex",
        ";".join(bg_fc),
        "-map",
        "[out]",
        "-t",
        f"{bg_video_dur:.2f}",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(FPS),
        "-an",
        str(bg_video_path),
    ]
    logger.info(
        "Pre-rendering background+header video (%.1fs) for %d members",
        bg_video_dur,
        total,
    )
    result = subprocess.run(bg_cmd, capture_output=True, text=True, timeout=300)  # noqa: S603
    if result.returncode != 0:
        raise RuntimeError(f"Failed to render background video: {result.stderr[-2000:]}")
    bg_actual_dur = _probe_duration(bg_video_path)
    logger.info("Background video rendered: %.1fs", bg_actual_dur)

    # ── 4. Compose clips per member ──
    # SIMPLE APPROACH: create TWO separate clips per member:
    #   1) video_clip: background + header + member video overlay (play + freeze)
    #   2) gap_clip: just background + header (empty field pause)
    # Then concatenate all clips. No eof_action magic needed.

    for idx, (member, video_path) in enumerate(member_paths):
        if progress_callback:
            progress_callback(int(idx / total * 80))

        _src_duration = _probe_duration(video_path)  # for logging only

        play_dur = PLAY_SECONDS
        slowmo = SLOWMO_FACTOR
        slowed_play_dur = play_dur * slowmo  # 7.5s after slow-mo
        freeze_dur = FREEZE_SECONDS
        gap_dur = EMPTY_FIELD_SECONDS
        member_segment_dur = slowed_play_dur + freeze_dur  # ~9.5s

        # Escape name for FFmpeg drawtext
        safe_name = (
            member.name.replace("\\", "\\\\")
            .replace("'", "'\\''")
            .replace(":", "\\:")
            .replace("%", "\\%")
        )

        # ─── CLIP A: Member video segment (play + freeze) ───
        video_clip_path = clips_dir / f"clip_{idx:03d}_video.mp4"

        fc_video: list[str] = []

        # Trim background to exact duration needed
        fc_video.append(f"[0:v]trim=duration={member_segment_dur},setpts=PTS-STARTPTS[bg]")

        # Member video: trim → slow-mo → freeze last frame
        if video_type == "sidebyside":
            fc_video.append(
                f"[1:v]trim=duration={play_dur},setpts={slowmo}*PTS,"
                f"tpad=stop_mode=clone:stop_duration={freeze_dur},"
                f"scale={vid_w}:{vid_h}:force_original_aspect_ratio=increase,"
                f"crop={vid_w}:{vid_h},setsar=1[vid]"
            )
            vid_x = f"({WIDTH}-{vid_w})/2"
            vid_y = int(HEADER_HEIGHT + (CONTENT_HEIGHT - vid_h) // 2)
            # eof_action=repeat: if overlay ends before bg, keep showing last frame
            # shortest=0: output duration = longest stream (bg), not shortest (vid)
            fc_video.append(f"[bg][vid]overlay={vid_x}:{vid_y}:eof_action=repeat:shortest=0[main]")
        else:
            fc_video.append(
                f"[1:v]trim=duration={play_dur},setpts={slowmo}*PTS,"
                f"tpad=stop_mode=clone:stop_duration={freeze_dur},"
                f"scale={vid_w}:{vid_h}:force_original_aspect_ratio=decrease,"
                f"setsar=1[vid]"
            )
            fc_video.append(
                f"[bg][vid]overlay=(W-w)/2:({HEADER_HEIGHT}+({CONTENT_HEIGHT}-h)/2)"
                f":eof_action=repeat:shortest=0[main]"
            )

        # Name label with brand color background box
        name_y = HEIGHT - BOTTOM_RESERVED + 5
        label_h = 80
        # Brand color for the name box (default red if not provided)
        brand_hex = (brand_color or "#D2122E").lstrip("#")
        fc_video.append(
            f"[main]drawbox=x=0:y={name_y - 10}:w=iw:h={label_h}"
            f":color=0x{brand_hex}@0.85:t=fill[main_nb]"
        )
        fc_video.append(
            f"[main_nb]drawtext=text='{safe_name}'"
            f":fontfile='{font_path}'"
            f":fontsize=72:fontcolor=white"
            f":x=(w-tw)/2:y={name_y + 5}"
            f":shadowcolor=black@0.5:shadowx=2:shadowy=2"
            + ("[main_txt]" if sponsor_path else "[out]")
        )

        # Sponsor logo overlay
        if sponsor_path:
            sponsor_w = int(WIDTH * 0.22)
            sponsor_box_w = sponsor_w + 2 * SPONSOR_PAD
            fc_video.append(
                f"[main_txt]drawbox="
                f"x={SPONSOR_MARGIN}:y=ih-{SPONSOR_BOX_H}-{SPONSOR_MARGIN}"
                f":w={sponsor_box_w}:h={SPONSOR_BOX_H}"
                f":color=0x90EE90@0.85:t=fill[main_sb]"
            )
            fc_video.append(f"[2:v]scale={sponsor_w}:-1,format=rgba[sponsor]")
            fc_video.append(
                f"[main_sb][sponsor]overlay="
                f"({SPONSOR_MARGIN + SPONSOR_PAD}):(main_h-h-{SPONSOR_MARGIN + SPONSOR_PAD})"
                f":format=auto[out]"
            )

        cmd_video = [
            ffmpeg,
            "-y",
            "-i",
            str(bg_video_path),
            "-i",
            str(video_path),
        ]
        if sponsor_path:
            cmd_video += ["-loop", "1", "-i", str(sponsor_path)]
        cmd_video += [
            "-filter_complex",
            ";".join(fc_video),
            "-map",
            "[out]",
            "-t",
            f"{member_segment_dur:.2f}",
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
            str(video_clip_path),
        ]

        logger.info("Composing video segment %d/%d for %s", idx + 1, total, member.name)
        result = subprocess.run(
            cmd_video, capture_output=True, text=True, timeout=600
        )  # noqa: S603
        if result.returncode != 0:
            logger.error("FFmpeg failed for member %s: %s", member.name, result.stderr[-2000:])
            continue

        clip_paths.append(video_clip_path)

        # ─── CLIP B: Gap segment (pure background + header, no member video) ───
        gap_clip_path = clips_dir / f"clip_{idx:03d}_gap.mp4"

        # Simply trim the background video to gap duration
        cmd_gap = [
            ffmpeg,
            "-y",
            "-i",
            str(bg_video_path),
            "-vf",
            f"trim=duration={gap_dur},setpts=PTS-STARTPTS",
            "-t",
            f"{gap_dur:.2f}",
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
            str(gap_clip_path),
        ]

        logger.info("Composing gap segment %d/%d (%.1fs)", idx + 1, total, gap_dur)
        result = subprocess.run(cmd_gap, capture_output=True, text=True, timeout=600)  # noqa: S603
        if result.returncode != 0:
            logger.error("FFmpeg gap failed: %s", result.stderr[-1000:])
            continue

        clip_paths.append(gap_clip_path)

        # Log timing
        video_actual = _probe_duration(video_clip_path)
        gap_actual = _probe_duration(gap_clip_path)
        logger.info(
            "Member %d/%d %s: video=%.1fs (expected %.1fs), gap=%.1fs (expected %.1fs)",
            idx + 1,
            total,
            member.name,
            video_actual,
            member_segment_dur,
            gap_actual,
            gap_dur,
        )

    if not clip_paths:
        raise ValueError("No member clips were successfully composed.")

    # ── 5. Concatenate all clips (no overlap) ──
    # We concatenate sequentially so member B never starts before member A finishes.
    joined_output = output_dir / "then_vs_now_joined.mp4"
    final_output = output_dir / "then_vs_now_compilation.mp4"

    if len(clip_paths) == 1:
        # Single clip: just copy
        import shutil

        shutil.copy2(str(clip_paths[0]), str(joined_output))
    else:
        concat_file = tmp_dir / "concat.txt"
        with open(concat_file, "w", encoding="utf-8") as f:
            for path in clip_paths:
                # Use forward slashes and escape for FFmpeg concat demuxer
                safe_path = str(path).replace("\\", "/")
                f.write(f"file '{safe_path}'\n")

        # First try: fast concat without re-encoding.
        concat_cmd = [
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
            str(joined_output),
        ]
        logger.info("Concatenating %d clips sequentially (no overlap)", len(clip_paths))
        result = subprocess.run(
            concat_cmd, capture_output=True, text=True, timeout=600
        )  # noqa: S603
        if result.returncode != 0:
            logger.warning(
                "concat copy failed, falling back to re-encode concat: %s",
                result.stderr[-1000:],
            )

            # Fallback: concat filter (re-encode) for maximum compatibility.
            input_args: list[str] = []
            for clip in clip_paths:
                input_args += ["-i", str(clip)]

            fc_parts: list[str] = []
            for i in range(len(clip_paths)):
                fc_parts.append(f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p,setsar=1[v{i}]")
            fc_parts.append(
                "".join([f"[v{i}]" for i in range(len(clip_paths))])
                + f"concat=n={len(clip_paths)}:v=1:a=0[out]"
            )

            concat_filter_cmd = [
                ffmpeg,
                "-y",
                *input_args,
                "-filter_complex",
                ";".join(fc_parts),
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
                "-r",
                str(FPS),
                "-an",
                str(joined_output),
            ]
            result = subprocess.run(
                concat_filter_cmd,
                capture_output=True,
                text=True,
                timeout=600,
            )  # noqa: S603
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg concat failed: {result.stderr[-2000:]}")

    # Smooth ending: fade out during the last second.
    total_dur = _probe_duration(joined_output)
    fade_start = max(0.0, total_dur - 1.0)
    fade_cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(joined_output),
        "-vf",
        f"fade=t=out:st={fade_start:.2f}:d=1.0",
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
    result = subprocess.run(fade_cmd, capture_output=True, text=True, timeout=600)  # noqa: S603
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg fade-out failed: {result.stderr[-2000:]}")

    if progress_callback:
        progress_callback(100)

    logger.info(
        "Then vs Now compilation complete: %s (%d members, transition=%.1fs)",
        final_output,
        len(clip_paths),
        XFADE_DURATION,
    )
    return final_output

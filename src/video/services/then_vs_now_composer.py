"""Then vs Now Compilation Video Composer.

Creates a compilation video from individual member then_vs_now clips:
- Persistent header with club logos and "THEN VS NOW" title
- Location background (slightly darkened)
- Sequential member clips with name labels
- Smooth transitions: freeze last frame → empty field → next member fades in
- Optional sponsor logo (bottom-left)

Supports multiple video types with different sizing:
- sidebyside: video fills full width between header and name/sponsor zone (raw AI video)
- transformation: video slightly smaller, positioned below center (processed/RVM video)
- duo_portret: same sizing as transformation, uses raw AI video

Output: 1080×1920 vertical MP4 at 30fps.
"""

from __future__ import annotations

import io
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

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
    resolve_ffmpeg_font_path,
)

logger = logging.getLogger(__name__)

# ── Video / canvas settings ──
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT
FPS = CANVAS_FPS
# Transition duration used for fade-in/out between members.
# Important: we do NOT overlap members anymore (no xfade), because that makes
# the next member start before the previous ends.
XFADE_DURATION = 2.0

# ── Reserved zones (from _common) ──
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


@dataclass
class MemberPhotoComposite:
    """A single member's data for photo composite compilation (Step 5).

    At this point, the member should have a pre-processed transparent video
    (from the modular pipeline: Gemini composite → MiniMax video → RVM bg removal).
    """

    member_id: str
    name: str
    transparent_video_url: str  # RVM-processed transparent video (MOV/MP4 with alpha)


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary (delegates to _common)."""
    return get_ffmpeg_path()


def _resolve_font_path() -> str:
    """Find FFmpeg-safe font path (delegates to _common)."""
    return resolve_ffmpeg_font_path()


def _download_file(url: str, dest: Path, timeout: int = 120) -> bool:
    """Download a file from URL to dest."""
    return download_file(url, dest, timeout=timeout)


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
        video_type: "sidebyside", "transformation", or "duo_portret" (controls video sizing).
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
    # Compute max needed duration across all members (full source + slow-mo + freeze).
    max_member_dur = 0.0
    member_durations: list[float] = []
    for _member, vpath in member_paths:
        dur = _probe_duration(vpath)
        member_durations.append(dur)
        slowed = dur * SLOWMO_FACTOR + FREEZE_SECONDS
        max_member_dur = max(max_member_dur, slowed)
    # Add buffer for encoder rounding.
    bg_video_dur = max_member_dur + 4.0

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

        src_duration = member_durations[idx]

        slowmo = SLOWMO_FACTOR
        slowed_play_dur = src_duration * slowmo  # full video slowed down
        freeze_dur = FREEZE_SECONDS
        member_segment_dur = slowed_play_dur + freeze_dur

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

        # Member video: play FULL source (no trim), slow-mo, then freeze last frame
        if video_type == "sidebyside":
            # Cover-crop: scale up to fill, then crop to exact size
            # Apply chromakey to remove green screen background from AI video
            fc_video.append(
                f"[1:v]setpts={slowmo}*PTS,"
                f"tpad=stop_mode=clone:stop_duration={freeze_dur},"
                f"scale={vid_w}:{vid_h}:force_original_aspect_ratio=increase,"
                f"crop={vid_w}:{vid_h},setsar=1,"
                f"chromakey=0x00FF00:0.24:0.12[vid]"
            )
            vid_x = f"({WIDTH}-{vid_w})/2"
            vid_y = int(HEADER_HEIGHT + (CONTENT_HEIGHT - vid_h) // 2)
            # eof_action=repeat: if overlay ends before bg, keep showing last frame
            # shortest=0: output duration = longest stream (bg), not shortest (vid)
            fc_video.append(f"[bg][vid]overlay={vid_x}:{vid_y}:eof_action=repeat:shortest=0[main]")
        else:
            # Fit-inside: scale to fit within target size, no cropping
            # Used for transformation + duo_portret
            fc_video.append(
                f"[1:v]setpts={slowmo}*PTS,"
                f"tpad=stop_mode=clone:stop_duration={freeze_dur},"
                f"scale={vid_w}:{vid_h}:force_original_aspect_ratio=decrease,"
                f"setsar=1[vid]"
            )
            # Position slightly below center (3/5 of remaining space above,
            # 2/5 below) so the video sits nicely under the header.
            fc_video.append(
                f"[bg][vid]overlay=(W-w)/2:({HEADER_HEIGHT}+({CONTENT_HEIGHT}-h)*3/5)"
                f":eof_action=repeat:shortest=0[main]"
            )

        # Name label with brand color background box
        # Position: just below the content area, above the sponsor zone
        name_y = HEADER_HEIGHT + CONTENT_HEIGHT - 10
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

        actual_dur = _probe_duration(video_clip_path)
        logger.info(
            "Member %d/%d %s: clip=%.1fs (expected %.1fs)",
            idx + 1,
            total,
            member.name,
            actual_dur,
            member_segment_dur,
        )

        clip_paths.append(video_clip_path)

    if not clip_paths:
        raise ValueError("No member clips were successfully composed.")

    # ── 5. Concatenate clips with crossfade transitions ──
    # Use xfade to smoothly transition between member clips.
    # The next member fades in as the current one fades out.
    joined_output = output_dir / "then_vs_now_joined.mp4"
    final_output = output_dir / "then_vs_now_compilation.mp4"

    if len(clip_paths) == 1:
        import shutil

        shutil.copy2(str(clip_paths[0]), str(joined_output))
    else:
        # Probe durations for xfade offset calculation
        durations = [_probe_duration(p) for p in clip_paths]
        logger.info(
            "Clip durations for xfade: %s",
            [f"{d:.1f}s" for d in durations],
        )

        input_args: list[str] = []
        for clip in clip_paths:
            input_args += ["-i", str(clip)]

        # Build xfade chain: normalize each stream, then chain xfades
        fc_parts: list[str] = []
        for i in range(len(clip_paths)):
            fc_parts.append(f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p,setsar=1[v{i}]")

        cumulative_dur = durations[0]
        prev_label = "v0"
        for i in range(1, len(clip_paths)):
            offset = max(0.1, cumulative_dur - XFADE_DURATION)
            out_label = f"xv{i}"
            fc_parts.append(
                f"[{prev_label}][v{i}]xfade="
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
            str(joined_output),
        ]

        logger.info(
            "Concatenating %d clips with %.1fs xfade crossfade",
            len(clip_paths),
            XFADE_DURATION,
        )
        result = subprocess.run(
            concat_cmd, capture_output=True, text=True, timeout=600
        )  # noqa: S603
        if result.returncode != 0:
            logger.warning(
                "xfade failed, falling back to simple concat: %s",
                result.stderr[-1000:],
            )
            # Fallback: simple concat
            concat_file = tmp_dir / "concat.txt"
            with open(concat_file, "w", encoding="utf-8") as f:
                for path in clip_paths:
                    safe_path = str(path).replace("\\", "/")
                    f.write(f"file '{safe_path}'\n")
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
                str(joined_output),
            ]
            result = subprocess.run(
                fallback_cmd, capture_output=True, text=True, timeout=600
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


def compose_cover_video(
    members: list[MemberClip],
    logo_url: str | None,
    team_name: str,
    season_name: str | None,
    brand_color: str | None,
    video_type: str = "duo_portret",
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose a 'cover' style compilation video.

    Cover style: no stadium background, raw AI video fills the entire frame
    below the header. Name label is a semi-transparent brand-color bar
    overlaying the bottom of the video. No sponsor logo.

    Args:
        members: List of MemberClip with video_url.
        logo_url: Club logo URL (header).
        team_name: Team name for header.
        season_name: Season/period name for header.
        brand_color: Brand hex color.
        video_type: 'sidebyside' or 'duo_portret'.
        output_dir: Output directory.
        progress_callback: Optional fn(percent: int).

    Returns:
        Path to the composed MP4 file.
    """
    font_path = _resolve_font_path()
    ffmpeg = _get_ffmpeg_path()

    tmp_dir = Path(tempfile.mkdtemp(prefix="cover_"))
    asset_dir = tmp_dir / "assets"
    asset_dir.mkdir()
    clips_dir = tmp_dir / "clips"
    clips_dir.mkdir()

    if output_dir is None:
        output_dir = tmp_dir

    # ── 1. Render header ──
    header_path = _render_header(logo_url, team_name, season_name, brand_color, asset_dir)

    # ── 2. Download all member videos ──
    member_paths: list[tuple[MemberClip, Path]] = []
    for i, member in enumerate(members):
        video_path = asset_dir / f"member_{i}.mp4"
        if _download_file(member.video_url, video_path):
            member_paths.append((member, video_path))
        else:
            logger.warning("Cover: failed to download video for %s", member.name)

    if not member_paths:
        raise ValueError("No member videos could be downloaded.")

    total = len(member_paths)
    clip_paths: list[Path] = []

    # Cover area = full frame below header
    cover_h = HEIGHT - HEADER_HEIGHT  # 1620px

    # ── 3. Pre-render header-only video (black canvas + header) ──
    max_member_dur = 0.0
    member_durations: list[float] = []
    for _member, vpath in member_paths:
        dur = _probe_duration(vpath)
        member_durations.append(dur)
        slowed = dur * SLOWMO_FACTOR + FREEZE_SECONDS
        max_member_dur = max(max_member_dur, slowed)
    bg_video_dur = max_member_dur + 4.0

    bg_video_path = asset_dir / "bg_loop.mp4"
    bg_fc = [
        f"[0:v]scale={WIDTH}:{HEADER_HEIGHT}[hdr]",
        f"color=c=black:s={WIDTH}x{HEIGHT}:r={FPS}:d={bg_video_dur:.2f}[canvas]",
        "[canvas][hdr]overlay=0:0:eof_action=repeat[out]",
    ]

    bg_cmd = [
        ffmpeg,
        "-y",
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
        "Cover: pre-rendering header video (%.1fs) for %d members",
        bg_video_dur,
        total,
    )
    result = subprocess.run(bg_cmd, capture_output=True, text=True, timeout=300)  # noqa: S603
    if result.returncode != 0:
        raise RuntimeError(f"Failed to render header video: {result.stderr[-2000:]}")

    # ── 4. Compose per-member clips ──
    for idx, (member, video_path) in enumerate(member_paths):
        if progress_callback:
            progress_callback(int(idx / total * 80))

        src_duration = member_durations[idx]
        slowmo = SLOWMO_FACTOR
        slowed_play_dur = src_duration * slowmo
        freeze_dur = FREEZE_SECONDS
        member_segment_dur = slowed_play_dur + freeze_dur

        safe_name = (
            member.name.replace("\\", "\\\\")
            .replace("'", "'\\''")
            .replace(":", "\\:")
            .replace("%", "\\%")
        )

        video_clip_path = clips_dir / f"clip_{idx:03d}_video.mp4"
        fc: list[str] = []

        # Trim header-bg to exact duration
        fc.append(f"[0:v]trim=duration={member_segment_dur},setpts=PTS-STARTPTS[bg]")

        # Scale video to COVER the area below header (no letterbox)
        fc.append(
            f"[1:v]setpts={slowmo}*PTS,"
            f"tpad=stop_mode=clone:stop_duration={freeze_dur},"
            f"scale={WIDTH}:{cover_h}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{cover_h},setsar=1[vid]"
        )

        # Overlay video below header
        fc.append(f"[bg][vid]overlay=0:{HEADER_HEIGHT}" f":eof_action=repeat:shortest=0[main]")

        # Semi-transparent name label at bottom of frame
        brand_hex = (brand_color or "#D2122E").lstrip("#")
        cover_label_h = 90
        cover_name_y = HEIGHT - cover_label_h

        fc.append(
            f"[main]drawbox=x=0:y={cover_name_y}:w=iw:h={cover_label_h}"
            f":color=0x{brand_hex}@0.60:t=fill[main_nb]"
        )
        fc.append(
            f"[main_nb]drawtext=text='{safe_name}'"
            f":fontfile='{font_path}'"
            f":fontsize=72:fontcolor=white"
            f":x=(w-tw)/2:y={cover_name_y + 10}"
            f":shadowcolor=black@0.5:shadowx=2:shadowy=2"
            "[out]"
        )

        cmd = [
            ffmpeg,
            "-y",
            "-i",
            str(bg_video_path),
            "-i",
            str(video_path),
            "-filter_complex",
            ";".join(fc),
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

        logger.info("Cover: composing segment %d/%d for %s", idx + 1, total, member.name)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)  # noqa: S603
        if result.returncode != 0:
            logger.error("FFmpeg cover failed for %s: %s", member.name, result.stderr[-2000:])
            continue

        clip_paths.append(video_clip_path)

    if not clip_paths:
        raise ValueError("No member clips were successfully composed.")

    # ── 5. Concatenate clips with crossfade transitions ──
    joined_output = output_dir / "cover_joined.mp4"
    final_output = output_dir / "then_vs_now_compilation.mp4"

    if len(clip_paths) == 1:
        import shutil

        shutil.copy2(str(clip_paths[0]), str(joined_output))
    else:
        durations = [_probe_duration(p) for p in clip_paths]
        logger.info("Cover clip durations: %s", [f"{d:.1f}s" for d in durations])

        input_args: list[str] = []
        for clip in clip_paths:
            input_args += ["-i", str(clip)]

        fc_parts: list[str] = []
        for i in range(len(clip_paths)):
            fc_parts.append(f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p,setsar=1[v{i}]")

        cumulative_dur = durations[0]
        prev_label = "v0"
        for i in range(1, len(clip_paths)):
            offset = max(0.1, cumulative_dur - XFADE_DURATION)
            out_label = f"xv{i}"
            fc_parts.append(
                f"[{prev_label}][v{i}]xfade="
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
            str(joined_output),
        ]

        logger.info(
            "Cover: concatenating %d clips with %.1fs xfade", len(clip_paths), XFADE_DURATION
        )
        result = subprocess.run(
            concat_cmd, capture_output=True, text=True, timeout=600
        )  # noqa: S603
        if result.returncode != 0:
            logger.warning("xfade failed, falling back to concat: %s", result.stderr[-1000:])
            concat_file = tmp_dir / "concat.txt"
            with open(concat_file, "w", encoding="utf-8") as f:
                for path in clip_paths:
                    safe_path = str(path).replace("\\", "/")
                    f.write(f"file '{safe_path}'\n")
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
                str(joined_output),
            ]
            result = subprocess.run(
                fallback_cmd, capture_output=True, text=True, timeout=600
            )  # noqa: S603
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg concat failed: {result.stderr[-2000:]}")

    # Smooth ending: fade out last second
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
        "Cover compilation complete: %s (%d members)",
        final_output,
        len(clip_paths),
    )
    return final_output


# ═══════════════════════════════════════════════════════════════════════════
# Photo Composite Pipeline (AI-powered)
#
# Per member:
#   1. PIL: crop fullbody images to hips, mirror legacy
#   2. Gemini: realistically composite players onto background (lighting,
#      perspective, shadows)
#   3. MiniMax: generate 6s video from the composite (players slowly turn
#      to look at each other, smile, look forward)
#   4. RVM: remove background from generated video → transparent MOV
#   5. FFmpeg: overlay transparent video on consistent club_background +
#      header + name label + sponsor
#
# Then: concatenate all member clips with xfade transitions + fade-out.
# ═══════════════════════════════════════════════════════════════════════════

PHOTO_CLIP_DURATION = 6.0  # seconds — MiniMax generates ~6s clips


def _crop_player_to_hips(
    img_path: Path, output_path: Path, mirror: bool = False, crop_ratio: float = 0.60
) -> Path:
    """Crop a fullbody transparent PNG to show upper portion.

    Trims transparent padding, keeps upper portion of the visible person.
    Default 60% (head to hips), use higher values (e.g. 0.85) to include legs.
    Optionally mirrors horizontally so legacy faces the other direction.
    """
    img = Image.open(img_path).convert("RGBA")

    # Find bounding box of non-transparent content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Keep upper portion based on crop_ratio
    crop_h = int(img.height * crop_ratio)
    img = img.crop((0, 0, img.width, crop_h))

    if mirror:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)

    img.save(str(output_path), "PNG")
    return output_path


def _prepare_gemini_composite_image(
    bg_path: Path,
    home_cropped_path: Path,
    legacy_cropped_path: Path,
    output_path: Path,
) -> Path:
    """Create a rough PIL composite for Gemini input.

    This gives Gemini a clear reference of the desired composition:
    background + two players side by side, so it can produce a photorealistic
    version with proper lighting, shadows, and perspective.
    """
    bg = Image.open(bg_path).convert("RGBA")
    # Make background portrait if landscape
    if bg.width > bg.height:
        bg = bg.transpose(Image.Transpose.ROTATE_90)
    # Scale to 1080x1920
    scale_factor = max(WIDTH / bg.width, HEIGHT / bg.height)
    bg = bg.resize(
        (int(bg.width * scale_factor), int(bg.height * scale_factor)),
        Image.Resampling.LANCZOS,
    )
    left = (bg.width - WIDTH) // 2
    top = (bg.height - HEIGHT) // 2
    bg = bg.crop((left, top, left + WIDTH, top + HEIGHT))

    # Load cropped players
    home_img = Image.open(home_cropped_path).convert("RGBA")
    legacy_img = Image.open(legacy_cropped_path).convert("RGBA")

    # Scale players to fill the content zone nicely.
    # Each player ~46% of frame width (was 48%) so they fill the frame prominently.
    player_w = int(WIDTH * 0.46)

    def _scale_to_width(img: Image.Image, target_w: int) -> Image.Image:
        aspect = img.height / img.width
        return img.resize((target_w, int(target_w * aspect)), Image.Resampling.LANCZOS)

    home_scaled = _scale_to_width(home_img, player_w)
    legacy_scaled = _scale_to_width(legacy_img, player_w)

    # Position: legacy on left, home on right.
    # CRITICAL: Anchor player bottoms to the EXACT bottom pixel row.
    # No background should be visible below the players.
    content_bottom = HEIGHT  # pixel 1920 = very bottom
    gap = int(WIDTH * 0.02)

    # Legacy (left)
    legacy_x = (WIDTH // 2 - gap // 2) - legacy_scaled.width
    legacy_y = content_bottom - legacy_scaled.height
    bg.paste(legacy_scaled, (legacy_x, legacy_y), legacy_scaled)

    # Home (right)
    home_x = WIDTH // 2 + gap // 2
    home_y = content_bottom - home_scaled.height
    bg.paste(home_scaled, (home_x, home_y), home_scaled)

    bg = bg.convert("RGB")
    bg.save(str(output_path), "PNG", quality=95)
    return output_path


def _gemini_composite(
    bg_path: Path,
    home_cropped_path: Path,
    legacy_cropped_path: Path,
    reference_composite_path: Path,
    member_name: str,
    output_path: Path,
) -> Path | None:
    """Use Gemini to realistically composite two players onto the background.

    Sends: background image + both player crops + reference composite + prompt.
    Gets back: photorealistic composite with proper lighting/shadows/perspective.

    Returns output_path on success, None on failure.
    """
    from django.conf import settings

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        logger.error("GOOGLE_API_KEY not configured — cannot run Gemini composite")
        return None

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.error("google-genai package not installed")
        return None

    client = genai.Client(api_key=api_key)

    # Read image bytes
    bg_bytes = bg_path.read_bytes()
    home_bytes = home_cropped_path.read_bytes()
    legacy_bytes = legacy_cropped_path.read_bytes()
    ref_bytes = reference_composite_path.read_bytes()

    prompt = (
        "Create a photorealistic composite image in PORTRAIT orientation (9:16, 1080x1920px).\n\n"
        "TASK:\n"
        "Take the two football players (cropped from hips up) and place them realistically "
        "on the background image. They should look like they are actually standing there, "
        "photographed by a professional camera with cinematic lighting.\n\n"
        "LAYOUT & COMPOSITION (CRITICAL):\n"
        "- The background fills the entire frame (portrait 9:16)\n"
        "- Players MUST be anchored to the BOTTOM of the frame. DO NOT CENTER VERTICALLY.\n"
        "- We prefer 'lots of sky' over 'floating players'.\n"
        "- Player 1 (legacy kit - Image 2) stands on the LEFT side, facing slightly right\n"
        "- Player 2 (current kit - Image 3) stands on the RIGHT side, facing slightly left\n"
        "- They stand close together, about shoulder-width apart\n"
        "- Image 4 shows the approximate desired composition/positioning - follow this closely for scale.\n\n"
        "LIGHTING & ATMOSPHERE:\n"
        "- Cinematic lighting with dramatic rim light on the players.\n"
        "- Subtle volumetric fog or atmosphere to blend players into the scene.\n"
        "- Match the lighting direction and color temperature of the background stadium.\n"
        "- Add realistic shadows on the ground/background behind players.\n\n"
        "REALISM REQUIREMENTS:\n"
        "- Correct perspective — players should look like they belong in the scene\n"
        "- Preserve the exact appearance, face, skin tone from the player images\n"
        "- Preserve the exact kit/clothing details from the player images\n"
        "- Natural depth of field — slight background blur if appropriate\n"
        "- No text, no logos, no overlays — just the composite photo\n\n"
        "IMPORTANT:\n"
        "- Do NOT change the players' poses or faces\n"
        "- Do NOT add any elements not in the source images (no fake legs)\n"
        "- The output must be photorealistic, as if taken with a real camera\n"
    )

    content_parts: list = [prompt]
    # Image 1: Background
    content_parts.append(types.Part.from_bytes(data=bg_bytes, mime_type="image/png"))
    # Image 2: Legacy player (cropped, mirrored)
    content_parts.append(types.Part.from_bytes(data=legacy_bytes, mime_type="image/png"))
    # Image 3: Home player (cropped)
    content_parts.append(types.Part.from_bytes(data=home_bytes, mime_type="image/png"))
    # Image 4: Reference composite (rough PIL placement)
    content_parts.append(types.Part.from_bytes(data=ref_bytes, mime_type="image/png"))

    try:
        response = client.models.generate_content(
            model="models/nano-banana-pro-preview",
            contents=content_parts,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        if (
            not response.candidates
            or not response.candidates[0].content
            or not response.candidates[0].content.parts
        ):
            block_reason = getattr(response, "prompt_feedback", None)
            logger.warning(
                "Empty Gemini response for photo composite of %s (block=%s)",
                member_name,
                block_reason,
            )
            return None

        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                output_path.write_bytes(part.inline_data.data)
                logger.info("Gemini composite generated for %s → %s", member_name, output_path)
                return output_path

        logger.warning("No image data in Gemini response for %s", member_name)
        return None

    except Exception:
        logger.exception("Gemini composite failed for %s", member_name)
        return None


def _crop_composite_upper_body(image_bytes: bytes) -> bytes:
    """Crop a photo composite to upper body only (no legs).

    Crops the bottom portion of the image to ensure no legs are visible.
    Keeps approximately the top 65% of the image, which should show:
    - Head, shoulders, chest, arms, stomach/navel area
    - No hips, thighs, legs, or feet

    Returns cropped image as PNG bytes.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

    # Keep top 65% of the image (removes bottom 35% where legs would be)
    crop_h = int(img.height * 0.65)
    cropped = img.crop((0, 0, img.width, crop_h))

    # Resize back to 9:16 portrait format to maintain MiniMax input requirements
    # Target: 1080x1920 → after crop we need to scale back
    target_w = 1080
    target_h = 1920

    # Create new canvas at target size with background
    result = Image.new("RGB", (target_w, target_h), (0, 0, 0))

    # Scale cropped image to fit width, position in upper portion
    scale = target_w / cropped.width
    new_w = target_w
    new_h = int(cropped.height * scale)
    cropped_scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Position at top of frame (players visible from navel up)
    y_offset = int((target_h - new_h) * 0.3)  # Slightly above center
    result.paste(
        cropped_scaled, (0, y_offset), cropped_scaled if cropped_scaled.mode == "RGBA" else None
    )

    output = io.BytesIO()
    result.save(output, format="PNG", quality=95)
    return output.getvalue()


def _minimax_generate_video(
    composite_image_path: Path,
    member_name: str,
    output_path: Path,
) -> Path | None:
    """Use MiniMax to generate a 6s video from the composite image.

    The video shows the two players slowly turning their heads to look at
    each other, smiling, then looking forward again.

    Returns output_path on success, None on failure.
    """
    from django.conf import settings

    api_key = getattr(settings, "MINIMAX_API_KEY", None)
    group_id = getattr(settings, "MINIMAX_GROUP_ID", None)
    if not api_key or not group_id:
        logger.error("MINIMAX_API_KEY / MINIMAX_GROUP_ID not configured")
        return None

    from src.generative.services.minimax_client import MiniMaxClient

    prompt = (
        "A cinematic portrait video of two football players standing side by side "
        "on a football pitch. "
        "BODIES ARE PERFECTLY STILL like statues from the neck down. No leaning, no swaying, no shoulder movement. "
        "THE MAIN ACTION: Both players MUST slowly turn their FACES to look at each other. This is the entire point of the video. "
        "ONLY the faces rotate slowly on their necks — HORIZONTAL rotation only (yaw, left-right like saying no). "
        "Left person's face turns slowly to the right, right person's face turns slowly to the left — they look sideways at each other and smile. "
        "Chins stay level. No vertical head movement, no nodding. "
        "After smiling at each other, faces slowly rotate back to face the camera. "
        "The camera is completely static. The ONLY movement is the faces rotating slowly. Bodies frozen. "
        "No special effects, no blur, no glow, no particles, no filters. Photorealistic — like a real camera recording. "
        "Smooth, slow, natural motion. 6 seconds."
    )

    # Read and crop composite to ensure no legs visible
    raw_image_bytes = composite_image_path.read_bytes()
    image_bytes = _crop_composite_upper_body(raw_image_bytes)
    logger.info("Cropped composite for MiniMax input: %s → %d bytes", member_name, len(image_bytes))

    try:
        client = MiniMaxClient(
            api_key=api_key,
            group_id=group_id,
            timeout=120.0,
            poll_interval=8.0,
            max_wait=600.0,
        )
        result = client.generate_video(
            prompt=prompt,
            image=image_bytes,
            model="video-01",
        )

        video_bytes = result.get("video_bytes")
        if not video_bytes:
            logger.warning("MiniMax returned no video bytes for %s", member_name)
            return None

        output_path.write_bytes(video_bytes)
        size_mb = len(video_bytes) / (1024 * 1024)
        logger.info(
            "MiniMax video generated for %s: %.1f MB → %s",
            member_name,
            size_mb,
            output_path,
        )
        return output_path

    except Exception:
        logger.exception("MiniMax video generation failed for %s", member_name)
        return None


def _rvm_remove_background(
    input_video: Path,
    output_video: Path,
) -> Path | None:
    """Remove background from MiniMax video using RVM.

    Returns path to transparent MOV (ProRes 4444 + alpha) on success.
    """
    from src.video.services.rvm_processor import is_rvm_available, process_video_rvm

    if not is_rvm_available():
        logger.error("RVM not available (torch not installed)")
        return None

    try:
        metrics = process_video_rvm(
            input_path=input_video,
            output_path=output_video,
            downsample_ratio=0.35,
            portrait=True,
            output_format="mov",  # ProRes 4444 with alpha — most reliable
            model_name="mobilenetv3",
            target_width=WIDTH,
            target_height=HEIGHT,
        )
        logger.info(
            "RVM bg removal complete: %d frames in %.1fs (%.1f ms/frame)",
            metrics.get("frame_count", 0),
            metrics.get("total_time_s", 0),
            metrics.get("avg_ms_per_frame", 0),
        )
        return output_video

    except Exception:
        logger.exception("RVM background removal failed")
        return None


def _ffmpeg_overlay_on_background(
    transparent_video: Path,
    bg_path: Path,
    header_path: Path,
    sponsor_path: Path | None,
    name: str,
    brand_color: str | None,
    output_path: Path,
) -> Path | None:
    """Overlay transparent RVM video on consistent background + header + name + sponsor.

    Uses FFmpeg to compose all layers:
    1. Background (scaled/cropped to 1080×1920, slightly darkened)
    2. Header at top
    3. Transparent player video (centered in content area)
    4. Name label bar with brand color
    5. Sponsor logo (optional)
    """
    ffmpeg = _get_ffmpeg_path()

    # Pre-render the background frame with header, name, and sponsor (PIL)
    # This avoids complex FFmpeg filter chains
    from src.video.services.header_generator import (
        _hex_to_rgba,
        get_font,
    )

    bg = Image.open(bg_path).convert("RGBA")
    if bg.width > bg.height:
        bg = bg.transpose(Image.Transpose.ROTATE_90)
    scale_factor = max(WIDTH / bg.width, HEIGHT / bg.height)
    bg = bg.resize(
        (int(bg.width * scale_factor), int(bg.height * scale_factor)),
        Image.Resampling.LANCZOS,
    )
    left = (bg.width - WIDTH) // 2
    top = (bg.height - HEIGHT) // 2
    bg = bg.crop((left, top, left + WIDTH, top + HEIGHT))

    # Darken
    darken = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 40))
    bg = Image.alpha_composite(bg, darken)

    # Header
    header = Image.open(header_path).convert("RGBA")
    bg.paste(header, (0, 0), header)

    # Name label bar at bottom of content area
    content_bottom = HEADER_HEIGHT + CONTENT_HEIGHT
    draw = ImageDraw.Draw(bg)
    brand_hex = (brand_color or "#D2122E").lstrip("#")
    brand_rgba = _hex_to_rgba(f"#{brand_hex}") if brand_color else (210, 18, 46, 255)
    label_y = content_bottom - NAME_LABEL_H - 10
    label_box_h = 80
    label_bg = Image.new("RGBA", (WIDTH, label_box_h), (*brand_rgba[:3], 220))
    bg.paste(label_bg, (0, label_y), label_bg)
    draw = ImageDraw.Draw(bg)
    font = get_font(72, bold=True)
    text_bbox = draw.textbbox((0, 0), name.upper(), font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    text_x = (WIDTH - text_w) // 2
    text_y = label_y + (label_box_h - text_h) // 2
    draw.text((text_x + 2, text_y + 2), name.upper(), fill=(0, 0, 0, 128), font=font)
    draw.text((text_x, text_y), name.upper(), fill=(255, 255, 255, 255), font=font)

    # Sponsor
    if sponsor_path and sponsor_path.exists():
        sponsor_img = Image.open(sponsor_path).convert("RGBA")
        sponsor_w = int(WIDTH * 0.22)
        aspect = sponsor_img.width / sponsor_img.height
        sponsor_img = sponsor_img.resize(
            (sponsor_w, int(sponsor_w / aspect)),
            Image.Resampling.LANCZOS,
        )
        spx = SPONSOR_MARGIN + SPONSOR_PAD
        spy = HEIGHT - SPONSOR_BOX_H - SPONSOR_MARGIN + SPONSOR_PAD
        sponsor_box = Image.new(
            "RGBA",
            (sponsor_w + 2 * SPONSOR_PAD, SPONSOR_BOX_H),
            (144, 238, 144, 220),
        )
        bg.paste(
            sponsor_box,
            (SPONSOR_MARGIN, HEIGHT - SPONSOR_BOX_H - SPONSOR_MARGIN),
            sponsor_box,
        )
        bg.paste(sponsor_img, (spx, spy), sponsor_img)

    # Save background frame
    bg_frame_path = output_path.parent / f"{output_path.stem}_bg.png"
    bg = bg.convert("RGB")
    bg.save(str(bg_frame_path), "PNG")

    # Use ffprobe to get transparent video duration
    dur = _probe_duration(transparent_video)
    if dur <= 0:
        dur = PHOTO_CLIP_DURATION

    # FFmpeg: loop background image + overlay transparent video
    # The transparent MOV (ProRes 4444) has alpha, so overlay works directly.
    # Position the video in the content area BELOW the header so the header
    # is always visible. Cover-crop the video to fill the content area,
    # trimming top/bottom as needed to fit portrait mode.
    content_h = CONTENT_HEIGHT  # area between header and name/sponsor zone
    cmd = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        str(bg_frame_path),  # input 0: background frame
        "-i",
        str(transparent_video),  # input 1: transparent player video
        "-filter_complex",
        (
            f"[0:v]scale={WIDTH}:{HEIGHT},setsar=1,format=yuva420p[bg];"
            f"[1:v]scale={WIDTH}:{content_h}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{content_h},setsar=1,format=yuva420p[fg];"
            f"[bg][fg]overlay=0:{HEADER_HEIGHT}:format=auto,format=yuv420p[out]"
        ),
        "-map",
        "[out]",
        "-t",
        f"{dur:.2f}",
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
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)  # noqa: S603
    if result.returncode != 0:
        logger.error("FFmpeg overlay failed: %s", result.stderr[-2000:])
        return None

    logger.info("FFmpeg overlay complete → %s (%.1fs)", output_path, dur)
    return output_path


def compose_photo_composite_video(
    members: list[MemberPhotoComposite],
    background_url: str,
    logo_url: str | None,
    team_name: str,
    season_name: str | None,
    brand_color: str | None,
    sponsor_url: str | None = None,
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose a photo composite compilation from pre-processed transparent member videos.

    This is Step 5 of the modular pipeline. All AI processing (Gemini composite,
    MiniMax video, RVM bg removal) has already been done at the member level.
    This function only does:

    1. Download each member's transparent video (RVM-processed, has alpha channel)
    2. FFmpeg overlay on consistent background + header + name label + sponsor
    3. Concatenate all member clips with crossfade transitions
    4. Fade out at the end

    Args:
        members: List of MemberPhotoComposite with transparent_video_url.
        background_url: Club/stadium background image URL.
        logo_url: Club logo URL (header).
        team_name: Team name for header.
        season_name: Season/period name for header.
        brand_color: Brand hex color.
        sponsor_url: Optional sponsor logo URL.
        output_dir: Output directory.
        progress_callback: Optional fn(percent: int).

    Returns:
        Path to the composed MP4 file.
    """
    ffmpeg = _get_ffmpeg_path()

    tmp_dir = Path(tempfile.mkdtemp(prefix="photo_composite_"))
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

    # ── 2. Render header ──
    header_path = _render_header(logo_url, team_name, season_name, brand_color, asset_dir)

    # ── 2b. Download sponsor logo (optional) ──
    sponsor_path: Path | None = None
    if sponsor_url:
        _sp = asset_dir / "sponsor.png"
        if _download_file(sponsor_url, _sp):
            sponsor_path = _sp

    # ── 3. Process each member: download transparent video → FFmpeg overlay ──
    total = len(members)
    clip_paths: list[Path] = []
    member_pct = 75  # percent allocated to member processing

    for idx, member in enumerate(members):
        member_start_pct = int(idx / total * member_pct)
        if progress_callback:
            progress_callback(member_start_pct)

        logger.info("Photo composite overlay %d/%d: %s", idx + 1, total, member.name)

        # Download the pre-processed transparent video
        # Try .mov first (ProRes 4444 with alpha), fall back to .mp4
        ext = ".mov" if member.transparent_video_url.endswith(".mov") else ".mp4"
        transparent_path = clips_dir / f"m{idx}_transparent{ext}"
        if not _download_file(member.transparent_video_url, transparent_path):
            logger.warning("Skipping %s: failed to download transparent video", member.name)
            continue

        # FFmpeg overlay on consistent background + header + name + sponsor
        final_clip = clips_dir / f"clip_{idx:03d}.mp4"
        overlay_result = _ffmpeg_overlay_on_background(
            transparent_video=transparent_path,
            bg_path=bg_path,
            header_path=header_path,
            sponsor_path=sponsor_path,
            name=member.name,
            brand_color=brand_color,
            output_path=final_clip,
        )
        if not overlay_result:
            logger.warning("Skipping %s: FFmpeg overlay failed", member.name)
            continue

        clip_paths.append(final_clip)
        logger.info(
            "Photo composite overlay complete for %s (%d/%d)",
            member.name,
            idx + 1,
            total,
        )

    if not clip_paths:
        raise ValueError("No member clips were successfully overlaid.")

    if progress_callback:
        progress_callback(member_pct)

    # ── 4. Concatenate clips with crossfade transitions ──
    joined_output = output_dir / "photo_composite_joined.mp4"
    final_output = output_dir / "then_vs_now_compilation.mp4"

    if len(clip_paths) == 1:
        import shutil

        shutil.copy2(str(clip_paths[0]), str(joined_output))
    else:
        durations = [_probe_duration(p) for p in clip_paths]
        logger.info(
            "Photo composite clip durations for xfade: %s",
            [f"{d:.1f}s" for d in durations],
        )

        input_args: list[str] = []
        for clip in clip_paths:
            input_args += ["-i", str(clip)]

        fc_parts: list[str] = []
        for i in range(len(clip_paths)):
            fc_parts.append(f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p,setsar=1[v{i}]")

        cumulative_dur = durations[0]
        prev_label = "v0"
        for i in range(1, len(clip_paths)):
            offset = max(0.1, cumulative_dur - XFADE_DURATION)
            out_label = f"xv{i}"
            fc_parts.append(
                f"[{prev_label}][v{i}]xfade="
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
            str(joined_output),
        ]

        logger.info(
            "Concatenating %d photo composite clips with %.1fs crossfade",
            len(clip_paths),
            XFADE_DURATION,
        )
        result = subprocess.run(
            concat_cmd, capture_output=True, text=True, timeout=600
        )  # noqa: S603
        if result.returncode != 0:
            logger.warning(
                "xfade failed, falling back to simple concat: %s",
                result.stderr[-1000:],
            )
            concat_file = tmp_dir / "concat.txt"
            with open(concat_file, "w", encoding="utf-8") as f:
                for path in clip_paths:
                    safe_path = str(path).replace("\\", "/")
                    f.write(f"file '{safe_path}'\n")
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
                str(joined_output),
            ]
            result = subprocess.run(
                fallback_cmd, capture_output=True, text=True, timeout=600
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
        "Photo composite compilation complete: %s (%d members, FFmpeg-only)",
        final_output,
        len(clip_paths),
    )
    return final_output

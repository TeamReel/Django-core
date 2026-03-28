"""Goal Celebration Video Composer.

Creates a goal celebration announcement video with:
- Field background (same as lineup)
- Header overlay saying "GOAL UPDATE" instead of "STARTING XI"
- Score display (animated)
- Goal scorer fullbody/celebration video overlay
- Scorer name + jersey number text
- Sponsor box overlay

All assets are downloaded from S3 presigned URLs to a local temp dir.
FFmpeg compositing produces the final video.

Video structure (9:16 vertical, 1080×1920):
  Phase 1: Header + score reveal (3s)
  Phase 2: Celebration video/fullbody with flickering score text (5s)
  Phase 3: Final hold with all info (2s)
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
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
    SPONSOR_W,
    download_file,
    get_ffmpeg_path,
    resolve_brand_color,
    resolve_ffmpeg_font_path,
    run_ffmpeg,
)

if TYPE_CHECKING:
    from src.video.services.goal_celebration_builder import GoalCelebrationData

logger = logging.getLogger(__name__)


# ── Video / canvas settings ──
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT
FPS = CANVAS_FPS

# ── Scorer sizing ──
SCORER_SCALE = 0.55  # fraction of HEIGHT for fullbody
CELEBRATION_SCALE = 0.60  # fraction of HEIGHT for celebration video

# ── Score text ──
SCORE_FONTSIZE = 120
SCORE_Y_PCT = 0.55  # vertical position of score text (% of HEIGHT)
SCORER_NAME_FONTSIZE = 48
SCORER_NAME_Y_OFFSET = 50  # px below score

# ── Sponsor box (from _common) ──


def _get_ffmpeg_path() -> str:
    return get_ffmpeg_path()


def _resolve_font_path() -> str:
    return resolve_ffmpeg_font_path()


FONT_PATH = resolve_ffmpeg_font_path()


_download_file = download_file


_run_ffmpeg = run_ffmpeg


_resolve_brand_color = resolve_brand_color


def ffmpeg_escape(text: str) -> str:
    """Escape text for FFmpeg drawtext filter."""
    return text.replace("'", "").replace("\\", "\\\\").replace(":", "\\:")


def compose_goal_celebration_video(
    data: "GoalCelebrationData",
    output_dir: Path | None = None,
    progress_callback=None,
) -> Path:
    """Compose goal celebration video from GoalCelebrationData.

    Args:
        data: Fully resolved scorer data, brand assets, match info
        output_dir: Where to write the final MP4. Uses tempfile if None.
        progress_callback: Optional fn(percent: int) for progress updates.

    Returns:
        Path to the composed MP4 file.
    """
    # Create working dirs
    tmp_dir = Path(tempfile.mkdtemp(prefix="goal_celebration_"))
    asset_dir = tmp_dir / "assets"
    asset_dir.mkdir()

    if output_dir is None:
        output_dir = tmp_dir

    # ── 1. Download brand assets ──
    logger.info("Downloading brand assets for goal celebration...")
    bg_path = asset_dir / "field_background.jpg"
    header_path = asset_dir / "header.png"
    sponsor_path = asset_dir / "sponsor.png"

    if not data.field_background_url:
        logger.warning(
            "No stadium_background BrandAsset — generating synthetic field background",
            extra={"activity_id": str(getattr(data, "activity_id", None))},
        )
        from src.video.services.header_generator import generate_field_background

        data.field_background_url = generate_field_background(
            width=WIDTH, height=HEIGHT - HEADER_HEIGHT
        )

    if not _download_file(data.field_background_url, bg_path):
        raise ValueError("Failed to download field background image.")

    bg_check = Image.open(bg_path)
    bg_is_landscape = bg_check.width > bg_check.height
    bg_check.close()

    # Resolve brand color
    brand_primary_hex = _resolve_brand_color(data.activity_id)

    # Generate header with "GOAL UPDATE" title
    from src.video.services.header_generator import generate_header_image

    header_url = generate_header_image(
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
        background_color=brand_primary_hex,
        title_text="GOAL UPDATE",
    )
    if not _download_file(header_url, header_path):
        from urllib.parse import urlparse

        parsed = urlparse(header_url)
        if parsed.scheme == "file":
            src = parsed.path
            if src.startswith("/") and len(src) > 2 and src[2] == ":":
                src = src[1:]
            shutil.copy(src, header_path)
        else:
            raise ValueError("Failed to download generated header image.")

    has_sponsor = False
    if data.sponsor_url:
        if _download_file(data.sponsor_url, sponsor_path):
            try:
                from src.generative.services.asset_pipeline import _strip_checkerboard

                sp_img = Image.open(sponsor_path).convert("RGBA")
                sp_img = _strip_checkerboard(sp_img)
                bbox = sp_img.getchannel("A").getbbox()
                if bbox:
                    sp_img = sp_img.crop(bbox)
                sp_img.save(str(sponsor_path), "PNG")
                has_sponsor = True
            except Exception:  # noqa: BLE001
                has_sponsor = True
                logger.warning("sponsor_bg_cleanup failed, using raw file")

    if progress_callback:
        progress_callback(15)

    # ── 2. Download scorer assets ──
    logger.info("Downloading scorer assets...")
    scorer_celebration_path = None
    scorer_fullbody_path = None

    if data.scorer_celebration_url:
        # Determine extension from URL
        url_lower = data.scorer_celebration_url.lower()
        if ".mov" in url_lower:
            ext = ".mov"
        elif ".webm" in url_lower:
            ext = ".webm"
        else:
            ext = ".mp4"
        dest = asset_dir / f"celebration{ext}"
        if _download_file(data.scorer_celebration_url, dest):
            scorer_celebration_path = dest
        else:
            logger.warning("Failed to download celebration video for %s", data.scorer_name)

    if data.scorer_kit_url:
        dest = asset_dir / "fullbody.png"
        if _download_file(data.scorer_kit_url, dest):
            scorer_fullbody_path = dest

    if data.scorer_closeup_url:
        dest = asset_dir / "closeup.png"
        _download_file(data.scorer_closeup_url, dest)

    if not scorer_celebration_path and not scorer_fullbody_path:
        raise ValueError(
            f"No celebration or fullbody asset found for scorer {data.scorer_name}. "
            "Upload a celebration video or fullbody image."
        )

    if progress_callback:
        progress_callback(30)

    # ── 3. Compose the video ──
    # Build score text
    score_text = f"{data.score_home} - {data.score_away}"
    jersey_text = ""
    if data.scorer_jersey_number:
        jersey_text = f"#{data.scorer_jersey_number}"

    # Determine total duration
    # Phase 1: Header + score reveal (3s)
    # Phase 2: Celebration (dynamic based on video length, min 4s)
    # Phase 3: Final hold (2s)
    celebration_duration = 5.0  # default if using static image
    if scorer_celebration_path:
        # Probe the video duration
        try:
            # Use ffprobe if available, otherwise use ffmpeg
            ffprobe_path = _get_ffmpeg_path().replace("ffmpeg", "ffprobe").replace("\\:", ":")
            result = subprocess.run(
                [
                    ffprobe_path,
                    "-i",
                    str(scorer_celebration_path),
                    "-show_entries",
                    "format=duration",
                    "-v",
                    "quiet",
                    "-of",
                    "csv=p=0",
                ],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            if result.returncode == 0 and result.stdout.strip():
                celebration_duration = max(4.0, float(result.stdout.strip()))
        except Exception:  # noqa: BLE001
            celebration_duration = 5.0

    phase1_dur = 3.0
    phase2_dur = celebration_duration
    phase3_dur = 2.0
    total_dur = phase1_dur + phase2_dur + phase3_dur

    ffmpeg = _get_ffmpeg_path()
    output_path = output_dir / "goal_celebration.mp4"

    # Build FFmpeg command with a single complex filter
    input_args = []
    fc = []

    # Input 0: Background
    input_args += ["-loop", "1", "-i", str(bg_path)]
    # Input 1: Header
    input_args += ["-loop", "1", "-i", str(header_path)]
    # Input 2: Celebration video or fullbody image
    if scorer_celebration_path:
        input_args += ["-i", str(scorer_celebration_path)]
    elif scorer_fullbody_path:
        input_args += ["-loop", "1", "-i", str(scorer_fullbody_path)]

    # Input 3: Sponsor (if available)
    sponsor_idx = None
    if has_sponsor:
        input_args += ["-loop", "1", "-i", str(sponsor_path)]
        sponsor_idx = 3

    # ── Build filter complex ──

    # Scale background to fill canvas
    if bg_is_landscape:
        # Rotate landscape → portrait, then crop
        fc.append(
            f"[0:v]transpose=1,scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{HEIGHT},setsar=1[bg]"
        )
    else:
        fc.append(
            f"[0:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
            f"crop={WIDTH}:{HEIGHT},setsar=1[bg]"
        )

    # Scale header
    fc.append(f"[1:v]scale={WIDTH}:{HEADER_HEIGHT},setsar=1[hdr]")

    # Overlay header on background
    fc.append("[bg][hdr]overlay=0:0[bg_hdr]")

    # Scale celebration/fullbody and overlay centered
    if scorer_celebration_path:
        cel_h = int(HEIGHT * CELEBRATION_SCALE)
        # Scale to fit height, center horizontally
        fc.append(
            f"[2:v]scale=-1:{cel_h}:force_original_aspect_ratio=decrease,"
            f"format=rgba,setsar=1[cel]"
        )
        # Overlay celebration video centered, below header
        cel_y = int(HEIGHT * 0.18)
        fc.append(f"[bg_hdr][cel]overlay=(W-w)/2:{cel_y}:shortest=0[bg_cel]")
    elif scorer_fullbody_path:
        fb_h = int(HEIGHT * SCORER_SCALE)
        fc.append(
            f"[2:v]scale=-1:{fb_h}:force_original_aspect_ratio=decrease,"
            f"format=rgba,setsar=1[fb]"
        )
        fb_y = int(HEIGHT * 0.22)
        fc.append(f"[bg_hdr][fb]overlay=(W-w)/2:{fb_y}[bg_cel]")

    prev_label = "bg_cel"

    # Sponsor overlay (bottom-left)
    if sponsor_idx is not None:
        fc.append(
            f"[{sponsor_idx}:v]scale={SPONSOR_W}:-1:force_original_aspect_ratio=decrease,"
            f"format=rgba,setsar=1[sp]"
        )
        sp_x = SPONSOR_MARGIN
        sp_y = HEIGHT - SPONSOR_BOX_H - SPONSOR_MARGIN
        fc.append(f"[{prev_label}][sp]overlay={sp_x}:{sp_y}[bg_sp]")
        prev_label = "bg_sp"

    # ── Score text overlay (with flicker animation) ──
    # Score appears at SCORE_Y_PCT, flickers for first 2 seconds, then stays solid
    score_y = int(HEIGHT * SCORE_Y_PCT)
    score_safe = ffmpeg_escape(score_text)

    # Flicker effect: alpha oscillates between 0.3 and 1.0 for first 2 seconds
    flicker_alpha = "'if(lt(t,2), 0.3+0.7*abs(sin(t*8)), 1)'"

    fc.append(
        f"[{prev_label}]drawtext="
        f"fontfile='{FONT_PATH}':"
        f"text='{score_safe}':"
        f"fontcolor=white:"
        f"fontsize={SCORE_FONTSIZE}:"
        f"x=(w-text_w)/2:"
        f"y={score_y}:"
        f"alpha={flicker_alpha}:"
        f"borderw=4:bordercolor=black"
        f"[bg_score]"
    )
    prev_label = "bg_score"

    # Scorer name below score
    name_y = score_y + SCORE_FONTSIZE + SCORER_NAME_Y_OFFSET
    jersey_label = f"{jersey_text} " if jersey_text else ""
    full_scorer_label = ffmpeg_escape(f"{jersey_label}{data.scorer_name.upper()}")

    # Name fades in after 1 second
    name_alpha = "'if(lt(t,1), 0, min((t-1)/0.5, 1))'"

    fc.append(
        f"[{prev_label}]drawtext="
        f"fontfile='{FONT_PATH}':"
        f"text='{full_scorer_label}':"
        f"fontcolor=white:"
        f"fontsize={SCORER_NAME_FONTSIZE}:"
        f"x=(w-text_w)/2:"
        f"y={name_y}:"
        f"alpha={name_alpha}:"
        f"borderw=3:bordercolor=black"
        f"[bg_name]"
    )
    prev_label = "bg_name"

    # DOELPUNT! / GOAL! text above score (big, animated)
    goal_text = ffmpeg_escape("DOELPUNT!")
    goal_y = score_y - 80
    goal_alpha = "'if(lt(t,0.5), 0, if(lt(t,3), 0.3+0.7*abs(sin(t*6)), 1))'"

    fc.append(
        f"[{prev_label}]drawtext="
        f"fontfile='{FONT_PATH}':"
        f"text='{goal_text}':"
        f"fontcolor=yellow:"
        f"fontsize=64:"
        f"x=(w-text_w)/2:"
        f"y={goal_y}:"
        f"alpha={goal_alpha}:"
        f"borderw=3:bordercolor=black"
        f"[out]"
    )

    filter_complex = ";".join(fc)

    # Build full command
    cmd = [
        ffmpeg,
        "-y",
        "-threads",
        "2",
        *input_args,
        "-filter_complex",
        filter_complex,
        "-map",
        "[out]",
        "-t",
        str(total_dur),
        "-r",
        str(FPS),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output_path),
    ]

    if progress_callback:
        progress_callback(50)

    _run_ffmpeg(cmd, "Goal celebration composition")

    if progress_callback:
        progress_callback(90)

    logger.info("Goal celebration video composed: %s (%.1fs)", output_path, total_dur)
    return output_path

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

Video structure (9:16 vertical, 1080Ã—1920):
  Phase 1: Header + score reveal (3s)
  Phase 2: Celebration video/fullbody with flickering score text (5s)
  Phase 3: Final hold with all info (2s)
"""

from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

from src.video.services._common import (
    CANVAS_FPS,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    HEADER_HEIGHT,
    SPONSOR_BOX_H,
    SPONSOR_MARGIN,
    SPONSOR_W,
    download_file,
    ffmpeg_escape,
    get_ffmpeg_path,
    prepare_background,
    prepare_sponsor,
    probe_duration,
    resolve_ffmpeg_font_path,
    run_ffmpeg,
)

if TYPE_CHECKING:
    from src.video.services.goal_celebration_builder import GoalCelebrationData

logger = logging.getLogger(__name__)


# â”€â”€ Video / canvas settings â”€â”€
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT
FPS = CANVAS_FPS

# â”€â”€ Scorer sizing â”€â”€
SCORER_SCALE = 0.55  # fraction of HEIGHT for fullbody
CELEBRATION_SCALE = 0.60  # fraction of HEIGHT for celebration video

# â”€â”€ Score text â”€â”€
SCORE_FONTSIZE = 120
SCORE_Y_PCT = 0.55  # vertical position of score text (% of HEIGHT)
SCORER_NAME_FONTSIZE = 48
SCORER_NAME_Y_OFFSET = 50  # px below score

# â”€â”€ Sponsor box (from _common) â”€â”€

FONT_PATH = resolve_ffmpeg_font_path()


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

    # â”€â”€ 1. Download brand assets â”€â”€
    logger.info("Downloading brand assets for goal celebration...")
    bg_path = asset_dir / "field_background.jpg"
    header_path = asset_dir / "header.png"
    sponsor_path = asset_dir / "sponsor.png"

    if not data.field_background_url:
        logger.warning(
            "No stadium_background BrandAsset â€” generating synthetic field background",
            extra={"activity_id": str(getattr(data, "activity_id", None))},
        )
        from src.video.services.header_generator import generate_field_background

        from src.video.services._common import FALLBACK_BG_VIDEO

        data.field_background_url = generate_field_background(
            width=FALLBACK_BG_VIDEO[0], height=FALLBACK_BG_VIDEO[1]
        )

    bg_is_landscape = prepare_background(data.field_background_url, bg_path)

    # Resolve brand color from builder data
    brand_primary_hex = data.brand_primary

    # Generate header with "GOAL UPDATE" title (direct PIL, no S3 round-trip)
    from src.video.services.header_generator import render_header_pil

    header_img = render_header_pil(
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
    header_img.convert("RGB").save(str(header_path), "PNG")

    has_sponsor = prepare_sponsor(data.sponsor_url, sponsor_path)

    if progress_callback:
        progress_callback(15)

    # â”€â”€ 2. Download scorer assets â”€â”€
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
        if download_file(data.scorer_celebration_url, dest):
            scorer_celebration_path = dest
        else:
            logger.warning("Failed to download celebration video for %s", data.scorer_name)

    if data.scorer_kit_url:
        dest = asset_dir / "fullbody.png"
        if download_file(data.scorer_kit_url, dest):
            scorer_fullbody_path = dest

    if data.scorer_closeup_url:
        dest = asset_dir / "closeup.png"
        download_file(data.scorer_closeup_url, dest)

    if not scorer_celebration_path and not scorer_fullbody_path:
        raise ValueError(
            f"No celebration or fullbody asset found for scorer {data.scorer_name}. "
            "Upload a celebration video or fullbody image."
        )

    if progress_callback:
        progress_callback(30)

    # â”€â”€ 3. Compose the video â”€â”€
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
        celebration_duration = max(4.0, probe_duration(scorer_celebration_path, default=5.0))

    phase1_dur = 3.0
    phase2_dur = celebration_duration
    phase3_dur = 2.0
    total_dur = phase1_dur + phase2_dur + phase3_dur

    ffmpeg = get_ffmpeg_path()
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

    # â”€â”€ Build filter complex â”€â”€

    # Scale background to fill canvas
    if bg_is_landscape:
        # Rotate landscape â†’ portrait, then crop
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

    # â”€â”€ Score text overlay (with flicker animation) â”€â”€
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

    run_ffmpeg(cmd, "Goal celebration composition")

    if progress_callback:
        progress_callback(90)

    logger.info("Goal celebration video composed: %s (%.1fs)", output_path, total_dur)
    return output_path


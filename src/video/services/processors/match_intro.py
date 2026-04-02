"""Match intro processor for short announcement videos.

Generates a 6-second match announcement video with:
- Shared header (same as lineup / match flyer)
- Brand-colored background with field image
- Popup text animations: team names, VS, date/time, venue, competition
- Sponsor bar at bottom

Config Schema:
{
    "activity_id": "uuid",
    "output_resolution": "vertical_1080p"   # optional
}
"""

from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from src.video.services._common import (
    CANVAS_FPS,
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    HEADER_HEIGHT,
    download_image,
    get_ffmpeg_path,
    hex_to_rgb,
    prepare_sponsor_pil,
)
from src.video.services.match_intro_builder import MatchIntroData
from src.video.services.processors.base import BaseVideoProcessor

logger = logging.getLogger(__name__)

# ── Output dimensions (portrait 9:16) ──────────────────────────────────────
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT
FPS = CANVAS_FPS
DURATION = 6  # seconds


class MatchIntroProcessor(BaseVideoProcessor):
    """Processor for 6-second match intro announcement videos.

    Creates a composition video with:
    - Header bar (shared render_header_pil)
    - Field background (blurred/darkened)
    - Animated text popups: VS block, date, venue, competition
    - Sponsor logo at bottom
    """

    output_extension = "mp4"

    def _get_storage_prefix(self) -> str | None:
        return "match_intro"

    def _process(self) -> str:
        """Compose match intro video and return output path."""
        config = self.job.config or {}
        return self._compose_match_intro(config)

    def _compose_match_intro(self, config: dict) -> str:
        """Build the 6-second match intro video.

        Strategy:
        1. Render a static background frame (field + header + elements) using PIL
        2. Use FFmpeg to create a 6s video from the static frame
        3. Add text popup animations via FFmpeg drawtext filters

        Returns:
            Path to the composed MP4 file.
        """
        activity_id = config["activity_id"]

        # Gather match data from DB
        from src.video.services.match_intro_builder import MatchIntroBuilder

        data = MatchIntroBuilder(activity_id).gather_data()

        def progress_cb(pct: int) -> None:
            self.job.progress_percent = pct
            self.job.save(update_fields=["progress_percent", "updated_at"])

        progress_cb(10)

        # 1. Render static background frame with header
        frame_path = self._render_background_frame(data)
        progress_cb(40)

        # 2. Build FFmpeg command with drawtext animations
        output_path = str(self.temp_dir / "output.mp4")
        self._compose_with_ffmpeg(frame_path, data, output_path)
        progress_cb(90)

        return output_path

    def _render_background_frame(self, data: MatchIntroData) -> str:
        """Render the static background frame with header, logos, and VS block.

        Returns path to the rendered PNG frame.
        """
        from src.video.services.header_generator import (
            clean_logo_alpha,
            render_header_pil,
        )

        primary_rgb = hex_to_rgb(data.brand_primary)

        # Background: field image or dark gradient
        bg_img = download_image(data.field_background_url)
        if bg_img:
            bg_img = bg_img.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
            # Darken for text readability
            overlay = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
            bg_img = Image.blend(bg_img, overlay, alpha=0.5)
        else:
            # Dark gradient with brand color tint
            bg_img = Image.new("RGB", (WIDTH, HEIGHT), (15, 15, 25))
            draw_bg = ImageDraw.Draw(bg_img)
            # Brand color gradient at top
            for i in range(400):
                alpha_frac = 1 - (i / 400)
                r = int(primary_rgb[0] * alpha_frac * 0.3)
                g = int(primary_rgb[1] * alpha_frac * 0.3)
                b = int(primary_rgb[2] * alpha_frac * 0.3)
                draw_bg.line([(0, i), (WIDTH, i)], fill=(r, g, b))

        canvas = bg_img.copy()

        # Header bar
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

        # Large logos in VS area (static — text will be animated via FFmpeg)
        cx = WIDTH // 2
        logo_size = 260
        home_logo_url = data.logo_url if data.is_home else data.opponent_logo_url
        away_logo_url = data.opponent_logo_url if data.is_home else data.logo_url

        vs_center_y = int(HEIGHT * 0.42)
        left_cx = int(WIDTH * 0.25)
        right_cx = int(WIDTH * 0.75)

        for logo_url, lx in [(home_logo_url, left_cx), (away_logo_url, right_cx)]:
            logo = download_image(logo_url)
            if logo:
                logo = clean_logo_alpha(logo)
                logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
                canvas.paste(
                    logo.convert("RGBA"),
                    (lx - logo.width // 2, vs_center_y - logo.height // 2),
                    logo.convert("RGBA"),
                )

        # Sponsor at bottom (static)
        sponsor_img = prepare_sponsor_pil(data.sponsor_url)
        if sponsor_img:
            sponsor_img.thumbnail((200, 70), Image.Resampling.LANCZOS)
            sx = cx - sponsor_img.width // 2
            canvas.paste(
                sponsor_img.convert("RGBA"),
                (sx, HEIGHT - 120),
                sponsor_img.convert("RGBA"),
            )

        # Brand-colored accent bar in the middle zone (behind VS text)
        draw = ImageDraw.Draw(canvas)
        bar_y = vs_center_y - 5
        draw.rectangle(
            [(cx - 60, bar_y - 40), (cx + 60, bar_y + 40)],
            fill=(*primary_rgb, 200),
        )

        # Save frame
        frame_path = str(self.temp_dir / "frame.png")
        canvas.convert("RGB").save(frame_path, "PNG")
        return frame_path

    def _compose_with_ffmpeg(self, frame_path: str, data: MatchIntroData, output_path: str) -> None:
        """Create 6-second video from static frame with animated text overlays.

        Text animations (popup-in with scale effect simulated via opacity):
        - t=0.5s: "VS" text appears (center)
        - t=1.0s: Home team name (left)
        - t=1.5s: Away team name (right)
        - t=2.5s: Date + Time (bottom center)
        - t=3.0s: Venue (below date)
        - t=3.5s: Competition name (below venue)
        - All text stays until end

        Uses FFmpeg drawtext filter with enable expression for timing.
        """
        ffmpeg = get_ffmpeg_path()

        home_name = (
            data.own_team_name.upper() if data.is_home else data.opponent_name.upper()
        )
        away_name = (
            data.opponent_name.upper() if data.is_home else data.own_team_name.upper()
        )

        date_str = data.match_date or ""
        if data.kickoff_time:
            date_str += f"  |  {data.kickoff_time}"

        venue_str = data.venue or ""
        comp_str = (data.competition_name or "").upper()

        primary_rgb = hex_to_rgb(data.brand_primary)
        primary_hex = "0x{:02X}{:02X}{:02X}".format(*primary_rgb)

        # Escape special characters for FFmpeg drawtext
        def _esc(text: str) -> str:
            return (
                text.replace("\\", "\\\\")
                .replace(":", "\\:")
                .replace("'", "\\'")
                .replace("%", "%%")
            )

        # Build drawtext filter chain
        # fontfile is optional — FFmpeg tries system fonts
        # Using Arial or DejaVu as fallback
        filters = []

        # VS text — appears at t=0.5s with fade-in
        filters.append(
            f"drawtext=text='{_esc('VS')}':"
            f"fontsize=96:fontcolor=white:borderw=5:bordercolor=black:"
            f"x=(w-text_w)/2:y=h*0.40:"
            f"enable='gte(t,0.5)':"
            f"alpha='if(lt(t,0.5),0,min(1,(t-0.5)/0.3))'"
        )

        # Home team name — left side, appears at t=1.0s
        filters.append(
            f"drawtext=text='{_esc(home_name)}':"
            f"fontsize=42:fontcolor=white:borderw=3:bordercolor=black:"
            f"x=w*0.25-text_w/2:y=h*0.55:"
            f"enable='gte(t,1.0)':"
            f"alpha='if(lt(t,1.0),0,min(1,(t-1.0)/0.3))'"
        )

        # Away team name — right side, appears at t=1.5s
        filters.append(
            f"drawtext=text='{_esc(away_name)}':"
            f"fontsize=42:fontcolor=white:borderw=3:bordercolor=black:"
            f"x=w*0.75-text_w/2:y=h*0.55:"
            f"enable='gte(t,1.5)':"
            f"alpha='if(lt(t,1.5),0,min(1,(t-1.5)/0.3))'"
        )

        # Date + time — center bottom, appears at t=2.5s
        if date_str:
            filters.append(
                f"drawtext=text='{_esc(date_str)}':"
                f"fontsize=48:fontcolor=white:borderw=2:bordercolor=black:"
                f"x=(w-text_w)/2:y=h*0.68:"
                f"enable='gte(t,2.5)':"
                f"alpha='if(lt(t,2.5),0,min(1,(t-2.5)/0.3))'"
            )

        # Venue — center, appears at t=3.0s
        if venue_str:
            filters.append(
                f"drawtext=text='{_esc(venue_str)}':"
                f"fontsize=32:fontcolor=0xCCCCCC:borderw=2:bordercolor=black:"
                f"x=(w-text_w)/2:y=h*0.74:"
                f"enable='gte(t,3.0)':"
                f"alpha='if(lt(t,3.0),0,min(1,(t-3.0)/0.3))'"
            )

        # Competition — center, appears at t=3.5s
        if comp_str:
            filters.append(
                f"drawtext=text='{_esc(comp_str)}':"
                f"fontsize=30:fontcolor={primary_hex}:borderw=2:bordercolor=black:"
                f"x=(w-text_w)/2:y=h*0.80:"
                f"enable='gte(t,3.5)':"
                f"alpha='if(lt(t,3.5),0,min(1,(t-3.5)/0.3))'"
            )

        filter_chain = ",".join(filters) if filters else "null"

        cmd = [
            ffmpeg,
            "-y",
            "-loop",
            "1",
            "-i",
            frame_path,
            "-t",
            str(DURATION),
            "-vf",
            filter_chain,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-r",
            str(FPS),
            "-movflags",
            "+faststart",
            output_path,
        ]

        logger.info(
            "Running FFmpeg for match intro",
            extra={"job_id": str(self.job.id), "cmd_length": len(cmd)},
        )

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        if result.returncode != 0:
            logger.error(
                "FFmpeg failed for match intro: %s",
                result.stderr[-2000:] if result.stderr else "no stderr",
            )
            raise RuntimeError(
                f"FFmpeg failed (exit {result.returncode}): "
                f"{result.stderr[-500:] if result.stderr else 'unknown error'}"
            )

        if not os.path.exists(output_path):
            raise RuntimeError("FFmpeg completed but output file not found")

        logger.info(
            "Match intro video composed: %s bytes",
            os.path.getsize(output_path),
        )

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used for match intro processor (custom execute flow)."""
        return []

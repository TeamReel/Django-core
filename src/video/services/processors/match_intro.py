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
import shutil
import subprocess
from pathlib import Path

from django.apps import apps
from django.utils import timezone
from PIL import Image, ImageDraw

from files.models import FileAsset
from files.utils import get_storage_backend
from src.video.models.job import JobStatus
from src.video.services._common import download_image
from src.video.services.processors.base import BaseVideoProcessor, JobCancelledError

logger = logging.getLogger(__name__)

# ── Output dimensions (portrait 9:16) ──────────────────────────────────────
WIDTH = 1080
HEIGHT = 1920
HEADER_HEIGHT = 300
FPS = 30
DURATION = 6  # seconds


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary."""
    bundled_path = Path("/usr/local/ffmpeg/bin/ffmpeg")
    if bundled_path.exists():
        return str(bundled_path)

    legacy_static_path = Path("/usr/local/bin/ffmpeg")
    if legacy_static_path.exists():
        return str(legacy_static_path)

    try:
        import imageio_ffmpeg

        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path:
            return path
    except Exception:  # noqa: BLE001
        pass

    path = shutil.which("ffmpeg")
    if path:
        return path

    return "ffmpeg"


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _download_image(url: str) -> Image.Image | None:
    return download_image(url)


class MatchIntroProcessor(BaseVideoProcessor):
    """Processor for 6-second match intro announcement videos.

    Creates a composition video with:
    - Header bar (shared render_header_pil)
    - Field background (blurred/darkened)
    - Animated text popups: VS block, date, venue, competition
    - Sponsor logo at bottom
    """

    output_extension = "mp4"

    def execute(self):
        """Execute the match intro video processing."""
        self._ensure_temp_dir()
        logger.info(
            "match_intro_processing_started",
            extra={"job_id": str(self.job.id), "job_type": self.job.job_type},
        )

        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        try:
            config = self.job.config or {}
            output_path = self._compose_match_intro(config)

            output_file = self._upload_output(output_path)

            self.job.output_file = output_file
            self.job.status = JobStatus.COMPLETED
            self.job.completed_at = timezone.now()
            self.job.progress_percent = 100
            self.job.save(
                update_fields=[
                    "output_file",
                    "status",
                    "completed_at",
                    "progress_percent",
                    "updated_at",
                ]
            )
            logger.info("match_intro_completed", extra={"job_id": str(self.job.id)})
            return output_file

        except JobCancelledError:
            self.job.refresh_from_db()
            if self.job.status != JobStatus.CANCELLED:
                self.job.status = JobStatus.CANCELLED
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=["status", "completed_at", "updated_at"])
            logger.info("match_intro_cancelled", extra={"job_id": str(self.job.id)})
            raise

        except Exception as e:
            logger.exception(
                "match_intro_failed",
                extra={"job_id": str(self.job.id), "error": str(e)},
            )
            self.job.status = JobStatus.FAILED
            self.job.error_message = str(e)[:4000]
            self.job.save(update_fields=["status", "error_message", "updated_at"])
            raise
        finally:
            self._cleanup()

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
        data = self._gather_match_data(activity_id)

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

    def _gather_match_data(self, activity_id: str) -> dict:
        """Gather all match data needed for the intro video."""
        Activity = apps.get_model("activities", "Activity")
        BrandProfile = apps.get_model("branding", "BrandProfile")
        BrandAsset = apps.get_model("branding", "BrandAsset")

        activity = Activity.objects.select_related(
            "project__parent_project",
            "opponent_project",
            "period",
        ).get(id=activity_id)

        project = activity.project
        meta = activity.metadata or {}

        match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
        kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None

        own_team_name = project.name or ""
        opponent_name = activity.opponent_project.name if activity.opponent_project else ""
        is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")

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

        competition_name = meta.get("teamreel", {}).get("vars", {}).get("competition_name")
        if not competition_name:
            competition_name = meta.get("competition_name")
        if not competition_name and activity.period:
            competition_name = activity.period.name

        # Brand colours
        brand_primary = "#D2122E"
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

        # Brand assets (logos, sponsor, background)
        organisation = project.organisation if hasattr(project, "organisation") else None
        brand_profiles = []
        team_brand = BrandProfile.objects.filter(project=project, is_active=True).first()
        if team_brand:
            brand_profiles.append(team_brand)
        club_project = project.parent_project if hasattr(project, "parent_project") else None
        if club_project:
            club_brand = BrandProfile.objects.filter(project=club_project, is_active=True).first()
            if club_brand and club_brand not in brand_profiles:
                brand_profiles.append(club_brand)
        if organisation:
            org_brand = BrandProfile.objects.filter(
                organisation=organisation, is_active=True
            ).first()
            if org_brand and org_brand not in brand_profiles:
                brand_profiles.append(org_brand)

        club_org_profiles = [p for p in brand_profiles if p != team_brand]

        def _get_presigned_url(storage_path: str) -> str | None:
            try:
                backend = get_storage_backend()
                return backend.get_url(storage_path, signed=True, expiry_seconds=3600)
            except Exception:  # noqa: BLE001
                return None

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

        logo_url = _resolve_asset_url(["logo"], skip_team=True)
        sponsor_url = _resolve_asset_url(["sponsor_logo"])
        field_background_url = _resolve_asset_url(["stadium_background"])

        # Opponent logo
        opponent_logo_url = None
        if activity.opponent_project:
            opp_club = getattr(activity.opponent_project, "parent_project", None)
            if opp_club:
                opp_brand = BrandProfile.objects.filter(project=opp_club, is_active=True).first()
                if opp_brand:
                    asset = (
                        BrandAsset.objects.filter(
                            profile=opp_brand, asset_type="logo", is_active=True
                        )
                        .select_related("file")
                        .first()
                    )
                    if asset:
                        opponent_logo_url = getattr(asset, "url", None)
                        if not opponent_logo_url and asset.file:
                            opponent_logo_url = _get_presigned_url(asset.file.storage_path)

        return {
            "activity_id": str(activity_id),
            "match_date": match_date,
            "kickoff_time": kickoff_time,
            "own_team_name": own_team_name,
            "opponent_name": opponent_name,
            "is_home": is_home,
            "venue": venue,
            "competition_name": competition_name,
            "brand_primary": brand_primary,
            "brand_secondary": brand_secondary,
            "logo_url": logo_url,
            "opponent_logo_url": opponent_logo_url,
            "sponsor_url": sponsor_url,
            "field_background_url": field_background_url,
        }

    def _render_background_frame(self, data: dict) -> str:
        """Render the static background frame with header, logos, and VS block.

        Returns path to the rendered PNG frame.
        """
        from src.video.services.header_generator import (
            _clean_logo_alpha,
            render_header_pil,
        )

        primary_rgb = _hex_to_rgb(data["brand_primary"])

        # Background: field image or dark gradient
        bg_img = _download_image(data["field_background_url"])
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
            logo_url=data["logo_url"],
            opponent_logo_url=data["opponent_logo_url"],
            sponsor_url=data["sponsor_url"],
            match_date=data["match_date"] or "",
            own_team_name=data["own_team_name"],
            opponent_name=data["opponent_name"],
            is_home=data["is_home"],
            kickoff_time=data["kickoff_time"],
            competition_name=data["competition_name"],
            venue=data["venue"],
            background_color=data["brand_primary"],
            title_text="MATCH DAY",
        )
        canvas.paste(header.convert("RGB"), (0, 0))

        # Large logos in VS area (static — text will be animated via FFmpeg)
        cx = WIDTH // 2
        logo_size = 260
        home_logo_url = data["logo_url"] if data["is_home"] else data["opponent_logo_url"]
        away_logo_url = data["opponent_logo_url"] if data["is_home"] else data["logo_url"]

        vs_center_y = int(HEIGHT * 0.42)
        left_cx = int(WIDTH * 0.25)
        right_cx = int(WIDTH * 0.75)

        for logo_url, lx in [(home_logo_url, left_cx), (away_logo_url, right_cx)]:
            logo = _download_image(logo_url)
            if logo:
                logo = _clean_logo_alpha(logo)
                logo.thumbnail((logo_size, logo_size), Image.Resampling.LANCZOS)
                canvas.paste(
                    logo.convert("RGBA"),
                    (lx - logo.width // 2, vs_center_y - logo.height // 2),
                    logo.convert("RGBA"),
                )

        # Sponsor at bottom (static)
        sponsor_img = _download_image(data["sponsor_url"])
        if sponsor_img:
            sponsor_img = _clean_logo_alpha(sponsor_img)
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

    def _compose_with_ffmpeg(self, frame_path: str, data: dict, output_path: str) -> None:
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
        ffmpeg = _get_ffmpeg_path()

        home_name = (
            data["own_team_name"].upper() if data["is_home"] else data["opponent_name"].upper()
        )
        away_name = (
            data["opponent_name"].upper() if data["is_home"] else data["own_team_name"].upper()
        )

        date_str = data["match_date"] or ""
        if data["kickoff_time"]:
            date_str += f"  |  {data['kickoff_time']}"

        venue_str = data["venue"] or ""
        comp_str = (data["competition_name"] or "").upper()

        primary_rgb = _hex_to_rgb(data["brand_primary"])
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

    def _upload_output(self, output_path: str) -> FileAsset:
        """Upload output to S3 under match/match_intro/ path."""
        config = self.job.config or {}
        match_id = config.get("match_id") or config.get("activity_id")

        backend = get_storage_backend()
        file_name = os.path.basename(output_path)
        org_id = self.job.project.organisation_id

        if match_id:
            storage_path = f"matches/{org_id}/{match_id}/match_intro/{self.job.id}/{file_name}"
        else:
            storage_path = f"video_outputs/{org_id}/{self.job.id}/{file_name}"

        with open(output_path, "rb") as file_obj:
            saved_path = backend.save(storage_path, file_obj)

        file_size = os.path.getsize(output_path)

        return FileAsset.objects.create(
            organization_id=org_id,
            uploaded_by=self.job.created_by,
            original_name=file_name,
            storage_path=saved_path,
            file_size=file_size,
            mime_type="video/mp4",
            is_public=False,
        )

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used for match intro processor (custom execute flow)."""
        return []

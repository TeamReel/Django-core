"""Lineup processor for multi-segment video concatenation.

This processor handles lineup announcement videos by concatenating multiple
video/image segments for each player in a formation.

Config Schema:
{
    "segments": [
        {
            "type": "image" | "video",
            "url": "https://..." or "s3://...",
            "duration": 3.0,  # seconds (only for images)
            "label": "Player Name",  # optional text overlay
            "transition": "fade" | "cut",  # default: "cut"
            "scale": 0.6  # optional, 0-1 scale factor (for closeup PiP effect)
        },
        ...
    ],
    "output_resolution": "1080p" | "720p" | "4k",  # default: 720p
    "output_fps": 30,  # default: 30
    "background_color": "#000000",  # default: black
    "fade_duration": 0.5,  # seconds for fade transitions
    "match_id": "uuid",  # optional, for S3 path scoping
    "activity_id": "uuid"  # optional, alias for match_id
}
"""

from __future__ import annotations

import logging
import mimetypes
import os
import shutil
from pathlib import Path
from urllib.parse import urlparse

import requests
from django.utils import timezone
from files.models import FileAsset
from files.utils import get_storage_backend

from src.video.models.job import JobStatus
from src.video.services.processors.base import BaseVideoProcessor, JobCancelledError

logger = logging.getLogger(__name__)


# Resolution presets (width, height)
RESOLUTION_PRESETS = {
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "4k": (3840, 2160),
    "vertical_720p": (720, 1280),
    "vertical_1080p": (1080, 1920),
}


class LineupProcessor(BaseVideoProcessor):
    """Processor for lineup announcement videos.

    Concatenates multiple video/image segments into a single video.
    Supports:
    - Image to video conversion (with configurable duration)
    - Video segments
    - Fade transitions between segments
    - Text overlays per segment
    """

    output_extension = "mp4"

    def execute(self):
        """Execute the lineup video processing."""
        self._ensure_temp_dir()
        logger.info(
            "lineup_processing_started",
            extra={"job_id": str(self.job.id), "job_type": self.job.job_type},
        )

        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        try:
            config = self.job.config or {}
            segments = config.get("segments", [])

            # ── New composer path ──
            # When the job was created via the fast path (no segments), use
            # the formation-based lineup composer that produces the full video
            # directly (field background, header, badge transitions, etc.).
            if not segments and config.get("activity_id"):
                output_path = self._compose_lineup_video(config)
                # Skip the old segment-based pipeline entirely — jump to upload.
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
                logger.info("lineup_compose_completed", extra={"job_id": str(self.job.id)})
                return output_file

            if not segments:
                raise ValueError(
                    "No segments provided in config and no activity_id for composer. "
                    "Either provide segments[] or activity_id + selected_member_ids."
                )

            # ── Legacy segment-based pipeline ──
            # Download and prepare all segments
            prepared_segments = self._prepare_segments(segments)

            if not prepared_segments:
                raise ValueError("No valid segments after preparation")

            # Concatenate all segments
            output_path = str(self.temp_dir / f"output.{self.output_extension}")
            self._concatenate_segments(prepared_segments, output_path)

            # Upload output
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

            logger.info("lineup_processing_completed", extra={"job_id": str(self.job.id)})
            return output_file

        except JobCancelledError:
            self.job.refresh_from_db()
            if self.job.status != JobStatus.CANCELLED:
                self.job.status = JobStatus.CANCELLED
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=["status", "completed_at", "updated_at"])
            logger.info("lineup_processing_cancelled", extra={"job_id": str(self.job.id)})
            raise

        except Exception as e:
            logger.exception(
                "lineup_processing_failed",
                extra={"job_id": str(self.job.id), "error": str(e)},
            )
            self.job.status = JobStatus.FAILED
            self.job.error_message = str(e)[:4000]
            self.job.save(update_fields=["status", "error_message", "updated_at"])
            raise
        finally:
            self._cleanup()

    def _compose_lineup_video(self, config: dict) -> str:
        """Use the formation-based lineup composer to generate the full video.

        This is the new pipeline (ported from local_lineup_test/build_lineup.py)
        that creates a proper formation video with field background, header,
        per-phase player reveals, badge transitions, and persistent closeups.

        Args:
            config: Job config dict with activity_id, formation, closeup_style,
                    selected_member_ids, etc.

        Returns:
            Local file path to the composed MP4.
        """
        from src.video.services.lineup_builder import LineupSegmentBuilder
        from src.video.services.lineup_composer import compose_lineup_video

        activity_id = config["activity_id"]
        template_id = config.get("template_id")
        output_resolution = config.get("output_resolution", "vertical_1080p")
        selected_member_ids = config.get("selected_member_ids")
        formation = config.get("formation", "4-3-3")
        closeup_style = config.get("closeup_style", "popout")
        animation_style = config.get("animation_style", "slide_up")
        intro_style = config.get("intro_style", "per_line")
        background_url = config.get("background_url")

        logger.info(
            "Starting lineup composition (new pipeline)",
            extra={
                "job_id": str(self.job.id),
                "activity_id": activity_id,
                "formation": formation,
                "closeup_style": closeup_style,
                "animation_style": animation_style,
                "intro_style": intro_style,
            },
        )

        # Update job metadata so user sees progress
        meta = self.job.metadata or {}
        meta["pipeline"] = "composer"
        meta["current_segment"] = "Gathering lineup data..."
        self.job.metadata = meta
        self.job.save(update_fields=["metadata", "updated_at"])

        # Gather lineup data from database
        builder = LineupSegmentBuilder(
            activity_id=activity_id,
            template_id=template_id,
            output_resolution=output_resolution,
            selected_member_ids=selected_member_ids,
            formation=formation,
        )
        lineup_data = builder.gather_lineup_data()

        # Override field background if a specific URL was provided (app-level location)
        if background_url:
            lineup_data.field_background_url = background_url

        # Store asset resolution diagnostics in job metadata
        meta = self.job.metadata or {}
        meta["lineup_data_summary"] = {
            "keepers": len(lineup_data.keepers),
            "defenders": len(lineup_data.defenders),
            "midfielders": len(lineup_data.midfielders),
            "attackers": len(lineup_data.attackers),
            "has_field_bg": bool(lineup_data.field_background_url),
            "has_logo": bool(lineup_data.logo_url),
            "has_sponsor": bool(lineup_data.sponsor_url),
            "debug_trace": builder._debug_trace[-20:],  # Last 20 entries
        }
        self.job.metadata = meta
        self.job.save(update_fields=["metadata", "updated_at"])

        # Progress callback that updates the VideoJob
        def _progress(pct: int) -> None:
            self.job.progress_percent = pct
            meta = self.job.metadata or {}
            meta["compose_progress"] = pct
            if pct < 20:
                meta["current_segment"] = "Downloading assets..."
            elif pct < 80:
                meta["current_segment"] = "Compositing video..."
            else:
                meta["current_segment"] = "Finalising..."
            self.job.metadata = meta
            self.job.save(update_fields=["progress_percent", "metadata", "updated_at"])

        # Run the composer
        output_path = compose_lineup_video(
            lineup_data=lineup_data,
            formation=formation,
            closeup_style=closeup_style,
            animation_style=animation_style,
            intro_style=intro_style,
            output_dir=self.temp_dir,
            progress_callback=_progress,
        )

        return str(output_path)

    def _upload_output(self, output_path: str) -> FileAsset:
        """Upload output to S3 under match/lineup/ path when match context is available."""
        config = self.job.config or {}
        match_id = config.get("match_id") or config.get("activity_id")

        backend = get_storage_backend()
        file_name = os.path.basename(output_path)
        org_id = self.job.project.organisation_id

        if match_id:
            # Save under match/lineup/ hierarchy
            storage_path = f"matches/{org_id}/{match_id}/lineup/{self.job.id}/{file_name}"
        else:
            # Fallback to standard video_outputs path
            storage_path = f"video_outputs/{org_id}/{self.job.id}/{file_name}"

        with open(output_path, "rb") as file_obj:
            saved_path = backend.save(storage_path, file_obj)

        file_size = os.path.getsize(output_path)
        mime_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

        return FileAsset.objects.create(
            organization_id=org_id,
            uploaded_by=self.job.created_by,
            original_name=file_name,
            storage_path=saved_path,
            file_size=file_size,
            mime_type=mime_type,
            is_public=False,
        )

    def _get_video_dimensions(self, path: str) -> tuple[int, int] | None:
        """Get video dimensions using ffprobe."""
        try:
            command = [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "csv=s=x:p=0",
                path,
            ]

            import subprocess

            result = subprocess.run(command, capture_output=True, text=True, check=True)

            output = result.stdout.strip()
            if not output:
                return None

            parts = output.split("x")
            if len(parts) == 2:
                return int(parts[0]), int(parts[1])
            return None
        except Exception:
            return None

    def _prepare_segments(self, segments: list[dict]) -> list[str]:
        """Download and convert all segments to video files.

        Returns list of local video file paths ready for concatenation.
        """
        config = self.job.config or {}
        # Try to detect resolution if not specified or set to "auto"
        config_resolution = config.get("output_resolution", "auto")

        # Default to 720p if forced or fallback
        fps = config.get("output_fps", 30)
        target_width, target_height = RESOLUTION_PRESETS.get("720p", (1280, 720))

        # If specific resolution requested (and not auto), use it
        if config_resolution != "auto" and config_resolution in RESOLUTION_PRESETS:
            target_width, target_height = RESOLUTION_PRESETS[config_resolution]

        prepared = []
        total = len(segments)

        # Flag to indicate if we've determined resolution
        resolution_determined = config_resolution != "auto"

        # Find first video segment to use as reference resolution if auto
        if not resolution_determined:
            # Look ahead for first video segment
            for segment in segments:
                if segment.get("type") == "video" or (
                    segment.get("url", "").lower().endswith(".mp4")
                ):
                    # We'll use this segment's resolution when we process it
                    # But wait, we iterate one by one.
                    # We can let the loop handle it: if first segment is image, we might pick image res.
                    # Better to prefer video res.
                    pass

        for idx, segment in enumerate(segments):
            try:
                self.job.refresh_from_db(fields=["status"])
                if self.job.status == JobStatus.CANCELLED:
                    raise JobCancelledError("Job was cancelled")

                segment_type = segment.get("type", "video")
                url = segment.get("url", "")
                duration = segment.get("duration", 3.0)
                label = segment.get("label", "")
                scale = segment.get("scale", 1.0)  # PiP scale factor (< 1 = smaller)

                # Update metadata BEFORE processing so user sees current segment in real time
                meta = self.job.metadata or {}
                meta["current_segment"] = label or f"Segment {idx + 1}/{total}"
                meta["segment_index"] = idx + 1
                meta["segment_total"] = total
                meta["segment_status"] = "downloading"
                self.job.metadata = meta
                self.job.save(update_fields=["metadata", "updated_at"])

                if not url:
                    logger.warning(f"Segment {idx} has no URL, skipping")
                    continue

                # Download the source file
                local_path = self._download_segment(url, idx)
                if not local_path:
                    continue

                # If resolution is auto and not yet determined
                if not resolution_determined:
                    # Prefer video segments for resolution detection
                    # Only detect from image if it's the very first segment and no videos are coming?
                    # Or just detect from current segment.
                    # Let's enforce: if type is video, OR if it's the first segment and we have no choice.
                    # Actually, user said "Net zo groot als de input files" (plural).
                    # Using first segment is safest for consistency, even if it's an image.
                    # But images might be 4K. Intro videos 1080p.
                    # If we use 4K, video will be upscaled.
                    # If we use 1080p, image will be downscaled.
                    # Downscaling is better.

                    dims = self._get_video_dimensions(local_path)
                    if dims:
                        w, h = dims
                        # Sanity check: if an image is massive (>4K), cap it to 1080p equivalent?
                        # No, respect user input.
                        target_width, target_height = w, h
                        logger.info(
                            "Auto-detected resolution from segment %d",
                            idx,
                            extra={"width": target_width, "height": target_height},
                        )
                        resolution_determined = True
                    else:
                        # Fallback if detection fails
                        if idx == len(segments) - 1:  # Last chance
                            logger.warning("Could not detect dimensions, defaulting to 720p")
                            resolution_determined = True
                        # Else continue to next segment to try detecting

                # Convert to standardized video segment using target resolution
                # If we still haven't determined resolution (e.g. first seg failed probe),
                # we might be processing with default 720p.
                # This is why we need to ensure detected before converting if possible.

                # Update status to processing before FFmpeg
                meta = self.job.metadata or {}
                meta["segment_status"] = "processing"
                self.job.metadata = meta
                self.job.save(update_fields=["metadata", "updated_at"])

                # All compositing (WebM on stadium background) is done in the
                # lineup builder. The processor is a simple assembler: just
                # normalize format and concatenate.
                segment_video = self._convert_to_video(
                    local_path,
                    idx,
                    segment_type,
                    duration,
                    target_width,
                    target_height,
                    fps,
                    scale,
                )

                if segment_video:
                    prepared.append(segment_video)

                # Update progress (preparation is 0-50%)
                progress = int((idx + 1) / total * 50)
                self.job.progress_percent = progress
                meta = self.job.metadata or {}
                meta["current_segment"] = label or f"Segment {idx + 1}/{total}"
                meta["segment_index"] = idx + 1
                meta["segment_total"] = total
                meta["segment_status"] = "done"
                self.job.metadata = meta
                self.job.save(update_fields=["progress_percent", "metadata", "updated_at"])

            except JobCancelledError:
                raise
            except Exception as e:
                logger.warning(
                    f"Failed to prepare segment {idx}: {e}",
                    extra={"job_id": str(self.job.id), "segment_idx": idx},
                )
                continue

        return prepared

    def _download_segment(self, url: str, idx: int) -> str | None:
        """Download a segment from URL (http, https, s3, or file)."""
        parsed = urlparse(url)
        ext = Path(parsed.path).suffix or ".mp4"
        local_path = self.temp_dir / f"segment_{idx:03d}_source{ext}"

        try:
            if parsed.scheme == "file":
                # Local file - just copy it
                source_path = parsed.path
                # On Windows, remove leading slash from /C:/path
                if os.name == "nt" and source_path.startswith("/") and len(source_path) > 2:
                    if source_path[2] == ":":
                        source_path = source_path[1:]
                shutil.copy(source_path, local_path)

            elif parsed.scheme in ("http", "https"):
                # HTTP download
                response = requests.get(url, timeout=60, stream=True)
                response.raise_for_status()
                with open(local_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)

            elif (
                parsed.scheme == "s3" or url.startswith("generated/") or url.startswith("members/")
            ):
                # S3 storage path
                backend = get_storage_backend()
                storage_path = url if not parsed.scheme else parsed.path.lstrip("/")
                with backend.open(storage_path, "rb") as source:
                    with open(local_path, "wb") as out:
                        shutil.copyfileobj(source, out)
            else:
                logger.warning(f"Unknown URL scheme: {parsed.scheme}")
                return None

            return str(local_path)

        except Exception as e:
            logger.warning(f"Failed to download segment {idx} from {url}: {e}")
            return None

    def _convert_to_video(
        self,
        local_path: str,
        idx: int,
        segment_type: str,
        duration: float,
        width: int,
        height: int,
        fps: int,
        scale: float = 1.0,
    ) -> str | None:
        """Convert image/video to standardized video segment.

        This is a FAST assembler step — no heavy overlays or compositing.
        All compositing (WebM on stadium background) is done beforehand
        in the lineup builder.
        """
        output_path = str(self.temp_dir / f"segment_{idx:03d}.mp4")

        try:
            if segment_type == "image":
                # Convert image to video with duration
                command = self._build_image_to_video_command(
                    local_path, output_path, duration, width, height, fps, scale
                )
            else:
                # Re-encode video to standard format (fast scale+pad only)
                command = self._build_video_reencode_command(
                    local_path, output_path, width, height, fps, scale
                )

            logger.info(
                "ffmpeg_segment_command",
                extra={
                    "job_id": str(self.job.id),
                    "segment_idx": idx,
                    "command": " ".join(command),
                },
            )

            self._run_ffmpeg(command, lambda p: None)
            return output_path

        except Exception as e:
            logger.warning(f"Failed to convert segment {idx}: {e}")
            return None

    def _build_image_to_video_command(
        self,
        input_path: str,
        output_path: str,
        duration: float,
        width: int,
        height: int,
        fps: int,
        scale: float = 1.0,
    ) -> list[str]:
        """Build FFmpeg command to convert image to video.

        When scale < 1.0, the image is rendered smaller and centered on a black
        background, creating a "picture-in-picture" / closeup zoom effect.
        """
        if scale < 1.0:
            # PiP effect: scale image to fraction of canvas, center on black
            sw = int(width * scale)
            sh = int(height * scale)
            filter_complex = (
                f"[0:v]scale={sw}:{sh}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1,fps={fps}"
            )
        else:
            # Full-size: scale to fit and pad to exact dimensions
            filter_complex = (
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1,fps={fps}"
            )

        filter_complex += "[v]"

        command = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            input_path,
            "-f",
            "lavfi",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-filter_complex",
            filter_complex,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-t",
            str(duration),
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-shortest",
            output_path,
        ]
        return command

    def _build_video_reencode_command(
        self,
        input_path: str,
        output_path: str,
        width: int,
        height: int,
        fps: int,
        scale: float = 1.0,
    ) -> list[str]:
        """Build FFmpeg command to re-encode video to standard format."""
        if scale < 1.0:
            # PiP effect: scale video smaller and center on black
            sw = int(width * scale)
            sh = int(height * scale)
            filter_complex = (
                f"[0:v]scale={sw}:{sh}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1,fps={fps}"
            )
        else:
            # Scale and pad video to exact dimensions
            filter_complex = (
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
                f"setsar=1,fps={fps}"
            )

        filter_complex += "[v]"

        command = [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-filter_complex",
            filter_complex,
            "-map",
            "[v]",
            "-map",
            "0:a?",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-ar",
            "48000",
            "-ac",
            "2",
            output_path,
        ]
        return command

    def _concatenate_segments(self, segment_paths: list[str], output_path: str) -> None:
        """Concatenate all prepared segments into final video."""
        config = self.job.config or {}
        fade_duration = config.get("fade_duration", 0.0)

        if len(segment_paths) == 1:
            # Single segment, just copy
            shutil.copy(segment_paths[0], output_path)
            return

        # Create concat file
        concat_file = self.temp_dir / "concat.txt"
        with open(concat_file, "w") as f:
            for path in segment_paths:
                # Escape single quotes in path
                escaped_path = path.replace("'", "'\\''")
                f.write(f"file '{escaped_path}'\n")

        if fade_duration > 0:
            # Complex filter for crossfade transitions
            self._concat_with_crossfade(segment_paths, output_path, fade_duration)
        else:
            # Simple concat demuxer (fast, no transitions)
            command = [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_file),
                "-c",
                "copy",
                output_path,
            ]

            def progress_callback(percent: int) -> None:
                # Concat is 50-100% of progress
                self.job.progress_percent = 50 + int(percent * 0.5)
                self.job.save(update_fields=["progress_percent", "updated_at"])

            logger.info(
                "ffmpeg_concat_command",
                extra={"job_id": str(self.job.id), "command": " ".join(command)},
            )
            self._run_ffmpeg(command, progress_callback)

    def _concat_with_crossfade(
        self, segment_paths: list[str], output_path: str, fade_duration: float
    ) -> None:
        """Concatenate segments with crossfade transitions.

        This is more complex and slower but provides smooth transitions.
        """
        # For now, fall back to simple concat
        # TODO: Implement crossfade using xfade filter
        concat_file = self.temp_dir / "concat.txt"
        with open(concat_file, "w") as f:
            for path in segment_paths:
                escaped_path = path.replace("'", "'\\''")
                f.write(f"file '{escaped_path}'\n")

        command = [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            output_path,
        ]

        self._run_ffmpeg(command, lambda p: None)

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used for lineup processor (custom execute flow)."""
        return []

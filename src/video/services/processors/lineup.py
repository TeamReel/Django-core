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
            "transition": "fade" | "cut"  # default: "cut"
        },
        ...
    ],
    "output_resolution": "1080p" | "720p" | "4k",  # default: 1080p
    "output_fps": 30,  # default: 30
    "background_color": "#000000",  # default: black
    "fade_duration": 0.5  # seconds for fade transitions
}
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path
from urllib.parse import urlparse

import requests
from django.utils import timezone

from files.utils import get_storage_backend
from src.video.models.job import JobStatus
from src.video.services.processors.base import BaseVideoProcessor

logger = logging.getLogger(__name__)


# Resolution presets (width, height)
RESOLUTION_PRESETS = {
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "4k": (3840, 2160),
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

            if not segments:
                raise ValueError("No segments provided in config")

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

    def _prepare_segments(self, segments: list[dict]) -> list[str]:
        """Download and convert all segments to video files.

        Returns list of local video file paths ready for concatenation.
        """
        config = self.job.config or {}
        resolution = config.get("output_resolution", "1080p")
        fps = config.get("output_fps", 30)
        width, height = RESOLUTION_PRESETS.get(resolution, (1920, 1080))

        prepared = []
        total = len(segments)

        for idx, segment in enumerate(segments):
            try:
                segment_type = segment.get("type", "video")
                url = segment.get("url", "")
                duration = segment.get("duration", 3.0)
                label = segment.get("label", "")

                if not url:
                    logger.warning(f"Segment {idx} has no URL, skipping")
                    continue

                # Download the source file
                local_path = self._download_segment(url, idx)
                if not local_path:
                    continue

                # Convert to standardized video segment
                segment_video = self._convert_to_video(
                    local_path, idx, segment_type, duration, width, height, fps, label
                )

                if segment_video:
                    prepared.append(segment_video)

                # Update progress (preparation is 0-50%)
                progress = int((idx + 1) / total * 50)
                self.job.progress_percent = progress
                self.job.save(update_fields=["progress_percent", "updated_at"])

            except Exception as e:
                logger.warning(
                    f"Failed to prepare segment {idx}: {e}",
                    extra={"job_id": str(self.job.id), "segment_idx": idx},
                )
                continue

        return prepared

    def _download_segment(self, url: str, idx: int) -> str | None:
        """Download a segment from URL (http, https, or s3)."""
        parsed = urlparse(url)
        ext = Path(parsed.path).suffix or ".mp4"
        local_path = self.temp_dir / f"segment_{idx:03d}_source{ext}"

        try:
            if parsed.scheme in ("http", "https"):
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
        label: str,
    ) -> str | None:
        """Convert image/video to standardized video segment."""
        output_path = str(self.temp_dir / f"segment_{idx:03d}.mp4")

        try:
            if segment_type == "image":
                # Convert image to video with duration
                command = self._build_image_to_video_command(
                    local_path, output_path, duration, width, height, fps, label
                )
            else:
                # Re-encode video to standard format
                command = self._build_video_reencode_command(
                    local_path, output_path, width, height, fps, label
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
        label: str,
    ) -> list[str]:
        """Build FFmpeg command to convert image to video."""
        # Scale image to fit while maintaining aspect ratio, pad to exact size
        filter_complex = (
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"setsar=1,fps={fps}"
        )

        # Add text overlay if label provided
        if label:
            safe_label = label.replace("'", "\\'").replace(":", "\\:")
            filter_complex += (
                f",drawtext=text='{safe_label}':fontsize=48:fontcolor=white:"
                f"x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.5:boxborderw=10"
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
        label: str,
    ) -> list[str]:
        """Build FFmpeg command to re-encode video to standard format."""
        # Scale and pad video to exact dimensions
        filter_complex = (
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"setsar=1,fps={fps}"
        )

        # Add text overlay if label provided
        if label:
            safe_label = label.replace("'", "\\'").replace(":", "\\:")
            filter_complex += (
                f",drawtext=text='{safe_label}':fontsize=48:fontcolor=white:"
                f"x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.5:boxborderw=10"
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

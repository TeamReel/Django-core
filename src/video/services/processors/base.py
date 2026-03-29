"""Base processor for video jobs."""

from __future__ import annotations

import logging
import mimetypes
import os
import shutil
import subprocess
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Callable

from django.utils import timezone
from files.models import FileAsset
from files.utils import get_storage_backend

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.constants import VIDEO_TEMP_DIR

logger = logging.getLogger(__name__)


ProgressCallback = Callable[[int], None]


class JobCancelledError(Exception):
    pass


class BaseVideoProcessor(ABC):
    """Base class for FFmpeg processors."""

    output_extension = "mp4"

    def __init__(self, job: VideoJob) -> None:
        self.job = job
        self.temp_dir = Path(VIDEO_TEMP_DIR) / str(job.id)

    @abstractmethod
    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Build FFmpeg command arguments."""

    def execute(self) -> FileAsset:
        """Download → Process → Upload → Cleanup."""
        self._ensure_temp_dir()
        logger.info(
            "Video processing started",
            extra={"job_id": str(self.job.id), "job_type": self.job.job_type},
        )
        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        # B64: publish processing-started event
        self._publish_video_progress(0)

        try:
            logger.info("Downloading source file", extra={"job_id": str(self.job.id)})
            input_path = self._download_source()
            output_path = str(self.temp_dir / f"output.{self.output_extension}")

            def progress_callback(percent: int) -> None:
                self.job.progress_percent = percent
                self.job.save(update_fields=["progress_percent", "updated_at"])
                # B64: publish progress event (throttled to every 10%)
                if percent % 10 == 0:
                    self._publish_video_progress(percent)

            command = self.build_command(input_path, output_path)
            logger.info(
                "Executing FFmpeg command",
                extra={"job_id": str(self.job.id), "command": " ".join(command)},
            )
            self._run_ffmpeg(command, progress_callback)

            logger.info("Uploading output file", extra={"job_id": str(self.job.id)})
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

            logger.info("Video processing completed", extra={"job_id": str(self.job.id)})

            # B64: publish completion event
            self._publish_video_completed(
                status="completed",
                output_file_id=str(output_file.id) if output_file else None,
            )

            return output_file
        except JobCancelledError:
            # Preserve CANCELLED status and mark completion time.
            self.job.refresh_from_db()
            if self.job.status != JobStatus.CANCELLED:
                self.job.status = JobStatus.CANCELLED
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=["status", "completed_at", "updated_at"])
            raise
        finally:
            self._cleanup()

    def _ensure_temp_dir(self) -> None:
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def _download_source(self) -> str:
        """Download source file to temp directory."""
        if not self.job.input_file:
            raise ValueError("Job has no input_file")

        backend = get_storage_backend()
        input_name = os.path.basename(self.job.input_file.original_name or "input")
        local_path = self.temp_dir / input_name

        with backend.open(self.job.input_file.storage_path, "rb") as source:
            with open(local_path, "wb") as out:
                shutil.copyfileobj(source, out)

        return str(local_path)

    def _upload_output(self, output_path: str) -> FileAsset:
        """Upload output file to storage and create FileAsset record."""
        backend = get_storage_backend()
        file_name = os.path.basename(output_path)
        org_id = self.job.project.organisation_id
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

    def _cleanup(self) -> None:
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    # ── B64: Realtime event helpers ─────────────────────────────────

    def _publish_video_progress(self, percent: int) -> None:
        """Publish a video.progress event to the project channel."""
        try:
            from rtc_websockets.events import EventType, VideoProgressPayload, build_event
            from rtc_websockets.services import RealtimeEventPublisher

            payload = VideoProgressPayload(
                job_id=str(self.job.id),
                progress_percent=percent,
                job_type=self.job.job_type,
                project_id=self.job.project_id,
            )
            event = build_event(
                EventType.VIDEO_PROGRESS,
                payload,
                actor_id=self.job.created_by_id,
            )
            RealtimeEventPublisher().publish_to_project(self.job.project_id, event)
        except Exception as e:
            logger.warning("Failed to publish B64 video progress event: %s", e)

    def _publish_video_completed(
        self,
        status: str,
        output_file_id: str | None = None,
        error_message: str | None = None,
    ) -> None:
        """Publish a video.completed event to the project channel."""
        try:
            from rtc_websockets.events import EventType, VideoCompletedPayload, build_event
            from rtc_websockets.services import RealtimeEventPublisher

            duration: float | None = None
            if self.job.started_at and self.job.completed_at:
                duration = (self.job.completed_at - self.job.started_at).total_seconds()

            payload = VideoCompletedPayload(
                job_id=str(self.job.id),
                status=status,
                job_type=self.job.job_type,
                project_id=self.job.project_id,
                output_file_id=output_file_id,
                error_message=error_message,
                duration_seconds=duration,
            )
            event = build_event(
                EventType.VIDEO_COMPLETED,
                payload,
                actor_id=self.job.created_by_id,
            )
            RealtimeEventPublisher().publish_to_project(self.job.project_id, event)
        except Exception as e:
            logger.warning("Failed to publish B64 video completed event: %s", e)

    def _run_ffmpeg(self, command: list[str], progress_callback: ProgressCallback) -> None:
        """Execute FFmpeg with progress tracking."""
        command_with_progress = list(command)
        if command_with_progress and not command_with_progress[-1].startswith("-"):
            command_with_progress = (
                command_with_progress[:-1]
                + ["-progress", "pipe:1", "-nostats"]
                + [command_with_progress[-1]]
            )
        else:
            command_with_progress += ["-progress", "pipe:1", "-nostats"]

        process = subprocess.Popen(  # noqa: S603
            command_with_progress,  # noqa: S603
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        duration = None
        if self.job.input_file and self.job.input_file.metadata:
            duration = self.job.input_file.metadata.get("duration_seconds")

        last_cancel_check = time.monotonic()

        def _is_cancelled() -> bool:
            self.job.refresh_from_db(fields=["status"])
            return self.job.status == JobStatus.CANCELLED

        def _terminate_process() -> None:
            try:
                process.terminate()
            except Exception:
                logger.debug("Failed to terminate ffmpeg process", exc_info=True)
            try:
                process.wait(timeout=5)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    logger.debug("Failed to kill ffmpeg process", exc_info=True)

        if _is_cancelled():
            _terminate_process()
            raise JobCancelledError("Job was cancelled")

        if process.stdout:
            for line in process.stdout:
                # Cooperative cancellation: check roughly once per second.
                now = time.monotonic()
                if now - last_cancel_check >= 1.0:
                    last_cancel_check = now
                    if _is_cancelled():
                        _terminate_process()
                        raise JobCancelledError("Job was cancelled")

                if line.startswith("out_time_ms=") and duration:
                    out_time_ms = int(line.split("=")[1].strip() or 0)
                    percent = min(int((out_time_ms / 1000000) / duration * 100), 99)
                    progress_callback(percent)

        return_code = process.wait()

        if _is_cancelled():
            _terminate_process()
            raise JobCancelledError("Job was cancelled")

        if return_code != 0:
            stderr = process.stderr.read() if process.stderr else ""
            self.job.status = JobStatus.FAILED
            self.job.error_message = stderr[:4000]
            self.job.save(update_fields=["status", "error_message", "updated_at"])
            logger.error(
                "video_processing_failed",
                extra={
                    "job_id": str(self.job.id),
                    "error": stderr[:4000],
                },
            )
            # B64: publish failure event
            self._publish_video_completed(status="failed", error_message=stderr[:500])
            raise RuntimeError("FFmpeg failed")

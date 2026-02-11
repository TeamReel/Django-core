"""Video service for job creation and orchestration."""

from __future__ import annotations

import logging

from django.apps import apps
from django.utils import timezone
from files.utils import get_storage_backend
from rest_framework.exceptions import ValidationError

from src.video.models import VideoJob, VideoOverlay, VideoPreset
from src.video.models.job import JobStatus, JobType
from src.video.services.constants import VIDEO_MAX_DURATION, VIDEO_MAX_FILE_SIZE
from src.video.services.processors.base import BaseVideoProcessor
from src.video.services.processors.compose import ComposeProcessor
from src.video.services.processors.thumbnail import ThumbnailProcessor
from src.video.services.processors.transcode import TranscodeProcessor

logger = logging.getLogger(__name__)


class VideoService:
    """Service layer for video job operations."""

    def create_job(
        self,
        project,
        user,
        input_file=None,
        job_type: str = "",
        preset: VideoPreset | None = None,
        platform_export=None,
        overlays: list[dict] | None = None,
        workflow_template=None,
        config: dict | None = None,
    ) -> VideoJob:
        """Create job and dispatch to Celery (placeholder)."""
        # Lineup jobs don't require input_file (segments are in config)
        if job_type != JobType.LINEUP:
            if not input_file:
                raise ValidationError({"input_file": "Input file is required"})
            self._validate_input_file(input_file)

        self._validate_job_config(job_type, preset, config)

        job = VideoJob.objects.create(
            project=project,
            created_by=user,
            input_file=input_file,
            job_type=job_type,
            status=JobStatus.QUEUED,
            preset=preset,
            platform_export=platform_export,
            config=config or {},
            metadata={},
            started_at=None,
            completed_at=None,
        )

        if overlays:
            VideoOverlay.objects.bulk_create(
                [VideoOverlay(job=job, **overlay) for overlay in overlays]
            )

        if workflow_template:
            WorkflowInstance = apps.get_model("workflows", "WorkflowInstance")
            job.workflow_instance = WorkflowInstance.objects.create(
                workflow=workflow_template,
                workflow_snapshot=workflow_template.snapshot,
                project=project,
                content_object=job,
                current_state=workflow_template.initial_state,
                created_by=user,
            )
            job.save(update_fields=["workflow_instance", "updated_at"])

        # Dispatch to appropriate Celery queue based on job type
        self._dispatch_job(job)

        logger.info(
            "video_job_created",
            extra={
                "job_id": str(job.id),
                "job_type": job.job_type,
            },
        )
        return job

    def _dispatch_job(self, job: VideoJob) -> None:
        """Dispatch job to appropriate Celery task."""
        from src.video.tasks import (
            compose_video,
            generate_thumbnail,
            process_lineup_video,
            transcode_video,
        )

        job_id = str(job.id)

        if job.job_type == JobType.TRANSCODE:
            transcode_video.delay(job_id)
        elif job.job_type == JobType.THUMBNAIL:
            generate_thumbnail.delay(job_id)
        elif job.job_type == JobType.COMPOSE:
            compose_video.delay(job_id)
        elif job.job_type == JobType.LINEUP:
            process_lineup_video.delay(job_id)
            logger.info("Lineup job dispatched to Celery", extra={"job_id": job_id})
        else:
            logger.error(
                "Unknown job type for dispatch",
                extra={"job_id": job_id, "job_type": job.job_type},
            )
            raise ValidationError({"job_type": f"Unknown job type: {job.job_type}"})

    def _process_lineup_sync(self, job_id: str) -> None:
        """Process lineup job synchronously (for when Celery is unavailable)."""
        from django.db import close_old_connections

        from src.video.services.processors.lineup import LineupProcessor

        try:
            close_old_connections()
            job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)

            if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
                return

            processor = LineupProcessor(job)
            processor.execute()

            logger.info("Lineup job processed in background thread", extra={"job_id": job_id})

        except Exception as exc:
            logger.exception("Lineup job failed in background thread", extra={"job_id": job_id})
            try:
                job = VideoJob.objects.get(id=job_id)
                job.status = JobStatus.FAILED
                job.error_message = str(exc)[:4000]
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
            except Exception:
                pass
        finally:
            close_old_connections()

    def cancel_job(self, job: VideoJob) -> bool:
        """Cancel pending/queued job."""
        if job.status != JobStatus.QUEUED:
            return False
        job.status = JobStatus.CANCELLED
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at", "updated_at"])
        return True

    def retry_job(self, job: VideoJob) -> VideoJob:
        """Reset failed job and redispatch."""
        if job.status != JobStatus.FAILED:
            raise ValidationError({"status": "Only failed jobs can be retried."})
        job.status = JobStatus.QUEUED
        job.retry_count += 1
        job.error_message = ""
        job.error_code = ""
        job.progress_percent = 0
        job.started_at = None
        job.completed_at = None
        job.save(
            update_fields=[
                "status",
                "retry_count",
                "error_message",
                "error_code",
                "progress_percent",
                "started_at",
                "completed_at",
                "updated_at",
            ]
        )

        # Redispatch to appropriate queue
        self._dispatch_job(job)

        logger.info(
            "video_job_retried",
            extra={"job_id": str(job.id), "retry_count": job.retry_count},
        )

        return job

    def get_processor(self, job: VideoJob) -> BaseVideoProcessor:
        """Factory for processors."""
        from src.video.services.processors.lineup import LineupProcessor

        if job.job_type == JobType.TRANSCODE:
            return TranscodeProcessor(job)
        if job.job_type == JobType.THUMBNAIL:
            return ThumbnailProcessor(job)
        if job.job_type == JobType.COMPOSE:
            return ComposeProcessor(job)
        if job.job_type == JobType.LINEUP:
            return LineupProcessor(job)
        raise ValidationError({"job_type": "Unsupported job type"})

    def _validate_input_file(self, input_file) -> None:
        backend = get_storage_backend()
        if not backend.exists(input_file.storage_path):
            raise ValidationError({"input_file": "Source file not found in storage"})

        if input_file.file_size > VIDEO_MAX_FILE_SIZE:
            raise ValidationError({"input_file": "File exceeds max size limit"})

        duration = input_file.metadata.get("duration_seconds") if input_file.metadata else None
        if duration and duration > VIDEO_MAX_DURATION:
            raise ValidationError({"input_file": "File exceeds max duration limit"})

    def _validate_job_config(
        self, job_type: str, preset: VideoPreset | None, config: dict | None = None
    ) -> None:
        if job_type == JobType.TRANSCODE and preset is None:
            raise ValidationError({"preset": "Preset is required for transcode jobs"})

        if job_type == JobType.LINEUP:
            if not config or not config.get("segments"):
                raise ValidationError({"config": "Lineup jobs require segments in config"})
            segments = config.get("segments", [])
            if len(segments) == 0:
                raise ValidationError({"config": "At least one segment is required"})
            for idx, seg in enumerate(segments):
                if not seg.get("url"):
                    raise ValidationError({"config": f"Segment {idx} missing required 'url' field"})

"""Video service for job creation and orchestration."""

from __future__ import annotations

import logging

from django.apps import apps
from django.db import transaction
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
        # Lineup, goal celebration, match intro and then-vs-now jobs don't require input_file
        if job_type not in (
            JobType.LINEUP,
            JobType.GOAL_CELEBRATION,
            JobType.MATCH_INTRO,
            JobType.THEN_VS_NOW,
        ):
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

        # Auto-attach Video Approval workflow for match-related job types
        if not workflow_template and job_type in (
            JobType.LINEUP,
            JobType.GOAL_CELEBRATION,
            JobType.MATCH_INTRO,
            JobType.THEN_VS_NOW,
        ):
            WorkflowTemplate = apps.get_model("workflows", "WorkflowTemplate")
            try:
                workflow_template = WorkflowTemplate.objects.filter(
                    name="Video Approval", is_active=True
                ).first()
            except Exception as e:
                logger.warning("Failed to run workflow or update job status: %s", e)

        if workflow_template:
            WorkflowInstance = apps.get_model("workflows", "WorkflowInstance")
            job.workflow_instance = WorkflowInstance.objects.create(
                workflow=workflow_template,
                workflow_snapshot=workflow_template.definition,
                project=project,
                content_object=job,
                current_state=workflow_template.get_initial_state(),
                created_by=user,
            )
            job.save(update_fields=["workflow_instance", "updated_at"])

        # Dispatch after commit to avoid race conditions.
        # Wrapped in try/except so the job is always returned even if dispatch
        # fails.  The retrieve endpoint has auto-kick logic that will retry.
        try:
            self._dispatch_job(job)
        except Exception:
            logger.exception(
                "Dispatch failed for job — auto-kick will retry on next poll",
                extra={"job_id": str(job.id), "job_type": job.job_type},
            )

        logger.info(
            "video_job_created",
            extra={
                "job_id": str(job.id),
                "job_type": job.job_type,
            },
        )
        return job

    def _dispatch_job(self, job: VideoJob) -> None:
        """Dispatch job to appropriate Celery task runner.

        All video types are dispatched via Celery for resilience against
        web-process restarts / redeployments.  The previous daemon-thread
        approach was fragile: threads were killed on redeploy, leaving jobs
        stuck in PROCESSING until the recovery task intervened.

        Important: dispatch must happen after the DB transaction commits.
        Otherwise Celery workers may not be able to load the newly-created
        VideoJob yet, leaving it stuck in QUEUED.
        """
        from src.video.tasks import (
            compose_video,
            generate_thumbnail,
            process_goal_celebration_video,
            process_lineup_video,
            process_match_intro_video,
            process_then_vs_now_video,
            transcode_video,
        )

        job_id = str(job.id)

        TASK_MAP: dict[str, object] = {
            JobType.TRANSCODE: transcode_video,
            JobType.THUMBNAIL: generate_thumbnail,
            JobType.COMPOSE: compose_video,
            JobType.LINEUP: process_lineup_video,
            JobType.GOAL_CELEBRATION: process_goal_celebration_video,
            JobType.MATCH_INTRO: process_match_intro_video,
            JobType.THEN_VS_NOW: process_then_vs_now_video,
        }

        task = TASK_MAP.get(job.job_type)
        if task is None:
            logger.error(
                "Unknown job type for dispatch",
                extra={"job_id": job_id, "job_type": job.job_type},
            )
            raise ValidationError({"job_type": f"Unknown job type: {job.job_type}"})

        def _dispatch() -> None:
            task.delay(job_id)  # type: ignore[union-attr]
            logger.info(
                "Dispatched video job to Celery",
                extra={"job_id": job_id, "job_type": job.job_type},
            )

        # If we're inside an atomic transaction (e.g., ATOMIC_REQUESTS=True),
        # delay dispatch until commit so the worker can reliably read the job.
        # If we're not in a transaction, dispatch immediately.
        connection = transaction.get_connection()
        if getattr(connection, "in_atomic_block", False):
            transaction.on_commit(_dispatch)
        else:
            _dispatch()

    def cancel_job(self, job: VideoJob) -> bool:
        """Cancel pending/queued job."""
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return True

        # Allow cancelling in-flight Celery jobs.
        if job.status == JobStatus.PROCESSING and job.job_type in (
            JobType.LINEUP,
            JobType.GOAL_CELEBRATION,
            JobType.MATCH_INTRO,
            JobType.THEN_VS_NOW,
        ):
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return True

        return False

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
            if not config:
                raise ValidationError({"config": "Lineup jobs require config"})

            segments = config.get("segments") or []
            if segments:
                for idx, seg in enumerate(segments):
                    if not seg.get("url"):
                        raise ValidationError(
                            {"config": f"Segment {idx} missing required 'url' field"}
                        )
                return

            # Deferred build mode (template/activity based)
            if config.get("activity_id") or config.get("match_id"):
                return

            raise ValidationError(
                {"config": "Lineup jobs require segments[] or activity_id for deferred build"}
            )

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
        # Lineup and goal celebration jobs don't require input_file (segments are in config)
        if job_type not in (JobType.LINEUP, JobType.GOAL_CELEBRATION):
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
        """Dispatch job to appropriate task runner.

        Important: dispatch must happen after the DB transaction commits.
        Otherwise background threads / Celery workers may not be able to load
        the newly-created VideoJob yet, leaving it stuck in QUEUED.
        """
        import threading

        from src.video.tasks import (
            compose_video,
            generate_thumbnail,
            transcode_video,
        )

        job_id = str(job.id)

        def _dispatch() -> None:
            if job.job_type == JobType.TRANSCODE:
                transcode_video.delay(job_id)
            elif job.job_type == JobType.THUMBNAIL:
                generate_thumbnail.delay(job_id)
            elif job.job_type == JobType.COMPOSE:
                compose_video.delay(job_id)
            elif job.job_type == JobType.LINEUP:
                # Always process lineup jobs in a background thread directly.
                # Make dispatch idempotent: only one runner should transition QUEUED → PROCESSING.
                updated = VideoJob.objects.filter(
                    id=job.id,
                    status=JobStatus.QUEUED,
                    started_at__isnull=True,
                ).update(
                    status=JobStatus.PROCESSING,
                    started_at=timezone.now(),
                    progress_percent=1,
                    updated_at=timezone.now(),
                )

                if not updated:
                    logger.info(
                        "Lineup job dispatch skipped (already started or not queued)",
                        extra={"job_id": job_id},
                    )
                    return

                logger.info(
                    "Lineup job - processing in background thread",
                    extra={"job_id": job_id},
                )
                self._start_lineup_thread(threading, job_id)
            elif job.job_type == JobType.GOAL_CELEBRATION:
                # Goal celebration jobs also run in a background thread (same pattern as lineup).
                updated = VideoJob.objects.filter(
                    id=job.id,
                    status=JobStatus.QUEUED,
                    started_at__isnull=True,
                ).update(
                    status=JobStatus.PROCESSING,
                    started_at=timezone.now(),
                    progress_percent=1,
                    updated_at=timezone.now(),
                )

                if not updated:
                    logger.info(
                        "Goal celebration job dispatch skipped (already started or not queued)",
                        extra={"job_id": job_id},
                    )
                    return

                logger.info(
                    "Goal celebration job - processing in background thread",
                    extra={"job_id": job_id},
                )
                self._start_goal_celebration_thread(threading, job_id)
            else:
                logger.error(
                    "Unknown job type for dispatch",
                    extra={"job_id": job_id, "job_type": job.job_type},
                )
                raise ValidationError({"job_type": f"Unknown job type: {job.job_type}"})

        # If we're inside an atomic transaction (e.g., ATOMIC_REQUESTS=True),
        # delay dispatch until commit so the worker/thread can reliably read the job.
        # If we're not in a transaction, dispatch immediately.
        connection = transaction.get_connection()
        if getattr(connection, "in_atomic_block", False):
            transaction.on_commit(_dispatch)
        else:
            _dispatch()

    def _start_lineup_thread(self, threading_module, job_id: str) -> None:
        thread = threading_module.Thread(
            target=self._process_lineup_sync,
            args=(job_id,),
            daemon=True,
        )
        thread.start()

    def kick_lineup_job(self, job_id: str) -> bool:
        """Idempotently start a lineup job in a background thread.

        Returns True if this call started processing, False if the job was
        already started or not queued.
        """
        import threading

        updated = VideoJob.objects.filter(
            id=job_id,
            status=JobStatus.QUEUED,
            started_at__isnull=True,
        ).update(
            status=JobStatus.PROCESSING,
            started_at=timezone.now(),
            progress_percent=1,
            updated_at=timezone.now(),
        )

        if not updated:
            return False

        self._start_lineup_thread(threading, str(job_id))
        return True

    def _process_lineup_sync(self, job_id: str) -> None:
        """Process lineup job synchronously (for when Celery is unavailable)."""
        from django.db import close_old_connections

        from src.video.services.processors.base import JobCancelledError
        from src.video.services.processors.lineup import LineupProcessor

        try:
            close_old_connections()
            job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)

            if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
                return

            config = job.config or {}
            segments = config.get("segments") or []

            # If segments are missing, the LineupProcessor.execute() method
            # will handle it: when activity_id is present it routes to the
            # formation-based lineup composer (new pipeline).  We no longer
            # pre-build segments here — that was the OLD sequential pipeline.
            if not segments:
                activity_id = config.get("activity_id") or config.get("match_id")

                if not activity_id:
                    raise ValueError(
                        "Lineup job config must include segments[] or activity_id for deferred build"
                    )

                # Mark as processing early so UI doesn't look stuck in queued.
                if job.status == JobStatus.QUEUED:
                    job.status = JobStatus.PROCESSING
                    job.started_at = timezone.now()
                    job.progress_percent = max(int(job.progress_percent or 0), 1)
                    job.save(
                        update_fields=[
                            "status",
                            "started_at",
                            "progress_percent",
                            "updated_at",
                        ]
                    )

            processor = LineupProcessor(job)
            processor.execute()

            logger.info("Lineup job processed in background thread", extra={"job_id": job_id})

        except JobCancelledError:
            # Cancellation is handled cooperatively inside the processor.
            try:
                job = VideoJob.objects.get(id=job_id)
                if job.status != JobStatus.CANCELLED:
                    job.status = JobStatus.CANCELLED
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "completed_at", "updated_at"])
            except Exception:
                pass
            return

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

    def _start_goal_celebration_thread(self, threading_module, job_id: str) -> None:
        thread = threading_module.Thread(
            target=self._process_goal_celebration_sync,
            args=(job_id,),
            daemon=True,
        )
        thread.start()

    def _process_goal_celebration_sync(self, job_id: str) -> None:
        """Process goal celebration job synchronously in a background thread."""
        from django.db import close_old_connections

        from src.video.services.processors.base import JobCancelledError
        from src.video.services.processors.goal_celebration import GoalCelebrationProcessor

        try:
            close_old_connections()
            job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)

            if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
                return

            # Mark as processing early so UI doesn't look stuck in queued.
            if job.status == JobStatus.QUEUED:
                job.status = JobStatus.PROCESSING
                job.started_at = timezone.now()
                job.progress_percent = max(int(job.progress_percent or 0), 1)
                job.save(
                    update_fields=[
                        "status",
                        "started_at",
                        "progress_percent",
                        "updated_at",
                    ]
                )

            processor = GoalCelebrationProcessor(job)
            processor.execute()

            logger.info(
                "Goal celebration job processed in background thread", extra={"job_id": job_id}
            )

        except JobCancelledError:
            try:
                job = VideoJob.objects.get(id=job_id)
                if job.status != JobStatus.CANCELLED:
                    job.status = JobStatus.CANCELLED
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "completed_at", "updated_at"])
            except Exception:
                pass
            return

        except Exception as exc:
            logger.exception(
                "Goal celebration job failed in background thread", extra={"job_id": job_id}
            )
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
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return True

        # Allow cancelling in-flight lineup/goal celebration jobs; processor will stop cooperatively.
        if job.status == JobStatus.PROCESSING and job.job_type in (
            JobType.LINEUP,
            JobType.GOAL_CELEBRATION,
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

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
            except Exception:
                logger.exception("Silent exception caught")

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

    def _start_lineup_thread(self, threading_module, job_id: str) -> None:
        """Start lineup processing in a daemon thread.

        .. deprecated::
            Use ``process_lineup_video.delay(job_id)`` (Celery task) instead.
            Daemon threads are killed on web-process restart / redeploy.
            Kept only for local-development fallback when Celery is unavailable.
        """
        thread = threading_module.Thread(
            target=self._process_lineup_sync,
            args=(job_id,),
            daemon=True,
        )
        thread.start()

    def kick_lineup_job(self, job_id: str) -> bool:
        """Idempotently start a lineup job via Celery.

        Returns True if this call dispatched the task, False if the job was
        already started or not queued.
        """
        from src.video.tasks import process_lineup_video

        updated = VideoJob.objects.filter(
            id=job_id,
            status=JobStatus.QUEUED,
            started_at__isnull=True,
        ).update(
            status=JobStatus.QUEUED,  # Keep QUEUED — the Celery task handles transition
            updated_at=timezone.now(),
        )

        if not updated:
            return False

        process_lineup_video.delay(str(job_id))
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

            # Transition workflow to ready_for_review so it appears in approval queue
            self._transition_workflow_on_completion(job)

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
                logger.exception("Silent exception caught")
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
                logger.exception("Silent exception caught")
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

            # Transition workflow to ready_for_review so it appears in approval queue
            self._transition_workflow_on_completion(job)

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
                logger.exception("Silent exception caught")
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
                logger.exception("Silent exception caught")
        finally:
            close_old_connections()

    def _start_match_intro_thread(self, threading_module, job_id: str) -> None:
        thread = threading_module.Thread(
            target=self._process_match_intro_sync,
            args=(job_id,),
            daemon=True,
        )
        thread.start()

    def _process_match_intro_sync(self, job_id: str) -> None:
        """Process match intro job synchronously in a background thread."""
        from django.db import close_old_connections

        from src.video.services.processors.base import JobCancelledError
        from src.video.services.processors.match_intro import MatchIntroProcessor

        try:
            close_old_connections()
            job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)

            if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
                return

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

            processor = MatchIntroProcessor(job)
            processor.execute()

            # Transition workflow to ready_for_review so it appears in approval queue
            self._transition_workflow_on_completion(job)

            logger.info("Match intro job processed in background thread", extra={"job_id": job_id})

        except JobCancelledError:
            try:
                job = VideoJob.objects.get(id=job_id)
                if job.status != JobStatus.CANCELLED:
                    job.status = JobStatus.CANCELLED
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "completed_at", "updated_at"])
            except Exception:
                logger.exception("Silent exception caught")
            return

        except Exception as exc:
            logger.exception(
                "Match intro job failed in background thread", extra={"job_id": job_id}
            )
            try:
                job = VideoJob.objects.get(id=job_id)
                job.status = JobStatus.FAILED
                job.error_message = str(exc)[:4000]
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
            except Exception:
                logger.exception("Silent exception caught")
        finally:
            close_old_connections()

    def _start_then_vs_now_thread(self, threading_module, job_id: str) -> None:
        thread = threading_module.Thread(
            target=self._process_then_vs_now_sync,
            args=(job_id,),
            daemon=True,
        )
        thread.start()

    def _process_then_vs_now_sync(self, job_id: str) -> None:
        """Process Then vs Now compilation job synchronously in a background thread."""
        from django.db import close_old_connections

        from src.video.services.processors.base import JobCancelledError
        from src.video.services.processors.then_vs_now import ThenVsNowProcessor

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

            processor = ThenVsNowProcessor(job)
            processor.execute()

            # Transition workflow to ready_for_review so it appears in approval queue
            self._transition_workflow_on_completion(job)

            logger.info("Then vs Now job processed in background thread", extra={"job_id": job_id})

        except JobCancelledError:
            try:
                job = VideoJob.objects.get(id=job_id)
                if job.status != JobStatus.CANCELLED:
                    job.status = JobStatus.CANCELLED
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "completed_at", "updated_at"])
            except Exception:
                logger.exception("Silent exception caught")
            return

        except Exception as exc:
            logger.exception(
                "Then vs Now job failed in background thread", extra={"job_id": job_id}
            )
            try:
                job = VideoJob.objects.get(id=job_id)
                job.status = JobStatus.FAILED
                job.error_message = str(exc)[:4000]
                job.completed_at = timezone.now()
                job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
            except Exception:
                logger.exception("Silent exception caught")
        finally:
            close_old_connections()

    def cancel_job(self, job: VideoJob) -> bool:
        """Cancel pending/queued job."""
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return True

        # Allow cancelling in-flight jobs running in background threads.
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

    def _transition_workflow_on_completion(self, job: VideoJob) -> None:
        """Transition workflow to ready_for_review state after job processing completes.

        Best-effort: logs failures but does not raise so the job
        keeps its COMPLETED status regardless.
        """
        if not job.workflow_instance:
            return

        try:
            from src.workflows.services.engine import WorkflowEngine

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=job.workflow_instance,
                action="processing_complete",
                user=job.created_by,
                comment=f"Video processing completed for job {job.id}",
            )
            logger.info(
                "Workflow transitioned to ready_for_review on job completion",
                extra={
                    "job_id": str(job.id),
                    "workflow_id": str(job.workflow_instance.id),
                },
            )
        except Exception as exc:
            logger.warning(
                "Failed to transition workflow on job completion: %s",
                exc,
                extra={"job_id": str(job.id)},
                exc_info=True,
            )

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

"""Celery task for Then vs Now compilation video processing."""

from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.base import JobCancelledError

logger = logging.getLogger(__name__)


def _transition_workflow_on_completion(job: VideoJob) -> None:
    """Transition workflow to ready_for_review state on job completion.

    Args:
        job: Completed VideoJob instance
    """
    if not job.workflow_instance:
        return

    try:
        # Import workflow engine service
        from src.workflows.services.engine import WorkflowEngine

        engine = WorkflowEngine()

        # Transition workflow to ready_for_review state
        engine.execute_transition(
            instance=job.workflow_instance,
            action="processing_complete",
            user=job.created_by,
            comment=f"Then vs Now video processing completed for job {job.id}",
        )

        logger.info(
            "Workflow transitioned on job completion",
            extra={
                "job_id": str(job.id),
                "workflow_id": str(job.workflow_instance.id),
            },
        )
    except Exception as exc:
        # Log error but don't fail the job
        logger.warning(
            "Failed to transition workflow on job completion",
            extra={
                "job_id": str(job.id),
                "error": str(exc),
            },
            exc_info=True,
        )


@shared_task(
    bind=True,
    max_retries=2,
    soft_time_limit=7200,
    time_limit=7800,
    acks_late=True,
    retry_backoff=60,
    retry_backoff_max=3600,
    retry_jitter=True,
)
def process_then_vs_now_video(self, job_id: str) -> str | None:
    """Process Then vs Now compilation video.

    Downloads member then_vs_now clips, composes them into a compilation
    video with header overlay (club logos + title) and name labels, then
    uploads the result.
    """
    logger.info(
        "THEN_VS_NOW TASK RECEIVED: Starting process_then_vs_now_video",
        extra={"job_id": job_id, "task_id": self.request.id},
    )

    try:
        job = VideoJob.objects.select_related("project", "created_by").get(id=job_id)
        logger.info(
            "THEN_VS_NOW TASK: Found job, status=%s, video_type=%s",
            job.status,
            (job.config or {}).get("video_type", "unknown"),
            extra={"job_id": job_id},
        )
    except VideoJob.DoesNotExist:
        logger.error(
            "Then vs Now job not found",
            extra={"job_id": job_id},
        )
        return None

    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        logger.info(
            "Then vs Now job already processed or cancelled",
            extra={"job_id": job_id, "status": job.status},
        )
        return job_id

    try:
        from src.video.services.processors.then_vs_now import ThenVsNowProcessor

        processor = ThenVsNowProcessor(job)
        processor.execute()

        # Transition workflow if configured
        _transition_workflow_on_completion(job)

        return job_id

    except JobCancelledError:
        job.refresh_from_db()
        if job.status != JobStatus.CANCELLED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
        return job_id

    except Exception as exc:
        logger.exception(
            "Then vs Now video processing failed",
            extra={"job_id": job_id, "error": str(exc)},
        )

        job.refresh_from_db()
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:4000]
            job.completed_at = timezone.now()
            job.save(
                update_fields=[
                    "status",
                    "error_message",
                    "completed_at",
                    "updated_at",
                ]
            )

        if self.request.retries < self.max_retries:
            job.refresh_from_db(fields=["status"])
            if job.status == JobStatus.CANCELLED:
                return None
            job.status = JobStatus.QUEUED
            job.retry_count = self.request.retries + 1
            job.save(update_fields=["status", "retry_count", "updated_at"])
            raise self.retry(exc=exc) from exc

        return None

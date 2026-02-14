"""Celery task for lineup video processing."""

from __future__ import annotations

import logging

from celery import shared_task
from django.apps import apps
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.lineup import LineupProcessor
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
        # Dynamically import workflow service to avoid circular dependencies
        WorkflowService = apps.get_model("workflows", "WorkflowService")
        service = WorkflowService()

        # Transition workflow to ready_for_review state
        service.transition(
            instance=job.workflow_instance,
            action="processing_complete",
            user=job.created_by,
            comment=f"Lineup video processing completed for job {job.id}",
        )

        logger.info(
            "Workflow transitioned on lineup job completion",
            extra={
                "job_id": str(job.id),
                "workflow_id": str(job.workflow_instance.id),
            },
        )
    except Exception as exc:
        # Log error but don't fail the job
        logger.warning(
            "Failed to transition workflow on lineup job completion",
            extra={
                "job_id": str(job.id),
                "error": str(exc),
            },
            exc_info=True,
        )


@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=7200,  # 2 hours soft limit (lineup can be long)
    time_limit=7800,  # 2h10m hard limit
    acks_late=True,
    retry_backoff=60,  # Start with 60s
    retry_backoff_max=3600,  # Max 1 hour
    retry_jitter=True,
)
def process_lineup_video(self, job_id: str) -> str | None:
    """
    Process lineup announcement video.

    Concatenates multiple video/image segments (fullbody images, intro videos,
    closeup videos) for each player in a lineup.

    Args:
        job_id: UUID string of the VideoJob to process

    Returns:
        Job ID if successful, None if job not found

    Raises:
        Retry exception if processing fails and retries remain
    """
    # Log immediately when task starts
    logger.info(
        "LINEUP TASK RECEIVED: Starting process_lineup_video",
        extra={"job_id": job_id, "task_id": self.request.id},
    )

    try:
        job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)
        logger.info(
            "LINEUP TASK: Found job, status=%s, segments=%d",
            job.status,
            len(job.config.get("segments", [])) if job.config else 0,
            extra={"job_id": job_id},
        )
    except VideoJob.DoesNotExist:
        logger.error("Lineup job not found", extra={"job_id": job_id})
        return None

    # Skip if already processed or cancelled
    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        logger.info(
            "Lineup job already processed or cancelled",
            extra={"job_id": job_id, "status": job.status},
        )
        return job_id

    try:
        processor = LineupProcessor(job)
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
            "Lineup video processing failed",
            extra={"job_id": job_id, "error": str(exc)},
        )

        # Update job status
        job.refresh_from_db()
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:4000]
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])

        # Retry with backoff if retries remain (but never retry cancelled jobs)
        if self.request.retries < self.max_retries:
            job.refresh_from_db(fields=["status"])
            if job.status == JobStatus.CANCELLED:
                return None
            job.status = JobStatus.QUEUED
            job.retry_count = self.request.retries + 1
            job.save(update_fields=["status", "retry_count", "updated_at"])
            raise self.retry(exc=exc)

        return None

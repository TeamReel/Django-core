"""Celery task for goal celebration video processing."""

from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.base import JobCancelledError
from src.video.services.processors.goal_celebration import GoalCelebrationProcessor
from src.video.tasks.lineup import (
    _create_media_item_for_completed_job,
    _transition_workflow_on_completion,
)

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=7200,
    time_limit=7800,
    acks_late=True,
    retry_backoff=60,
    retry_backoff_max=3600,
    retry_jitter=True,
)
def process_goal_celebration_video(self, job_id: str) -> str | None:
    """Process goal celebration video via Celery.

    Args:
        job_id: UUID string of the VideoJob to process

    Returns:
        Job ID if successful, None if job not found
    """
    logger.info(
        "GOAL_CELEBRATION TASK RECEIVED",
        extra={"job_id": job_id, "task_id": self.request.id},
    )

    try:
        job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)
    except VideoJob.DoesNotExist:
        logger.error("Goal celebration job not found", extra={"job_id": job_id})
        return None

    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        logger.info(
            "Goal celebration job already processed or cancelled",
            extra={"job_id": job_id, "status": job.status},
        )
        return job_id

    try:
        processor = GoalCelebrationProcessor(job)
        processor.execute()

        job.refresh_from_db()
        _create_media_item_for_completed_job(job)
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
            "Goal celebration video processing failed",
            extra={"job_id": job_id, "error": str(exc)},
        )

        job.refresh_from_db()
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:4000]
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])

        if self.request.retries < self.max_retries:
            job.refresh_from_db(fields=["status"])
            if job.status == JobStatus.CANCELLED:
                return None
            job.status = JobStatus.QUEUED
            job.retry_count = self.request.retries + 1
            job.save(update_fields=["status", "retry_count", "updated_at"])
            raise self.retry(exc=exc) from exc

        return None

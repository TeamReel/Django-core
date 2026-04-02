"""Celery task for thumbnail generation."""

from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.thumbnail import ThumbnailProcessor
from src.video.tasks._shared import transition_workflow_on_completion

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=60,  # 1 min soft limit
    time_limit=120,  # 2 min hard limit
    acks_late=True,
    retry_backoff=30,  # Start with 30s (faster for quick tasks)
    retry_backoff_max=600,  # Max 10 minutes
    retry_jitter=True,
)
def generate_thumbnail(self, job_id: str) -> str | None:
    """
    Generate thumbnail at specified timestamp or grid layout.

    Args:
        job_id: UUID string of the VideoJob to process

    Returns:
        Job ID if successful, None if job not found

    Raises:
        Retry exception if processing fails and retries remain
    """
    try:
        job = VideoJob.objects.get(id=job_id)
    except VideoJob.DoesNotExist:
        logger.warning("VideoJob not found for thumbnail", extra={"job_id": job_id})
        return None

    try:
        # Update status to processing
        job.status = JobStatus.PROCESSING
        job.started_at = timezone.now()
        job.retry_count = self.request.retries
        job.save(update_fields=["status", "started_at", "retry_count", "updated_at"])

        logger.info(
            "Starting thumbnail generation",
            extra={
                "job_id": str(job.id),
                "retry_count": self.request.retries,
                "config": job.config or {},
            },
        )

        # Execute thumbnail generation
        processor = ThumbnailProcessor(job)
        output_file = processor.execute()

        # Update job with results
        job.status = JobStatus.COMPLETED
        job.output_file = output_file
        job.completed_at = timezone.now()
        job.progress_percent = 100
        job.save(
            update_fields=[
                "status",
                "output_file",
                "completed_at",
                "progress_percent",
                "updated_at",
            ]
        )

        # Transition workflow if present
        transition_workflow_on_completion(job)

        logger.info(
            "Thumbnail generation completed",
            extra={
                "job_id": str(job.id),
                "output_file": str(output_file.id) if output_file else None,
            },
        )

        return str(job.id)

    except Exception as exc:
        logger.error(
            "Thumbnail generation failed",
            extra={
                "job_id": str(job.id),
                "error": str(exc),
                "retry_count": self.request.retries,
            },
            exc_info=True,
        )

        # Update job status to failed
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            job.retry_count = self.request.retries
            job.save(update_fields=["status", "error_message", "retry_count", "updated_at"])

        # Retry if we have attempts remaining
        if self.request.retries < self.max_retries:
            countdown = self.retry_backoff * (2**self.request.retries)
            logger.info(
                "Retrying thumbnail job",
                extra={
                    "job_id": str(job.id),
                    "retry_count": self.request.retries + 1,
                    "countdown": countdown,
                },
            )
            raise self.retry(countdown=countdown, exc=exc) from exc

        return str(job.id)

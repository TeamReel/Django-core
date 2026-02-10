"""Celery tasks for video processing."""

from __future__ import annotations

import logging

from celery import shared_task

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.video_service import VideoService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_video_job(self, job_id: str) -> str | None:
    """Process a video job by dispatching to the appropriate processor."""
    try:
        job = VideoJob.objects.get(id=job_id)
    except VideoJob.DoesNotExist:
        logger.warning("VideoJob not found", extra={"job_id": job_id})
        return None

    service = VideoService()
    processor = service.get_processor(job)

    try:
        processor.execute()
        return str(job.id)
    except Exception as exc:
        logger.error("Video job failed", extra={"job_id": str(job.id), "error": str(exc)})
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            job.save(update_fields=["status", "error_message", "updated_at"])

        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2**self.request.retries), exc=exc) from exc

        return str(job.id)

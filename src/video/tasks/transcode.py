"""Celery task for video transcoding."""

from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.transcode import TranscodeProcessor

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
            comment=f"Video processing completed for job {job.id}",
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
    max_retries=3,
    soft_time_limit=1800,  # 30 min soft limit
    time_limit=2100,  # 35 min hard limit
    acks_late=True,
    retry_backoff=60,  # Start with 60s
    retry_backoff_max=3600,  # Max 1 hour
    retry_jitter=True,  # Add randomness to prevent thundering herd
)
def transcode_video(self, job_id: str) -> str | None:
    """
    Transcode video to target format.

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
        logger.warning("VideoJob not found for transcode", extra={"job_id": job_id})
        return None

    try:
        # Update status to processing
        job.status = JobStatus.PROCESSING
        job.started_at = timezone.now()
        job.retry_count = self.request.retries
        job.save(update_fields=["status", "started_at", "retry_count", "updated_at"])

        logger.info(
            "Starting video transcode",
            extra={
                "job_id": str(job.id),
                "retry_count": self.request.retries,
                "input_file": str(job.input_file.id) if job.input_file else None,
            },
        )

        # Execute transcode
        processor = TranscodeProcessor(job)
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
        _transition_workflow_on_completion(job)

        logger.info(
            "Video transcode completed",
            extra={
                "job_id": str(job.id),
                "output_file": str(output_file.id) if output_file else None,
            },
        )

        return str(job.id)

    except Exception as exc:
        logger.error(
            "Video transcode failed",
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
                "Retrying transcode job",
                extra={
                    "job_id": str(job.id),
                    "retry_count": self.request.retries + 1,
                    "countdown": countdown,
                },
            )
            raise self.retry(countdown=countdown, exc=exc) from exc

        return str(job.id)

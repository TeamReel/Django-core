"""Celery task for lineup video processing."""

from __future__ import annotations

from celery import shared_task

from src.video.services.processors.lineup import LineupProcessor
from src.video.tasks._shared import run_video_task


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
def process_lineup_video(self, job_id: str) -> str | None:
    """Process lineup announcement video."""
    return run_video_task(job_id, LineupProcessor, self)

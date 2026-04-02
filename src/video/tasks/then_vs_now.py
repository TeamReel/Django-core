"""Celery task for Then vs Now compilation video processing."""

from __future__ import annotations

from celery import shared_task

from src.video.services.processors.then_vs_now import ThenVsNowProcessor
from src.video.tasks._shared import run_video_task


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
    """Process Then vs Now compilation video."""
    return run_video_task(job_id, ThenVsNowProcessor, self, create_media_item=False)

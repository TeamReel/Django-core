"""Celery task for goal celebration video processing."""

from __future__ import annotations

from celery import shared_task

from src.video.services.processors.goal_celebration import GoalCelebrationProcessor
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
def process_goal_celebration_video(self, job_id: str) -> str | None:
    """Process goal celebration video."""
    return run_video_task(job_id, GoalCelebrationProcessor, self)

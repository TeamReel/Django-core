"""Celery tasks for async video processing."""

from src.video.tasks.processing import process_video_job

__all__ = ["process_video_job"]

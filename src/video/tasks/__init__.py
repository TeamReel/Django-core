"""Celery tasks for async video processing."""

from src.video.tasks.compose import compose_video
from src.video.tasks.thumbnail import generate_thumbnail
from src.video.tasks.transcode import transcode_video

# Legacy task for backwards compatibility
from src.video.tasks.processing import process_video_job

__all__ = [
    "transcode_video",
    "generate_thumbnail",
    "compose_video",
    "process_video_job",  # Legacy
]

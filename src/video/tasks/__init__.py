"""Celery tasks for async video processing."""

from src.video.tasks.asset_processing import process_member_asset
from src.video.tasks.compose import compose_video
from src.video.tasks.goal_celebration import process_goal_celebration_video
from src.video.tasks.lineup import process_lineup_video
from src.video.tasks.match_intro import process_match_intro_video

# Legacy task for backwards compatibility
from src.video.tasks.processing import process_video_job
from src.video.tasks.then_vs_now import process_then_vs_now_video
from src.video.tasks.thumbnail import generate_thumbnail
from src.video.tasks.transcode import transcode_video

__all__ = [
    "transcode_video",
    "generate_thumbnail",
    "compose_video",
    "process_lineup_video",
    "process_goal_celebration_video",
    "process_match_intro_video",
    "process_then_vs_now_video",
    "process_member_asset",
    "process_video_job",  # Legacy
]

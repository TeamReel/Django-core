"""Goal celebration processor for video composition.

This processor handles goal celebration announcement videos by composing
a single video with the goal scorer's celebration/fullbody overlay,
score display, and match header.

Config Schema:
{
    "activity_id": "uuid",
    "scorer_member_id": "uuid",
    "score_home": 2,
    "score_away": 1,
    "background_url": "https://...",  # optional
    "output_resolution": "vertical_1080p"
}
"""

from __future__ import annotations

import logging

from src.video.services.processors.base import BaseVideoProcessor

logger = logging.getLogger(__name__)


class GoalCelebrationProcessor(BaseVideoProcessor):
    """Processor for goal celebration announcement videos.

    Creates a single composition video with:
    - Field background + header ("GOAL UPDATE")
    - Celebration video or fullbody image overlay
    - Animated score text + scorer name
    - Sponsor overlay
    """

    output_extension = "mp4"

    def _get_storage_prefix(self) -> str | None:
        return "goal_celebration"

    def _process(self) -> str:
        """Compose goal celebration video and return output path."""
        config = self.job.config or {}
        return self._compose_goal_celebration(config)

    def _compose_goal_celebration(self, config: dict) -> str:
        """Use the goal celebration composer to generate the full video.

        Args:
            config: Job config dict with activity_id, scorer_member_id,
                    score_home, score_away, background_url, etc.

        Returns:
            Local file path to the composed MP4.
        """
        from src.video.services.goal_celebration_builder import GoalCelebrationBuilder
        from src.video.services.goal_celebration_composer import compose_goal_celebration_video

        activity_id = config["activity_id"]
        scorer_member_id = config["scorer_member_id"]
        score_home = config.get("score_home", 0)
        score_away = config.get("score_away", 0)
        background_url = config.get("background_url")
        output_resolution = config.get("output_resolution", "vertical_1080p")

        logger.info(
            "Starting goal celebration composition",
            extra={
                "job_id": str(self.job.id),
                "activity_id": activity_id,
                "scorer_member_id": scorer_member_id,
                "score": f"{score_home}-{score_away}",
            },
        )

        def progress_cb(pct: int) -> None:
            self.job.progress_percent = pct
            self.job.save(update_fields=["progress_percent", "updated_at"])

        # Build data
        builder = GoalCelebrationBuilder(
            activity_id=activity_id,
            scorer_member_id=scorer_member_id,
            score_home=score_home,
            score_away=score_away,
            background_url=background_url,
            output_resolution=output_resolution,
        )
        data = builder.build()

        # Compose video
        output_path = compose_goal_celebration_video(
            data=data,
            progress_callback=progress_cb,
        )

        return str(output_path)

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used for goal celebration processor (custom execute flow)."""
        return []

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

from django.utils import timezone
from files.models import FileAsset
from files.utils import get_storage_backend

from src.video.models.job import JobStatus
from src.video.services.processors.base import BaseVideoProcessor, JobCancelledError

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

    def execute(self):
        """Execute the goal celebration video processing."""
        self._ensure_temp_dir()
        logger.info(
            "goal_celebration_processing_started",
            extra={"job_id": str(self.job.id), "job_type": self.job.job_type},
        )

        self.job.status = JobStatus.PROCESSING
        self.job.started_at = timezone.now()
        self.job.save(update_fields=["status", "started_at", "updated_at"])

        try:
            config = self.job.config or {}
            output_path = self._compose_goal_celebration(config)

            # Upload output
            output_file = self._upload_output(output_path)

            self.job.output_file = output_file
            self.job.status = JobStatus.COMPLETED
            self.job.completed_at = timezone.now()
            self.job.progress_percent = 100
            self.job.save(
                update_fields=[
                    "output_file",
                    "status",
                    "completed_at",
                    "progress_percent",
                    "updated_at",
                ]
            )
            logger.info("goal_celebration_completed", extra={"job_id": str(self.job.id)})
            return output_file

        except JobCancelledError:
            self.job.refresh_from_db()
            if self.job.status != JobStatus.CANCELLED:
                self.job.status = JobStatus.CANCELLED
            self.job.completed_at = timezone.now()
            self.job.save(update_fields=["status", "completed_at", "updated_at"])
            logger.info("goal_celebration_cancelled", extra={"job_id": str(self.job.id)})
            raise

        except Exception as e:
            logger.exception(
                "goal_celebration_failed",
                extra={"job_id": str(self.job.id), "error": str(e)},
            )
            self.job.status = JobStatus.FAILED
            self.job.error_message = str(e)[:4000]
            self.job.save(update_fields=["status", "error_message", "updated_at"])
            raise
        finally:
            self._cleanup()

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

    def _upload_output(self, output_path: str) -> FileAsset:
        """Upload output to S3 under match/goal_celebration/ path
        when match context is available."""
        import os

        config = self.job.config or {}
        match_id = config.get("match_id") or config.get("activity_id")

        backend = get_storage_backend()
        file_name = os.path.basename(output_path)
        org_id = self.job.project.organisation_id

        if match_id:
            # Save under match/goal_celebration/ hierarchy (like lineup)
            storage_path = f"matches/{org_id}/{match_id}/goal_celebration/{self.job.id}/{file_name}"
        else:
            # Fallback to standard video_outputs path
            storage_path = f"video_outputs/{org_id}/{self.job.id}/{file_name}"

        with open(output_path, "rb") as file_obj:
            saved_path = backend.save(storage_path, file_obj)

        file_size = os.path.getsize(output_path)

        return FileAsset.objects.create(
            organization_id=org_id,
            uploaded_by=self.job.created_by,
            original_name=file_name,
            storage_path=saved_path,
            file_size=file_size,
            mime_type="video/mp4",
            is_public=False,
        )

    def build_command(self, input_path: str, output_path: str) -> list[str]:
        """Not used for goal celebration processor (custom execute flow)."""
        return []

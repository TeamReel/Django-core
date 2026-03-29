"""Celery task for lineup video processing."""

from __future__ import annotations

import logging
from typing import Any

from celery import shared_task
from django.apps import apps
from django.utils import timezone

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.base import JobCancelledError
from src.video.services.processors.lineup import LineupProcessor

logger = logging.getLogger(__name__)


# Map job_type → content tab asset_type that the frontend recognises
JOB_TYPE_TO_ASSET_TYPE: dict[str, str] = {
    "lineup": "lineup",
    "goal_celebration": "goal",
    "match_intro": "match_intro",
    "then_vs_now": "then_vs_now",
    "compose": "compose",
}


def _create_media_item_for_completed_job(job: VideoJob) -> dict[str, Any]:
    """Auto-create a MediaItem linking the completed video to its activity/match.

    This ensures the video appears in the match content gallery and the Studio
    page immediately \u2014 without requiring a separate 'approve' action.

    Returns a dict with success/error info for logging.
    """
    config = job.config or {}
    activity_id = config.get("activity_id")

    if not activity_id:
        logger.info(
            "No activity_id in job config \u2013 skipping auto MediaItem creation",
            extra={"job_id": str(job.id)},
        )
        return {"saved": False, "reason": "no_activity_id"}

    if not job.output_file_id:
        logger.info(
            "No output_file on job \u2013 skipping auto MediaItem creation",
            extra={"job_id": str(job.id)},
        )
        return {"saved": False, "reason": "no_output_file"}

    try:
        Activity = apps.get_model("activities", "Activity")
        MediaItem = apps.get_model("medialib", "MediaItem")
        from medialib.models import MediaItemState

        activity = Activity.objects.select_related(
            "project",
            "project__parent_project",
            "project__organisation",
        ).get(id=activity_id)
        project = activity.project or job.project

        if not project:
            return {"saved": False, "reason": "no_project", "activity_id": str(activity_id)}

        # Prevent duplicate MediaItems for the same output file
        if MediaItem.objects.filter(file_id=job.output_file_id).exists():
            logger.info(
                "MediaItem already exists for output file \u2013 skipping",
                extra={"job_id": str(job.id), "output_file_id": str(job.output_file_id)},
            )
            return {"saved": False, "reason": "already_exists"}

        asset_type = JOB_TYPE_TO_ASSET_TYPE.get(job.job_type, job.job_type)

        # Build rich extraction_metadata (same pattern as VideoJobViewSet.approve)
        extraction_meta: dict[str, Any] = {
            "source": "video_job_auto",
            "job_id": str(job.id),
            "job_type": job.job_type,
            "asset_type": asset_type,
        }

        # Project context
        if project:
            extraction_meta["project_id"] = project.id
            extraction_meta["project_name"] = project.name
            if project.parent_project:
                extraction_meta["club_name"] = project.parent_project.name
                extraction_meta["team_name"] = project.name
            else:
                extraction_meta["club_name"] = project.name

        # Organisation context
        org = getattr(project, "organisation", None)
        if org:
            extraction_meta["organisation_id"] = str(org.id)
            extraction_meta["organisation_name"] = org.name

        # Activity/match context
        extraction_meta["activity_id"] = str(activity.id)
        extraction_meta["activity_title"] = activity.title

        # Sport type
        if hasattr(project, "sport") and project.sport:
            extraction_meta["sport_type"] = project.sport.name

        # Match context from activity
        if hasattr(activity, "opponent"):
            extraction_meta["opponent"] = activity.opponent
        if hasattr(activity, "home_away"):
            extraction_meta["home_away"] = activity.home_away
        if hasattr(activity, "date"):
            extraction_meta["activity_date"] = activity.date.isoformat() if activity.date else None

        # Score from job config
        if config.get("score_home") is not None:
            extraction_meta["score_home"] = config["score_home"]
        if config.get("score_away") is not None:
            extraction_meta["score_away"] = config["score_away"]

        file_asset = job.output_file
        mime_type = getattr(file_asset, "mime_type", "video/mp4") or "video/mp4"
        file_size = (
            getattr(file_asset, "file_size", None)
            or getattr(file_asset, "file_size_bytes", None)
            or 0
        )

        media_item = MediaItem.objects.create(
            file=file_asset,
            activity=activity,
            project=project,
            title=f"{job.job_type.replace('_', ' ').title()} Video",
            description=f"Auto-generated {job.job_type} video for {activity.title}",
            mime_type=mime_type,
            file_size_bytes=file_size,
            state=MediaItemState.PROCESSED,
            created_by=job.created_by,
            extraction_metadata=extraction_meta,
        )

        logger.info(
            "Auto-created MediaItem for completed video job",
            extra={
                "media_item_id": str(media_item.id),
                "job_id": str(job.id),
                "activity_id": str(activity_id),
                "project_id": project.id,
                "asset_type": asset_type,
            },
        )
        return {
            "saved": True,
            "media_item_id": str(media_item.id),
            "activity_id": str(activity_id),
            "asset_type": asset_type,
        }

    except Exception as exc:
        logger.error(
            "Failed to auto-create MediaItem for completed video: %s",
            exc,
            extra={"job_id": str(job.id)},
            exc_info=True,
        )
        return {"saved": False, "error": str(exc)}


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
            comment=f"Lineup video processing completed for job {job.id}",
        )

        logger.info(
            "Workflow transitioned on lineup job completion",
            extra={
                "job_id": str(job.id),
                "workflow_id": str(job.workflow_instance.id),
            },
        )
    except Exception as exc:
        # Log error but don't fail the job
        logger.warning(
            "Failed to transition workflow on lineup job completion",
            extra={
                "job_id": str(job.id),
                "error": str(exc),
            },
            exc_info=True,
        )


@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=7200,  # 2 hours soft limit (lineup can be long)
    time_limit=7800,  # 2h10m hard limit
    acks_late=True,
    retry_backoff=60,  # Start with 60s
    retry_backoff_max=3600,  # Max 1 hour
    retry_jitter=True,
)
def process_lineup_video(self, job_id: str) -> str | None:
    """
    Process lineup announcement video.

    Concatenates multiple video/image segments (fullbody images, intro videos,
    closeup videos) for each player in a lineup.

    Args:
        job_id: UUID string of the VideoJob to process

    Returns:
        Job ID if successful, None if job not found

    Raises:
        Retry exception if processing fails and retries remain
    """
    # Log immediately when task starts
    logger.info(
        "LINEUP TASK RECEIVED: Starting process_lineup_video",
        extra={"job_id": job_id, "task_id": self.request.id},
    )

    try:
        job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)
        logger.info(
            "LINEUP TASK: Found job, status=%s, segments=%d",
            job.status,
            len(job.config.get("segments", [])) if job.config else 0,
            extra={"job_id": job_id},
        )
    except VideoJob.DoesNotExist:
        logger.error("Lineup job not found", extra={"job_id": job_id})
        return None

    # Skip if already processed or cancelled
    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        logger.info(
            "Lineup job already processed or cancelled",
            extra={"job_id": job_id, "status": job.status},
        )
        return job_id

    try:
        processor = LineupProcessor(job)
        processor.execute()

        # Auto-create MediaItem so the video appears in match content immediately
        job.refresh_from_db()
        save_result = _create_media_item_for_completed_job(job)
        logger.info(
            "Auto MediaItem creation result",
            extra={"job_id": job_id, "result": save_result},
        )

        # Transition workflow if configured
        _transition_workflow_on_completion(job)

        return job_id

    except JobCancelledError:
        job.refresh_from_db()
        if job.status != JobStatus.CANCELLED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
        return job_id

    except Exception as exc:
        logger.exception(
            "Lineup video processing failed",
            extra={"job_id": job_id, "error": str(exc)},
        )

        # Update job status
        job.refresh_from_db()
        if job.status != JobStatus.FAILED:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)[:4000]
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])

        # Retry with backoff if retries remain (but never retry cancelled jobs)
        if self.request.retries < self.max_retries:
            job.refresh_from_db(fields=["status"])
            if job.status == JobStatus.CANCELLED:
                return None
            job.status = JobStatus.QUEUED
            job.retry_count = self.request.retries + 1
            job.save(update_fields=["status", "retry_count", "updated_at"])
            raise self.retry(exc=exc)

        return None

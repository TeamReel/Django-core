"""Shared utilities for video Celery tasks.

Extracted from per-task modules to eliminate duplication.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.apps import apps

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.services.processors.base import JobCancelledError

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from celery import Task

    from src.video.services.processors.base import BaseVideoProcessor


# Map job_type → content tab asset_type that the frontend recognises
JOB_TYPE_TO_ASSET_TYPE: dict[str, str] = {
    "lineup": "lineup",
    "goal_celebration": "goal",
    "match_intro": "match_intro",
    "then_vs_now": "then_vs_now",
    "compose": "compose",
}


def build_extraction_metadata(
    job: VideoJob,
    activity: Any,
    project: Any,
    *,
    source: str,
    config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the rich extraction_metadata dict for a MediaItem.

    Args:
        job: The VideoJob being saved.
        activity: The linked Activity instance (with project relations).
        project: The resolved Project instance.
        source: Tag identifying the creation path (e.g. "video_job_auto", "video_job_approved").
        config: Optional job config dict; defaults to ``job.config``.
    """
    if config is None:
        config = job.config or {}

    asset_type = JOB_TYPE_TO_ASSET_TYPE.get(job.job_type, job.job_type)

    meta: dict[str, Any] = {
        "source": source,
        "job_id": str(job.id),
        "job_type": job.job_type,
        "asset_type": asset_type,
    }

    # Project context
    if project:
        meta["project_id"] = project.id
        meta["project_name"] = project.name
        if project.parent_project:
            meta["club_name"] = project.parent_project.name
            meta["team_name"] = project.name
        else:
            meta["club_name"] = project.name

    # Organisation context
    org = getattr(project, "organisation", None)
    if org:
        meta["organisation_id"] = str(org.id)
        meta["organisation_name"] = org.name

    # Activity / match context
    meta["activity_id"] = str(activity.id)
    meta["activity_title"] = activity.title

    # Sport type
    if hasattr(project, "sport") and project.sport:
        meta["sport_type"] = project.sport.name

    # Match context from activity
    if hasattr(activity, "opponent"):
        meta["opponent"] = activity.opponent
    if hasattr(activity, "home_away"):
        meta["home_away"] = activity.home_away
    if hasattr(activity, "date"):
        meta["activity_date"] = activity.date.isoformat() if activity.date else None

    # Score from job config
    if config.get("score_home") is not None:
        meta["score_home"] = config["score_home"]
    if config.get("score_away") is not None:
        meta["score_away"] = config["score_away"]

    # Goal-specific context
    if config.get("scorer_member_id"):
        meta["scorer_member_id"] = config["scorer_member_id"]

    return meta


def transition_workflow_on_completion(job: VideoJob) -> None:
    """Transition workflow to ready_for_review state on job completion.

    Args:
        job: Completed VideoJob instance
    """
    if not job.workflow_instance:
        return

    try:
        from src.workflows.services.engine import WorkflowEngine

        engine = WorkflowEngine()

        engine.execute_transition(
            instance=job.workflow_instance,
            action="processing_complete",
            user=job.created_by,
            comment=f"{job.job_type} video processing completed for job {job.id}",
        )

        logger.info(
            "Workflow transitioned on job completion",
            extra={
                "job_id": str(job.id),
                "workflow_id": str(job.workflow_instance.id),
                "job_type": job.job_type,
            },
        )
    except Exception as exc:
        logger.warning(
            "Failed to transition workflow on job completion",
            extra={
                "job_id": str(job.id),
                "error": str(exc),
                "job_type": job.job_type,
            },
            exc_info=True,
        )


def create_media_item_for_completed_job(job: VideoJob) -> dict[str, Any]:
    """Auto-create a MediaItem linking the completed video to its activity/match.

    This ensures the video appears in the match content gallery and the Studio
    page immediately — without requiring a separate 'approve' action.

    Returns a dict with success/error info for logging.
    """
    config = job.config or {}
    activity_id = config.get("activity_id")

    if not activity_id:
        logger.info(
            "No activity_id in job config – skipping auto MediaItem creation",
            extra={"job_id": str(job.id)},
        )
        return {"saved": False, "reason": "no_activity_id"}

    if not job.output_file_id:
        logger.info(
            "No output_file on job – skipping auto MediaItem creation",
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
                "MediaItem already exists for output file – skipping",
                extra={"job_id": str(job.id), "output_file_id": str(job.output_file_id)},
            )
            return {"saved": False, "reason": "already_exists"}

        extraction_meta = build_extraction_metadata(
            job, activity, project, source="video_job_auto",
        )
        asset_type = extraction_meta["asset_type"]

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


def run_video_task(
    job_id: str,
    processor_class: type[BaseVideoProcessor],
    task_self: Task,
    *,
    create_media_item: bool = True,
) -> str | None:
    """Generic lifecycle runner for video processing Celery tasks.

    Handles job fetching, processor execution, MediaItem creation,
    workflow transitions, cancellation, and retry logic.

    Args:
        job_id: UUID string of the VideoJob to process.
        processor_class: The processor class to instantiate.
        task_self: The bound Celery task instance (``self``).
        create_media_item: Whether to auto-create a MediaItem on completion.
    """
    logger.info(
        "Video task received",
        extra={"job_id": job_id, "task_id": task_self.request.id},
    )

    try:
        job = VideoJob.objects.select_related("project", "preset", "created_by").get(id=job_id)
    except VideoJob.DoesNotExist:
        logger.error("Video job not found", extra={"job_id": job_id})
        return None

    if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
        logger.info(
            "Video job already processed or cancelled",
            extra={"job_id": job_id, "status": job.status},
        )
        return job_id

    try:
        processor = processor_class(job)
        processor.execute()

        # Post-processing
        job.refresh_from_db()
        if create_media_item:
            save_result = create_media_item_for_completed_job(job)
            logger.info(
                "Auto MediaItem creation result",
                extra={"job_id": job_id, "result": save_result},
            )
        transition_workflow_on_completion(job)
        _notify_bulk_generation(job, success=True)

        return job_id

    except JobCancelledError:
        # Processor already set CANCELLED status
        _notify_bulk_generation(job, success=False, error="Job cancelled")
        return job_id

    except Exception as exc:
        # Processor already set FAILED status — handle retry
        if task_self.request.retries < task_self.max_retries:
            job.refresh_from_db(fields=["status"])
            if job.status == JobStatus.CANCELLED:
                return None
            job.status = JobStatus.QUEUED
            job.retry_count = task_self.request.retries + 1
            job.save(update_fields=["status", "retry_count", "updated_at"])
            raise task_self.retry(exc=exc) from exc

        _notify_bulk_generation(job, success=False, error=str(exc)[:500])
        return None


def _notify_bulk_generation(
    job: VideoJob,
    *,
    success: bool,
    error: str = "",
) -> None:
    """Notify bulk generation system if this VideoJob belongs to a bulk batch."""
    config = job.config or {}
    if not config.get("bulk_item_id"):
        return

    try:
        from src.bulk_generation.tasks import on_bulk_item_video_completed

        on_bulk_item_video_completed.delay(str(job.id), success, error)
    except Exception:
        logger.warning(
            "Failed to notify bulk generation for job %s",
            str(job.id),
            exc_info=True,
        )

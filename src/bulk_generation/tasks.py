"""
B67: Bulk Content Generation — Celery Tasks

Orchestrates bulk generation: processes each item in a job by creating
individual VideoJobs via the VideoService.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.db import transaction

from src.bulk_generation.models import (
    BulkGenerationItem,
    BulkGenerationJob,
    BulkContentType,
    ItemStatus,
    JobStatus,
)

logger = logging.getLogger(__name__)

# Map bulk content types to VideoJob job_type strings
CONTENT_TYPE_TO_JOB_TYPE: dict[str, str] = {
    BulkContentType.LINEUP: "lineup",
    BulkContentType.MATCH_INTRO: "match_intro",
    BulkContentType.GOAL_CELEBRATION: "goal_celebration",
    BulkContentType.THEN_VS_NOW: "then_vs_now",
}

# Max concurrent items processed per bulk job dispatch
MAX_CONCURRENT_PER_JOB = 5


@shared_task(
    bind=True,
    max_retries=2,
    soft_time_limit=600,
    time_limit=660,
    acks_late=True,
    retry_backoff=30,
    retry_jitter=True,
)
def process_bulk_generation_job(self, bulk_job_id: str) -> str:
    """
    Process a bulk generation job — dispatch individual items.

    For each pending item, creates a VideoJob via VideoService and
    dispatches it. Items that produce flyers (lineup_flyer, match_flyer)
    are handled via direct task dispatch.

    Concurrency is limited to MAX_CONCURRENT_PER_JOB items per dispatch.
    The on_bulk_item_completed callback re-dispatches if more items remain.
    """
    try:
        job = BulkGenerationJob.objects.select_related("project").get(id=bulk_job_id)
    except BulkGenerationJob.DoesNotExist:
        logger.error("Bulk job not found: %s", bulk_job_id)
        return f"Job {bulk_job_id} not found"

    if job.status == JobStatus.CANCELLED:
        return f"Job {bulk_job_id} cancelled"

    if job.status == JobStatus.QUEUED:
        job.start_processing()

    # Get pending items (limited batch)
    pending_items = list(
        job.items.filter(status=ItemStatus.PENDING)
        .select_related("activity")
        .order_by("created_at")[:MAX_CONCURRENT_PER_JOB]
    )

    if not pending_items:
        job.refresh_stats()
        return f"Job {bulk_job_id} — no pending items"

    for item in pending_items:
        try:
            _dispatch_single_item(item, job)
        except Exception as exc:
            logger.exception(
                "Failed to dispatch bulk item %s",
                str(item.id),
                extra={"bulk_job_id": bulk_job_id, "activity_id": str(item.activity_id)},
            )
            item.mark_failed(str(exc)[:500])
            job.refresh_stats()

    return f"Job {bulk_job_id} — dispatched {len(pending_items)} items"


def _dispatch_single_item(item: BulkGenerationItem, job: BulkGenerationJob) -> None:
    """Create a VideoJob for a single bulk item and dispatch it."""
    from src.video.models.job import JobType
    from src.video.services.video_service import VideoService

    content_type = job.content_type
    job_type_str = CONTENT_TYPE_TO_JOB_TYPE.get(content_type)

    if not job_type_str:
        # Flyer types don't go through VideoJob — dispatch directly
        if content_type in (BulkContentType.LINEUP_FLYER, BulkContentType.MATCH_FLYER):
            _dispatch_flyer_item(item, job)
            return
        raise ValueError(f"Unsupported content type for bulk generation: {content_type}")

    item.mark_generating()

    service = VideoService()
    config = {
        "activity_id": str(item.activity_id),
        "bulk_job_id": str(job.id),
        "bulk_item_id": str(item.id),
        **job.metadata,
    }

    video_job = service.create_job(
        project=job.project,
        user=job.created_by,
        job_type=job_type_str,
        config=config,
    )

    item.video_job = video_job
    item.save(update_fields=["video_job", "updated_at"])


def _dispatch_flyer_item(item: BulkGenerationItem, job: BulkGenerationJob) -> None:
    """Dispatch a flyer generation item (non-VideoJob path)."""
    item.mark_generating()

    from src.bulk_generation.tasks import process_bulk_flyer_item

    transaction.on_commit(
        lambda: process_bulk_flyer_item.delay(str(item.id))
    )


@shared_task(
    bind=True,
    max_retries=2,
    soft_time_limit=300,
    time_limit=360,
    acks_late=True,
    retry_backoff=30,
    retry_jitter=True,
)
def process_bulk_flyer_item(self, item_id: str) -> str:
    """Process a single flyer-type bulk item."""
    try:
        item = BulkGenerationItem.objects.select_related(
            "bulk_job", "bulk_job__project", "activity"
        ).get(id=item_id)
    except BulkGenerationItem.DoesNotExist:
        logger.error("Bulk item not found: %s", item_id)
        return f"Item {item_id} not found"

    if item.status == ItemStatus.CANCELLED:
        return f"Item {item_id} cancelled"

    try:
        job = item.bulk_job
        content_type = job.content_type

        if content_type == BulkContentType.LINEUP_FLYER:
            from src.video.services.lineup_flyer_generator import (
                generate_lineup_flyer_for_activity,
            )

            result_path = generate_lineup_flyer_for_activity(str(item.activity_id))
            if result_path:
                item.mark_completed()
            else:
                item.mark_failed("Flyer generation returned no result")
        else:
            item.mark_failed(f"Unsupported flyer type: {content_type}")

    except Exception as exc:
        logger.exception("Flyer generation failed for item %s", item_id)
        item.mark_failed(str(exc)[:500])

    # Refresh parent job stats
    item.bulk_job.refresh_stats()

    # If more items pending, re-dispatch the parent job
    remaining = item.bulk_job.items.filter(status=ItemStatus.PENDING).count()
    if remaining > 0 and item.bulk_job.status == JobStatus.PROCESSING:
        process_bulk_generation_job.delay(str(item.bulk_job_id))

    return f"Item {item_id} — {item.status}"


@shared_task(bind=True)
def on_bulk_item_video_completed(self, video_job_id: str, success: bool, error: str = "") -> None:
    """
    Callback when a VideoJob completes — updates the parent bulk item.

    Called from video task completion hooks when the VideoJob has a
    bulk_item_id in its config.
    """
    from src.video.models import VideoJob

    try:
        video_job = VideoJob.objects.get(id=video_job_id)
    except VideoJob.DoesNotExist:
        logger.error("VideoJob not found: %s", video_job_id)
        return

    bulk_item_id = video_job.config.get("bulk_item_id")
    if not bulk_item_id:
        return

    try:
        item = BulkGenerationItem.objects.select_related("bulk_job").get(id=bulk_item_id)
    except BulkGenerationItem.DoesNotExist:
        logger.error("Bulk item not found: %s", bulk_item_id)
        return

    if success:
        item.mark_completed()
    else:
        item.mark_failed(error[:500] if error else "Video job failed")

    # Refresh parent job stats
    item.bulk_job.refresh_stats()

    # Dispatch more pending items if available
    remaining = item.bulk_job.items.filter(status=ItemStatus.PENDING).count()
    if remaining > 0 and item.bulk_job.status == JobStatus.PROCESSING:
        process_bulk_generation_job.delay(str(item.bulk_job_id))

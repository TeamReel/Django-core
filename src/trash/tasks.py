"""
Celery tasks for trash cleanup.

Runs on the default queue — lightweight DB cleanup.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name="trash.tasks.cleanup_expired_trash",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="default",
)
def cleanup_expired_trash(self, batch_size: int = 500, dry_run: bool = False) -> dict:
    """
    Permanently delete TrashItems past their retention period.

    Args:
        batch_size: Max items to process per run (prevent long-running transactions).
        dry_run: If True, log what would be deleted without actually deleting.

    Returns:
        Dict with counts of processed and deleted items.
    """
    from trash.models import TrashItem

    expired_items = (
        TrashItem.objects.filter(expires_at__lt=timezone.now())
        .select_related("content_type", "organisation")
        .order_by("expires_at")[:batch_size]
    )

    deleted_count = 0
    errors = 0

    for item in expired_items:
        label = f"{item.content_type.app_label}.{item.content_type.model}:{item.object_id}"

        if dry_run:
            logger.info("DRY RUN — would delete: %s (%s)", item.object_repr, label)
            deleted_count += 1
            continue

        try:
            obj = item.content_object
            if obj is not None:
                if hasattr(obj, "permanent_delete"):
                    obj.permanent_delete()
                else:
                    obj.delete()
            item.delete()
            deleted_count += 1
            logger.info("Permanently deleted: %s (%s)", item.object_repr, label)
        except Exception:
            logger.exception("Failed to delete trash item %s", label)
            errors += 1

    result = {
        "expired_found": len(expired_items),
        "deleted": deleted_count,
        "errors": errors,
        "dry_run": dry_run,
    }
    logger.info("Trash cleanup complete: %s", result)
    return result

"""Cleanup tasks for notification system.

Handles retention policies and archival of old notifications.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from notifications.models import Notification

logger = logging.getLogger(__name__)


@shared_task
def cleanup_old_notifications(retention_days: int = 90, dry_run: bool = False):
    """Delete notifications older than specified retention period.

    Args:
        retention_days: Number of days to retain notifications (default: 90)
        dry_run: If True, count notifications but don't delete them

    Returns:
        Number of notifications deleted (or would be deleted in dry run)

    Example:
        >>> from notifications.tasks.cleanup_tasks import cleanup_old_notifications
        >>> cleanup_old_notifications.delay(retention_days=30)
    """
    cutoff_date = timezone.now() - timedelta(days=retention_days)

    # Get count of notifications to be deleted
    notifications_to_delete = Notification.objects.filter(created_at__lt=cutoff_date)
    count = notifications_to_delete.count()

    if dry_run:
        logger.info(
            f"Dry run: Would delete {count} notifications older than {retention_days} days",
            extra={
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
                "count": count,
                "dry_run": True,
            },
        )
        return count

    try:
        # T087: Delete old notifications
        deleted_count, details = notifications_to_delete.delete()

        # T096: Structured logging for cleanup operations
        logger.info(
            f"Deleted {deleted_count} notifications older than {retention_days} days",
            extra={
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
                "deleted_count": deleted_count,
                "details": details,
            },
        )

        return deleted_count

    except Exception as e:
        # T096: Log errors during cleanup
        logger.error(
            f"Error during cleanup: {str(e)}",
            extra={
                "cutoff_date": cutoff_date.isoformat(),
                "retention_days": retention_days,
                "error": str(e),
            },
            exc_info=True,
        )
        raise


@shared_task
def archive_old_notifications(retention_days: int = 90, archive_path: str = None):
    """Archive notifications before deletion (T089 - Optional).

    Args:
        retention_days: Number of days to retain notifications (default: 90)
        archive_path: Path to S3 bucket or local storage (optional)

    Returns:
        Number of notifications archived

    Note:
        This is a placeholder for future S3/cold storage integration.
        Currently logs the notifications that would be archived.
    """
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    notifications_to_archive = Notification.objects.filter(created_at__lt=cutoff_date)
    count = notifications_to_archive.count()

    logger.info(
        (
            f"Archival placeholder: Would archive {count} notifications "
            f"to {archive_path or 'default storage'}"
        ),
        extra={
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": retention_days,
            "count": count,
            "archive_path": archive_path,
        },
    )

    # TODO: Implement S3/cold storage export
    # - Serialize notifications to JSONL
    # - Upload to S3 bucket
    # - Verify upload success
    # - Return archived count

    return count

"""Periodic tasks for the email tasks example.

This module demonstrates Celery Beat scheduled task patterns including:
- Crontab schedules for specific times
- Interval schedules for recurring tasks
- Database cleanup patterns
- Statistics aggregation
- Health check patterns

These tasks are registered with Celery Beat and execute on a schedule.
"""

import logging
from datetime import timedelta
from typing import Any

from celery import shared_task
from django.db.models import Count
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# Cleanup Tasks
# =============================================================================


@shared_task
def cleanup_old_email_logs(days: int = 30) -> dict[str, Any]:
    """Clean up email logs older than specified days.

    This task demonstrates:
    - Scheduled database cleanup
    - Configurable retention period
    - Bulk deletion for efficiency
    - Audit logging of cleanup operations

    Args:
        days: Number of days to retain logs. Defaults to 30.

    Returns:
        dict with deletion count and cutoff timestamp.

    Example:
        >>> # Delete logs older than 30 days
        >>> cleanup_old_email_logs.delay()

        >>> # Delete logs older than 7 days
        >>> cleanup_old_email_logs.delay(days=7)

    Schedule:
        Typically scheduled to run daily at 2 AM:
        ```python
        CELERY_BEAT_SCHEDULE = {
            'cleanup-old-logs': {
                'task': 'email_tasks.scheduler.cleanup_old_email_logs',
                'schedule': crontab(hour=2, minute=0),
            },
        }
        ```
    """
    from .models import EmailLog

    cutoff = timezone.now() - timedelta(days=days)

    # Count before deletion for reporting
    count_before = EmailLog.objects.filter(created_at__lt=cutoff).count()

    if count_before == 0:
        logger.info(f"No email logs older than {days} days to delete")
        return {"deleted_count": 0, "cutoff": cutoff.isoformat()}

    # Delete in batches to avoid memory issues with large datasets
    deleted_total = 0
    batch_size = 1000

    while True:
        # Get IDs of records to delete
        ids_to_delete = list(
            EmailLog.objects.filter(created_at__lt=cutoff)
            .values_list("id", flat=True)[:batch_size]
        )

        if not ids_to_delete:
            break

        deleted_count, _ = EmailLog.objects.filter(id__in=ids_to_delete).delete()
        deleted_total += deleted_count

        logger.info(f"Deleted batch of {deleted_count} email logs")

    logger.info(
        f"Cleanup complete: deleted {deleted_total} email logs older than {cutoff}"
    )

    return {
        "deleted_count": deleted_total,
        "cutoff": cutoff.isoformat(),
        "retention_days": days,
    }


@shared_task
def cleanup_failed_emails(max_retries: int = 3, days: int = 7) -> dict[str, Any]:
    """Archive or remove emails that have exceeded retry limits.

    This task demonstrates:
    - Handling permanently failed tasks
    - Conditional cleanup based on retry count
    - Status-based filtering

    Args:
        max_retries: Maximum retry count before cleanup.
        days: Only process failures older than this many days.

    Returns:
        dict with processed count and actions taken.
    """
    from .models import EmailLog

    cutoff = timezone.now() - timedelta(days=days)

    # Find old failed emails that exceeded retries
    failed_emails = EmailLog.objects.filter(
        status=EmailLog.Status.FAILED,
        retry_count__gte=max_retries,
        created_at__lt=cutoff,
    )

    count = failed_emails.count()

    if count == 0:
        logger.info("No permanently failed emails to clean up")
        return {"processed_count": 0}

    # In a real app, you might archive these instead of deleting
    deleted_count, _ = failed_emails.delete()

    logger.info(f"Cleaned up {deleted_count} permanently failed emails")

    return {
        "processed_count": deleted_count,
        "max_retries_threshold": max_retries,
        "age_threshold_days": days,
    }


# =============================================================================
# Statistics Tasks
# =============================================================================


@shared_task
def generate_email_statistics() -> dict[str, Any]:
    """Generate statistics about email sending.

    This task demonstrates:
    - Aggregation queries for reporting
    - Periodic statistics generation
    - Dashboard data preparation

    Returns:
        dict with email statistics.

    Schedule:
        Typically scheduled hourly:
        ```python
        CELERY_BEAT_SCHEDULE = {
            'email-stats': {
                'task': 'email_tasks.scheduler.generate_email_statistics',
                'schedule': crontab(minute=0),  # Every hour
            },
        }
        ```
    """
    from .models import EmailLog

    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)

    # Get counts by status for last 24 hours
    stats_24h = EmailLog.objects.filter(created_at__gte=last_24h).aggregate(
        total=Count("id"),
        sent=Count("id", filter=models.Q(status=EmailLog.Status.SENT)),
        failed=Count("id", filter=models.Q(status=EmailLog.Status.FAILED)),
        pending=Count("id", filter=models.Q(status=EmailLog.Status.PENDING)),
    )

    # Get counts by status for last 7 days
    stats_7d = EmailLog.objects.filter(created_at__gte=last_7d).aggregate(
        total=Count("id"),
        sent=Count("id", filter=models.Q(status=EmailLog.Status.SENT)),
        failed=Count("id", filter=models.Q(status=EmailLog.Status.FAILED)),
    )

    # Calculate success rate
    success_rate_24h = 0
    if stats_24h["total"]:
        success_rate_24h = (stats_24h["sent"] / stats_24h["total"]) * 100

    statistics = {
        "generated_at": now.isoformat(),
        "last_24_hours": {
            **stats_24h,
            "success_rate": round(success_rate_24h, 2),
        },
        "last_7_days": stats_7d,
    }

    logger.info(f"Email statistics generated: {statistics}")

    return statistics


# Import models for aggregate queries
from django.db import models


# =============================================================================
# Health Check Tasks
# =============================================================================


@shared_task
def email_system_health_check() -> dict[str, Any]:
    """Check the health of the email system.

    This task demonstrates:
    - Periodic health checks
    - Multiple component verification
    - Alerting on failures

    Returns:
        dict with health status of components.

    Schedule:
        Typically scheduled every 5 minutes:
        ```python
        CELERY_BEAT_SCHEDULE = {
            'email-health-check': {
                'task': 'email_tasks.scheduler.email_system_health_check',
                'schedule': timedelta(minutes=5),
            },
        }
        ```
    """
    from .models import EmailLog

    checks = {
        "timestamp": timezone.now().isoformat(),
        "database_accessible": False,
        "recent_failures_rate": 0,
        "queue_backlog": 0,
        "overall_status": "unknown",
    }

    try:
        # Check database accessibility
        EmailLog.objects.count()
        checks["database_accessible"] = True

        # Check recent failure rate (last hour)
        last_hour = timezone.now() - timedelta(hours=1)
        recent_logs = EmailLog.objects.filter(created_at__gte=last_hour)
        total_recent = recent_logs.count()
        failed_recent = recent_logs.filter(status=EmailLog.Status.FAILED).count()

        if total_recent > 0:
            checks["recent_failures_rate"] = (failed_recent / total_recent) * 100

        # Check queue backlog (pending emails)
        checks["queue_backlog"] = EmailLog.objects.filter(
            status=EmailLog.Status.PENDING
        ).count()

        # Determine overall status
        if checks["recent_failures_rate"] > 50:
            checks["overall_status"] = "degraded"
            logger.warning(f"Email system degraded: {checks['recent_failures_rate']:.1f}% failure rate")
        elif checks["queue_backlog"] > 100:
            checks["overall_status"] = "backlogged"
            logger.warning(f"Email system backlogged: {checks['queue_backlog']} pending")
        else:
            checks["overall_status"] = "healthy"

    except Exception as exc:
        checks["overall_status"] = "error"
        checks["error"] = str(exc)
        logger.error(f"Email health check failed: {exc}")

    return checks


# =============================================================================
# Retry Failed Emails Task
# =============================================================================


@shared_task
def retry_failed_emails(max_age_hours: int = 24, limit: int = 50) -> dict[str, Any]:
    """Retry sending failed emails.

    This task demonstrates:
    - Scheduled retry of failed operations
    - Rate limiting retries
    - Coordinating with other tasks

    Args:
        max_age_hours: Only retry failures within this time window.
        limit: Maximum number of emails to retry per run.

    Returns:
        dict with retry statistics.
    """
    from .models import EmailLog
    from .tasks import send_notification_email

    cutoff = timezone.now() - timedelta(hours=max_age_hours)

    # Find recent failures that haven't exceeded retry limit
    failed_emails = EmailLog.objects.filter(
        status=EmailLog.Status.FAILED,
        retry_count__lt=3,
        created_at__gte=cutoff,
    ).order_by("created_at")[:limit]

    retried_count = 0
    for log in failed_emails:
        # Queue a new send attempt
        send_notification_email.delay(
            user_email=log.email,
            subject="Retry: Important Notification",
            message="This is a retry of a previously failed email.",
        )
        retried_count += 1

    logger.info(f"Queued {retried_count} failed emails for retry")

    return {
        "retried_count": retried_count,
        "max_age_hours": max_age_hours,
        "limit": limit,
    }


# =============================================================================
# Celery Beat Schedule Configuration
# =============================================================================

# This configuration should be added to your Celery app or Django settings:
#
# from celery.schedules import crontab
# from datetime import timedelta
#
# CELERY_BEAT_SCHEDULE = {
#     # Daily cleanup at 2 AM
#     'cleanup-old-email-logs': {
#         'task': 'email_tasks.scheduler.cleanup_old_email_logs',
#         'schedule': crontab(hour=2, minute=0),
#         'kwargs': {'days': 30},
#     },
#     # Weekly cleanup of failed emails (Sundays at 3 AM)
#     'cleanup-failed-emails': {
#         'task': 'email_tasks.scheduler.cleanup_failed_emails',
#         'schedule': crontab(hour=3, minute=0, day_of_week=0),
#     },
#     # Hourly statistics generation
#     'generate-email-stats': {
#         'task': 'email_tasks.scheduler.generate_email_statistics',
#         'schedule': crontab(minute=0),
#     },
#     # Health check every 5 minutes
#     'email-health-check': {
#         'task': 'email_tasks.scheduler.email_system_health_check',
#         'schedule': timedelta(minutes=5),
#     },
#     # Retry failed emails every 15 minutes
#     'retry-failed-emails': {
#         'task': 'email_tasks.scheduler.retry_failed_emails',
#         'schedule': timedelta(minutes=15),
#     },
# }

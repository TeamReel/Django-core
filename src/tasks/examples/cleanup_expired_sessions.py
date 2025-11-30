"""
Example periodic task for routine maintenance operations.

This module demonstrates the periodic task pattern for scheduled maintenance work.
"""

import logging
from typing import Dict

from celery import shared_task
from django.contrib.sessions.models import Session
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_sessions() -> Dict[str, any]:
    """
    Remove expired sessions from the database.

    This task demonstrates:
    - Periodic maintenance pattern
    - Safe cleanup with chunked deletion to avoid long transactions
    - Structured return value for monitoring and alerting
    - Error handling and logging

    Scheduled via CELERY_BEAT_SCHEDULE:
        'cleanup-expired-sessions': {
            'task': 'tasks.examples.cleanup_expired_sessions',
            'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
        }

    Usage:
        # Manual execution (for testing)
        from tasks.examples.cleanup_expired_sessions import cleanup_expired_sessions
        result = cleanup_expired_sessions.delay()
        print(result.get())  # {'status': 'success', 'deleted': 42}

    Returns:
        Dictionary with cleanup statistics:
        - status: 'success' or 'error'
        - deleted: Number of sessions removed
        - error: Error message (if status is 'error')
    """
    try:
        # Find expired sessions
        now = timezone.now()
        expired = Session.objects.filter(expire_date__lt=now)
        count = expired.count()

        if count > 0:
            # Delete in chunks to avoid long transactions
            chunk_size = 1000
            deleted_total = 0

            while True:
                expired_chunk = list(
                    Session.objects.filter(expire_date__lt=now).values_list(
                        "session_key", flat=True
                    )[:chunk_size]
                )

                if not expired_chunk:
                    break

                deleted = Session.objects.filter(session_key__in=expired_chunk).delete()[0]
                deleted_total += deleted
                logger.info(f"Deleted {deleted} expired sessions (chunk)")

            logger.info(f"Cleanup completed: {deleted_total} expired sessions removed")
            return {"status": "success", "deleted": deleted_total}

        else:
            logger.info("No expired sessions to clean up")
            return {"status": "success", "deleted": 0}

    except Exception as exc:
        logger.exception(f"Failed to cleanup expired sessions: {exc}")
        return {"status": "error", "deleted": 0, "error": str(exc)}

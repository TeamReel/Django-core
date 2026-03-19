"""
B62: Activity Feed — Celery Tasks

Provides async event logging so feed writes never slow down
the request/response cycle.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="activity_feed.log_event",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    acks_late=True,
)
def log_event(
    self,
    *,
    actor_id: str | None,
    verb: str,
    target_content_type_id: int | None = None,
    target_object_id: str | None = None,
    organisation_id: str,
    project_id: str | None = None,
    extra_data: dict | None = None,
) -> str:
    """
    Create an ActivityLog entry asynchronously.

    Args:
        actor_id: UUID of the user who performed the action, or None for system events.
        verb: Machine-readable event type (e.g. 'content.created').
        target_content_type_id: ContentType PK of the target object.
        target_object_id: UUID of the target object.
        organisation_id: UUID of the organisation.
        project_id: UUID of the project (optional).
        extra_data: Additional context as a dict.

    Returns:
        UUID of the created ActivityLog entry as a string.
    """
    from activity_feed.models import ActivityLog

    try:
        event = ActivityLog.objects.create(
            actor_id=actor_id or None,
            verb=verb,
            target_content_type_id=target_content_type_id,
            target_object_id=target_object_id or None,
            organisation_id=organisation_id,
            project_id=project_id or None,
            extra_data=extra_data or {},
        )
        logger.info(
            "ActivityLog created: %s [%s] org=%s",
            event.id,
            verb,
            organisation_id,
        )
        return str(event.id)
    except Exception as exc:
        logger.exception("Failed to create ActivityLog: %s", exc)
        raise self.retry(exc=exc)

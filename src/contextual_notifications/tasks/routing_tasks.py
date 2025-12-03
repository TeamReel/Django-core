"""Celery tasks for event routing."""

import logging
from typing import Any

from celery import shared_task
from prometheus_client import Counter, Histogram

from ..services import (
    NotificationHandoffService,
    PreferenceService,
    RoutingService,
    SuppressionService,
)

logger = logging.getLogger(__name__)

# Prometheus metrics
routing_tasks_total = Counter(
    "contextual_notifications_routing_tasks_total",
    "Total number of routing tasks executed",
    ["event_type", "status"],
)

routing_task_duration_seconds = Histogram(
    "contextual_notifications_routing_task_duration_seconds",
    "Duration of routing task execution",
    ["event_type"],
)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,  # 10 minutes max
    max_retries=3,
)
def route_event_task(self, event_dict: dict[str, Any]) -> dict[str, Any]:
    """
    Route event to notification recipients (async via Celery).

    Complete flow:
    1. Route event → determine target users per channel (RoutingService)
    2. Filter by user preferences → remove opt-outs (PreferenceService)
    3. Check suppression → deduplicate within window (SuppressionService)
    4. Hand off to B16 → create notifications (NotificationHandoffService)

    Args:
        event_dict: Event dictionary with type, context, and payload

    Returns:
        Dict with routing results (users notified, channels, success counts)

    Raises:
        Exception: On critical errors (triggers Celery retry)

    Example event_dict:
        {
            "type": "project.updated",
            "context": {
                "org_id": 123,
                "project_id": 456,
                "actor_user_id": 42
            },
            "payload": {
                "title": "Project Updated",
                "body": "Your project was modified",
                "url": "/projects/456",
                "priority": "normal",
                "metadata": {"project_id": 456}
            }
        }
    """
    event_type = event_dict.get("type", "unknown")
    context = event_dict.get("context", {})
    payload = event_dict.get("payload", {})

    logger.info(
        "Routing task started",
        extra={
            "event_type": event_type,
            "org_id": context.get("org_id"),
            "project_id": context.get("project_id"),
            "task_id": self.request.id,
            "retry_count": self.request.retries,
        },
    )

    try:
        # Measure task execution time
        with routing_task_duration_seconds.labels(event_type=event_type).time():
            # Step 1: Route event to determine target users
            target_users = RoutingService.route_event(event_dict)

            if not target_users:
                logger.info(
                    "No target users found for event",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="no_targets"
                ).inc()
                return {
                    "status": "no_targets",
                    "target_users": 0,
                    "notifications_created": 0,
                }

            logger.debug(
                "Target users resolved",
                extra={
                    "event_type": event_type,
                    "target_count": len(target_users),
                    "task_id": self.request.id,
                },
            )

            # Step 2: Filter by user preferences (per channel)
            filtered_users = _apply_preference_filtering(
                target_users, event_type, self.request.id
            )

            if not filtered_users:
                logger.info(
                    "All users opted out via preferences",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="all_opted_out"
                ).inc()
                return {
                    "status": "all_opted_out",
                    "target_users": len(target_users),
                    "notifications_created": 0,
                }

            # Step 3: Check suppression (deduplicate)
            unsuppressed_users = _apply_suppression(
                filtered_users, event_type, payload, self.request.id
            )

            if not unsuppressed_users:
                logger.info(
                    "All notifications suppressed (duplicates)",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="all_suppressed"
                ).inc()
                return {
                    "status": "all_suppressed",
                    "target_users": len(target_users),
                    "notifications_created": 0,
                }

            # Step 4: Hand off to B16 for notification creation
            handoff_result = NotificationHandoffService.dispatch_to_b16(
                event_type=event_type,
                event_payload=payload,
                target_users=unsuppressed_users,
            )

            logger.info(
                "Routing task completed",
                extra={
                    "event_type": event_type,
                    "task_id": self.request.id,
                    "target_users": len(target_users),
                    "filtered_users": len(filtered_users),
                    "unsuppressed_users": len(unsuppressed_users),
                    "notifications_created": handoff_result["succeeded"],
                    "notifications_failed": handoff_result["failed"],
                },
            )

            routing_tasks_total.labels(event_type=event_type, status="success").inc()

            return {
                "status": "success",
                "target_users": len(target_users),
                "filtered_users": len(filtered_users),
                "unsuppressed_users": len(unsuppressed_users),
                "notifications_created": handoff_result["succeeded"],
                "notifications_failed": handoff_result["failed"],
                "notification_ids": handoff_result["notification_ids"],
            }

    except Exception as exc:
        logger.error(
            "Routing task failed",
            extra={
                "event_type": event_type,
                "task_id": self.request.id,
                "retry_count": self.request.retries,
                "error": str(exc),
            },
            exc_info=True,
        )
        routing_tasks_total.labels(event_type=event_type, status="error").inc()
        raise  # Celery will retry


def _apply_preference_filtering(
    target_users: list[tuple[int, str]], event_type: str, task_id: str
) -> list[tuple[int, str]]:
    """
    Apply preference filtering per channel.

    Args:
        target_users: List of (user_id, channel) tuples
        event_type: Event type identifier
        task_id: Celery task ID for logging

    Returns:
        Filtered list of (user_id, channel) tuples
    """
    filtered_users = []

    # Group users by channel for batch filtering
    by_channel: dict[str, list[int]] = {}
    for user_id, channel in target_users:
        if channel not in by_channel:
            by_channel[channel] = []
        by_channel[channel].append(user_id)

    # Filter each channel batch
    for channel, user_ids in by_channel.items():
        allowed_user_ids = PreferenceService.check_preferences(
            user_ids=user_ids,
            event_type=event_type,
            channel=channel,
        )

        # Rebuild (user_id, channel) tuples
        for user_id in allowed_user_ids:
            filtered_users.append((user_id, channel))

    logger.debug(
        "Preference filtering applied",
        extra={
            "event_type": event_type,
            "task_id": task_id,
            "before": len(target_users),
            "after": len(filtered_users),
            "filtered_out": len(target_users) - len(filtered_users),
        },
    )

    return filtered_users


def _apply_suppression(
    target_users: list[tuple[int, str]],
    event_type: str,
    payload: dict[str, Any],
    task_id: str,
) -> list[tuple[int, str]]:
    """
    Apply suppression check (deduplicate within window).

    Args:
        target_users: List of (user_id, channel) tuples
        event_type: Event type identifier
        payload: Event payload (contains metadata with resource_id)
        task_id: Celery task ID for logging

    Returns:
        List of (user_id, channel) tuples that are not suppressed
    """
    unsuppressed_users = []

    # Extract resource_id from payload metadata
    metadata = payload.get("metadata", {})
    resource_id = None
    if "project_id" in metadata:
        resource_id = f"project:{metadata['project_id']}"
    elif "task_id" in metadata:
        resource_id = f"task:{metadata['task_id']}"
    # Add more resource types as needed

    for user_id, channel in target_users:
        # Check suppression (atomic Redis operation)
        is_suppressed = SuppressionService.check_suppression(
            user_id=user_id,
            event_type=event_type,
            resource_id=resource_id,
            ttl=300,  # 5 minutes
        )

        if not is_suppressed:
            unsuppressed_users.append((user_id, channel))

    logger.debug(
        "Suppression check applied",
        extra={
            "event_type": event_type,
            "task_id": task_id,
            "resource_id": resource_id,
            "before": len(target_users),
            "after": len(unsuppressed_users),
            "suppressed": len(target_users) - len(unsuppressed_users),
        },
    )

    return unsuppressed_users


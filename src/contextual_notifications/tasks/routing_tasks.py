"""Celery tasks for event routing."""

import logging
import time
from typing import Any

from celery import shared_task
from prometheus_client import Counter, Histogram

from ..services import (
    AuditService,
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

    # Track routing time for audit
    routing_start_time = time.time()

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

    # Track audit context
    matched_rules: list[int] = []
    all_target_users: list[tuple[int, str]] = []
    preference_filtered_user_ids: list[int] = []
    suppressed_user_ids: list[int] = []

    try:
        # Measure task execution time
        with routing_task_duration_seconds.labels(event_type=event_type).time():
            # Step 1: Route event to determine target users
            target_users = RoutingService.route_event(event_dict)
            all_target_users = target_users

            if not target_users:
                routing_time_ms = (time.time() - routing_start_time) * 1000
                logger.info(
                    "No target users found for event",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="no_targets"
                ).inc()

                # Log audit for no targets
                AuditService.log_routing_decision(
                    event_type=event_type,
                    event_context=context,
                    matched_rules=matched_rules,
                    target_users=[],
                    preference_filtered_users=[],
                    suppressed_users=[],
                    routing_time_ms=routing_time_ms,
                    success=True,
                )

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
            filtered_users, preference_filtered_user_ids = _apply_preference_filtering(
                target_users, event_type, self.request.id
            )

            if not filtered_users:
                routing_time_ms = (time.time() - routing_start_time) * 1000
                logger.info(
                    "All users opted out via preferences",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="all_opted_out"
                ).inc()

                # Log audit for all opted out
                AuditService.log_routing_decision(
                    event_type=event_type,
                    event_context=context,
                    matched_rules=matched_rules,
                    target_users=all_target_users,
                    preference_filtered_users=preference_filtered_user_ids,
                    suppressed_users=[],
                    routing_time_ms=routing_time_ms,
                    success=True,
                )

                return {
                    "status": "all_opted_out",
                    "target_users": len(target_users),
                    "notifications_created": 0,
                }

            # Step 3: Check suppression (deduplicate)
            unsuppressed_users, suppressed_user_ids = _apply_suppression(
                filtered_users, event_type, payload, self.request.id
            )

            if not unsuppressed_users:
                routing_time_ms = (time.time() - routing_start_time) * 1000
                logger.info(
                    "All notifications suppressed (duplicates)",
                    extra={"event_type": event_type, "task_id": self.request.id},
                )
                routing_tasks_total.labels(
                    event_type=event_type, status="all_suppressed"
                ).inc()

                # Log audit for all suppressed
                AuditService.log_routing_decision(
                    event_type=event_type,
                    event_context=context,
                    matched_rules=matched_rules,
                    target_users=all_target_users,
                    preference_filtered_users=preference_filtered_user_ids,
                    suppressed_users=suppressed_user_ids,
                    routing_time_ms=routing_time_ms,
                    success=True,
                )

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

            routing_time_ms = (time.time() - routing_start_time) * 1000

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

            # Log successful routing to audit
            AuditService.log_routing_decision(
                event_type=event_type,
                event_context=context,
                matched_rules=matched_rules,
                target_users=unsuppressed_users,
                preference_filtered_users=preference_filtered_user_ids,
                suppressed_users=suppressed_user_ids,
                routing_time_ms=routing_time_ms,
                success=True,
            )

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
        routing_time_ms = (time.time() - routing_start_time) * 1000
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

        # Log error to audit
        AuditService.log_routing_error(
            event_type=event_type,
            event_context=context,
            error_message=str(exc),
            routing_time_ms=routing_time_ms,
        )

        raise  # Celery will retry


def _apply_preference_filtering(
    target_users: list[tuple[int, str]], event_type: str, task_id: str
) -> tuple[list[tuple[int, str]], list[int]]:
    """
    Apply preference filtering per channel.

    Args:
        target_users: List of (user_id, channel) tuples
        event_type: Event type identifier
        task_id: Celery task ID for logging

    Returns:
        Tuple of (filtered_users, filtered_out_user_ids)
        - filtered_users: List of (user_id, channel) tuples that passed filtering
        - filtered_out_user_ids: List of user IDs that were filtered out
    """
    filtered_users = []
    filtered_out_users: set[int] = set()

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

        # Track filtered out users
        allowed_set = set(allowed_user_ids)
        for user_id in user_ids:
            if user_id not in allowed_set:
                filtered_out_users.add(user_id)

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
            "filtered_out": len(filtered_out_users),
        },
    )

    return filtered_users, list(filtered_out_users)


def _apply_suppression(
    target_users: list[tuple[int, str]],
    event_type: str,
    payload: dict[str, Any],
    task_id: str,
) -> tuple[list[tuple[int, str]], list[int]]:
    """
    Apply suppression check (deduplicate within window).

    Args:
        target_users: List of (user_id, channel) tuples
        event_type: Event type identifier
        payload: Event payload (contains metadata with resource_id)
        task_id: Celery task ID for logging

    Returns:
        Tuple of (unsuppressed_users, suppressed_user_ids)
        - unsuppressed_users: List of (user_id, channel) tuples that are not suppressed
        - suppressed_user_ids: List of user IDs that were suppressed
    """
    unsuppressed_users = []
    suppressed_user_ids: list[int] = []

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

        if is_suppressed:
            suppressed_user_ids.append(user_id)
        else:
            unsuppressed_users.append((user_id, channel))

    logger.debug(
        "Suppression check applied",
        extra={
            "event_type": event_type,
            "task_id": task_id,
            "resource_id": resource_id,
            "before": len(target_users),
            "after": len(unsuppressed_users),
            "suppressed": len(suppressed_user_ids),
        },
    )

    return unsuppressed_users, suppressed_user_ids


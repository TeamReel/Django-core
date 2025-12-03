"""Celery tasks for event routing."""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def route_event_task(event_dict: dict) -> None:
    """
    Route event to notification recipients (async via Celery).

    This is a placeholder implementation that will be completed in WP08.

    Args:
        event_dict: Event dictionary with type, context, and payload
    """
    logger.info(
        "Event routing task received (placeholder)",
        extra={
            "event_type": event_dict.get("type"),
            "org_id": event_dict.get("context", {}).get("org_id"),
        },
    )
    # TODO: WP08 will implement actual routing logic:
    # 1. Query RoutingRules for matching rules
    # 2. Resolve target users based on rules
    # 3. Apply user preferences filtering
    # 4. Check organisation policies (quiet hours)
    # 5. Check suppression windows
    # 6. Hand off to B16 notification service

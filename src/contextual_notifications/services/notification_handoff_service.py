"""Notification handoff service for B16 integration."""

import logging
from typing import Any

from django.db import transaction
from notifications.models import Notification, NotificationType
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
b16_notifications_created_total = Counter(
    "contextual_notifications_b16_notifications_created_total",
    "Total number of B16 notifications created",
    ["event_type", "channel"],
)

b16_notifications_failed_total = Counter(
    "contextual_notifications_b16_notifications_failed_total",
    "Total number of B16 notification creation failures",
    ["event_type", "channel", "error_type"],
)

b16_handoff_time_seconds = Histogram(
    "contextual_notifications_b16_handoff_time_seconds",
    "Time spent in B16 handoff",
    ["event_type"],
)


class NotificationHandoffService:
    """
    Service for handing off routed notifications to B16 NotificationService.

    B17 (this service) routes notifications and determines target users.
    B16 handles actual delivery via email, in-app, or webhook channels.
    """

    # Priority mapping: event priority → B16 priority
    # B16 uses: 0=low, 1=normal, 2=high, 3=urgent
    PRIORITY_MAPPING = {
        "low": 0,
        "normal": 1,
        "high": 2,
        "urgent": 3,
    }

    @staticmethod
    def dispatch_to_b16(
        event_type: str,
        event_payload: dict[str, Any],
        target_users: list[tuple[int, str]],
    ) -> dict[str, Any]:
        """
        Dispatch routed event to B16 for notification creation.

        Creates one B16 Notification record per (user_id, channel) pair.
        Errors for individual users don't block batch - logged and tracked.

        Args:
            event_type: Event type identifier (e.g., "project.updated")
            event_payload: Event payload with title, body, url, priority, metadata
            target_users: List of (user_id, channel) tuples from routing

        Returns:
            Dict with success/failure counts and created notification IDs

        Example:
            >>> target_users = [(42, "email"), (43, "in_app"), (44, "push")]
            >>> result = NotificationHandoffService.dispatch_to_b16(
            ...     event_type="project.updated",
            ...     event_payload={
            ...         "title": "Project Updated",
            ...         "body": "Your project was modified",
            ...         "url": "/projects/123",
            ...         "priority": "high",
            ...         "metadata": {"project_id": 123}
            ...     },
            ...     target_users=target_users
            ... )
            >>> result
            {
                "total": 3,
                "succeeded": 2,
                "failed": 1,
                "notification_ids": [<uuid1>, <uuid2>],
                "errors": [{"user_id": 44, "channel": "push", "error": "..."}]
            }
        """
        if not target_users:
            logger.info("No target users for event", extra={"event_type": event_type})
            return {
                "total": 0,
                "succeeded": 0,
                "failed": 0,
                "notification_ids": [],
                "errors": [],
            }

        # Measure handoff time
        with b16_handoff_time_seconds.labels(event_type=event_type).time():
            # Extract B16 notification format from event payload
            b16_payload = NotificationHandoffService._map_to_b16_format(event_payload)

            # Get or create notification type for event
            notification_type = NotificationHandoffService._get_notification_type(
                event_type
            )

            # Create notifications per user
            results = {
                "total": len(target_users),
                "succeeded": 0,
                "failed": 0,
                "notification_ids": [],
                "errors": [],
            }

            for user_id, channel in target_users:
                try:
                    notification = NotificationHandoffService._create_b16_notification(
                        notification_type=notification_type,
                        user_id=user_id,
                        channel=channel,
                        payload=b16_payload,
                        event_metadata=event_payload.get("metadata", {}),
                    )

                    results["succeeded"] += 1
                    results["notification_ids"].append(str(notification.id))

                    # Increment success metric
                    b16_notifications_created_total.labels(
                        event_type=event_type, channel=channel
                    ).inc()

                    logger.debug(
                        "B16 notification created",
                        extra={
                            "event_type": event_type,
                            "user_id": user_id,
                            "channel": channel,
                            "notification_id": str(notification.id),
                        },
                    )

                except Exception as exc:
                    # Per-user error - log but don't block batch
                    results["failed"] += 1
                    results["errors"].append({
                        "user_id": user_id,
                        "channel": channel,
                        "error": str(exc),
                    })

                    # Increment failure metric
                    error_type = type(exc).__name__
                    b16_notifications_failed_total.labels(
                        event_type=event_type, channel=channel, error_type=error_type
                    ).inc()

                    logger.warning(
                        "Failed to create B16 notification for user",
                        extra={
                            "event_type": event_type,
                            "user_id": user_id,
                            "channel": channel,
                            "error": str(exc),
                            "error_type": error_type,
                        },
                        exc_info=True,
                    )

            # Log batch summary
            logger.info(
                "B16 handoff complete",
                extra={
                    "event_type": event_type,
                    "total_users": results["total"],
                    "succeeded": results["succeeded"],
                    "failed": results["failed"],
                },
            )

            return results

    @staticmethod
    def _map_to_b16_format(event_payload: dict[str, Any]) -> dict[str, Any]:
        """
        Map event payload to B16 notification format.

        B16 expects: {title, body, url, priority, ...}

        Args:
            event_payload: Event payload from EventService

        Returns:
            B16-formatted payload dict
        """
        # Extract fields with defaults
        title = event_payload.get("title", "Notification")
        body = event_payload.get("body", "")
        url = event_payload.get("url", "")
        priority_str = event_payload.get("priority", "normal")

        # Map priority string to B16 integer
        priority = NotificationHandoffService.PRIORITY_MAPPING.get(
            priority_str.lower(), 1  # default: normal=1
        )

        return {
            "title": title,
            "body": body,
            "url": url,
            "priority": priority,
        }

    @staticmethod
    def _get_notification_type(event_type: str) -> NotificationType:
        """
        Get or create NotificationType for event.

        Uses 'default' type for all events (B16 baseline type).
        Future: create per-event types if needed.

        Args:
            event_type: Event type identifier

        Returns:
            NotificationType instance
        """
        # Use default type (created by B16 migrations)
        return NotificationType.objects.get(code="default")

    @staticmethod
    @transaction.atomic
    def _create_b16_notification(
        notification_type: NotificationType,
        user_id: int,
        channel: str,
        payload: dict[str, Any],
        event_metadata: dict[str, Any],
    ) -> Notification:
        """
        Create B16 Notification record.

        Args:
            notification_type: NotificationType instance
            user_id: Target user ID
            channel: Delivery channel (in_app, email, push)
            payload: B16-formatted payload (title, body, url, priority)
            event_metadata: Original event metadata for context

        Returns:
            Created Notification instance

        Raises:
            Exception: On database or validation errors
        """
        from accounts.models import User

        # Get user instance
        user = User.objects.get(id=user_id)

        # Determine recipient format
        if channel == "in_app":
            recipient = str(user.id)
            recipient_user = user
        elif channel == "email":
            recipient = user.email
            recipient_user = None
        elif channel == "push":
            # Push not implemented in B16 yet - treat as in-app
            recipient = str(user.id)
            recipient_user = user
            channel = "in_app"
        else:
            raise ValueError(f"Unsupported channel: {channel}")

        # Create notification (B16 API)
        notification = Notification.objects.create(
            type=notification_type,
            channel=channel,
            recipient=recipient,
            recipient_user=recipient_user,
            payload=payload,
            metadata=event_metadata,  # Include event context
            status="pending",  # B16 will process async
        )

        return notification

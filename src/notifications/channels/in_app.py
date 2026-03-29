"""In-app notification channel for synchronous user notifications."""

from typing import Any, Dict

from django.core.exceptions import ValidationError
from django.utils import timezone
from notifications.channels.base import NotificationChannel
from notifications.models import Notification


class InAppChannel(NotificationChannel):
    """
    In-app notification channel for user-facing notifications.

    Characteristics:
    - Synchronous delivery (no Celery task)
    - Requires recipient_user FK to be set
    - Updates notification status to 'sent' immediately
    - Supports read/unread tracking via read_at timestamp
    """

    channel_name = "in_app"

    def send(self, notification: Notification) -> Dict[str, Any]:
        """
        Send in-app notification (synchronous).

        For in-app notifications, "sending" means marking as sent
        since the notification is already stored in the database
        and queryable by the user.

        Args:
            notification: Notification instance with channel='in_app'

        Returns:
            Dict with outcome and details

        Raises:
            ValidationError: If recipient_user is not set
        """
        # Validate in-app requirements
        if not notification.recipient_user_id:
            raise ValidationError("In-app notifications require recipient_user to be set")

        # Mark as sent (synchronous)
        notification.status = "sent"
        notification.updated_at = timezone.now()
        notification.save(update_fields=["status", "updated_at"])

        return {
            "outcome": "success",
            "channel": self.channel_name,
            "notification_id": str(notification.id),
            "recipient_user_id": notification.recipient_user_id,
        }

    def validate_recipient(self, recipient: str, **context: Any) -> bool:
        """
        Validate in-app notification recipient.

        Args:
            recipient: Should be user identifier
            context: Should contain recipient_user instance

        Returns:
            True if recipient_user is provided
        """
        # For in-app, recipient should match recipient_user
        recipient_user = context.get("recipient_user")
        return recipient_user is not None

    def validate_config(self) -> None:
        """
        Validate in-app channel configuration.

        In-app channel has no external config requirements.
        """
        # No external config needed for in-app

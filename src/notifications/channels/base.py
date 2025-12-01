"""Base notification channel abstraction."""

from abc import ABC, abstractmethod
from typing import Any, Dict

from notifications.models import Notification


class NotificationChannel(ABC):
    """Abstract base class for notification delivery channels.

    Subclasses implement specific delivery mechanisms (email, in-app, webhook, etc.)
    """

    @abstractmethod
    def send(self, notification: Notification) -> Dict[str, Any]:
        """Send notification via this channel.

        Args:
            notification: Notification instance to deliver

        Returns:
            Dict with delivery metadata:
                - status_code: HTTP-style status code (200 = success, 400+ = error)
                - response: Human-readable delivery result
                - duration_ms: Delivery time in milliseconds
                - Additional channel-specific fields

        Raises:
            TransientChannelError: Retryable error (timeout, connection refused)
            PermanentChannelError: Non-retryable error (invalid recipient, blocked)
        """
        raise NotImplementedError

    @abstractmethod
    def validate_recipient(self, recipient: str) -> bool:
        """Validate recipient format for this channel.

        Args:
            recipient: Recipient identifier (email, user ID, webhook URL, etc.)

        Returns:
            True if recipient format is valid for this channel
        """
        raise NotImplementedError

    def validate_config(self) -> None:
        """Validate channel-specific configuration.

        Override to check channel settings (SMTP credentials, API keys, etc.)

        Raises:
            ValueError: If configuration is invalid or incomplete
        """
        # Default implementation: no validation required

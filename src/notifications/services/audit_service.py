"""Audit logging integration for notifications."""

import hashlib
from typing import Any, Dict, Optional

from audit.api import audit_log
from notifications.models import Notification


class NotificationAuditService:
    """
    Service for logging notification events to B09 audit system.

    Privacy: Recipients are hashed before logging to protect PII.
    """

    # Event types for notification lifecycle
    EVENT_CREATED = "notification.created"
    EVENT_SENT = "notification.sent"
    EVENT_FAILED = "notification.failed"
    EVENT_READ = "notification.read"
    EVENT_RETRY = "notification.retry"

    @staticmethod
    def hash_recipient(recipient: str) -> str:
        """
        Hash recipient for privacy-preserving audit logs.

        Args:
            recipient: Email address, user ID, or webhook URL

        Returns:
            SHA-256 hash of recipient (hex string)
        """
        return hashlib.sha256(recipient.encode("utf-8")).hexdigest()

    @classmethod
    def log_notification_created(
        cls,
        notification: Notification,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log notification creation event.

        Args:
            notification: Notification instance
            actor: User or system that created notification
            additional_metadata: Extra context to include
        """
        metadata = {
            "notification_id": str(notification.id),
            "type": notification.type.code,
            "channel": notification.channel,
            "recipient_hash": cls.hash_recipient(notification.recipient),
            "status": notification.status,
        }

        if additional_metadata:
            metadata.update(additional_metadata)

        audit_log.record(
            event_type=cls.EVENT_CREATED,
            metadata=metadata,
        )

    @classmethod
    def log_notification_sent(
        cls,
        notification: Notification,
        attempt_number: int,
        duration_ms: Optional[int] = None,
    ) -> None:
        """
        Log successful notification delivery.

        Args:
            notification: Notification instance
            attempt_number: Delivery attempt number
            duration_ms: Time taken to deliver (milliseconds)
        """
        metadata = {
            "notification_id": str(notification.id),
            "type": notification.type.code,
            "channel": notification.channel,
            "recipient_hash": cls.hash_recipient(notification.recipient),
            "attempt_number": attempt_number,
        }

        if duration_ms is not None:
            metadata["duration_ms"] = duration_ms

        audit_log.record(
            event_type=cls.EVENT_SENT,
            metadata=metadata,
        )

    @classmethod
    def log_notification_failed(
        cls,
        notification: Notification,
        attempt_number: int,
        error_type: str,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log notification delivery failure.

        Args:
            notification: Notification instance
            attempt_number: Delivery attempt number
            error_type: Type of failure (permanent/transient)
            error_message: Error details (truncated for privacy)
        """
        metadata = {
            "notification_id": str(notification.id),
            "type": notification.type.code,
            "channel": notification.channel,
            "recipient_hash": cls.hash_recipient(notification.recipient),
            "attempt_number": attempt_number,
            "error_type": error_type,
        }

        if error_message:
            # Truncate error message to avoid logging sensitive data
            metadata["error_message"] = error_message[:500]

        audit_log.record(
            event_type=cls.EVENT_FAILED,
            metadata=metadata,
        )

    @classmethod
    def log_notification_read(
        cls,
        notification: Notification,
    ) -> None:
        """
        Log notification read event (in-app only).

        Args:
            notification: Notification instance
        """
        metadata = {
            "notification_id": str(notification.id),
            "type": notification.type.code,
            "channel": notification.channel,
            "recipient_hash": cls.hash_recipient(notification.recipient),
        }

        audit_log.record(
            event_type=cls.EVENT_READ,
            user=notification.recipient_user if notification.recipient_user else None,
            metadata=metadata,
        )

    @classmethod
    def log_notification_retry(
        cls,
        notification: Notification,
        attempt_number: int,
        retry_delay_seconds: int,
    ) -> None:
        """
        Log notification retry scheduling.

        Args:
            notification: Notification instance
            attempt_number: Next attempt number
            retry_delay_seconds: Delay before next retry
        """
        metadata = {
            "notification_id": str(notification.id),
            "type": notification.type.code,
            "channel": notification.channel,
            "recipient_hash": cls.hash_recipient(notification.recipient),
            "attempt_number": attempt_number,
            "retry_delay_seconds": retry_delay_seconds,
        }

        audit_log.record(
            event_type=cls.EVENT_RETRY,
            metadata=metadata,
        )

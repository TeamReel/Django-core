"""Notifications app configuration."""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuration for the notifications app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"
    verbose_name = "Notifications"

    def ready(self) -> None:
        """Initialize app when Django starts."""
        # Register audit event types
        from audit.registry import register_event_type

        # Notification lifecycle events
        register_event_type(
            "notification.created",
            "notification",
            "Notification created",
            required_metadata_keys=["notification_id", "type", "channel", "recipient_hash"],
        )
        register_event_type(
            "notification.sent",
            "notification",
            "Notification successfully delivered",
            required_metadata_keys=[
                "notification_id",
                "type",
                "channel",
                "recipient_hash",
                "attempt_number",
            ],
        )
        register_event_type(
            "notification.failed",
            "notification",
            "Notification delivery failed",
            required_metadata_keys=[
                "notification_id",
                "type",
                "channel",
                "recipient_hash",
                "attempt_number",
                "error_type",
            ],
        )
        register_event_type(
            "notification.read",
            "notification",
            "Notification marked as read (in-app only)",
            required_metadata_keys=["notification_id", "type", "channel", "recipient_hash"],
        )
        register_event_type(
            "notification.retry",
            "notification",
            "Notification retry scheduled",
            required_metadata_keys=[
                "notification_id",
                "type",
                "channel",
                "recipient_hash",
                "attempt_number",
                "retry_delay_seconds",
            ],
        )

        # Import signal handlers here when added in future work packages

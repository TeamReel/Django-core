"""Django app configuration for contextual_notifications."""

from django.apps import AppConfig


class ContextualNotificationsConfig(AppConfig):
    """Configuration for the Contextual Notifications app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "contextual_notifications"
    verbose_name = "Contextual Notifications"

    def ready(self) -> None:
        """Import models when app is ready."""
        # Import models for Django discovery
        from . import models  # noqa: F401

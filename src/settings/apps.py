"""Django app configuration for Settings & Feature Flags."""

from django.apps import AppConfig


class SettingsConfig(AppConfig):
    """Configuration for the settings app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "settings"
    verbose_name = "Settings & Feature Flags"

    def ready(self):
        """Import signal handlers when app is ready."""
        # Signal handlers will be connected here in WP07
        pass

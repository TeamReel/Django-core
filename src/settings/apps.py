"""Django app configuration for Settings & Feature Flags."""

from django.apps import AppConfig


class SettingsConfig(AppConfig):
    """Configuration for the settings app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.settings"
    verbose_name = "Settings & Feature Flags"

    def ready(self):
        """
        Import signal handlers when app is ready.

        Registers audit event types and connects signal handlers for
        FeatureFlag and Setting CRUD operations.
        """
        # Import signals module to connect handlers (T052)
        import src.settings.signals  # noqa: F401

        # Register audit event types with B09 audit system (T051)
        from src.settings.signals import register_audit_events

        register_audit_events()

"""Django app configuration for Web UI Baseline."""
from django.apps import AppConfig


class WebUIConfig(AppConfig):
    """Configuration for the web_ui app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "web_ui"
    verbose_name = "Web UI Baseline"

    def ready(self):
        """Import context processors and template tags when app is ready."""
        # Imports will be added when context processors and template tags are implemented

"""Django app configuration for workflows."""
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    """Configuration for the workflows app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.workflows"
    verbose_name = "Workflows"

    def ready(self):
        """Initialize workflows app (registries will be loaded here)."""
        pass  # Registry initialization will be added in WP04

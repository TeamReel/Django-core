"""Django app configuration for Projects & Workspaces."""

from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    """Configuration for the projects app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.projects"
    verbose_name = "Projects & Workspaces"

    def ready(self):
        """Import signal handlers when app is ready."""
        import src.projects.signals  # noqa: F401

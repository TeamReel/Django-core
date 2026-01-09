"""Django app configuration for the Email Tasks app."""

from django.apps import AppConfig


class EmailTasksConfig(AppConfig):
    """Configuration for the Email Tasks example app.

    This app demonstrates Celery task patterns including:
    - Async tasks with retries
    - Periodic scheduled tasks
    - Task chains and workflows
    - Error handling and monitoring
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "email_tasks"
    verbose_name = "Email Tasks Example"

    def ready(self) -> None:
        """Import signals and perform app initialization."""
        # Import tasks to ensure they're registered with Celery
        from . import tasks  # noqa: F401
        from . import scheduler  # noqa: F401

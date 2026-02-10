"""Django app configuration for video processing."""

from django.apps import AppConfig


class VideoConfig(AppConfig):
    """Video processing app configuration."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.video"
    verbose_name = "Video Processing"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        # Import signals here if needed in the future
        pass

from django.apps import AppConfig


class ActivityFeedConfig(AppConfig):
    """B62: Activity Feed — organisation-wide event timeline."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "activity_feed"
    verbose_name = "Activity Feed"

    def ready(self):
        """Import signal handlers to connect activity logging."""
        import activity_feed.signals  # noqa: F401

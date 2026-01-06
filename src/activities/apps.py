from django.apps import AppConfig


class ActivitiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "activities"
    verbose_name = "Activities & Period Hierarchy"

    def ready(self):
        """Import signal handlers when app is ready"""
        import activities.signals  # noqa: F401

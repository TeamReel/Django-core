from django.apps import AppConfig


class ActivitiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "activities"
    verbose_name = "Activities & Period Hierarchy"

    def ready(self):
        """Import signal handlers and register search indexes when app is ready"""
        import activities.signals  # noqa: F401

        # Register B14 search indexes if available
        try:
            from activities.search import ActivityIndex, PeriodIndex
            from search.registry import search_registry

            search_registry.register(PeriodIndex.model, PeriodIndex)
            search_registry.register(ActivityIndex.model, ActivityIndex)
        except ImportError:
            import logging

            logging.getLogger(__name__).warning(
                "B14 search module not available, skipping search registration"
            )

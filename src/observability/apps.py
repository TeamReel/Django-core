"""Django app configuration for observability."""

from django.apps import AppConfig


class ObservabilityConfig(AppConfig):
    """Configuration for the observability Django app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "observability"
    verbose_name = "Platform Observability"

    def ready(self) -> None:
        """
        Auto-register default health checks and metric collectors when app is ready.

        Implements:
        - T014: Register database, cache, queue, and migration checks
        - T033: Register PrometheusCollector if metrics enabled
        """
        from django.conf import settings
        from observability.checks.cache import CacheHealthCheck
        from observability.checks.database import DatabaseHealthCheck
        from observability.checks.migrations import MigrationHealthCheck
        from observability.checks.queue import QueueHealthCheck
        from observability.health import register_health_check

        # Register default health checks with criticality flags
        # Critical checks affect readiness probe; non-critical checks are reported only
        register_health_check("database", DatabaseHealthCheck(), critical=True)
        register_health_check(
            "cache", CacheHealthCheck(), critical=False
        )  # Non-critical per Clarification #4
        register_health_check("queue", QueueHealthCheck(), critical=True)
        register_health_check("migrations", MigrationHealthCheck(), critical=True)

        # Register metric collector (T033)
        if getattr(settings, "OBSERVABILITY_METRICS_ENABLED", False):
            from observability.exporters import PrometheusCollector
            from observability.metrics import register_metric_collector

            register_metric_collector(PrometheusCollector())

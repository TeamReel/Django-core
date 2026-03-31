"""Django app configuration for B34 Generative Pipelines."""

from django.apps import AppConfig


class GenerativeConfig(AppConfig):
    """App configuration for B34 Generative Pipelines."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.generative"
    verbose_name = "B34 Generative Pipelines"

    def ready(self) -> None:
        """Initialize app: register audit types, health checks, and signals."""
        import src.generative.signals  # noqa: F401

        self._register_audit_event_types()

    def _register_audit_event_types(self) -> None:
        """Register B34 generation audit event types with B09."""
        try:
            from audit.registry import register_event_type

            # Generation template events
            register_event_type(
                name="generation.template.created",
                category="generation",
                description="Generation template created",
            )
            register_event_type(
                name="generation.template.updated",
                category="generation",
                description="Generation template updated",
            )
            register_event_type(
                name="generation.template.versioned",
                category="generation",
                description="New generation template version created",
            )

            # Generation request events
            register_event_type(
                name="generation.request.submitted",
                category="generation",
                description="Generation request submitted",
            )
            register_event_type(
                name="generation.request.started",
                category="generation",
                description="Generation request processing started",
            )
            register_event_type(
                name="generation.request.completed",
                category="generation",
                description="Generation request completed successfully",
            )
            register_event_type(
                name="generation.request.failed",
                category="generation",
                description="Generation request failed",
            )
            register_event_type(
                name="generation.request.retried",
                category="generation",
                description="Generation request retried after transient error",
            )
            register_event_type(
                name="generation.request.cancelled",
                category="generation",
                description="Generation request cancelled",
            )

        except ImportError:
            # B09 Audit not installed - skip registration
            pass

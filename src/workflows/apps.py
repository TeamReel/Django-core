"""Django app configuration for workflows."""
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    """Configuration for the workflows app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.workflows"
    verbose_name = "Workflows"

    def ready(self):
        """Initialize workflows app (registries will be loaded here)."""
        try:
            # Use 'audit' directly as src is in PYTHONPATH
            from audit.registry import register_event_type

            # Register core workflow events
            register_event_type(
                "workflow.workflow_created", "workflow", "Workflow Instance Created"
            )

            # Register standard transition events (used in tests/defaults)
            register_event_type("workflow.transition_submit", "workflow", "Transition: Submit")
            register_event_type("workflow.transition_approve", "workflow", "Transition: Approve")
            register_event_type("workflow.transition_reject", "workflow", "Transition: Reject")
            register_event_type(
                "workflow.transition_submit_for_review", "workflow", "Transition: Submit to Review"
            )

        except ImportError:
            pass  # Audit service might not be available in all contexts

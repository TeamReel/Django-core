from django.apps import AppConfig


class ContentGenerationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "src.content_generation"
    verbose_name = "Content Generation"

    def ready(self):
        """Register audit event types, health check, and connect signals."""
        self._register_audit_event_types()
        self._register_health_check()
        self._connect_signals()

    def _register_audit_event_types(self):
        """Register B31 content generation audit event types with B09."""
        try:
            from audit.registry import register_event_type

            # ContentItem events
            register_event_type(
                name="content.item.created",
                category="content",
                description="Content item created and queued for generation",
            )
            register_event_type(
                name="content.item.status_changed",
                category="content",
                description="Content item status changed (generating, completed, failed)",
            )
            register_event_type(
                name="content.item.deleted",
                category="content",
                description="Content item soft-deleted",
            )

            # ContentApproval events
            register_event_type(
                name="content.approval.created",
                category="content",
                description="Content approval record created (approved/rejected/revision)",
            )

            # ContentTemplate events
            register_event_type(
                name="content.template.created",
                category="content",
                description="Content template created",
            )
            register_event_type(
                name="content.template.updated",
                category="content",
                description="Content template updated",
            )
            register_event_type(
                name="content.template.deleted",
                category="content",
                description="Content template deleted",
            )

        except ImportError:
            # B09 Audit module not installed, skip registration
            pass

    def _register_health_check(self):
        """Register content generation health check with B25 observability."""
        from .health import register_health_check

        register_health_check()

    def _connect_signals(self):
        """Connect post_save/post_delete signals for audit logging."""
        # Import signals module to register handlers
        from . import signals  # noqa: F401

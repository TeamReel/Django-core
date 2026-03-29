"""Trash app configuration."""

from django.apps import AppConfig


class TrashConfig(AppConfig):
    """Configuration for the trash/recycle bin app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "trash"
    verbose_name = "Trash & Recycle Bin"

    def ready(self) -> None:
        """Import signal handlers and register audit event types."""
        import trash.signals  # noqa: F401
        from audit.registry import register_event_type

        # B46: Soft Delete & Trash audit events
        register_event_type(
            "trash.soft_delete",
            "trash",
            "Object soft-deleted (moved to trash)",
            required_metadata_keys=["content_type", "object_id"],
        )
        register_event_type(
            "trash.restore",
            "trash",
            "Object restored from trash",
            required_metadata_keys=["content_type", "object_id"],
        )
        register_event_type(
            "trash.permanent_delete",
            "trash",
            "Object permanently deleted from trash",
            required_metadata_keys=["content_type", "object_id"],
        )

"""Django app configuration for Projects & Workspaces."""

from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    """Configuration for the projects app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "projects"
    verbose_name = "Projects & Workspaces"

    def ready(self):
        """Import signal handlers when app is ready."""
        import projects.signals  # noqa: F401

        from audit.registry import register_event_type

        # Register audit events
        register_event_type(
            "project.membership.created",
            "project",
            "User added to project",
            required_metadata_keys=["project_id", "user_id", "role"],
        )
        register_event_type(
            "project.membership.updated",
            "project",
            "Project membership role updated",
            required_metadata_keys=["project_id", "user_id", "old_role", "new_role"],
        )
        register_event_type(
            "project.membership.deleted",
            "project",
            "User removed from project",
            required_metadata_keys=["project_id", "user_id"],
        )

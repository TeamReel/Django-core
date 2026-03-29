"""Django app configuration for Projects & Workspaces."""

from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    """Configuration for the projects app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "projects"
    verbose_name = "Projects & Workspaces"

    def ready(self):
        """Import signal handlers when app is ready."""
        import projects.metrics  # noqa: F401
        import projects.signals  # noqa: F401
        from audit.registry import register_event_type

        # Register audit events for membership
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
        from projects.models import ProjectMembership
        from projects.search_indexes import ProjectMembershipIndex
        from search.registry import search_registry

        search_registry.register(ProjectMembership, ProjectMembershipIndex)
        # Register audit events for invitations
        register_event_type(
            "project.invitation.created",
            "project",
            "Project invitation created",
            required_metadata_keys=["invitation_id", "email", "role"],
        )
        register_event_type(
            "project.invitation.accepted",
            "project",
            "Project invitation accepted",
            required_metadata_keys=["invitation_id", "role"],
        )

        # Register audit events for security
        register_event_type(
            "project.access.emergency_override",
            "security",
            "Org Admin used emergency override to access private project",
            required_metadata_keys=["project_id", "organization_id", "user_id"],
        )
        register_event_type(
            "project.invitation.cancelled",
            "project",
            "Project invitation cancelled",
            required_metadata_keys=["invitation_id", "email"],
        )
        register_event_type(
            "project.invitation.resent",
            "project",
            "Project invitation resent",
            required_metadata_keys=["invitation_id", "email", "new_expires_at"],
        )

        # Register audit events for promotions
        register_event_type(
            "project.promotion.requested",
            "project",
            "Project promotion requested",
            required_metadata_keys=["promotion_id", "target_user_id", "from_role", "to_role"],
        )
        register_event_type(
            "project.promotion.accepted",
            "project",
            "Project promotion accepted",
            required_metadata_keys=["promotion_id", "from_role", "to_role"],
        )
        register_event_type(
            "project.promotion.declined",
            "project",
            "Project promotion declined",
            required_metadata_keys=["promotion_id"],
        )
        register_event_type(
            "project.promotion.cancelled",
            "project",
            "Project promotion cancelled",
            required_metadata_keys=["promotion_id"],
        )

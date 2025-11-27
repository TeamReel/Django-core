"""Django app configuration for permissions system"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class PermissionsConfig(AppConfig):
    """Configuration for hierarchical access control app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "permissions"
    verbose_name = _("Hierarchical Access Control")

    def ready(self) -> None:
        """
        Initialize permission registry when app is ready.

        Called once during Django startup. Registers base permissions
        for accounts, organisations, projects, and permissions resources.
        """
        # Import signal handlers for cache invalidation
        from . import signals  # noqa: F401

        # Initialize permission registry
        self._register_base_permissions()

    def _register_base_permissions(self) -> None:
        """Register core permissions for existing Django apps."""
        from .registry import permission_registry

        # Organization permissions (B06)
        permission_registry.register(
            "org.invite_users", "organisation", is_sensitive=False, description="Invite new users"
        )
        permission_registry.register(
            "org.remove_users",
            "organisation",
            is_sensitive=True,
            description="Remove users from organization",
        )
        permission_registry.register(
            "org.manage_settings",
            "organisation",
            is_sensitive=False,
            description="Manage organization settings",
        )
        permission_registry.register(
            "org.view_members",
            "organisation",
            is_sensitive=False,
            description="View organization members",
        )
        permission_registry.register(
            "org.assign_roles",
            "organisation",
            is_sensitive=True,
            description="Assign roles within organization",
        )
        permission_registry.register(
            "org.delete", "organisation", is_sensitive=True, description="Delete organization"
        )

        # Project permissions (B07)
        permission_registry.register(
            "projects.create", "project", is_sensitive=False, description="Create new projects"
        )
        permission_registry.register(
            "projects.view", "project", is_sensitive=False, description="View project details"
        )
        permission_registry.register(
            "projects.update", "project", is_sensitive=False, description="Update project details"
        )
        permission_registry.register(
            "projects.delete", "project", is_sensitive=True, description="Delete projects"
        )
        permission_registry.register(
            "projects.archive", "project", is_sensitive=False, description="Archive projects"
        )
        permission_registry.register(
            "projects.assign_roles",
            "project",
            is_sensitive=True,
            description="Assign roles within project",
        )

        # Permission management (self)
        permission_registry.register(
            "permissions.create_role", "role", is_sensitive=False, description="Create new roles"
        )
        permission_registry.register(
            "permissions.modify_role",
            "role",
            is_sensitive=True,
            description="Modify existing roles",
        )
        permission_registry.register(
            "permissions.delete_role", "role", is_sensitive=True, description="Delete roles"
        )
        permission_registry.register(
            "permissions.assign_role",
            "role_assignment",
            is_sensitive=True,
            description="Assign roles to users",
        )
        permission_registry.register(
            "permissions.view_roles", "role", is_sensitive=False, description="View roles"
        )

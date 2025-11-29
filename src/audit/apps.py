"""Audit app configuration."""

from django.apps import AppConfig


class AuditConfig(AppConfig):
    """Configuration for audit logging app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"
    verbose_name = "Audit Logging"

    def ready(self) -> None:
        """
        Register core event types when app is ready.

        This runs once per process during Django startup.
        """
        from .registry import register_event_type

        # Authentication Events
        register_event_type(
            "auth.login",
            "auth",
            "User successfully logged in",
            required_metadata_keys=["ip"],
        )
        register_event_type("auth.logout", "auth", "User logged out")
        register_event_type(
            "auth.login_failed",
            "auth",
            "Login attempt failed",
            required_metadata_keys=["ip", "username"],
        )
        register_event_type("auth.password_changed", "auth", "User changed password")

        # Permission Events
        register_event_type(
            "permission.checked",
            "permission",
            "Permission check performed",
            required_metadata_keys=["permission", "result"],
        )
        register_event_type(
            "permission.granted",
            "permission",
            "Permission explicitly granted",
            required_metadata_keys=["permission", "target_user_id"],
        )
        register_event_type(
            "permission.denied",
            "permission",
            "Permission explicitly denied",
            required_metadata_keys=["permission", "reason"],
        )

        # Role Events
        register_event_type(
            "role.assigned",
            "role",
            "Role assigned to user",
            required_metadata_keys=["role_name", "target_user_id"],
        )
        register_event_type(
            "role.revoked",
            "role",
            "Role revoked from user",
            required_metadata_keys=["role_name", "target_user_id"],
        )

        # Configuration Events
        register_event_type(
            "config.updated",
            "config",
            "System configuration changed",
            required_metadata_keys=["setting_name", "old_value", "new_value"],
        )
        register_event_type(
            "config.feature_toggled",
            "config",
            "Feature flag toggled",
            required_metadata_keys=["feature_name", "enabled"],
        )

        # Resource Events
        register_event_type(
            "resource.created",
            "resource",
            "Resource created",
            required_metadata_keys=["resource_type", "resource_id"],
        )
        register_event_type(
            "resource.deleted",
            "resource",
            "Resource deleted",
            required_metadata_keys=["resource_type", "resource_id"],
        )

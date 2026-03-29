"""Django app configuration for accounts module."""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuration for the accounts app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        import accounts.signals  # noqa: F401
        from audit.registry import register_event_type

        register_event_type(
            "user.activated",
            "user",
            "User account activated",
            required_metadata_keys=["target_user_id"],
        )
        register_event_type(
            "user.deactivated",
            "user",
            "User account deactivated",
            required_metadata_keys=["target_user_id"],
        )
        register_event_type(
            "user.password_reset_requested",
            "user",
            "Admin requested password reset email for user",
            required_metadata_keys=["target_user_id"],
        )
        register_event_type(
            "user.role_changed",
            "user",
            "Admin changed user role",
            required_metadata_keys=["target_user_id", "old_role", "new_role"],
        )

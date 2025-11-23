"""Django app configuration for accounts module."""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuration for the accounts app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        import accounts.signals  # noqa: F401

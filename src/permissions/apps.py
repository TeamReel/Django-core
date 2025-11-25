"""Django app configuration for permissions system"""

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class PermissionsConfig(AppConfig):
    """Configuration for the permissions app"""

    default_auto_field = "django.db.models.BigAutoField"
    name = "permissions"
    verbose_name = _("Permissions")

    def ready(self) -> None:
        """
        Initialize app when Django starts.

        This method is called once Django has loaded all apps.
        Imports signal handlers for cache invalidation (WP02).
        Registry initialization will be added in WP07.
        """
        # Import signal handlers for cache invalidation
        from . import signals  # noqa: F401

        # Initialize permission registry
        # (Will be implemented in WP07)
        # from .registry import registry
        # registry.register_defaults()

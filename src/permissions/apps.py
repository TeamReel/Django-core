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
        Used in WP07 to register default permissions via registry.
        """
        # Import signal handlers when app is ready
        # (Will be implemented in WP02 for cache invalidation)
        # from . import signals  # noqa

        # Initialize permission registry
        # (Will be implemented in WP07)
        # from .registry import registry
        # registry.register_defaults()
        pass

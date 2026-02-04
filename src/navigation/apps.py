"""Navigation app configuration."""

from django.apps import AppConfig


class NavigationConfig(AppConfig):
    """Configuration for the navigation app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "navigation"
    label = "navigation"
    verbose_name = "User Navigation State"

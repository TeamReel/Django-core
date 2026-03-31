"""Dashboard app configuration."""

from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig


class DashboardConfig(AppConfig):
    """Dashboard app — admin monitoring for TeamReel platform."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "dashboard"
    verbose_name = "Dashboard"


class TeamReelAdminConfig(AdminConfig):
    """Replaces django.contrib.admin to use our custom AdminSite."""

    default_site = "dashboard.admin_site.TeamReelAdminSite"

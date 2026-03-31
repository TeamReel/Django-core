"""Custom Django AdminSite with monitoring dashboard.

Replaces the default admin.site via AdminConfig.default_site in settings.
All existing @admin.register() decorators automatically register with this site.
"""

from __future__ import annotations

from dashboard.services import DashboardStatsService
from django.contrib.admin import AdminSite
from django.http import HttpRequest, HttpResponse


class TeamReelAdminSite(AdminSite):
    """Admin site with platform monitoring dashboard on the index page."""

    site_header = "TeamReel Admin"
    site_title = "TeamReel"
    index_title = "Dashboard"
    index_template = "admin/dashboard_index.html"

    def index(
        self, request: HttpRequest, extra_context: dict | None = None
    ) -> HttpResponse:
        """Override index to inject platform stats."""
        extra_context = extra_context or {}

        if request.user.is_superuser:
            extra_context["platform_stats"] = DashboardStatsService.get_platform_stats()
            extra_context["ai_stats"] = DashboardStatsService.get_ai_stats()
            extra_context["content_stats"] = DashboardStatsService.get_content_stats()
            extra_context["video_stats"] = DashboardStatsService.get_video_stats()

        return super().index(request, extra_context=extra_context)

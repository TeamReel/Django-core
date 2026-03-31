"""Dashboard API views for the interactive React dashboard.

Exposes platform stats, pipeline metrics, and credits data as JSON
for the frontend PlatformStatsPage. All endpoints require superuser access.
"""

from __future__ import annotations

from dashboard.services import DashboardStatsService
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response


class IsSuperUser(permissions.BasePermission):
    """Only allow superusers."""

    def has_permission(self, request: Request, view: object) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


@api_view(["GET"])
@permission_classes([IsSuperUser])
def overview(request: Request) -> Response:
    """Platform overview: counts + growth trends."""
    platform = DashboardStatsService.get_platform_stats()
    growth = DashboardStatsService.get_growth_stats()
    return Response(
        {"platform": platform, "growth": growth["weeks"]},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsSuperUser])
def pipelines(request: Request) -> Response:
    """AI, content, and video pipeline stats."""
    ai = DashboardStatsService.get_ai_stats()
    content = DashboardStatsService.get_content_stats()
    video = DashboardStatsService.get_video_stats()
    return Response(
        {"ai": ai, "content": content, "video": video},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsSuperUser])
def credits(request: Request) -> Response:
    """Credits usage overview."""
    credits_data = DashboardStatsService.get_credits_stats()
    return Response(credits_data, status=status.HTTP_200_OK)

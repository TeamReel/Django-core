"""Dashboard statistics service.

Gathers platform-wide statistics for the admin monitoring dashboard.
All results are cached via Django's cache framework (Redis, TTL 300s).
"""

from __future__ import annotations

from typing import TypedDict

from django.core.cache import cache


class PlatformStats(TypedDict):
    """Platform overview statistics."""

    organisations_count: int
    projects_count: int
    members_count: int
    periods_count: int
    activities_count: int
    participations_count: int
    users_count: int
    file_assets_count: int


PLATFORM_STATS_CACHE_KEY = "dashboard:platform_stats"
CACHE_TTL = 300  # 5 minutes


class DashboardStatsService:
    """Gathers and caches dashboard statistics."""

    @staticmethod
    def get_platform_stats(*, use_cache: bool = True) -> PlatformStats:
        """Return platform-wide counts for core models.

        Args:
            use_cache: If True (default), return cached results when available.

        Returns:
            PlatformStats dict with counts for all core models.
        """
        if use_cache:
            cached = cache.get(PLATFORM_STATS_CACHE_KEY)
            if cached is not None:
                return cached

        stats = DashboardStatsService._compute_platform_stats()
        cache.set(PLATFORM_STATS_CACHE_KEY, stats, CACHE_TTL)
        return stats

    @staticmethod
    def _compute_platform_stats() -> PlatformStats:
        """Execute count queries for all platform models."""
        # Import here to avoid circular imports at module level
        from accounts.models import User
        from activities.models import Activity, Participation, Period
        from files.models import FileAsset
        from organisations.models import Membership, Organisation
        from projects.models import Project

        return PlatformStats(
            organisations_count=Organisation.objects.filter(is_active=True).count(),
            projects_count=Project.objects.filter(is_active=True).count(),
            members_count=Membership.objects.filter(is_active=True).count(),
            periods_count=Period.objects.filter(deleted_at__isnull=True).count(),
            activities_count=Activity.objects.filter(deleted_at__isnull=True).count(),
            participations_count=Participation.objects.filter(
                deleted_at__isnull=True
            ).count(),
            users_count=User.objects.filter(is_active=True).count(),
            file_assets_count=FileAsset.objects.filter(is_deleted=False).count(),
        )

    @staticmethod
    def invalidate_platform_stats() -> None:
        """Clear the platform stats cache."""
        cache.delete(PLATFORM_STATS_CACHE_KEY)

"""Tests for the dashboard statistics service."""

import pytest
from dashboard.services import (
    CACHE_TTL,
    PLATFORM_STATS_CACHE_KEY,
    DashboardStatsService,
)
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear cache before and after each test."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestDashboardStatsService:
    """Tests for DashboardStatsService.get_platform_stats()."""

    def test_returns_all_expected_keys(self):
        stats = DashboardStatsService.get_platform_stats(use_cache=False)
        expected_keys = {
            "organisations_count",
            "projects_count",
            "members_count",
            "periods_count",
            "activities_count",
            "participations_count",
            "users_count",
            "file_assets_count",
        }
        assert set(stats.keys()) == expected_keys

    def test_counts_active_organisations(self):
        from organisations.models import Organisation

        user = User.objects.create_user(
            email="admin@test.com", password="test123",
            first_name="Test", last_name="User",
        )
        Organisation.objects.create(
            name="Active Org", slug="active-org", creator=user, is_active=True,
        )
        Organisation.objects.create(
            name="Inactive Org", slug="inactive-org", creator=user, is_active=False,
        )

        stats = DashboardStatsService.get_platform_stats(use_cache=False)
        assert stats["organisations_count"] == 1

    def test_caching_returns_cached_result(self):
        # First call — populates cache
        stats1 = DashboardStatsService.get_platform_stats()
        assert cache.get(PLATFORM_STATS_CACHE_KEY) is not None

        # Second call — should return same object from cache
        stats2 = DashboardStatsService.get_platform_stats()
        assert stats1 == stats2

    def test_bypass_cache(self):
        # Populate cache with stale data
        stale = {"organisations_count": 999}
        cache.set(PLATFORM_STATS_CACHE_KEY, stale, CACHE_TTL)

        stats = DashboardStatsService.get_platform_stats(use_cache=False)
        # Should NOT return stale data
        assert stats["organisations_count"] != 999

    def test_invalidate_cache(self):
        DashboardStatsService.get_platform_stats()
        assert cache.get(PLATFORM_STATS_CACHE_KEY) is not None

        DashboardStatsService.invalidate_platform_stats()
        assert cache.get(PLATFORM_STATS_CACHE_KEY) is None

    def test_excludes_soft_deleted_records(self):
        import datetime

        from activities.models import Period
        from django.utils import timezone
        from organisations.models import Organisation

        user = User.objects.create_user(
            email="del@test.com", password="test123",
            first_name="Del", last_name="User",
        )
        org = Organisation.objects.create(
            name="Del Org", slug="del-org", creator=user,
        )

        today = timezone.now().date()
        next_week = today + datetime.timedelta(days=7)

        # Active period
        Period.objects.create(
            organisation=org, name="Active Period",
            start_date=today,
            end_date=next_week,
        )
        # Soft-deleted period
        Period.objects.create(
            organisation=org, name="Deleted Period",
            start_date=today,
            end_date=next_week,
            deleted_at=timezone.now(),
        )

        stats = DashboardStatsService.get_platform_stats(use_cache=False)
        assert stats["periods_count"] == 1

"""Tests for Credits, Growth stats and refresh_dashboard_stats command."""

from __future__ import annotations

from datetime import timedelta

import pytest
from dashboard.services import (
    CREDITS_STATS_CACHE_KEY,
    GROWTH_STATS_CACHE_KEY,
    DashboardStatsService,
)
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.utils import timezone

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture()
def user(db):
    return User.objects.create_user(
        email="h2@test.com", password="test123",
        first_name="H2", last_name="Test",
    )


@pytest.fixture()
def org(user):
    from organisations.models import Organisation
    return Organisation.objects.create(
        name="Test Org", slug="test-org-h2", creator=user,
    )


# ── Credits Stats ───────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreditsStats:
    def test_top_5_orgs(self, user):
        from credits.models import CreditsBalance
        from organisations.models import Organisation

        orgs = []
        for i in range(7):
            o = Organisation.objects.create(
                name=f"Org {i}", slug=f"org-{i}", creator=user,
            )
            CreditsBalance.objects.create(
                organisation=o, current_balance=(i + 1) * 100,
            )
            orgs.append(o)

        stats = DashboardStatsService.get_credits_stats(use_cache=False)

        assert stats["total_credits_allocated"] == sum((i + 1) * 100 for i in range(7))
        assert len(stats["top_orgs"]) == 5
        # Top org should be Org 6 (700 credits)
        assert stats["top_orgs"][0]["name"] == "Org 6"
        assert stats["top_orgs"][0]["balance"] == 700

    def test_credits_monthly_comparison(self, user):
        from credits.models import CreditsBalance
        from organisations.models import Organisation

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 1:
            prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
        else:
            prev_month_start = month_start.replace(month=month_start.month - 1)

        # This month's org
        org1 = Organisation.objects.create(
            name="This Month", slug="this-month", creator=user,
        )
        cb1 = CreditsBalance.objects.create(organisation=org1, current_balance=500)
        CreditsBalance.objects.filter(pk=cb1.pk).update(created_at=month_start + timedelta(days=1))

        # Last month's org
        org2 = Organisation.objects.create(
            name="Last Month", slug="last-month", creator=user,
        )
        cb2 = CreditsBalance.objects.create(organisation=org2, current_balance=300)
        CreditsBalance.objects.filter(pk=cb2.pk).update(created_at=prev_month_start + timedelta(days=2))

        stats = DashboardStatsService.get_credits_stats(use_cache=False)

        assert stats["credits_this_month"] == 500
        assert stats["credits_last_month"] == 300

    def test_credits_caching(self, org):
        from credits.models import CreditsBalance
        CreditsBalance.objects.create(organisation=org, current_balance=42)

        stats1 = DashboardStatsService.get_credits_stats(use_cache=True)
        assert stats1["total_credits_allocated"] == 42

        # Create another balance — should still return cached
        from organisations.models import Organisation
        org2 = Organisation.objects.create(
            name="Org 2", slug="org-2-cache", creator=org.creator,
        )
        CreditsBalance.objects.create(organisation=org2, current_balance=100)

        stats2 = DashboardStatsService.get_credits_stats(use_cache=True)
        assert stats2["total_credits_allocated"] == 42  # still cached

        # After invalidation
        DashboardStatsService.invalidate_credits_stats()
        stats3 = DashboardStatsService.get_credits_stats(use_cache=True)
        assert stats3["total_credits_allocated"] == 142

    def test_empty_credits(self, user):
        stats = DashboardStatsService.get_credits_stats(use_cache=False)
        assert stats["total_credits_allocated"] == 0
        assert stats["top_orgs"] == []


# ── Growth Stats ────────────────────────────────────────────────────


@pytest.mark.django_db
class TestGrowthStats:
    def test_weekly_counts(self, user):
        from organisations.models import Membership, Organisation

        now = timezone.now()

        # Create orgs in two different weeks
        org1 = Organisation.objects.create(
            name="Week1 Org", slug="w1-org", creator=user,
        )
        Organisation.objects.filter(pk=org1.pk).update(
            created_at=now - timedelta(weeks=1, days=1),
        )
        org2 = Organisation.objects.create(
            name="Week0 Org", slug="w0-org", creator=user,
        )

        # Create memberships
        Membership.objects.create(
            organisation=org1, user=user, role="admin",
        )
        Membership.objects.filter(organisation=org1).update(
            joined_at=now - timedelta(weeks=1, days=1),
        )
        Membership.objects.create(
            organisation=org2, user=user, role="member",
        )

        stats = DashboardStatsService.get_growth_stats(use_cache=False)

        assert len(stats["weeks"]) > 0
        # At minimum we should see some weeks with counts
        total_orgs = sum(w["organisations"] for w in stats["weeks"])
        total_members = sum(w["members"] for w in stats["weeks"])
        assert total_orgs >= 2
        assert total_members >= 2

    def test_growth_includes_deltas(self, user):
        from organisations.models import Organisation

        now = timezone.now()

        # Two orgs in week N-2
        for i in range(2):
            o = Organisation.objects.create(
                name=f"Old {i}", slug=f"old-{i}", creator=user,
            )
            Organisation.objects.filter(pk=o.pk).update(
                created_at=now - timedelta(weeks=2, days=1),
            )

        # Three orgs in week N-1
        for i in range(3):
            o = Organisation.objects.create(
                name=f"New {i}", slug=f"new-{i}", creator=user,
            )
            Organisation.objects.filter(pk=o.pk).update(
                created_at=now - timedelta(weeks=1, days=1),
            )

        stats = DashboardStatsService.get_growth_stats(use_cache=False)

        # Find the week with 3 orgs — its delta should be positive
        week_with_3 = [w for w in stats["weeks"] if w["organisations"] == 3]
        if week_with_3:
            assert week_with_3[0]["delta_organisations"] > 0

    def test_growth_caching(self, user):
        stats1 = DashboardStatsService.get_growth_stats(use_cache=True)
        cached = cache.get(GROWTH_STATS_CACHE_KEY)
        assert cached is not None
        assert cached == stats1

    def test_empty_growth(self, user):
        stats = DashboardStatsService.get_growth_stats(use_cache=False)
        assert isinstance(stats["weeks"], list)


# ── Management Command ──────────────────────────────────────────────


@pytest.mark.django_db
class TestRefreshDashboardStatsCommand:
    def test_command_refreshes_cache(self, org):
        # Ensure caches are empty
        assert cache.get(CREDITS_STATS_CACHE_KEY) is None
        assert cache.get(GROWTH_STATS_CACHE_KEY) is None

        call_command("refresh_dashboard_stats")

        # After refresh, caches should be populated
        assert cache.get(CREDITS_STATS_CACHE_KEY) is not None
        assert cache.get(GROWTH_STATS_CACHE_KEY) is not None

    def test_command_verbose_output(self, org, capsys):
        call_command("refresh_dashboard_stats", verbose=True)
        output = capsys.readouterr().out
        assert "Dashboard stats refreshed" in output
        assert "Platform:" in output
        assert "Credits:" in output

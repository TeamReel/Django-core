"""Tests for the Data Explorer (H3) — per-app model counts, fill indicators, caching."""

import pytest
from dashboard.services import (
    DATA_EXPLORER_CACHE_KEY,
    DashboardStatsService,
)
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestDataExplorerService:
    """Tests for DashboardStatsService.get_data_explorer_stats()."""

    def test_counts_models(self):
        """Result contains apps with model counts."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        assert stats["total_apps"] > 0
        assert stats["total_models"] > 0
        assert isinstance(stats["apps"], list)

        # Each app has expected keys
        app = stats["apps"][0]
        assert "label" in app
        assert "verbose_name" in app
        assert "models" in app
        assert "total_records" in app
        assert "fill_indicator" in app

    def test_fill_indicators_values(self):
        """Fill indicators are one of 🟢/🟡/🔴."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        valid = {"🟢", "🟡", "🔴"}
        for app in stats["apps"]:
            assert app["fill_indicator"] in valid, (
                f"App '{app['label']}' has invalid indicator: {app['fill_indicator']}"
            )

    def test_excludes_internal_apps(self):
        """Internal Django apps (auth, sessions, etc.) are excluded."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        app_labels = {app["label"] for app in stats["apps"]}
        internal = {"admin", "auth", "contenttypes", "sessions", "token_blacklist"}
        assert app_labels.isdisjoint(internal), (
            f"Internal apps found: {app_labels & internal}"
        )

    def test_admin_links_format(self):
        """Admin changelist URLs have correct /admin/<app>/<model>/ format."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        for app in stats["apps"]:
            for model in app["models"]:
                url = model["admin_url"]
                if url:
                    assert url.startswith("/admin/"), f"Bad URL: {url}"
                    assert url.endswith("/"), f"URL missing trailing slash: {url}"

    def test_caching(self):
        """Result is cached and returned on subsequent calls."""
        stats1 = DashboardStatsService.get_data_explorer_stats()
        cached = cache.get(DATA_EXPLORER_CACHE_KEY)
        assert cached is not None
        stats2 = DashboardStatsService.get_data_explorer_stats()
        assert stats1 == stats2

    def test_filled_tables_pct(self):
        """filled_tables_pct is between 0 and 100."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        assert 0 <= stats["filled_tables_pct"] <= 100

    def test_summary_totals_consistent(self):
        """total_models equals sum of model counts across all apps."""
        stats = DashboardStatsService.get_data_explorer_stats(use_cache=False)
        model_count_sum = sum(len(app["models"]) for app in stats["apps"])
        assert stats["total_models"] == model_count_sum

        record_sum = sum(app["total_records"] for app in stats["apps"])
        assert stats["total_records"] == record_sum


@pytest.mark.django_db
class TestDataExplorerAdmin:
    """Data Explorer is included in the admin dashboard context."""

    def test_superuser_sees_data_explorer(self):
        user = User.objects.create_superuser(
            email="super@explorer.test",
            password="test123",
            first_name="Super",
            last_name="User",
        )
        client = Client()
        client.force_login(user)

        response = client.get("/admin/")
        assert response.status_code == 200
        assert "data_explorer" in response.context
        assert response.context["data_explorer"]["total_apps"] > 0

    def test_template_renders_data_explorer_section(self):
        user = User.objects.create_superuser(
            email="super2@explorer.test",
            password="test123",
            first_name="Super",
            last_name="User",
        )
        client = Client()
        client.force_login(user)

        response = client.get("/admin/")
        content = response.content.decode()
        assert "Data Explorer" in content
        assert "Gevuld" in content

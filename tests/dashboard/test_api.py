"""Tests for Dashboard API endpoints (H4a).

Tests auth, response shape, and superuser-only access for
/api/v1/dashboard/overview/, /pipelines/, /credits/.
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture()
def superuser(db):
    return User.objects.create_superuser(
        email="admin@test.com",
        password="test123",
        first_name="Admin",
        last_name="User",
    )


@pytest.fixture()
def regular_user(db):
    return User.objects.create_user(
        email="regular@test.com",
        password="test123",
        first_name="Regular",
        last_name="User",
    )


@pytest.fixture()
def admin_client(superuser):
    client = APIClient()
    client.force_authenticate(user=superuser)
    return client


@pytest.fixture()
def user_client(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    return client


@pytest.fixture()
def anon_client():
    return APIClient()


# ── Auth Tests ──────────────────────────────────────────────────────


@pytest.mark.django_db
class TestDashboardAPIAuth:
    """All dashboard endpoints require superuser."""

    def test_overview_anon_returns_401_or_403(self, anon_client):
        resp = anon_client.get("/api/v1/dashboard/overview/")
        assert resp.status_code in (401, 403)

    def test_overview_regular_user_returns_403(self, user_client):
        resp = user_client.get("/api/v1/dashboard/overview/")
        assert resp.status_code == 403

    def test_pipelines_anon_returns_401_or_403(self, anon_client):
        resp = anon_client.get("/api/v1/dashboard/pipelines/")
        assert resp.status_code in (401, 403)

    def test_pipelines_regular_user_returns_403(self, user_client):
        resp = user_client.get("/api/v1/dashboard/pipelines/")
        assert resp.status_code == 403

    def test_credits_anon_returns_401_or_403(self, anon_client):
        resp = anon_client.get("/api/v1/dashboard/credits/")
        assert resp.status_code in (401, 403)

    def test_credits_regular_user_returns_403(self, user_client):
        resp = user_client.get("/api/v1/dashboard/credits/")
        assert resp.status_code == 403


# ── Overview Endpoint ───────────────────────────────────────────────


@pytest.mark.django_db
class TestOverviewEndpoint:
    """GET /api/v1/dashboard/overview/"""

    def test_returns_200_for_superuser(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/overview/")
        assert resp.status_code == 200

    def test_response_has_platform_key(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/overview/")
        data = resp.json()["data"]
        assert "platform" in data
        # Frontend expects short keys (no _count suffix)
        assert "organisations" in data["platform"]
        assert "projects" in data["platform"]
        assert "members" in data["platform"]
        assert "users" in data["platform"]
        assert "file_assets" in data["platform"]

    def test_response_has_growth_key(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/overview/")
        data = resp.json()["data"]
        assert "growth" in data
        assert isinstance(data["growth"], list)


# ── Pipelines Endpoint ──────────────────────────────────────────────


@pytest.mark.django_db
class TestPipelinesEndpoint:
    """GET /api/v1/dashboard/pipelines/"""

    def test_returns_200_for_superuser(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/pipelines/")
        assert resp.status_code == 200

    def test_response_has_ai_key(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/pipelines/")
        data = resp.json()["data"]
        assert "ai" in data
        assert "requests_by_status" in data["ai"]

    def test_response_has_content_key(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/pipelines/")
        data = resp.json()["data"]
        assert "content" in data
        assert "items_by_status" in data["content"]

    def test_response_has_video_with_stale_jobs_array(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/pipelines/")
        data = resp.json()["data"]
        assert "video" in data
        assert "jobs_by_status" in data["video"]
        assert "stale_jobs" in data["video"]
        assert isinstance(data["video"]["stale_jobs"], list)


# ── Credits Endpoint ────────────────────────────────────────────────


@pytest.mark.django_db
class TestCreditsEndpoint:
    """GET /api/v1/dashboard/credits/"""

    def test_returns_200_for_superuser(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/credits/")
        assert resp.status_code == 200

    def test_response_has_credits_fields(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/credits/")
        data = resp.json()["data"]
        assert "total_allocated" in data
        assert "total_used" in data
        assert "usage_by_day" in data
        assert isinstance(data["usage_by_day"], list)
        assert "top_orgs" in data
        assert isinstance(data["top_orgs"], list)

    def test_accepts_range_param(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/credits/?range=7d")
        assert resp.status_code == 200


# ── Explorer Endpoint ───────────────────────────────────────────────


@pytest.mark.django_db
class TestExplorerEndpoint:
    """GET /api/v1/dashboard/explorer/"""

    def test_anon_returns_401_or_403(self, anon_client):
        resp = anon_client.get("/api/v1/dashboard/explorer/")
        assert resp.status_code in (401, 403)

    def test_regular_user_returns_403(self, user_client):
        resp = user_client.get("/api/v1/dashboard/explorer/")
        assert resp.status_code == 403

    def test_returns_200_for_superuser(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/explorer/")
        assert resp.status_code == 200

    def test_response_shape(self, admin_client):
        resp = admin_client.get("/api/v1/dashboard/explorer/")
        data = resp.json()["data"]
        assert "apps" in data
        assert isinstance(data["apps"], list)
        assert "total_apps" in data
        assert "total_models" in data
        assert "total_records" in data
        assert "filled_tables_pct" in data
        assert data["total_apps"] > 0

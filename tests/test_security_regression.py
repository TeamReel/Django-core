"""Security regression tests for H0 auth hardening.

Verifies that endpoints previously open (AllowAny / no auth) now
require authentication or staff-level access.

Covers:
- Generative FBVs (views_generate, views_save, views_jobs, views_crop)
- Transactions ViewSets (UsageEvent, Transaction, BalancePolicy)
- Observability views (metrics_summary, demo_health_check)
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def anon_client():
    return APIClient()


# ── Generative asset endpoints ────────────────────────────────────────


@pytest.mark.django_db
class TestGenerativeEndpointsRequireAuth:
    """All generative FBVs must reject unauthenticated requests (401)."""

    @pytest.mark.parametrize(
        "url_name,method",
        [
            ("asset-generate", "post"),
            ("asset-templates-list", "get"),
            ("asset-models-list", "get"),
            ("asset-save", "post"),
            ("asset-history", "get"),
            ("asset-restore", "post"),
            ("asset-crop-closeup", "post"),
        ],
    )
    def test_unauthenticated_blocked(self, anon_client, url_name, method):
        url = reverse(url_name)
        resp = getattr(anon_client, method)(url)
        assert resp.status_code == 401, (
            f"{method.upper()} {url} returned {resp.status_code}, expected 401"
        )


# ── Transactions endpoints ────────────────────────────────────────────


@pytest.mark.django_db
class TestTransactionsEndpointsRequireAuth:
    """Transactions ViewSets must reject unauthenticated requests (401)."""

    @pytest.mark.parametrize(
        "url_name",
        [
            "transactions:usage-event-list",
            "transactions:transaction-list",
            "transactions:balance-policy-list",
        ],
    )
    def test_unauthenticated_blocked(self, anon_client, url_name):
        url = reverse(url_name)
        resp = anon_client.get(url)
        assert resp.status_code == 401, (
            f"GET {url} returned {resp.status_code}, expected 401"
        )


# ── Observability endpoints ───────────────────────────────────────────


@pytest.mark.django_db
class TestObservabilityRequiresStaff:
    """Observability views must require staff/admin access."""

    @pytest.mark.parametrize(
        "url_name",
        [
            "observability-metrics-summary",
            "observability-demo-health",
        ],
    )
    def test_unauthenticated_blocked(self, anon_client, url_name):
        url = reverse(url_name)
        resp = anon_client.get(url)
        # staff_member_required redirects to login (302) or DRF returns 401/403
        assert resp.status_code in (
            301,
            302,
            401,
            403,
        ), f"GET {url} returned {resp.status_code}, expected redirect or 401/403"

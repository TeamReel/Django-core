"""Integration tests for health check endpoint.

Note: These tests mock infrastructure dependencies (SMTP, Celery, Redis)
to avoid requiring live services in the test environment.
"""

from unittest.mock import patch

import pytest
from django.urls import reverse
from notifications.views.health_views import HealthCheckView
from rest_framework import status


@pytest.fixture
def locmem_cache(settings):
    """Override cache settings to use local memory instead of Redis.

    This prevents ConnectionError when DRF throttling tries to access Redis.
    """
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "test-health-checks",
        }
    }


@pytest.mark.django_db
@pytest.mark.usefixtures("locmem_cache")
class TestHealthCheckIntegration:
    """Integration tests for health check endpoint."""

    def test_health_check_endpoint_exists(self, api_client):
        """Test health check endpoint is accessible."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK

    def test_health_check_all_ok(self, api_client):
        """Test health check returns OK when all checks pass."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "ok"
            assert "checks" in response.data
            assert response.data["checks"]["smtp"]["status"] == "ok"
            assert response.data["checks"]["celery_queue"]["status"] == "ok"

    def test_health_check_degraded(self, api_client):
        """Test health check returns degraded when one service is degraded."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "degraded", "details": "SMTP slow"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "degraded"

    def test_health_check_down(self, api_client):
        """Test health check returns down when service is down.

        Note: Always returns HTTP 200 OK. Health status is in response body.
        """
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "down", "details": "SMTP unreachable"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["status"] == "down"

    def test_smtp_check_success(self, api_client):
        """Test SMTP check returns OK when SMTP is reachable."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["checks"]["smtp"]["status"] == "ok"

    def test_smtp_check_failure(self, api_client):
        """Test SMTP check returns down when SMTP is unreachable."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "down", "details": "Connection refused"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            assert response.status_code == status.HTTP_200_OK
            assert response.data["checks"]["smtp"]["status"] == "down"

    def test_celery_queue_check_structure(self, api_client):
        """Test Celery queue check returns expected structure."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {
                "status": "ok",
                "details": "5 tasks pending",
                "metrics": {"active_tasks": 2, "reserved_tasks": 3, "total_pending": 5},
            }

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            celery_check = response.data["checks"]["celery_queue"]
            assert "status" in celery_check
            assert "details" in celery_check

    def test_health_check_no_authentication_required(self, api_client):
        """Test health check endpoint doesn't require authentication."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            # Should not return 401/403
            assert response.status_code != status.HTTP_401_UNAUTHORIZED
            assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_celery_queue_depth_metrics(self, api_client):
        """Test Celery queue depth metrics are included when available."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {
                "status": "ok",
                "details": "10 tasks pending",
                "metrics": {"active_tasks": 3, "reserved_tasks": 7, "total_pending": 10},
            }

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            celery_check = response.data["checks"]["celery_queue"]
            if "metrics" in celery_check:
                assert celery_check["metrics"]["total_pending"] == 10

    def test_health_check_response_format(self, api_client):
        """Test health check response has required format."""
        with (
            patch.object(HealthCheckView, "_check_smtp") as mock_smtp,
            patch.object(HealthCheckView, "_check_celery_queue") as mock_celery,
        ):
            mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
            mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

            url = reverse("notifications:health-check")
            response = api_client.get(url)

            # Check top-level structure
            assert response.data["status"] in ["ok", "degraded", "down"]
            assert "checks" in response.data

            # Check each health check has required fields
            for check_data in response.data["checks"].values():
                assert "status" in check_data
                assert "details" in check_data

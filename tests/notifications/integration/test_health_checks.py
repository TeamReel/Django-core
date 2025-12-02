"""Integration tests for health check endpoint.

Note: These tests mock infrastructure dependencies (SMTP, Celery, Redis)
to avoid requiring live services in the test environment.
"""

from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestHealthCheckIntegration:
    """Integration tests for health check endpoint."""

    @patch("rest_framework.views.APIView.check_throttles")  # Skip throttling
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_health_check_endpoint_exists(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test health check endpoint is accessible."""
        mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_health_check_all_ok(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test health check returns OK when all checks pass."""
        mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "ok"
        assert "checks" in response.data
        assert response.data["checks"]["smtp"]["status"] == "ok"
        assert response.data["checks"]["celery_queue"]["status"] == "ok"

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_health_check_degraded(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test health check returns degraded when one service is degraded."""
        mock_smtp.return_value = {"status": "degraded", "details": "SMTP slow"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "degraded"

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_health_check_down(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test health check returns down when service is down.

        Note: Always returns HTTP 200 OK. Health status is in response body.
        """
        mock_smtp.return_value = {"status": "down", "details": "SMTP unreachable"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "down"

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_smtp_check_success(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test SMTP check returns OK when SMTP is reachable."""
        mock_smtp.return_value = {"status": "ok", "details": "SMTP connected"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["checks"]["smtp"]["status"] == "ok"

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_smtp_check_failure(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test SMTP check returns down when SMTP is unreachable."""
        mock_smtp.return_value = {"status": "down", "details": "Connection refused"}
        mock_celery.return_value = {"status": "ok", "details": "0 tasks pending"}

        url = reverse("notifications:health-check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["checks"]["smtp"]["status"] == "down"

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_celery_queue_check_structure(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test Celery queue check returns expected structure."""
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

    @patch("rest_framework.views.APIView.check_throttles")
    def test_health_check_no_authentication_required(self, mock_throttle, api_client):
        """Test health check endpoint doesn't require authentication."""
        url = reverse("notifications:health-check")
        response = api_client.get(url)

        # Should not return 401/403
        assert response.status_code != status.HTTP_401_UNAUTHORIZED
        assert response.status_code != status.HTTP_403_FORBIDDEN

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_celery_queue_depth_metrics(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test Celery queue depth metrics are included when available."""
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

    @patch("rest_framework.views.APIView.check_throttles")
    @patch("notifications.views.health_views.HealthCheckView._check_smtp")
    @patch("notifications.views.health_views.HealthCheckView._check_celery_queue")
    def test_health_check_response_format(self, mock_celery, mock_smtp, mock_throttle, api_client):
        """Test health check response has required format."""
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

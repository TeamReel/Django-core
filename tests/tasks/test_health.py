"""Integration tests for task health checks."""

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestTasksHealthEndpoint:
    """Test /health/tasks/ endpoint."""

    def test_health_check_returns_200_when_healthy(self, client, celery_worker):
        """Test health endpoint returns 200 when broker and workers available."""
        url = reverse("tasks:health")
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "healthy"
        assert response.json()["broker"]["status"] == "ok"
        assert response.json()["workers"]["status"] == "ok"

    def test_health_check_returns_503_when_unhealthy(self, client, monkeypatch):
        """Test health endpoint returns 503 when broker unavailable."""
        # Mock broker check to return unhealthy
        from tasks import health

        monkeypatch.setattr(
            health, "check_broker_connectivity", lambda timeout: (False, "Broker unreachable")
        )

        url = reverse("tasks:health")
        response = client.get(url)

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()["status"] == "unhealthy"
        assert response.json()["broker"]["status"] == "error"

    def test_health_check_no_authentication_required(self, client):
        """Test health endpoint is public (no auth required)."""
        url = reverse("tasks:health")
        response = client.get(url)

        # Should not return 401/403
        assert response.status_code in [200, 503]


@pytest.mark.django_db
class TestCheckWorkersCommand:
    """Test check_workers management command."""

    def test_check_workers_command_success(self, celery_worker):
        """Test command reports healthy when workers active."""
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command("check_workers", stdout=out)

        output = out.getvalue()
        assert "HEALTHY" in output
        assert "Broker: OK" in output

    def test_check_workers_command_exit_code(self, monkeypatch):
        """Test command exits with code 1 when unhealthy."""
        from django.core.management import call_command
        from tasks import health

        monkeypatch.setattr(
            health,
            "get_celery_health_status",
            lambda timeout: {
                "status": "unhealthy",
                "broker": {"status": "error", "message": "Down"},
                "workers": {"status": "error", "message": "None"},
            },
        )

        with pytest.raises(SystemExit) as exc_info:
            call_command("check_workers", exit_code=True)

        assert exc_info.value.code == 1

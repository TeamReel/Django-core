"""Auth regression tests for observability endpoints.

Verifies that metrics_summary and demo_health_check require
staff authentication.
"""

import pytest
from accounts.models import User
from django.test import Client


@pytest.mark.django_db
class TestObservabilityAuthRequired:
    """Verify observability views require staff authentication."""

    def test_metrics_summary_requires_login(self):
        client = Client()
        response = client.get("/api/v1/metrics/")
        assert response.status_code == 302  # Redirect to login

    def test_demo_health_check_requires_login(self):
        client = Client()
        response = client.get("/api/v1/demo-health/")
        assert response.status_code == 302  # Redirect to login

    def test_metrics_summary_rejects_non_staff(self):
        user = User.objects.create_user(email="regular@test.com", password="pass")
        client = Client()
        client.force_login(user)
        response = client.get("/api/v1/metrics/")
        assert response.status_code == 302  # staff_member_required redirects

    def test_demo_health_check_rejects_non_staff(self):
        user = User.objects.create_user(email="regular2@test.com", password="pass")
        client = Client()
        client.force_login(user)
        response = client.get("/api/v1/demo-health/")
        assert response.status_code == 302  # staff_member_required redirects

    def test_metrics_summary_allows_staff(self):
        staff = User.objects.create_user(
            email="staff@test.com", password="pass", is_staff=True, is_active=True
        )
        client = Client()
        client.force_login(staff)
        response = client.get("/api/v1/metrics/")
        assert response.status_code == 200

    def test_demo_health_check_allows_staff(self):
        staff = User.objects.create_user(
            email="staff2@test.com", password="pass", is_staff=True, is_active=True
        )
        client = Client()
        client.force_login(staff)
        response = client.get("/api/v1/demo-health/")
        assert response.status_code == 200

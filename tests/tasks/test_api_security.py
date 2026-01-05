"""Security tests for Tasks API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestTasksApiSecurity:
    """Test security controls on Tasks API."""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    def test_tasks_list_requires_authentication(self, api_client):
        """Verify /api/v1/tasks/ is not publicly accessible."""
        url = reverse("tasks:list")
        response = api_client.get(url)

        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_tasks_list_accessible_authenticated(self, api_client, admin_user):
        """Verify /api/v1/tasks/ is accessible with authentication."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("tasks:list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

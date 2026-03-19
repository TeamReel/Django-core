"""Permission tests for B{NUMBER}: {MODULE_TITLE}."""

import pytest

from rest_framework.test import APIClient

from {APP_NAME}.models import {MODEL_NAME}

API_URL = "/api/v1/{URL_PREFIX}/"


@pytest.mark.django_db
class Test{MODEL_NAME}Permissions:
    """Tests for {MODEL_NAME} permission boundaries."""

    def test_unauthenticated_read(self, unauthenticated_client):
        """Unauthenticated users cannot read."""
        response = unauthenticated_client.get(API_URL)
        assert response.status_code in (401, 403)

    def test_unauthenticated_write(self, unauthenticated_client):
        """Unauthenticated users cannot write."""
        response = unauthenticated_client.post(API_URL, {{}}, format="json")
        assert response.status_code in (401, 403)

    def test_authenticated_read(self, authenticated_client, {FIXTURE_NAME}):
        """Authenticated users can read."""
        response = authenticated_client.get(API_URL)
        assert response.status_code == 200

    def test_staff_create(self, authenticated_client):
        """Staff users can create."""
        data = {
            # {CREATE_FIELDS}
        }
        response = authenticated_client.post(API_URL, data, format="json")
        assert response.status_code == 201

    def test_owner_update(self, authenticated_client, {FIXTURE_NAME}):
        """Owner can update their own resource."""
        data = {
            # {UPDATE_FIELDS}
        }
        response = authenticated_client.patch(
            f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/", data, format="json"
        )
        assert response.status_code == 200

    def test_owner_delete(self, authenticated_client, {FIXTURE_NAME}):
        """Owner can delete their own resource."""
        response = authenticated_client.delete(f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/")
        assert response.status_code == 204

    def test_non_owner_cannot_update(self, {FIXTURE_NAME}, other_user):
        """Non-owner non-staff cannot update others' resources."""
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.patch(
            f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/",
            {{"metadata": {{}}}},
            format="json",
        )
        assert response.status_code == 403

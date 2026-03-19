"""API tests for B{NUMBER}: {MODULE_TITLE}."""

import pytest

from {APP_NAME}.models import {MODEL_NAME}

API_URL = "/api/v1/{URL_PREFIX}/"


@pytest.mark.django_db
class Test{MODEL_NAME}ViewSet:
    """Tests for {MODEL_NAME} CRUD API."""

    def test_list_authenticated(self, authenticated_client, {FIXTURE_NAME}):
        """Authenticated user can list resources."""
        response = authenticated_client.get(API_URL)
        assert response.status_code == 200
        assert response.data["count"] >= 1

    def test_list_unauthenticated(self, unauthenticated_client):
        """Unauthenticated request returns 401."""
        response = unauthenticated_client.get(API_URL)
        assert response.status_code in (401, 403)

    def test_create(self, authenticated_client):
        """Create a new resource with valid data."""
        data = {
            # {CREATE_FIELDS}
        }
        response = authenticated_client.post(API_URL, data, format="json")
        assert response.status_code == 201
        assert {MODEL_NAME}.objects.count() == 1

    def test_create_invalid(self, authenticated_client):
        """Create with invalid data returns 400."""
        response = authenticated_client.post(API_URL, {{}}, format="json")
        assert response.status_code == 400

    def test_retrieve(self, authenticated_client, {FIXTURE_NAME}):
        """Retrieve a single resource."""
        response = authenticated_client.get(f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/")
        assert response.status_code == 200
        assert response.data["id"] == str({FIXTURE_NAME}.pk)

    def test_update(self, authenticated_client, {FIXTURE_NAME}):
        """Update an existing resource."""
        data = {
            # {UPDATE_FIELDS}
        }
        response = authenticated_client.patch(
            f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/", data, format="json"
        )
        assert response.status_code == 200

    def test_delete_soft(self, authenticated_client, {FIXTURE_NAME}):
        """Delete soft-deletes (is_active=False)."""
        response = authenticated_client.delete(f"{{API_URL}}{{{FIXTURE_NAME}.pk}}/")
        assert response.status_code == 204
        {FIXTURE_NAME}.refresh_from_db()
        assert {FIXTURE_NAME}.is_active is False

    def test_org_isolation(self, authenticated_client, other_organisation, other_user):
        """Cannot see resources from other organisations."""
        other_obj = {MODEL_NAME}.objects.create(
            organisation=other_organisation,
            created_by=other_user,
            # {REQUIRED_FIELDS}
        )
        response = authenticated_client.get(API_URL)
        ids = [r["id"] for r in response.data.get("results", response.data)]
        assert str(other_obj.pk) not in ids

    def test_pagination(self, authenticated_client, organisation, user):
        """Results are paginated."""
        for i in range(25):
            {MODEL_NAME}.objects.create(
                organisation=organisation,
                created_by=user,
                # {BULK_FIELDS}
            )
        response = authenticated_client.get(API_URL)
        assert response.status_code == 200
        assert "count" in response.data
        assert "results" in response.data

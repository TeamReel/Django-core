"""Tests for PATCH /auth/profile endpoint."""

# ruff: noqa: S101, S106  # Allow assert and hardcoded passwords in tests

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework import status

User = get_user_model()


@pytest.fixture
def authenticated_user(db):
    """Create and return authenticated user."""
    user = User.objects.create_user(
        email="test@example.com",
        password="TestPass123!",
        first_name="Original",
        last_name="Name",
        is_active=True,
    )
    return user


@pytest.fixture
def authenticated_client(authenticated_user):
    """Return Django test client with authenticated session."""
    client = Client()
    client.force_login(authenticated_user)
    return client, authenticated_user


@pytest.mark.django_db
class TestProfileUpdateEndpoint:
    """Test suite for PATCH /auth/profile endpoint."""

    def test_update_first_name_with_valid_password(self, authenticated_client):
        """Test: Update first_name with correct current_password."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "Updated", "current_password": "TestPass123!"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert data["data"]["first_name"] == "Updated"
        assert data["data"]["last_name"] == "Name"  # Unchanged

        # Verify database updated
        user.refresh_from_db()
        assert user.first_name == "Updated"

    def test_update_both_names(self, authenticated_client):
        """Test: Update both first_name and last_name."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={
                "first_name": "New First",
                "last_name": "New Last",
                "current_password": "TestPass123!",
            },
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "New First"
        assert user.last_name == "New Last"

    def test_missing_current_password_returns_400(self, authenticated_client):
        """Test: Request without current_password fails."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "Updated"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["success"] is False
        assert "current_password" in data["errors"]

    def test_incorrect_current_password_returns_400(self, authenticated_client):
        """Test: Wrong current_password fails with generic error."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "Updated", "current_password": "WrongPassword"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["success"] is False
        assert "Unable to verify credentials" in str(data["errors"])

        # Verify no changes persisted
        user.refresh_from_db()
        assert user.first_name == "Original"

    def test_empty_first_name_returns_400(self, authenticated_client):
        """Test: Empty first_name fails validation."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "   ", "current_password": "TestPass123!"},  # Whitespace only
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "first_name" in data["errors"]

    def test_too_long_name_returns_400(self, authenticated_client):
        """Test: Name exceeding 150 chars fails validation."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "A" * 151, "current_password": "TestPass123!"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "first_name" in data["errors"]

    def test_unauthenticated_request_returns_401(self, db):
        """Test: Unauthenticated request returns 401."""
        client = Client()
        response = client.patch(
            "/api/v1/auth/profile",
            data={"first_name": "Updated", "current_password": "TestPass123!"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_last_name_only(self, authenticated_client):
        """Test: Update only last_name, first_name unchanged."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"last_name": "NewLastName", "current_password": "TestPass123!"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "Original"  # Unchanged
        assert user.last_name == "NewLastName"

    def test_empty_last_name_returns_400(self, authenticated_client):
        """Test: Empty last_name fails validation."""
        client, user = authenticated_client
        response = client.patch(
            "/api/v1/auth/profile",
            data={"last_name": "", "current_password": "TestPass123!"},
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "last_name" in data["errors"]

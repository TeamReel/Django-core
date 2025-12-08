"""Tests for GET /auth/me endpoint."""

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
        first_name="Test",
        last_name="User",
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
class TestAuthMeEndpoint:
    """Test suite for GET /auth/me endpoint."""

    def test_authenticated_user_returns_profile(self, authenticated_client):
        """Test: Authenticated user receives profile data."""
        client, user = authenticated_client
        response = client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == user.id
        assert data["email"] == user.email
        assert data["first_name"] == user.first_name
        assert data["last_name"] == user.last_name
        assert data["role"] == "user"
        assert data["is_active"] is True
        assert "email_verified" in data

    def test_unauthenticated_user_returns_401(self, db):
        """Test: Unauthenticated request returns 401."""
        client = Client()
        response = client.get("/api/v1/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_superuser_role_mapping(self, db):
        """Test: Superuser mapped to 'superadmin' role."""
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPass123!",
            first_name="Admin",
            last_name="User",
        )
        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/auth/me")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["role"] == "superadmin"

    def test_staff_role_mapping(self, db):
        """Test: Staff user mapped to 'admin' role."""
        user = User.objects.create_user(
            email="staff@example.com",
            password="StaffPass123!",
            first_name="Staff",
            last_name="User",
            is_staff=True,
        )
        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/auth/me")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["role"] == "admin"

    def test_inactive_user_returns_profile(self, db):
        """Test: Inactive user still authenticated but profile shows is_active=False."""
        user = User.objects.create_user(
            email="inactive@example.com",
            password="InactivePass123!",
            first_name="Inactive",
            last_name="User",
            is_active=False,
        )
        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/auth/me")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_active"] is False

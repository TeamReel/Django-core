import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_admin_create_user():
    # Create a superadmin to authenticate
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)

    data = {
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!",
        "first_name": "New",
        "last_name": "User",
    }

    response = client.post("/api/v1/admin/users/", data)

    assert response.status_code == 201
    assert response.data["email"] == "newuser@example.com"
    assert response.data["first_name"] == "New"
    assert response.data["last_name"] == "User"

    # Verify user exists in DB
    assert User.objects.filter(email="newuser@example.com").exists()
    created_user = User.objects.get(email="newuser@example.com")
    assert created_user.check_password("SecurePassword123!")


@pytest.mark.django_db
def test_admin_create_user_invalid_data():
    # Create a superadmin to authenticate
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # Missing password
    data = {"email": "incomplete@example.com", "first_name": "Incomplete", "last_name": "User"}

    response = client.post("/api/v1/admin/users/", data)

    assert response.status_code == 400
    assert "password" in response.data


@pytest.mark.django_db
def test_non_admin_cannot_create_user():
    # Create a regular user
    user = User.objects.create_user(
        email="regular@example.com", password="password123", first_name="Regular", last_name="User"
    )

    client = APIClient()
    client.force_authenticate(user=user)

    data = {
        "email": "hacker@example.com",
        "password": "password123",
        "first_name": "Hacker",
        "last_name": "User",
    }

    response = client.post("/api/v1/admin/users/", data)

    # Should be 403 Forbidden
    assert response.status_code == 403

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_admin_delete_user():
    # Create admin user
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    # Create target user
    target_user = User.objects.create_user(
        email="target@example.com", password="password123", first_name="Target", last_name="User"
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # Delete user
    response = client.delete(f"/api/v1/admin/users/{target_user.id}/")

    assert response.status_code == 204
    assert not User.objects.filter(id=target_user.id).exists()


@pytest.mark.django_db
def test_admin_cannot_delete_self():
    # Create admin user
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # Try to delete self
    response = client.delete(f"/api/v1/admin/users/{admin_user.id}/")

    assert response.status_code == 403
    assert User.objects.filter(id=admin_user.id).exists()

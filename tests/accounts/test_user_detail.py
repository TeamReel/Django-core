import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_admin_user_detail_api():
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

    # Get user details
    response = client.get(f"/api/v1/admin/users/{target_user.id}/")

    if response.status_code != 200:
        print(f"Error response: {response.data}")

    assert response.status_code == 200
    assert response.data["email"] == "target@example.com"
    assert response.data["id"] == target_user.id
    assert "organisations" in response.data

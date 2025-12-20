import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_admin_user_detail_with_memberships():
    # Create admin user
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    # Create target user
    target_user = User.objects.create_user(
        email="target@example.com", password="password123", first_name="Target", last_name="User"
    )

    # Create organisation
    org = Organisation.objects.create(name="Test Org", slug="test-org", creator=admin_user)

    # Add target user as member
    Membership.objects.create(user=target_user, organisation=org, role="member")

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # Get user details
    response = client.get(f"/api/v1/admin/users/{target_user.id}/")

    assert response.status_code == 200
    assert len(response.data["organisations"]) == 1
    assert response.data["organisations"][0]["slug"] == "test-org"

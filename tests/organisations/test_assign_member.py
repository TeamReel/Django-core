import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_assign_user_to_org_via_api():
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

    # Add admin as member (so they have permission)
    Membership.objects.create(user=admin_user, organisation=org, role="admin")

    client = APIClient()
    client.force_authenticate(user=admin_user)

    data = {"email": "target@example.com", "role": "member"}

    # Try to assign user using slug in URL
    response = client.post(f"/api/v1/organisations/{org.slug}/members/", data)

    if response.status_code != 201:
        print(f"Error response: {response.data}")

    assert response.status_code == 201
    assert Membership.objects.filter(user=target_user, organisation=org).exists()

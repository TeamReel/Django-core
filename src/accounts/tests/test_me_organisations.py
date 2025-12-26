import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestAuthMeOrganisations:
    """Test suite for GET /auth/me endpoint with organisations."""

    def test_user_with_organisations(self):
        """Test: Authenticated user receives organisation memberships."""
        # Create user
        user = User.objects.create_user(
            email="orguser@example.com",
            password="TestPass123!",
            first_name="Org",
            last_name="User",
            is_active=True,
        )

        # Create organisation
        org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)

        # Create membership
        if not Membership.objects.filter(user=user, organisation=org).exists():
            Membership.objects.create(user=user, organisation=org, role="admin")

        client = Client()
        client.force_login(user)

        response = client.get("/api/v1/auth/me/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "organisations" in data
        assert isinstance(data["organisations"], list)
        assert len(data["organisations"]) == 1

        org_data = data["organisations"][0]
        assert org_data["slug"] == "test-org"
        assert "admin" in org_data["role"]

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestSecurityViewAccess:
    """Test suite for Security View access control."""

    def test_org_admin_access_with_org_param(self):
        """Test: Org Admin can access security view for their org."""
        # Create user
        user = User.objects.create_user(
            email="orgadmin@example.com",
            password="TestPass123!",
            first_name="Org",
            last_name="Admin",
            is_active=True,
        )

        # Create organisation
        org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)

        # Create membership
        Membership.objects.create(user=user, organisation=org, role="admin")

        client = Client()
        client.force_login(user)

        # Request WITH org param
        response = client.get("/api/security/events/?org=test-org")

        # Should be 200 OK (or whatever success code, definitely not 403)
        assert response.status_code != status.HTTP_403_FORBIDDEN

    def test_org_admin_no_access_without_org_param(self):
        """Test: Org Admin cannot access global security view."""
        user = User.objects.create_user(
            email="orgadmin2@example.com",
            password="TestPass123!",
            first_name="Org",
            last_name="Admin",
            is_active=True,
        )
        client = Client()
        client.force_login(user)

        response = client.get("/api/security/events/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

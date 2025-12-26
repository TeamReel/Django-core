import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestSecurityEventsViewRBAC:
    def setup_method(self):
        self.client = APIClient()
        self.url = "/api/security/events/"

        # Create users
        self.system_admin = User.objects.create_user(
            email="sysadmin@example.com", password="password", is_staff=True
        )
        self.org_admin = User.objects.create_user(email="orgadmin@example.com", password="password")
        self.member = User.objects.create_user(email="member@example.com", password="password")

        # Create org
        self.org = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.system_admin
        )

        # Memberships
        Membership.objects.create(user=self.org_admin, organisation=self.org, role="admin")
        Membership.objects.create(user=self.member, organisation=self.org, role="member")

    def test_system_admin_access_global(self):
        self.client.force_authenticate(user=self.system_admin)
        response = self.client.get(self.url)
        assert response.status_code == 200

    def test_system_admin_access_org(self):
        self.client.force_authenticate(user=self.system_admin)
        response = self.client.get(self.url, {"org": "test-org"})
        assert response.status_code == 200
        assert "events" in response.data
        # Check for fake org event
        assert any(e["id"] == "ORG-001" for e in response.data["events"])

    def test_org_admin_access_own_org(self):
        self.client.force_authenticate(user=self.org_admin)
        response = self.client.get(self.url, {"org": "test-org"})
        assert response.status_code == 200

    def test_org_admin_denied_global(self):
        self.client.force_authenticate(user=self.org_admin)
        response = self.client.get(self.url)
        # Should be denied because org param is missing and they are not system admin
        assert response.status_code == 403

    def test_member_denied_access(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.get(self.url, {"org": "test-org"})
        assert response.status_code == 403

    def test_org_admin_denied_other_org(self):
        other_org = Organisation.objects.create(
            name="Other Org", slug="other-org", creator=self.system_admin
        )
        self.client.force_authenticate(user=self.org_admin)
        response = self.client.get(self.url, {"org": "other-org"})
        assert response.status_code == 403

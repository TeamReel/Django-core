"""Security tests for B11 transaction/credit ACL bypass attempts (WP02-T014).

Tests explicitly attempt to bypass ACL controls by accessing unauthorized
organization/project balances. All bypass attempts should result in 403
and be logged in B09 audit events.
"""

import pytest
from audit.models import AuditEvent
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from projects.models import Project
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    """Create API client for tests."""
    return APIClient()


@pytest.fixture
def org_a():
    """Create first test organization."""
    return Organisation.objects.create(name="Organization A", slug="org-a")


@pytest.fixture
def org_b():
    """Create second test organization."""
    return Organisation.objects.create(name="Organization B", slug="org-b")


@pytest.fixture
def project_in_org_a(org_a):
    """Create project in Organization A."""
    return Project.objects.create(name="Project A1", slug="project-a1", organisation=org_a)


@pytest.fixture
def project_in_org_b(org_b):
    """Create project in Organization B."""
    return Project.objects.create(name="Project B1", slug="project-b1", organisation=org_b)


@pytest.fixture
def org_view_balance_permission():
    """Create organization.view_balance permission."""
    return Permission.objects.get_or_create(
        permission="organization.view_balance",
        defaults={
            "resource_type": "organization",
            "description": "View organisation transaction balance",
            "is_sensitive": False,
        },
    )[0]


@pytest.fixture
def project_view_balance_permission():
    """Create project.view_balance permission."""
    return Permission.objects.get_or_create(
        permission="project.view_balance",
        defaults={
            "resource_type": "project",
            "description": "View project transaction balance",
            "is_sensitive": False,
        },
    )[0]


@pytest.fixture
def user_in_org_a(org_a, org_view_balance_permission):
    """Create user with access to Organization A only."""
    user = User.objects.create_user(username="user_org_a", password="testpass123")

    # Create role with org permission
    role = Role.objects.create(
        name="Org A Viewer", description="Can view org A balance", scope=ScopeChoices.ORGANIZATION
    )
    role.permissions.add(org_view_balance_permission)

    # Assign role for Organization A only
    RoleAssignment.objects.create(
        user=user, role=role, organization=org_a, scope=ScopeChoices.ORGANIZATION
    )

    return user


@pytest.fixture
def user_in_project_a(org_a, project_in_org_a, project_view_balance_permission):
    """Create user with access to Project A1 only."""
    user = User.objects.create_user(username="user_project_a", password="testpass123")

    # Create role with project permission
    role = Role.objects.create(
        name="Project A Viewer",
        description="Can view project A balance",
        scope=ScopeChoices.PROJECT,
    )
    role.permissions.add(project_view_balance_permission)

    # Assign role for Project A1 only
    RoleAssignment.objects.create(
        user=user,
        role=role,
        organization=org_a,
        project=project_in_org_a,
        scope=ScopeChoices.PROJECT,
    )

    return user


class TestCrossOrganizationBypass:
    """Test that users cannot bypass ACL to view other organizations' balances."""

    def test_cannot_view_other_organization_balance(self, api_client, org_b, user_in_org_a):
        """User from Org A cannot view Org B balance."""
        api_client.force_authenticate(user=user_in_org_a)
        response = api_client.get(f"/api/organizations/{org_b.id}/balance/")

        # Should be denied with 403
        assert response.status_code == 403

        # Verify audit event captured bypass attempt
        audit_event = AuditEvent.objects.filter(
            event_type="permission.denied",
            user_id=user_in_org_a.id,
            organization_id=str(org_b.id),
        ).latest("timestamp")
        assert audit_event is not None
        assert audit_event.permission == "organization.view_balance"
        assert audit_event.metadata.get("outcome") == "denied"

    def test_can_view_own_organization_balance(self, api_client, org_a, user_in_org_a):
        """User from Org A CAN view Org A balance (positive control)."""
        api_client.force_authenticate(user=user_in_org_a)
        response = api_client.get(f"/api/organizations/{org_a.id}/balance/")

        # Should succeed
        assert response.status_code == 200


class TestAnonymousUserBypass:
    """Test that anonymous (unauthenticated) users cannot bypass ACL."""

    def test_anonymous_user_cannot_view_org_balance(self, api_client, org_a):
        """Unauthenticated user cannot view any organization balance."""
        # No authentication
        response = api_client.get(f"/api/organizations/{org_a.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401

    def test_anonymous_user_cannot_view_project_balance(self, api_client, project_in_org_a):
        """Unauthenticated user cannot view any project balance."""
        # No authentication
        response = api_client.get(f"/api/projects/{project_in_org_a.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401


class TestCrossProjectBypass:
    """Test that users cannot bypass ACL to view other projects' balances."""

    def test_cannot_view_other_project_balance(
        self, api_client, project_in_org_b, user_in_project_a
    ):
        """User with Project A access cannot view Project B balance."""
        api_client.force_authenticate(user=user_in_project_a)
        response = api_client.get(f"/api/projects/{project_in_org_b.id}/balance/")

        # Should be denied with 403
        assert response.status_code == 403

        # Verify audit event captured bypass attempt
        audit_event = AuditEvent.objects.filter(
            event_type="permission.denied",
            user_id=user_in_project_a.id,
            project_id=project_in_org_b.id,
        ).latest("timestamp")
        assert audit_event is not None
        assert audit_event.permission == "project.view_balance"
        assert audit_event.metadata.get("outcome") == "denied"

    def test_can_view_own_project_balance(self, api_client, project_in_org_a, user_in_project_a):
        """User with Project A access CAN view Project A balance (positive control)."""
        api_client.force_authenticate(user=user_in_project_a)
        response = api_client.get(f"/api/projects/{project_in_org_a.id}/balance/")

        # Should succeed
        assert response.status_code == 200


class TestProjectWithoutOrganizationAccess:
    """Test that project access requires organization membership."""

    def test_cannot_view_project_balance_without_org_access(
        self, api_client, project_in_org_b, user_in_org_a
    ):
        """User cannot view project balance if they lack org membership."""
        # user_in_org_a has Org A access, but project_in_org_b is in Org B
        api_client.force_authenticate(user=user_in_org_a)
        response = api_client.get(f"/api/projects/{project_in_org_b.id}/balance/")

        # Should be denied with 403 (no access to parent org)
        assert response.status_code == 403


class TestInvalidResourceID:
    """Test that invalid resource IDs are handled securely."""

    def test_nonexistent_organization_returns_404(self, api_client, user_in_org_a):
        """Request for non-existent organization returns 404, not 403."""
        api_client.force_authenticate(user=user_in_org_a)

        # Use a UUID that doesn't exist
        fake_org_id = "00000000-0000-0000-0000-000000000000"
        response = api_client.get(f"/api/organizations/{fake_org_id}/balance/")

        # Should return 404 (not found) before permission check
        assert response.status_code == 404

    def test_nonexistent_project_returns_404(self, api_client, user_in_project_a):
        """Request for non-existent project returns 404, not 403."""
        api_client.force_authenticate(user=user_in_project_a)

        # Use a project ID that doesn't exist
        fake_project_id = 999999
        response = api_client.get(f"/api/projects/{fake_project_id}/balance/")

        # Should return 404 (not found) before permission check
        assert response.status_code == 404

"""Integration tests for B11 transaction/credit ACL enforcement (WP02-T013).

Tests verify that organization and project balance endpoints enforce
ACL checks correctly, rejecting unauthorized users with 403 and creating
B09 audit events for both allowed and denied scenarios.
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
def organization():
    """Create test organization."""
    return Organisation.objects.create(name="Test Organization", slug="test-org")


@pytest.fixture
def project(organization):
    """Create test project."""
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organization
    )


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
def user_with_org_permission(organization, org_view_balance_permission):
    """Create user with organization.view_balance permission."""
    user = User.objects.create_user(username="org_viewer", password="testpass123")

    # Create role with permission
    role = Role.objects.create(
        name="Organization Viewer",
        description="Can view org balance",
        scope=ScopeChoices.ORGANIZATION,
    )
    role.permissions.add(org_view_balance_permission)

    # Assign role to user for this organization
    RoleAssignment.objects.create(
        user=user, role=role, organization=organization, scope=ScopeChoices.ORGANIZATION
    )

    return user


@pytest.fixture
def user_with_project_permission(organization, project, project_view_balance_permission):
    """Create user with project.view_balance permission."""
    user = User.objects.create_user(username="project_viewer", password="testpass123")

    # Create role with permission
    role = Role.objects.create(
        name="Project Viewer", description="Can view project balance", scope=ScopeChoices.PROJECT
    )
    role.permissions.add(project_view_balance_permission)

    # Assign role to user for this project
    RoleAssignment.objects.create(
        user=user,
        role=role,
        organization=organization,
        project=project,
        scope=ScopeChoices.PROJECT,
    )

    return user


@pytest.fixture
def user_without_permission():
    """Create user without any balance view permissions."""
    return User.objects.create_user(username="no_access_user", password="testpass123")


class TestOrganizationBalanceACL:
    """Test ACL enforcement for organization balance endpoint."""

    def test_organization_balance_view_allowed(
        self, api_client, organization, user_with_org_permission
    ):
        """User with organization.view_balance permission can view balance."""
        api_client.force_authenticate(user=user_with_org_permission)
        response = api_client.get(f"/api/organizations/{organization.id}/balance/")

        assert response.status_code == 200
        assert "balance" in response.data

        # Verify B09 audit event created with "granted" outcome
        audit_event = AuditEvent.objects.filter(
            event_type="permission.granted", permission="organization.view_balance"
        ).latest("timestamp")
        assert audit_event.user_id == user_with_org_permission.id
        assert audit_event.organization_id == str(organization.id)
        assert audit_event.metadata.get("outcome") == "allowed"

    def test_organization_balance_view_denied(
        self, api_client, organization, user_without_permission
    ):
        """User without permission cannot view organization balance."""
        api_client.force_authenticate(user=user_without_permission)
        response = api_client.get(f"/api/organizations/{organization.id}/balance/")

        assert response.status_code == 403
        assert "error" in response.data or "detail" in response.data

        # Verify B09 audit event created with "denied" outcome
        audit_event = AuditEvent.objects.filter(
            event_type="permission.denied", permission="organization.view_balance"
        ).latest("timestamp")
        assert audit_event.user_id == user_without_permission.id
        assert audit_event.organization_id == str(organization.id)
        assert audit_event.metadata.get("outcome") == "denied"

    def test_organization_balance_unauthenticated(self, api_client, organization):
        """Unauthenticated user cannot view organization balance."""
        response = api_client.get(f"/api/organizations/{organization.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401


class TestProjectBalanceACL:
    """Test ACL enforcement for project balance endpoint."""

    def test_project_balance_view_allowed(self, api_client, project, user_with_project_permission):
        """User with project.view_balance permission can view balance."""
        api_client.force_authenticate(user=user_with_project_permission)
        response = api_client.get(f"/api/projects/{project.id}/balance/")

        assert response.status_code == 200
        assert "balance" in response.data

        # Verify B09 audit event created with "granted" outcome
        audit_event = AuditEvent.objects.filter(
            event_type="permission.granted", permission="project.view_balance"
        ).latest("timestamp")
        assert audit_event.user_id == user_with_project_permission.id
        assert audit_event.project_id == project.id
        assert audit_event.metadata.get("outcome") == "allowed"

    def test_project_balance_view_denied(self, api_client, project, user_without_permission):
        """User without permission cannot view project balance."""
        api_client.force_authenticate(user=user_without_permission)
        response = api_client.get(f"/api/projects/{project.id}/balance/")

        assert response.status_code == 403
        assert "error" in response.data or "detail" in response.data

        # Verify B09 audit event created with "denied" outcome
        audit_event = AuditEvent.objects.filter(
            event_type="permission.denied", permission="project.view_balance"
        ).latest("timestamp")
        assert audit_event.user_id == user_without_permission.id
        assert audit_event.project_id == project.id
        assert audit_event.metadata.get("outcome") == "denied"

    def test_project_balance_unauthenticated(self, api_client, project):
        """Unauthenticated user cannot view project balance."""
        response = api_client.get(f"/api/projects/{project.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401

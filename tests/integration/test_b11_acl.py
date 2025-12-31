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
from django.core.cache import cache

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test to prevent state leakage."""
    cache.clear()


@pytest.fixture
def api_client():
    """Create API client for tests."""
    return APIClient()


@pytest.fixture
def organization():
    """Create test organization."""
    creator = User.objects.create(email="creator@example.com")
    return Organisation.objects.create(name="Test Organization", slug="test-org", creator=creator)


@pytest.fixture
def project(organization):
    """Create test project."""
    creator = User.objects.create_user(email="project_creator@example.com", password="testpass123")
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organization, creator=creator
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
    user = User.objects.create_user(email="org_viewer@example.com", password="testpass123")

    # Get or create role with permission
    role, created = Role.objects.get_or_create(
        name="Organization Viewer",
        scope=ScopeChoices.ORGANIZATION,
        defaults={"description": "Can view org balance"},
    )
    role.permissions.add(org_view_balance_permission)

    # Assign role to user for this organization
    RoleAssignment.objects.create(
        user=user, role=role, target_organization=organization, scope=ScopeChoices.ORGANIZATION
    )

    return user


@pytest.fixture
def user_with_project_permission(organization, project, project_view_balance_permission):
    """Create user with project.view_balance permission."""
    user = User.objects.create_user(email="project_viewer@example.com", password="testpass123")

    # Get or create role with permission
    role, created = Role.objects.get_or_create(
        name="Project Viewer",
        scope=ScopeChoices.PROJECT,
        defaults={"description": "Can view project balance"},
    )
    role.permissions.add(project_view_balance_permission)

    # Assign role to user for this project
    RoleAssignment.objects.create(
        user=user,
        role=role,
        target_organization=organization,
        target_project=project,
        scope=ScopeChoices.PROJECT,
    )

    return user


@pytest.fixture
def user_without_permission():
    """Create user without any balance view permissions."""
    return User.objects.create_user(email="no_access_user@example.com", password="testpass123")


class TestOrganizationBalanceACL:
    """Test ACL enforcement for organization balance endpoint."""

    def test_organization_balance_view_allowed(
        self, api_client, organization, user_with_org_permission
    ):
        """User with organization.view_balance permission can view balance."""
        api_client.force_authenticate(user=user_with_org_permission)
        response = api_client.get(f"/api/v1/organizations/{organization.id}/balance/")

        assert response.status_code == 200
        assert "current_balance" in response.data

        # Verify B09 audit event created with "granted" outcome
        audit_event = AuditEvent.objects.filter(event_type="permission.granted").latest(
            "created_at"
        )
        assert audit_event.metadata.get("permission") == "organization.view_balance"
        assert audit_event.user_id == user_with_org_permission.id
        assert str(audit_event.organization_id) == str(organization.id)
        assert audit_event.metadata.get("outcome") == "allowed"

    def test_organization_balance_view_denied(
        self, api_client, organization, user_without_permission
    ):
        """User without permission cannot view organization balance."""
        api_client.force_authenticate(user=user_without_permission)
        response = api_client.get(f"/api/v1/organizations/{organization.id}/balance/")

        assert response.status_code == 403
        # Structured 403 response check
        data = response.json()
        if "error" in data and isinstance(data["error"], dict):
            assert data["error"]["code"] == "permission_denied"
        else:
            assert "error" in data or "detail" in data

        # Verify B09 audit event created with "denied" outcome
        audit_event = AuditEvent.objects.filter(event_type="permission.denied").latest("created_at")
        assert audit_event.metadata.get("permission") == "organization.view_balance"
        assert audit_event.user_id == user_without_permission.id
        assert str(audit_event.organization_id) == str(organization.id)
        assert audit_event.metadata.get("outcome") == "denied"

    def test_organization_balance_unauthenticated(self, api_client, organization):
        """Unauthenticated user cannot view organization balance."""
        response = api_client.get(f"/api/v1/organizations/{organization.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401


class TestProjectBalanceACL:
    """Test ACL enforcement for project balance endpoint."""

    def test_project_balance_view_allowed(self, api_client, project, user_with_project_permission):
        """User with project.view_balance permission can view balance."""
        api_client.force_authenticate(user=user_with_project_permission)
        response = api_client.get(f"/api/v1/projects/{project.id}/balance/")

        assert response.status_code == 200
        assert "current_balance" in response.data

        # Verify B09 audit event created with "granted" outcome
        audit_event = AuditEvent.objects.filter(event_type="permission.granted").latest(
            "created_at"
        )
        assert audit_event.metadata.get("permission") == "project.view_balance"
        assert audit_event.user_id == user_with_project_permission.id
        assert audit_event.project_id == project.id
        assert audit_event.metadata.get("outcome") == "allowed"

    def test_project_balance_view_denied(self, api_client, project, user_without_permission):
        """User without permission cannot view project balance."""
        api_client.force_authenticate(user=user_without_permission)
        response = api_client.get(f"/api/v1/projects/{project.id}/balance/")

        assert response.status_code == 403
        # Structured 403 response check
        data = response.json()
        if "error" in data and isinstance(data["error"], dict):
            assert data["error"]["code"] == "permission_denied"
        else:
            assert "error" in data or "detail" in data

        # Verify B09 audit event created with "denied" outcome
        audit_event = AuditEvent.objects.filter(event_type="permission.denied").latest("created_at")
        assert audit_event.metadata.get("permission") == "project.view_balance"
        assert audit_event.user_id == user_without_permission.id
        assert audit_event.project_id == project.id
        assert audit_event.metadata.get("outcome") == "denied"

    def test_project_balance_unauthenticated(self, api_client, project):
        """Unauthenticated user cannot view project balance."""
        response = api_client.get(f"/api/v1/projects/{project.id}/balance/")

        # Should return 401 (unauthenticated), not 403
        assert response.status_code == 401

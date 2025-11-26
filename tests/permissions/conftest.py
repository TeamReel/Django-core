"""Shared fixtures for permissions tests."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from permissions.models import Permission, Role
from projects.models import Project

User = get_user_model()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        email="admin@example.com", password="adminpass123", is_staff=True, is_superuser=True
    )


@pytest.fixture
def organisation(db):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Org", slug="test-org")


@pytest.fixture
def project(db, organisation):
    """Create a test project."""
    return Project.objects.create(name="Test Project", organisation=organisation)


@pytest.fixture
def perm_projects_view(db):
    """Create 'projects.view' permission."""
    return Permission.objects.create(
        permission="projects.view", resource_type="project", is_sensitive=False
    )


@pytest.fixture
def perm_projects_update(db):
    """Create 'projects.update' permission."""
    return Permission.objects.create(
        permission="projects.update", resource_type="project", is_sensitive=False
    )


@pytest.fixture
def perm_projects_delete(db):
    """Create 'projects.delete' permission (sensitive)."""
    return Permission.objects.create(
        permission="projects.delete", resource_type="project", is_sensitive=True
    )


@pytest.fixture
def perm_org_invite_users(db):
    """Create 'org.invite_users' permission."""
    return Permission.objects.create(
        permission="org.invite_users", resource_type="organisation", is_sensitive=False
    )


@pytest.fixture
def perm_wildcard(db):
    """Create wildcard '*' permission."""
    return Permission.objects.create(
        permission="*", resource_type="all", is_sensitive=True, description="Wildcard permission"
    )


@pytest.fixture
def global_admin_role(db, perm_wildcard):
    """Create Global Admin role with wildcard permission."""
    role = Role.objects.create(
        name="Global Admin", scope="global", description="Full system access"
    )
    role.permissions.add(perm_wildcard)
    return role


@pytest.fixture
def org_admin_role(db, perm_org_invite_users, perm_projects_view, perm_projects_delete):
    """Create Organization Admin role."""
    role = Role.objects.create(
        name="Organization Admin", scope="organization", description="Full org access"
    )
    role.permissions.add(perm_org_invite_users, perm_projects_view, perm_projects_delete)
    return role


@pytest.fixture
def project_viewer_role(db, perm_projects_view):
    """Create Project Viewer role."""
    role = Role.objects.create(name="Project Viewer", scope="project")
    role.permissions.add(perm_projects_view)
    return role


@pytest.fixture
def project_admin_role(db, perm_projects_view, perm_projects_update, perm_projects_delete):
    """Create Project Admin role."""
    role = Role.objects.create(name="Project Admin", scope="project")
    role.permissions.add(perm_projects_view, perm_projects_update, perm_projects_delete)
    return role

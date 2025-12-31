"""Shared fixtures for permissions tests."""

import pytest
from django.core.cache import cache
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from permissions.models import Permission, Role, ScopeChoices
from projects.models import Project

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test to prevent state leakage."""
    cache.clear()
    yield
    cache.clear()


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
def organisation(db, user):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Org", slug="test-org", creator=user)


@pytest.fixture
def project(db, organisation, user):
    """Create a test project."""
    return Project.objects.create(name="Test Project", organisation=organisation, creator=user)


@pytest.fixture
def perm_projects_view(db):
    """Get "projects.view" permission."""
    return Permission.objects.get(permission="projects.view")


@pytest.fixture
def perm_projects_update(db):
    """Get "projects.update" permission."""
    return Permission.objects.get(permission="projects.update")


@pytest.fixture
def perm_projects_delete(db):
    """Get "projects.delete" permission."""
    return Permission.objects.get(permission="projects.delete")


@pytest.fixture
def perm_org_invite_users(db):
    """Get "org.invite_users" permission."""
    return Permission.objects.get(permission="org.invite_users")


@pytest.fixture
def perm_wildcard(db):
    """Get wildcard "*" permission."""
    return Permission.objects.get(permission="*")


@pytest.fixture
def global_admin_role(db):
    """Get Global Admin role."""
    return Role.objects.get(name="Global Admin", scope=ScopeChoices.GLOBAL)


@pytest.fixture
def org_admin_role(db):
    """Get Organization Admin role."""
    return Role.objects.get(name="Organization Admin", scope=ScopeChoices.ORGANIZATION)


@pytest.fixture
def project_viewer_role(db):
    """Get Project Viewer role."""
    return Role.objects.get(name="Project Viewer", scope=ScopeChoices.PROJECT)


@pytest.fixture
def project_admin_role(db):
    """Get Project Admin role."""
    return Role.objects.get(name="Project Admin", scope=ScopeChoices.PROJECT)

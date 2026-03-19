"""Pytest fixtures for trash app tests."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project
from projects.models.project_membership import ProjectMembership

User = get_user_model()


@pytest.fixture
def user(db):
    """Standard test user."""
    return User.objects.create_user(
        email="trash-test@example.com",
        password="testpass123",  # noqa: S106
        first_name="Trash",
        last_name="Tester",
    )


@pytest.fixture
def admin_user(db):
    """Admin test user."""
    return User.objects.create_user(
        email="trash-admin@example.com",
        password="testpass123",  # noqa: S106
        first_name="Trash",
        last_name="Admin",
    )


@pytest.fixture
def organisation(db, user):
    """Test organisation."""
    return Organisation.objects.create(
        name="Trash Test Org",
        slug="trash-test-org",
        creator=user,
    )


@pytest.fixture
def admin_membership(organisation, admin_user):
    """Make admin_user an admin of the organisation."""
    return Membership.objects.create(
        organisation=organisation,
        user=admin_user,
        role="admin",
    )


@pytest.fixture
def project(organisation, user):
    """Test project."""
    return Project.objects.create(
        name="Trash Test Project",
        slug="trash-test-project",
        organisation=organisation,
        creator=user,
    )


@pytest.fixture
def membership(project, user):
    """Test project membership (uses SoftDeleteMixin)."""
    return ProjectMembership.objects.create(
        project=project,
        user=user,
        role=ProjectMembership.Role.EDITOR,
    )

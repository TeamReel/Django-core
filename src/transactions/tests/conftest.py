"""Pytest fixtures for transactions tests."""

import pytest
from accounts.models import User
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework.test import APIClient

from transactions.models import UsageEvent


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def organization(db, user):
    """Create a test organization."""
    return Organisation.objects.create(name="Test Org", creator=user)


@pytest.fixture
def organisation(organization):
    """Alias for organization fixture (British spelling)."""
    return organization


@pytest.fixture
def membership(db, user, organization):
    """Create a membership linking user to organization."""
    return Membership.objects.create(user=user, organisation=organization, role="admin")


@pytest.fixture
def authenticated_client(user, membership):
    """Return an APIClient authenticated as the test user (with org membership)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def project(db, organization, user):
    """Create a test project."""
    return Project.objects.create(name="Test Project", organisation=organization, creator=user)


@pytest.fixture
def usage_event(db, user, organization, project):
    """Create a test usage event."""
    return UsageEvent.objects.create(
        event_type="test_event",
        user=user,
        organization=organization,
        project=project,
        metadata={"test": "data"},
    )

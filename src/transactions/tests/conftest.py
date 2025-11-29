"""Pytest fixtures for transactions tests."""

import pytest
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project

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

"""Pytest fixtures for credits tests."""

import pytest
from accounts.models import User
from organisations.models import Membership, Organisation
from projects.models import Project


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def organisation(db, user):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Organisation", creator=user)


@pytest.fixture
def membership(db, user, organisation):
    """Create an organisation membership."""
    return Membership.objects.create(
        user=user, organisation=organisation, role="member"
    )


@pytest.fixture
def project(db, user, organisation):
    """Create a test project."""
    return Project.objects.create(
        name="Test Project", organisation=organisation, creator=user
    )

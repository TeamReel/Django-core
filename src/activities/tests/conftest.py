"""
Pytest fixtures for activities tests.
"""

import pytest
from datetime import date
from accounts.models import User
from organisations.models import Organisation, Membership
from projects.models import Project
from activities.models import Period


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def organisation(db, user):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Organisation", slug="test-org", creator=user)


@pytest.fixture
def member(db, user, organisation):
    """Create an organisation membership."""
    return Membership.objects.create(user=user, organisation=organisation, role="member")


@pytest.fixture
def project(db, user, organisation):
    """Create a test project."""
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation, creator=user
    )


@pytest.fixture
def period(db, organisation):
    """Create a test period."""
    return Period.objects.create(
        name="Test Period",
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31),
        organisation=organisation,
    )

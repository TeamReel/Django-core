"""
Pytest fixtures for activities tests.
"""

from datetime import date, datetime, timezone

import pytest
from accounts.models import User
from activities.models import Activity, Period
from organisations.models import Membership, Organisation
from projects.models import Project


@pytest.fixture
def user(db):
    """Create a test user with staff privileges for API testing."""
    return User.objects.create_user(email="test@example.com", password="testpass123", is_staff=True)


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
    """Create a test period spanning 2024."""
    return Period.objects.create(
        name="Test Period",
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31),
        organisation=organisation,
    )


@pytest.fixture
def activity(db, project, period):
    """Create a test activity."""
    return Activity.objects.create(
        project=project,
        period=period,
        title="Test Activity",
        activity_type="training",
        start_time=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
    )

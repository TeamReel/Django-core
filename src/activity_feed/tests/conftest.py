"""
Pytest fixtures for B62 Activity Feed tests.
"""

from datetime import date, datetime, timedelta, timezone

import pytest
from accounts.models import User
from activities.models import Activity, Period
from activity_feed.models import ActivityLog, FeedPosition
from django.utils import timezone as dj_timezone
from organisations.models import Membership, Organisation
from projects.models import Project


@pytest.fixture
def user(db):
    """Create a test user with staff privileges for API testing."""
    return User.objects.create_user(
        email="feed-test@example.com",
        password="testpass123",
        is_staff=True,
    )


@pytest.fixture
def other_user(db):
    """Create a second test user for isolation tests."""
    return User.objects.create_user(
        email="other@example.com",
        password="testpass123",
    )


@pytest.fixture
def organisation(db, user):
    """Create a test organisation."""
    return Organisation.objects.create(
        name="Feed Test Org",
        slug="feed-test-org",
        creator=user,
    )


@pytest.fixture
def other_organisation(db, other_user):
    """Create a second organisation for isolation tests."""
    return Organisation.objects.create(
        name="Other Org",
        slug="other-org",
        creator=other_user,
    )


@pytest.fixture
def member(db, user, organisation):
    """Create an organisation membership for the test user."""
    return Membership.objects.create(
        user=user,
        organisation=organisation,
        role="member",
    )


@pytest.fixture
def other_member(db, other_user, other_organisation):
    """Create a membership for the other user."""
    return Membership.objects.create(
        user=other_user,
        organisation=other_organisation,
        role="member",
    )


@pytest.fixture
def project(db, user, organisation):
    """Create a test project."""
    return Project.objects.create(
        name="Test Project",
        slug="feed-test-project",
        organisation=organisation,
        creator=user,
    )


@pytest.fixture
def period(db, organisation):
    """Create a test period."""
    return Period.objects.create(
        name="Test Period",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        organisation=organisation,
    )


@pytest.fixture
def activity(db, project, period):
    """Create a test activity."""
    return Activity.objects.create(
        project=project,
        period=period,
        title="Test Match",
        activity_type="match",
        start_time=datetime(2025, 3, 15, 14, 0, tzinfo=timezone.utc),
        end_time=datetime(2025, 3, 15, 16, 0, tzinfo=timezone.utc),
    )


@pytest.fixture
def activity_log(db, user, organisation, project):
    """Create a single activity log event."""
    return ActivityLog.objects.create(
        actor=user,
        verb="content.created",
        organisation=organisation,
        project=project,
        extra_data={"title": "Test Content"},
    )


@pytest.fixture
def activity_logs(db, user, organisation, project):
    """Create multiple activity log events for pagination/filtering tests."""
    logs = []
    verbs = [
        "content.created",
        "content.approved",
        "member.added",
        "match.created",
        "season.started",
    ]
    for i, verb in enumerate(verbs):
        log = ActivityLog.objects.create(
            actor=user,
            verb=verb,
            organisation=organisation,
            project=project if i < 3 else None,
            extra_data={"index": i},
        )
        logs.append(log)
    return logs


@pytest.fixture
def feed_position(db, user, organisation):
    """Create a feed position for the test user."""
    return FeedPosition.objects.create(
        user=user,
        organisation=organisation,
        last_read_at=dj_timezone.now() - timedelta(hours=1),
    )


@pytest.fixture
def api_client():
    """Create a DRF API test client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Create an authenticated API test client."""
    api_client.force_authenticate(user=user)
    return api_client

"""Test fixtures for contextual_notifications app (B17).

Provides reusable test data for routing rules, preferences, policies,
and related entities (users, organizations, projects).
"""

import pytest
from contextual_notifications.models import (
    NotificationPreference,
    OrganisationNotificationPolicy,
    RoutingRule,
)
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from projects.models import Project

User = get_user_model()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def user2(db):
    """Create a second test user."""
    return User.objects.create_user(
        username="testuser2",
        email="test2@example.com",
        password="testpass123",
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpass123",
    )


@pytest.fixture
def organisation(db, admin_user):
    """Create a test organisation."""
    return Organisation.objects.create(
        name="Test Org",
        slug="test-org",
        created_by=admin_user,
    )


@pytest.fixture
def organisation2(db, admin_user):
    """Create a second test organisation."""
    return Organisation.objects.create(
        name="Test Org 2",
        slug="test-org-2",
        created_by=admin_user,
    )


@pytest.fixture
def project(db, organisation, user):
    """Create a test project."""
    return Project.objects.create(
        name="Test Project",
        slug="test-project",
        organisation=organisation,
        created_by=user,
    )


@pytest.fixture
def project2(db, organisation, user):
    """Create a second test project."""
    return Project.objects.create(
        name="Test Project 2",
        slug="test-project-2",
        organisation=organisation,
        created_by=user,
    )


@pytest.fixture
def routing_rule_global(db):
    """Create a global routing rule for project.updated events."""
    return RoutingRule.objects.create(
        event_type="project.updated",
        scope="global",
        channel="in_app",
        priority="normal",
        enabled=True,
        target_role="member",
        description="Global rule for project updates",
    )


@pytest.fixture
def routing_rule_org(db, organisation):
    """Create an organisation-scoped routing rule."""
    return RoutingRule.objects.create(
        event_type="project.updated",
        scope="org",
        organisation=organisation,
        channel="email",
        priority="high",
        enabled=True,
        target_role="member",
        description="Org-level rule for project updates",
    )


@pytest.fixture
def routing_rule_project(db, project):
    """Create a project-scoped routing rule."""
    return RoutingRule.objects.create(
        event_type="task.assigned",
        scope="project",
        project=project,
        channel="in_app",
        priority="urgent",
        enabled=True,
        target_role="assignee",
        description="Project-level rule for task assignments",
    )


@pytest.fixture
def routing_rule_disabled(db):
    """Create a disabled routing rule."""
    return RoutingRule.objects.create(
        event_type="project.deleted",
        scope="global",
        channel="in_app",
        priority="normal",
        enabled=False,
        target_role="member",
        description="Disabled rule",
    )


@pytest.fixture
def notification_preference(db, user):
    """Create a notification preference (opt-out) for a user."""
    return NotificationPreference.objects.create(
        user=user,
        event_type="project.updated",
        channel="email",
        enabled=False,  # User opted out
    )


@pytest.fixture
def notification_preference_in_app(db, user):
    """Create an in_app notification preference (enabled)."""
    return NotificationPreference.objects.create(
        user=user,
        event_type="task.assigned",
        channel="in_app",
        enabled=True,  # User wants these
    )


@pytest.fixture
def org_notification_policy(db, organisation):
    """Create an organisation notification policy with quiet hours."""
    return OrganisationNotificationPolicy.objects.create(
        organisation=organisation,
        quiet_hours_enabled=True,
        quiet_hours_start="22:00:00",
        quiet_hours_end="08:00:00",
        quiet_hours_rate_limit=5,
        rate_limit_window_seconds=300,
    )


@pytest.fixture
def org_notification_policy_no_quiet_hours(db, organisation2):
    """Create an organisation policy without quiet hours."""
    return OrganisationNotificationPolicy.objects.create(
        organisation=organisation2,
        quiet_hours_enabled=False,
    )


@pytest.fixture
def event_data():
    """Standard event data for testing."""
    return {
        "event_type": "project.updated",
        "context": {
            "org_id": 1,
            "project_id": 1,
            "user_id": 1,
            "resource_id": "project_1",
        },
        "payload": {
            "title": "Project Updated",
            "body": "Test project was updated",
            "url": "/projects/1",
        },
    }


@pytest.fixture
def task_assigned_event_data():
    """Task assignment event data for testing."""
    return {
        "event_type": "task.assigned",
        "context": {
            "org_id": 1,
            "project_id": 1,
            "user_id": 1,
            "assignee_id": 2,
            "resource_id": "task_42",
        },
        "payload": {
            "title": "Task Assigned",
            "body": "You were assigned a task",
            "url": "/tasks/42",
        },
    }


@pytest.fixture
def mock_redis(mocker):
    """Mock Redis client for testing suppression service."""
    mock = mocker.MagicMock()
    mock.get.return_value = None  # Not suppressed by default
    mock.setex.return_value = True
    return mock


@pytest.fixture
def mock_b16_handoff(mocker):
    """Mock B16 NotificationService handoff."""
    return mocker.patch(
        "contextual_notifications.services.notification_handoff_service.NotificationService.create_notification",
        return_value={"id": "notif-123", "status": "pending"},
    )


@pytest.fixture
def mock_audit_log(mocker):
    """Mock audit logging service."""
    return mocker.patch("contextual_notifications.services.audit_service.audit_log.record")


@pytest.fixture(autouse=True)
def celery_eager_mode(settings):
    """Ensure Celery runs tasks synchronously in tests."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = False
    return settings

"""
Integration tests for transition history API endpoints.
Tests TransitionHistoryViewSet read-only operations and permissions.
"""
import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from src.workflows.models import TransitionHistory
from tests.workflows.factories import WorkflowInstanceFactory, WorkflowTemplateFactory

User = get_user_model()


@pytest.fixture
def admin_user(db, django_user_model):
    """Create admin user."""
    return django_user_model.objects.create_user(
        username="admin", email="admin@example.com", password="adminpass", is_staff=True
    )


@pytest.fixture
def regular_user(db, django_user_model):
    """Create regular user."""
    return django_user_model.objects.create_user(
        username="member", email="member@example.com", password="memberpass"
    )


@pytest.fixture
def other_user(db, django_user_model):
    """Create another user (not a project member)."""
    return django_user_model.objects.create_user(
        username="other", email="other@example.com", password="otherpass"
    )


@pytest.fixture
def organisation(db, admin_user):
    """Create test organisation."""
    Organisation = apps.get_model("organisations", "Organisation")
    return Organisation.objects.create(
        name="Test Organisation", slug="test-org", creator=admin_user
    )


@pytest.fixture
def project(db, organisation, admin_user):
    """Create test project with admin_user as creator."""
    Project = apps.get_model("projects", "Project")
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation, creator=admin_user
    )


@pytest.fixture
def project_membership(db, project, regular_user):
    """Create membership for regular user."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(project=project, user=regular_user, role="member")


@pytest.fixture
def workflow_template(db, admin_user):
    """Create workflow template with transitions."""
    return WorkflowTemplateFactory(
        name="Review Workflow",
        version="1.0",
        description="Simple workflow for testing history",
        is_active=True,
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "review", "is_initial": False, "is_terminal": False},
                {"name": "published", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {"action": "submit_for_review", "from_state": "draft", "to_state": "review"},
                {"action": "approve", "from_state": "review", "to_state": "published"},
                {"action": "reject", "from_state": "review", "to_state": "draft"},
            ],
        },
    )


@pytest.fixture
def workflow_instance(db, project, workflow_template, admin_user):
    """Create workflow instance."""
    return WorkflowInstanceFactory(
        workflow=workflow_template,
        project=project,
        created_by=admin_user,
        current_state="draft",
        workflow_snapshot=workflow_template.definition,
    )


@pytest.fixture
def history_entries(db, workflow_instance, admin_user, regular_user):
    """Create transition history entries."""
    from django.utils import timezone
    from datetime import timedelta

    entries = []
    base_time = timezone.now()

    # Entry 1: draft -> review (by admin) - Oldest
    e1 = TransitionHistory.objects.create(
        instance=workflow_instance,
        from_state="draft",
        to_state="review",
        action="submit_for_review",
        actor=admin_user,
        comment="Initial submission",
    )
    TransitionHistory.objects.filter(pk=e1.pk).update(created_at=base_time - timedelta(minutes=10))
    e1.refresh_from_db()
    entries.append(e1)

    # Entry 2: review -> draft (by regular_user)
    e2 = TransitionHistory.objects.create(
        instance=workflow_instance,
        from_state="review",
        to_state="draft",
        action="reject",
        actor=regular_user,
        comment="Needs more work",
    )
    TransitionHistory.objects.filter(pk=e2.pk).update(created_at=base_time - timedelta(minutes=5))
    e2.refresh_from_db()
    entries.append(e2)

    # Entry 3: draft -> review (by admin again) - Newest
    e3 = TransitionHistory.objects.create(
        instance=workflow_instance,
        from_state="draft",
        to_state="review",
        action="submit_for_review",
        actor=admin_user,
        comment="Resubmitted with changes",
    )
    TransitionHistory.objects.filter(pk=e3.pk).update(created_at=base_time)
    e3.refresh_from_db()
    entries.append(e3)

    return entries


@pytest.mark.django_db
class TestTransitionHistoryList:
    """Tests for GET /api/v1/workflows/history/"""

    def test_list_history_project_creator(
        self, project, admin_user, workflow_instance, history_entries
    ):
        """Project creator can list history for their instances."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/history/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert len(data["data"]) == 3
        # Most recent first
        assert data["data"][0]["action"] == "submit_for_review"
        assert data["data"][0]["from_state"] == "draft"
        assert data["data"][0]["to_state"] == "review"

    def test_list_history_project_member(
        self, project, regular_user, project_membership, workflow_instance, history_entries
    ):
        """Project member can list history."""
        client = APIClient()
        client.force_authenticate(user=regular_user)

        response = client.get("/api/v1/workflows/history/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 3

    def test_list_history_non_member(self, other_user, workflow_instance, history_entries):
        """Non-member cannot see history."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get("/api/v1/workflows/history/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 0  # No history in accessible projects

    def test_list_history_unauthenticated(self):
        """Unauthenticated user cannot list history."""
        client = APIClient()

        response = client.get("/api/v1/workflows/history/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_history_filter_by_instance(self, admin_user, workflow_instance, history_entries):
        """Filter history by instance ID."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/v1/workflows/history/?instance={workflow_instance.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 3
        assert all(entry["instance"] == workflow_instance.id for entry in data["data"])

    def test_list_history_filter_by_actor(self, admin_user, regular_user, history_entries):
        """Filter history by actor."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/v1/workflows/history/?actor={regular_user.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["actor"] == regular_user.id
        assert data["data"][0]["action"] == "reject"

    def test_list_history_filter_by_action(self, admin_user, history_entries):
        """Filter history by action name."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/history/?action=submit_for_review")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 2
        assert all(entry["action"] == "submit_for_review" for entry in data["data"])

    def test_list_history_filter_by_states(self, admin_user, history_entries):
        """Filter history by from/to states."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/history/?from_state=draft&to_state=review")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 2
        assert all(
            entry["from_state"] == "draft" and entry["to_state"] == "review"
            for entry in data["data"]
        )

    def test_list_history_search(self, admin_user, history_entries):
        """Search history by comment."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/history/?search=Resubmitted")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1
        assert "Resubmitted" in data["data"][0]["comment"]

    def test_list_history_ordering(self, admin_user, history_entries):
        """Test history ordering (most recent first by default)."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/history/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 3

        # Verify descending order (most recent first)
        created_times = [entry["created_at"] for entry in data["data"]]
        assert created_times == sorted(created_times, reverse=True)


@pytest.mark.django_db
class TestTransitionHistoryRetrieve:
    """Tests for GET /api/v1/workflows/history/{id}/"""

    def test_retrieve_history_project_creator(self, admin_user, history_entries):
        """Project creator can retrieve history entry."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        entry = history_entries[0]
        response = client.get(f"/api/v1/workflows/history/{entry.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["id"] == entry.id
        assert data["data"]["action"] == "submit_for_review"
        assert data["data"]["actor_username"] == admin_user.username

    def test_retrieve_history_project_member(
        self, regular_user, project_membership, history_entries
    ):
        """Project member can retrieve history entry."""
        client = APIClient()
        client.force_authenticate(user=regular_user)

        entry = history_entries[0]
        response = client.get(f"/api/v1/workflows/history/{entry.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["id"] == entry.id

    def test_retrieve_history_non_member(self, other_user, history_entries):
        """Non-member cannot retrieve history entry."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        entry = history_entries[0]
        response = client.get(f"/api/v1/workflows/history/{entry.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTransitionHistoryHookStatus:
    """Tests for GET /api/v1/workflows/history/{id}/hook_status/"""

    def test_hook_status_no_task(self, admin_user, history_entries):
        """Hook status returns null when no task_id."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        entry = history_entries[0]
        response = client.get(f"/api/v1/workflows/history/{entry.id}/hook_status/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["task_id"] is None
        assert data["data"]["status"] is None
        assert "No async hook task" in data["data"]["error"]

    def test_hook_status_with_task(self, admin_user, workflow_instance):
        """Hook status returns task info when task_id exists."""
        import uuid

        client = APIClient()
        client.force_authenticate(user=admin_user)

        # Create history entry with task_id
        task_id = uuid.uuid4()
        entry = TransitionHistory.objects.create(
            instance=workflow_instance,
            from_state="draft",
            to_state="review",
            action="submit_for_review",
            actor=admin_user,
            task_id=task_id,
        )

        response = client.get(f"/api/v1/workflows/history/{entry.id}/hook_status/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["data"]["task_id"] == str(task_id)
        # Status will be PENDING or UNKNOWN depending on Celery availability

    def test_hook_status_non_member(self, other_user, history_entries):
        """Non-member cannot check hook status."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        entry = history_entries[0]
        response = client.get(f"/api/v1/workflows/history/{entry.id}/hook_status/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTransitionHistoryReadOnly:
    """Tests to verify history endpoint is read-only."""

    def test_create_not_allowed(self, admin_user, workflow_instance):
        """Cannot create history via API."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            "/api/v1/workflows/history/",
            {
                "instance": workflow_instance.id,
                "from_state": "draft",
                "to_state": "review",
                "action": "submit",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_update_not_allowed(self, admin_user, history_entries):
        """Cannot update history via API."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        entry = history_entries[0]
        response = client.patch(
            f"/api/v1/workflows/history/{entry.id}/",
            {"comment": "Updated comment"},
            format="json",
        )

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_delete_not_allowed(self, admin_user, history_entries):
        """Cannot delete history via API."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        entry = history_entries[0]
        response = client.delete(f"/api/v1/workflows/history/{entry.id}/")

        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

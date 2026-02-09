"""
Integration tests for Workflow Transitions API endpoints.
Tests execute() and available_actions() custom actions.
"""
import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APIClient

from src.workflows.models import WorkflowInstance, WorkflowTemplate


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
    from django.apps import apps

    Organisation = apps.get_model("organisations", "Organisation")
    return Organisation.objects.create(
        name="Test Organisation", slug="test-org", creator=admin_user
    )


@pytest.fixture
def project(db, organisation, admin_user):
    """Create test project."""
    from django.apps import apps

    Project = apps.get_model("projects", "Project")
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation, creator=admin_user
    )


@pytest.fixture
def project_membership(db, project, regular_user):
    """Create project membership for regular user."""
    from django.apps import apps

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(project=project, user=regular_user, role="editor")


@pytest.fixture
def workflow_template(db, admin_user):
    """Create active workflow template with simple states and transitions."""
    return WorkflowTemplate.objects.create(
        name="Review Workflow",
        version="1.0",
        description="Simple workflow for testing transitions",
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
def workflow_instance(db, project, admin_user, workflow_template):
    """Create a workflow instance for testing."""
    # Create a dummy content object (use Project as the GenericForeignKey target)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    content_type = ContentType.objects.get_for_model(User)

    return WorkflowInstance.objects.create(
        workflow=workflow_template,
        project=project,
        workflow_snapshot=workflow_template.definition,
        created_by=admin_user,
        current_state="draft",
        content_type=content_type,
        object_id=admin_user.id,
    )


@pytest.mark.django_db
class TestWorkflowTransitionExecution:
    """Tests for POST /api/v1/workflows/instances/{id}/execute/ endpoint."""

    def test_execute_valid_transition(
        self, project, admin_user, workflow_template, project_membership, workflow_instance
    ):
        """Test successful state transition."""
        instance = workflow_instance

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {"action": "submit_for_review", "comment": "Ready for review", "context_updates": {}},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "data" in data
        # Verify transition history recorded
        assert data["data"]["action"] == "submit_for_review"
        assert data["data"]["to_state"] == "review"

    def test_execute_invalid_transition(
        self, project, admin_user, workflow_template, project_membership, workflow_instance
    ):
        """Test error when transition doesn't exist from current state."""
        instance = workflow_instance

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {
                "action": "approve",  # This transition only exists from 'review' state
                "comment": "Invalid action",
                "context_updates": {},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["status"] == "error"
        assert "error" in data

    def test_execute_permission_denied(self, project, other_user, workflow_template):
        """Test error when user is not a project member."""
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType

        User = get_user_model()
        content_type = ContentType.objects.get_for_model(User)

        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            project=project,
            workflow_snapshot=workflow_template.definition,
            created_by=other_user,
            current_state="draft",
            content_type=content_type,
            object_id=other_user.id,
        )

        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {"action": "submit_for_review", "comment": "Should fail", "context_updates": {}},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert data["status"] == "error"

    def test_execute_unauthenticated(self, project, workflow_template):
        """Test error when user not authenticated."""
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType

        User = get_user_model()
        content_type = ContentType.objects.get_for_model(User)

        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            project=project,
            workflow_snapshot=workflow_template.definition,
            created_by=None,
            current_state="draft",
            content_type=content_type,
            object_id=1,  # Use a dummy ID
        )

        client = APIClient()
        # No authentication

        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {"action": "submit_for_review", "comment": "Should fail", "context_updates": {}},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_execute_with_context_updates(
        self, project, admin_user, workflow_template, project_membership, workflow_instance
    ):
        """Test transition with context_updates."""
        instance = workflow_instance

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {
                "action": "submit_for_review",
                "comment": "Ready",
                "context_updates": {"reviewer_notes": "Check carefully"},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["context_updates"].get("reviewer_notes") == "Check carefully"

    def test_execute_instance_not_found(self, admin_user):
        """Test error when instance doesn't exist."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        import uuid

        fake_id = uuid.uuid4()

        response = client.post(
            f"/api/v1/workflows/instances/{fake_id}/execute/",
            {"action": "submit_for_review", "comment": "Should fail", "context_updates": {}},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWorkflowAvailableActions:
    """Tests for GET /api/v1/workflows/instances/{id}/available_actions/ endpoint."""

    def test_available_actions_from_draft_state(
        self, project, admin_user, workflow_template, project_membership, workflow_instance
    ):
        """Test getting available actions from draft state."""
        instance = workflow_instance

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(
            f"/api/v1/workflows/instances/{instance.id}/available_actions/", format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "actions" in data["data"]
        # From draft state, only "submit_for_review" should be available
        actions = data["data"]["actions"]
        assert len(actions) == 1
        assert actions[0]["action"] == "submit_for_review"

    def test_available_actions_from_review_state(
        self, project, admin_user, workflow_template, project_membership
    ):
        """Test getting available actions after transition to review state."""
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType

        User = get_user_model()
        content_type = ContentType.objects.get_for_model(User)

        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            project=project,
            workflow_snapshot=workflow_template.definition,
            created_by=admin_user,
            current_state="review",
            content_type=content_type,
            object_id=admin_user.id,
        )

        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(
            f"/api/v1/workflows/instances/{instance.id}/available_actions/", format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        # From review state, both "approve" and "reject" should be available
        actions = data["data"]["actions"]
        assert len(actions) == 2
        action_names = {a["action"] for a in actions}
        assert action_names == {"approve", "reject"}

    def test_available_actions_permission_denied(self, project, other_user, workflow_template):
        """Test error when user is not a project member."""
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType

        User = get_user_model()
        content_type = ContentType.objects.get_for_model(User)

        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            project=project,
            workflow_snapshot=workflow_template.definition,
            created_by=other_user,
            current_state="draft",
            content_type=content_type,
            object_id=other_user.id,
        )

        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get(
            f"/api/v1/workflows/instances/{instance.id}/available_actions/", format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert data["status"] == "error"

    def test_available_actions_unauthenticated(self, project, workflow_template):
        """Test error when user not authenticated."""
        from django.contrib.auth import get_user_model
        from django.contrib.contenttypes.models import ContentType

        User = get_user_model()
        content_type = ContentType.objects.get_for_model(User)

        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            project=project,
            workflow_snapshot=workflow_template.definition,
            created_by=None,
            current_state="draft",
            content_type=content_type,
            object_id=1,  # Use a dummy ID
        )

        client = APIClient()
        # No authentication

        response = client.get(
            f"/api/v1/workflows/instances/{instance.id}/available_actions/", format="json"
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_available_actions_instance_not_found(self, admin_user):
        """Test error when instance doesn't exist."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        import uuid

        fake_id = uuid.uuid4()

        response = client.get(
            f"/api/v1/workflows/instances/{fake_id}/available_actions/", format="json"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

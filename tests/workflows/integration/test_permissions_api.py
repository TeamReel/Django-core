"""
Integration tests for project permission override API endpoints.
Tests ProjectPermissionOverrideViewSet CRUD operations and admin permissions.
"""
import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from src.workflows.models import ProjectPermissionOverride
from tests.workflows.factories import WorkflowTemplateFactory

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
def project_admin_membership(db, project, regular_user):
    """Create admin membership for regular user."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(project=project, user=regular_user, role="admin")


@pytest.fixture
def project_member_membership(db, project, other_user):
    """Create non-admin membership for other user."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    return ProjectMembership.objects.create(project=project, user=other_user, role="member")


@pytest.fixture
def workflow_template(db, admin_user):
    """Create workflow template with transitions."""
    return WorkflowTemplateFactory(
        name="Review Workflow",
        version="1.0",
        description="Simple workflow for testing permissions",
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
def permission_override(db, project, workflow_template):
    """Create a permission override."""
    return ProjectPermissionOverride.objects.create(
        project=project,
        workflow=workflow_template,
        action_name="submit_for_review",
        required_roles=["admin", "editor"],
    )


@pytest.mark.django_db
class TestProjectPermissionOverrideList:
    """Tests for GET /api/v1/workflows/permissions/"""

    def test_list_overrides_project_creator(
        self, project, admin_user, workflow_template, permission_override
    ):
        """Project creator can list overrides."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get("/api/v1/workflows/permissions/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert len(data["data"]) == 1
        assert data["data"][0]["action_name"] == "submit_for_review"
        assert data["data"][0]["required_roles"] == ["admin", "editor"]

    def test_list_overrides_project_admin(
        self, project, regular_user, project_admin_membership, permission_override
    ):
        """Project admin can list overrides."""
        client = APIClient()
        client.force_authenticate(user=regular_user)

        response = client.get("/api/v1/workflows/permissions/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1

    def test_list_overrides_non_admin(self, project, other_user, project_member_membership):
        """Non-admin project member cannot see overrides."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get("/api/v1/workflows/permissions/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 0  # No overrides in accessible projects

    def test_list_overrides_unauthenticated(self):
        """Unauthenticated user cannot list overrides."""
        client = APIClient()

        response = client.get("/api/v1/workflows/permissions/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_overrides_filter_by_project(self, project, admin_user, permission_override):
        """Can filter overrides by project."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/v1/workflows/permissions/?project={project.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1

    def test_list_overrides_filter_by_workflow(
        self, project, admin_user, workflow_template, permission_override
    ):
        """Can filter overrides by workflow."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/v1/workflows/permissions/?workflow={workflow_template.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1


@pytest.mark.django_db
class TestProjectPermissionOverrideCreate:
    """Tests for POST /api/v1/workflows/permissions/"""

    def test_create_override_project_creator(self, project, admin_user, workflow_template):
        """Project creator can create override."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": workflow_template.id,
                "action_name": "approve",
                "required_roles": ["admin"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["action_name"] == "approve"
        assert data["data"]["required_roles"] == ["admin"]

    def test_create_override_project_admin(
        self, project, regular_user, project_admin_membership, workflow_template
    ):
        """Project admin can create override."""
        client = APIClient()
        client.force_authenticate(user=regular_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": workflow_template.id,
                "action_name": "reject",
                "required_roles": ["admin", "coach"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_create_override_non_admin(
        self, project, other_user, project_member_membership, workflow_template
    ):
        """Non-admin project member cannot create override."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": workflow_template.id,
                "action_name": "approve",
                "required_roles": ["admin"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        # API uses custom error format with nested error object
        assert "error" in data or "detail" in data

    def test_create_override_invalid_action(self, project, admin_user, workflow_template):
        """Cannot create override for non-existent action."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": workflow_template.id,
                "action_name": "nonexistent_action",
                "required_roles": ["admin"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        # Validation errors can be in various formats
        response_str = str(data).lower()
        assert "action" in response_str or "workflow" in response_str

    def test_create_override_duplicate(self, project, admin_user, permission_override):
        """Cannot create duplicate override (same project+workflow+action)."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": permission_override.workflow.id,
                "action_name": permission_override.action_name,
                "required_roles": ["admin"],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_override_empty_roles(self, project, admin_user, workflow_template):
        """Cannot create override with empty roles list."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.post(
            "/api/v1/workflows/permissions/",
            {
                "project": project.id,
                "workflow": workflow_template.id,
                "action_name": "approve",
                "required_roles": [],
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestProjectPermissionOverrideRetrieve:
    """Tests for GET /api/v1/workflows/permissions/{id}/"""

    def test_retrieve_override_project_creator(self, project, admin_user, permission_override):
        """Project creator can retrieve override."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.get(f"/api/v1/workflows/permissions/{permission_override.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["id"] == permission_override.id

    def test_retrieve_override_non_admin(
        self, project, other_user, project_member_membership, permission_override
    ):
        """Non-admin cannot retrieve override."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.get(f"/api/v1/workflows/permissions/{permission_override.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProjectPermissionOverrideUpdate:
    """Tests for PATCH /api/v1/workflows/permissions/{id}/"""

    def test_update_override_project_creator(self, project, admin_user, permission_override):
        """Project creator can update override."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.patch(
            f"/api/v1/workflows/permissions/{permission_override.id}/",
            {"required_roles": ["admin", "coach", "editor"]},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]["required_roles"]) == 3

    def test_update_override_non_admin(
        self, project, other_user, project_member_membership, permission_override
    ):
        """Non-admin cannot update override."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.patch(
            f"/api/v1/workflows/permissions/{permission_override.id}/",
            {"required_roles": ["admin"]},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProjectPermissionOverrideDelete:
    """Tests for DELETE /api/v1/workflows/permissions/{id}/"""

    def test_delete_override_project_creator(self, project, admin_user, permission_override):
        """Project creator can delete override."""
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.delete(f"/api/v1/workflows/permissions/{permission_override.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ProjectPermissionOverride.objects.filter(id=permission_override.id).exists()

    def test_delete_override_non_admin(
        self, project, other_user, project_member_membership, permission_override
    ):
        """Non-admin cannot delete override."""
        client = APIClient()
        client.force_authenticate(user=other_user)

        response = client.delete(f"/api/v1/workflows/permissions/{permission_override.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert ProjectPermissionOverride.objects.filter(id=permission_override.id).exists()

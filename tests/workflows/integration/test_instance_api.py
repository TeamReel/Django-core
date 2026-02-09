"""Integration tests for Workflow Instance API endpoints."""
import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APIClient

from src.workflows.models import WorkflowInstance, WorkflowTemplate


@pytest.fixture
def api_client():
    """Create API client."""
    return APIClient()


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
    """Create active workflow template."""
    return WorkflowTemplate.objects.create(
        name="Content Approval",
        version="1.0",
        description="Standard content approval workflow",
        is_active=True,
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "review", "is_initial": False, "is_terminal": False},
                {"name": "approved", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {"action": "submit", "from_state": "draft", "to_state": "review"},
                {"action": "approve", "from_state": "review", "to_state": "approved"},
            ],
        },
    )


@pytest.fixture
def inactive_workflow_template(db, admin_user):
    """Create inactive workflow template."""
    return WorkflowTemplate.objects.create(
        name="Inactive Workflow",
        version="1.0",
        is_active=False,
        definition={
            "states": [{"name": "draft", "is_initial": True, "is_terminal": False}],
            "transitions": [],
        },
    )


@pytest.fixture
def content_object(db, project):
    """Use Project itself as content object for testing."""
    return project


@pytest.mark.django_db
class TestWorkflowInstanceList:
    """Tests for GET /api/workflows/instances/."""

    def test_list_instances_authenticated(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Authenticated user can list instances from their projects."""
        # Create instance
        content_type = ContentType.objects.get_for_model(content_object)
        WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=regular_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.get("/api/v1/workflows/instances/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "data" in data  # Paginated response
        assert len(data["data"]) == 1
        assert data["data"][0]["workflow_name"] == "Content Approval"
        assert data["data"][0]["current_state"] == "draft"

    def test_list_instances_unauthenticated(self, api_client):
        """Unauthenticated request returns 401."""
        response = api_client.get("/api/v1/workflows/instances/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_instances_filter_by_project(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Can filter instances by project."""
        content_type = ContentType.objects.get_for_model(content_object)
        WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=regular_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.get(f"/api/v1/workflows/instances/?project={project.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1

    def test_list_instances_only_accessible_projects(
        self, api_client, regular_user, other_user, admin_user, workflow_template
    ):
        """User only sees instances from projects they have access to."""
        # Import via apps to avoid conftest conflict
        from django.apps import apps

        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Create two projects
        project1 = Project.objects.create(name="Project 1", created_by=admin_user)
        project2 = Project.objects.create(name="Project 2", created_by=admin_user)

        # regular_user is member of project1 only
        ProjectMembership.objects.create(
            project=project1, user=regular_user, role="member", is_active=True
        )

        content_type = ContentType.objects.get_for_model(project1)

        # Create instances in both projects
        WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project1,
            content_type=content_type,
            object_id=project1.id,
            current_state="draft",
            created_by=admin_user,
        )
        WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project2,
            content_type=content_type,
            object_id=project2.id,
            current_state="draft",
            created_by=admin_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.get("/api/v1/workflows/instances/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["data"]) == 1  # Only sees project1 instance


@pytest.mark.django_db
class TestWorkflowInstanceCreate:
    """Tests for POST /api/workflows/instances/."""

    def test_create_instance_member(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Project member can create workflow instance."""
        content_type = ContentType.objects.get_for_model(content_object)

        api_client.force_authenticate(user=regular_user)
        response = api_client.post(
            "/api/v1/workflows/instances/",
            {
                "workflow": workflow_template.id,
                "project": project.id,
                "content_type": content_type.id,
                "object_id": content_object.id,
                "context": {"note": "Initial submission"},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["current_state"] == "draft"  # Initial state
        assert data["workflow_snapshot"] == workflow_template.definition  # Immutable snapshot
        assert data["context"] == {"note": "Initial submission"}

        # Verify instance was created
        instance = WorkflowInstance.objects.get(id=data["id"])
        assert instance.current_state == "draft"
        assert instance.created_by == regular_user

    def test_create_instance_non_member_forbidden(
        self, api_client, other_user, project, workflow_template, content_object
    ):
        """Non-member cannot create instance."""
        content_type = ContentType.objects.get_for_model(content_object)

        api_client.force_authenticate(user=other_user)
        response = api_client.post(
            "/api/v1/workflows/instances/",
            {
                "workflow": workflow_template.id,
                "project": project.id,
                "content_type": content_type.id,
                "object_id": content_object.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_instance_snapshot_immutable(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Workflow snapshot is immutable (template updates don't affect instances)."""
        content_type = ContentType.objects.get_for_model(content_object)

        api_client.force_authenticate(user=regular_user)
        response = api_client.post(
            "/api/v1/workflows/instances/",
            {
                "workflow": workflow_template.id,
                "project": project.id,
                "content_type": content_type.id,
                "object_id": content_object.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        instance_id = response.json()["id"]
        original_snapshot = response.json()["workflow_snapshot"]

        # Update template
        workflow_template.definition["states"].append(
            {"name": "archived", "is_initial": False, "is_terminal": True}
        )
        workflow_template.save()

        # Verify instance snapshot unchanged
        instance = WorkflowInstance.objects.get(id=instance_id)
        assert instance.workflow_snapshot == original_snapshot
        assert len(instance.workflow_snapshot["states"]) == 3  # Still 3 states
        assert len(workflow_template.definition["states"]) == 4  # Template has 4

    def test_create_instance_inactive_workflow_fails(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        inactive_workflow_template,
        content_object,
    ):
        """Cannot create instance from inactive workflow."""
        content_type = ContentType.objects.get_for_model(content_object)

        api_client.force_authenticate(user=regular_user)
        response = api_client.post(
            "/api/v1/workflows/instances/",
            {
                "workflow": inactive_workflow_template.id,
                "project": project.id,
                "content_type": content_type.id,
                "object_id": content_object.id,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not active" in response.json()["workflow"][0].lower()


@pytest.mark.django_db
class TestWorkflowInstanceRetrieve:
    """Tests for GET /api/workflows/instances/{id}/."""

    def test_retrieve_instance_member(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Project member can retrieve instance details."""
        content_type = ContentType.objects.get_for_model(content_object)
        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=regular_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.get(f"/api/v1/workflows/instances/{instance.id}/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == instance.id
        assert data["current_state"] == "draft"
        assert data["workflow_snapshot"] == workflow_template.definition

    def test_retrieve_instance_non_member_forbidden(
        self, api_client, other_user, project, workflow_template, content_object
    ):
        """Non-member cannot retrieve instance."""
        content_type = ContentType.objects.get_for_model(content_object)
        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=other_user,
        )

        api_client.force_authenticate(user=other_user)
        response = api_client.get(f"/api/v1/workflows/instances/{instance.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_instance_not_found(self, api_client, regular_user):
        """Returns 404 for non-existent instance."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get("/api/v1/workflows/instances/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWorkflowInstanceUpdateDelete:
    """Tests for PUT/PATCH/DELETE /api/workflows/instances/{id}/."""

    def test_update_instance_forbidden(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Direct updates not allowed."""
        content_type = ContentType.objects.get_for_model(content_object)
        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=regular_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.patch(
            f"/api/v1/workflows/instances/{instance.id}/",
            {"current_state": "approved"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "transition actions" in response.json()["detail"].lower()

    def test_delete_instance_forbidden(
        self,
        api_client,
        regular_user,
        project,
        project_membership,
        workflow_template,
        content_object,
    ):
        """Delete not allowed."""
        content_type = ContentType.objects.get_for_model(content_object)
        instance = WorkflowInstance.objects.create(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            content_type=content_type,
            object_id=content_object.id,
            current_state="draft",
            created_by=regular_user,
        )

        api_client.force_authenticate(user=regular_user)
        response = api_client.delete(f"/api/v1/workflows/instances/{instance.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "cannot be deleted" in response.json()["detail"].lower()

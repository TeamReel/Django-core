"""Integration tests for workflow template API endpoints."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from src.workflows.models import WorkflowTemplate
from tests.workflows.factories import WorkflowInstanceFactory, WorkflowTemplateFactory

User = get_user_model()


@pytest.fixture
def api_client():
    """Provide DRF APIClient."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_user(
        email="admin@example.com",
        password="adminpass123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def regular_user(db):
    """Create a regular non-admin user."""
    return User.objects.create_user(
        email="user@example.com",
        password="userpass123",
        is_staff=False,
        is_superuser=False,
    )


@pytest.fixture
def workflow_template(db):
    """Create a sample workflow template."""
    return WorkflowTemplateFactory(
        name="Approval Workflow",
        description="Simple approval workflow",
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "pending", "is_initial": False, "is_terminal": False},
                {"name": "approved", "is_initial": False, "is_terminal": True},
                {"name": "rejected", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {
                    "from_state": "draft",
                    "to_state": "pending",
                    "action": "submit",
                },
                {
                    "from_state": "pending",
                    "to_state": "approved",
                    "action": "approve",
                },
                {
                    "from_state": "pending",
                    "to_state": "rejected",
                    "action": "reject",
                },
            ],
        },
    )


@pytest.mark.django_db
class TestWorkflowTemplateList:
    """Test GET /api/v1/workflows/templates/"""

    def test_list_templates_authenticated(self, api_client, regular_user, workflow_template):
        """Regular user can list templates."""
        api_client.force_authenticate(user=regular_user)
        response = api_client.get("/api/v1/workflows/templates/")

        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data  # EnvelopeJSONRenderer wraps response
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Approval Workflow"

    def test_list_templates_unauthenticated(self, api_client, workflow_template):
        """Unauthenticated user cannot list templates."""
        response = api_client.get("/api/v1/workflows/templates/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_templates_filter_active(self, api_client, regular_user):
        """Can filter templates by is_active status."""
        api_client.force_authenticate(user=regular_user)

        # Create active and inactive templates
        WorkflowTemplateFactory(name="Active Template", is_active=True)
        WorkflowTemplateFactory(name="Inactive Template", is_active=False)

        # Filter for active only
        response = api_client.get("/api/v1/workflows/templates/?is_active=true")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Active Template"

        # Filter for inactive
        response = api_client.get("/api/v1/workflows/templates/?is_active=false")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Inactive Template"

    def test_list_templates_search(self, api_client, regular_user):
        """Can search templates by name and description."""
        api_client.force_authenticate(user=regular_user)

        WorkflowTemplateFactory(name="Approval Workflow", description="For approvals")
        WorkflowTemplateFactory(name="Review Process", description="For reviews")

        # Search by name
        response = api_client.get("/api/v1/workflows/templates/?search=Approval")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Approval Workflow"

        # Search by description
        response = api_client.get("/api/v1/workflows/templates/?search=reviews")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Review Process"


@pytest.mark.django_db
class TestWorkflowTemplateCreate:
    """Test POST /api/v1/workflows/templates/"""

    def test_create_template_admin(self, api_client, admin_user):
        """Admin can create a workflow template."""
        api_client.force_authenticate(user=admin_user)

        payload = {
            "name": "Test Workflow",
            "version": "1.0.0",
            "description": "Test workflow description",
            "definition": {
                "states": [
                    {"name": "draft", "is_initial": True, "is_terminal": False},
                    {"name": "published", "is_initial": False, "is_terminal": True},
                ],
                "transitions": [
                    {
                        "from_state": "draft",
                        "to_state": "published",
                        "action": "publish",
                    }
                ],
            },
        }

        response = api_client.post("/api/v1/workflows/templates/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Test Workflow"
        assert response.data["version"] == "1.0.0"
        assert WorkflowTemplate.all_objects.filter(name="Test Workflow").exists()

    def test_create_template_non_admin_forbidden(self, api_client, regular_user):
        """Non-admin user cannot create a template."""
        api_client.force_authenticate(user=regular_user)

        payload = {
            "name": "Test Workflow",
            "version": "1.0.0",
            "definition": {
                "states": [{"name": "draft", "is_initial": True, "is_terminal": False}],
                "transitions": [],
            },
        }

        response = api_client.post("/api/v1/workflows/templates/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestWorkflowTemplateRetrieve:
    """Test GET /api/v1/workflows/templates/{id}/"""

    def test_retrieve_template_authenticated(self, api_client, regular_user, workflow_template):
        """Authenticated user can retrieve template details."""
        api_client.force_authenticate(user=regular_user)

        response = api_client.get(f"/api/v1/workflows/templates/{workflow_template.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == workflow_template.id
        assert response.data["name"] == workflow_template.name
        assert "definition" in response.data

    def test_retrieve_template_not_found(self, api_client, regular_user):
        """Returns 404 for non-existent template."""
        api_client.force_authenticate(user=regular_user)

        response = api_client.get("/api/v1/workflows/templates/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWorkflowTemplateUpdate:
    """Test PATCH /api/v1/workflows/templates/{id}/"""

    def test_update_template_admin_no_instances(self, api_client, admin_user, workflow_template):
        """Admin can update template when no active instances exist."""
        api_client.force_authenticate(user=admin_user)

        payload = {"description": "Updated description"}

        response = api_client.patch(
            f"/api/v1/workflows/templates/{workflow_template.id}/",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Updated description"

        workflow_template.refresh_from_db()
        assert workflow_template.description == "Updated description"

    def test_update_template_with_active_instances_fails(
        self, api_client, admin_user, workflow_template, project
    ):
        """Update fails when active instances exist without force_update."""
        api_client.force_authenticate(user=admin_user)

        # Create instance (WorkflowInstance doesn't have is_active field)
        WorkflowInstanceFactory(workflow=workflow_template, project=project)

        payload = {"description": "Should fail"}

        response = api_client.patch(
            f"/api/v1/workflows/templates/{workflow_template.id}/",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "active instance" in str(response.data).lower()
        assert "force_update" in str(response.data).lower()

    def test_update_template_with_force_update_succeeds(
        self, api_client, admin_user, workflow_template, project
    ):
        """Update succeeds with force_update=true despite active instances."""
        api_client.force_authenticate(user=admin_user)

        # Create instance
        WorkflowInstanceFactory(workflow=workflow_template, project=project)

        payload = {"description": "Forced update"}

        response = api_client.patch(
            f"/api/v1/workflows/templates/{workflow_template.id}/?force_update=true",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["description"] == "Forced update"

    def test_update_template_non_admin_forbidden(self, api_client, regular_user, workflow_template):
        """Non-admin cannot update template."""
        api_client.force_authenticate(user=regular_user)

        payload = {"description": "Should fail"}

        response = api_client.patch(
            f"/api/v1/workflows/templates/{workflow_template.id}/",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestWorkflowTemplateDelete:
    """Test DELETE /api/v1/workflows/templates/{id}/"""

    def test_delete_template_admin_soft_delete(self, api_client, admin_user, workflow_template):
        """Admin can soft-delete template (sets is_active=False)."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.delete(f"/api/v1/workflows/templates/{workflow_template.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft-delete (record still exists but inactive)
        # Use all() manager to see inactive records (default manager filters them out)
        assert (
            WorkflowTemplate.objects.all().filter(id=workflow_template.id, is_active=False).exists()
        )

    def test_delete_template_non_admin_forbidden(self, api_client, regular_user, workflow_template):
        """Non-admin cannot delete template."""
        api_client.force_authenticate(user=regular_user)

        response = api_client.delete(f"/api/v1/workflows/templates/{workflow_template.id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Verify template still active
        workflow_template.refresh_from_db()
        assert workflow_template.is_active is True

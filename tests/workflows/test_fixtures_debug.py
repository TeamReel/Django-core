"""Debug test using exact same fixtures as test_transitions_api."""
import pytest
from rest_framework.test import APIClient
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

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
def test_with_exact_fixtures(
    project, admin_user, workflow_template, project_membership, workflow_instance
):
    """Test using exact same fixtures as test_transitions_api."""
    instance = workflow_instance

    client = APIClient()
    client.force_authenticate(user=admin_user)

    print("\n\nTesting with fixtures:")
    print(f"Instance ID: {instance.id}")
    print(f"Instance exists: {WorkflowInstance.objects.filter(id=instance.id).exists()}")
    print(f"User authenticated: {admin_user.is_authenticated}")

    response = client.post(
        f"/api/v1/workflows/instances/{instance.id}/execute/",
        {"action": "submit_for_review", "comment": "Ready for review", "context_updates": {}},
        format="json",
    )

    print(f"Status code: {response.status_code}")
    print(f"Response: {response.content}\n\n")

    assert response.status_code in [200, 400, 403], f"Got {response.status_code}"

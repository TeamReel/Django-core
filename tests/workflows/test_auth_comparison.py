"""Debug test to understand routing."""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from src.workflows.models import WorkflowInstance, WorkflowTemplate


@pytest.mark.django_db
def test_unauthenticated_request(db):
    """Test unauthenticated request to custom action."""
    User = get_user_model()

    # Create users and org/project
    admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass")

    from django.apps import apps

    Org = apps.get_model("organisations", "Organisation")
    Project = apps.get_model("projects", "Project")

    org = Org.objects.create(name="Test", slug="test", creator=admin)
    project = Project.objects.create(name="Test", slug="test", organisation=org, creator=admin)

    # Create workflow
    template = WorkflowTemplate.objects.create(
        name="Test",
        version="1.0",
        is_active=True,
        definition={
            "states": [
                {"name": "draft", "is_initial": True},
                {"name": "published", "is_initial": False},
            ],
            "transitions": [{"from_state": "draft", "to_state": "published", "action": "publish"}],
        },
    )

    # Create instance
    ct = ContentType.objects.get_for_model(User)
    instance = WorkflowInstance.objects.create(
        workflow=template,
        project=project,
        workflow_snapshot=template.definition,
        created_by=admin,
        current_state="draft",
        content_type=ct,
        object_id=admin.id,
    )

    # Test WITHOUT authentication
    client = APIClient()
    response = client.post(
        f"/api/v1/workflows/instances/{instance.id}/execute/",
        {"action": "publish"},
        format="json",
    )

    print("\n\nUNAUTHENTICATED Request:")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.content}")
    print(f"Is 401? {response.status_code == 401}")
    print(f"Is 404? {response.status_code == 404}\n\n")


@pytest.mark.django_db
def test_authenticated_request(db):
    """Test authenticated request to custom action."""
    User = get_user_model()

    # Create users and org/project
    admin = User.objects.create_user(username="admin", email="admin@test.com", password="pass")

    from django.apps import apps

    Org = apps.get_model("organisations", "Organisation")
    Project = apps.get_model("projects", "Project")
    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    org = Org.objects.create(name="Test", slug="test", creator=admin)
    project = Project.objects.create(name="Test", slug="test", organisation=org, creator=admin)
    ProjectMembership.objects.create(project=project, user=admin, role="admin")

    # Create workflow
    template = WorkflowTemplate.objects.create(
        name="Test",
        version="1.0",
        is_active=True,
        definition={
            "states": [
                {"name": "draft", "is_initial": True},
                {"name": "published", "is_initial": False},
            ],
            "transitions": [{"from_state": "draft", "to_state": "published", "action": "publish"}],
        },
    )

    # Create instance
    ct = ContentType.objects.get_for_model(User)
    instance = WorkflowInstance.objects.create(
        workflow=template,
        project=project,
        workflow_snapshot=template.definition,
        created_by=admin,
        current_state="draft",
        content_type=ct,
        object_id=admin.id,
    )

    # Test WITH authentication
    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.post(
        f"/api/v1/workflows/instances/{instance.id}/execute/",
        {"action": "publish"},
        format="json",
    )

    print("\n\nAUTHENTICATED Request:")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.content}")
    print(f"Is 200? {response.status_code == 200}")
    print(f"Is 404? {response.status_code == 404}\n\n")

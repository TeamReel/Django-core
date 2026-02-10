"""Debug script to check actual API response format."""
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
django.setup()

from rest_framework.test import APIClient
from django.contrib.contenttypes.models import ContentType
from django.apps import apps

# Get models
User = apps.get_model("accounts", "User")
Organisation = apps.get_model("organisations", "Organisation")
Project = apps.get_model("projects", "Project")
ProjectMembership = apps.get_model("projects", "ProjectMembership")
WorkflowTemplate = apps.get_model("workflows", "WorkflowTemplate")
WorkflowInstance = apps.get_model("workflows", "WorkflowInstance")

# Create test data
user = User.objects.create_user(username="testuser", email="test@example.com", password="test123")
org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
project = Project.objects.create(name="Test Project", slug="test-proj", organisation=org, creator=user)
membership = ProjectMembership.objects.create(project=project, user=user, role="editor")

template = WorkflowTemplate.objects.create(
    name="Test Workflow",
    version="1.0",
    is_active=True,
    definition={
        "states": [
            {"name": "draft", "is_initial": True, "is_terminal": False},
            {"name": "done", "is_initial": False, "is_terminal": True},
        ],
        "transitions": [
            {"action": "complete", "from_state": "draft", "to_state": "done"},
        ],
    },
)

# Create instance using project as content object
content_type = ContentType.objects.get_for_model(project)
instance = WorkflowInstance.objects.create(
    workflow=template,
    workflow_snapshot=template.definition,
    project=project,
    content_type=content_type,
    object_id=project.id,
    current_state="draft",
    created_by=user,
)

# Test API
client = APIClient()
client.force_authenticate(user=user)

print("=" * 80)
print("LIST ENDPOINT RESPONSE")
print("=" * 80)
response = client.get("/api/v1/workflows/instances/")
print(f"Status: {response.status_code}")
print(f"Response JSON:")
import json
print(json.dumps(response.json(), indent=2))

print("\n" + "=" * 80)
print("CREATE ENDPOINT TEST")
print("=" * 80)
create_response = client.post(
    "/api/v1/workflows/instances/",
    {
        "workflow": template.id,
        "project": project.id,
        "content_type": content_type.id,
        "object_id": project.id,
        "context": {"note": "Test"},
    },
    format="json",
)
print(f"Status: {create_response.status_code}")
print(f"Response JSON:")
print(json.dumps(create_response.json(), indent=2))

# Cleanup
instance.delete()
template.delete()
membership.delete()
project.delete()
org.delete()
user.delete()

print("\nDone!")

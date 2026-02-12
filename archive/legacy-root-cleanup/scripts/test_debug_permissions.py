"""Debug script to test permission override query."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
django.setup()

from django.contrib.auth import get_user_model
from django.apps import apps
from src.workflows.models import ProjectPermissionOverride
from tests.workflows.factories import WorkflowTemplateFactory

User = get_user_model()

# Create test data
user = User.objects.create_user(username="testuser", email="test@example.com")
Organisation = apps.get_model("organisations", "Organisation")
Project = apps.get_model("projects", "Project")

org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
project = Project.objects.create(name="Test Project", slug="test-project", organisation=org, creator=user)

workflow = WorkflowTemplateFactory(
    name="Test Workflow",
    version="1.0",
    is_active=True,
    definition={
        "states": [{"name": "draft", "is_initial": True, "is_terminal": False}],
        "transitions": [{"action": "submit", "from_state": "draft", "to_state": "draft"}],
    },
)

override = ProjectPermissionOverride.objects.create(
    project=project, workflow=workflow, action_name="submit", required_roles=["admin"]
)

print(f"Created: user={user.id}, project={project.id}, workflow={workflow.id}, override={override.id}")

# Test the query logic
ProjectMembership = apps.get_model("projects", "ProjectMembership")

creator_projects = set(Project.objects.filter(creator=user).values_list("id", flat=True))
print(f"Creator projects: {creator_projects}")

admin_memberships = set(
    ProjectMembership.objects.filter(user=user, role="admin", deleted_at__isnull=True).values_list(
        "project_id", flat=True
    )
)
print(f"Admin memberships: {admin_memberships}")

admin_projects = creator_projects | admin_memberships
print(f"Combined admin projects: {admin_projects}")

overrides = ProjectPermissionOverride.objects.filter(project_id__in=admin_projects)
print(f"Found {overrides.count()} overrides")
for o in overrides:
    print(f"  - Override: {o.id}, project={o.project_id}, action={o.action_name}")

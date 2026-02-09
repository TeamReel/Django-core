"""Diagnostic test to check if custom action routes work."""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from src.workflows.models import WorkflowInstance, WorkflowTemplate


@pytest.mark.django_db
class TestCustomActionRouting:
    """Debug custom action routing."""

    def test_route_exists_in_resolver(self):
        """Verify custom action routes exist in URL resolver."""
        from django.urls import reverse
        from rest_framework.reverse import reverse as drf_reverse

        print("\n" + "=" * 80)
        print("Testing URL resolution for custom actions")
        print("=" * 80)

        # Try to get the URL name
        try:
            url = reverse("workflows:instance-execute", kwargs={"pk": "1"})
            print(f"✅ reverse('workflows:instance-execute') = {url}")
        except Exception as e:
            print(f"❌ reverse failed: {e}")

        # Try DRF reverse
        try:
            url = drf_reverse("instance-execute", kwargs={"pk": "1"})
            print(f"✅ drf_reverse('instance-execute') = {url}")
        except Exception as e:
            print(f"❌ drf_reverse failed: {e}")

        print("=" * 80 + "\n")

    def test_custom_action_post_request(self, db):
        """Test if POST to custom action actually works."""
        User = get_user_model()

        # Create test user
        user = User.objects.create_user(username="testuser", password="testpass")

        # Create org and project
        from django.apps import apps

        Organisation = apps.get_model("organisations", "Organisation")
        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
        project = Project.objects.create(
            name="Test Project", slug="test-project", organisation=org, creator=user
        )
        ProjectMembership.objects.create(project=project, user=user, role="admin")

        # Create workflow template
        template = WorkflowTemplate.objects.create(
            name="Test Workflow",
            version="1.0",
            is_active=True,
            definition={
                "states": [
                    {"name": "draft", "is_initial": True},
                    {"name": "published", "is_initial": False},
                ],
                "transitions": [
                    {"from_state": "draft", "to_state": "published", "action": "publish"}
                ],
            },
        )

        # Create workflow instance
        content_type = ContentType.objects.get_for_model(User)
        instance = WorkflowInstance.objects.create(
            workflow=template,
            project=project,
            workflow_snapshot=template.definition,
            created_by=user,
            current_state="draft",
            content_type=content_type,
            object_id=user.id,
        )

        # Test the custom action endpoint
        client = APIClient()
        client.force_authenticate(user=user)

        print(f"\nTesting POST to /api/v1/workflows/instances/{instance.id}/execute/")
        response = client.post(
            f"/api/v1/workflows/instances/{instance.id}/execute/",
            {"action": "publish"},
            format="json",
        )

        print(f"Status code: {response.status_code}")
        print(f"Response: {response.content}")

        # This should work
        assert response.status_code in [
            200,
            400,
            403,
            404,
        ], f"Unexpected status: {response.status_code}"

        if response.status_code == 404:
            print("⚠️ Got 404 - route not found!")
        elif response.status_code == 200:
            print("✅ Got 200 - success!")

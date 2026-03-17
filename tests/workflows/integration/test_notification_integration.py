"""Integration tests for B16 Notifications hooks in workflows."""
import pytest
from django.contrib.auth import get_user_model

from src.workflows.models import WorkflowTemplate
from src.workflows.services.engine import WorkflowEngine

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestNotificationIntegration:
    """Test B16 Notifications integration with workflow hooks."""

    @pytest.fixture
    def workflow_template(self, db):
        """Create test workflow template."""
        return WorkflowTemplate.objects.create(
            name="Notification Workflow",
            version="1.0.0",
            is_active=True,
            definition={
                "states": [
                    {"name": "draft", "is_initial": True, "is_terminal": False},
                    {"name": "submitted", "is_initial": False, "is_terminal": False},
                    {"name": "approved", "is_initial": False, "is_terminal": True},
                    {"name": "rejected", "is_initial": False, "is_terminal": True},
                ],
                "transitions": [
                    {
                        "action": "submit",
                        "from_state": "draft",
                        "to_state": "submitted",
                        "required_permission": "member",
                    },
                    {
                        "action": "approve",
                        "from_state": "submitted",
                        "to_state": "approved",
                        "required_permission": "admin",
                    },
                    {
                        "action": "reject",
                        "from_state": "submitted",
                        "to_state": "rejected",
                        "required_permission": "admin",
                    },
                ],
            },
        )

    @pytest.fixture
    def project(self, db):
        """Create test project."""
        from projects.models import Project
        from organisations.models import Organisation

        creator = User.objects.create_user("creator@test.com")
        org = Organisation.objects.create(name="Test Org", creator=creator)
        return Project.objects.create(
            name="Test Project",
            organisation=org,
            creator=creator,
        )

    @pytest.fixture
    def user(self, db):
        """Create test user."""
        return User.objects.create_user("test@test.com")

    @pytest.fixture
    def workflow_instance(self, workflow_template, project, user):
        """Create workflow instance."""
        engine = WorkflowEngine()
        return engine.create_instance(
            workflow=workflow_template,
            project=project,
            content_object=project,
            user=user,
        )

    def test_notification_hook_called_on_state_entry(
        self, workflow_instance, user, project, mocker
    ):
        """Test notification hook fires when entering registered state."""
        try:
            from projects.models import ProjectMembership

            ProjectMembership.objects.create(user=user, project=project, role="member")

            # Import the example hook to ensure it's registered
            from src.workflows.examples import send_submission_notification  # noqa: F401

            # Mock notification service
            mock_send = mocker.patch(
                "src.notifications.services.notification_service.send_notification"
            )

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            # Verify notification sent
            mock_send.assert_called_once()
            call_kwargs = mock_send.call_args[1]
            assert call_kwargs["notification_type"] == "workflow_submitted"
            assert "Workflow Submitted" in call_kwargs["title"]
            assert str(workflow_instance.id) in call_kwargs["metadata"]["instance_id"]

        except ImportError:
            pytest.skip("B16 Notifications not available")

    def test_notification_hook_includes_workflow_metadata(
        self, workflow_instance, user, project, mocker
    ):
        """Test notification includes workflow context metadata."""
        try:
            from projects.models import ProjectMembership

            ProjectMembership.objects.create(user=user, project=project, role="member")

            from src.workflows.examples import send_submission_notification  # noqa: F401

            mock_send = mocker.patch(
                "src.notifications.services.notification_service.send_notification"
            )

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            call_kwargs = mock_send.call_args[1]
            metadata = call_kwargs["metadata"]

            # Verify required metadata present
            assert "workflow_id" in metadata
            assert "instance_id" in metadata
            assert "project_id" in metadata
            assert "action" in metadata

        except ImportError:
            pytest.skip("B16 Notifications not available")

    def test_notification_hook_handles_b16_unavailable(
        self, workflow_instance, user, project, mocker
    ):
        """Test hook gracefully handles B16 not available."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member")

        # Mock ImportError when importing notifications
        mocker.patch.dict("sys.modules", {"src.notifications.services": None})

        engine = WorkflowEngine()
        # Should not raise exception
        history = engine.execute_transition(
            instance=workflow_instance,
            action="submit",
            user=user,
        )

        # Transition should succeed
        workflow_instance.refresh_from_db()
        assert workflow_instance.current_state == "submitted"

    def test_notification_hook_handles_send_failure(self, workflow_instance, user, project, mocker):
        """Test workflow continues if notification send fails."""
        try:
            from projects.models import ProjectMembership

            ProjectMembership.objects.create(user=user, project=project, role="member")

            from src.workflows.examples import send_submission_notification  # noqa: F401

            # Mock notification service to raise exception
            mock_send = mocker.patch(
                "src.notifications.services.notification_service.send_notification"
            )
            mock_send.side_effect = Exception("Notification service unavailable")

            engine = WorkflowEngine()
            history = engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            # Transition should succeed despite notification failure
            workflow_instance.refresh_from_db()
            assert workflow_instance.current_state == "submitted"
            mock_send.assert_called_once()

        except ImportError:
            pytest.skip("B16 Notifications not available")

    def test_custom_notification_hook_registration(self, workflow_instance, user, project, mocker):
        """Test registering custom notification hook for specific workflow state."""
        try:
            from src.workflows.registry import HookRegistry

            # Register custom notification hook
            @HookRegistry.hook("on_enter", "approved")
            def notify_approval(instance, transition):
                from notifications.services import notification_service

                notification_service.send_notification(
                    recipient_ids=[instance.created_by_id],
                    notification_type="workflow_approved",
                    title="Workflow Approved",
                    message="Your workflow has been approved",
                )

            from projects.models import ProjectMembership

            # Setup: submit first
            ProjectMembership.objects.create(user=user, project=project, role="member")
            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            # Mock notification service
            mock_send = mocker.patch(
                "src.notifications.services.notification_service.send_notification"
            )

            # Now approve (should trigger custom hook)
            admin_user = User.objects.create_user("admin@test.com")
            ProjectMembership.objects.create(user=admin_user, project=project, role="admin")

            engine.execute_transition(
                instance=workflow_instance,
                action="approve",
                user=admin_user,
            )

            # Verify custom notification sent
            assert mock_send.call_count >= 1
            # Find the approval notification call
            approval_calls = [
                c
                for c in mock_send.call_args_list
                if c[1].get("notification_type") == "workflow_approved"
            ]
            assert len(approval_calls) >= 1

        except ImportError:
            pytest.skip("B16 Notifications not available")

    def test_notification_link_includes_workflow_context(
        self, workflow_instance, user, project, mocker
    ):
        """Test notification link provides deep link to workflow instance."""
        try:
            from projects.models import ProjectMembership

            ProjectMembership.objects.create(user=user, project=project, role="member")

            from src.workflows.examples import send_submission_notification  # noqa: F401

            mock_send = mocker.patch(
                "src.notifications.services.notification_service.send_notification"
            )

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            call_kwargs = mock_send.call_args[1]
            link = call_kwargs.get("link", "")

            # Verify link includes project and workflow IDs
            assert str(project.id) in link
            assert str(workflow_instance.id) in link
            assert "/workflows/" in link

        except ImportError:
            pytest.skip("B16 Notifications not available")

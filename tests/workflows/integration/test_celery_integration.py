"""Integration tests for B15 Celery async hooks in workflows."""
import pytest
from django.contrib.auth import get_user_model
from unittest.mock import MagicMock

from src.workflows.models import WorkflowTemplate
from src.workflows.services.engine import WorkflowEngine

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestCeleryIntegration:
    """Test B15 Celery integration with workflow async hooks."""

    @pytest.fixture
    def workflow_template(self, db):
        """Create test workflow template."""
        return WorkflowTemplate.objects.create(
            name="Async Hook Workflow",
            version="1.0.0",
            is_active=True,
            definition={
                "states": [
                    {"name": "draft", "is_initial": True, "is_terminal": False},
                    {"name": "processing", "is_initial": False, "is_terminal": False},
                    {"name": "completed", "is_initial": False, "is_terminal": True},
                ],
                "transitions": [
                    {
                        "action": "start_processing",
                        "from_state": "draft",
                        "to_state": "processing",
                        "required_permission": "member",
                    },
                    {
                        "action": "complete",
                        "from_state": "processing",
                        "to_state": "completed",
                        "required_permission": "member",
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

    def test_async_hook_task_spawned_on_transition(self, workflow_instance, user, project, mocker):
        """Test Celery task spawned when transition with async hooks."""
        try:
            from projects.models import ProjectMembership
            from src.workflows.tasks import execute_workflow_hooks

            ProjectMembership.objects.create(user=user, project=project, role="member")

            # Mock Celery task
            mock_task = mocker.patch.object(execute_workflow_hooks, "delay")
            mock_result = MagicMock()
            mock_result.id = "550e8400-e29b-41d4-a716-446655440000"
            mock_task.return_value = mock_result

            engine = WorkflowEngine()
            history = engine.execute_transition(
                instance=workflow_instance,
                action="start_processing",
                user=user,
            )

            # Verify task spawned
            mock_task.assert_called_once()
            call_kwargs = mock_task.call_args[1]
            assert call_kwargs["instance_id"] == workflow_instance.id
            assert call_kwargs["hook_type"] == "async"
            assert "start_processing" in call_kwargs["hook_keys"]

        except ImportError:
            pytest.skip("B15 Tasks not available")

    def test_task_id_stored_in_transition_history(self, workflow_instance, user, project, mocker):
        """Test task_id stored in TransitionHistory when async hooks execute."""
        try:
            from projects.models import ProjectMembership
            from src.workflows.tasks import execute_workflow_hooks

            ProjectMembership.objects.create(user=user, project=project, role="member")

            # Mock Celery task with specific task_id
            mock_task = mocker.patch.object(execute_workflow_hooks, "delay")
            mock_result = MagicMock()
            task_id = "550e8400-e29b-41d4-a716-446655440001"
            mock_result.id = task_id
            mock_task.return_value = mock_result

            engine = WorkflowEngine()
            history = engine.execute_transition(
                instance=workflow_instance,
                action="start_processing",
                user=user,
            )

            # Verify task_id stored
            assert history.task_id is not None
            assert str(history.task_id) == task_id

        except ImportError:
            pytest.skip("B15 Tasks not available")

    def test_execute_workflow_hooks_task_success(self, workflow_instance, db):
        """Test execute_workflow_hooks task executes successfully."""
        try:
            from src.workflows.tasks import execute_workflow_hooks

            # Execute task directly (not via .delay for testing)
            result = execute_workflow_hooks(
                instance_id=workflow_instance.id,
                hook_type="async",
                hook_keys=["draft", "start_processing", "processing"],
            )

            # Verify result structure
            assert result["instance_id"] == workflow_instance.id
            assert result["hook_type"] == "async"
            assert "results" in result
            assert "task_id" in result

        except ImportError:
            pytest.skip("B15 Tasks not available")

    def test_execute_workflow_hooks_handles_hook_failure(self, workflow_instance, db, mocker):
        """Test task handles individual hook failures gracefully."""
        try:
            from src.workflows.tasks import execute_workflow_hooks

            # Define a failing hook
            def failing_hook(*args, **kwargs):
                raise ValueError("Hook failed")

            # Mock HookRegistry.get_hooks because the task uses it
            mock_get_hooks = mocker.patch("src.workflows.registry.HookRegistry.get_hooks")
            mock_get_hooks.return_value = [failing_hook]

            # Execute task
            result = execute_workflow_hooks(
                instance_id=workflow_instance.id,
                hook_type="on_transition",
                hook_keys=["test_action"],
            )

            # Task should complete, hook failure logged in results
            assert result["instance_id"] == workflow_instance.id
            assert any(r.get("status") == "failed" for r in result["results"])

        except ImportError:
            pytest.skip("B15 Tasks not available")

    def test_execute_workflow_hooks_retries_on_transient_error(self, mocker):
        """Test task retries on transient failures."""
        try:
            from src.workflows.tasks import execute_workflow_hooks
            from celery.exceptions import Retry

            # Mock WorkflowInstance.objects.select_related().get() to raise exception
            mock_select_related = mocker.patch(
                "src.workflows.tasks.WorkflowInstance.objects.select_related"
            )
            mock_qs = mock_select_related.return_value
            mock_qs.get.side_effect = Exception("Database connection timeout")

            # Mock self.retry to capture retry call
            task = execute_workflow_hooks
            mock_retry = mocker.patch.object(task, "retry")
            mock_retry.side_effect = Retry()

            # Execute task
            with pytest.raises(Retry):
                task(instance_id=999, hook_type="async", hook_keys=[])

            # Verify retry called
            mock_retry.assert_called_once()

        except ImportError:
            pytest.skip("B15 Tasks not available")

    def test_transition_succeeds_even_if_celery_unavailable(
        self, workflow_instance, user, project, mocker
    ):
        """Test workflow transition succeeds if Celery not available."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member")

        # Mock ImportError when importing tasks
        mocker.patch.dict("sys.modules", {"src.workflows.tasks": None})

        engine = WorkflowEngine()
        history = engine.execute_transition(
            instance=workflow_instance,
            action="start_processing",
            user=user,
        )

        # Transition should succeed with task_id=None
        assert history.task_id is None
        workflow_instance.refresh_from_db()
        assert workflow_instance.current_state == "processing"

    def test_query_task_status_from_history(self, workflow_instance, user, project, mocker):
        """Test querying Celery task status from TransitionHistory."""
        try:
            from projects.models import ProjectMembership
            from src.workflows.tasks import execute_workflow_hooks
            from celery.result import AsyncResult

            ProjectMembership.objects.create(user=user, project=project, role="member")

            # Mock task
            mock_task = mocker.patch.object(execute_workflow_hooks, "delay")
            mock_result = MagicMock()
            task_id = "550e8400-e29b-41d4-a716-446655440002"
            mock_result.id = task_id
            mock_task.return_value = mock_result

            engine = WorkflowEngine()
            history = engine.execute_transition(
                instance=workflow_instance,
                action="start_processing",
                user=user,
            )

            # Query task status
            if history.task_id:
                result = AsyncResult(str(history.task_id))
                # AsyncResult created successfully
                assert result.id == str(history.task_id)

        except ImportError:
            pytest.skip("B15 Tasks not available")

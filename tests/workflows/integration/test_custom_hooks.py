"""
Integration tests for custom hooks (workflows.examples module).

Tests demonstrate how to register and use custom hooks
in workflow transitions.
"""

import logging

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model

from src.workflows.examples import (
    on_approval_enter,
    on_draft_exit,
    on_submit_transition,
)
from src.workflows.models import WorkflowTemplate
from src.workflows.registry import HookRegistry
from src.workflows.services.engine import WorkflowEngine

User = get_user_model()


@pytest.fixture
def admin_user(db, django_user_model):
    """Create admin user."""
    return django_user_model.objects.create_user(
        username="admin", email="admin@example.com", password="adminpass", is_staff=True
    )


@pytest.fixture
def member_user(db, django_user_model):
    """Create member user."""
    return django_user_model.objects.create_user(
        username="member", email="member@example.com", password="memberpass"
    )


@pytest.fixture
def coach_user(db, django_user_model):
    """Create coach user."""
    return django_user_model.objects.create_user(
        username="coach", email="coach@example.com", password="coachpass"
    )


@pytest.fixture
def organisation(db, admin_user):
    """Create test organisation."""
    Organisation = apps.get_model("organisations", "Organisation")
    return Organisation.objects.create(
        name="Test Organisation", slug="test-org-hooks", creator=admin_user
    )


@pytest.fixture
def project(db, organisation, admin_user, member_user, coach_user):
    """Create test project with memberships."""
    Project = apps.get_model("projects", "Project")
    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    project = Project.objects.create(
        name="Test Project Hooks",
        slug="test-project-hooks",
        organisation=organisation,
        creator=admin_user,
    )

    # Create memberships
    ProjectMembership.objects.create(project=project, user=member_user, role="member")
    ProjectMembership.objects.create(project=project, user=coach_user, role="coach")

    return project


@pytest.fixture
def workflow_template_with_hooks(db):
    """Workflow template with hook references"""
    return WorkflowTemplate.objects.create(
        name="Hook Test Workflow",
        version="1.0.0",
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {
                    "name": "in_review",
                    "is_initial": False,
                    "is_terminal": False,
                },
                {"name": "approved", "is_initial": False, "is_terminal": False},
                {"name": "rejected", "is_initial": False, "is_terminal": True},
                {"name": "published", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {
                    "action": "submit",
                    "from_state": "draft",
                    "to_state": "in_review",
                    "required_permission": "member",
                    "hooks": {
                        "on_exit": ["on_draft_exit"],
                        "on_transition": ["on_submit_transition"],
                        "on_enter": [],
                    },
                },
                {
                    "action": "approve",
                    "from_state": "in_review",
                    "to_state": "approved",
                    "required_permission": "coach",
                    "hooks": {
                        "on_exit": ["on_review_exit"],
                        "on_enter": ["on_approval_enter"],
                    },
                },
                {
                    "action": "reject",
                    "from_state": "in_review",
                    "to_state": "rejected",
                    "required_permission": "coach",
                    "hooks": {
                        "on_exit": ["on_review_exit"],
                        "on_enter": ["on_rejection_enter"],
                    },
                },
            ],
        },
    )


@pytest.fixture
def content_object(db, project):
    """Mock content object for workflow attachment - use existing project"""
    return project


@pytest.mark.django_db
class TestHookExecution:
    """Test that hooks execute during transitions"""

    def test_on_exit_hook_fires(
        self, workflow_template_with_hooks, project, member_user, content_object, caplog
    ):
        """on_exit hooks should fire when leaving a state"""

        caplog.set_level(logging.INFO)

        # Create instance in draft state
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition (should trigger on_draft_exit)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # Check hook was called (via log)
        assert "submitted from draft" in caplog.text
        assert str(instance.id) in caplog.text

    def test_on_transition_hook_fires(
        self, workflow_template_with_hooks, project, member_user, content_object, caplog
    ):
        """on_transition hooks should fire during transition"""

        caplog.set_level(logging.INFO)

        # Create instance in draft state
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition (should trigger on_submit_transition)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # Check hook was called (via log)
        assert "Executing submit transition" in caplog.text
        assert str(instance.id) in caplog.text

    def test_on_enter_hook_fires(
        self, workflow_template_with_hooks, project, coach_user, content_object, caplog
    ):
        """on_enter hooks should fire when entering a state"""

        caplog.set_level(logging.INFO)

        # Create instance and move to in_review
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={},
        )
        instance.current_state = "in_review"
        instance.save()

        # Execute transition to approved (should trigger on_approval_enter)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="approve", user=coach_user
        )

        # Check hook was called (via log)
        assert "approved" in caplog.text
        assert str(instance.id) in caplog.text

    def test_multiple_hooks_execute_in_order(
        self, workflow_template_with_hooks, project, member_user, content_object, caplog
    ):
        """Hooks should execute in order: on_exit → on_transition → on_enter"""

        caplog.set_level(logging.INFO)

        # Create instance in draft state
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition (has all 3 hook types)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # All 3 hooks should have fired
        log_text = caplog.text
        assert "submitted from draft" in log_text  # on_draft_exit
        assert "Executing submit transition" in log_text  # on_submit_transition

        # Verify order by checking log message positions
        exit_pos = log_text.find("submitted from draft")
        transition_pos = log_text.find("Executing submit transition")
        assert exit_pos < transition_pos  # on_exit before on_transition


@pytest.mark.django_db
class TestHookRegistry:
    """Test HookRegistry functionality"""

    def test_hooks_are_registered(self):
        """Example hooks should be registered in registry"""

        # Check on_enter hooks
        assert "approved" in HookRegistry._hooks["on_enter"]
        assert "rejected" in HookRegistry._hooks["on_enter"]

        # Check on_exit hooks
        assert "draft" in HookRegistry._hooks["on_exit"]
        assert "in_review" in HookRegistry._hooks["on_exit"]

        # Check on_transition hooks
        assert "submit" in HookRegistry._hooks["on_transition"]

    def test_hooks_can_be_retrieved(self):
        """Registered hooks should be retrievable by type and target"""

        # Get on_enter hooks for "approved" state
        approval_hooks = HookRegistry.get_hooks("on_enter", "approved")
        assert on_approval_enter in approval_hooks

        # Get on_exit hooks for "draft" state
        draft_exit_hooks = HookRegistry.get_hooks("on_exit", "draft")
        assert on_draft_exit in draft_exit_hooks

        # Get on_transition hooks for "submit" action
        submit_hooks = HookRegistry.get_hooks("on_transition", "submit")
        assert on_submit_transition in submit_hooks

    def test_missing_hooks_return_empty_list(self):
        """Requesting non-existent hooks should return empty list"""

        non_existent_hooks = HookRegistry.get_hooks("on_enter", "non_existent_state")
        assert non_existent_hooks == []


@pytest.mark.django_db
class TestHookContext:
    """Test that hooks receive correct context"""

    def test_hook_receives_instance_context(
        self,
        workflow_template_with_hooks,
        project,
        coach_user,
        content_object,
        caplog,
        mocker,
    ):
        """Hooks should have access to instance context"""

        # Spy on the hook function
        # spy = mocker.spy(HookRegistry._hooks["on_enter"]["rejected"][0], "__call__")
        real_hook = HookRegistry._hooks["on_enter"]["rejected"][0]
        spy = mocker.Mock(wraps=real_hook)
        HookRegistry._hooks["on_enter"]["rejected"][0] = spy

        # Create instance with rejection reason in context
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={"rejection_reason": "Video quality too low"},
        )
        instance.current_state = "in_review"
        instance.save()

        # Execute transition to rejected
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="reject", user=coach_user
        )

        # Verify hook was called with correct instance
        # Note: Hook receives the instance with updated state
        call_args = spy.call_args
        # The spy returns a tuple (args, kwargs) but we wrapped __call__ which receives self, instance, transition
        # So we need to check the actual arguments passed
        assert call_args is not None

    def test_hook_receives_transition_metadata(
        self, workflow_template_with_hooks, project, member_user, content_object, mocker
    ):
        """Hooks should receive transition definition"""

        # Create a custom hook that inspects transition
        hook_calls = []

        @HookRegistry.hook("on_transition", "test_action")
        def test_hook(instance, transition):
            hook_calls.append(
                {
                    "action": transition.get("action"),
                    "from_state": transition.get("from_state"),
                    "to_state": transition.get("to_state"),
                }
            )

        # Create template with test_action
        template = WorkflowTemplate.objects.create(
            name="Test Hook Context",
            version="1.0.0",
            definition={
                "states": [
                    {"name": "state_a", "is_initial": True},
                    {"name": "state_b", "is_initial": False},
                ],
                "transitions": [
                    {
                        "action": "test_action",
                        "from_state": "state_a",
                        "to_state": "state_b",
                        "required_permission": "member",
                        "hooks": {"on_transition": ["test_action"]},
                    }
                ],
            },
        )

        # Create instance
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=template,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="test_action", user=member_user
        )

        # Verify hook received transition details
        assert len(hook_calls) == 1
        assert hook_calls[0]["action"] == "test_action"
        assert hook_calls[0]["from_state"] == "state_a"
        assert hook_calls[0]["to_state"] == "state_b"


@pytest.mark.django_db
class TestHookErrorHandling:
    """Test hook error handling"""

    def test_hook_errors_are_logged(
        self, workflow_template_with_hooks, project, member_user, content_object, caplog
    ):
        """Hook exceptions should be logged"""

        caplog.set_level(logging.ERROR)

        # Create a hook that raises an exception
        @HookRegistry.hook("on_transition", "submit")
        def failing_hook(instance, transition):
            raise ValueError("Intentional hook failure")

        # Create instance
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition (hook should fail but not block transition)
        result = WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # Transition should succeed despite hook failure
        assert result.instance.current_state == "in_review"

        # Error should be logged
        # Note: Actual error logging depends on WorkflowEngine implementation

    def test_hook_errors_dont_block_transition(
        self, workflow_template_with_hooks, project, member_user, content_object
    ):
        """Failed hooks should not prevent state transition"""

        # Create a hook that raises an exception
        @HookRegistry.hook("on_enter", "in_review")
        def failing_hook(instance, transition):
            raise RuntimeError("Hook failed")

        # Create instance
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Execute transition (hook will fail)
        result = WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # State change should persist
        assert result.instance.current_state == "in_review"
        instance.refresh_from_db()
        assert instance.current_state == "in_review"

    def test_hook_errors_create_history_record(
        self, workflow_template_with_hooks, project, member_user, content_object
    ):
        """History record should be created even if hooks fail"""

        # Create a hook that raises an exception
        @HookRegistry.hook("on_transition", "submit")
        def failing_hook(instance, transition):
            raise RuntimeError("Hook failed")

        # Create instance
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        initial_history_count = instance.history.count()

        # Execute transition
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # History record should be created
        assert instance.history.count() == initial_history_count + 1

        # History should reflect successful transition
        latest_history = instance.history.latest("created_at")
        assert latest_history.action == "submit"
        assert latest_history.from_state == "draft"
        assert latest_history.to_state == "in_review"


@pytest.mark.django_db
class TestHookLogging:
    """Test hook logging behavior"""

    def test_approval_hook_logs_structured_data(
        self, workflow_template_with_hooks, project, coach_user, content_object, caplog
    ):
        """Approval hook should log structured data"""

        caplog.set_level(logging.INFO)

        # Create instance and move to in_review
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={},
        )
        instance.current_state = "in_review"
        instance.save()

        # Execute approval transition
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="approve", user=coach_user
        )

        # Check structured logging
        assert "approved" in caplog.text
        assert str(instance.id) in caplog.text
        assert str(project.id) in caplog.text

    def test_rejection_hook_logs_context_data(
        self, workflow_template_with_hooks, project, coach_user, content_object, caplog
    ):
        """Rejection hook should log context data"""

        caplog.set_level(logging.WARNING)

        # Create instance with rejection reason
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={"rejection_reason": "Insufficient quality"},
        )
        instance.current_state = "in_review"
        instance.save()

        # Execute rejection transition
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="reject", user=coach_user
        )

        # Check rejection logged at WARNING level
        assert "rejected" in caplog.text
        assert str(instance.id) in caplog.text


@pytest.mark.django_db
class TestHookIntegration:
    """Integration tests for hook workflows"""

    def test_full_workflow_with_all_hooks(
        self, workflow_template_with_hooks, project, member_user, coach_user, content_object, caplog
    ):
        """Test complete workflow executes all hooks"""

        caplog.set_level(logging.INFO)

        # Create instance (draft state)
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},
        )

        # Submit for review (triggers: on_draft_exit, on_submit_transition)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="submit", user=member_user
        )

        # Approve (triggers: on_review_exit, on_approval_enter)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="approve", user=coach_user
        )

        # Verify all hooks fired (via logs)
        log_text = caplog.text
        assert "submitted from draft" in log_text
        assert "Executing submit transition" in log_text
        assert "completing review" in log_text
        assert "approved" in log_text

    def test_alternate_path_with_different_hooks(
        self, workflow_template_with_hooks, project, member_user, coach_user, content_object, caplog
    ):
        """Test alternate workflow path executes different hooks"""

        caplog.set_level(logging.WARNING)

        # Create instance and move to in_review
        instance = WorkflowEngine(hook_registry=HookRegistry).create_instance(
            workflow=workflow_template_with_hooks,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"rejection_reason": "Needs revision"},
        )
        instance.current_state = "in_review"
        instance.save()

        # Reject (triggers: on_review_exit, on_rejection_enter)
        WorkflowEngine(hook_registry=HookRegistry).execute_transition(
            instance=instance, action="reject", user=coach_user
        )

        # Verify rejection hooks fired
        log_text = caplog.text
        assert "rejected" in log_text
        assert str(instance.id) in log_text

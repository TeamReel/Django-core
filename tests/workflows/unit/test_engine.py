"""Unit tests for WorkflowEngine service."""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError

from src.workflows.services.engine import WorkflowEngine
from tests.workflows.factories import (
    ProjectPermissionOverrideFactory,
    WorkflowInstanceFactory,
    WorkflowTemplateFactory,
)

User = get_user_model()


@pytest.fixture
def user(db):
    """Create test user."""
    return User.objects.create_user(username="testuser", email="test@example.com")


@pytest.fixture
def admin_user(db):
    """Create admin user."""
    return User.objects.create_user(username="admin", email="admin@example.com")


@pytest.fixture
def project(db, user):
    """Create test project."""
    from organisations.models import Organisation
    from projects.models import Project

    org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
    return Project.objects.create(
        name="Test Project",
        slug="test-project",
        organisation=org,
        creator=user,
    )


@pytest.fixture
def workflow_template(db):
    """Create test workflow template."""
    return WorkflowTemplateFactory(
        name="Test Workflow",
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "review", "is_initial": False, "is_terminal": False},
                {"name": "approved", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {
                    "action": "submit",
                    "from_state": "draft",
                    "to_state": "review",
                    "required_permission": "member",
                    "validators": [],
                    "hooks": {},
                },
                {
                    "action": "approve",
                    "from_state": "review",
                    "to_state": "approved",
                    "required_permission": "admin",
                    "validators": ["validate_review"],
                    "hooks": {"on_enter": ["notify_approval"]},
                },
            ],
        },
    )


@pytest.fixture
def workflow_instance(db, workflow_template, project, user):
    """Create test workflow instance."""
    return WorkflowInstanceFactory(
        workflow=workflow_template,
        workflow_snapshot=workflow_template.definition,
        project=project,
        current_state="draft",
        created_by=user,
    )


@pytest.fixture
def engine():
    """Create WorkflowEngine instance."""
    return WorkflowEngine()


class TestWorkflowEngineCreateInstance:
    """Tests for create_instance method."""

    def test_creates_instance_with_initial_state(
        self, db, engine, workflow_template, project, user
    ):
        """Should create instance with initial state from template."""
        instance = engine.create_instance(
            workflow=workflow_template,
            project=project,
            content_object=user,
            user=user,
            context={"note": "Test"},
        )

        assert instance.id is not None
        assert instance.current_state == "draft"
        assert instance.workflow_snapshot == workflow_template.definition
        assert instance.context == {"note": "Test"}
        assert instance.created_by == user

    def test_creates_instance_with_empty_context(
        self, db, engine, workflow_template, project, user
    ):
        """Should create instance with empty context if none provided."""
        instance = engine.create_instance(
            workflow=workflow_template,
            project=project,
            content_object=user,
            user=user,
        )

        assert instance.context == {}

    def test_creates_immutable_workflow_snapshot(
        self, db, engine, workflow_template, project, user
    ):
        """Should snapshot workflow definition at creation time."""
        instance = engine.create_instance(
            workflow=workflow_template,
            project=project,
            content_object=user,
            user=user,
        )

        # Refresh template from DB and modify
        workflow_template.refresh_from_db()
        new_definition = workflow_template.definition.copy()
        new_definition["states"].append(
            {"name": "cancelled", "is_initial": False, "is_terminal": True}
        )
        workflow_template.definition = new_definition
        workflow_template.save()

        # Instance should still have original definition
        assert len(instance.workflow_snapshot["states"]) == 3
        workflow_template.refresh_from_db()
        assert len(workflow_template.definition["states"]) == 4


class TestWorkflowEngineGetAvailableActions:
    """Tests for get_available_actions method."""

    def test_returns_available_actions_for_current_state(
        self, db, engine, workflow_instance, user, project
    ):
        """Should return actions available from current state."""
        # Add membership
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        actions = engine.get_available_actions(workflow_instance, user)

        assert len(actions) == 1
        assert actions[0]["action"] == "submit"
        assert actions[0]["to_state"] == "review"

    def test_filters_actions_by_permission(self, db, engine, workflow_instance, user, project):
        """Should filter actions based on user permissions."""
        # Create non-creator user
        other_user = User.objects.create_user(username="other", email="other@example.com")
        from projects.models import ProjectMembership

        # User has member role, cannot approve (requires admin)
        ProjectMembership.objects.create(
            user=other_user, project=project, role="member", deleted_at=None
        )

        # Move to review state
        workflow_instance.current_state = "review"
        workflow_instance.save()

        actions = engine.get_available_actions(workflow_instance, other_user)

        # Should not include approve action (requires admin)
        assert len(actions) == 0

    def test_returns_empty_for_terminal_state(self, db, engine, workflow_instance, user, project):
        """Should return empty list for terminal state."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        workflow_instance.current_state = "approved"
        workflow_instance.save()

        actions = engine.get_available_actions(workflow_instance, user)

        assert len(actions) == 0


class TestWorkflowEngineExecuteTransition:
    """Tests for execute_transition method."""

    def test_executes_valid_transition(self, db, engine, workflow_instance, user, project):
        """Should execute transition and update state."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        history = engine.execute_transition(
            instance=workflow_instance,
            action="submit",
            user=user,
            comment="Ready for review",
        )

        workflow_instance.refresh_from_db()
        assert workflow_instance.current_state == "review"
        assert workflow_instance.version == 1
        assert history.from_state == "draft"
        assert history.to_state == "review"
        assert history.action == "submit"
        assert history.actor == user

    def test_raises_validation_error_for_invalid_action(
        self, db, engine, workflow_instance, user, project
    ):
        """Should raise ValidationError for nonexistent action."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        with pytest.raises(ValidationError, match="Action 'invalid' not found"):
            engine.execute_transition(instance=workflow_instance, action="invalid", user=user)

    def test_raises_validation_error_for_wrong_state(
        self, db, engine, workflow_instance, user, project
    ):
        """Should raise ValidationError when action not valid from current state."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="admin", deleted_at=None)

        # Try to approve from draft (should be in review)
        with pytest.raises(ValidationError, match="Cannot execute 'approve'"):
            engine.execute_transition(instance=workflow_instance, action="approve", user=user)

    def test_raises_permission_denied_for_unauthorized_user(
        self, db, engine, workflow_instance, user, project
    ):
        """Should raise PermissionDenied when user lacks permission."""
        other_user = User.objects.create_user(username="unauth", email="unauth@example.com")
        # No membership = no permission
        with pytest.raises(PermissionDenied, match="User lacks permission"):
            engine.execute_transition(instance=workflow_instance, action="submit", user=other_user)

    def test_updates_context_during_transition(self, db, engine, workflow_instance, user, project):
        """Should merge context updates during transition."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        workflow_instance.context = {"step": 1}
        workflow_instance.save()

        engine.execute_transition(
            instance=workflow_instance,
            action="submit",
            user=user,
            context_updates={"step": 2, "reviewer": "john"},
        )

        workflow_instance.refresh_from_db()
        assert workflow_instance.context["step"] == 2
        assert workflow_instance.context["reviewer"] == "john"

    def test_increments_version_for_optimistic_locking(
        self, db, engine, workflow_instance, user, project
    ):
        """Should increment version field on each transition."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="member", deleted_at=None)

        assert workflow_instance.version == 0

        engine.execute_transition(instance=workflow_instance, action="submit", user=user)

        workflow_instance.refresh_from_db()
        assert workflow_instance.version == 1

    def test_respects_permission_overrides(self, db, engine, workflow_instance, user, project):
        """Should use ProjectPermissionOverride when available."""
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(user=user, project=project, role="viewer", deleted_at=None)

        # Create override allowing viewer to submit
        ProjectPermissionOverrideFactory(
            project=project,
            workflow=workflow_instance.workflow,
            action_name="submit",
            required_roles=["viewer", "member"],
        )

        # Should succeed even though default requires member
        history = engine.execute_transition(instance=workflow_instance, action="submit", user=user)

        assert history.to_state == "review"


class TestWorkflowEnginePermissionChecks:
    """Tests for permission checking logic."""

    def test_checks_project_membership(
        self, db, engine, workflow_instance, django_user_model, project
    ):
        """Should require active project membership."""
        # Create non-creator user
        other_user = django_user_model.objects.create_user(
            username="other", email="other@example.com", password="password"
        )

        # No membership
        has_permission = engine._check_permission(workflow_instance, "submit", other_user)
        assert has_permission is False

        # Add membership
        from projects.models import ProjectMembership

        ProjectMembership.objects.create(
            user=other_user, project=project, role="member", deleted_at=None
        )

        has_permission = engine._check_permission(workflow_instance, "submit", other_user)
        assert has_permission is True

    def test_checks_role_requirements(
        self, db, engine, workflow_instance, django_user_model, project, admin_user
    ):
        """Should check role requirements from transition definition."""
        from projects.models import ProjectMembership

        # Create non-creator user
        member_user = django_user_model.objects.create_user(
            username="member", email="member@example.com", password="password"
        )

        # Member cannot approve (requires admin)
        ProjectMembership.objects.create(
            user=member_user, project=project, role="member", deleted_at=None
        )

        workflow_instance.current_state = "review"
        workflow_instance.save()

        has_permission = engine._check_permission(workflow_instance, "approve", member_user)
        assert has_permission is False

        # Admin can approve
        ProjectMembership.objects.create(
            user=admin_user, project=project, role="admin", deleted_at=None
        )

        has_permission = engine._check_permission(workflow_instance, "approve", admin_user)
        assert has_permission is True

    def test_club_admin_can_act_on_child_team_workflow(
        self, db, engine, workflow_template, django_user_model, project
    ):
        """Club Admin (admin on parent project) can execute transitions on child team workflows."""
        from projects.models import Project, ProjectMembership

        club_admin = django_user_model.objects.create_user(
            username="clubadmin", email="clubadmin@example.com", password="password"
        )
        # project = club, create child team
        team = Project.objects.create(
            name="Team A",
            slug="team-a",
            organisation=project.organisation,
            creator=project.creator,
            parent_project=project,
        )
        # Club Admin has admin on the CLUB, not the team
        ProjectMembership.objects.create(
            user=club_admin, project=project, role="admin", deleted_at=None
        )
        # Workflow instance on the TEAM project
        instance = WorkflowInstanceFactory(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=team,
            current_state="review",
            created_by=project.creator,
        )
        # Club Admin should be able to approve team workflows
        assert engine._check_permission(instance, "approve", club_admin) is True

    def test_team_admin_cannot_act_on_club_workflow(
        self, db, engine, workflow_template, django_user_model, project
    ):
        """Team Admin (admin on child project) cannot execute transitions on parent club workflows."""
        from projects.models import Project, ProjectMembership

        team_admin = django_user_model.objects.create_user(
            username="teamadmin", email="teamadmin@example.com", password="password"
        )
        team = Project.objects.create(
            name="Team B",
            slug="team-b",
            organisation=project.organisation,
            creator=project.creator,
            parent_project=project,
        )
        # Team Admin has admin on the TEAM only
        ProjectMembership.objects.create(
            user=team_admin, project=team, role="admin", deleted_at=None
        )
        # Workflow instance on the CLUB project
        instance = WorkflowInstanceFactory(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=project,
            current_state="review",
            created_by=project.creator,
        )
        # Team Admin should NOT be able to approve club-level workflows
        assert engine._check_permission(instance, "approve", team_admin) is False

    def test_viewer_on_parent_cannot_approve_child(
        self, db, engine, workflow_template, django_user_model, project
    ):
        """Viewer on parent club cannot approve child team workflows (role doesn't match)."""
        from projects.models import Project, ProjectMembership

        club_viewer = django_user_model.objects.create_user(
            username="clubviewer", email="clubviewer@example.com", password="password"
        )
        team = Project.objects.create(
            name="Team C",
            slug="team-c",
            organisation=project.organisation,
            creator=project.creator,
            parent_project=project,
        )
        # Viewer on the club
        ProjectMembership.objects.create(
            user=club_viewer, project=project, role="viewer", deleted_at=None
        )
        instance = WorkflowInstanceFactory(
            workflow=workflow_template,
            workflow_snapshot=workflow_template.definition,
            project=team,
            current_state="review",
            created_by=project.creator,
        )
        # Viewer cannot approve (requires admin role)
        assert engine._check_permission(instance, "approve", club_viewer) is False

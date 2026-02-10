"""Integration tests for B09 Audit logging in workflows."""
import pytest
from django.contrib.auth import get_user_model

from src.workflows.models import WorkflowTemplate
from src.workflows.services.engine import WorkflowEngine

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestAuditIntegration:
    """Test B09 Audit integration with workflow engine."""

    @pytest.fixture
    def workflow_template(self, db):
        """Create test workflow template."""
        return WorkflowTemplate.objects.create(
            name="Test Workflow",
            version="1.0.0",
            is_active=True,
            definition={
                "states": [
                    {"name": "draft", "is_initial": True, "is_terminal": False},
                    {"name": "submitted", "is_initial": False, "is_terminal": False},
                    {"name": "approved", "is_initial": False, "is_terminal": True},
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
            content_object=project,  # Use project as content for testing
            user=user,
            context={"test": "data"},
        )

    def test_audit_event_on_instance_creation(self, workflow_template, project, user):
        """Test audit event created when workflow instance created."""
        try:
            from audit.models import AuditEvent

            initial_count = AuditEvent.objects.count()

            engine = WorkflowEngine()
            instance = engine.create_instance(
                workflow=workflow_template,
                project=project,
                content_object=project,
                user=user,
            )

            # Verify audit event created
            events = AuditEvent.objects.filter(
                event_type="workflow.workflow_created",
                project=project,
                user=user,
            )

            assert events.count() == 1
            event = events.first()
            assert event.metadata["workflow_instance_id"] == str(instance.id)
            assert event.metadata["workflow_name"] == workflow_template.name
            assert event.metadata["current_state"] == "draft"

        except ImportError:
            pytest.skip("B09 Audit not available")

    def test_audit_event_on_transition(self, workflow_instance, user, project):
        """Test audit event created on state transition."""
        try:
            from audit.models import AuditEvent
            from projects.models import ProjectMembership

            # Add membership for permission check
            ProjectMembership.objects.create(
                user=user,
                project=project,
                role="member",
            )

            initial_count = AuditEvent.objects.filter(
                event_type__startswith="workflow.transition_"
            ).count()

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
                comment="Test transition",
            )

            # Verify audit event created
            events = AuditEvent.objects.filter(
                event_type="workflow.transition_submit",
                project=project,
                user=user,
            )

            assert events.count() == 1
            event = events.first()
            assert event.metadata["workflow_instance_id"] == str(workflow_instance.id)
            assert event.metadata["from_state"] == "draft"
            assert event.metadata["to_state"] == "submitted"

        except ImportError:
            pytest.skip("B09 Audit not available")

    def test_audit_captures_organization_context(self, workflow_template, project, user):
        """Test audit event captures organization from project."""
        try:
            from audit.models import AuditEvent

            engine = WorkflowEngine()
            instance = engine.create_instance(
                workflow=workflow_template,
                project=project,
                content_object=project,
                user=user,
            )

            event = AuditEvent.objects.get(
                event_type="workflow.workflow_created",
                project=project,
            )

            assert event.organization == project.organisation

        except ImportError:
            pytest.skip("B09 Audit not available")

    def test_workflow_continues_if_audit_fails(self, workflow_template, project, user, mocker):
        """Test workflow execution continues even if audit logging fails."""
        try:
            from audit.api import audit_log

            # Mock audit_log.record to raise exception
            mock_record = mocker.patch.object(audit_log, "record")
            mock_record.side_effect = Exception("Audit service unavailable")

            engine = WorkflowEngine()
            instance = engine.create_instance(
                workflow=workflow_template,
                project=project,
                content_object=project,
                user=user,
            )

            # Instance should still be created
            assert instance.id is not None
            assert instance.current_state == "draft"

        except ImportError:
            pytest.skip("B09 Audit not available")

    def test_query_workflow_history_via_audit(self, workflow_instance, user, project):
        """Test querying workflow transition history via audit events."""
        try:
            from audit.models import AuditEvent
            from projects.models import ProjectMembership

            ProjectMembership.objects.create(user=user, project=project, role="member")

            engine = WorkflowEngine()
            engine.execute_transition(
                instance=workflow_instance,
                action="submit",
                user=user,
            )

            # Query all workflow events for this project
            events = AuditEvent.objects.filter(
                project=project,
                event_type__startswith="workflow.",
            ).order_by("created_at")

            assert events.count() >= 2  # creation + transition
            event_types = [e.event_type for e in events]
            assert "workflow.workflow_created" in event_types
            assert "workflow.transition_submit" in event_types

        except ImportError:
            pytest.skip("B09 Audit not available")

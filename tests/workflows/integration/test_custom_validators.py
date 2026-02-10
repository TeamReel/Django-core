"""
Integration tests for custom validators (workflows.examples module).

Tests demonstrate how to register and use custom validators
in workflow transitions.
"""

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from src.workflows.examples import (
    validate_approval_threshold,
    validate_budget,
    validate_completeness,
)
from src.workflows.models import WorkflowTemplate
from src.workflows.registry import ValidatorRegistry
from src.workflows.services import WorkflowService

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
        name="Test Organisation", slug="test-org", creator=admin_user
    )


@pytest.fixture
def project(db, organisation, admin_user, member_user, coach_user):
    """Create test project with memberships."""
    Project = apps.get_model("projects", "Project")
    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    project = Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation, creator=admin_user
    )

    # Create memberships
    ProjectMembership.objects.create(project=project, user=member_user, role="member")
    ProjectMembership.objects.create(project=project, user=coach_user, role="coach")

    return project


@pytest.fixture
def workflow_template_with_validators(db):
    """Workflow template with validator references"""
    return WorkflowTemplate.objects.create(
        name="Validator Test Workflow",
        version="1.0.0",
        is_published=True,
        definition={
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {
                    "name": "pending_approval",
                    "is_initial": False,
                    "is_terminal": False,
                },
                {"name": "approved", "is_initial": False, "is_terminal": True},
            ],
            "transitions": [
                {
                    "action": "submit",
                    "from_state": "draft",
                    "to_state": "pending_approval",
                    "required_permission": "member",
                    "validators": ["budget_check", "completeness_check"],
                },
                {
                    "action": "approve",
                    "from_state": "pending_approval",
                    "to_state": "approved",
                    "required_permission": "coach",
                    "validators": ["approval_threshold"],
                    "metadata": {"min_approvals": 2},
                },
            ],
        },
    )


@pytest.fixture
def content_object(db, project):
    """Mock content object for workflow attachment - use existing project"""
    # Reuse project fixture as content object (any model works)
    return project


@pytest.mark.django_db
class TestBudgetValidator:
    """Test budget_check validator from examples.py"""

    def test_budget_validator_passes_under_limit(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Valid amount should allow transition"""

        # Create instance with valid amount
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"amount": 5000},  # Under 10k limit
        )

        # Should succeed
        result = WorkflowService.execute_transition(
            instance=instance, action="submit", user=member_user
        )

        assert result["instance"]["current_state"] == "pending_approval"

    def test_budget_validator_blocks_over_limit(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Amount > 10,000 should block transition"""

        # Create instance with excessive amount
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"amount": 15000},  # Exceeds 10k limit
        )

        # Should fail validation
        with pytest.raises(ValidationError, match="exceeds budget limit"):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # State should remain unchanged
        instance.refresh_from_db()
        assert instance.current_state == "draft"

    def test_budget_validator_defaults_to_zero(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Missing amount field should default to 0 (pass)"""

        # Create instance without amount
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={},  # No amount field
        )

        # Should succeed (defaults to 0)
        result = WorkflowService.execute_transition(
            instance=instance, action="submit", user=member_user
        )

        assert result["instance"]["current_state"] == "pending_approval"


@pytest.mark.django_db
class TestCompletenessValidator:
    """Test completeness_check validator from examples.py"""

    def test_completeness_validator_passes_with_all_fields(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """All required fields present should allow transition"""

        # Create instance with all required fields
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={
                "title": "Test Content",
                "description": "Test description",
                "assignee": "john@example.com",
                "amount": 1000,
            },
        )

        # Should succeed
        result = WorkflowService.execute_transition(
            instance=instance, action="submit", user=member_user
        )

        assert result["instance"]["current_state"] == "pending_approval"

    def test_completeness_validator_blocks_missing_fields(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Missing required fields should block transition"""

        # Create instance with missing fields
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={
                "title": "Test Content",
                # Missing: description, assignee
            },
        )

        # Should fail validation
        with pytest.raises(ValidationError, match="Required fields missing"):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # State should remain unchanged
        instance.refresh_from_db()
        assert instance.current_state == "draft"

    def test_completeness_validator_identifies_specific_missing_fields(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Error message should list specific missing fields"""

        # Create instance with partially missing fields
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={
                "title": "Test Content",
                "assignee": "john@example.com",
                # Missing: description
            },
        )

        # Should fail validation with specific field name
        with pytest.raises(ValidationError, match="description"):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)


@pytest.mark.django_db
class TestApprovalThresholdValidator:
    """Test approval_threshold validator from examples.py"""

    def test_approval_validator_passes_with_sufficient_approvals(
        self, workflow_template_with_validators, project, coach_user, content_object
    ):
        """Meeting approval threshold should allow transition"""

        # Create instance in pending_approval state with approvals
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={
                "title": "Test",
                "description": "Test",
                "assignee": "test@example.com",
                "approvals": [
                    {"user": "coach1@example.com", "timestamp": "2026-02-10T10:00:00Z"},
                    {"user": "coach2@example.com", "timestamp": "2026-02-10T10:05:00Z"},
                ],
            },
        )

        # Move to pending_approval state first
        instance.current_state = "pending_approval"
        instance.save()

        # Should succeed (2 approvals >= 2 required)
        result = WorkflowService.execute_transition(
            instance=instance, action="approve", user=coach_user
        )

        assert result["instance"]["current_state"] == "approved"

    def test_approval_validator_blocks_insufficient_approvals(
        self, workflow_template_with_validators, project, coach_user, content_object
    ):
        """Below approval threshold should block transition"""

        # Create instance with only 1 approval (needs 2)
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={
                "approvals": [{"user": "coach1@example.com", "timestamp": "2026-02-10T10:00:00Z"}]
            },
        )

        # Move to pending_approval state
        instance.current_state = "pending_approval"
        instance.save()

        # Should fail validation
        with pytest.raises(ValidationError, match="Minimum 2 approvals required"):
            WorkflowService.execute_transition(instance=instance, action="approve", user=coach_user)

        # State should remain unchanged
        instance.refresh_from_db()
        assert instance.current_state == "pending_approval"

    def test_approval_validator_defaults_to_empty_list(
        self, workflow_template_with_validators, project, coach_user, content_object
    ):
        """Missing approvals field should default to empty list (fail)"""

        # Create instance without approvals field
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=coach_user,
            context={},  # No approvals field
        )

        # Move to pending_approval state
        instance.current_state = "pending_approval"
        instance.save()

        # Should fail validation (0 < 2)
        with pytest.raises(ValidationError, match="Minimum 2 approvals required"):
            WorkflowService.execute_transition(instance=instance, action="approve", user=coach_user)


@pytest.mark.django_db
class TestValidatorRegistry:
    """Test ValidatorRegistry functionality"""

    def test_validators_are_registered(self):
        """Example validators should be registered in registry"""

        assert "budget_check" in ValidatorRegistry._validators
        assert "completeness_check" in ValidatorRegistry._validators
        assert "approval_threshold" in ValidatorRegistry._validators

    def test_validators_can_be_retrieved(self):
        """Registered validators should be retrievable by name"""

        budget_validator = ValidatorRegistry.get_validator("budget_check")
        assert budget_validator is validate_budget

        completeness_validator = ValidatorRegistry.get_validator("completeness_check")
        assert completeness_validator is validate_completeness

        approval_validator = ValidatorRegistry.get_validator("approval_threshold")
        assert approval_validator is validate_approval_threshold

    def test_multiple_validators_execute_in_sequence(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """All validators should execute for a transition"""

        # Create instance that fails budget check but would pass completeness
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={
                "title": "Test",
                "description": "Test",
                "assignee": "test@example.com",
                "amount": 50000,  # Fails budget check
            },
        )

        # Should fail on first validator (budget_check)
        with pytest.raises(ValidationError, match="exceeds budget limit"):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

    def test_validators_fail_fast(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Validation should stop at first failure"""

        # Create instance that fails both validators
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={
                "amount": 50000,  # Fails budget check
                # Missing required fields (would fail completeness)
            },
        )

        # Should fail on first validator only (fail-fast)
        with pytest.raises(ValidationError) as exc_info:
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # Should only see budget error, not completeness error
        assert "exceeds budget limit" in str(exc_info.value)
        assert "Required fields missing" not in str(exc_info.value)


@pytest.mark.django_db
class TestValidatorErrorHandling:
    """Test validator error handling and logging"""

    def test_validation_errors_are_logged(
        self,
        workflow_template_with_validators,
        project,
        member_user,
        content_object,
        caplog,
    ):
        """Validation failures should be logged"""

        import logging

        caplog.set_level(logging.WARNING)

        # Create instance that fails validation
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"amount": 50000},
        )

        # Trigger validation failure
        with pytest.raises(ValidationError):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # Check logs
        assert "Budget validation failed" in caplog.text
        assert str(instance.id) in caplog.text

    def test_validation_does_not_modify_instance(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Failed validation should not persist any changes"""

        # Create instance that will fail validation
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"amount": 50000},
        )

        original_version = instance.version
        original_state = instance.current_state

        # Trigger validation failure
        with pytest.raises(ValidationError):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # Verify no changes persisted
        instance.refresh_from_db()
        assert instance.version == original_version
        assert instance.current_state == original_state

    def test_validation_creates_no_history_record(
        self, workflow_template_with_validators, project, member_user, content_object
    ):
        """Failed validation should not create history records"""

        # Create instance that will fail validation
        instance = WorkflowService.create_instance(
            workflow=workflow_template_with_validators,
            content_object=content_object,
            project=project,
            user=member_user,
            context={"amount": 50000},
        )

        original_history_count = instance.transition_history.count()

        # Trigger validation failure
        with pytest.raises(ValidationError):
            WorkflowService.execute_transition(instance=instance, action="submit", user=member_user)

        # Verify no new history records
        assert instance.transition_history.count() == original_history_count

"""
Example validators and hooks for documentation and testing.

This module demonstrates how to register custom validators and hooks
using the ValidatorRegistry and HookRegistry patterns.
"""

import logging

from django.core.exceptions import ValidationError

from src.workflows.models import WorkflowInstance
from src.workflows.registry import HookRegistry, ValidatorRegistry

logger = logging.getLogger(__name__)


# =============================================================================
# Example Validators
# =============================================================================


@ValidatorRegistry.validator("budget_check")
def validate_budget(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example validator: Check if amount exceeds budget limit.

    Args:
        instance: Workflow instance with context containing "amount"
        transition: Transition definition (not used in this example)

    Raises:
        ValidationError: If amount > 10000
    """
    amount = instance.context.get("amount", 0)
    if amount > 10000:
        logger.warning(
            f"Budget validation failed for instance {instance.id}: "
            f"amount={amount} exceeds limit"
        )
        raise ValidationError("Amount exceeds budget limit of 10,000")


@ValidatorRegistry.validator("completeness_check")
def validate_completeness(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example validator: Check if required fields are present.

    Args:
        instance: Workflow instance with context containing required fields
        transition: Transition definition (not used in this example)

    Raises:
        ValidationError: If required fields are missing
    """
    required_fields = ["title", "description", "assignee"]
    missing = [f for f in required_fields if not instance.context.get(f)]

    if missing:
        logger.warning(
            f"Completeness validation failed for instance {instance.id}: "
            f"missing fields={missing}"
        )
        raise ValidationError(f"Required fields missing: {', '.join(missing)}")


@ValidatorRegistry.validator("approval_threshold")
def validate_approval_threshold(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example validator: Check if minimum number of approvals received.

    Args:
        instance: Workflow instance with context containing "approvals"
        transition: Transition definition with "min_approvals" metadata

    Raises:
        ValidationError: If approval count < threshold
    """
    approvals = instance.context.get("approvals", [])
    min_required = transition.get("metadata", {}).get("min_approvals", 2)

    if len(approvals) < min_required:
        logger.warning(
            f"Approval threshold not met for instance {instance.id}: "
            f"{len(approvals)}/{min_required} approvals"
        )
        raise ValidationError(
            f"Minimum {min_required} approvals required, only {len(approvals)} received"
        )


# =============================================================================
# Example Hooks
# =============================================================================


@HookRegistry.hook("on_enter", "approved")
def on_approval_enter(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Log when workflow enters approved state.

    Args:
        instance: Workflow instance entering "approved" state
        transition: Transition that led to this state
    """
    logger.info(
        f"Workflow {instance.id} approved",
        extra={
            "instance_id": str(instance.id),
            "project_id": str(instance.project_id),
            "action": transition.get("action"),
        },
    )
    # In real implementation: send notifications, update external systems, etc.


@HookRegistry.hook("on_exit", "draft")
def on_draft_exit(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Log when workflow leaves draft state.

    Args:
        instance: Workflow instance leaving "draft" state
        transition: Transition being executed
    """
    logger.info(
        f"Workflow {instance.id} submitted from draft",
        extra={
            "instance_id": str(instance.id),
            "project_id": str(instance.project_id),
            "action": transition.get("action"),
        },
    )
    # In real implementation: validate draft state, archive previous versions, etc.


@HookRegistry.hook("on_transition", "submit")
def on_submit_transition(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Execute logic during submit transition.

    Args:
        instance: Workflow instance being transitioned
        transition: Transition definition for "submit" action
    """
    logger.info(
        f"Executing submit transition for workflow {instance.id}",
        extra={
            "instance_id": str(instance.id),
            "project_id": str(instance.project_id),
            "from_state": transition.get("from_state"),
            "to_state": transition.get("to_state"),
        },
    )
    # In real implementation: trigger external processes, send webhooks, etc.


@HookRegistry.hook("on_enter", "rejected")
def on_rejection_enter(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Handle rejection state entry.

    Args:
        instance: Workflow instance entering "rejected" state
        transition: Transition that led to rejection
    """
    logger.warning(
        f"Workflow {instance.id} rejected",
        extra={
            "instance_id": str(instance.id),
            "project_id": str(instance.project_id),
            "rejection_reason": instance.context.get("rejection_reason"),
        },
    )
    # In real implementation: notify submitter, record metrics, etc.


@HookRegistry.hook("on_exit", "in_review")
def on_review_exit(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Cleanup when leaving review state.

    Args:
        instance: Workflow instance leaving "in_review" state
        transition: Transition being executed
    """
    logger.info(
        f"Workflow {instance.id} completing review",
        extra={
            "instance_id": str(instance.id),
            "project_id": str(instance.project_id),
            "to_state": transition.get("to_state"),
        },
    )
    # In real implementation: close review tasks, update review metrics, etc.


@HookRegistry.hook("on_enter", "submitted")
def send_submission_notification(instance: WorkflowInstance, transition: dict) -> None:
    """
    Example hook: Send notification via B16 when workflow submitted.

    Demonstrates integration with B16 Notifications module.

    Args:
        instance: Workflow instance entering "submitted" state
        transition: Transition that led to submission
    """
    try:
        # Attempt B16 Notifications integration
        from src.notifications.services import notification_service

        # Send notification to project members
        notification_service.send_notification(
            recipient_ids=[m.user_id for m in instance.project.memberships.all()],
            notification_type="workflow_submitted",
            title=f"Workflow Submitted: {instance.workflow.name}",
            message=(
                f"A new workflow instance has been submitted "
                f"for review in {instance.project.name}"
            ),
            metadata={
                "workflow_id": str(instance.workflow_id),
                "instance_id": str(instance.id),
                "project_id": str(instance.project_id),
                "action": transition.get("action"),
            },
            link=f"/projects/{instance.project_id}/workflows/{instance.id}",
        )

        logger.info(
            f"Sent submission notification for workflow {instance.id}",
            extra={
                "instance_id": str(instance.id),
                "project_id": str(instance.project_id),
            },
        )

    except ImportError as e:
        # Debugging Import Error
        logger.error(f"B16 IMPORT ERROR details: {e}")
        # B16 not available - fallback to standard logging
        # RE-RAISE to see it in test trace
        raise e
        logger.info(
            f"B16 not available - would send notification for workflow {instance.id}",
            extra={
                "instance_id": str(instance.id),
                "project_id": str(instance.project_id),
                "notification_type": "workflow_submitted",
            },
        )
    except Exception as e:
        # Never fail workflow execution due to notification failure
        logger.error(
            f"Failed to send notification for workflow {instance.id}",
            extra={"instance_id": str(instance.id), "error": str(e)},
        )


# =============================================================================
# Documentation
# =============================================================================

"""
Usage Examples
==============

1. Validators are registered at module import time and called during execute_transition:

   from workflows.services.engine import WorkflowEngine

   engine = WorkflowEngine()
   try:
       engine.execute_transition(
           instance=workflow_instance,
           action="submit",
           user=request.user,
           comment="Ready for review"
       )
   except ValidationError as e:
       # Handle validation failure (e.g., budget_check failed)
       return Response({"error": str(e)}, status=400)

2. Hooks are registered at module import time and fire automatically:

   # When transitioning from "draft" to "in_review":
   # - on_draft_exit fires first
   # - on_submit_transition fires during transition
   # - on_approval_enter fires last (if to_state is "approved")

3. Custom validators and hooks in your project:

   # In your project's workflows_config.py:
   from workflows.registry import ValidatorRegistry, HookRegistry

   @ValidatorRegistry.validator("team_capacity_check")
   def validate_team_capacity(instance, transition):
       team_size = instance.context.get("team_members", [])
       if len(team_size) > 50:
           raise ValidationError("Team exceeds maximum capacity")

   @HookRegistry.hook("on_enter", "production")
   def on_production_deploy(instance, transition):
       trigger_deployment(instance.content_object)

4. Test isolation with instance registries:

   from workflows.registry import ValidatorRegistry, HookRegistry

   def test_custom_validator():
       # Create isolated registry for this test
       registry = ValidatorRegistry()

       def my_test_validator(instance, transition):
           if instance.context.get("test_flag"):
               raise ValidationError("Test validation failed")

       # Register in isolated instance
       registry.register("test_validator", my_test_validator)

       # Use in WorkflowEngine with dependency injection
       engine = WorkflowEngine(validator_registry=registry)
       ...
"""

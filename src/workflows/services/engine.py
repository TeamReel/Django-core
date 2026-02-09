"""Workflow state machine engine."""
import logging
from typing import Any, Optional
from uuid import UUID

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from src.workflows.models import (
    ProjectPermissionOverride,
    TransitionHistory,
    WorkflowInstance,
    WorkflowTemplate,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class WorkflowEngine:
    """Stateless workflow state machine execution engine."""

    def __init__(self, validator_registry=None, hook_registry=None):
        """
        Initialize with optional registry instances (for testing).

        Args:
            validator_registry: Registry for transition validators
            hook_registry: Registry for lifecycle hooks
        """
        self.validator_registry = validator_registry
        self.hook_registry = hook_registry

    def create_instance(
        self,
        workflow: WorkflowTemplate,
        project,
        content_object,
        user: User,
        context: Optional[dict[str, Any]] = None,
    ) -> WorkflowInstance:
        """
        Create workflow instance with initial state snapshot.

        Args:
            workflow: Template to instantiate
            project: Project scope for instance
            content_object: Associated content object (GenericFK)
            user: User creating the instance
            context: Optional initial context data

        Returns:
            Created WorkflowInstance

        Raises:
            ValidationError: If context exceeds 64KB or workflow definition invalid
        """
        if context is None:
            context = {}

        initial_state = workflow.get_initial_state()

        instance = WorkflowInstance.objects.create(
            workflow=workflow,
            workflow_snapshot=workflow.definition,  # Immutable snapshot
            project=project,
            content_object=content_object,
            current_state=initial_state,
            context=context,
            created_by=user,
        )

        logger.info(
            "Created workflow instance",
            extra={
                "instance_id": instance.id,
                "workflow": workflow.name,
                "state": initial_state,
                "user_id": user.id,
                "project_id": project.id,
            },
        )

        # Log to B09 Audit (integration deferred to WP13)
        self._log_audit_event(instance, "workflow_created", user)

        return instance

    def get_available_actions(self, instance: WorkflowInstance, user: User) -> list[dict[str, Any]]:
        """
        Return list of actions user can execute from current state.

        Args:
            instance: Workflow instance to query
            user: User requesting actions

        Returns:
            List of available action dictionaries with action, to_state, required_permission
        """
        transitions = instance.workflow_snapshot.get("transitions", [])
        available = []

        for transition in transitions:
            if transition["from_state"] == instance.current_state:
                # Check permission
                if self._check_permission(instance, transition["action"], user):
                    available.append(
                        {
                            "action": transition["action"],
                            "to_state": transition["to_state"],
                            "required_permission": transition.get("required_permission", "member"),
                        }
                    )

        return available

    @transaction.atomic
    def execute_transition(
        self,
        instance: WorkflowInstance,
        action: str,
        user: User,
        comment: str = "",
        context_updates: Optional[dict[str, Any]] = None,
    ) -> TransitionHistory:
        """
        Execute state transition with validation and hooks.

        Args:
            instance: Workflow instance to transition
            action: Action name to execute
            user: User executing the transition
            comment: Optional comment for audit trail
            context_updates: Optional context updates to merge

        Returns:
            Created TransitionHistory record

        Raises:
            ValidationError: If transition invalid or validators fail
            PermissionDenied: If user lacks permission
        """
        # Lock instance for update (optimistic locking)
        instance = WorkflowInstance.objects.select_for_update().get(id=instance.id)

        # Find transition
        transition = self._get_transition(instance, action)
        if not transition:
            raise ValidationError(f"Action '{action}' not found in workflow")

        # Validate current state
        if transition["from_state"] != instance.current_state:
            raise ValidationError(
                f"Cannot execute '{action}' from state '{instance.current_state}'"
            )

        # Check permission
        if not self._check_permission(instance, action, user):
            raise PermissionDenied(f"User lacks permission to execute '{action}'")

        # Execute validators
        self._execute_validators(instance, transition)

        # Update context if provided
        if context_updates:
            instance.context.update(context_updates)
            instance.full_clean()  # Validate context size

        # Execute hooks: on_exit
        self._execute_hooks("on_exit", instance.current_state, instance, transition)

        # Record history
        task_id = None
        if "on_transition" in transition.get("hooks", {}):
            task_id = self._execute_async_hooks(instance, transition)

        history = TransitionHistory.objects.create(
            instance=instance,
            from_state=instance.current_state,
            to_state=transition["to_state"],
            action=action,
            actor=user,
            comment=comment,
            task_id=task_id,
            context_snapshot=instance.context.copy(),
        )

        # Update state
        old_state = instance.current_state
        instance.current_state = transition["to_state"]
        instance.version += 1
        instance.save()

        # Execute hooks: on_transition, on_enter
        self._execute_hooks("on_transition", action, instance, transition)
        self._execute_hooks("on_enter", transition["to_state"], instance, transition)

        logger.info(
            "Executed transition",
            extra={
                "instance_id": instance.id,
                "action": action,
                "from_state": old_state,
                "to_state": instance.current_state,
                "user_id": user.id,
            },
        )

        # Audit log
        self._log_audit_event(
            instance,
            f"transition_{action}",
            user,
            {"from_state": old_state, "to_state": instance.current_state},
        )

        return history

    def _get_transition(self, instance: WorkflowInstance, action: str) -> Optional[dict[str, Any]]:
        """Get transition definition by action."""
        transitions = instance.workflow_snapshot.get("transitions", [])
        for t in transitions:
            if t["action"] == action:
                return t
        return None

    def _check_permission(self, instance: WorkflowInstance, action: str, user: User) -> bool:
        """
        Check if user has permission to execute action.

        Args:
            instance: Workflow instance
            action: Action to check
            user: User to authorize

        Returns:
            True if user has permission, False otherwise
        """
        # Import here to avoid circular dependency
        from projects.models import ProjectMembership

        # Get required roles (override or default)
        override = ProjectPermissionOverride.objects.filter(
            project=instance.project, workflow=instance.workflow, action_name=action
        ).first()

        if override:
            required_roles = override.required_roles
        else:
            transition = self._get_transition(instance, action)
            if transition:
                required_roles = [transition.get("required_permission", "member")]
            else:
                required_roles = ["member"]

        # Check membership
        try:
            membership = ProjectMembership.objects.get(
                user=user, project=instance.project, deleted_at__isnull=True
            )
            return membership.role in required_roles
        except ProjectMembership.DoesNotExist:
            return False

    def _execute_validators(self, instance: WorkflowInstance, transition: dict[str, Any]):
        """
        Execute all registered validators for transition.

        Args:
            instance: Workflow instance
            transition: Transition definition

        Raises:
            ValidationError: If any validator fails
        """
        validator_names = transition.get("validators", [])

        for validator_name in validator_names:
            if self.validator_registry:
                try:
                    validator = self.validator_registry.get(validator_name)
                    if validator:
                        validator(instance, transition)
                except Exception as e:
                    logger.warning(
                        f"Validator '{validator_name}' failed",
                        extra={"instance_id": instance.id, "error": str(e)},
                    )
                    raise ValidationError(f"Validator '{validator_name}': {str(e)}") from e

    def _execute_hooks(
        self,
        hook_type: str,
        key: str,
        instance: WorkflowInstance,
        transition: dict[str, Any],
    ):
        """
        Execute synchronous hooks.

        Args:
            hook_type: Hook type (on_exit, on_transition, on_enter)
            key: Hook key (state name or action name)
            instance: Workflow instance
            transition: Transition definition
        """
        if not self.hook_registry:
            return

        hooks = self.hook_registry.get_hooks(hook_type, key)

        for hook in hooks:
            try:
                hook(instance, transition)
            except Exception as e:
                logger.error(
                    f"Hook {hook_type}/{key} failed",
                    extra={"instance_id": instance.id, "error": str(e)},
                )
                # Don't block transition on hook failure

    def _execute_async_hooks(
        self, instance: WorkflowInstance, transition: dict[str, Any]
    ) -> Optional[UUID]:
        """
        Execute async hooks via Celery, return task_id.

        Args:
            instance: Workflow instance
            transition: Transition definition

        Returns:
            Celery task ID if async hooks executed, None otherwise
        """
        # B15 Tasks integration will be added in WP13
        # For now, return None
        return None

    def _log_audit_event(
        self,
        instance: WorkflowInstance,
        event_type: str,
        user: User,
        extra_data: Optional[dict[str, Any]] = None,
    ):
        """
        Log to B09 Audit.

        Args:
            instance: Workflow instance
            event_type: Event type identifier
            user: User performing action
            extra_data: Additional event data
        """
        # B09 Audit integration will be added in WP13
        pass

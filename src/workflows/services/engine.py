"""Workflow state machine engine."""
import logging
from typing import TYPE_CHECKING, Any, Optional
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
from src.workflows.registry import HookRegistry, ValidatorRegistry

if TYPE_CHECKING:
    from accounts.models import User
else:
    User = get_user_model()

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Stateless workflow state machine execution engine."""

    def __init__(self, validator_registry=None, hook_registry=None):
        """
        Initialize with optional registry instances (for testing).

        Args:
            validator_registry: Registry for transition validators
            hook_registry: Registry for lifecycle hooks
        """
        self.validator_registry = validator_registry or ValidatorRegistry
        self.hook_registry = hook_registry or HookRegistry

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

        # Execute async hooks and get task_id (T137)
        task_id = self._execute_async_hooks(instance, transition)

        # Record history with task_id
        history = TransitionHistory.objects.create(
            instance=instance,
            from_state=instance.current_state,
            to_state=transition["to_state"],
            action=action,
            actor=user,
            comment=comment,
            task_id=task_id,  # Store task_id when async hooks triggered
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
                # Read permissions list (plural) from workflow definition.
                # Fall back to legacy "required_permission" (singular) for compat.
                permissions = transition.get("permissions")
                if isinstance(permissions, list):
                    required_roles = permissions
                else:
                    perm = transition.get("required_permission")
                    required_roles = [perm] if perm else []
            else:
                required_roles = ["member"]

        # Empty permissions list = no permission required (system transitions)
        if not required_roles:
            return True

        # Project creators have implicit permission (consistent with ViewSet access)
        if user.id == instance.project.creator_id:
            return True

        # Check membership for non-creators
        membership = ProjectMembership.objects.filter(
            user=user, project=instance.project, deleted_at__isnull=True
        ).first()
        if membership and membership.role in required_roles:
            return True

        # Hierarchy: Club Admin can act on child team workflows
        if instance.project.parent_project_id:
            parent_membership = ProjectMembership.objects.filter(
                user=user,
                project_id=instance.project.parent_project_id,
                deleted_at__isnull=True,
            ).first()
            if parent_membership and parent_membership.role in required_roles:
                return True

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
        try:
            from src.workflows.tasks import execute_workflow_hooks

            # Collect hook keys from transition
            hook_keys = []

            # on_exit hooks from old state
            if "from_state" in transition:
                hook_keys.append(transition["from_state"])

            # on_transition hooks from action
            if "action" in transition:
                hook_keys.append(transition["action"])

            # on_enter hooks from new state
            if "to_state" in transition:
                hook_keys.append(transition["to_state"])

            if not hook_keys:
                return None

            # Execute hooks asynchronously
            result = execute_workflow_hooks.delay(
                instance_id=instance.id,
                hook_type="async",
                hook_keys=hook_keys,
            )

            logger.info(
                "Scheduled async workflow hooks",
                extra={
                    "instance_id": instance.id,
                    "task_id": str(result.id),
                    "hook_keys": hook_keys,
                },
            )

            return result.id

        except ImportError:
            logger.warning("B15 Tasks not available - skipping async hooks")
            return None
        except Exception as e:
            logger.error(
                "Failed to schedule async hooks",
                extra={"instance_id": instance.id, "error": str(e)},
            )
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
        try:
            from audit.api import audit_log

            metadata = {
                "workflow_instance_id": str(instance.id),
                "workflow_name": instance.workflow.name,
                "workflow_version": instance.workflow.version,
                "current_state": instance.current_state,
                "content_type": str(instance.content_type) if instance.content_type else None,
                "object_id": instance.object_id,
            }

            if extra_data:
                metadata.update(extra_data)

            audit_log.record(
                event_type=f"workflow.{event_type}",
                user=user,
                organization=instance.project.organisation if instance.project else None,
                project=instance.project,
                metadata=metadata,
            )

        except ImportError:
            # B09 not available - fallback to standard logging
            logger.info(
                f"Workflow {event_type}",
                extra={
                    "instance_id": str(instance.id),
                    "workflow": instance.workflow.name,
                    "user_id": user.id if user else None,
                    "metadata": extra_data or {},
                },
            )
        except Exception as e:
            # Never fail workflow execution due to audit logging failure
            logger.error(
                f"Failed to log audit event for workflow {event_type}: {e}",
                extra={"instance_id": str(instance.id), "error": str(e)},
            )

---
work_package_id: "WP03"
subtasks: ["T019", "T020", "T021", "T022", "T023", "T024", "T025", "T026", "T027", "T028", "T029", "T030", "T031"]
title: "Workflow Engine Service Layer"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "39876"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-09T20:52:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39876"
    action: "Started implementation"
  - timestamp: "2026-02-09T21:15:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39876"
    action: "Implementation complete, tests passing, moved to for_review"
---

# Work Package Prompt: WP03 – Workflow Engine Service Layer

## Objectives

**Goal**: Implement core business logic for state machine execution, validation, hook firing.

**Success Criteria**:
- Can create workflow instances programmatically
- Can execute transitions with permission checks
- Validators execute correctly (raise ValidationError on failure)
- Hooks fire in correct order (on_exit → on_transition → on_enter)
- Optimistic locking prevents concurrent modification
- Audit logging integration works
- Async hooks store task_id in history

## Context

**Supporting Documents**:
- Research: `kitty-specs/048-workflow-engine-state/research.md` (Decision 1: hybrid pattern, Decision 5: audit requirements)
- Spec: FR-011 through FR-025 (state transitions, hooks, integrations)

**Key Design Decisions**:
- Service layer is stateless (no instance variables)
- Use @transaction.atomic for consistency
- Permission resolution: ProjectPermissionOverride → template default
- Async hooks don't block transitions (fire-and-forget)

## Core Implementation

### WorkflowEngine Service Class

**File**: `src/workflows/services/engine.py`

```python
"""Workflow state machine engine."""
from typing import Optional
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from workflows.models import WorkflowTemplate, WorkflowInstance, TransitionHistory
from workflows.registry import ValidatorRegistry, HookRegistry
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class WorkflowEngine:
    """Stateless workflow state machine execution engine."""

    def __init__(self, validator_registry=None, hook_registry=None):
        """Initialize with optional registry instances (for testing)."""
        self.validator_registry = validator_registry or ValidatorRegistry
        self.hook_registry = hook_registry or HookRegistry

    def create_instance(
        self,
        workflow: WorkflowTemplate,
        project,
        content_object,
        user: User,
        context: dict = None
    ) -> WorkflowInstance:
        """Create workflow instance with initial state snapshot."""
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
            created_by=user
        )

        logger.info(
            "Created workflow instance",
            extra={
                "instance_id": instance.id,
                "workflow": workflow.name,
                "state": initial_state,
                "user": user.id
            }
        )

        # Log to B09 Audit
        self._log_audit_event(instance, "workflow_created", user)

        return instance

    def get_available_actions(
        self,
        instance: WorkflowInstance,
        user: User
    ) -> list[dict]:
        """Return list of actions user can execute from current state."""
        transitions = instance.workflow_snapshot.get('transitions', [])
        available = []

        for transition in transitions:
            if transition['from_state'] == instance.current_state:
                # Check permission
                if self._check_permission(instance, transition['action'], user):
                    available.append({
                        'action': transition['action'],
                        'to_state': transition['to_state'],
                        'required_permission': transition.get('required_permission', 'member')
                    })

        return available

    @transaction.atomic
    def execute_transition(
        self,
        instance: WorkflowInstance,
        action: str,
        user: User,
        comment: str = "",
        context_updates: dict = None
    ) -> TransitionHistory:
        """Execute state transition with validation and hooks."""
        # Lock instance for update (optimistic locking)
        instance = WorkflowInstance.objects.select_for_update().get(
            id=instance.id
        )

        # Find transition
        transition = self._get_transition(instance, action)
        if not transition:
            raise ValidationError(f"Action '{action}' not found in workflow")

        # Validate current state
        if transition['from_state'] != instance.current_state:
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
        self._execute_hooks('on_exit', instance.current_state, instance, transition)

        # Record history
        task_id = None
        if 'on_transition' in transition.get('hooks', {}):
            task_id = self._execute_async_hooks(instance, transition)

        history = TransitionHistory.objects.create(
            instance=instance,
            from_state=instance.current_state,
            to_state=transition['to_state'],
            action=action,
            actor=user,
            comment=comment,
            task_id=task_id,
            context_snapshot=instance.context.copy()
        )

        # Update state
        old_state = instance.current_state
        instance.current_state = transition['to_state']
        instance.version += 1
        instance.save()

        # Execute hooks: on_transition, on_enter
        self._execute_hooks('on_transition', action, instance, transition)
        self._execute_hooks('on_enter', transition['to_state'], instance, transition)

        logger.info(
            "Executed transition",
            extra={
                "instance_id": instance.id,
                "action": action,
                "from_state": old_state,
                "to_state": instance.current_state,
                "user": user.id
            }
        )

        # Audit log
        self._log_audit_event(instance, f"transition_{action}", user, {
            "from_state": old_state,
            "to_state": instance.current_state
        })

        return history

    def _get_transition(self, instance: WorkflowInstance, action: str) -> Optional[dict]:
        """Get transition definition by action."""
        transitions = instance.workflow_snapshot.get('transitions', [])
        for t in transitions:
            if t['action'] == action:
                return t
        return None

    def _check_permission(
        self,
        instance: WorkflowInstance,
        action: str,
        user: User
    ) -> bool:
        """Check if user has permission to execute action."""
        from workflows.models import ProjectPermissionOverride
        from projects.models import Membership

        # Get required roles (override or default)
        override = ProjectPermissionOverride.objects.filter(
            project=instance.project,
            workflow=instance.workflow,
            action_name=action
        ).first()

        if override:
            required_roles = override.required_roles
        else:
            transition = self._get_transition(instance, action)
            required_roles = [transition.get('required_permission', 'member')]

        # Check membership
        try:
            membership = Membership.objects.get(
                user=user,
                project=instance.project
            )
            return membership.role in required_roles
        except Membership.DoesNotExist:
            return False

    def _execute_validators(self, instance: WorkflowInstance, transition: dict):
        """Execute all registered validators for transition."""
        validator_names = transition.get('validators', [])

        for validator_name in validator_names:
            try:
                validator = self.validator_registry.get(validator_name)
                validator(instance, transition)
            except Exception as e:
                logger.warning(
                    f"Validator '{validator_name}' failed",
                    extra={"instance_id": instance.id, "error": str(e)}
                )
                raise ValidationError(f"Validator '{validator_name}': {str(e)}")

    def _execute_hooks(
        self,
        hook_type: str,
        key: str,
        instance: WorkflowInstance,
        transition: dict
    ):
        """Execute synchronous hooks."""
        hooks = self.hook_registry.get_hooks(hook_type, key)

        for hook in hooks:
            try:
                hook(instance, transition)
            except Exception as e:
                logger.error(
                    f"Hook {hook_type}/{key} failed",
                    extra={"instance_id": instance.id, "error": str(e)}
                )
                # Don't block transition on hook failure

    def _execute_async_hooks(
        self,
        instance: WorkflowInstance,
        transition: dict
    ) -> Optional[str]:
        """Execute async hooks via Celery, return task_id."""
        # B15 Tasks integration will be added in WP13
        # For now, return None
        return None

    def _log_audit_event(
        self,
        instance: WorkflowInstance,
        event_type: str,
        user: User,
        extra_data: dict = None
    ):
        """Log to B09 Audit."""
        # B09 Audit integration will be added in WP13
        pass
```

## Test Requirements

**File**: `tests/workflows/unit/test_engine.py`

Test scenarios:
- create_instance() creates with initial state
- execute_transition() succeeds for valid transition
- execute_transition() raises ValidationError for invalid transition
- execute_transition() raises PermissionDenied for unauthorized user
- Validators are called and can block transitions
- Hooks execute in correct order
- Optimistic locking prevents concurrent updates

## Definition of Done

- [ ] WorkflowEngine class implemented
- [ ] All public methods have type hints and docstrings
- [ ] Optimistic locking works (version field)
- [ ] Permission checks integrate with B07 Projects
- [ ] Structured logging includes context
- [ ] Unit tests pass with >80% coverage

## Activity Log

- 2026-02-09T18:18:50Z – system – lane=planned – Prompt created

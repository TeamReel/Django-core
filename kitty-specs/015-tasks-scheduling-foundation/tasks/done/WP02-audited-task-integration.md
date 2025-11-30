---
lane: "done"
agent: "copilot-reviewer"
assignee: "copilot"
shell_pid: "38532"
review_status: "approved"
reviewed_by: "copilot-reviewer"
---
# Work Package 02: AuditedTask Base Class & B09 Integration

```yaml
work_package_id: WP02
lane: planned
feature: B15 Tasks & Scheduling Foundation
priority: P2
depends_on:
  - WP01
subtasks:
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
history:
  - 2025-11-30: Created from task breakdown
```

---

## Objective

Implement `AuditedTask` base class that automatically creates B09 audit events for task execution lifecycle (started, completed, failed). Developers opt-in to audit logging by inheriting from this base class for sensitive operations.

**Success Criteria**:
- `AuditedTask` base class inherits from `celery.Task`
- Lifecycle hooks (before_start, on_success, on_failure) create audit events
- Context extraction helpers parse `user_id`, `org_id`, `request_id` from kwargs
- Documentation explains when and how to use audited tasks
- Audit events created do not block task execution if audit system unavailable

---

## Context

**Relevant Specifications**:
- [spec.md](../../spec.md): User Story 3 (Audit Task Execution), FR-004, FR-009
- [plan.md](../../plan.md): Decision 3 (AuditedTask base class with opt-in inheritance), Decision 4 (Explicit context propagation)
- [research.md](../../research.md): Audit integration pattern, context propagation
- [contracts/task-patterns.md](../../contracts/task-patterns.md): Audited Task pattern, context propagation examples

**Planning Decisions Applied**:
1. **Opt-In Auditing**: Developers explicitly inherit from `AuditedTask` for sensitive operations
2. **Explicit Context**: Task kwargs must include `user_id`, `org_id`, `request_id` for audit trail
3. **Celery Signals**: Use lifecycle hooks (before_start, on_success, on_failure) for audit events
4. **Graceful Degradation**: Audit failures should not prevent task execution

**Integration Points**:
- B09 Audit System: Create `AuditEvent` records for task lifecycle
- B01 Settings: No additional settings needed (uses existing audit configuration)

---

## Detailed Guidance

### T009: Create AuditedTask Base Class
**Objective**: Implement custom Task subclass with audit hooks

**Steps**:
1. Create `src/tasks/base.py`:
```python
"""
Custom Celery task base classes for Django Core-App.

Provides AuditedTask for automatic audit logging integration with B09.
"""
from celery import Task
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class AuditedTask(Task):
    """
    Base class for tasks requiring audit trail integration with B09.

    Usage:
        @shared_task(base=AuditedTask)
        def sensitive_operation(user_id, org_id, **kwargs):
            # Task implementation
            pass

    Requirements:
        - Task kwargs MUST include 'user_id' for audit trail
        - Task kwargs SHOULD include 'org_id' for multi-tenancy
        - Task kwargs MAY include 'request_id' for request tracing

    Lifecycle Events:
        - task.started: Created when task begins execution
        - task.completed: Created when task succeeds
        - task.failed: Created when task fails after all retries
    """

    # Abstract method stubs (implemented in T010-T012)
    def before_start(self, task_id: str, args: tuple, kwargs: dict) -> None:
        """Hook called before task execution begins."""
        pass

    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
        """Hook called when task completes successfully."""
        pass

    def on_failure(
        self,
        exc: Exception,
        task_id: str,
        args: tuple,
        kwargs: dict,
        einfo: Any
    ) -> None:
        """Hook called when task fails after all retries."""
        pass
```

2. Export in `src/tasks/__init__.py`:
```python
"""Asynchronous task execution and periodic scheduling infrastructure (B15)"""
from .celery import app as celery_app
from .base import AuditedTask

__all__ = ['celery_app', 'AuditedTask']
```

**Reference**: [task-patterns.md](../../contracts/task-patterns.md) Audited Task section

---

### T010: Implement before_start Hook
**Objective**: Create audit event when task begins execution

**Steps**:
1. Implement `before_start` method in `AuditedTask`:
```python
def before_start(self, task_id: str, args: tuple, kwargs: dict) -> None:
    """
    Log task start to B09 audit system.

    Creates 'task.started' audit event with:
    - Task name and ID
    - User/org context from kwargs
    - Truncated args for security (first 3 only)
    """
    try:
        from audit.models import AuditEvent

        user_id = kwargs.get('user_id')
        org_id = kwargs.get('org_id')
        request_id = kwargs.get('request_id')

        # Truncate args to prevent sensitive data leakage
        safe_args = list(args)[:3] if args else []

        # Create audit event
        AuditEvent.objects.create(
            event_type='task.started',
            user_id=user_id,
            organisation_id=org_id,
            metadata={
                'task_id': task_id,
                'task_name': self.name,
                'request_id': request_id,
                'args_count': len(args),
                'args_preview': safe_args,
            }
        )
        logger.debug(
            f"Audit event 'task.started' created for task {self.name} "
            f"(task_id={task_id}, user_id={user_id})"
        )

    except Exception as exc:
        # Log error but don't block task execution
        logger.error(
            f"Failed to create audit event for task start: {exc}",
            exc_info=True,
            extra={'task_id': task_id, 'task_name': self.name}
        )
```

**Security Notes**:
- Only log first 3 args to prevent sensitive data exposure
- Never log full kwargs (may contain passwords, tokens)
- Graceful degradation if audit system unavailable

---

### T011: Implement on_success Hook
**Objective**: Create audit event when task completes successfully

**Steps**:
1. Implement `on_success` method in `AuditedTask`:
```python
def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
    """
    Log successful task completion to B09 audit system.

    Creates 'task.completed' audit event with:
    - Task name and ID
    - User/org context from kwargs
    - Execution duration (if available)
    """
    try:
        from audit.models import AuditEvent

        user_id = kwargs.get('user_id')
        org_id = kwargs.get('org_id')
        request_id = kwargs.get('request_id')

        # Create audit event
        AuditEvent.objects.create(
            event_type='task.completed',
            user_id=user_id,
            organisation_id=org_id,
            metadata={
                'task_id': task_id,
                'task_name': self.name,
                'request_id': request_id,
                'success': True,
            }
        )
        logger.debug(
            f"Audit event 'task.completed' created for task {self.name} "
            f"(task_id={task_id}, user_id={user_id})"
        )

    except Exception as exc:
        # Log error but don't block task
        logger.error(
            f"Failed to create audit event for task success: {exc}",
            exc_info=True,
            extra={'task_id': task_id, 'task_name': self.name}
        )
```

**Note**: Do not log task return value (`retval`) as it may contain sensitive data.

---

### T012: Implement on_failure Hook
**Objective**: Create audit event when task fails after all retries

**Steps**:
1. Implement `on_failure` method in `AuditedTask`:
```python
def on_failure(
    self,
    exc: Exception,
    task_id: str,
    args: tuple,
    kwargs: dict,
    einfo: Any
) -> None:
    """
    Log task failure to B09 audit system.

    Creates 'task.failed' audit event with:
    - Task name and ID
    - User/org context from kwargs
    - Error type and message (truncated for security)
    """
    try:
        from audit.models import AuditEvent

        user_id = kwargs.get('user_id')
        org_id = kwargs.get('org_id')
        request_id = kwargs.get('request_id')

        # Truncate error message to prevent sensitive data leakage
        error_msg = str(exc)[:200] if exc else 'Unknown error'

        # Create audit event
        AuditEvent.objects.create(
            event_type='task.failed',
            user_id=user_id,
            organisation_id=org_id,
            metadata={
                'task_id': task_id,
                'task_name': self.name,
                'request_id': request_id,
                'error_type': exc.__class__.__name__,
                'error_message': error_msg,
                'success': False,
            }
        )
        logger.warning(
            f"Audit event 'task.failed' created for task {self.name} "
            f"(task_id={task_id}, user_id={user_id}, error={error_msg})"
        )

    except Exception as audit_exc:
        # Log error but don't interfere with task failure handling
        logger.error(
            f"Failed to create audit event for task failure: {audit_exc}",
            exc_info=True,
            extra={'task_id': task_id, 'task_name': self.name}
        )
```

**Security Notes**:
- Truncate error messages to 200 chars max
- Log error type for debugging without exposing stack traces
- Don't log full traceback (may contain code paths, variable values)

---

### T013: Add Context Extraction Helpers
**Objective**: Provide utility functions for consistent context handling

**Steps**:
1. Add helper functions to `src/tasks/base.py`:
```python
def extract_audit_context(kwargs: dict) -> dict:
    """
    Extract audit context fields from task kwargs.

    Args:
        kwargs: Task keyword arguments

    Returns:
        Dictionary with user_id, org_id, request_id (if present)

    Example:
        >>> extract_audit_context({'user_id': 123, 'org_id': 456, 'format': 'csv'})
        {'user_id': 123, 'org_id': 456, 'request_id': None}
    """
    return {
        'user_id': kwargs.get('user_id'),
        'org_id': kwargs.get('org_id'),
        'request_id': kwargs.get('request_id'),
    }


def validate_audit_context(kwargs: dict, require_user: bool = True) -> tuple[bool, Optional[str]]:
    """
    Validate that required audit context fields are present.

    Args:
        kwargs: Task keyword arguments
        require_user: Whether user_id is required (default True)

    Returns:
        Tuple of (is_valid, error_message)

    Example:
        >>> validate_audit_context({'org_id': 1}, require_user=True)
        (False, 'Missing required field: user_id')
        >>> validate_audit_context({'user_id': 1}, require_user=True)
        (True, None)
    """
    if require_user and not kwargs.get('user_id'):
        return False, 'Missing required field: user_id for audited task'

    return True, None
```

2. Optionally, add validation to `AuditedTask.before_start`:
```python
def before_start(self, task_id: str, args: tuple, kwargs: dict) -> None:
    # Validate context (warning only, don't block execution)
    is_valid, error_msg = validate_audit_context(kwargs, require_user=True)
    if not is_valid:
        logger.warning(
            f"AuditedTask {self.name} called without proper context: {error_msg}",
            extra={'task_id': task_id, 'kwargs_keys': list(kwargs.keys())}
        )

    # ... rest of before_start implementation
```

**Reference**: [plan.md](../../plan.md) Decision 4 (Explicit context propagation)

---

### T014: Document AuditedTask Usage
**Objective**: Create comprehensive guide for developers

**Steps**:
1. Create `docs/tasks/auditing.md`:
```markdown
# Task Auditing with AuditedTask

## Overview

The `AuditedTask` base class automatically creates B09 audit events for task execution lifecycle. Use this for sensitive operations requiring audit trail (data exports, bulk updates, permission changes).

## When to Use AuditedTask

**Use AuditedTask when**:
- Task processes user data (exports, reports)
- Task modifies permissions or access controls
- Task performs bulk operations affecting multiple records
- Compliance requires audit trail for operation

**Don't use AuditedTask when**:
- Task is routine background operation (cache warming, cleanup)
- Task already logged via application-level audit (HTTP request logs)
- Task runs too frequently (would flood audit logs)

## Basic Usage

```python
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv', request_id=None):
    """
    Export user data with audit logging.

    Args:
        user_id: Required - user triggering the export
        org_id: Required - organisation context
        format: Export format (csv, json)
        request_id: Optional - for request tracing
    """
    # Implementation here
    return {'status': 'completed', 'format': format}
```

**Triggering from View**:
```python
from tasks.examples.export_user_data import export_user_data

def export_view(request):
    result = export_user_data.delay(
        user_id=request.user.id,
        org_id=request.user.organisation_id,
        format=request.POST.get('format', 'csv'),
        request_id=request.META.get('HTTP_X_REQUEST_ID')
    )
    return JsonResponse({'task_id': result.id})
```

## Required Context Fields

AuditedTask expects these fields in task kwargs:

- **user_id** (required): ID of user who triggered the task
- **org_id** (recommended): Organisation ID for multi-tenancy
- **request_id** (optional): Request ID for distributed tracing

**Warning**: Forgetting `user_id` will log a warning but won't block execution.

## Audit Events Created

### task.started
Created when task begins execution:
```python
{
    'event_type': 'task.started',
    'user_id': 123,
    'organisation_id': 456,
    'metadata': {
        'task_id': 'abc-123-def',
        'task_name': 'tasks.examples.export_user_data',
        'request_id': 'req-789',
        'args_count': 2,
        'args_preview': [123, 456],  # First 3 args only
    }
}
```

### task.completed
Created when task succeeds:
```python
{
    'event_type': 'task.completed',
    'user_id': 123,
    'organisation_id': 456,
    'metadata': {
        'task_id': 'abc-123-def',
        'task_name': 'tasks.examples.export_user_data',
        'request_id': 'req-789',
        'success': True,
    }
}
```

### task.failed
Created when task fails after all retries:
```python
{
    'event_type': 'task.failed',
    'user_id': 123,
    'organisation_id': 456,
    'metadata': {
        'task_id': 'abc-123-def',
        'task_name': 'tasks.examples.export_user_data',
        'request_id': 'req-789',
        'error_type': 'ConnectionError',
        'error_message': 'Failed to connect to external API...',  # Truncated
        'success': False,
    }
}
```

## Security Considerations

### Data Sanitization
- Only first 3 args logged (to prevent sensitive data exposure)
- Error messages truncated to 200 chars
- Task return values NOT logged (may contain sensitive data)
- Full kwargs NOT logged (may contain passwords, tokens)

### Graceful Degradation
If B09 audit system is unavailable:
- Error logged to application logs
- Task execution continues normally
- Audit event creation failure does not block task

## Querying Audit Events

```python
from audit.models import AuditEvent

# Find all executions of a specific task
events = AuditEvent.objects.filter(
    metadata__task_name='tasks.examples.export_user_data'
).order_by('-created_at')

# Find failed tasks for a user
failed = AuditEvent.objects.filter(
    event_type='task.failed',
    user_id=123
)

# Track a specific task execution
task_events = AuditEvent.objects.filter(
    metadata__task_id='abc-123-def'
).order_by('created_at')
```

## Testing Audited Tasks

```python
import pytest
from tasks.examples.export_user_data import export_user_data
from audit.models import AuditEvent

@pytest.mark.django_db
def test_audited_task_creates_events():
    # Execute task synchronously
    result = export_user_data.apply(kwargs={
        'user_id': 1,
        'org_id': 2,
        'format': 'csv'
    })

    # Verify audit events created
    events = AuditEvent.objects.filter(
        event_type__in=['task.started', 'task.completed']
    )
    assert events.count() == 2

    # Verify metadata
    started = events.get(event_type='task.started')
    assert started.metadata['task_name'] == 'tasks.examples.export_user_data'
    assert started.user_id == 1
```

## Best Practices

1. **Always pass user_id**: Even for system tasks, use service account ID
2. **Use request_id for tracing**: Pass HTTP request ID through to task
3. **Don't log sensitive data in args**: Use separate secure storage for sensitive inputs
4. **Monitor audit log volume**: Too many AuditedTasks can overwhelm audit system
5. **Test audit integration**: Verify audit events created in tests

## Troubleshooting

**Warning: "Missing required field: user_id"**
- Task called without user_id in kwargs
- Add user_id when triggering task: `task.delay(user_id=123, ...)`

**Audit events not appearing**
- Check B09 audit system is configured and running
- Verify task completes (check with task.status)
- Check application logs for audit creation errors

**Too many audit events**
- Consider using regular Task for routine operations
- Batch operations instead of auditing each item
- Use sampling for high-frequency tasks
```

**Reference**: [contracts/task-patterns.md](../../contracts/task-patterns.md) Audited Task pattern

---

## Test Strategy

### Unit Tests (WP07)
- Test AuditedTask lifecycle hooks called with correct arguments
- Test context extraction helpers
- Test graceful degradation when audit system unavailable
- Mock AuditEvent.objects.create to test without database

### Integration Tests (WP07)
- Create test task using AuditedTask base
- Execute task and verify audit events created
- Test with missing context (verify warnings logged)
- Test task failure creates 'task.failed' event

### Manual Validation
- Create example audited task
- Trigger task with context
- Query AuditEvent model for lifecycle events
- Verify metadata complete and accurate

---

## Definition of Done

- [ ] `AuditedTask` base class created in `src/tasks/base.py`
- [ ] `before_start` hook creates 'task.started' audit event
- [ ] `on_success` hook creates 'task.completed' audit event
- [ ] `on_failure` hook creates 'task.failed' audit event
- [ ] Context extraction helpers implemented and documented
- [ ] Security measures in place (arg truncation, error message truncation)
- [ ] Graceful degradation if audit system unavailable
- [ ] Documentation created: `docs/tasks/auditing.md`
- [ ] AuditedTask exported in `src/tasks/__init__.py`
- [ ] Example usage patterns documented with code samples

---

## Dependencies & Risks

**Depends On**:
- WP01 (Celery app must be configured)
- B09 Audit System (AuditEvent model must exist)

**Blocks**:
- WP04 (Example Tasks - needs AuditedTask for examples)
- WP07 (Testing - needs AuditedTask for audit integration tests)

**Risks**:
1. **Audit system unavailable during task execution**
   - Mitigation: Wrap audit event creation in try/except
   - Log errors but don't block task execution
   - Document expected behavior

2. **Sensitive data in task arguments**
   - Mitigation: Only log first 3 args
   - Never log full kwargs or return values
   - Document best practices for argument handling

3. **Audit log flooding**
   - Mitigation: Document when NOT to use AuditedTask
   - Recommend sampling for high-frequency tasks
   - Consider rate limiting in future enhancement

4. **B09 audit schema changes**
   - Mitigation: Use clear interface for event creation
   - Add integration tests to catch breaking changes
   - Document expected audit event structure

---

## Implementation Checklist

**Before Starting**:
- [ ] Verified WP01 complete (Celery app configured)
- [ ] Confirmed B09 AuditEvent model exists and is accessible

**During Implementation**:
- [ ] Added type hints to all functions
- [ ] Included comprehensive docstrings
- [ ] Used logging for errors and warnings
- [ ] Applied security measures (data truncation)

**After Implementation**:
- [ ] Tested manually with example task
- [ ] Verified audit events created in database
- [ ] Tested graceful degradation (disable audit temporarily)
- [ ] Committed with message: "B15/WP02: AuditedTask base class with B09 integration"

---

## Notes for Reviewer

- Check that audit event creation does not block task execution if audit system fails
- Verify sensitive data sanitization (args truncated, error messages limited)
- Confirm context extraction follows explicit propagation pattern (no thread-local magic)
- Validate documentation explains when to use vs when to skip AuditedTask
- Test with B09 unavailable to ensure graceful degradation works

## Activity Log

- 2025-11-30T18:06:17Z – copilot – shell_pid=38532 – lane=doing – Started WP02 implementation - AuditedTask base class and B09 integration
- 2025-11-30T18:13:05Z – copilot – shell_pid=38532 – lane=for_review – WP02 complete: AuditedTask + B09 integration, all subtasks done
- 2025-11-30T18:15:34Z – copilot-reviewer – shell_pid=38532 – lane=done – Approved: All DoD items met, security measures excellent, comprehensive docs

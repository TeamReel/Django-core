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
        'error_message': 'Failed to connect to external API...',  # Truncated to 200 chars
        'success': False,
    }
}
```

## Context Extraction Helpers

Use helper functions for consistent context handling:

```python
from tasks.base import extract_audit_context, validate_audit_context

# Extract context from kwargs
context = extract_audit_context(kwargs)
# Returns: {'user_id': 123, 'org_id': 456, 'request_id': 'req-789'}

# Validate required fields
is_valid, error_msg = validate_audit_context(kwargs, require_user=True)
if not is_valid:
    raise ValueError(f"Invalid context: {error_msg}")
```

## Security Considerations

### Data Sanitization
- Only first 3 positional args are logged (args_preview)
- Keyword arguments are NOT logged (may contain sensitive data)
- Error messages truncated to 200 characters
- Task return values are NOT logged

### Graceful Degradation
If audit system (B09) is unavailable:
- Error is logged to application logs
- Task execution continues normally
- Operations are not blocked by audit failures

## Best Practices

### 1. Always Pass Context
```python
# Good: Explicit context
export_data.delay(user_id=request.user.id, org_id=request.user.organisation_id)

# Bad: Missing context (will generate warning)
export_data.delay()
```

### 2. Use Descriptive Task Names
```python
# Good: Clear what operation is being audited
@shared_task(base=AuditedTask, name='users.export_personal_data')
def export_user_data(...): pass

# Bad: Generic name doesn't help audit trail
@shared_task(base=AuditedTask)
def process(...): pass
```

### 3. Document Why Task Is Audited
```python
@shared_task(base=AuditedTask)
def delete_user_account(user_id, org_id):
    """
    Permanently delete user account and associated data.

    This task uses AuditedTask because:
    - Operation is irreversible
    - GDPR requires audit trail for data deletion
    - Critical for compliance investigations
    """
    pass
```

### 4. Don't Audit High-Frequency Tasks
```python
# Bad: This will create 1000s of audit events per day
@shared_task(base=AuditedTask)
def check_cache_validity(): pass

# Good: Use regular Task for routine operations
@shared_task
def check_cache_validity(): pass
```

## Querying Audit Events

View audit trail for a specific task:

```python
from audit.models import AuditEvent

# Find all events for a task execution
events = AuditEvent.objects.filter(
    metadata__task_id='abc-123-def'
).order_by('timestamp')

# Find all failed tasks for a user
failed_tasks = AuditEvent.objects.filter(
    event_type='task.failed',
    user_id=123
).select_related('user', 'organisation')
```

## Troubleshooting

### Warning: "AuditedTask called without proper context"
**Cause**: Task triggered without `user_id` in kwargs

**Solution**: Always pass user_id when calling .delay()
```python
# Fix
my_task.delay(user_id=request.user.id, ...)
```

### Error: "Failed to create audit event for task start"
**Cause**: B09 audit system unavailable or database issue

**Impact**: Task continues executing (graceful degradation)

**Solution**: Check audit system configuration and database connectivity

### Audit events not appearing in database
**Possible causes**:
1. Task not using `base=AuditedTask`
2. Task triggered without user_id (warning logged but no DB entry)
3. Audit system disabled in settings

**Debug**:
```python
# Check task is using AuditedTask
from myapp.tasks import my_task
print(my_task.__class__.__bases__)  # Should include AuditedTask

# Check audit system is enabled
from django.conf import settings
print(settings.AUDIT_ENABLED)  # Should be True (if B09 has this setting)
```

## Examples

See `src/tasks/examples/export_user_data.py` for a complete example of an audited task with proper context handling.

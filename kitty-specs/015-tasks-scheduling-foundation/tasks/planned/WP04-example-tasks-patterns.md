# Work Package 04: Example Tasks & Patterns

```yaml
work_package_id: WP04
lane: planned
feature: B15 Tasks & Scheduling Foundation
priority: P2
depends_on:
  - WP01
  - WP02
subtasks:
  - T020
  - T021
  - T022
  - T023
  - T024
history:
  - 2025-11-30: Created from task breakdown
```

---

## Objective

Create example tasks demonstrating basic async execution, audited tasks, retry patterns, and integration with existing B09/B12 features. These serve as templates for developers building their own tasks.

**Success Criteria**:
- Simple task example (hello_world) demonstrates basic .delay() invocation
- Audited task example (export_user_data) shows AuditedTask usage with context
- Retry task example (sync_external_api) demonstrates custom retry policies
- Optional B12 integration example shows notification triggering pattern
- All examples include clear docstrings and usage comments

---

## Context

**Relevant Specifications**:
- [spec.md](../../spec.md): User Story 1 (Execute Background Tasks), FR-013 (example tasks)
- [contracts/task-patterns.md](../../contracts/task-patterns.md): All task patterns
- [quickstart.md](../../quickstart.md): Examples referenced in tutorial

**Integration Points**:
- B09 Audit: AuditedTask base class
- B12 Notifications (optional): Example integration if B12 exists

---

## Detailed Guidance

### T020: Create Examples Directory
**Objective**: Set up structure for example tasks

**Steps**:
1. Create directory: `src/tasks/examples/`
2. Create `__init__.py`:
```python
"""
Example tasks demonstrating async execution patterns.

These tasks serve as templates for developers building their own background jobs.
Import and use them as reference implementations.
"""
```

---

### T021: Create Simple Task Example
**Objective**: Basic task with no audit trail

**Steps**:
1. Create `src/tasks/examples/hello_world.py`:
```python
"""Simple example task with no audit trail."""
from celery import shared_task
import time


@shared_task
def hello_world(name: str) -> str:
    """
    Simple task demonstrating basic async execution.

    Usage:
        from tasks.examples.hello_world import hello_world
        result = hello_world.delay('Alice')
        # Returns task ID immediately

        # Check status later
        result.status  # 'PENDING', 'SUCCESS', etc.
        result.result  # 'Hello, Alice!'

    Args:
        name: Name to greet

    Returns:
        Greeting message
    """
    # Simulate some work
    time.sleep(1)
    return f"Hello, {name}!"


@shared_task
def add_numbers(a: int, b: int) -> int:
    """
    Simple math task for testing.

    Usage:
        from tasks.examples.hello_world import add_numbers
        result = add_numbers.delay(5, 3)
        result.get()  # Returns 8
    """
    return a + b
```

**Reference**: [task-patterns.md](../../contracts/task-patterns.md) Basic Task

---

### T022: Create Audited Task Example
**Objective**: Demonstrate AuditedTask with context propagation

**Steps**:
1. Create `src/tasks/examples/export_user_data.py`:
```python
"""Example audited task for sensitive operations."""
from celery import shared_task
from tasks.base import AuditedTask
import time


@shared_task(base=AuditedTask)
def export_user_data(user_id: int, org_id: int, format: str = 'csv', request_id: str = None) -> dict:
    """
    Export user data with automatic audit logging.

    This task demonstrates:
    - AuditedTask inheritance for B09 integration
    - Explicit context propagation (user_id, org_id, request_id)
    - Structured return value

    Audit events created:
    - task.started: When execution begins
    - task.completed: When export succeeds
    - task.failed: If export fails after all retries

    Usage from view:
        from tasks.examples.export_user_data import export_user_data

        def export_view(request):
            result = export_user_data.delay(
                user_id=request.user.id,
                org_id=request.user.organisation_id,
                format=request.POST.get('format', 'csv'),
                request_id=request.META.get('HTTP_X_REQUEST_ID')
            )
            return JsonResponse({'task_id': result.id})

    Args:
        user_id: Required - user triggering the export (for audit trail)
        org_id: Required - organisation context (for multi-tenancy)
        format: Export format (csv, json, xlsx)
        request_id: Optional - request ID for distributed tracing

    Returns:
        Dictionary with export status and file info
    """
    # Simulate export process
    time.sleep(2)

    # In real implementation, would generate file and store in S3/similar
    file_path = f"/exports/user_{user_id}_{org_id}.{format}"

    return {
        'status': 'completed',
        'user_id': user_id,
        'org_id': org_id,
        'format': format,
        'file_path': file_path,
        'record_count': 150  # Example
    }
```

**Reference**: [task-patterns.md](../../contracts/task-patterns.md) Audited Task

---

### T023: Create Retry Task Example
**Objective**: Demonstrate custom retry policies for flaky operations

**Steps**:
1. Create `src/tasks/examples/sync_external_api.py`:
```python
"""Example task with aggressive retry policy for external APIs."""
from celery import shared_task
from requests.exceptions import RequestException, Timeout
import requests
import time


@shared_task(
    bind=True,  # Provides access to self (task instance)
    max_retries=5,  # Retry up to 5 times
    default_retry_delay=60,  # Start with 1 minute delay
    autoretry_for=(RequestException, Timeout),  # Auto-retry these exceptions
    retry_backoff=True,  # Exponential backoff
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True,  # Add randomness to prevent thundering herd
)
def sync_external_api(self, api_url: str, org_id: int) -> dict:
    """
    Sync data from external API with aggressive retry policy.

    This task demonstrates:
    - Custom retry configuration
    - Exponential backoff (60s, 120s, 240s, 480s, 600s)
    - Manual retry trigger for specific exceptions
    - Jitter to prevent thundering herd

    Retry schedule:
    - Attempt 1: Immediate
    - Attempt 2: After 60s ± jitter
    - Attempt 3: After 120s ± jitter
    - Attempt 4: After 240s ± jitter
    - Attempt 5: After 480s ± jitter
    - Attempt 6: After 600s ± jitter (capped)
    - After 6th failure: Task marked as failed

    Usage:
        from tasks.examples.sync_external_api import sync_external_api
        result = sync_external_api.delay(
            api_url='https://api.example.com/sync',
            org_id=123
        )

    Args:
        api_url: External API endpoint to sync from
        org_id: Organisation ID for data filtering

    Returns:
        Dictionary with sync status and record count

    Raises:
        RequestException: If all retries exhausted
    """
    try:
        # Simulate external API call
        response = requests.get(
            api_url,
            params={'org_id': org_id},
            timeout=10
        )
        response.raise_for_status()

        data = response.json()

        # Process data (example)
        time.sleep(1)

        return {
            'status': 'success',
            'org_id': org_id,
            'records_synced': len(data.get('records', [])),
            'attempt': self.request.retries + 1
        }

    except (RequestException, Timeout) as exc:
        # Log retry attempt
        print(f"Sync failed (attempt {self.request.retries + 1}): {exc}")

        # Celery will auto-retry due to autoretry_for
        # But can manually trigger with custom logic:
        if self.request.retries >= self.max_retries:
            # All retries exhausted
            raise

        # Manual retry (optional, autoretry_for handles this)
        # raise self.retry(exc=exc, countdown=self.default_retry_delay)

        # Re-raise to trigger autoretry_for
        raise
```

**Reference**: [task-patterns.md](../../contracts/task-patterns.md) Custom Retry Policy

---

### T024: Create B12 Integration Example (Optional)
**Objective**: Show notification triggering pattern

**Steps**:
1. Check if B12 notifications exists: `src/notifications/`
2. If exists, create `src/tasks/examples/send_notification.py`:
```python
"""Example task integrating with B12 notifications."""
from celery import shared_task
from tasks.base import AuditedTask


@shared_task(base=AuditedTask)
def send_bulk_notifications(user_ids: list[int], org_id: int, template_id: int, user_id: int) -> dict:
    """
    Send bulk notifications via B12 notification system.

    This task demonstrates:
    - Integration with existing B12 feature
    - Bulk processing pattern (chunking)
    - AuditedTask for sensitive operation
    - Context propagation for audit trail

    Usage:
        from tasks.examples.send_notification import send_bulk_notifications
        result = send_bulk_notifications.delay(
            user_ids=[1, 2, 3, 4, 5],
            org_id=123,
            template_id=456,
            user_id=request.user.id  # For audit
        )

    Args:
        user_ids: List of user IDs to notify
        org_id: Organisation context
        template_id: Notification template ID from B12
        user_id: User triggering the bulk send (for audit)

    Returns:
        Dictionary with send statistics
    """
    from notifications.services import NotificationService  # Example import

    service = NotificationService()
    sent_count = 0
    failed_count = 0

    # Process in chunks to avoid memory issues
    chunk_size = 100
    for i in range(0, len(user_ids), chunk_size):
        chunk = user_ids[i:i+chunk_size]

        for user_id in chunk:
            try:
                service.send(
                    user_id=user_id,
                    template_id=template_id,
                    org_id=org_id
                )
                sent_count += 1
            except Exception as exc:
                print(f"Failed to send notification to user {user_id}: {exc}")
                failed_count += 1

    return {
        'status': 'completed',
        'total': len(user_ids),
        'sent': sent_count,
        'failed': failed_count
    }
```

**Note**: If B12 doesn't exist, skip this task or create a mock example showing the pattern.

**Reference**: [spec.md](../../spec.md) FR-013 (B12 integration example)

---

## Definition of Done

- [ ] Examples directory created: `src/tasks/examples/`
- [ ] Simple task created: `hello_world.py` with basic .delay() pattern
- [ ] Audited task created: `export_user_data.py` with AuditedTask inheritance
- [ ] Retry task created: `sync_external_api.py` with custom retry policy
- [ ] B12 integration example created (or documented as future enhancement)
- [ ] All examples include comprehensive docstrings with usage patterns
- [ ] Examples referenced in quickstart guide (WP06)

---

## Dependencies & Risks

**Depends On**:
- WP01 (Celery app)
- WP02 (AuditedTask base class)

**Blocks**:
- WP06 (Documentation - examples referenced in guides)
- WP07 (Testing - examples used in tests)

**Risks**:
1. **Examples executed accidentally in production**
   - Mitigation: Clear docstrings marking as examples
   - Consider prefixing with "example_" in task names

2. **External API dependencies in examples**
   - Mitigation: Mock external calls or use httpbin.org
   - Document that examples are for reference only

---

## Notes for Reviewer

- Verify examples follow task-patterns.md specifications
- Check docstrings include usage patterns from view/service layer
- Confirm AuditedTask example shows proper context propagation
- Validate retry example demonstrates exponential backoff clearly

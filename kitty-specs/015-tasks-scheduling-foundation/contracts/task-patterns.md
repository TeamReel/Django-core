# Task Execution Patterns
# Feature: B15 Tasks & Scheduling Foundation
# Date: 2025-11-30

# This document describes the programmatic interface patterns for defining and
# triggering async tasks. This is NOT a REST API - tasks are triggered via
# Python code, not HTTP endpoints.

## Task Definition Pattern

### Basic Task
```python
from celery import shared_task

@shared_task
def send_email(recipient, subject, body):
    """
    Simple task with no audit trail.
    Use for routine background operations.
    """
    # Implementation
    pass
```

### Audited Task
```python
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv'):
    """
    Audited task for sensitive operations.
    Automatically creates audit events in B09.

    Args:
        user_id: Required for audit trail
        org_id: Required for multi-tenancy
        format: Export format (csv, json)
    """
    # Implementation
    pass
```

### Task with Custom Retry Policy
```python
from celery import shared_task

@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,  # 1 minute
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,  # 10 minutes max
)
def sync_external_data(self, api_url, org_id):
    """
    Task with aggressive retry policy for flaky external APIs.
    """
    try:
        # Implementation
        pass
    except Exception as exc:
        # Can also manually trigger retry
        raise self.retry(exc=exc, countdown=120)
```

## Task Invocation Patterns

### Immediate Async Execution
```python
# Simple invocation
result = send_email.delay('user@example.com', 'Hello', 'Body text')

# With context propagation (for audited tasks)
result = export_user_data.delay(
    user_id=request.user.id,
    org_id=request.user.organisation_id,
    format='csv'
)

# Get task ID for status tracking
task_id = result.id  # UUID string
```

### Deferred Execution (ETA)
```python
from datetime import datetime, timedelta

# Execute 1 hour from now
eta = datetime.utcnow() + timedelta(hours=1)
result = send_email.apply_async(
    args=['user@example.com', 'Reminder', 'Don\'t forget!'],
    eta=eta
)

# Execute at specific time
send_time = datetime(2025, 12, 1, 9, 0, 0)  # Dec 1, 9 AM
result = send_email.apply_async(
    args=[...],
    eta=send_time
)
```

### Task Chaining
```python
from celery import chain

# Execute tasks in sequence
workflow = chain(
    fetch_data.s(api_url),
    process_data.s(),
    send_notification.s(user_id=123)
)
result = workflow.apply_async()
```

### Task Groups (Parallel Execution)
```python
from celery import group

# Execute tasks in parallel
job = group(
    send_email.s('user1@example.com', 'Hello', 'Body'),
    send_email.s('user2@example.com', 'Hello', 'Body'),
    send_email.s('user3@example.com', 'Hello', 'Body'),
)
result = job.apply_async()
```

## Status Query Patterns

### Check Task Status
```python
from celery.result import AsyncResult

# Query by task ID
result = AsyncResult(task_id)

# Check status
status = result.status  # 'PENDING', 'STARTED', 'SUCCESS', 'FAILURE', 'RETRY'

# Check if complete
if result.ready():
    print("Task completed")

# Check if successful
if result.successful():
    print("Task succeeded")

# Check if failed
if result.failed():
    print("Task failed")
    print(result.traceback)  # Exception traceback
```

### Wait for Result (Blocking)
```python
try:
    # Block and wait (with timeout)
    result_value = result.get(timeout=10)
    print(f"Task returned: {result_value}")
except TimeoutError:
    print("Task did not complete in 10 seconds")
except Exception as exc:
    print(f"Task failed with: {exc}")
```

### Non-Blocking Status Check
```python
# Just check status without blocking
if result.state == 'PENDING':
    print("Task not started yet")
elif result.state == 'STARTED':
    print("Task is running")
elif result.state == 'SUCCESS':
    print(f"Task completed: {result.result}")
elif result.state == 'FAILURE':
    print(f"Task failed: {result.info}")  # Exception info
```

## Periodic Task Configuration

### Settings-Based Schedule (Baseline)
```python
# In settings/celery.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Run daily at 3 AM
    'cleanup-sessions-daily': {
        'task': 'tasks.maintenance.cleanup_sessions',
        'schedule': crontab(hour=3, minute=0),
        'kwargs': {'days_old': 30},
    },

    # Run every hour
    'sync-external-data-hourly': {
        'task': 'tasks.integrations.sync_data',
        'schedule': crontab(minute=0),  # Every hour at :00
        'kwargs': {'source': 'external_api'},
    },

    # Run every 5 minutes
    'check-alerts-frequent': {
        'task': 'tasks.monitoring.check_alerts',
        'schedule': 300.0,  # 300 seconds = 5 minutes
    },

    # Run on specific days
    'weekly-report': {
        'task': 'tasks.reports.generate_weekly_report',
        'schedule': crontab(hour=9, minute=0, day_of_week='monday'),
    },
}
```

### Crontab Expression Examples
```python
from celery.schedules import crontab

# Every minute
schedule=crontab()

# Every hour at :15
schedule=crontab(minute=15)

# Daily at midnight
schedule=crontab(hour=0, minute=0)

# Every weekday at 9 AM
schedule=crontab(hour=9, minute=0, day_of_week='1-5')

# First day of month at 3 AM
schedule=crontab(hour=3, minute=0, day_of_month=1)

# Every 15 minutes
schedule=crontab(minute='*/15')

# Multiple times per hour
schedule=crontab(minute='0,15,30,45')
```

## Context Propagation Pattern

### View → Task Context Flow
```python
# In Django view
from django.views import View
from tasks.notifications import send_bulk_notifications

class NotificationView(View):
    def post(self, request):
        # Extract context from request
        user_id = request.user.id
        org_id = request.user.organisation_id
        request_id = request.headers.get('X-Request-ID')

        # Pass context explicitly to task
        result = send_bulk_notifications.delay(
            user_id=user_id,
            org_id=org_id,
            request_id=request_id,
            recipient_ids=[1, 2, 3, 4, 5],
            message="Important update"
        )

        return JsonResponse({
            'task_id': result.id,
            'status': 'queued'
        })
```

### Task → Audit Event Context Flow
```python
# In audited task
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def send_bulk_notifications(user_id, org_id, request_id, recipient_ids, message):
    """
    Task receives context as explicit arguments.
    AuditedTask base class automatically emits audit events with this context.
    """
    # Context is available in kwargs for audit events
    # AuditedTask.on_success() will use user_id, org_id from kwargs

    # Perform business logic
    for recipient_id in recipient_ids:
        send_notification(recipient_id, message)

    return {'sent': len(recipient_ids)}
```

## Error Handling Patterns

### Automatic Retry with Backoff
```python
@shared_task(
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_kwargs={'max_retries': 5}
)
def call_external_api(url, data):
    # Automatically retries on ConnectionError/TimeoutError
    # with exponential backoff: 2s, 4s, 8s, 16s, 32s
    response = requests.post(url, json=data)
    return response.json()
```

### Manual Retry Logic
```python
@shared_task(bind=True, max_retries=3)
def process_payment(self, payment_id, amount):
    try:
        # Business logic
        result = payment_api.charge(payment_id, amount)
        return result
    except PaymentDeclinedError:
        # Don't retry declined payments
        raise
    except PaymentAPIError as exc:
        # Retry transient API errors
        raise self.retry(exc=exc, countdown=60)
```

### Fallback on Final Failure
```python
@shared_task(bind=True, max_retries=3)
def send_sms(self, phone, message):
    try:
        sms_provider.send(phone, message)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            # Final retry failed - use fallback
            email_provider.send_sms_fallback(phone, message)
            return {'fallback': 'email'}
        else:
            raise self.retry(exc=exc)
```

## Testing Patterns

### Synchronous Task Execution (Tests)
```python
import pytest
from tasks.notifications import send_email

@pytest.mark.django_db
def test_send_email_task():
    # Execute task synchronously in tests
    result = send_email.apply(args=['test@example.com', 'Subject', 'Body'])

    assert result.successful()
    assert result.result['sent'] == True
```

### Mock Celery in Tests
```python
from unittest.mock import patch

def test_view_triggers_task(client):
    with patch('tasks.notifications.send_email.delay') as mock_task:
        response = client.post('/api/notifications/', {...})

        assert response.status_code == 200
        mock_task.assert_called_once()
```

## Performance Patterns

### Task Chunking for Large Datasets
```python
from celery import group

@shared_task
def process_batch(item_ids):
    """Process a small batch of items."""
    for item_id in item_ids:
        process_item(item_id)

def process_all_items(item_ids, batch_size=100):
    """
    Split large dataset into batches and process in parallel.
    """
    batches = [item_ids[i:i+batch_size] for i in range(0, len(item_ids), batch_size)]
    job = group(process_batch.s(batch) for batch in batches)
    result = job.apply_async()
    return result
```

### Rate Limiting
```python
@shared_task(rate_limit='10/m')  # Max 10 calls per minute
def call_rate_limited_api(endpoint, data):
    # Celery enforces rate limit automatically
    return api_client.call(endpoint, data)
```

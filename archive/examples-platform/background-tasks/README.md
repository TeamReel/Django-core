# Background Tasks Example

A comprehensive example demonstrating Celery task patterns with Django Core-App, including async tasks, scheduled tasks, task chains, and monitoring.

## Overview

This example demonstrates:

- **Async Tasks**: Background task execution with retries and error handling
- **Periodic Tasks**: Scheduled tasks using Celery Beat (cleanup, statistics, health checks)
- **Task Chains**: Multi-step workflows with data passing between tasks
- **Monitoring**: Logging, metrics, and health check patterns
- **Testing**: pytest-celery patterns with eager mode execution

## Prerequisites

- Python 3.12+
- Redis (for production; tests use in-memory broker)
- Familiarity with Django and Celery basics

## Project Structure

```
examples/background-tasks/
├── README.md               # This file
├── pyproject.toml          # Project configuration
├── src/
│   └── email_tasks/
│       ├── __init__.py
│       ├── apps.py         # Django app config
│       ├── models.py       # EmailLog model for tracking
│       ├── tasks.py        # Async and chained tasks
│       └── scheduler.py    # Periodic tasks and schedules
└── tests/
    ├── __init__.py
    ├── conftest.py         # Celery test fixtures
    └── test_email_tasks.py # Comprehensive tests
```

## Setup

### 1. Ensure Core is Available

This example runs as part of the Django Core-App project:

```bash
# From project root
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Install dependencies
pip install -r requirements/local.txt
```

### 2. Start Redis (for non-test usage)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu
```

### 3. Run Migrations

```bash
cd src
python manage.py migrate
```

### 4. Start Celery Worker

```bash
# In one terminal
celery -A config worker -l INFO

# In another terminal (for scheduled tasks)
celery -A config beat -l INFO
```

## Task Patterns

### 1. Basic Async Task with Retries

The simplest pattern - a task that runs in the background with automatic retry on failure:

```python
from email_tasks.tasks import send_welcome_email

# Queue the task for async execution
result = send_welcome_email.delay("user@example.com", "John")

# Optionally wait for result
response = result.get(timeout=30)
# {'status': 'sent', 'email': 'user@example.com', 'log_id': 1}
```

**Key Features**:
- `bind=True` - Access to task instance for retries
- `max_retries=3` - Limit retry attempts
- `retry_backoff=True` - Exponential backoff between retries
- `autoretry_for=(Exception,)` - Automatic retry on exceptions

### 2. Periodic Tasks (Scheduled)

Tasks that run on a schedule using Celery Beat:

```python
# In scheduler.py
@shared_task
def cleanup_old_email_logs(days=30):
    """Clean up logs older than 30 days."""
    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = EmailLog.objects.filter(created_at__lt=cutoff).delete()
    return {"deleted_count": deleted}
```

**Schedule Configuration** (add to settings):
```python
from celery.schedules import crontab
from datetime import timedelta

CELERY_BEAT_SCHEDULE = {
    # Daily at 2 AM
    'cleanup-old-logs': {
        'task': 'email_tasks.scheduler.cleanup_old_email_logs',
        'schedule': crontab(hour=2, minute=0),
    },
    # Every 5 minutes
    'health-check': {
        'task': 'email_tasks.scheduler.email_system_health_check',
        'schedule': timedelta(minutes=5),
    },
}
```

### 3. Task Chains (Workflows)

Execute multiple tasks in sequence, passing results between them:

```python
from email_tasks.tasks import create_email_validation_workflow

# Create a chain: validate -> log -> notify
workflow = create_email_validation_workflow("user@example.com")
result = workflow.apply_async()

# Get the final result
response = result.get(timeout=30)
# {'email': 'user@example.com', 'is_valid': True, 'log_id': 1, 'admin_notified': False}
```

**Chain Implementation**:
```python
from celery import chain

def create_email_validation_workflow(email):
    return chain(
        validate_email.s(email),      # Step 1: Validate format
        log_email_attempt.s(),        # Step 2: Log to database
        notify_admin_invalid_email.s() # Step 3: Alert if invalid
    )
```

### 4. Batch Processing

Process multiple items with progress tracking:

```python
from email_tasks.tasks import send_bulk_emails

recipients = [
    {"email": "user1@example.com", "name": "User 1"},
    {"email": "user2@example.com", "name": "User 2"},
]

result = send_bulk_emails.delay(recipients)

# Check progress
while not result.ready():
    if result.info:
        print(f"Progress: {result.info['current']}/{result.info['total']}")
    time.sleep(1)

# Final result
response = result.get()
# {'total': 2, 'sent': 2, 'failed': 0, 'errors': []}
```

### 5. Health Checks

Monitor your task system health:

```python
from email_tasks.scheduler import email_system_health_check

result = email_system_health_check()
# {
#     'timestamp': '2025-12-05T10:00:00Z',
#     'database_accessible': True,
#     'recent_failures_rate': 2.5,
#     'queue_backlog': 10,
#     'overall_status': 'healthy'
# }
```

## Monitoring

### Celery Flower (Web UI)

Monitor your tasks with Flower:

```bash
pip install flower
celery -A config flower --port=5555
```

Open http://localhost:5555 to see:
- Active tasks
- Task history
- Worker status
- Queue lengths

### Logging

All tasks include structured logging:

```python
logger.info(
    "Sending welcome email",
    extra={
        "email": user_email,
        "task_id": self.request.id,
        "retry_count": self.request.retries,
    },
)
```

### Metrics

For production, integrate with Prometheus:

```python
from prometheus_client import Counter, Histogram

email_tasks_total = Counter(
    'email_tasks_total',
    'Total email tasks',
    ['status']
)

email_task_duration = Histogram(
    'email_task_duration_seconds',
    'Email task duration'
)
```

## Running Tests

### Run All Tests

```bash
# From project root
pytest examples/background-tasks/tests/ -v

# With coverage
pytest examples/background-tasks/tests/ --cov=examples/background-tasks/src/email_tasks
```

### Run Specific Tests

```bash
# Test only the send tasks
pytest examples/background-tasks/tests/ -k "send"

# Test only chains
pytest examples/background-tasks/tests/ -k "workflow or chain"
```

### Test Configuration

Tests use eager mode (synchronous execution) with an in-memory broker:

```python
@pytest.fixture(scope="session")
def celery_config():
    return {
        "broker_url": "memory://",
        "result_backend": "cache+memory://",
        "task_always_eager": True,
    }
```

## Key Patterns to Learn

### 1. Retry Configuration

Configure retries for resilient tasks:

```python
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,       # Exponential backoff
    retry_backoff_max=300,    # Max 5 minutes between retries
    autoretry_for=(Exception,),
)
def my_task(self):
    pass
```

### 2. Task State Updates

Track progress in long-running tasks:

```python
@shared_task(bind=True)
def process_items(self, items):
    for i, item in enumerate(items):
        # Process item...
        self.update_state(
            state='PROGRESS',
            meta={'current': i + 1, 'total': len(items)}
        )
    return {'processed': len(items)}
```

### 3. Error Handling

Handle errors gracefully:

```python
@shared_task(bind=True)
def safe_task(self):
    try:
        # Do work...
        pass
    except RecoverableError as exc:
        # Retry with backoff
        raise self.retry(exc=exc, countdown=60)
    except PermanentError as exc:
        # Log and fail
        logger.error(f"Permanent failure: {exc}")
        return {"status": "failed", "error": str(exc)}
```

### 4. Database Cleanup Pattern

Efficient bulk deletion:

```python
@shared_task
def cleanup_old_records():
    batch_size = 1000
    while True:
        ids = list(
            MyModel.objects.filter(old=True)
            .values_list('id', flat=True)[:batch_size]
        )
        if not ids:
            break
        MyModel.objects.filter(id__in=ids).delete()
```

## Extending This Example

### Add New Task Types

```python
# Callback task (on completion)
from celery import group

@shared_task
def on_all_complete(results):
    """Called when all tasks in a group complete."""
    successful = sum(1 for r in results if r.get('status') == 'success')
    return {'total': len(results), 'successful': successful}

# Usage
tasks = group(
    process_item.s(item) for item in items
)
workflow = tasks | on_all_complete.s()
workflow.apply_async()
```

### Add Rate Limiting

```python
@shared_task(rate_limit='10/m')  # 10 per minute
def rate_limited_task():
    pass
```

### Add Task Priority

```python
# In Celery config
task_routes = {
    'email_tasks.tasks.send_welcome_email': {'queue': 'high_priority'},
    'email_tasks.scheduler.cleanup_*': {'queue': 'low_priority'},
}
```

## Troubleshooting

### Tasks not executing

1. Check Redis is running: `redis-cli ping`
2. Check worker is connected: `celery -A config status`
3. Check task is registered: `celery -A config inspect registered`

### Tasks stuck in pending

1. Check queue length: `celery -A config inspect active`
2. Check for errors in worker logs
3. Verify broker connection

### Periodic tasks not running

1. Ensure Beat is running: `celery -A config beat -l DEBUG`
2. Check schedule configuration in settings
3. Verify `django-celery-beat` migrations are applied

### Memory issues with bulk tasks

1. Use `chunk()` for large datasets
2. Process in batches with commits
3. Clear results with `ignore_result=True`

## See Also

- [Celery Documentation](https://docs.celeryq.dev/)
- [Django-Celery-Beat](https://django-celery-beat.readthedocs.io/)
- [Tasks Foundation (B15)](../../kitty-specs/015-tasks-scheduling-foundation/)
- [Observability (B18)](../../kitty-specs/018-platform-observability-foundation/)
- [CRUD API Example](../crud-api/)

# Tasks Module

Background task processing with Celery for Django Core-App.

## Overview

The `tasks` module provides asynchronous task processing using Celery with Redis as the message broker. It handles background jobs, scheduled tasks, and long-running operations.

**App location**: `src/tasks/`  
**Feature spec**: `kitty-specs/015-tasks-scheduling-foundation/`

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'tasks.apps.TasksConfig',
    'django_celery_beat',
    ...
]

# Celery configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/1'

CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'

# Task settings
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CELERY_BROKER_URL` | Yes | Redis connection for broker |
| `CELERY_RESULT_BACKEND` | No | Redis connection for results |

## Task Types

### Immediate Tasks

```python
from celery import shared_task

@shared_task
def send_welcome_email(user_id: int) -> None:
    """Send welcome email (fire-and-forget)."""
    user = User.objects.get(id=user_id)
    send_email(user.email, 'Welcome!')

# Usage
send_welcome_email.delay(user.id)
```

### Tasks with Results

```python
@shared_task(bind=True)
def generate_report(self, org_id: int) -> dict:
    """Generate org report with progress tracking."""
    org = Organisation.objects.get(id=org_id)
    data = gather_data(org)
    
    # Update progress
    self.update_state(state='PROGRESS', meta={'percent': 50})
    
    report = create_pdf(data)
    return {'url': report.url, 'size': report.size}

# Usage
result = generate_report.delay(org.id)
result.get()  # Wait for result
```

### Scheduled Tasks

```python
# config/celery.py
app.conf.beat_schedule = {
    'cleanup-expired-tokens': {
        'task': 'tasks.cleanup.cleanup_expired_tokens',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'generate-daily-stats': {
        'task': 'tasks.analytics.generate_daily_stats',
        'schedule': crontab(hour=1, minute=0),
    },
}
```

## Retry Configuration

```python
@shared_task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=3600,
    max_retries=5,
)
def reliable_task(self, data_id: int):
    """Task with automatic retries."""
    try:
        process_data(data_id)
    except TransientError:
        raise  # Will retry
    except PermanentError as e:
        # Log and don't retry
        logger.error(f"Permanent failure: {e}")
```

## Queue Routing

```python
# Route tasks to specific queues
CELERY_TASK_ROUTES = {
    'notifications.*': {'queue': 'notifications'},
    'tasks.cleanup.*': {'queue': 'maintenance'},
    '*': {'queue': 'default'},
}

# Run workers per queue
# celery -A config worker -Q notifications --concurrency=4
# celery -A config worker -Q maintenance --concurrency=1
```

## Usage Examples

### Basic Task

```python
from tasks.celery import app

@app.task
def process_upload(file_id: int) -> dict:
    """Process uploaded file."""
    file = UploadedFile.objects.get(id=file_id)
    result = analyze_file(file)
    file.processing_complete = True
    file.save()
    return {'status': 'completed'}

# Invoke
process_upload.delay(file.id)
```

### Task Chains

```python
from celery import chain

# Sequential execution
workflow = chain(
    validate_data.s(file_id),
    transform_data.s(),
    save_results.s(user_id),
)
result = workflow.delay()
```

### Task Groups

```python
from celery import group

# Parallel execution
tasks = group([
    process_item.s(item_id) 
    for item_id in item_ids
])
result = tasks.delay()
```

### Periodic Tasks

```python
from django_celery_beat.models import PeriodicTask, CrontabSchedule

# Create schedule
schedule, _ = CrontabSchedule.objects.get_or_create(
    hour=0, minute=0,  # Midnight
)

# Create periodic task
PeriodicTask.objects.create(
    crontab=schedule,
    name='Nightly cleanup',
    task='tasks.cleanup.cleanup_old_data',
)
```

## Monitoring

### Flower Dashboard

```bash
# Install
pip install flower

# Run
celery -A config flower --port=5555
```

### Prometheus Metrics

```python
from prometheus_client import Counter, Histogram

task_total = Counter(
    'celery_task_total',
    'Total tasks',
    ['task_name', 'status']
)

task_duration = Histogram(
    'celery_task_duration_seconds',
    'Task duration',
    ['task_name']
)
```

### Health Check

```python
from celery import current_app

def celery_health_check():
    """Check Celery worker availability."""
    try:
        result = current_app.control.ping(timeout=5)
        return len(result) > 0
    except Exception:
        return False
```

## Best Practices

### Do's

1. **Pass IDs, not objects**
   ```python
   # Good
   process_user.delay(user.id)
   
   # Bad
   process_user.delay(user)  # Serialization issues
   ```

2. **Make tasks idempotent**
   ```python
   @shared_task
   def process_order(order_id):
       order = Order.objects.get(id=order_id)
       if order.processed:
           return  # Already done
       order.process()
   ```

3. **Set appropriate timeouts**
   ```python
   @shared_task(time_limit=300, soft_time_limit=240)
   def long_running_task():
       pass
   ```

### Don'ts

1. Don't pass large data in task arguments
2. Don't rely on task ordering (unless using chains)
3. Don't use database transactions across task boundaries

## Related Features

- [Notifications](./notifications.md) - Async notification delivery
- [Async Patterns](../architecture/async-patterns.md) - Architecture patterns
- [Observability](../observability.md) - Task monitoring

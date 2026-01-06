# Tasks & Scheduling Infrastructure (B15)

Asynchronous task execution and periodic scheduling foundation for Django Core-App.

## Overview

B15 provides baseline capability for:

- **Background Task Execution**: Offload heavy operations (exports, bulk updates, external API calls) to background workers with automatic retry
- **Periodic Job Scheduling**: Run maintenance tasks (cleanup, sync) on fixed schedules (hourly, daily, cron-style)
- **Audit Integration**: Optional audit logging for sensitive operations via `AuditedTask` base class
- **Health Monitoring**: HTTP endpoint and CLI command for worker health checks

**Technology Stack**:
- Celery 5.3+ for task execution
- Redis for broker and result backend
- celery-beat for periodic scheduling

## Quick Links

- [Quick Start Guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md) - 15-minute getting started
- [Running Workers](running-workers.md) - Local and production deployment
- [Periodic Tasks](periodic-tasks.md) - Scheduling configuration
- [Task Auditing](auditing.md) - AuditedTask usage for sensitive operations
- [Troubleshooting](troubleshooting.md) - Common errors and solutions

## Architecture

```
┌─────────────────┐
│  Django App     │
│  (HTTP Request) │
└────────┬────────┘
         │ .delay()
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Redis Broker   │◄────►│  Celery Worker   │
│  (Task Queue)   │      │  (Executes Tasks)│
└─────────────────┘      └──────────────────┘
         ▲
         │
┌─────────────────┐
│  Celery Beat    │
│  (Scheduler)    │
└─────────────────┘
```

## Core Concepts

### Tasks

Units of work defined as Python functions:

```python
from celery import shared_task

@shared_task
def send_email(recipient, subject, body):
    # Task implementation
    pass
```

Triggered asynchronously:

```python
result = send_email.delay('user@example.com', 'Hello', 'Body')
```

### Periodic Tasks

Tasks scheduled to run automatically:

```python
# config/settings/celery.py
CELERY_BEAT_SCHEDULE = {
    'cleanup-sessions-daily': {
        'task': 'tasks.examples.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
    },
}
```

### AuditedTask

Base class for tasks requiring B09 audit logging:

```python
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv'):
    # Automatically creates audit events
    pass
```

See [auditing.md](auditing.md) for details.

## Integration Points

### B09 Audit Logging
- `AuditedTask` base class creates lifecycle audit events
- Context propagation via explicit kwargs (user_id, org_id)

### B12 Notifications (if exists)
- Example integration in `src/tasks/examples/send_notification.py`
- Bulk notification sending pattern

### B03 Security Baseline
- Health check integration available
- No sensitive data in task logs

### B01 Settings
- Celery configuration in `config/settings/celery.py`
- Environment-based broker URLs

## Getting Started

### 1. Prerequisites

- Redis running locally or accessible via `CELERY_BROKER_URL`
- Python 3.12+ with dependencies installed

### 2. Install Dependencies

```bash
pip install -r requirements/base.txt
```

### 3. Start Worker

```bash
celery -A config worker -l info
```

### 4. Create Your First Task

```python
# myapp/tasks.py
from celery import shared_task

@shared_task
def my_background_task(arg1, arg2):
    # Implementation
    return result
```

### 5. Trigger Task

```python
from myapp.tasks import my_background_task

result = my_background_task.delay(arg1, arg2)
```

See [quickstart guide](../../kitty-specs/015-tasks-scheduling-foundation/quickstart.md) for detailed walkthrough.

## Production Deployment

### Worker Management

- **Systemd**: `docs/deployment/celery-worker.service`
- **Supervisor**: `docs/deployment/supervisor-celery.conf`
- **Docker**: See [running-workers.md](running-workers.md)

### Beat Scheduler

- **Systemd**: `docs/deployment/celery-beat.service`
- **Supervisor**: `docs/deployment/supervisor-celery-beat.conf`

**Critical**: Only ONE beat scheduler per deployment.

### Health Monitoring

HTTP endpoint:
```bash
curl http://localhost:8000/health/tasks/
```

CLI command:
```bash
python manage.py check_workers --exit-code
```

## Best Practices

1. **Use AuditedTask for sensitive operations**: Data exports, permission changes, bulk updates
2. **Pass context explicitly**: Always include `user_id`, `org_id` for audit trail
3. **Set appropriate timeouts**: Default 5 minutes, adjust per task
4. **Configure retry policies**: Use exponential backoff for external API calls
5. **Monitor task execution**: Use health checks and logging
6. **Chunk large operations**: Process in batches to avoid memory issues
7. **Test tasks with .apply()**: Execute synchronously in tests

## Common Patterns

### Retry Pattern

```python
@shared_task(
    bind=True,
    max_retries=5,
    autoretry_for=(RequestException,),
    retry_backoff=True,
)
def flaky_api_call(self, url):
    # Implementation
    pass
```

### Chunking Pattern

```python
@shared_task
def process_large_dataset(item_ids):
    chunk_size = 100
    for i in range(0, len(item_ids), chunk_size):
        chunk = item_ids[i:i+chunk_size]
        # Process chunk
```

### Context Propagation

```python
@shared_task(base=AuditedTask)
def sensitive_operation(user_id, org_id, request_id=None):
    # user_id, org_id, request_id used for audit
    pass

# In view:
result = sensitive_operation.delay(
    user_id=request.user.id,
    org_id=request.user.organisation_id,
    request_id=request.META.get('HTTP_X_REQUEST_ID')
)
```

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for detailed guide.

**Quick Checks**:
- Redis running? `redis-cli ping`
- Worker running? `celery -A config inspect active`
- Task registered? Check worker startup logs
- Broker configured? Check `CELERY_BROKER_URL`

## Further Reading

- [Celery Documentation](https://docs.celeryproject.org/en/stable/)
- [Django Celery Integration](https://docs.celeryproject.org/en/stable/django/first-steps-with-django.html)
- [Task Patterns](../../kitty-specs/015-tasks-scheduling-foundation/contracts/task-patterns.md)

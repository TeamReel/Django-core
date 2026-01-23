# Quickstart: Tasks & Scheduling Foundation
*Feature: B15 Tasks & Scheduling Foundation*
*Target Audience: Developers new to async tasks in Django Core-App*

## Overview

This guide walks you through creating your first async task in under 15 minutes. By the end, you'll have a working background task with retry logic and optional audit logging.

---

## Prerequisites

- Django Core-App development environment set up
- Redis running locally (or accessible via `CELERY_BROKER_URL`)
- Python 3.12+ virtual environment activated

---

## Step 1: Install Dependencies (2 minutes)

Dependencies are already in `requirements/base.txt` after B15 implementation:

```bash
cd django-core-app/
pip install -r requirements/base.txt
```

**What's included**:
- `celery[redis]>=5.3.0` - Task execution framework with Redis support
- `django-celery-beat>=2.5.0` - Periodic task scheduling (optional for baseline)

---

## Step 2: Start Redis (if not running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using system Redis
redis-server
```

Verify Redis is accessible:
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 3: Create Your First Task (5 minutes)

### Option A: Simple Task (No Audit Trail)

Create `src/tasks/examples/hello.py`:

```python
from celery import shared_task
import time

@shared_task
def hello_world(name):
    """
    Simple async task that sleeps for 2 seconds.
    Use for routine background operations.
    """
    time.sleep(2)  # Simulate slow operation
    message = f"Hello, {name}!"
    print(message)
    return message
```

### Option B: Audited Task (With B09 Integration)

Create `src/tasks/examples/export.py`:

```python
from celery import shared_task
from tasks.base import AuditedTask
from django.contrib.auth import get_user_model

User = get_user_model()

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv'):
    """
    Audited task for sensitive data export.
    Automatically creates audit events in B09.

    Args:
        user_id: User requesting export (required for audit)
        org_id: Organisation scope (required for audit)
        format: Export format (csv, json)
    """
    user = User.objects.get(id=user_id)

    # Simulate export logic
    data = {
        'user': user.email,
        'exported_at': str(timezone.now()),
        'format': format,
    }

    # AuditedTask automatically logs this execution to B09
    return data
```

---

## Step 4: Start Celery Worker (1 minute)

In a **new terminal**:

```bash
cd django-core-app/src/
celery -A config worker -l info
```

You should see:
```
[tasks]
  . tasks.examples.hello.hello_world
  . tasks.examples.export.export_user_data

celery@hostname ready.
```

**Keep this terminal running** while testing tasks.

---

## Step 5: Trigger Your Task (2 minutes)

### From Django Shell

```bash
python manage.py shell
```

```python
from tasks.examples.hello import hello_world

# Trigger async execution
result = hello_world.delay("Django Developer")

# Get task ID for status tracking
print(f"Task ID: {result.id}")

# Check status (non-blocking)
print(f"Status: {result.status}")  # PENDING → STARTED → SUCCESS

# Wait for result (blocking, up to 10 seconds)
try:
    output = result.get(timeout=10)
    print(f"Result: {output}")  # "Hello, Django Developer!"
except TimeoutError:
    print("Task did not complete in time")
```

### From Django View

Create `src/tasks/views.py`:

```python
from django.http import JsonResponse
from django.views import View
from tasks.examples.hello import hello_world

class TriggerTaskView(View):
    def post(self, request):
        name = request.POST.get('name', 'Anonymous')

        # Trigger task asynchronously
        result = hello_world.delay(name)

        return JsonResponse({
            'task_id': result.id,
            'status': 'queued',
            'message': f'Task triggered for {name}'
        })
```

---

## Step 6: Check Task Status (2 minutes)

### Via Python API

```python
from celery.result import AsyncResult

task_id = "your-task-id-here"  # From step 5
result = AsyncResult(task_id)

# Check status
print(result.status)  # PENDING, STARTED, SUCCESS, FAILURE

# Get result if successful
if result.successful():
    print(result.result)

# Get error if failed
if result.failed():
    print(result.traceback)
```

### Via Health Check Endpoint

```bash
curl http://localhost:8000/health/tasks/
```

Response:
```json
{
  "status": "healthy",
  "broker": "connected",
  "workers": 1,
  "timestamp": "2025-11-30T10:30:00Z"
}
```

---

## Step 7: Create Periodic Task (Optional, 3 minutes)

### Add to Settings

Edit `src/config/settings/celery.py`:

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'hello-every-5-minutes': {
        'task': 'tasks.examples.hello.hello_world',
        'schedule': 300.0,  # Every 5 minutes (in seconds)
        'args': ['Periodic Task'],
    },

    'daily-cleanup': {
        'task': 'tasks.maintenance.cleanup_old_sessions',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
        'kwargs': {'days_old': 30},
    },
}
```

### Start Beat Scheduler

In a **new terminal**:

```bash
cd django-core-app/src/
celery -A config beat -l info
```

You should see:
```
Scheduler: Sending due task hello-every-5-minutes
```

The worker (from Step 4) will execute the scheduled tasks.

---

## Common Patterns

### With Retry Logic

```python
@shared_task(
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_kwargs={'max_retries': 5}
)
def call_external_api(self, url):
    """
    Automatically retries on network errors with exponential backoff.
    """
    response = requests.get(url)
    return response.json()
```

### With Context Propagation (For Audited Tasks)

```python
# In Django view
from tasks.examples.export import export_user_data

def trigger_export(request):
    result = export_user_data.delay(
        user_id=request.user.id,  # Required for audit
        org_id=request.user.organisation_id,  # Required for audit
        format='csv'
    )
    return JsonResponse({'task_id': result.id})
```

### Check Multiple Task Statuses

```python
from celery.result import AsyncResult

task_ids = ['id1', 'id2', 'id3']
results = [AsyncResult(tid) for tid in task_ids]

for result in results:
    print(f"{result.id}: {result.status}")
```

---

## Troubleshooting

### Task Not Executing

1. **Check worker is running**: Look for `celery@hostname ready.` in worker terminal
2. **Check Redis connection**: `redis-cli ping` should return `PONG`
3. **Check task is registered**: Look for your task in worker startup output
4. **Check logs**: Worker shows `Task received`, `Task succeeded/failed` messages

### Task Stuck in PENDING

- Task was sent to wrong queue (check routing configuration)
- Worker crashed before picking up task
- Redis broker unreachable

### Import Errors

Ensure Celery can import your task module:
```python
# In src/config/celery.py
app.autodiscover_tasks()  # Should be present
```

Verify Python path includes `src/`:
```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
```

---

## Next Steps

1. **Read task patterns**: `contracts/task-patterns.md` for advanced usage
2. **Configure production workers**: See `docs/deployment/celery-workers.md`
3. **Add audit logging**: Use `AuditedTask` base class for sensitive operations
4. **Monitor task health**: Integrate `/health/tasks/` with load balancers
5. **Explore scheduling**: Configure `CELERY_BEAT_SCHEDULE` for recurring jobs

---

## Production Checklist

Before deploying to production:

- [ ] Configure `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` from environment variables
- [ ] Set up process manager (systemd, supervisor) for workers
- [ ] Configure separate beat scheduler process (only one per deployment)
- [ ] Set appropriate `CELERY_TASK_TIME_LIMIT` and `CELERY_TASK_SOFT_TIME_LIMIT`
- [ ] Configure `CELERY_WORKER_MAX_TASKS_PER_CHILD` to prevent memory leaks
- [ ] Enable monitoring (django-prometheus integration)
- [ ] Set up alerts for worker failures and broker downtime
- [ ] Document task retry policies and failure modes
- [ ] Test graceful shutdown behavior
- [ ] Verify audit events appear in B09 for sensitive tasks

---

## Quick Reference

### Start Worker
```bash
celery -A config worker -l info
```

### Start Beat Scheduler
```bash
celery -A config beat -l info
```

### Trigger Task
```python
from tasks.examples.hello import hello_world
result = hello_world.delay("arg1", "arg2")
```

### Check Status
```python
from celery.result import AsyncResult
result = AsyncResult(task_id)
print(result.status)  # PENDING, STARTED, SUCCESS, FAILURE
```

### Health Check
```bash
curl http://localhost:8000/health/tasks/
```

### Inspect Workers
```bash
celery -A config inspect active
celery -A config inspect stats
```

---

**Time to First Task**: ~10-15 minutes ✅

You now have a working async task infrastructure! Explore `contracts/task-patterns.md` for more advanced patterns.

# Tasks (B15 - Background Tasks & Scheduling)

**Status**: ✅ Complete
**Location**: `src/tasks/`

## Purpose

Provides asynchronous task execution infrastructure using Celery for background jobs, scheduled tasks, and distributed work processing.

## Scope

**✅ Included**:
- Celery application configuration
- Custom task base classes (AuditedTask)
- Task health monitoring and inspection
- Example tasks for common patterns
- Django management commands for task inspection
- API endpoints for task status
- Integration with audit logging (B09)

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific task definitions (products define their own)
- Business logic for task execution
- Task scheduling rules (use Celery beat configuration)
- Task result storage (delegated to Celery backend)

## Key Components

### Celery Configuration
- **`celery.py`**: Celery application instance with Django settings integration
- **`apps.py`**: Django app configuration

### Base Classes
- **`AuditedTask`**: Custom task base class with automatic audit logging integration
- **`base.py`**: Task lifecycle hooks for audit trail

### Health Monitoring
- **`health.py`**: Health check utilities for broker connectivity and worker status
- **`inspector.py`**: Task inspection utilities

### APIs/Views
- **`GET /api/tasks/health/`**: Celery infrastructure health status
- **`GET /api/tasks/inspect/`**: Active tasks and worker stats

### Management Commands
- **`management/commands/inspect_tasks.py`**: CLI for task inspection

### Examples
- **`examples/`**: Example tasks demonstrating common patterns

## Public Interface

**Safe to Import** (Stable API):
```python
from tasks.celery import app as celery_app
from tasks.base import AuditedTask
from celery import shared_task
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from tasks.health import check_broker_connectivity  # Use health API endpoint
from tasks.inspector import _inspect_workers  # Internal inspection
```

## Integration Example

**Define Custom Task**:
```python
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def process_payment(user_id, amount, org_id=None, request_id=None):
    """
    Process payment with audit logging.

    AuditedTask requires 'user_id' for audit trail.
    Optional 'org_id' and 'request_id' for context.
    """
    # Task implementation
    payment = Payment.objects.create(user_id=user_id, amount=amount)
    return payment.id

# Call task asynchronously
process_payment.delay(user_id=123, amount=100.00, org_id=456)

# Call with explicit task_id
process_payment.apply_async(
    kwargs={"user_id": 123, "amount": 100.00},
    task_id="custom-task-id-123",
)
```

**Health Check**:
```python
from tasks.health import check_broker_connectivity, check_active_workers

# Check broker
is_healthy, message = check_broker_connectivity(timeout=5)
if is_healthy:
    print("Broker is healthy")

# Check workers
workers_ok, worker_msg = check_active_workers(timeout=5)
if workers_ok:
    print(f"Workers active: {worker_msg}")
```

**API Usage**:
```bash
# Check Celery infrastructure health
GET /api/tasks/health/
Authorization: Bearer <token>

# Response
{
    "broker": {
        "healthy": true,
        "message": "Broker connected"
    },
    "workers": {
        "healthy": true,
        "message": "2 workers active"
    }
}

# Inspect active tasks
GET /api/tasks/inspect/
Authorization: Bearer <token>
```

## Related Modules

**Dependencies** (This module requires):
- [B09 Audit] - Audit logging for task lifecycle events
- Celery - Task execution framework
- Redis/RabbitMQ - Message broker (external)

**Used By** (Modules that depend on this):
- [B16 Notifications] - Async notification delivery
- [B17 Contextual Notifications] - Background notification processing
- All modules - Async operations and scheduled tasks

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Task Base Classes**:
   ```python
   # your_product/tasks.py
   from tasks.base import AuditedTask

   class ProductTask(AuditedTask):
       """Product-specific task base with custom behavior."""

       def on_success(self, retval, task_id, args, kwargs):
           super().on_success(retval, task_id, args, kwargs)
           # Add product-specific success handling
           log_product_metrics(task_id, retval)

   @shared_task(base=ProductTask)
   def custom_task():
       pass
   ```

2. **Custom Periodic Tasks**:
   ```python
   # your_product/celerybeat.py
   from celery.schedules import crontab

   # settings.py
   CELERY_BEAT_SCHEDULE = {
       "daily-report": {
           "task": "your_product.tasks.generate_daily_report",
           "schedule": crontab(hour=0, minute=0),
       },
   }
   ```

3. **Task Result Handlers**:
   ```python
   # your_product/signals.py
   from celery.signals import task_success, task_failure

   @task_success.connect
   def handle_task_success(sender=None, **kwargs):
       """React to successful task completion."""
       task_id = kwargs.get("result")
       # Custom handling

   @task_failure.connect
   def handle_task_failure(sender=None, **kwargs):
       """React to task failure."""
       task_id = kwargs.get("task_id")
       # Custom error handling
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    # ...
    "tasks",
]

# Celery configuration
CELERY_BROKER_URL = "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = "redis://localhost:6379/0"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
```

**Environment Variables**:
```bash
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CELERY_TASK_ALWAYS_EAGER=false  # Set to true for synchronous testing
```

**Optional Settings**:
```python
# settings.py (optional)
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True

# Task result expiration
CELERY_RESULT_EXPIRES = 3600  # 1 hour

# Task retry configuration
CELERY_TASK_MAX_RETRIES = 3
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # seconds
```

## Testing

**Run Module Tests**:
```bash
pytest tests/tasks/ -v
```

**Testing with Eager Mode**:
```python
# settings/test.py
CELERY_TASK_ALWAYS_EAGER = True  # Run tasks synchronously in tests
CELERY_TASK_EAGER_PROPAGATES = True  # Propagate exceptions
```

**Key Test Coverage**:
- ✅ Task execution (synchronous and asynchronous)
- ✅ AuditedTask creates audit events
- ✅ Task retry behavior
- ✅ Health check utilities
- ✅ Worker inspection
- ✅ API endpoint authentication

## References

- **Spec**: [documents/02-roadmap/modules/done/015-Bxx-tasks-scheduling-foundation.md](../../documents/02-roadmap/modules/done/015-Bxx-tasks-scheduling-foundation.md)
- **Module Doc**: [documents/04-modules/backend/B15-tasks-scheduling.md](../../documents/04-modules/backend/B15-tasks-scheduling.md)
- **Celery Docs**: https://docs.celeryq.dev/
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: Tasks not executing
   - **Cause**: Celery workers not running
   - **Solution**: Start workers with `celery -A config worker -l info`

2. **Issue**: Broker connection refused
   - **Cause**: Redis/RabbitMQ not running or wrong URL
   - **Solution**: Verify broker is running and `CELERY_BROKER_URL` is correct

3. **Issue**: Tasks execute twice (duplicate execution)
   - **Cause**: Multiple workers consuming same queue or task retrying
   - **Solution**: Check worker configuration and retry settings

4. **Issue**: Audit events not created for tasks
   - **Cause**: Task not using `AuditedTask` base class or missing `user_id`
   - **Solution**: Use `@shared_task(base=AuditedTask)` and include `user_id` in kwargs

5. **Issue**: Task timeouts
   - **Cause**: Task exceeds `CELERY_TASK_TIME_LIMIT`
   - **Solution**: Increase time limit or optimize task implementation

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None

## Running Celery

**Development**:
```bash
# Start worker
celery -A config worker -l info

# Start worker with beat scheduler
celery -A config worker -B -l info

# Start beat scheduler separately
celery -A config beat -l info
```

**Production**:
```bash
# Worker with concurrency
celery -A config worker -l info --concurrency=4

# Worker with specific queues
celery -A config worker -Q default,priority -l info

# Flower monitoring (optional)
celery -A config flower --port=5555
```

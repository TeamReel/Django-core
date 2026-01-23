# Data Model: Tasks & Scheduling Foundation
*Feature: B15 Tasks & Scheduling Foundation*
*Date: 2025-11-30*

## Overview

B15 primarily leverages Celery's built-in data structures for task management. The baseline implementation does **not** introduce new Django models for task storage, instead relying on:

1. **Celery's internal task representation** (in-memory and Redis-backed)
2. **Redis result backend** for lightweight task status tracking
3. **B09 Audit system** for persistent audit trail of task execution

This document describes the conceptual entities and their relationships, along with any Django models that **may** be added for advanced features (marked as optional/future).

---

## Core Entities (Celery-Managed)

### Task Definition
**Source**: Python code (decorated functions)
**Storage**: Application code, not persisted in database

**Attributes**:
- `name` (str): Fully qualified task name (e.g., `tasks.examples.send_email`)
- `bind` (bool): Whether task receives self reference
- `base` (class): Base task class (e.g., `Task`, `AuditedTask`)
- `retry_kwargs` (dict): Retry policy configuration
- `time_limit` (int): Hard timeout in seconds
- `soft_time_limit` (int): Soft timeout for graceful shutdown

**Relationships**:
- Has many Task Executions (via task_id)
- Referenced by Periodic Tasks (via task name string)

---

### Task Execution (AsyncResult)
**Source**: Celery + Redis result backend
**Storage**: Redis (transient, configurable TTL)

**Attributes**:
- `task_id` (UUID str): Unique identifier for this execution
- `status` (enum): PENDING | STARTED | SUCCESS | FAILURE | RETRY
- `result` (JSON): Task return value (if result backend enabled)
- `traceback` (str): Exception traceback on failure
- `date_done` (datetime): Completion timestamp
- `args` (tuple): Task arguments (for debugging)
- `kwargs` (dict): Task keyword arguments

**Relationships**:
- Belongs to Task Definition (via task name)
- May reference Audit Event (user_id, org_id in kwargs)

**Query Pattern**:
```python
from celery.result import AsyncResult
result = AsyncResult(task_id)
result.status  # 'SUCCESS', 'FAILURE', etc.
result.get(timeout=5)  # Block and wait for result
```

---

### Periodic Task Schedule
**Source**: Django settings (`CELERY_BEAT_SCHEDULE`)
**Storage**: Python dict in `settings/celery.py`

**Attributes**:
- `key` (str): Schedule identifier
- `task` (str): Task name to execute
- `schedule` (crontab | timedelta): Execution schedule
- `args` (tuple): Default task arguments
- `kwargs` (dict): Default task keyword arguments
- `options` (dict): Celery execution options (queue, routing_key, etc.)
- `enabled` (bool): Whether schedule is active (via settings)

**Example**:
```python
CELERY_BEAT_SCHEDULE = {
    'cleanup-sessions-daily': {
        'task': 'tasks.maintenance.cleanup_sessions',
        'schedule': crontab(hour=3, minute=0),
        'kwargs': {'days_old': 30},
    },
}
```

**Extension Point**: For database-backed schedules (optional future enhancement):
- Use `django-celery-beat` package
- Adds Django models: `PeriodicTask`, `CrontabSchedule`, `IntervalSchedule`
- Enables runtime schedule modifications via admin/API
- Documented as optional, not implemented in baseline

---

### Worker Process
**Source**: Celery worker processes
**Storage**: In-memory, inspectable via Celery inspect API

**Attributes**:
- `hostname` (str): Worker identifier (e.g., `celery@localhost`)
- `active` (list): Currently executing tasks
- `scheduled` (list): Tasks waiting to execute
- `stats` (dict): Worker statistics (total tasks, pool info)

**Query Pattern**:
```python
from celery import current_app
inspect = current_app.control.inspect()
inspect.active()  # Active tasks per worker
inspect.stats()  # Worker statistics
```

---

## Django Models (B09 Integration)

### AuditEvent (Existing - B09)
**Source**: `src/audit/models.py` (existing model from B09)
**Storage**: PostgreSQL

**Relevant Fields for Tasks**:
- `event_type` (str): `'task.started'`, `'task.completed'`, `'task.failed'`
- `actor_id` (FK): User who triggered task (if applicable)
- `resource_type` (str): `'task'`
- `resource_id` (str): Task ID (UUID)
- `metadata` (JSON): Task name, arguments, result summary
- `timestamp` (datetime): Event creation time

**Usage Pattern**:
```python
# In AuditedTask.on_success()
from audit.services import create_audit_event

create_audit_event(
    event_type='task.completed',
    actor_id=kwargs.get('user_id'),
    resource_type='task',
    resource_id=self.request.id,
    metadata={
        'task_name': self.name,
        'duration_seconds': duration,
        'result_preview': str(retval)[:200],
    }
)
```

---

## Optional/Future Enhancements (Not in Baseline)

### TaskResult Model (Optional)
**Purpose**: Persistent task result storage beyond Redis TTL
**Implementation**: Custom Django model or `django-celery-results` package

**Potential Schema**:
- `task_id` (UUID, primary key)
- `task_name` (str)
- `status` (enum)
- `result` (JSON)
- `date_created` (datetime)
- `date_done` (datetime)
- `traceback` (text, null)

**Decision**: Not implemented in baseline. Redis TTL sufficient for status tracking.

---

### PeriodicTask Model (Optional - django-celery-beat)
**Purpose**: Database-backed periodic task configuration
**Implementation**: `django-celery-beat` package

**Potential Schema**:
- `id` (primary key)
- `name` (str)
- `task` (str, task name)
- `crontab` (FK to CrontabSchedule)
- `interval` (FK to IntervalSchedule)
- `args` (JSON)
- `kwargs` (JSON)
- `enabled` (bool)
- `last_run_at` (datetime)

**Decision**: Extension point documented, not implemented in baseline. Settings-driven scheduling is sufficient for initial release.

---

## Data Flow Diagrams

### Task Execution Flow
```
1. User Request → Django View
2. View calls task.delay(user_id=..., org_id=..., data=...)
3. Celery serializes task and sends to Redis broker
4. Worker picks up task from broker
5. Worker executes task function
6. On success/failure:
   a. Celery updates Redis result backend (status, result)
   b. AuditedTask emits audit event to B09 (PostgreSQL)
7. Caller can query AsyncResult(task_id).status
```

### Periodic Task Flow
```
1. Beat scheduler reads CELERY_BEAT_SCHEDULE from settings
2. At schedule time, beat sends task message to broker
3. Worker picks up and executes task (same as manual trigger)
4. Audit events captured if task uses AuditedTask base
5. Beat tracks last_run internally (in-memory, or in database if using django-celery-beat)
```

### Health Check Flow
```
1. Load balancer → GET /health/tasks/
2. Health view pings Redis broker
3. Optional: inspect() to count active workers
4. Return 200 OK + JSON if healthy, 503 if broker down
```

---

## Storage Sizing Estimates

### Redis Result Backend
- **Keys per task**: 1 key per task execution
- **Key size**: ~1-5 KB (task metadata + status)
- **TTL**: 24 hours (configurable)
- **Typical load**: 1,000 tasks/day = 1-5 MB in Redis
- **Peak load**: 10,000 tasks/day = 10-50 MB in Redis

**Mitigation**: Short TTL ensures automatic cleanup. No manual cleanup jobs needed.

### B09 Audit Events (PostgreSQL)
- **Rows per audited task**: 1-3 events (started, retry, completed/failed)
- **Row size**: ~500 bytes (JSON metadata compresses well)
- **Only audited tasks**: Opt-in via `AuditedTask` base class
- **Retention**: Follows B09 audit retention policy (not specific to tasks)

**Mitigation**: Audit events follow existing B09 retention/archival strategy.

---

## Indexes and Performance

### Redis
- **Key Pattern**: `celery-task-meta-{task_id}`
- **Access Pattern**: Random key lookups by task_id
- **Performance**: O(1) lookups, no indexes needed

### PostgreSQL (B09 Audit)
- **Existing Indexes**: `event_type`, `actor_id`, `resource_type`, `timestamp`
- **Query Pattern**: Filter by `event_type='task.*'` and timestamp range
- **Performance**: Covered by existing B09 indexes, no new indexes needed

---

## Migration Strategy

**Baseline (B15 Initial Release)**:
- No Django migrations required (no new models)
- Settings configuration only
- B09 audit system already handles task events

**Future Enhancements** (If database-backed scheduling added):
- Add django-celery-beat to `requirements/base.txt`
- Run `python manage.py migrate django_celery_beat`
- Migrate settings-based schedules to database via management command

---

## References

- **Celery Task State Model**: https://docs.celeryq.dev/en/stable/userguide/tasks.html#states
- **Redis Backend Configuration**: https://docs.celeryq.dev/en/stable/userguide/configuration.html#redis-backend-settings
- **B09 Audit Models**: `src/audit/models.py` (existing)
- **django-celery-beat**: https://github.com/celery/django-celery-beat (optional future)

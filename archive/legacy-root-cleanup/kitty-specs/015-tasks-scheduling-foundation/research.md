# Research: Tasks & Scheduling Foundation
*Feature: B15 Tasks & Scheduling Foundation*
*Date: 2025-11-30*

## Planning Context

### Validated Decisions from Planning Phase

#### 1. Worker Process Management
**Decision**: Manual worker management as baseline (Option A)
**Rationale**:
- Simplest approach for initial release
- Developers run `celery worker` commands directly
- Provides maximum flexibility for different deployment environments
- Documentation includes systemd/supervisor examples for production

**Alternatives Considered**:
- Django management command wrapper - adds abstraction layer but limited value for standard Celery operations
- Container-ready only approach - too prescriptive for baseline
- Chosen approach documents all patterns while keeping baseline simple

**Implementation Notes**:
- Provide clear documentation for local development (`celery -A config worker -l info`)
- Include systemd service file template in docs
- Include supervisor config example
- Document Docker/K8s patterns as optional

---

#### 2. Task Result Storage Strategy
**Decision**: Redis backend for status tracking only (Option D)
**Rationale**:
- Leverages existing Redis broker infrastructure (no additional dependency)
- Lightweight - stores task state only, not full results
- Satisfies FR-006 requirement for basic task status queries
- Keeps result storage optional as per Assumption 3

**Alternatives Considered**:
- Full Redis result backend - stores complete results, more overhead than needed
- Django ORM backend - adds database load for transient task status
- No persistent storage - doesn't meet FR-006 requirement
- Chosen approach balances status tracking with minimal infrastructure

**Implementation Notes**:
- Configure `CELERY_RESULT_BACKEND = 'redis://...'`
- Set `CELERY_RESULT_EXTENDED_STATES = True` for detailed state tracking
- Configure short TTL for result keys (e.g., 24 hours) to prevent Redis bloat
- Document how to query task status via `AsyncResult(task_id).status`

---

#### 3. Audit Logging Integration
**Decision**: Base task class with audit hooks (Option C)
**Rationale**:
- Opt-in per task via inheritance - no audit noise for routine jobs
- Clean separation between audited and non-audited tasks
- Uses Celery signals internally for automatic capture
- Integrates cleanly with B09 audit system

**Alternatives Considered**:
- Global Celery signals - audits everything, creates excessive noise
- Decorator-based - less discoverable than class inheritance
- Middleware pattern - more complex, less explicit
- Chosen approach provides clear, explicit audit behavior

**Implementation Notes**:
- Create `AuditedTask` base class inheriting from `celery.Task`
- Override `on_success`, `on_failure`, `on_retry` to emit audit events
- Provide `get_audit_context()` method for custom metadata
- Example tasks demonstrate both `@app.task` (no audit) and `@app.task(base=AuditedTask)` patterns

**B09 Integration Pattern**:
```python
from audit.services import create_audit_event

class AuditedTask(Task):
    def on_success(self, retval, task_id, args, kwargs):
        create_audit_event(
            event_type='task.completed',
            actor=kwargs.get('user_id'),
            resource_type='task',
            resource_id=task_id,
            metadata={'task_name': self.name, 'args': args}
        )
```

---

#### 4. Task Context Propagation
**Decision**: Explicit argument passing (Option A)
**Rationale**:
- Clear, predictable, no magic
- Developers explicitly pass user_id, org_id, request_id as task arguments
- No thread-local capture complexity or edge cases
- Forces conscious decision about what context is needed

**Alternatives Considered**:
- Thread-local auto-capture - fragile, hard to debug, doesn't work in all contexts
- Helper methods on base task - still requires explicit passing, adds complexity
- Hybrid auto-capture - magic behavior leads to bugs
- Chosen approach is explicit and maintainable

**Implementation Notes**:
- Document standard pattern: `task.delay(user_id=request.user.id, org_id=org.id, ...)`
- Provide validation helpers to ensure required context is present
- Example tasks demonstrate context passing patterns
- Document anti-patterns (e.g., passing full User objects - not serializable)

**Documentation Pattern**:
```python
@app.task(base=AuditedTask)
def send_notification(user_id, org_id, message):
    """
    Task Context Pattern:
    - user_id: Required for audit trail and permissions
    - org_id: Required for multi-tenancy
    - message: Business logic data
    """
    user = User.objects.get(id=user_id)
    # ... task logic
```

---

#### 5. Health Check Implementation
**Decision**: Both Django endpoint and management command (Option C)
**Rationale**:
- Django endpoint serves load balancer health checks (lightweight, fast)
- Management command provides detailed worker inspection for ops tooling
- Different use cases, both valuable

**Alternatives Considered**:
- Django endpoint only - insufficient for detailed ops diagnostics
- Management command only - requires SSH access, not suitable for load balancers
- Prometheus only - assumes specific monitoring stack
- Both approaches complement each other

**Implementation Notes**:

**Django View** (`/health/tasks/`):
- Check broker connectivity (ping Redis)
- Optional: lightweight worker availability check
- Return 200 OK with JSON: `{"status": "healthy", "broker": "connected", "workers": 3}`
- Return 503 Service Unavailable if broker unreachable
- No authentication required (health check endpoint)

**Management Command** (`manage.py check_workers`):
- Wrap Celery inspect API
- Show active workers, scheduled tasks, active tasks
- Return exit code 0 (healthy) or 1 (unhealthy)
- Output JSON or human-readable format

---

## Technology Stack Summary

### Core Dependencies
- **Celery 5.3+**: Task execution framework
- **Redis**: Broker and lightweight result backend (already in infrastructure from B06)
- **celery-beat**: Periodic task scheduling (bundled with Celery)
- **kombu**: Celery messaging library (Celery dependency)

### Integration Points
- **B01 (Settings)**: Configuration structure for Celery settings
- **B09 (Audit)**: `AuditedTask` base class integration
- **B02 (Constitution)**: Validation that task patterns remain product-agnostic
- **Python logging**: Structured logging for task execution

### Development Dependencies
- **pytest-celery**: Testing utilities for Celery tasks
- **fakeredis**: Mock Redis for tests (avoid external dependency in test suite)

---

## Architecture Patterns

### Django App Structure
**App Name**: `tasks` (or `background` - TBD during implementation)

**Module Layout**:
```
src/tasks/
├── __init__.py
├── apps.py
├── celery.py           # Celery app configuration
├── base.py             # AuditedTask base class
├── context.py          # Context helpers (optional)
├── health.py           # Health check utilities
├── views.py            # Health check Django view
├── management/
│   └── commands/
│       └── check_workers.py
└── examples/           # Example task patterns
    ├── __init__.py
    ├── simple_task.py
    └── audited_task.py
```

### Configuration Pattern
**Settings Module**: `src/config/settings/celery.py`

**Key Settings**:
```python
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/1')
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes default
CELERY_TASK_SOFT_TIME_LIMIT = 270  # 4.5 minutes
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_BEAT_SCHEDULE = {
    'example-task': {
        'task': 'tasks.examples.cleanup',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
}
```

### Periodic Task Configuration (Settings-Driven)
**Decision Context**: Clarification session confirmed settings-driven as baseline.

**Pattern**: Use `CELERY_BEAT_SCHEDULE` dict in Django settings
**Extension Point**: Document django-celery-beat as optional for database-backed schedules

---

## Testing Strategy

### Unit Tests
- Task execution logic (mock external dependencies)
- Retry behavior (simulate failures)
- Context validation helpers
- Base task audit event emission

### Integration Tests
- Broker connectivity
- Task status queries via Redis backend
- Periodic task execution (with beat scheduler)
- Audit event creation in B09

### Test Infrastructure
- Use `@pytest.mark.celery` for Celery-specific tests
- Mock Redis with fakeredis for fast unit tests
- Real Redis for integration tests (docker-compose or test environment)
- Provide fixture for Celery app with test configuration

---

## Open Questions / Deferred Decisions

None - all critical architectural decisions resolved during planning phase.

---

## References

- **Celery Documentation**: https://docs.celeryq.dev/
- **Django-Celery Integration**: https://docs.celeryq.dev/en/stable/django/
- **B09 Audit System**: `src/audit/` (existing implementation)
- **Constitution**: `.kittify/memory/constitution.md`

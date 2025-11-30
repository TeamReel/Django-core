# Work Packages: Tasks & Scheduling Foundation
**Feature**: B15 Tasks & Scheduling Foundation
**Branch**: `015-tasks-scheduling-foundation`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

Implement async task execution and periodic scheduling infrastructure for Django Core-App using Celery 5.3+ with Redis broker. This provides baseline capability for:

- **Background Task Execution**: Offload heavy operations with automatic retry
- **Periodic Job Scheduling**: Settings-driven recurring tasks via celery-beat
- **Audit Integration**: Opt-in audit logging via custom `AuditedTask` base class
- **Health Monitoring**: Django endpoint + management command for worker health checks

**Architecture Decisions**:
- Manual worker management (developers run `celery worker` commands)
- Redis for broker + lightweight result backend (status tracking only)
- Explicit context propagation (user_id, org_id passed as task arguments)
- Settings-driven periodic schedules with optional DB backend extension point

**Dependencies**: Redis (broker), B09 (audit logging), B01 (settings structure)

---

## Work Package Status

| WP ID | Title | Priority | Status | Subtasks | Prompt |
|-------|-------|----------|--------|----------|--------|
| WP01 | Django App Setup & Celery Configuration | P1 | ✅ done | 8 | [WP01-django-app-setup.md](tasks/done/WP01-django-app-setup.md) |
| WP02 | AuditedTask Base Class & B09 Integration | P2 | ✅ done | 6 | [WP02-audited-task-integration.md](tasks/done/WP02-audited-task-integration.md) |
| WP03 | Health Check Infrastructure | P2 | ✅ done | 5 | [WP03-health-check-infrastructure.md](tasks/done/WP03-health-check-infrastructure.md) |
| WP04 | Example Tasks & Patterns | P2 | ✅ done | 5 | [WP04-example-tasks-patterns.md](tasks/done/WP04-example-tasks-patterns.md) |
| WP05 | Periodic Scheduling Configuration | P2 | ✅ done | 6 | [WP05-periodic-scheduling-config.md](tasks/done/WP05-periodic-scheduling-config.md) |
| WP05 | Periodic Scheduling Configuration | P2 | planned | 6 | [WP05-periodic-scheduling-config.md](tasks/planned/WP05-periodic-scheduling-config.md) |
| WP06 | Documentation & Developer Guides | P2 | planned | 5 | [WP06-documentation-guides.md](tasks/planned/WP06-documentation-guides.md) |
| WP07 | Testing Suite | P1 | planned | 9 | [WP07-testing-suite.md](tasks/planned/WP07-testing-suite.md) |

**Total**: 7 work packages, 44 subtasks

---

## WP01: Django App Setup & Celery Configuration
**Priority**: P1 | **Depends On**: None | **Status**: ✅ done

### Summary
Create `tasks` Django app with Celery configuration, broker settings, and worker startup infrastructure. Establishes foundation for all async task execution.

### Subtasks
- [x] **T001**: Create Django app structure: `src/tasks/__init__.py`, `apps.py`, `urls.py` (if needed)
- [x] **T002**: Create Celery app configuration: `src/tasks/celery.py` with `@app` decorator and autodiscovery
- [x] **T003**: Configure Celery in Django settings: `config/settings/celery.py` with broker URL, result backend, timezone
- [x] **T004**: Add Celery imports to `config/__init__.py` for Django startup integration
- [x] **T005**: Add dependencies to `requirements/base.txt`: `celery[redis]>=5.3.0`, `redis>=5.0.0`
- [x] **T006**: Create worker startup documentation: `docs/tasks/running-workers.md` with local/production commands
- [x] **T007**: Add Celery health check to existing B03 security health endpoint (deferred to WP03)
- [x] **T008**: Verify worker startup with test task (`celery -A config worker -l info`)

**Implementation Sketch**:
```python
# src/tasks/celery.py
from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('django_core')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# config/settings/celery.py
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_RESULT_EXTENDED = True
CELERY_RESULT_EXPIRES = 86400  # 24 hours
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
```

**Risks**:
- Redis unavailable during development → Document fallback to `memory://` for unit tests
- Circular import with Django apps → Use `autodiscover_tasks()` to load tasks lazily

---

## WP02: AuditedTask Base Class & B09 Integration
**Priority**: P2 | **Depends On**: WP01 | **Status**: ✅ done

### Summary
Implement `AuditedTask` base class that automatically creates B09 audit events for task execution. Developers opt-in via inheritance to enable audit logging for sensitive operations.

### Subtasks
- [x] **T009**: Create `src/tasks/base.py` with `AuditedTask` base class inheriting from `celery.Task`
- [x] **T010**: Implement `before_start` signal handler to create "task.started" audit event with task name, args, kwargs
- [x] **T011**: Implement `on_success` signal handler to create "task.completed" audit event with result metadata
- [x] **T012**: Implement `on_failure` signal handler to create "task.failed" audit event with exception details
- [x] **T013**: Add context extraction helpers to parse `user_id`, `org_id`, `request_id` from task kwargs
- [x] **T014**: Document AuditedTask usage pattern in `docs/tasks/auditing.md` with examples

**Implementation Sketch**:
```python
# src/tasks/base.py
from celery import Task
from audit.models import AuditEvent

class AuditedTask(Task):
    """Base class for tasks requiring audit trail."""

    def before_start(self, task_id, args, kwargs):
        """Log task start to B09 audit system."""
        AuditEvent.objects.create(
            event_type='task.started',
            user_id=kwargs.get('user_id'),
            organisation_id=kwargs.get('org_id'),
            metadata={
                'task_id': task_id,
                'task_name': self.name,
                'args': args[:3],  # Truncate for security
            }
        )

    def on_success(self, retval, task_id, args, kwargs):
        """Log successful completion."""
        AuditEvent.objects.create(
            event_type='task.completed',
            user_id=kwargs.get('user_id'),
            organisation_id=kwargs.get('org_id'),
            metadata={'task_id': task_id, 'task_name': self.name}
        )

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Log task failure."""
        AuditEvent.objects.create(
            event_type='task.failed',
            user_id=kwargs.get('user_id'),
            organisation_id=kwargs.get('org_id'),
            metadata={
                'task_id': task_id,
                'task_name': self.name,
                'error': str(exc)[:200]
            }
        )
```

**Risks**:
- Audit database unavailable → Use `try/except` to prevent audit failures from blocking tasks
- Sensitive data in task args → Document best practices for argument sanitization

---

## WP03: Health Check Infrastructure
**Priority**: P2 | **Depends On**: WP01 | **Status**: ✅ done

### Summary
Implement health check endpoint at `/health/tasks/` and management command `check_workers` for monitoring worker availability and broker connectivity.

### Subtasks
- [x] **T015**: Create `src/tasks/health.py` with broker connectivity check function
- [x] **T016**: Create `src/tasks/views.py` with `TasksHealthView` returning 200/503 status
- [x] **T017**: Add URL routing in `src/tasks/urls.py` or main `config/urls.py`
- [x] **T018**: Create management command: `src/tasks/management/commands/check_workers.py`
- [x] **T019**: Write health check integration test verifying 200 when broker available, 503 when unavailable

**Implementation Sketch**:
```python
# src/tasks/health.py
from celery import current_app
from celery.exceptions import TimeoutError

def check_broker_connectivity(timeout=5):
    """Check if Celery broker is reachable."""
    try:
        current_app.control.inspect(timeout=timeout).stats()
        return True, "Broker connected"
    except (TimeoutError, Exception) as e:
        return False, f"Broker unreachable: {e}"

def check_active_workers(timeout=5):
    """Check if any workers are active."""
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        active = inspect.active()
        if active:
            return True, f"{len(active)} workers active"
        return False, "No active workers"
    except Exception as e:
        return False, f"Cannot inspect workers: {e}"

# src/tasks/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .health import check_broker_connectivity, check_active_workers

class TasksHealthView(APIView):
    permission_classes = []  # Public endpoint

    def get(self, request):
        broker_ok, broker_msg = check_broker_connectivity()
        workers_ok, workers_msg = check_active_workers()

        healthy = broker_ok and workers_ok

        return Response({
            'status': 'healthy' if healthy else 'unhealthy',
            'broker': {'status': 'ok' if broker_ok else 'error', 'message': broker_msg},
            'workers': {'status': 'ok' if workers_ok else 'error', 'message': workers_msg},
        }, status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE)
```

**Risks**:
- Slow broker response causing endpoint timeout → Use short timeout (5s) with background check
- False positives if workers idle → Document expected worker count per environment

---

## WP04: Example Tasks & Patterns
**Priority**: P2 | **Depends On**: WP01, WP02 | **Status**: planned

### Summary
Create example tasks demonstrating basic async execution, audited tasks, retry patterns, and integration with existing B09/B12 features.

### Subtasks
- [P] **T020**: Create `src/tasks/examples/__init__.py` directory
- **T021**: Create simple task: `hello_world.py` with basic `.delay()` invocation example
- **T022**: Create audited task: `export_user_data.py` using `AuditedTask` base class with user/org context
- **T023**: Create retry task: `sync_external_api.py` demonstrating custom retry policy with exponential backoff
- **T024**: Create B12 integration example: `send_notification.py` showing notification triggering (if B12 exists)

**Implementation Sketch**:
```python
# src/tasks/examples/hello_world.py
from celery import shared_task

@shared_task
def hello_world(name):
    """Simple task with no audit trail."""
    return f"Hello, {name}!"

# src/tasks/examples/export_user_data.py
from celery import shared_task
from tasks.base import AuditedTask

@shared_task(base=AuditedTask)
def export_user_data(user_id, org_id, format='csv'):
    """
    Export user data with audit logging.

    Args:
        user_id: Required for audit trail
        org_id: Required for multi-tenancy
        format: Export format (csv, json)
    """
    # Implementation here
    return {'status': 'completed', 'format': format}

# src/tasks/examples/sync_external_api.py
from celery import shared_task
from requests.exceptions import RequestException

@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=60,
    autoretry_for=(RequestException,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def sync_external_api(self, api_url, org_id):
    """Task with aggressive retry for flaky APIs."""
    # Implementation here
    pass
```

**Risks**:
- Example tasks executed accidentally in production → Add clear docstrings marking as examples
- External API dependencies in examples → Mock external calls in example code

---

## WP05: Periodic Scheduling Configuration
**Priority**: P2 | **Depends On**: WP01 | **Status**: planned

### Summary
Configure celery-beat for periodic task scheduling using Django settings (baseline) with optional django-celery-beat extension point documented.

### Subtasks
- **T025**: Add `celery-beat` configuration to `config/settings/celery.py` with `CELERY_BEAT_SCHEDULE`
- **T026**: Create example periodic task: `cleanup_expired_sessions.py` scheduled to run daily
- **T027**: Document beat scheduler startup: `celery -A config beat -l info`
- **T028**: Document optional django-celery-beat setup for database-backed schedules in `docs/tasks/periodic-tasks.md`
- **T029**: Add systemd service file template for beat scheduler in `docs/deployment/celery-beat.service`
- **T030**: Test periodic task execution (mock time or use short interval)

**Implementation Sketch**:
```python
# config/settings/celery.py (continued)
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-sessions-daily': {
        'task': 'tasks.examples.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3:00 AM
        'options': {'expires': 3600},  # Task expires if not run within 1 hour
    },
    'sync-external-data-hourly': {
        'task': 'tasks.examples.sync_external_api',
        'schedule': 3600.0,  # Every hour (in seconds)
        'kwargs': {'api_url': 'https://api.example.com/sync'},
    },
}

# src/tasks/examples/cleanup_expired_sessions.py
from celery import shared_task
from django.contrib.sessions.models import Session
from django.utils import timezone

@shared_task
def cleanup_expired_sessions():
    """Remove expired sessions from database."""
    expired = Session.objects.filter(expire_date__lt=timezone.now())
    count = expired.count()
    expired.delete()
    return f"Deleted {count} expired sessions"
```

**Risks**:
- Multiple beat schedulers running → Document singleton requirement clearly
- Schedule drift on worker restart → Acceptable per spec (±10s accuracy)

---

## WP06: Documentation & Developer Guides
**Priority**: P2 | **Depends On**: WP01-WP05 | **Status**: planned

### Summary
Create comprehensive developer documentation including setup instructions, usage patterns, troubleshooting guide, and deployment templates.

### Subtasks
- **T031**: Create main guide: `docs/tasks/README.md` with architecture overview and quick links
- **T032**: Document worker management: `docs/tasks/running-workers.md` (local, systemd, supervisor, Docker)
- **T033**: Document periodic tasks: `docs/tasks/periodic-tasks.md` (settings vs DB-backed schedules)
- **T034**: Create troubleshooting guide: `docs/tasks/troubleshooting.md` (common errors, debugging)
- **T035**: Add deployment templates: systemd service files for worker + beat in `docs/deployment/`

**Content Outline**:
```markdown
# docs/tasks/README.md
- Overview of async task infrastructure
- Quick links to setup, patterns, troubleshooting
- Integration points (B09 audit, B12 notifications)

# docs/tasks/running-workers.md
- Local development: `celery -A config worker -l info`
- Production systemd service template
- Supervisor configuration example
- Docker/K8s deployment patterns
- Worker scaling and concurrency tuning

# docs/tasks/troubleshooting.md
- Connection refused (Redis unavailable)
- Task not executing (worker not running)
- Duplicate task execution (multiple beat schedulers)
- Memory leaks (task result TTL too long)
- Performance issues (too many concurrent tasks)
```

**Risks**:
- Documentation drift over time → Link to code examples to stay in sync
- Missing edge cases → Add troubleshooting entries based on user feedback

---

## WP07: Testing Suite
**Priority**: P1 | **Depends On**: WP01-WP05 | **Status**: planned

### Summary
Implement comprehensive test suite with unit tests (fakeredis), integration tests (real Redis), and coverage validation (80%+ target).

### Subtasks
- [P] **T036**: Set up pytest-celery test configuration in `tests/conftest.py` with celery worker fixture
- [P] **T037**: Create unit tests for task definitions: `tests/tasks/test_examples.py` using fakeredis
- **T038**: Create integration tests for task execution: `tests/tasks/test_execution.py` with real Redis
- **T039**: Create tests for AuditedTask: `tests/tasks/test_audited_task.py` verifying B09 events created
- **T040**: Create tests for health checks: `tests/tasks/test_health.py` (endpoint + management command)
- **T041**: Create tests for periodic scheduling: `tests/tasks/test_periodic.py` mocking beat scheduler
- **T042**: Add test for retry logic: verify exponential backoff and max retries
- **T043**: Add test for context propagation: verify user_id/org_id passed correctly
- **T044**: Run coverage report and ensure 80%+ coverage for `src/tasks/`

**Implementation Sketch**:
```python
# tests/tasks/test_examples.py
import pytest
from tasks.examples.hello_world import hello_world

@pytest.mark.django_db
def test_hello_world_task():
    """Test simple task execution."""
    result = hello_world.apply(args=['Alice'])  # Synchronous for testing
    assert result.result == "Hello, Alice!"

# tests/tasks/test_audited_task.py
import pytest
from tasks.examples.export_user_data import export_user_data
from audit.models import AuditEvent

@pytest.mark.django_db
def test_audited_task_creates_events(db):
    """Test AuditedTask creates audit events."""
    result = export_user_data.apply(kwargs={'user_id': 1, 'org_id': 2, 'format': 'csv'})

    # Verify audit events created
    events = AuditEvent.objects.filter(event_type__in=['task.started', 'task.completed'])
    assert events.count() == 2
    assert events.first().metadata['task_name'] == 'tasks.examples.export_user_data'

# tests/conftest.py
import pytest
from celery import Celery

@pytest.fixture(scope='session')
def celery_config():
    """Override Celery config for testing."""
    return {
        'broker_url': 'memory://',
        'result_backend': 'cache+memory://',
        'task_always_eager': True,  # Execute tasks synchronously
        'task_eager_propagates': True,
    }
```

**Risks**:
- Flaky integration tests with real Redis → Use Docker Compose for consistent test environment
- Slow test execution → Use `task_always_eager=True` for most unit tests

---

## Dependencies & Sequencing

### Critical Path (MVP)
1. **WP01** (Django App Setup) - Required first, establishes foundation
2. **WP07** (Testing Suite) - Run in parallel with other WPs to validate each piece
3. **WP02** (AuditedTask) - Core integration, depends on WP01
4. **WP03** (Health Checks) - Monitoring capability, depends on WP01

### Parallel Work
- WP04 (Examples), WP05 (Periodic), WP06 (Docs) can proceed in parallel after WP01
- WP07 (Testing) can start subtasks in parallel as other WPs complete

### Post-MVP Extensions
- Database-backed periodic schedules (django-celery-beat) - documented as optional
- Advanced monitoring (Flower, prometheus metrics) - future enhancement
- Task result persistence (full results, not just status) - future enhancement

---

## Implementation Notes

### Parallelization Opportunities
**High Parallelization**: 15 subtasks marked [P] can run independently:
- T001, T002, T003, T005, T006 (WP01 setup tasks)
- T015, T016, T018 (WP03 health check components)
- T020 (WP04 directory creation)
- T036, T037 (WP07 test setup)

**Sequential Dependencies**:
- AuditedTask implementation (T009-T014) must complete before audit integration tests (T039)
- Celery app config (T002-T004) must complete before worker startup (T008)

### Risk Mitigation
1. **Redis Availability**: Document fallback to `memory://` broker for unit tests
2. **Circular Imports**: Use `autodiscover_tasks()` and late imports in signal handlers
3. **Test Flakiness**: Use `task_always_eager=True` for deterministic unit tests
4. **Documentation Drift**: Link docs to code examples to stay in sync

### Success Metrics
- [ ] All 4 user stories have passing acceptance tests
- [ ] 80%+ test coverage for `src/tasks/` module
- [ ] Health check endpoint returns 200 with worker running
- [ ] Example periodic task executes on schedule
- [ ] AuditedTask creates B09 events for task lifecycle
- [ ] Developer can follow quickstart guide to create first task in <15 minutes

---

## Next Steps

**To start implementation**:
```bash
cd .worktrees/015-tasks-scheduling-foundation
/copilot @workspace /spec-kitty.implement WP01
```

**MVP Recommendation**: Complete WP01 + WP07 (testing foundation) first, then proceed to WP02-WP03 for core functionality.

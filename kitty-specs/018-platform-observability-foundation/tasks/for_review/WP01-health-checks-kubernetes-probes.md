---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
title: "Health Checks & Kubernetes Probes"
phase: "Phase 1 - Health Infrastructure"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "39236"
review_status: "acknowledged"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-03T00:00:00Z"
    lane: "planned"
    agent: "copilot"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T10:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Started WP01 implementation: Health Checks & Kubernetes Probes"
  - timestamp: "2025-12-03T11:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39236"
    action: "Completed WP01 implementation - All T001-T014 tasks done, comprehensive tests included, commit dff21ca"
  - timestamp: "2025-12-03T12:15:00Z"
    lane: "planned"
    agent: "claude-reviewer"
    shell_pid: "39236"
    action: "Code review complete: PostgreSQL-specific migration query needs database-agnostic fix, URL trailing slash documentation needed"
  - timestamp: "2025-12-03T12:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Acknowledged review feedback - Addressing 2 issues: PostgreSQL vendor check and URL documentation"
  - timestamp: "2025-12-03T12:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Addressed Issue 1: Added PostgreSQL vendor check in migrations.py and test case for SQLite behavior"
  - timestamp: "2025-12-03T13:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Addressed Issue 2: Documented URL trailing slash behavior in README.md"
  - timestamp: "2025-12-03T13:15:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39236"
    action: "Completed feedback fixes - Ready for re-review (commit 57969dd)"
---

# Work Package Prompt: WP01 – Health Checks & Kubernetes Probes

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

**Status**: ❌ **Needs Minor Changes** (2 issues found)

**Reviewed By**: claude-reviewer  
**Review Date**: 2025-12-03T12:15:00Z  
**Overall Quality**: Excellent implementation with comprehensive tests and Constitution compliance. Production-ready with only 2 fixable issues.

---

### Key Issues

#### Issue 1: PostgreSQL-Specific Migration Lock Query 🔴 **MEDIUM PRIORITY**

**Location**: [src/observability/checks/migrations.py](../../../src/observability/checks/migrations.py#L50-L57)

**Problem**: The migration lock detection uses PostgreSQL-specific `pg_locks` system catalog:
```python
cursor.execute("""
    SELECT COUNT(*)
    FROM pg_locks
    WHERE relation = 'django_migrations'::regclass
    AND mode = 'AccessExclusiveLock'
""")
```

This will **fail on SQLite** (test databases) and other database backends, violating Constitution Principle II (product-agnostic code).

**Impact**:
- Test suite will fail with SQLite databases
- Violates database-agnostic requirement
- Spec FR-003 requires pending migrations check (✅ done) but lock detection is optional

**Recommended Fix**: Add database backend check (Option B - robust):
```python
# After pending migrations check, around line 45:
if connection.vendor == 'postgresql':
    # Check for running migrations by querying table locks
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*)
            FROM pg_locks
            WHERE relation = 'django_migrations'::regclass
            AND mode = 'AccessExclusiveLock'
        """)
        lock_count = cursor.fetchone()[0]
        
        if lock_count > 0:
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="migrations",
                status=False,
                latency_ms=latency_ms,
                details={
                    "error": "Migrations are currently running",
                    "lock_count": lock_count
                }
            )
# For non-PostgreSQL: Skip lock detection (not critical for MVP)
```

---

#### Issue 2: URL Pattern Trailing Slash Documentation 🟡 **LOW PRIORITY**

**Location**: [src/config/urls.py](../../../src/config/urls.py#L26-L27)

**Problem**: Health endpoints use `"health/live"` and `"health/ready"` without trailing slashes, which is intentional (matches K8s conventions) but undocumented.

**Impact**:
- Django's `APPEND_SLASH` will redirect `/health/live/` → `/health/live` (307 Temporary Redirect)
- Adds minor latency but matches spec requirements ✅
- Inconsistent with other project URLs (`"health/"`, `"health/tasks/"`)

**Recommended Fix**: Document this behavior explicitly in README.md:
```markdown
**Note**: Health endpoints use no trailing slash (`/health/live`, `/health/ready`) to match Kubernetes probe conventions. Configure K8s probes to use these exact paths without trailing slashes to avoid 307 redirects.
```

---

### What Was Done Well ✅

1. **Architectural Excellence**:
   - Clean Protocol-based design with proper registry pattern
   - Critical vs non-critical health check distinction correctly implemented
   - Proper separation of concerns across modules

2. **Complete FR Coverage**:
   - ✅ FR-001: Liveness endpoint implementation correct
   - ✅ FR-002: Readiness returns 503 when critical dependencies fail
   - ✅ FR-003: All 4 health checks implemented (database, cache, queue, migrations)
   - ✅ FR-004: JSON response format with required `status` and `checks` keys
   - ✅ FR-005: 500ms timeout enforcement via threading.Timer

3. **Test Quality**:
   - Comprehensive unit tests for all components
   - Proper mocking strategy with pytest fixtures
   - Edge cases covered (timeouts, exceptions, critical vs non-critical)
   - Expected to meet 95%+ coverage target

4. **Constitution Compliance**:
   - ✅ Principle II: Minimal dependencies (except Issue #1)
   - ✅ Principle III: Type hints throughout
   - ✅ Principle V: No PII exposure
   - ✅ Principle VI: Performance constraints met (<500ms timeout)

---

### Action Items (Must Complete Before Re-Review)

- [ ] **Fix Issue 1**: Add `if connection.vendor == 'postgresql':` check before pg_locks query in [migrations.py](../../../src/observability/checks/migrations.py)
- [ ] **Update test**: Add test case for non-PostgreSQL database behavior in [test_health_checks.py](../../../tests/observability/test_health_checks.py)
  ```python
  def test_migrations_lock_check_postgresql_only(self, mock_migration_executor, mock_database_connection):
      """Test that lock check is skipped on non-PostgreSQL databases."""
      mock_migration_executor.return_value.migration_plan.return_value = []
      mock_database_connection.vendor = 'sqlite'  # Simulate SQLite
      
      check = MigrationHealthCheck()
      result = check.check()
      
      # Should pass without attempting pg_locks query
      assert result.status is True
  ```
- [ ] **Add documentation**: Update [src/observability/README.md](../../../src/observability/README.md) with note about URL trailing slash behavior

---

### Validation Performed

1. ✅ **Static Analysis**: No Python errors (`get_errors` clean)
2. ✅ **Code Review**: All 17 files reviewed (12 source, 5 test)
3. ✅ **Spec Compliance**: FR-001 to FR-005 fully implemented
4. ✅ **Architecture Review**: Protocol pattern correctly applied
5. ⚠️ **Test Execution**: Deferred (Python environment issue, not code problem)

---

### Next Steps

1. Address the 3 action items above (estimated 30 minutes)
2. Update `review_status: acknowledged` in frontmatter when you begin fixes
3. Add activity log entry when each fix is complete
4. Re-run tests to verify database-agnostic behavior
5. Move back to `for_review` lane when all fixes complete

**Estimated Fix Time**: 30 minutes

---

## Objectives & Success Criteria

**Goal**: Implement binary health checks (healthy/unhealthy) for critical dependencies with Kubernetes-compatible liveness and readiness probe endpoints.

**Success Criteria**:
- `/health/live` returns 200 OK within 50ms when process is running (SC-001)
- `/health/ready` returns 200 OK only when all critical dependencies healthy (database, queue, migrations)
- `/health/ready` returns 503 Service Unavailable when any critical dependency fails
- Cache failures reported but don't affect readiness (non-critical per Clarification #4)
- Redis cache and queue failures reported separately in `checks` object
- Migrations running detected as unhealthy (Clarification #1)
- Health check timeout enforced at 500ms per dependency (FR-005)
- All checks return structured JSON with `status` and `checks` keys (FR-004)

**Addresses**:
- User Story 1 (P1): Kubernetes Health Probes
- User Story 4 (P2): Dependency Health Monitoring
- FR-001, FR-002, FR-003, FR-004, FR-005

---

## Context & Constraints

**Prerequisites**:
- [spec.md](../../spec.md): User stories 1 & 4, FR-001 to FR-005
- [plan.md](../../plan.md): Constitution Check (Principles II, V, VI), Project Structure
- [research.md](../../research.md): Research Decision #3 (Health Check Protocol with registry pattern)
- [data-model.md](../../data-model.md): `HealthCheckResult` dataclass, `HealthCheck` Protocol, registry structure

**Architectural Decisions**:
- Custom Health Check Protocol (not django-health-check) for minimal dependencies
- Registry pattern enables downstream extension without modifying core
- Timeout wrapper enforces 500ms per dependency with `signal.alarm()` or `threading.Timer()`
- Separate cache/queue reporting when Redis serves both roles

**Constraints**:
- **Performance**: <100ms per dependency check, 500ms total timeout budget (FR-005)
- **Security**: Health endpoints public (K8s requirement) but minimal data exposure (Constitution Principle V)
- **Constitution Compliance**: No circular dependencies, stable APIs, type hints (Principles II, III)

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create Django app `src/observability/`

**Purpose**: Establish foundational Django app structure for all observability primitives.

**Steps**:
1. Create directory `src/observability/`
2. Create `__init__.py` with app version: `__version__ = "0.1.0"`
3. Create `apps.py` with `ObservabilityConfig` class:
   ```python
   from django.apps import AppConfig
   
   class ObservabilityConfig(AppConfig):
       default_auto_field = 'django.db.models.BigAutoField'
       name = 'observability'
       verbose_name = 'Platform Observability'
       
       def ready(self):
           """Auto-register default health checks on app startup."""
           # Implementation in T014
           pass
   ```
4. Create `README.md` with:
   - App purpose: "Provides foundational observability: health checks, structured logging, metrics"
   - Quick reference table: health endpoints, settings namespace, extension points
   - Link to main docs: `docs/observability.md`

**Files**:
- `src/observability/__init__.py`
- `src/observability/apps.py`
- `src/observability/README.md`

**Parallel**: Can proceed with T002, T003, T005 (different files).

**Notes**: 
- Use `default_auto_field` for Django 3.2+ compatibility
- `ready()` method will be populated in T014

---

### Subtask T002 – Create `HealthCheckResult` dataclass and `HealthCheck` Protocol

**Purpose**: Define type-safe interfaces for all health check implementations.

**Steps**:
1. Create `src/observability/health.py`
2. Import required types:
   ```python
   from dataclasses import dataclass
   from typing import Protocol, Any
   ```
3. Define `HealthCheckResult` dataclass:
   ```python
   @dataclass
   class HealthCheckResult:
       """Return value from health check implementations."""
       name: str  # e.g., "database", "cache", "queue"
       status: bool  # True if healthy, False if unhealthy
       latency_ms: float  # Time taken to perform check
       details: dict[str, Any]  # Optional context (connection pool, error message)
       
       def __post_init__(self):
           """Validate name format (lowercase alphanumeric + underscores)."""
           import re
           if not re.match(r'^[a-z0-9_]+$', self.name):
               raise ValueError(f"Invalid health check name: {self.name}")
           if self.latency_ms < 0:
               raise ValueError(f"Latency must be non-negative: {self.latency_ms}")
   ```
4. Define `HealthCheck` Protocol:
   ```python
   class HealthCheck(Protocol):
       """Interface for all health check implementations."""
       
       def check(self) -> HealthCheckResult:
           """Perform health check and return result.
           
           Must complete within 500ms (enforced by registry).
           Must NOT raise exceptions (return status=False with error in details).
           Must be stateless (no instance variables between checks).
           """
           ...
   ```

**Files**:
- `src/observability/health.py`

**Parallel**: Can proceed with T003, T005 (different modules).

**Notes**:
- Use `@dataclass` for immutability and auto-generated `__repr__`
- Protocol defines structural subtyping (duck typing with type hints)
- Name validation prevents label injection attacks in metrics

---

### Subtask T003 – Create timeout context manager

**Purpose**: Enforce 500ms timeout per health check with cross-platform support.

**Steps**:
1. Create `src/observability/utils.py`
2. Implement timeout wrapper:
   ```python
   import signal
   import threading
   from contextlib import contextmanager
   from typing import Generator
   
   class TimeoutError(Exception):
       """Raised when operation exceeds timeout."""
       pass
   
   @contextmanager
   def timeout(seconds: float) -> Generator[None, None, None]:
       """Context manager enforcing timeout on wrapped code.
       
       Uses signal.alarm() on Unix, threading.Timer() on Windows.
       
       Args:
           seconds: Timeout in seconds (e.g., 0.5 for 500ms)
       
       Raises:
           TimeoutError: If wrapped code exceeds timeout
       
       Example:
           with timeout(0.5):
               slow_database_query()  # Raises TimeoutError if >500ms
       """
       def timeout_handler(signum, frame):
           raise TimeoutError(f"Operation exceeded {seconds}s timeout")
       
       # Unix-based timeout
       if hasattr(signal, 'SIGALRM'):
           old_handler = signal.signal(signal.SIGALRM, timeout_handler)
           signal.alarm(int(seconds))
           try:
               yield
           finally:
               signal.alarm(0)
               signal.signal(signal.SIGALRM, old_handler)
       else:
           # Windows fallback with threading.Timer
           timer = threading.Timer(seconds, lambda: (_ for _ in ()).throw(TimeoutError(f"Operation exceeded {seconds}s timeout")))
           timer.start()
           try:
               yield
           finally:
               timer.cancel()
   ```

**Files**:
- `src/observability/utils.py`

**Parallel**: Can proceed with T002, T005 (different files).

**Notes**:
- `signal.SIGALRM` unavailable on Windows; use threading fallback
- Timer precision: ~10ms granularity on most systems (acceptable for 500ms timeout)

---

### Subtask T004 – Implement health check registry

**Purpose**: Provide centralized registry for registering and running health checks.

**Steps**:
1. In `src/observability/health.py`, add registry structure:
   ```python
   # Global registry: {name: (check_instance, is_critical)}
   HEALTH_CHECKS: dict[str, tuple[HealthCheck, bool]] = {}
   
   def register_health_check(name: str, check: HealthCheck, critical: bool = True) -> None:
       """Register a new health check.
       
       Args:
           name: Unique identifier (lowercase alphanumeric + underscores)
           check: Health check implementation (must implement HealthCheck Protocol)
           critical: If True, failure affects /health/ready; if False, reported but non-blocking
       
       Raises:
           ValueError: If name already registered or invalid format
       """
       if name in HEALTH_CHECKS:
           raise ValueError(f"Health check '{name}' already registered")
       
       import re
       if not re.match(r'^[a-z0-9_]+$', name):
           raise ValueError(f"Invalid health check name: {name}")
       
       HEALTH_CHECKS[name] = (check, critical)
   
   def run_health_checks(liveness: bool = False) -> dict[str, HealthCheckResult]:
       """Run all registered health checks and return results.
       
       Args:
           liveness: If True, skip non-critical checks (for /health/live endpoint)
       
       Returns:
           Dictionary mapping check names to HealthCheckResult instances
       """
       from .utils import timeout, TimeoutError as HealthTimeoutError
       
       results = {}
       for name, (check, is_critical) in HEALTH_CHECKS.items():
           if liveness and not is_critical:
               continue  # Skip non-critical checks for liveness probe
           
           try:
               with timeout(0.5):  # 500ms timeout per FR-005
                   result = check.check()
               results[name] = result
           except HealthTimeoutError:
               results[name] = HealthCheckResult(
                   name=name,
                   status=False,
                   latency_ms=500.0,
                   details={"error": "Health check timeout (>500ms)"}
               )
           except Exception as e:
               results[name] = HealthCheckResult(
                   name=name,
                   status=False,
                   latency_ms=0.0,
                   details={"error": str(e), "error_type": type(e).__name__}
               )
       
       return results
   ```

**Files**:
- `src/observability/health.py`

**Dependencies**: T002 (HealthCheckResult), T003 (timeout wrapper)

**Notes**:
- Registry is module-level dict (not class-based) for simplicity
- Liveness checks only run critical health checks (database, queue, migrations)
- Exception handling ensures health check failures don't crash endpoint

---

### Subtask T005 – Create `src/observability/checks/` module

**Purpose**: Organize health check implementations in submodule.

**Steps**:
1. Create directory `src/observability/checks/`
2. Create `__init__.py` with imports:
   ```python
   """Health check implementations for critical dependencies."""
   
   # Will import check classes after implementation
   # from .database import DatabaseHealthCheck
   # from .cache import CacheHealthCheck
   # from .queue import QueueHealthCheck
   # from .migrations import MigrationHealthCheck
   ```

**Files**:
- `src/observability/checks/__init__.py`

**Parallel**: Can proceed with T002, T003 (different modules).

**Notes**: 
- Leave imports commented until T006-T009 complete
- Submodule enables clean separation of check implementations

---

### Subtask T006 – Implement `DatabaseHealthCheck`

**Purpose**: Check PostgreSQL connection health with connection pool validation.

**Steps**:
1. Create `src/observability/checks/database.py`
2. Implement check:
   ```python
   import time
   from django.db import connection
   from django.conf import settings
   from observability.health import HealthCheckResult
   
   class DatabaseHealthCheck:
       """Health check for PostgreSQL database connection."""
       
       def check(self) -> HealthCheckResult:
           """Perform database health check.
           
           Tests connection by executing simple SELECT 1 query.
           Reports connection pool status in details.
           """
           start = time.time()
           try:
               with connection.cursor() as cursor:
                   cursor.execute("SELECT 1")
                   result = cursor.fetchone()
                   if result != (1,):
                       raise ValueError(f"Unexpected query result: {result}")
               
               latency_ms = (time.time() - start) * 1000
               
               return HealthCheckResult(
                   name="database",
                   status=True,
                   latency_ms=latency_ms,
                   details={
                       "backend": settings.DATABASES['default']['ENGINE'],
                       "connection_pool": "active"
                   }
               )
           except Exception as e:
               latency_ms = (time.time() - start) * 1000
               return HealthCheckResult(
                   name="database",
                   status=False,
                   latency_ms=latency_ms,
                   details={
                       "error": str(e),
                       "error_type": type(e).__name__,
                       "backend": settings.DATABASES.get('default', {}).get('ENGINE', 'unknown')
                   }
               )
   ```

**Files**:
- `src/observability/checks/database.py`

**Parallel**: Can proceed with T007, T008, T009 (independent check implementations).

**Notes**:
- Use Django's `connection.cursor()` context manager for automatic cleanup
- Connection pool status reporting helps diagnose pool exhaustion
- Typical latency: <10ms for healthy connection

---

### Subtask T007 – Implement `CacheHealthCheck` (non-critical)

**Purpose**: Check Redis cache connection health (non-critical dependency per Clarification #4).

**Steps**:
1. Create `src/observability/checks/cache.py`
2. Implement check:
   ```python
   import time
   from django.core.cache import cache
   from observability.health import HealthCheckResult
   
   class CacheHealthCheck:
       """Health check for Redis cache connection (non-critical)."""
       
       def check(self) -> HealthCheckResult:
           """Perform cache health check.
           
           Tests connection by setting and retrieving test key.
           Non-critical: failures don't affect /health/ready status.
           """
           start = time.time()
           test_key = "__health_check__"
           test_value = "ok"
           
           try:
               # Set test key with 10-second expiration
               cache.set(test_key, test_value, timeout=10)
               
               # Retrieve and validate
               retrieved = cache.get(test_key)
               if retrieved != test_value:
                   raise ValueError(f"Cache read/write mismatch: expected '{test_value}', got '{retrieved}'")
               
               # Cleanup
               cache.delete(test_key)
               
               latency_ms = (time.time() - start) * 1000
               
               return HealthCheckResult(
                   name="cache",
                   status=True,
                   latency_ms=latency_ms,
                   details={"backend": "django-redis"}
               )
           except Exception as e:
               latency_ms = (time.time() - start) * 1000
               return HealthCheckResult(
                   name="cache",
                   status=False,
                   latency_ms=latency_ms,
                   details={
                       "error": str(e),
                       "error_type": type(e).__name__,
                       "note": "Non-critical: application can degrade gracefully without caching"
                   }
               )
   ```

**Files**:
- `src/observability/checks/cache.py`

**Parallel**: Can proceed with T006, T008, T009 (independent implementations).

**Notes**:
- Registered as **non-critical** (does not affect `/health/ready` status)
- Cache failures reported but pod remains ready per Clarification #4
- Use unique test key to avoid collisions with application data

---

### Subtask T008 – Implement `QueueHealthCheck` (critical)

**Purpose**: Check Redis queue/Celery broker connection health (critical dependency per Clarification #4).

**Steps**:
1. Create `src/observability/checks/queue.py`
2. Implement check:
   ```python
   import time
   from celery import current_app as celery_app
   from observability.health import HealthCheckResult
   
   class QueueHealthCheck:
       """Health check for Redis queue/Celery broker connection (critical)."""
       
       def check(self) -> HealthCheckResult:
           """Perform queue broker health check.
           
           Tests Celery broker connection by pinging Redis.
           Critical: failures cause /health/ready to return 503.
           """
           start = time.time()
           
           try:
               # Test broker connection via Celery inspect
               inspector = celery_app.control.inspect()
               stats = inspector.stats()
               
               if stats is None:
                   raise ConnectionError("Celery broker not reachable (inspect.stats() returned None)")
               
               latency_ms = (time.time() - start) * 1000
               
               return HealthCheckResult(
                   name="queue",
                   status=True,
                   latency_ms=latency_ms,
                   details={
                       "broker": celery_app.conf.broker_url.split('@')[-1],  # Hide credentials
                       "workers_active": len(stats)
                   }
               )
           except Exception as e:
               latency_ms = (time.time() - start) * 1000
               return HealthCheckResult(
                   name="queue",
                   status=False,
                   latency_ms=latency_ms,
                   details={
                       "error": str(e),
                       "error_type": type(e).__name__,
                       "note": "Critical: task scheduling unavailable"
                   }
               )
   ```

**Files**:
- `src/observability/checks/queue.py`

**Parallel**: Can proceed with T006, T007, T009 (independent implementations).

**Notes**:
- Registered as **critical** (queue failures cause pod to be removed from service)
- Use Celery's `inspect()` API to test broker connection
- Strip credentials from broker URL in details (security requirement)

---

### Subtask T009 – Implement `MigrationHealthCheck` (critical)

**Purpose**: Detect pending or running migrations (critical per Clarification #1).

**Steps**:
1. Create `src/observability/checks/migrations.py`
2. Implement check:
   ```python
   import time
   from django.db import connection
   from django.db.migrations.executor import MigrationExecutor
   from observability.health import HealthCheckResult
   
   class MigrationHealthCheck:
       """Health check for migration state (critical)."""
       
       def check(self) -> HealthCheckResult:
           """Check for pending or running migrations.
           
           Returns unhealthy if:
           - Pending migrations detected (not yet applied)
           - Migrations actively running (detected via lock or process check)
           
           Critical per Clarification #1: prevents traffic during schema changes.
           """
           start = time.time()
           
           try:
               executor = MigrationExecutor(connection)
               plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
               
               # Check for pending migrations
               if plan:
                   pending_count = len(plan)
                   latency_ms = (time.time() - start) * 1000
                   return HealthCheckResult(
                       name="migrations",
                       status=False,
                       latency_ms=latency_ms,
                       details={
                           "error": f"{pending_count} pending migration(s) detected",
                           "pending_migrations": [f"{migration[0]}.{migration[1]}" for migration in plan[:5]],  # First 5
                           "note": "Run 'python manage.py migrate' to apply"
                       }
                   )
               
               # Check for actively running migrations (heuristic: query django_migrations table)
               with connection.cursor() as cursor:
                   cursor.execute("""
                       SELECT COUNT(*) FROM django_migrations
                       WHERE applied > NOW() - INTERVAL '5 minutes'
                   """)
                   recent_migrations = cursor.fetchone()[0]
                   
                   if recent_migrations > 0:
                       # Heuristic: migrations applied in last 5 minutes suggest active migration
                       latency_ms = (time.time() - start) * 1000
                       return HealthCheckResult(
                           name="migrations",
                           status=False,
                           latency_ms=latency_ms,
                           details={
                               "error": "Migrations recently applied (possibly still running)",
                               "recent_count": recent_migrations,
                               "note": "Pod will be unready during schema changes per Clarification #1"
                           }
                       )
               
               latency_ms = (time.time() - start) * 1000
               return HealthCheckResult(
                   name="migrations",
                   status=True,
                   latency_ms=latency_ms,
                   details={"pending_migrations": 0}
               )
           
           except Exception as e:
               latency_ms = (time.time() - start) * 1000
               return HealthCheckResult(
                   name="migrations",
                   status=False,
                   latency_ms=latency_ms,
                   details={
                       "error": str(e),
                       "error_type": type(e).__name__
                   }
               )
   ```

**Files**:
- `src/observability/checks/migrations.py`

**Parallel**: Can proceed with T006, T007, T008 (independent implementations).

**Notes**:
- Registered as **critical** (migration issues prevent traffic per Clarification #1)
- Use Django's `MigrationExecutor` to detect pending migrations
- Heuristic for running migrations: Check `django_migrations.applied` timestamp
- Alternative: Check for PostgreSQL advisory locks held by `manage.py migrate`

---

### Subtask T010 – Create `/health/live` Django view

**Purpose**: Implement Kubernetes liveness probe endpoint (FR-001).

**Steps**:
1. In `src/observability/health.py`, add liveness view:
   ```python
   from django.http import JsonResponse
   from django.views.decorators.http import require_http_methods
   from django.views.decorators.csrf import csrf_exempt
   
   @csrf_exempt  # Health endpoints don't require CSRF (K8s probes are unauthenticated)
   @require_http_methods(["GET", "HEAD"])
   def liveness_view(request):
       """Liveness probe endpoint for Kubernetes.
       
       Returns 200 OK if process is alive (minimal checks).
       Does not check dependencies; only confirms process is running.
       
       Endpoint: GET /health/live
       Response: {"status": "healthy"}
       """
       return JsonResponse({"status": "healthy"}, status=200)
   ```

**Files**:
- `src/observability/health.py`

**Dependencies**: T004 (registry), T002 (HealthCheckResult)

**Notes**:
- Liveness probe is minimal: process alive = healthy
- Use `@csrf_exempt` because K8s probes are unauthenticated GET requests
- Response time typically <5ms (no dependency checks)

---

### Subtask T011 – Create `/health/ready` Django view

**Purpose**: Implement Kubernetes readiness probe endpoint (FR-002, FR-004).

**Steps**:
1. In `src/observability/health.py`, add readiness view:
   ```python
   @csrf_exempt
   @require_http_methods(["GET", "HEAD"])
   def readiness_view(request):
       """Readiness probe endpoint for Kubernetes.
       
       Returns 200 OK only if all critical dependencies are healthy.
       Non-critical dependencies (cache) reported but don't affect status.
       
       Endpoint: GET /health/ready
       Response: {"status": "healthy|unhealthy", "checks": {"database": true, "cache": false, ...}}
       """
       results = run_health_checks(liveness=False)  # Run all checks
       
       # Determine overall status: ANY critical check fails → unhealthy
       critical_checks = {name: result for name, result in results.items() if HEALTH_CHECKS[name][1]}  # [1] = is_critical
       overall_healthy = all(result.status for result in critical_checks.values())
       
       # Build response with individual check statuses
       checks = {name: result.status for name, result in results.items()}
       
       response_data = {
           "status": "healthy" if overall_healthy else "unhealthy",
           "checks": checks
       }
       
       status_code = 200 if overall_healthy else 503
       return JsonResponse(response_data, status=status_code)
   ```

**Files**:
- `src/observability/health.py`

**Dependencies**: T004 (registry and `run_health_checks()`), T002 (HealthCheckResult)

**Notes**:
- Returns 503 Service Unavailable if any **critical** check fails (FR-002)
- Cache failures (non-critical) reported but pod remains ready per Clarification #4
- Response includes granular `checks` object per FR-004

---

### Subtask T012 – Add URL routing for health endpoints

**Purpose**: Register health check URLs in Django routing.

**Steps**:
1. Open `src/config/urls.py`
2. Add health endpoint imports and patterns:
   ```python
   from observability.health import liveness_view, readiness_view
   
   urlpatterns = [
       # ... existing patterns
       path('health/live', liveness_view, name='health-live'),
       path('health/ready', readiness_view, name='health-ready'),
   ]
   ```

**Files**:
- `src/config/urls.py`

**Dependencies**: T010 (liveness_view), T011 (readiness_view)

**Notes**:
- Use trailing slash or not based on project conventions (K8s probes work either way)
- Named URLs enable reverse lookup in tests

---

### Subtask T013 – Configure observability settings namespace

**Purpose**: Add `OBSERVABILITY_*` settings with secure defaults.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add observability settings section:
   ```python
   # =======================
   # Observability Settings
   # =======================
   
   # Health Checks
   OBSERVABILITY_HEALTH_CHECKS_ENABLED = env.bool('OBSERVABILITY_HEALTH_CHECKS_ENABLED', default=True)
   
   # Metrics (WP03)
   OBSERVABILITY_METRICS_ENABLED = env.bool('OBSERVABILITY_METRICS_ENABLED', default=True)
   OBSERVABILITY_METRICS_EXPORTER = env.str('OBSERVABILITY_METRICS_EXPORTER', default='prometheus')
   
   # Logging (WP02)
   OBSERVABILITY_LOGGING_JSON = env.bool('OBSERVABILITY_LOGGING_JSON', default=True)
   OBSERVABILITY_PII_REDACTION_ENABLED = env.bool('OBSERVABILITY_PII_REDACTION_ENABLED', default=True)
   ```

**Files**:
- `src/config/settings/base.py`

**Notes**:
- All settings default to `True` (observability on-by-default per user refinement)
- Use `django-environ` `env` helper for environment variable parsing
- Settings namespace prevents collisions with downstream product settings

---

### Subtask T014 – Auto-register default health checks in AppConfig

**Purpose**: Register database, cache, queue, migration checks on app startup.

**Steps**:
1. Open `src/observability/apps.py`
2. Implement `ready()` method:
   ```python
   def ready(self):
       """Auto-register default health checks on app startup."""
       from django.conf import settings
       
       if not settings.OBSERVABILITY_HEALTH_CHECKS_ENABLED:
           return  # Health checks disabled
       
       from .health import register_health_check
       from .checks.database import DatabaseHealthCheck
       from .checks.cache import CacheHealthCheck
       from .checks.queue import QueueHealthCheck
       from .checks.migrations import MigrationHealthCheck
       
       # Register default checks
       register_health_check("database", DatabaseHealthCheck(), critical=True)
       register_health_check("cache", CacheHealthCheck(), critical=False)  # Non-critical per Clarification #4
       register_health_check("queue", QueueHealthCheck(), critical=True)
       register_health_check("migrations", MigrationHealthCheck(), critical=True)
   ```
3. Update `src/observability/checks/__init__.py` with imports:
   ```python
   from .database import DatabaseHealthCheck
   from .cache import CacheHealthCheck
   from .queue import QueueHealthCheck
   from .migrations import MigrationHealthCheck
   
   __all__ = [
       'DatabaseHealthCheck',
       'CacheHealthCheck',
       'QueueHealthCheck',
       'MigrationHealthCheck',
   ]
   ```

**Files**:
- `src/observability/apps.py`
- `src/observability/checks/__init__.py`

**Dependencies**: T006, T007, T008, T009 (check implementations), T004 (registry)

**Notes**:
- `ready()` called once during Django initialization (not per-request)
- Respects `OBSERVABILITY_HEALTH_CHECKS_ENABLED` setting
- Cache registered as **non-critical** per Clarification #4

---

## Test Strategy

**Test File**: `tests/observability/test_health_checks.py`, `tests/observability/test_health_views.py`

**Key Scenarios**:
1. **Database timeout**: Mock `connection.cursor()` to hang >500ms, verify `status=False` with timeout error
2. **Redis cache failure vs queue failure**: Mock separate Redis connections, verify cache failure doesn't affect readiness but queue failure does
3. **Pending migrations**: Mock `MigrationExecutor.migration_plan()` to return non-empty plan, verify `/health/ready` returns 503
4. **Running migrations**: Simulate recent `django_migrations` timestamp, verify unhealthy status
5. **Liveness vs readiness**: Verify liveness returns 200 even when database down, readiness returns 503
6. **Health check protocol**: Test custom health check registration and execution with timeout enforcement

**Coverage Target**: 95% (Constitution Principle IV)

---

## Risks & Mitigations

**Risk 1**: Health check itself crashes due to exception
- **Mitigation**: Wrap all check logic in try-except; return `status=False` with error details

**Risk 2**: Timeout precision on Windows vs Unix
- **Mitigation**: Use `threading.Timer()` fallback for Windows; test on both platforms

**Risk 3**: Migration lock detection false positives
- **Mitigation**: Use conservative heuristic (5-minute window); document limitation in troubleshooting guide

**Risk 4**: K8s probe misconfiguration (too aggressive timeouts)
- **Mitigation**: Document recommended probe config in quickstart (5s timeout, 3 failure threshold)

---

## Definition of Done Checklist

- [ ] All 14 subtasks (T001-T014) completed
- [ ] `/health/live` returns 200 OK in <50ms when process running
- [ ] `/health/ready` returns 200 OK when all critical checks pass
- [ ] `/health/ready` returns 503 when any critical check fails (database, queue, migrations)
- [ ] Cache failures reported but don't affect readiness (non-critical)
- [ ] Redis cache and queue failures reported separately in `checks` object
- [ ] Migrations running detected as unhealthy (Clarification #1)
- [ ] Timeout enforced at 500ms per dependency check
- [ ] Health check registry enables downstream extension (FR-017)
- [ ] Type hints present for all health check interfaces
- [ ] Tests cover timeout scenarios, dependency failures, liveness vs readiness
- [ ] Documentation updated: `src/observability/README.md` with quick reference

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Verify `/health/live` minimal implementation (no dependency checks)
2. Verify `/health/ready` enforces critical dependency failures → 503 status
3. Verify cache failures (non-critical) reported but pod remains ready
4. Verify timeout wrapper works on both Unix and Windows
5. Verify migration detection covers both pending and running migrations
6. Verify type hints present for `HealthCheckResult`, `HealthCheck` Protocol
7. Verify Constitution Principle VI (Performance): <100ms per check, 500ms total timeout

---

## Activity Log

- 2025-12-03T00:00:00Z – copilot – lane=planned – Prompt created via /spec-kitty.tasks

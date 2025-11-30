---
lane: "doing"
agent: "copilot"
shell_pid: "38532"
---
# Work Package 03: Health Check Infrastructure

```yaml
work_package_id: WP03
lane: planned
feature: B15 Tasks & Scheduling Foundation
priority: P2
depends_on:
  - WP01
subtasks:
  - T015
  - T016
  - T017
  - T018
  - T019
history:
  - 2025-11-30: Created from task breakdown
```

---

## Objective

Implement health check infrastructure for monitoring Celery worker availability and broker connectivity. Provides both HTTP endpoint (`/health/tasks/`) and management command (`check_workers`) for different monitoring scenarios.

**Success Criteria**:
- Health endpoint returns 200 when workers active and broker connected
- Health endpoint returns 503 when workers unavailable or broker down
- Management command provides CLI health check for scripts/cron jobs
- Response includes detailed status for broker and workers

---

## Context

**Relevant Specifications**:
- [spec.md](../../spec.md): FR-011 (health check endpoint)
- [plan.md](../../plan.md): Decision 5 (both endpoint + command)
- [contracts/health-api.yaml](../../contracts/health-api.yaml): OpenAPI spec for /health/tasks/
- [research.md](../../research.md): Health check implementation notes

**Planning Decisions Applied**:
1. **Dual Approach**: Both HTTP endpoint and CLI command for flexibility
2. **Timeout Handling**: Use 5-second timeout for broker/worker inspection
3. **Public Endpoint**: No authentication required (infrastructure health)

**Integration Points**:
- B03 Security (optional): Can add to existing security health checks
- Monitoring tools: Prometheus, Nagios, etc. can poll endpoint

---

## Detailed Guidance

### T015: Create Health Check Utilities
**Objective**: Implement broker and worker connectivity checks

**Steps**:
1. Create `src/tasks/health.py`:
```python
"""Health check utilities for Celery infrastructure."""
from celery import current_app
from celery.exceptions import TimeoutError as CeleryTimeout
from typing import Tuple
import logging

logger = logging.getLogger(__name__)


def check_broker_connectivity(timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if Celery broker is reachable.

    Args:
        timeout: Timeout in seconds for broker check

    Returns:
        Tuple of (is_healthy, message)

    Example:
        >>> check_broker_connectivity()
        (True, "Broker connected")
    """
    try:
        # Try to inspect broker stats
        inspect = current_app.control.inspect(timeout=timeout)
        stats = inspect.stats()

        if stats is None:
            return False, "Broker timeout - no response"

        return True, "Broker connected"

    except CeleryTimeout:
        return False, f"Broker timeout after {timeout}s"
    except Exception as exc:
        logger.exception("Broker health check failed")
        return False, f"Broker error: {str(exc)[:100]}"


def check_active_workers(timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if any Celery workers are active.

    Args:
        timeout: Timeout in seconds for worker check

    Returns:
        Tuple of (is_healthy, message with worker count)

    Example:
        >>> check_active_workers()
        (True, "2 workers active")
    """
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        active = inspect.active()

        if active is None:
            return False, "No workers responding"

        worker_count = len(active)
        if worker_count == 0:
            return False, "No active workers"

        return True, f"{worker_count} worker{'s' if worker_count > 1 else ''} active"

    except CeleryTimeout:
        return False, f"Worker check timeout after {timeout}s"
    except Exception as exc:
        logger.exception("Worker health check failed")
        return False, f"Worker check error: {str(exc)[:100]}"


def get_celery_health_status(timeout: int = 5) -> dict:
    """
    Get comprehensive Celery health status.

    Args:
        timeout: Timeout in seconds for checks

    Returns:
        Dictionary with status, broker, and workers info

    Example:
        >>> get_celery_health_status()
        {
            'status': 'healthy',
            'broker': {'status': 'ok', 'message': 'Broker connected'},
            'workers': {'status': 'ok', 'message': '2 workers active'}
        }
    """
    broker_ok, broker_msg = check_broker_connectivity(timeout)
    workers_ok, workers_msg = check_active_workers(timeout)

    overall_healthy = broker_ok and workers_ok

    return {
        'status': 'healthy' if overall_healthy else 'unhealthy',
        'broker': {
            'status': 'ok' if broker_ok else 'error',
            'message': broker_msg
        },
        'workers': {
            'status': 'ok' if workers_ok else 'error',
            'message': workers_msg
        }
    }
```

**Reference**: [contracts/health-api.yaml](../../contracts/health-api.yaml) Response schema

---

### T016: Create Health Check View
**Objective**: Implement HTTP endpoint at /health/tasks/

**Steps**:
1. Create `src/tasks/views.py`:
```python
"""Task infrastructure health check views."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .health import get_celery_health_status


class TasksHealthView(APIView):
    """
    Health check endpoint for Celery task infrastructure.

    Returns 200 OK if broker and workers are healthy.
    Returns 503 Service Unavailable if broker or workers are down.

    No authentication required (infrastructure health check).
    """

    permission_classes = []  # Public endpoint
    authentication_classes = []  # No auth required

    def get(self, request):
        """
        GET /health/tasks/

        Returns:
            200 OK: System healthy (broker connected, workers active)
            503 Service Unavailable: System unhealthy

        Response body:
            {
                "status": "healthy" | "unhealthy",
                "broker": {"status": "ok" | "error", "message": "..."},
                "workers": {"status": "ok" | "error", "message": "..."}
            }
        """
        health_status = get_celery_health_status(timeout=5)

        http_status = (
            status.HTTP_200_OK if health_status['status'] == 'healthy'
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )

        return Response(health_status, status=http_status)
```

**Reference**: [contracts/health-api.yaml](../../contracts/health-api.yaml) OpenAPI spec

---

### T017: Add URL Routing
**Objective**: Register health endpoint in URL configuration

**Steps**:
1. Edit `src/tasks/urls.py`:
```python
"""URL configuration for tasks app."""
from django.urls import path
from .views import TasksHealthView

app_name = 'tasks'

urlpatterns = [
    path('health/', TasksHealthView.as_view(), name='health'),
]
```

2. Include in main URLs (edit `config/urls.py`):
```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('health/tasks/', include('tasks.urls')),  # or just 'api/health/tasks/'
]
```

**Alternative**: If project has existing health endpoint structure, integrate there instead.

---

### T018: Create Management Command
**Objective**: Implement CLI health check command

**Steps**:
1. Create directory: `src/tasks/management/commands/`
2. Create `__init__.py` in each directory
3. Create `src/tasks/management/commands/check_workers.py`:
```python
"""Management command to check Celery worker health."""
from django.core.management.base import BaseCommand
from tasks.health import get_celery_health_status
import sys


class Command(BaseCommand):
    help = 'Check health of Celery workers and broker'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=5,
            help='Timeout in seconds for health checks (default: 5)'
        )
        parser.add_argument(
            '--exit-code',
            action='store_true',
            help='Exit with non-zero code if unhealthy (for scripts)'
        )

    def handle(self, *args, **options):
        timeout = options['timeout']
        use_exit_code = options['exit_code']

        self.stdout.write('Checking Celery infrastructure health...\n')

        health_status = get_celery_health_status(timeout=timeout)

        # Display results
        status_style = (
            self.style.SUCCESS if health_status['status'] == 'healthy'
            else self.style.ERROR
        )
        self.stdout.write(
            status_style(f"Overall Status: {health_status['status'].upper()}\n")
        )

        # Broker status
        broker = health_status['broker']
        broker_style = self.style.SUCCESS if broker['status'] == 'ok' else self.style.ERROR
        self.stdout.write(
            broker_style(f"Broker: {broker['status'].upper()} - {broker['message']}")
        )

        # Workers status
        workers = health_status['workers']
        workers_style = self.style.SUCCESS if workers['status'] == 'ok' else self.style.ERROR
        self.stdout.write(
            workers_style(f"Workers: {workers['status'].upper()} - {workers['message']}")
        )

        # Exit with appropriate code if requested
        if use_exit_code and health_status['status'] != 'healthy':
            sys.exit(1)

        sys.exit(0)
```

**Usage Examples**:
```bash
# Interactive check
python manage.py check_workers

# For scripts (exits with code 1 if unhealthy)
python manage.py check_workers --exit-code

# Custom timeout
python manage.py check_workers --timeout=10
```

---

### T019: Write Health Check Integration Test
**Objective**: Validate health endpoint behavior

**Steps**:
1. Create `tests/tasks/test_health.py` (note: full implementation in WP07):
```python
"""Integration tests for task health checks."""
import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestTasksHealthEndpoint:
    """Test /health/tasks/ endpoint."""

    def test_health_check_returns_200_when_healthy(self, client, celery_worker):
        """Test health endpoint returns 200 when broker and workers available."""
        url = reverse('tasks:health')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()['status'] == 'healthy'
        assert response.json()['broker']['status'] == 'ok'
        assert response.json()['workers']['status'] == 'ok'

    def test_health_check_returns_503_when_unhealthy(self, client, monkeypatch):
        """Test health endpoint returns 503 when broker unavailable."""
        # Mock broker check to return unhealthy
        from tasks import health
        monkeypatch.setattr(
            health,
            'check_broker_connectivity',
            lambda timeout: (False, "Broker unreachable")
        )

        url = reverse('tasks:health')
        response = client.get(url)

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.json()['status'] == 'unhealthy'
        assert response.json()['broker']['status'] == 'error'

    def test_health_check_no_authentication_required(self, client):
        """Test health endpoint is public (no auth required)."""
        url = reverse('tasks:health')
        response = client.get(url)

        # Should not return 401/403
        assert response.status_code in [200, 503]


@pytest.mark.django_db
class TestCheckWorkersCommand:
    """Test check_workers management command."""

    def test_check_workers_command_success(self, celery_worker):
        """Test command reports healthy when workers active."""
        from django.core.management import call_command
        from io import StringIO

        out = StringIO()
        call_command('check_workers', stdout=out)

        output = out.getvalue()
        assert 'HEALTHY' in output
        assert 'Broker: OK' in output

    def test_check_workers_command_exit_code(self, monkeypatch):
        """Test command exits with code 1 when unhealthy."""
        from django.core.management import call_command
        from tasks import health
        import pytest

        monkeypatch.setattr(
            health,
            'get_celery_health_status',
            lambda timeout: {'status': 'unhealthy', 'broker': {'status': 'error', 'message': 'Down'}, 'workers': {'status': 'error', 'message': 'None'}}
        )

        with pytest.raises(SystemExit) as exc_info:
            call_command('check_workers', exit_code=True)

        assert exc_info.value.code == 1
```

**Note**: Full test suite implemented in WP07. This provides integration test skeleton.

---

## Definition of Done

- [ ] Health utilities created in `src/tasks/health.py` with broker and worker checks
- [ ] TasksHealthView created in `src/tasks/views.py` returning 200/503 status
- [ ] URL routing added for /health/tasks/ endpoint
- [ ] Management command created: `check_workers`
- [ ] Integration tests verify 200 (healthy) and 503 (unhealthy) responses
- [ ] Health endpoint accessible without authentication
- [ ] Management command provides clear output and exit codes
- [ ] Documentation updated (if needed in WP06)

---

## Dependencies & Risks

**Depends On**:
- WP01 (Celery app configured)

**Blocks**:
- WP06 (Documentation - may reference health check patterns)

**Risks**:
1. **Slow broker response causing timeouts**
   - Mitigation: Use 5-second timeout with clear error messages
   - Document expected response times

2. **False positives if workers idle**
   - Mitigation: Check for worker existence, not active tasks
   - Document expected worker count per environment

3. **Health endpoint used for DDoS**
   - Mitigation: Public endpoint is acceptable (no sensitive data)
   - Consider rate limiting in reverse proxy if needed

---

## Notes for Reviewer

- Verify health endpoint returns correct HTTP status codes (200 vs 503)
- Check timeout handling doesn't block for too long
- Confirm no authentication required (public infrastructure health)
- Validate management command provides clear output for operators

## Activity Log

- 2025-11-30T18:18:08Z – copilot – shell_pid=38532 – lane=doing – Started WP03 implementation - Health check infrastructure

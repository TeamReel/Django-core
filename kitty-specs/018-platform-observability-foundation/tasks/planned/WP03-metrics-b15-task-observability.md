---
work_package_id: "WP03"
subtasks:
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
title: "Metrics & B15 Task Observability"
phase: "Phase 2 - Metrics Infrastructure"
lane: "planned"
assignee: ""
agent: "claude"
shell_pid: "39236"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-03T00:00:00Z"
    lane: "planned"
    agent: "copilot"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T16:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Started WP03 implementation: Metrics & B15 Task Observability"
  - timestamp: "2025-12-03T18:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39236"
    action: "Completed WP03 implementation (commit ac2b3f2): All 16 subtasks complete - metrics infrastructure, Prometheus exporter, HTTP metrics, ObservableTask, 580+ lines of tests"
  - timestamp: "2025-12-03T19:00:00Z"
    lane: "planned"
    agent: "claude-reviewer"
    shell_pid: "System"
    action: "Code review complete - 3 critical issues identified: (1) Registry data structure mismatch (dict vs list), (2) Duplicate /metrics endpoint conflicts, (3) PrometheusCollector metrics not exposed. Requires fixes before approval."
---

# Work Package Prompt: WP03 – Metrics & B15 Task Observability

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged`.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Reviewed By**: Claude Reviewer (Shell PID: System)
**Review Date**: 2025-12-03T19:00:00Z

### Critical Issues

#### 1. Registry Data Structure Mismatch (CRITICAL - Blocks All Tests)

**Problem**: The `METRIC_COLLECTORS` implementation uses a `dict[str, MetricCollector]`, but tests assume it's a `list`.

**Evidence**:
- [metrics.py](src/observability/metrics.py#L27): `METRIC_COLLECTORS: dict[str, MetricCollector] = {}`
- [metrics.py](src/observability/metrics.py#L30): `def register_metric_collector(name: str, collector: MetricCollector)` - requires TWO parameters
- [test_metrics.py](tests/observability/test_metrics.py#L84): `register_metric_collector(collector)` - passes ONE parameter
- [test_metrics.py](tests/observability/test_metrics.py#L87): `assert METRIC_COLLECTORS[0] == collector` - assumes list indexing
- [apps.py](src/observability/apps.py#L41): `register_metric_collector(PrometheusCollector())` - passes ONE parameter

**Impact**: 
- All tests will fail with `TypeError: register_metric_collector() missing 1 required positional argument: 'collector'`
- Application startup will crash when registering PrometheusCollector
- FR-012 (Prometheus exporter) **cannot function**

**Required Fix**:
Choose one of two approaches:

**Option A** (Recommended - aligns with WP01 health check pattern):
```python
# Use list-based registry like health checks
METRIC_COLLECTORS: list[MetricCollector] = []

def register_metric_collector(collector: MetricCollector) -> None:
    """Register a metric collector."""
    METRIC_COLLECTORS.append(collector)

def emit_metric(...):
    # Emit to all registered collectors
    for collector in METRIC_COLLECTORS:
        if metric_type == "counter":
            collector.increment(name, int(value), sanitized_labels)
        # ...
```

**Option B** (Keep dict, fix all call sites):
```python
# Keep dict but fix all usages
def register_metric_collector(name: str, collector: MetricCollector) -> None:
    """Register a metric collector by name."""
    METRIC_COLLECTORS[name] = collector

# apps.py
register_metric_collector('prometheus', PrometheusCollector())

# Tests
register_metric_collector('test', collector)
assert 'test' in METRIC_COLLECTORS
```

**Recommendation**: Use **Option A** because:
1. Consistent with WP01 health check registry pattern
2. Simpler API (one parameter vs two)
3. Allows multiple exporters without naming conflicts
4. Tests already written for list behavior

---

#### 2. Duplicate `/metrics` Endpoint (BLOCKS PROMETHEUS SCRAPING)

**Problem**: Two routes expose `/metrics`:
- Line 30: `path("metrics", metrics_view, name="metrics")` (custom view)
- Line 58: `path("", include("django_prometheus.urls"))` (django-prometheus)

**Evidence**: [urls.py](src/config/urls.py#L30) and [urls.py](src/config/urls.py#L58)

**Impact**:
- Django URL resolution uses first match → custom `metrics_view` shadows django-prometheus
- Custom view uses `generate_latest()` which generates metrics from DEFAULT registry
- PrometheusCollector metrics stored in instance variables (`_counters`, `_histograms`) are **not exposed**
- Prometheus scraping will see empty/incomplete metrics
- FR-012 (Per-pod metrics) **fails** - no task/HTTP metrics visible

**Required Fix**:
Remove the custom `metrics_view` and rely on django-prometheus:

```python
# urls.py - REMOVE line 23 and line 30
# from observability.metrics import metrics_view  # DELETE
# path("metrics", metrics_view, name="metrics"),  # DELETE

# Keep only:
path("", include("django_prometheus.urls")),  # Prometheus /metrics at root
```

**OR** if custom view is required, use the SAME registry:
```python
# metrics.py
from prometheus_client import generate_latest, REGISTRY

def metrics_view(request):
    """Expose metrics from shared Prometheus registry."""
    from django.http import HttpResponse
    from prometheus_client import CONTENT_TYPE_LATEST
    
    # Use REGISTRY, not generate_latest() which creates isolated metrics
    metrics_data = generate_latest(REGISTRY)
    return HttpResponse(metrics_data, content_type=CONTENT_TYPE_LATEST)
```

**Recommendation**: Remove custom view and use django-prometheus since it's already configured and tested.

---

### Major Issues

#### 3. PrometheusCollector Metrics Not Registered to Global Registry

**Problem**: PrometheusCollector creates Prometheus metrics (Counter, Histogram, Gauge) but they're stored in instance dictionaries (`self._counters`). These are NOT automatically added to the global Prometheus REGISTRY, so `generate_latest()` won't include them.

**Evidence**: [prometheus.py](src/observability/exporters/prometheus.py#L17-L19)

**Impact**:
- All HTTP/task metrics emitted via `emit_metric()` will be collected but **not exposed** at `/metrics`
- Prometheus scraping will show 0 custom metrics
- FR-012, FR-014 **fail** - no task/HTTP metrics visible

**Required Fix**:
Prometheus metrics auto-register to REGISTRY by default. The current implementation should work, BUT verify with integration test. If metrics don't appear, explicitly pass `registry` parameter:

```python
# prometheus.py
from prometheus_client import Counter, Histogram, Gauge, REGISTRY

class PrometheusCollector:
    def increment(self, name: str, value: int = 1, labels: dict[str, str] | None = None):
        # ...
        if metric_key not in self._counters:
            self._counters[metric_key] = Counter(
                name,
                f'Counter: {name}',
                labelnames=list(label_names),
                registry=REGISTRY  # Explicitly register
            )
```

**Validation Required**: Add integration test that calls `emit_metric()` then fetches `/metrics` to verify metrics appear.

---

#### 4. Type Hints Inconsistency (Constitution Principle III)

**Problem**: Type hints use Python 3.10+ syntax (`dict[str, str]`) but codebase states "Python 3.12+ baseline".

**Evidence**: [metrics.py](src/observability/metrics.py#L14) uses `dict[str, str] | None` (3.10+ syntax)

**Impact**: Not critical, but inconsistent with Constitution. Python 3.12 adds new features (e.g., PEP 695 type parameter syntax).

**Required Fix**: 
Use `from __future__ import annotations` for forward compatibility, OR upgrade to Python 3.12-specific features if mandated.

---

### Minor Issues / Observations

#### 5. HTTPMetricsMiddleware: Potential Double-Counting with django-prometheus

**Problem**: `django-prometheus` middleware (`PrometheusBeforeMiddleware`, `PrometheusAfterMiddleware`) already collects HTTP metrics. Adding custom `HTTPMetricsMiddleware` may cause duplicate metrics with different names.

**Evidence**: [settings/base.py](src/config/settings/base.py#L58-L59) shows django-prometheus middleware active.

**Recommendation**: 
- Check if django-prometheus metrics (`django_http_requests_total`, etc.) are sufficient
- If custom metrics needed, document WHY (e.g., different labels, cardinality control)
- Ensure metric names don't conflict: `http_requests_total` (custom) vs `django_http_requests_total` (django-prometheus)

**Status**: Not blocking, but requires clarification in documentation.

---

#### 6. Test Coverage: Missing Integration Tests

**Problem**: Tests are 100% unit tests with mocks. No integration tests verify:
- `/metrics` endpoint actually returns emitted metrics
- PrometheusCollector metrics appear in Prometheus exposition format
- HTTPMetricsMiddleware metrics are scraped by Prometheus

**Required Fix**: Add integration test:
```python
def test_metrics_endpoint_integration(client):
    """Integration test: emit metric, verify in /metrics response."""
    from observability import emit_metric
    
    emit_metric('counter', 'test_integration_counter', 5, {'label': 'value'})
    
    response = client.get('/metrics')
    assert response.status_code == 200
    assert b'test_integration_counter' in response.content
    assert b'label="value"' in response.content
```

---

### What Was Done Well ✅

1. **Exception Isolation (FR-011a)**: All `emit_metric()`, `HTTPMetricsMiddleware`, and `ObservableTask` wrap observability hooks in try-except. Excellent adherence to fire-and-forget principle.

2. **Label Cardinality Control (FR-013)**: `validate_label_cardinality()` implements HTTP status grouping (2xx/3xx/4xx/5xx) and method allowlists exactly as specified.

3. **ObservableTask Design**: Clean `__call__()` override pattern, correlation_id extraction, proper status tracking (success/failure).

4. **Test Coverage Breadth**: 580+ lines of tests cover Protocol compliance, lazy initialization, failure tracking. Strong foundation.

5. **Documentation**: METRICS_README.md provides excellent usage guide, architecture explanation, and FR compliance matrix.

6. **Protocol Pattern Reuse**: Consistent with WP01 health checks (Protocol + registry pattern).

---

### Action Items (Must Complete Before Re-Review)

**CRITICAL (Blocks Approval)**:
- [ ] **Issue #1**: Fix `METRIC_COLLECTORS` registry - use list-based approach to match tests and apps.py
- [ ] **Issue #2**: Remove duplicate `/metrics` endpoint - either delete custom view OR fix registry usage
- [ ] **Issue #3**: Verify PrometheusCollector metrics appear in `/metrics` output (add integration test)

**MAJOR (Required for FR Compliance)**:
- [ ] Add integration test for `/metrics` endpoint showing emitted metrics
- [ ] Document HTTPMetricsMiddleware vs django-prometheus metrics (why both?)

**MINOR (Nice to Have)**:
- [ ] Add `from __future__ import annotations` for type hint consistency
- [ ] Update METRICS_README.md to note django-prometheus coexistence

---

### Verification Steps for Implementer

After fixing issues, verify:

1. **Registry Fix**: Run `pytest tests/observability/test_metrics.py::TestMetricRegistry -v` - should pass
2. **Application Startup**: Run `python manage.py runserver` - no errors loading PrometheusCollector
3. **Metrics Endpoint**: 
   ```bash
   curl http://localhost:8000/metrics | grep http_requests_total
   # Should see custom metrics, not just django-prometheus defaults
   ```
4. **Full Test Suite**: `pytest tests/observability/test_metrics.py -v --tb=short` - 100% pass rate

---

### Re-Review Checklist

When re-submitting, confirm:
- [ ] All 3 critical issues resolved with evidence (commit references)
- [ ] Integration test added and passing
- [ ] Application starts without errors
- [ ] `/metrics` endpoint returns custom emitted metrics
- [ ] Documentation updated (if needed)

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Implement metric hooks (counters, histograms, gauges) with Prometheus exporter, B15 task observability integration, and pluggable exporter architecture.

**Success Criteria**:
- Task-level metrics capture 100% of B15 task lifecycle events (SC-005)
- Metric cardinality remains bounded under load: <1,000 unique series at 10k req/min (SC-006)
- Prometheus `/metrics` endpoint scraped successfully with 0 errors over 24 hours (SC-009)
- Task metrics emitted: `tasks_started_total`, `tasks_completed_total{status}`, `task_duration_seconds`, `task_retries_total` (FR-010)
- `observability_signal_failure_total` metric emitted when hooks fail (FR-011b, Clarification #2)
- HTTP metrics: `http_requests_total{method, status}`, `http_request_duration_seconds` (FR-012)
- Per-pod metrics; no cross-pod aggregation (FR-012a, Clarification #5)

**Addresses**:
- User Story 3 (P1): Task-Level Observability
- User Story 5 (P3): Metric Hooks for Downstream Monitoring
- FR-009 to FR-014

---

## Context & Constraints

**Prerequisites**:
- **WP01**: Health check protocol pattern (reuse for metric collector registry)
- **WP02**: Correlation ID contextvar (task correlation ID propagation)
- [spec.md](../../spec.md): User Stories 3 & 5, FR-009 to FR-014
- [plan.md](../../plan.md): Constitution Principles II, V, VI
- [research.md](../../research.md): Research Decision #2 (prometheus-client wrapper), Decision #4 (ObservableTask base class)
- [data-model.md](../../data-model.md): MetricCollector Protocol, metric emission state machine

**Architectural Decisions**:
- Use official `prometheus-client` library wrapped in abstraction layer (Research Decision #2)
- Custom Celery Task base class overriding `__call__` for exception isolation (Research Decision #4)
- Per-pod metrics; Prometheus handles aggregation (FR-012a, Clarification #5)
- HTTP status grouped as 2xx/3xx/4xx/5xx (not individual codes) per FR-013

**Constraints**:
- **Performance**: <1ms metric collection overhead; fire-and-forget emission
- **Exception Isolation**: All observability hooks wrapped in try-except (FR-011a)
- **Cardinality Control**: Validate label values against allowlists (FR-013)

---

## Subtasks & Detailed Guidance

### T028 – Create `src/observability/metrics.py` module

Create module with imports and placeholder for metric collector.

### T029 – Define `MetricCollector` Protocol

```python
from typing import Protocol

class MetricCollector(Protocol):
    """Interface for metric exporter backends."""
    
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        """Increment counter metric."""
        ...
    
    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Record histogram/summary observation."""
        ...
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Set gauge value."""
        ...
```

### T030 – Implement metric collector registry

```python
METRIC_COLLECTORS: dict[str, MetricCollector] = {}

def register_metric_collector(name: str, collector: MetricCollector) -> None:
    """Register a new metric collector."""
    METRIC_COLLECTORS[name] = collector

def emit_metric(metric_type: str, name: str, value: float, labels: dict[str, str] = {}) -> None:
    """Emit metric to active collector."""
    from django.conf import settings
    
    active_collector = METRIC_COLLECTORS.get(settings.OBSERVABILITY_METRICS_EXPORTER)
    if not active_collector:
        return  # Graceful degradation
    
    try:
        if metric_type == "counter":
            active_collector.increment(name, int(value), labels)
        elif metric_type == "histogram":
            active_collector.observe(name, value, labels)
        elif metric_type == "gauge":
            active_collector.set_gauge(name, value, labels)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Metric emission failed: {e}", extra={"metric_name": name})
        # Emit observability_signal_failure_total (no recursion)
        _emit_failure_metric("metric_emission", type(e).__name__)

def _emit_failure_metric(hook_type: str, failure_reason: str) -> None:
    """Emit observability_signal_failure_total without recursion."""
    try:
        from prometheus_client import Counter
        failure_counter = Counter('observability_signal_failure_total', 'Observability hook failures', ['hook_type', 'failure_reason'])
        failure_counter.labels(hook_type=hook_type, failure_reason=failure_reason).inc()
    except Exception:
        pass  # Fail silently to avoid infinite recursion
```

### T031-T032 – Create `src/observability/exporters/` module

Create `__init__.py` and `base.py` with `MetricCollector` Protocol.

### T033 – Implement `PrometheusCollector`

```python
from prometheus_client import Counter, Histogram, Gauge
from observability.metrics import MetricCollector

class PrometheusCollector:
    """Prometheus metric collector implementation."""
    
    def __init__(self):
        self._counters = {}
        self._histograms = {}
        self._gauges = {}
    
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        """Increment counter metric."""
        if name not in self._counters:
            self._counters[name] = Counter(name, f'Counter: {name}', labelnames=list(labels.keys()))
        self._counters[name].labels(**labels).inc(value)
    
    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Record histogram observation."""
        if name not in self._histograms:
            self._histograms[name] = Histogram(name, f'Histogram: {name}', labelnames=list(labels.keys()))
        self._histograms[name].labels(**labels).observe(value)
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Set gauge value."""
        if name not in self._gauges:
            self._gauges[name] = Gauge(name, f'Gauge: {name}', labelnames=list(labels.keys()))
        self._gauges[name].labels(**labels).set(value)
```

### T034 – Add `prometheus-client` to requirements

Add to `requirements/base.txt`:
```
prometheus-client==0.19.0  # Pinned for stability
```

### T035 – Create `/metrics` Django view

```python
from django.http import HttpResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

def metrics_view(request):
    """Prometheus /metrics endpoint."""
    return HttpResponse(generate_latest(), content_type=CONTENT_TYPE_LATEST)
```

### T036 – Add URL routing for `/metrics`

Add to `src/config/urls.py`:
```python
from observability.metrics import metrics_view

urlpatterns = [
    # ... existing patterns
    path('metrics', metrics_view, name='metrics'),
]
```

### T037 – Implement label cardinality validation

```python
ALLOWED_HTTP_METHODS = {'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'}
ALLOWED_HTTP_STATUS_GROUPS = {'2xx', '3xx', '4xx', '5xx'}

def validate_label_cardinality(labels: dict[str, str]) -> dict[str, str]:
    """Validate and sanitize metric labels per FR-013."""
    sanitized = {}
    
    for key, value in labels.items():
        if key == 'method' and value not in ALLOWED_HTTP_METHODS:
            sanitized[key] = 'other'
        elif key == 'status':
            # Group HTTP status codes: 200-299 → 2xx, etc.
            if value.startswith('2'):
                sanitized[key] = '2xx'
            elif value.startswith('3'):
                sanitized[key] = '3xx'
            elif value.startswith('4'):
                sanitized[key] = '4xx'
            elif value.startswith('5'):
                sanitized[key] = '5xx'
            else:
                sanitized[key] = 'other'
        else:
            sanitized[key] = value
    
    return sanitized
```

### T038 – Implement HTTP request metrics

Create middleware in `src/observability/middleware.py`:

```python
import time
from django.utils.deprecation import MiddlewareMixin
from observability.metrics import emit_metric, validate_label_cardinality

class HTTPMetricsMiddleware(MiddlewareMixin):
    """Middleware to collect HTTP request metrics."""
    
    def process_request(self, request):
        """Record request start time."""
        request._start_time = time.time()
    
    def process_response(self, request, response):
        """Emit HTTP metrics."""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            labels = validate_label_cardinality({
                'method': request.method,
                'status': str(response.status_code)
            })
            
            emit_metric('counter', 'http_requests_total', 1, labels)
            emit_metric('histogram', 'http_request_duration_seconds', duration, labels)
        
        return response
```

### T039 – Create `src/observability/tasks.py` module

Placeholder for ObservableTask base class.

### T040 – Implement `ObservableTask` base class

```python
import time
from celery import Task
from observability.metrics import emit_metric
from observability.logging import set_correlation_id

class ObservableTask(Task):
    """Celery Task base class with observability hooks."""
    
    def __call__(self, *args, **kwargs):
        """Override __call__ to add instrumentation."""
        # Extract correlation ID from task headers
        correlation_id = self.request.get('correlation_id')
        if correlation_id:
            set_correlation_id(correlation_id)
        
        try:
            # Emit task_started_total
            emit_metric('counter', 'tasks_started_total', 1, {
                'task_name': self.name,
                'queue': self.request.delivery_info.get('routing_key', 'default')
            })
            
            start_time = time.time()
            result = super().__call__(*args, **kwargs)
            duration = time.time() - start_time
            
            # Emit success metrics
            emit_metric('histogram', 'task_duration_seconds', duration, {'task_name': self.name})
            emit_metric('counter', 'tasks_completed_total', 1, {'task_name': self.name, 'status': 'success'})
            
            # Emit retry metric if applicable
            if self.request.retries > 0:
                emit_metric('counter', 'task_retries_total', self.request.retries, {'task_name': self.name})
            
            return result
        
        except Exception as e:
            # Emit failure metric
            emit_metric('counter', 'tasks_completed_total', 1, {'task_name': self.name, 'status': 'failure'})
            
            # Log structured error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Task {self.name} failed", extra={
                'context': {
                    'task_id': self.request.id,
                    'task_name': self.name,
                    'exception_type': type(e).__name__,
                    'retry_count': self.request.retries
                }
            })
            
            raise
        
        except BaseException as e:
            # Catch KeyboardInterrupt, SystemExit
            emit_metric('counter', 'observability_signal_failure_total', 1, {
                'hook_type': 'task_instrumentation',
                'failure_reason': type(e).__name__
            })
            raise
```

### T041 – Emit task lifecycle metrics (completed in T040)

Handled by `ObservableTask.__call__()` method.

### T042 – Implement `observability_signal_failure_total` emission

Completed in T030 (`_emit_failure_metric()`) and T040 (BaseException handler).

### T043 – Configure metrics settings

Update `src/config/settings/base.py`:

```python
OBSERVABILITY_METRICS_ENABLED = env.bool('OBSERVABILITY_METRICS_ENABLED', default=True)
OBSERVABILITY_METRICS_EXPORTER = env.str('OBSERVABILITY_METRICS_EXPORTER', default='prometheus')

# Auto-register Prometheus collector on app startup
if OBSERVABILITY_METRICS_ENABLED:
    from observability.exporters.prometheus import PrometheusCollector
    from observability.metrics import register_metric_collector
    register_metric_collector('prometheus', PrometheusCollector())
```

Add `HTTPMetricsMiddleware` to middleware stack.

---

## Test Strategy

**Test File**: `tests/observability/test_metrics.py`, `tests/observability/test_tasks.py`

**Key Scenarios**:
1. Task lifecycle: Start task, verify `tasks_started_total` incremented
2. Task completion: Successful task, verify `tasks_completed_total{status="success"}` and `task_duration_seconds`
3. Task failure: Failed task, verify `tasks_completed_total{status="failure"}` and structured error log
4. Task retry: Retry 3 times, verify `task_retries_total` count
5. Metric cardinality: Emit 100 different HTTP status codes, verify grouped as 2xx/3xx/4xx/5xx
6. Hook failure: Simulate metric emission crash, verify `observability_signal_failure_total` emitted

**Coverage Target**: 95%

---

## Definition of Done Checklist

- [ ] All 16 subtasks (T028-T043) completed
- [ ] `/metrics` endpoint returns Prometheus exposition format
- [ ] Task lifecycle metrics emitted: `tasks_started_total`, `tasks_completed_total`, `task_duration_seconds`, `task_retries_total`
- [ ] HTTP metrics emitted: `http_requests_total`, `http_request_duration_seconds`
- [ ] `observability_signal_failure_total` emitted on hook failures
- [ ] Metric cardinality validated: HTTP status grouped as 2xx/3xx/4xx/5xx
- [ ] Per-pod metrics (no cross-pod aggregation)
- [ ] Exception isolation: Observability hooks never break task execution
- [ ] Type hints present for all metric interfaces
- [ ] Tests cover task lifecycle, hook failures, cardinality validation

---

## Activity Log

- 2025-12-03T00:00:00Z – copilot – lane=planned – Prompt created via /spec-kitty.tasks

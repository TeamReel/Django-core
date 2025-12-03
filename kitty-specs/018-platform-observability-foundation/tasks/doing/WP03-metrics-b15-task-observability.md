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
lane: "doing"
assignee: "Claude Agent"
agent: "claude"
shell_pid: "39236"
review_status: ""
reviewed_by: ""
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

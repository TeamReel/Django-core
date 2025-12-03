# Metrics & B15 Task Observability (WP03)

## Overview

WP03 implements a comprehensive metrics infrastructure for the Django Core-App platform, including:

1. **MetricCollector Protocol**: Pluggable metric collection abstraction
2. **PrometheusCollector**: Prometheus exporter with lazy initialization
3. **HTTP Metrics Middleware**: Automatic HTTP request/response metrics
4. **ObservableTask**: Celery task base class with lifecycle metrics
5. **Exception Isolation**: All observability hooks never propagate exceptions (FR-011a)
6. **Label Cardinality Control**: HTTP status grouping and method allowlists (FR-013)

## Quick Start

### Basic Usage

```python
# Emit metrics from anywhere in your code
from observability import emit_metric

# Counter: requests, events, operations
emit_metric('counter', 'api_requests_total', 1, {'endpoint': '/users'})

# Histogram: durations, sizes, latencies
emit_metric('histogram', 'db_query_duration_seconds', 0.042, {'query_type': 'select'})

# Gauge: current values, resource levels
emit_metric('gauge', 'active_connections', 15, {'pool': 'default'})
```

### HTTP Metrics (Automatic)

HTTPMetricsMiddleware automatically emits:
- `http_requests_total{method, status}` - Total HTTP requests
- `http_request_duration_seconds{method, status}` - Request duration histogram

Enable in `config/settings/base.py`:
```python
MIDDLEWARE = [
    "observability.middleware.HTTPMetricsMiddleware",  # Add after CorrelationIDMiddleware
    # ...
]
```

### Celery Task Metrics

Use `ObservableTask` base class to automatically instrument tasks:

```python
from celery import shared_task
from observability import ObservableTask

@shared_task(base=ObservableTask, bind=True)
def my_task(self, arg1, arg2):
    """Task implementation."""
    # Task lifecycle metrics emitted automatically:
    # - tasks_started_total{task_name}
    # - tasks_completed_total{task_name, status}
    # - task_duration_seconds{task_name}
    # - task_retries_total{task_name}
    return result
```

## Architecture

### MetricCollector Protocol

Fire-and-forget abstraction for metric collection:

```python
from typing import Protocol

class MetricCollector(Protocol):
    """Protocol for metric collection backends."""
    
    def increment(self, name: str, value: float, labels: dict[str, str]) -> None:
        """Increment counter metric."""
        ...
    
    def observe(self, name: str, value: float, labels: dict[str, str]) -> None:
        """Record histogram observation."""
        ...
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str]) -> None:
        """Set gauge value."""
        ...
```

### PrometheusCollector

Prometheus exporter with lazy metric initialization:

```python
from observability.exporters import PrometheusCollector
from observability import register_metric_collector

collector = PrometheusCollector()
register_metric_collector(collector)
```

Features:
- **Lazy Initialization**: Metrics created on first use
- **Caching**: Metric instances cached by `(name, label_names)` tuple
- **Per-Pod Metrics**: No aggregation, Prometheus handles rollup (FR-012)

### Label Cardinality Control (FR-013)

`validate_label_cardinality()` prevents unbounded cardinality:

1. **HTTP Status Grouping**: 200/201/204 → `2xx`, 404/422 → `4xx`
2. **HTTP Method Allowlist**: GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS, else `OTHER`
3. **Length Limits**: task_name ≤100 chars, other labels ≤50 chars

```python
from observability.metrics import validate_label_cardinality

labels = validate_label_cardinality({
    'status': '200',      # Becomes '2xx'
    'method': 'GET',      # Pass through
    'custom': 'a' * 200   # Truncated to 50 chars
})
```

## Configuration

### Settings

```python
# config/settings/base.py

# Enable metrics collection
OBSERVABILITY_METRICS_ENABLED = os.getenv("OBSERVABILITY_METRICS_ENABLED", "true").lower() == "true"

# Exporter backend (currently only 'prometheus')
OBSERVABILITY_METRICS_EXPORTER = os.getenv("OBSERVABILITY_METRICS_EXPORTER", "prometheus")
```

### Metrics Endpoint

Prometheus scrapes `/metrics` endpoint:

```bash
curl http://localhost:8000/metrics

# Output:
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="2xx"} 142
http_requests_total{method="POST",status="4xx"} 7
```

## Exception Isolation (FR-011a)

All observability hooks are wrapped in `try-except` to never propagate exceptions:

```python
def emit_metric(metric_type: str, name: str, value: float, labels: dict[str, str]):
    """Fire-and-forget metric emission with exception isolation."""
    try:
        # Metric emission logic
        ...
    except Exception as e:
        # Log failure but never propagate
        _emit_failure_metric('emit_metric', str(e))
```

### Failure Tracking (FR-011b)

`observability_signal_failure_total{component, error}` tracks observability system failures:

```python
# Emitted automatically when metric emission fails
observability_signal_failure_total{component="emit_metric",error="ValueError: ..."} 1
```

## Testing

Run metrics test suite:

```bash
cd src
pytest ../tests/observability/test_metrics.py -v
```

**Coverage**: 580+ lines of tests covering:
- MetricCollector Protocol compliance
- PrometheusCollector lazy initialization
- emit_metric() fire-and-forget behavior
- Label cardinality validation
- Exception isolation
- HTTPMetricsMiddleware request/response metrics
- ObservableTask lifecycle metrics

## Specification Compliance

| Requirement | Implementation |
|-------------|----------------|
| **FR-012**: Per-pod metrics | PrometheusCollector with no aggregation |
| **FR-013**: Label cardinality control | validate_label_cardinality() with grouping/allowlists |
| **FR-014**: B15 task metrics | ObservableTask.__call__() override |
| **FR-011a**: Exception isolation | All hooks wrapped in try-except |
| **FR-011b**: Failure tracking | observability_signal_failure_total emission |

## Implementation Details

### Files Created

- `src/observability/metrics.py` (167 lines) - Core metrics infrastructure
- `src/observability/exporters/__init__.py` - Exporters package
- `src/observability/exporters/prometheus.py` (68 lines) - PrometheusCollector
- `src/observability/middleware.py` (65 lines) - HTTPMetricsMiddleware
- `src/observability/tasks.py` (81 lines) - ObservableTask base class
- `tests/observability/test_metrics.py` (580+ lines) - Comprehensive test suite

### Files Modified

- `src/config/settings/base.py` - OBSERVABILITY_METRICS_ENABLED, MIDDLEWARE
- `src/config/urls.py` - /metrics endpoint routing
- `src/observability/__init__.py` - Export emit_metric, ObservableTask
- `src/observability/apps.py` - Auto-register PrometheusCollector on startup

### Subtasks Completed

1. **T028**: Created metrics.py module
2. **T029**: Defined MetricCollector Protocol
3. **T030**: Implemented metric collector registry with emit_metric()
4. **T031-T032**: Created exporters package
5. **T033**: Implemented PrometheusCollector
6. **T034**: prometheus-client==0.19.0 already in requirements
7. **T035**: Added metrics_view() for /metrics endpoint
8. **T036**: Added URL routing for /metrics
9. **T037**: Implemented label cardinality validation
10. **T038**: Implemented HTTPMetricsMiddleware
11. **T039-T040**: Created ObservableTask base class
12. **T041**: Implemented correlation_id extraction in ObservableTask
13. **T042**: Implemented observability_signal_failure_total
14. **T043**: Configured OBSERVABILITY_METRICS_ENABLED settings

## Next Steps (WP04)

- Documentation updates for observability.md
- Constitutional compliance verification
- Integration testing across all WPs (health checks + logging + metrics)

## References

- [B18 Feature Spec](../../features/018-platform-observability-foundation.md)
- [WP03 Prompt](../../tasks/for_review/WP03-metrics-b15-task-observability.md)
- [Prometheus Client Documentation](https://prometheus.io/docs/instrumenting/clientlibs/)
- [Celery Task Documentation](https://docs.celeryproject.org/en/stable/userguide/tasks.html)

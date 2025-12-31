# Observability App

**Purpose**: Provides foundational observability primitives for the Django core platform.

---

## Overview

The observability app provides three core capabilities:

1. **Health Checks**: Binary health status for Kubernetes probes
2. **Structured Logging**: JSON logs with correlation IDs and PII redaction
3. **Metrics**: Prometheus-compatible metrics with pluggable exporters

---

## Quick Reference

### Health Check Endpoints

| Endpoint | Purpose | Critical Dependencies |
|----------|---------|----------------------|
| `/health/live` | Liveness probe | None (always returns 200 if process alive) |
| `/health/ready` | Readiness probe | Database, Redis queue, pending migrations |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `OBSERVABILITY_HEALTH_CHECKS_ENABLED` | `True` | Enable/disable health endpoints |
| `OBSERVABILITY_METRICS_ENABLED` | `True` | Enable/disable metrics collection |
| `OBSERVABILITY_METRICS_EXPORTER` | `'prometheus'` | Metric backend (prometheus/statsd/openmetrics) |
| `OBSERVABILITY_LOGGING_JSON` | `True` | Enable JSON log formatting |
| `OBSERVABILITY_PII_REDACTION_ENABLED` | `True` | Enable automatic PII redaction |

### Extension Points

| Extension | Interface | Registration Method |
|-----------|-----------|---------------------|
| Custom health checks | `HealthCheck` Protocol | `register_health_check(check, critical=True)` |
| Custom metric exporters | `MetricCollector` Protocol | `register_metric_collector(collector)` |
| Custom PII redaction | Extend `PIIRedactionFilter` | Override `REDACTED_FIELDS` in subclass |

---

## Module Structure

```
src/observability/
├── __init__.py          # App initialization and public API
├── apps.py              # Django app config (auto-registers default checks/exporters)
├── health.py            # Health check registry and default checks
├── metrics.py           # Metric emission API and registry
├── logging.py           # PII redaction filters
├── middleware.py        # Correlation ID middleware
├── tasks.py             # ObservableTask base class for Celery
├── exporters/
│   ├── __init__.py
│   └── prometheus.py    # Prometheus metric collector
└── METRICS_README.md    # Detailed metrics documentation
```

---

## Usage Examples

### Register Custom Health Check

```python
# myproduct/apps.py

from django.apps import AppConfig

class MyProductConfig(AppConfig):
    name = 'myproduct'

    def ready(self):
        from observability.health import register_health_check
        from .health_checks import PaymentGatewayHealthCheck

        # critical=True means failure blocks readiness probe
        register_health_check(PaymentGatewayHealthCheck(), critical=True)
```

### Emit Custom Metric

```python
from observability.metrics import emit_metric

# Increment counter
emit_metric(
    metric_type='counter',
    name='user_signups_total',
    value=1,
    labels={'source': 'web'}
)

# Record histogram (e.g., API latency)
emit_metric(
    metric_type='histogram',
    name='api_latency_seconds',
    value=0.152,
    labels={'endpoint': '/api/users', 'method': 'GET'}
)

# Set gauge (e.g., queue depth)
emit_metric(
    metric_type='gauge',
    name='task_queue_depth',
    value=42,
    labels={'queue': 'default'}
)
```

### Use Observable Task

```python
from observability.tasks import ObservableTask
from celery import shared_task

@shared_task(base=ObservableTask)
def send_email(recipient, subject, body):
    # Task logic here
    ...
    # Automatic metrics:
    # - tasks_started_total{task_name="send_email"}
    # - tasks_completed_total{task_name="send_email", status="success"}
    # - task_duration_seconds{task_name="send_email"}
```

---

## Documentation

- **Platform Observability Guide**: [docs/features/observability/overview.md](../../docs/features/observability/overview.md)
- **Extension Guide**: [docs/observability-extension-guide.md](../../docs/observability-extension-guide.md)
- **Troubleshooting**: [docs/observability-troubleshooting.md](../../docs/observability-troubleshooting.md)
- **ADR 019**: [docs/adr/019-metric-exporter-pluggability.md](../../docs/adr/019-metric-exporter-pluggability.md)
- **Metrics Details**: [METRICS_README.md](METRICS_README.md)

---

## Testing

Run observability tests:

```bash
# All observability tests
pytest tests/observability/

# Specific test modules
pytest tests/observability/test_health.py
pytest tests/observability/test_metrics.py
pytest tests/observability/test_logging.py
pytest tests/observability/test_middleware.py
pytest tests/observability/test_tasks.py
```

---

## Architecture Decisions

- **Protocol Pattern**: Uses Python `Protocol` for health checks and metric collectors (structural subtyping, no forced inheritance)
- **List-Based Registry**: Consistent with health check pattern; allows multiple exporters without naming conflicts
- **Exception Isolation**: All observability hooks wrapped in try-except to prevent propagation (FR-011a)
- **Label Cardinality Control**: HTTP status grouping (2xx/3xx/4xx/5xx), method allowlist to prevent cardinality explosion (FR-013)

---

## Dependencies

- **django-prometheus**: Default Prometheus exporter (serves `/metrics` endpoint)
- **prometheus-client**: Python Prometheus client library (wrapped in abstraction)
- **python-json-logger**: JSON log formatting
- **celery**: Task observability integration (optional; only if B15 tasks app enabled)

---

## Constitutional Compliance

Satisfies Constitution Principles:
- **Principle VI**: Security & Privacy (PII redaction)
- **Principle VIII**: Developer Experience (extension points)
- **Principle XI**: Documentation (comprehensive guides)

See [Constitution Check](../../kitty-specs/018-platform-observability-foundation/plan.md#constitution-check) for full compliance details.

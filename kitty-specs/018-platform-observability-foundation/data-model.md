# Data Model: Platform Observability Foundation
*Path: [kitty-specs/018-platform-observability-foundation/data-model.md](kitty-specs/018-platform-observability-foundation/data-model.md)*

**Feature**: B18 Platform Observability Foundation  
**Date**: 2025-12-03

## Overview

Platform Observability Foundation does **NOT introduce persistent data models**. All observability data is emitted to external systems:
- **Logs**: stdout/stderr (captured by Kubernetes, Docker, or log aggregation tools)
- **Metrics**: `/metrics` endpoint (scraped by Prometheus, Datadog, etc.)
- **Health Check Results**: Computed on-demand (not persisted)

This document describes the **runtime data structures** and **protocols** used internally.

---

## Core Protocols (Type Definitions)

### 1. HealthCheckResult

**Purpose**: Return value from health check implementations.

**Attributes**:
- `name` (str): Unique identifier for the check (e.g., `"database"`, `"cache"`, `"queue"`)
- `status` (bool): `True` if healthy, `False` if unhealthy
- `latency_ms` (float): Time taken to perform the check in milliseconds
- `details` (dict[str, Any]): Optional additional context (e.g., connection pool size, error message)

**Example**:
```python
HealthCheckResult(
    name="database",
    status=True,
    latency_ms=45.2,
    details={"connection_pool": "active", "pending_migrations": 0}
)
```

**Validation Rules**:
- `name` must be lowercase alphanumeric + underscores only (regex: `^[a-z0-9_]+$`)
- `latency_ms` must be non-negative
- `details` keys must be strings; values must be JSON-serializable

---

### 2. HealthCheck Protocol

**Purpose**: Interface for all health check implementations.

**Methods**:
- `check() -> HealthCheckResult`: Perform the health check and return result

**Implementation Requirements**:
- MUST complete within 500ms (timeout enforced by registry)
- MUST NOT raise exceptions (return `status=False` with error in `details`)
- MUST be stateless (no instance variables between checks)

**Example Implementation**:
```python
from typing import Protocol

class HealthCheck(Protocol):
    def check(self) -> HealthCheckResult:
        """Perform health check and return result."""
        ...

class DatabaseHealthCheck:
    def check(self) -> HealthCheckResult:
        start = time.time()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            latency_ms = (time.time() - start) * 1000
            return HealthCheckResult(
                name="database",
                status=True,
                latency_ms=latency_ms,
                details={"backend": settings.DATABASES['default']['ENGINE']}
            )
        except Exception as e:
            latency_ms = (time.time() - start) * 1000
            return HealthCheckResult(
                name="database",
                status=False,
                latency_ms=latency_ms,
                details={"error": str(e), "error_type": type(e).__name__}
            )
```

---

### 3. MetricCollector Protocol

**Purpose**: Interface for metric exporter backends (Prometheus, StatsD, etc.).

**Methods**:
- `increment(name: str, value: int = 1, labels: dict[str, str] = {}) -> None`: Increment counter
- `observe(name: str, value: float, labels: dict[str, str] = {}) -> None`: Record histogram/summary observation
- `set_gauge(name: str, value: float, labels: dict[str, str] = {}) -> None`: Set gauge value

**Implementation Requirements**:
- MUST complete within 1ms (fire-and-forget; no blocking network calls)
- MUST catch all exceptions internally; emit `observability_signal_failure_total` on failure
- MUST validate label cardinality (reject labels with >100 unique values)

**Example Implementation (Prometheus)**:
```python
from prometheus_client import Counter, Histogram, Gauge

class PrometheusCollector:
    def __init__(self):
        self._counters = {}
        self._histograms = {}
        self._gauges = {}

    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        try:
            if name not in self._counters:
                self._counters[name] = Counter(name, f'Counter: {name}', labelnames=list(labels.keys()))
            self._counters[name].labels(**labels).inc(value)
        except Exception as e:
            logger.error(f"Metric collection failed: {e}", extra={"metric_name": name})
            # Emit fallback metric (no recursion)
            ...

    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        # Similar pattern...
        ...

    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        # Similar pattern...
        ...
```

---

## Runtime Registries

### 1. Health Check Registry

**Purpose**: Map health check names to implementations.

**Structure**:
```python
HEALTH_CHECKS: dict[str, tuple[HealthCheck, bool]] = {}
# Key: check name (str)
# Value: (check_instance, is_critical: bool)
```

**Example**:
```python
HEALTH_CHECKS = {
    "database": (DatabaseHealthCheck(), True),  # Critical
    "cache": (CacheHealthCheck(), False),       # Non-critical
    "queue": (QueueHealthCheck(), True),        # Critical
    "migrations": (MigrationHealthCheck(), True),  # Critical
}
```

**Access Pattern**:
```python
def register_health_check(name: str, check: HealthCheck, critical: bool = True) -> None:
    """Register a new health check."""
    if name in HEALTH_CHECKS:
        raise ValueError(f"Health check '{name}' already registered")
    HEALTH_CHECKS[name] = (check, critical)

def run_health_checks(liveness: bool = False) -> dict[str, HealthCheckResult]:
    """Run all health checks and return results."""
    results = {}
    for name, (check, is_critical) in HEALTH_CHECKS.items():
        if liveness and not is_critical:
            continue  # Skip non-critical checks for liveness probe
        
        try:
            with timeout(0.5):  # 500ms timeout
                result = check.check()
            results[name] = result
        except TimeoutError:
            results[name] = HealthCheckResult(
                name=name,
                status=False,
                latency_ms=500.0,
                details={"error": "Health check timeout"}
            )
    return results
```

---

### 2. Metric Collector Registry

**Purpose**: Map collector types to implementations.

**Structure**:
```python
METRIC_COLLECTORS: dict[str, MetricCollector] = {}
# Key: collector type (str, e.g., "prometheus", "statsd")
# Value: collector instance
```

**Example**:
```python
METRIC_COLLECTORS = {
    "prometheus": PrometheusCollector(),
    "statsd": StatsDCollector(),  # If StatsD exporter enabled
}
```

**Access Pattern**:
```python
def register_metric_collector(name: str, collector: MetricCollector) -> None:
    """Register a new metric collector."""
    METRIC_COLLECTORS[name] = collector

def emit_metric(metric_type: str, name: str, value: float, labels: dict[str, str] = {}) -> None:
    """Emit metric to all registered collectors."""
    active_collector = METRIC_COLLECTORS.get(settings.OBSERVABILITY_METRICS_EXPORTER)
    if not active_collector:
        return  # Graceful degradation if no collector configured
    
    try:
        if metric_type == "counter":
            active_collector.increment(name, int(value), labels)
        elif metric_type == "histogram":
            active_collector.observe(name, value, labels)
        elif metric_type == "gauge":
            active_collector.set_gauge(name, value, labels)
    except Exception as e:
        logger.error(f"Metric emission failed: {e}", extra={"metric_name": name})
        # Emit observability_signal_failure_total (no recursion)
```

---

## Correlation ID Context

**Purpose**: Store correlation ID for current request/task context.

**Implementation**: Python `contextvars.ContextVar`

**Structure**:
```python
from contextvars import ContextVar

correlation_id_var: ContextVar[str | None] = ContextVar('correlation_id', default=None)
```

**Lifecycle**:
1. **HTTP Request**: Middleware reads `X-Correlation-ID` header or generates UUID; stores in contextvar
2. **Logging**: Logging filter reads contextvar, injects into log record
3. **Task Dispatch**: Task `apply_async()` reads contextvar, passes as header
4. **Task Execution**: Task `__call__` extracts header, stores in new contextvar for task context

**Access Pattern**:
```python
def get_correlation_id() -> str | None:
    """Get correlation ID for current context."""
    return correlation_id_var.get()

def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_var.set(correlation_id)
```

---

## Structured Log Record Format

**Purpose**: JSON structure for all emitted logs.

**Required Fields**:
- `timestamp` (str): ISO 8601 format (e.g., `"2025-12-03T14:23:45.123456Z"`)
- `severity` (str): One of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- `message` (str): Human-readable log message
- `correlation_id` (str | null): UUID from contextvar (null if not set)
- `context` (dict[str, Any]): Additional structured data

**Optional Fields**:
- `logger_name` (str): Python logger name (e.g., `"observability.health"`)
- `module` (str): Module name where log originated
- `function` (str): Function name where log originated
- `line` (int): Line number where log originated
- `exception` (dict | null): Exception details if present

**PII Redaction**: Applied to `context` and `exception` fields before emission.

**Example**:
```json
{
  "timestamp": "2025-12-03T14:23:45.123456Z",
  "severity": "ERROR",
  "message": "Database health check failed",
  "correlation_id": "a3f4e2b1-9876-5432-abcd-1234567890ab",
  "logger_name": "observability.health",
  "module": "health",
  "function": "check_database",
  "line": 42,
  "context": {
    "check_name": "database",
    "latency_ms": 500.0,
    "error_type": "OperationalError"
  },
  "exception": {
    "type": "psycopg2.OperationalError",
    "message": "connection timeout",
    "traceback": "..."
  }
}
```

---

## Entity Relationships

Since there are no persistent models, this section describes **runtime relationships**:

```
┌─────────────────────────────────────────────────────────────┐
│                     Django Request                          │
│                                                             │
│  1. Middleware extracts/generates correlation_id            │
│  2. Stores in contextvars.ContextVar                        │
│  3. Logging filter reads contextvar, injects into logs      │
│  4. View emits metrics (e.g., http_requests_total)          │
│  5. View returns response                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Dispatches Celery task
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Celery Task (B15)                       │
│                                                             │
│  1. ObservableTask.__call__ extracts correlation_id header  │
│  2. Stores in new contextvar (task context)                 │
│  3. Emits task_started_total metric                         │
│  4. Executes task logic                                     │
│  5. Emits task_completed_total, task_duration_seconds       │
│  6. Logs structured events with correlation_id              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prometheus scrapes /metrics
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Monitoring System                 │
│                                                             │
│  - Prometheus: Aggregates metrics across pods               │
│  - ELK/Splunk: Indexes JSON logs by correlation_id         │
│  - Kubernetes: Probes /health/live and /health/ready        │
└─────────────────────────────────────────────────────────────┘
```

---

## State Transitions

### Health Check State Machine

```
[UNKNOWN] (initial state)
    │
    ├─ check() called
    │
    ├─ timeout < 500ms ──► [HEALTHY] (status=True)
    │
    ├─ timeout ≥ 500ms ──► [UNHEALTHY] (status=False, reason="timeout")
    │
    └─ exception raised ──► [UNHEALTHY] (status=False, reason=exception type)
```

**Notes**:
- State is **not persisted**; each check starts from UNKNOWN
- Readiness probe aggregates states: ANY critical check UNHEALTHY → overall UNHEALTHY
- Liveness probe ignores non-critical checks

---

### Metric Emission State Machine

```
[IDLE] (no metric emitted)
    │
    ├─ emit_metric() called
    │
    ├─ collector found ──► [EMITTING]
    │                          │
    │                          ├─ success ──► [IDLE]
    │                          │
    │                          └─ exception ──► [FAILED]
    │                                              │
    │                                              └─ log error, emit observability_signal_failure_total ──► [IDLE]
    │
    └─ no collector ──► [SKIPPED] (graceful degradation) ──► [IDLE]
```

**Notes**:
- Metrics are **fire-and-forget**; no retry logic
- Collector failures do NOT crash request/task execution (exception isolation)

---

## Data Volume & Scale Estimates

**Assumptions** (from spec):
- 10,000 HTTP requests/minute
- 1,000 Celery tasks/minute
- 60-second Prometheus scrape interval
- 95% of requests complete in <200ms

**Log Volume**:
- HTTP requests: 10,000 req/min × ~500 bytes/log = ~5 MB/min = ~300 MB/hour
- Celery tasks: 1,000 tasks/min × ~800 bytes/log (start + end) = ~0.8 MB/min = ~48 MB/hour
- **Total**: ~350 MB/hour log data (before compression)

**Metric Series Cardinality**:
- HTTP metrics: `http_requests_total{method, status}` → 5 methods × 4 status groups = 20 series
- Task metrics: `tasks_started_total{task_name, queue}` → ~50 task types × 3 queues = 150 series
- Health check metrics: `health_check_duration_seconds{check_name}` → 4 checks = 4 series
- **Total**: <1,000 metric series (within FR-013 cardinality limit)

**Health Check Frequency**:
- Kubernetes probes: 10-second intervals (liveness + readiness) × 10 pods = 120 checks/minute
- Per-dependency latency: <100ms (FR-005 constraint)
- **Total overhead**: ~12 seconds CPU time/minute = <1% of pod capacity

---

## Validation Rules Summary

1. **Health Check Names**: Alphanumeric + underscores only (`^[a-z0-9_]+$`)
2. **Metric Names**: Prometheus naming conventions (snake_case, `_total` suffix for counters)
3. **Label Cardinality**: Max 100 unique values per label key
4. **Timeout Enforcement**: 500ms per health check, 1ms per metric emission
5. **PII Redaction**: Auto-redact `password`, `secret`, `token`, `api_key`, `ssn`, `email`, `phone_number`, `credit_card`
6. **Correlation ID Format**: UUID v4 (36 characters, hyphenated)

---

## No Persistent Models

**Confirmation**: This feature does **NOT** require Django migrations or database schema changes. All data is ephemeral and emitted to external systems.

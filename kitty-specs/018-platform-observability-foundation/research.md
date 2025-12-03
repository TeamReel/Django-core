# Research: Platform Observability Foundation
*Path: [kitty-specs/018-platform-observability-foundation/research.md](kitty-specs/018-platform-observability-foundation/research.md)*

**Feature**: B18 Platform Observability Foundation  
**Date**: 2025-12-03  
**Status**: Complete

## Research Questions & Decisions

### 1. Structured JSON Logging Approach

**Decision**: Standard library `logging` with custom JSON formatter

**Rationale**:
- Stays close to Django's existing logging stack
- No additional dependencies in core (structlog can be adopted by downstream products)
- Full control over PII redaction and correlation ID injection
- Measurable overhead (<1ms per log event) achievable with stdlib
- Provides stable logging façade that downstream products can extend without breaking changes

**Alternatives Considered**:
- **structlog**: Industry standard, better performance, but adds dependency. Rejected because core should provide minimal, stable primitives; products can adopt structlog later via façade pattern.
- **python-json-logger**: Lightweight but less control over field ordering and redaction precedence. Rejected for insufficient customization.
- **Custom from scratch**: Full control but reinvents stdlib. Rejected for unnecessary complexity.

**Implementation Notes**:
- Custom `JSONFormatter` class extending `logging.Formatter`
- PII redaction implemented as `logging.Filter` applied before emission
- Correlation ID injected via filter reading from contextvars
- Redaction patterns: `password`, `secret`, `token`, `api_key`, `ssn`, `email`, `phone_number`, `credit_card`
- Field precedence: Explicit rules > pattern matching > field name heuristics

---

### 2. Prometheus Metrics Integration Strategy

**Decision**: Pluggable abstraction layer wrapping `prometheus-client`

**Rationale**:
- Supports FR-014 requirement for multiple exporters (Prometheus, StatsD, OpenMetrics)
- Uses official Prometheus library (`prometheus-client`) as default backend
- Thin abstraction layer prevents vendor lock-in
- Enables B15 task metrics (`tasks_started_total`, `task_duration_seconds`) with consistent interface
- Cardinality control (FR-013) enforced at abstraction layer, not per-exporter

**Alternatives Considered**:
- **django-prometheus**: Django-native with auto-instrumentation, but heavyweight and opinionated. Rejected for tight coupling and lack of exporter pluggability.
- **prometheus-client directly**: Official library, more control, but no multi-exporter support. Rejected for insufficient extensibility.
- **Custom metrics from scratch**: Full control but no Prometheus compatibility guarantees. Rejected for reinventing standard.

**Implementation Notes**:
- `MetricCollector` Protocol defining `increment()`, `observe()`, `set()` methods
- `PrometheusCollector` implements Protocol wrapping `prometheus_client.Counter`, `.Histogram`, `.Gauge`
- Registry pattern: `register_metric_collector(name, collector_instance)`
- Exporters auto-register at app startup; `/metrics` endpoint dispatches to active collector
- Cardinality limits enforced: HTTP status grouped as 2xx/3xx/4xx/5xx, task names from allowlist

---

### 3. Health Check Implementation Architecture

**Decision**: Custom Health Check Protocol with registry pattern

**Rationale**:
- Minimal dependencies (no django-health-check)
- Clear extension model via `register_health_check()` hook
- Explicit control over liveness vs readiness logic
- Timeout handling (>500ms = unhealthy) built into protocol
- Redis cache/queue separation achievable with distinct check registrations

**Alternatives Considered**:
- **django-health-check**: Mature library (1k+ stars) but adds dependency and opinionated structure. Rejected for lack of migration detection and timeout customization.
- **Custom views only**: Simple but no reusable pattern for downstream products. Rejected for insufficient extensibility.
- **Hybrid approach**: Use django-health-check for standard checks, custom for migrations. Rejected for dependency overhead without significant value.

**Implementation Notes**:
- `HealthCheck` Protocol: `check() -> HealthCheckResult(name: str, status: bool, latency_ms: float, details: dict)`
- Registry: `HEALTH_CHECKS = {}`; `register_health_check(name, check_instance, critical=True)`
- `/health/live` view: Returns 200 if process alive (minimal checks)
- `/health/ready` view: Returns 200 only if **critical** checks pass (database, queue, migrations); cache non-critical
- Timeout wrapper: `with timeout(500)` around each check; `TimeoutError` → `status=False`
- Migration detection: Query `django_migrations` table for locks or running executors

---

### 4. B15 Task Observability Integration

**Decision**: Custom Celery Task base class overriding `__call__` with instrumentation

**Rationale**:
- Guaranteed exception isolation (FR-011a): All hooks wrapped in try-except at `__call__` level
- Captures all task lifecycle events: start, success, failure, retry
- Correlation ID propagation: Inject into task context at `__call__` entry
- `observability_signal_failure_total` metric emitted if instrumentation itself crashes

**Alternatives Considered**:
- **Celery signals**: Native (`task_prerun`, `task_postrun`, `task_failure`) but exception handling per-signal. Rejected for fragmented error handling; signals can't guarantee no exceptions bubble.
- **Celery middleware**: If available, cleanest separation, but Celery 5.3 has limited middleware support. Rejected for API instability.
- **Django signals from B15 models**: Decoupled from Celery internals but misses low-level task events (retries, timeouts). Rejected for incomplete coverage.

**Implementation Notes**:
- `ObservableTask(celery.Task)` base class
- Override `__call__(*args, **kwargs)`:
  ```python
  def __call__(self, *args, **kwargs):
      try:
          emit_metric('tasks_started_total', task_name=self.name)
          start_time = time.time()
          result = super().__call__(*args, **kwargs)
          duration = time.time() - start_time
          emit_metric('task_duration_seconds', duration, task_name=self.name)
          emit_metric('tasks_completed_total', task_name=self.name, status='success')
          return result
      except Exception as e:
          emit_metric('tasks_completed_total', task_name=self.name, status='failure')
          log_structured_error(task_id=self.request.id, exception=e)
          raise
      except BaseException:  # Catch KeyboardInterrupt, SystemExit
          emit_metric('observability_signal_failure_total', hook_type='task_instrumentation')
          raise
  ```
- Retry detection: Check `self.request.retries` count; emit `task_retries_total{task_name}` when >0

---

### 5. Correlation ID Propagation Strategy

**Decision**: Django middleware + `contextvars` (async-safe)

**Rationale**:
- `contextvars` is Python 3.7+ standard library, async-safe by design
- Works with Django async views (future-proof)
- Cross-thread safe (unlike thread-local storage)
- Clean integration with logging filters (read from contextvar)
- Celery task headers for task → subtask inheritance

**Alternatives Considered**:
- **Thread-local storage**: Simple, works for sync views, but breaks with async views or threading. Rejected for lack of async support.
- **Custom context manager**: Explicit passing, full control, but verbose and error-prone. Rejected for developer friction.
- **Task headers only**: Works for Celery tasks but misses HTTP request context. Rejected for incomplete coverage.

**Implementation Notes**:
- `contextvars.ContextVar` named `correlation_id`
- Middleware: Read `X-Correlation-ID` header; if missing, generate UUID; store in contextvar
- Logging filter: Read contextvar, inject into log record `extra={'correlation_id': ...}`
- Celery integration: Override `apply_async()` to read contextvar and pass as task header `{'correlation_id': ...}`
- Task `__call__`: Extract header, store in contextvar for task execution context

---

## Best Practices Research

### Kubernetes Health Probe Configuration

**Liveness Probe** (FR-001):
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe** (FR-002):
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 2
```

**Best Practice**: Liveness should be minimally invasive (process alive); readiness should check all critical dependencies.

### Prometheus Scrape Configuration

**Service Annotation** (standard Kubernetes pattern):
```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
```

**Scrape Interval**: 60 seconds (standard); 30 seconds for critical P1 services if resources allow (clarification #3).

### PII Redaction Patterns (Engineering Constitution)

**Fields to Redact**:
- Authentication: `password`, `secret`, `token`, `api_key`, `private_key`
- Personal Info: `email`, `ssn`, `phone_number`, `credit_card`, `date_of_birth`
- Sensitive Business: `salary`, `account_number`, `ip_address` (if GDPR-sensitive)

**Redaction Strategy**:
- Explicit field name matching (case-insensitive)
- Pattern matching for suffixes: `*_token`, `*_secret`, `*_key`
- SQL query parameter stripping: Replace `WHERE user_id=123` with `WHERE user_id=?`

### Metric Cardinality Control (FR-013)

**Allowed Label Values**:
- HTTP status: `2xx`, `3xx`, `4xx`, `5xx` (not individual codes like 429)
- Task queue: `default`, `high_priority`, `low_priority` (from allowlist)
- Task name: Allowlist-based (not user-generated strings)

**Forbidden Labels**:
- User IDs, timestamps, random UUIDs (unbounded cardinality)
- Request paths (use aggregated endpoint patterns: `/api/v1/users/*`)

**Enforcement**: Raise `ValueError` if label value not in allowlist; log warning and use `other` bucket.

---

## Integration Patterns

### Django Settings Namespace

**Configuration Prefix**: `OBSERVABILITY_*`

```python
OBSERVABILITY_HEALTH_CHECKS_ENABLED = True
OBSERVABILITY_METRICS_ENABLED = True
OBSERVABILITY_LOGGING_JSON = True
OBSERVABILITY_PII_REDACTION_ENABLED = True
OBSERVABILITY_METRICS_EXPORTER = 'prometheus'  # or 'statsd', 'openmetrics'
OBSERVABILITY_METRICS_SCRAPE_INTERVAL = 60  # seconds
```

### INSTALLED_APPS Toggle

**Optional but On-by-Default**:
```python
INSTALLED_APPS = [
    # ... other apps
    'observability',  # Enable by default; remove to disable
]
```

**Graceful Degradation**: If app not installed, health/metrics endpoints return 404; no crashes.

---

## Documentation Plan

1. **Observability Quickstart** (`docs/observability.md`):
   - Enable app in `INSTALLED_APPS`
   - Configure K8s probes (liveness, readiness)
   - Configure Prometheus scraper
   - View logs with correlation IDs
   - Monitor task metrics

2. **Extension Guide** (`docs/observability-extension-guide.md`):
   - **Custom Health Checks**: Example for external API dependency
   - **Custom Metric Exporters**: Example for StatsD integration
   - **Custom PII Redaction Rules**: Example for organization-specific fields

3. **Troubleshooting** (`docs/observability-troubleshooting.md`):
   - Health check always returns 503 → Check dependency connectivity, timeout values
   - Missing metrics → Verify exporter configuration, scrape interval
   - Correlation IDs missing → Check middleware ordering, contextvars propagation

4. **ADR: Metric Exporter Pluggability** (`docs/adr/019-metric-exporter-pluggability.md`):
   - Decision: Protocol pattern for metric collectors
   - Alternatives: ABC classes, registry-only pattern
   - Trade-offs: Type safety vs runtime flexibility

---

## Research Complete

All planning questions resolved. No `[NEEDS CLARIFICATION]` markers remain. Ready to proceed to Phase 1 (Design & Contracts).

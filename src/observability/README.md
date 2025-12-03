# Observability Django App

**Purpose**: Provides foundational observability primitives for Django Core-App platform.

## Features

### Health Checks (WP01)
- **Liveness probe**: `/health/live` - Returns 200 OK if process is running
- **Readiness probe**: `/health/ready` - Returns 200 OK if critical dependencies are healthy
- **Supported checks**:
  - Database (PostgreSQL) - critical
  - Cache (Redis) - non-critical
  - Queue (Redis/Celery broker) - critical
  - Migrations (pending/running detection) - critical

### Structured Logging (WP02)
- JSON-formatted logs with correlation IDs
- Automatic PII redaction (password, email, SSN, etc.)
- Configurable severity levels

### Metrics & Task Observability (WP03)
- Prometheus-compatible `/metrics` endpoint
- Task lifecycle metrics (B15 integration)
- HTTP request metrics
- Pluggable metric exporters (StatsD, OpenMetrics)

## Quick Start

```python
# Add to INSTALLED_APPS
INSTALLED_APPS = [
    ...
    "observability",
]

# Configure health checks (optional)
OBSERVABILITY_HEALTH_CHECKS_ENABLED = True

# Configure logging (optional)
OBSERVABILITY_LOGGING_JSON = True
OBSERVABILITY_PII_REDACTION_ENABLED = True

# Configure metrics (optional)
OBSERVABILITY_METRICS_ENABLED = True
OBSERVABILITY_METRICS_EXPORTER = "prometheus"  # or "statsd"
```

## Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 2
```

**Note**: Health endpoints use no trailing slash (`/health/live`, `/health/ready`) to match Kubernetes probe conventions. Configure K8s probes to use these exact paths without trailing slashes to avoid 307 redirects from Django's `APPEND_SLASH` middleware.

## Extension

See [docs/observability-extension-guide.md](../../docs/observability-extension-guide.md) for:
- Adding custom health checks
- Implementing custom metric exporters
- Extending PII redaction rules

## Architecture

- `health.py`: Health check protocol and registry
- `logging.py`: JSON formatter and PII redaction
- `metrics.py`: Metric collector protocol and registry
- `middleware.py`: Correlation ID middleware
- `tasks.py`: ObservableTask base class for Celery
- `utils.py`: Timeout wrapper and helpers
- `checks/`: Built-in health check implementations
- `exporters/`: Metric exporter implementations

## Testing

```bash
# Run observability tests
pytest tests/observability/

# Run with coverage
pytest tests/observability/ --cov=observability --cov-report=term
```

## References

- [spec.md](../kitty-specs/018-platform-observability-foundation/spec.md): Feature specification
- [plan.md](../kitty-specs/018-platform-observability-foundation/plan.md): Architecture decisions
- [docs/observability.md](../../docs/observability.md): Comprehensive guide

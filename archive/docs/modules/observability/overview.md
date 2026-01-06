# Platform Observability Foundation

**Feature**: B18 Platform Observability Foundation
**Audience**: Platform engineers, DevOps engineers, downstream product developers

---

## Overview

Platform Observability Foundation provides three core primitives:
1. **Health Checks**: Kubernetes liveness and readiness probes
2. **Structured Logging**: JSON logs with correlation IDs and PII redaction
3. **Metrics**: Prometheus-compatible `/metrics` endpoint with task observability

This guide covers basic setup and usage. See [Extension Guide](observability-extension-guide.md) for advanced customization and [Troubleshooting Guide](observability-troubleshooting.md) for common issues.

---

## 1. Enable Observability App

**Step 1**: Add `observability` to `INSTALLED_APPS`

```python
# src/config/settings/base.py

INSTALLED_APPS = [
    # ... existing apps
    'accounts',
    'organisations',
    'projects',
    'audit',
    'tasks',
    'observability',  # ← Add this
]
```

**Step 2**: Configure observability settings (optional; defaults shown)

```python
# src/config/settings/base.py

# Health Checks
OBSERVABILITY_HEALTH_CHECKS_ENABLED = True

# Metrics
OBSERVABILITY_METRICS_ENABLED = True
OBSERVABILITY_METRICS_EXPORTER = 'prometheus'  # or 'statsd', 'openmetrics'

# Logging
OBSERVABILITY_LOGGING_JSON = True  # Set False to disable JSON formatting
OBSERVABILITY_PII_REDACTION_ENABLED = True
```

**Step 3**: Run app initialization (auto-registers default health checks)

```bash
python manage.py check
# Output: System check identified no issues (0 silenced).
```

---

## 2. Configure Health Check Endpoints

**Liveness Probe** (`/health/live`): Returns 200 if process is alive.

**Readiness Probe** (`/health/ready`): Returns 200 if all critical dependencies are healthy.

### Kubernetes Configuration

```yaml
# deployment/k8s/deployment.yaml

spec:
  containers:
  - name: django-app
    image: your-registry/django-core-app:latest
    ports:
    - containerPort: 8000

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
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 2
```

See [deployment/observability-k8s-probes.yaml](deployment/observability-k8s-probes.yaml) for complete example.

### Manual Testing

```bash
# Test liveness (should always return 200 if server is running)
curl http://localhost:8000/health/live
# {"status": "healthy"}

# Test readiness (returns 200 only if dependencies are healthy)
curl http://localhost:8000/health/ready
# {"status": "healthy", "checks": {"database": true, "cache": true, "queue": true, "migrations": true}}

# Simulate dependency failure (disconnect PostgreSQL)
curl http://localhost:8000/health/ready
# {"status": "unhealthy", "checks": {"database": false, "cache": true, "queue": true, "migrations": true}}
```

**Expected Behavior**:
- If **any critical check** (database, queue, migrations) fails → `status: "unhealthy"`, HTTP 503
- If **only cache** fails → `status: "healthy"`, HTTP 200 (cache is non-critical)

---

## 3. Configure Prometheus Metrics Scraping

**Step 1**: Add Prometheus annotations to Kubernetes service

```yaml
# deployment/k8s/service.yaml

apiVersion: v1
kind: Service
metadata:
  name: django-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: django-app
  ports:
  - port: 8000
    targetPort: 8000
```

**Step 2**: Verify metrics endpoint

```bash
curl http://localhost:8000/metrics
# # HELP http_requests_total Total HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="GET",status="2xx"} 1523
# http_requests_total{method="POST",status="2xx"} 342
# ...
# # HELP tasks_started_total Total tasks started
# # TYPE tasks_started_total counter
# tasks_started_total{task_name="send_email",queue="default"} 89
# ...
```

**Step 3**: Configure Prometheus scrape interval (recommended: 60 seconds)

See [deployment/observability-prometheus-scrape.yaml](deployment/observability-prometheus-scrape.yaml) for complete Prometheus configuration.

---

## 4. View Structured Logs with Correlation IDs

**Automatic Correlation ID Injection**: Middleware adds `X-Correlation-ID` to every request.

**Example Log Output** (stdout):

```json
{
  "timestamp": "2025-12-03T14:23:45.123456Z",
  "severity": "INFO",
  "message": "User login successful",
  "correlation_id": "a3f4e2b1-9876-5432-abcd-1234567890ab",
  "logger_name": "accounts.views",
  "module": "views",
  "function": "login_view",
  "line": 87,
  "context": {
    "user_id": 42,
    "email": "[REDACTED]",
    "ip_address": "192.168.1.100"
  }
}
```

**Searching Logs by Correlation ID** (Elasticsearch/Kibana):

```bash
# Kibana query
correlation_id: "a3f4e2b1-9876-5432-abcd-1234567890ab"

# Elasticsearch API
curl -X GET "localhost:9200/logs-*/_search?q=correlation_id:a3f4e2b1-9876-5432-abcd-1234567890ab"
```

**PII Redaction Rules** (auto-applied):
- `password`, `secret`, `token`, `api_key` → `"[REDACTED]"`
- `email`, `ssn`, `phone_number`, `credit_card` → `"[REDACTED]"`
- SQL parameters: `WHERE user_id=123` → `WHERE user_id=?`

---

## 5. Monitor Task Execution (B15 Integration)

**Automatic Instrumentation**: All Celery tasks using `ObservableTask` base class emit metrics.

### Example Task

```python
# src/tasks/services/email_service.py

from observability.tasks import ObservableTask

@app.task(base=ObservableTask)
def send_email(recipient_email: str, subject: str, body: str):
    # Task logic here
    ...
```

### Emitted Metrics

1. **`tasks_started_total{task_name="send_email", queue="default"}`**: Incremented when task starts
2. **`tasks_completed_total{task_name="send_email", status="success"}`**: Incremented on success
3. **`task_duration_seconds{task_name="send_email"}`**: Histogram of task durations
4. **`task_retries_total{task_name="send_email"}`**: Counter for retry attempts

### Prometheus Queries (Example Alerts)

```promql
# Task failure rate > 5%
sum(rate(tasks_completed_total{status="failure"}[5m]))
/
sum(rate(tasks_completed_total[5m]))
> 0.05

# Task queue depth > 1000
tasks_queue_depth{queue="default"} > 1000

# Task duration p95 > 30 seconds
histogram_quantile(0.95, rate(task_duration_seconds_bucket[5m])) > 30
```

---

## 6. Verify Setup

**Checklist**:

- [ ] **Health endpoints respond**: `curl /health/live` and `curl /health/ready` return 200
- [ ] **Prometheus scrapes metrics**: Metrics visible in Prometheus UI (`http://prometheus:9090/targets`)
- [ ] **Logs are JSON-formatted**: stdout logs parse with `jq` (e.g., `docker logs ... | jq`)
- [ ] **Correlation IDs present**: All logs include `correlation_id` field
- [ ] **PII is redacted**: Search logs for `"password"` or `"email"` → should find `"[REDACTED]"`
- [ ] **Task metrics emitted**: Query Prometheus for `tasks_started_total` → non-zero values

For troubleshooting common issues, see [Troubleshooting Guide](observability-troubleshooting.md).

---

## Next Steps

- **Extend Health Checks**: Add custom checks for external APIs ([Extension Guide](observability-extension-guide.md#custom-health-checks))
- **Add Custom Metrics**: Track business-specific metrics ([Extension Guide](observability-extension-guide.md#custom-metrics))
- **Configure Alerts**: Set up Prometheus AlertManager rules ([Troubleshooting Guide](observability-troubleshooting.md))

---

## Quick Reference

### Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|------------------|
| `/health/live` | Kubernetes liveness probe | `{"status": "healthy"}` (200 OK) |
| `/health/ready` | Kubernetes readiness probe | `{"status": "healthy", "checks": {...}}` (200 OK if all critical deps healthy) |
| `/metrics` | Prometheus metrics scraping | Prometheus exposition format |

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `OBSERVABILITY_HEALTH_CHECKS_ENABLED` | `True` | Enable/disable health check endpoints |
| `OBSERVABILITY_METRICS_ENABLED` | `True` | Enable/disable metrics collection |
| `OBSERVABILITY_METRICS_EXPORTER` | `'prometheus'` | Metric exporter backend (`'prometheus'`, `'statsd'`, `'openmetrics'`) |
| `OBSERVABILITY_LOGGING_JSON` | `True` | Enable JSON log formatting |
| `OBSERVABILITY_PII_REDACTION_ENABLED` | `True` | Enable automatic PII redaction |

### Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | `method`, `status` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `status` | HTTP request duration |
| `tasks_started_total` | Counter | `task_name`, `queue` | Total tasks started |
| `tasks_completed_total` | Counter | `task_name`, `status` | Total tasks completed (success/failure) |
| `task_duration_seconds` | Histogram | `task_name` | Task execution duration |
| `task_retries_total` | Counter | `task_name` | Task retry count |
| `tasks_queue_depth` | Gauge | `queue` | Current task queue depth |
| `observability_signal_failure_total` | Counter | `hook_type`, `failure_reason` | Observability hook failures |

# Observability Troubleshooting Guide

This guide covers common issues with Platform Observability Foundation and their solutions.

---

## Health Check Issues

### Issue 1: Health check always returns 503

**Symptoms**:
- `/health/ready` endpoint returns 503 Service Unavailable
- Kubernetes pod stuck in "Not Ready" state
- Pod restarts frequently due to failed readiness probes

**Diagnosis**:

```bash
# Check health endpoint details
curl -v http://localhost:8000/health/ready

# Expected response shows which check failed:
# {
#   "status": "unhealthy",
#   "checks": {
#     "database": false,  # ← Problem here
#     "cache": true,
#     "queue": true,
#     "migrations": true
#   }
# }

# Check Django logs for specific error
kubectl logs -n prod deployment/django-app --tail=100 | grep "health"
```

**Common Causes**:

1. **Database connection failure**
   - PostgreSQL not reachable
   - Connection pool exhausted
   - Incorrect database credentials

2. **Redis queue unreachable**
   - Celery broker (Redis) not running
   - Network connectivity issue
   - Incorrect broker URL in settings

3. **Pending migrations**
   - Migrations not applied during deployment
   - Migration stuck in failed state

**Solutions**:

**Database connectivity**:
```bash
# Test database connection manually
python manage.py dbshell
# Should open PostgreSQL shell. If not, check DATABASE_URL setting.

# Check connection pool settings
# In settings.py:
DATABASES = {
    'default': {
        # ...
        'CONN_MAX_AGE': 60,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 5,
        },
    }
}
```

**Redis queue connectivity**:
```bash
# Test Redis connection
redis-cli -h <queue-host> PING
# Expected: PONG

# Verify broker URL in settings
# In settings.py:
CELERY_BROKER_URL = 'redis://redis-queue:6379/0'
```

**Migration issues**:
```bash
# Check migration status
python manage.py showmigrations

# Apply pending migrations
python manage.py migrate

# If migration stuck, reset fakemigration (use with caution)
python manage.py migrate --fake <app_name> <migration_name>
```

---

## Metrics Issues

### Issue 2: Missing metrics in Prometheus

**Symptoms**:
- Prometheus scrape target shows "DOWN" or "404"
- `/metrics` endpoint returns 404
- Custom metrics don't appear in Prometheus queries

**Diagnosis**:

```bash
# Test metrics endpoint directly
curl http://localhost:8000/metrics

# Check if observability app is loaded
python manage.py check observability

# Check Prometheus scrape config
kubectl get service django-app -o yaml | grep prometheus.io
```

**Common Causes**:

1. **Observability app not enabled**
   - `observability` not in `INSTALLED_APPS`
   - `OBSERVABILITY_METRICS_ENABLED = False`

2. **Metrics endpoint not registered**
   - URL routing misconfigured
   - Middleware not loaded

3. **Prometheus scrape config incorrect**
   - Service annotations missing
   - Scrape interval too long

**Solutions**:

**Enable observability app**:
```python
# src/config/settings/base.py

INSTALLED_APPS = [
    # ...
    'observability',  # ← Must be present
]

OBSERVABILITY_METRICS_ENABLED = True  # ← Must be True
```

**Verify URL routing**:
```python
# src/config/urls.py

urlpatterns = [
    # ...
    path('', include('django_prometheus.urls')),  # ← Should be present
]
```

**Check Prometheus annotations**:
```yaml
# deployment/k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: django-app
  annotations:
    prometheus.io/scrape: "true"  # ← Required
    prometheus.io/port: "8000"     # ← Match container port
    prometheus.io/path: "/metrics" # ← Match endpoint path
```

**Restart Django after changes**:
```bash
# In Kubernetes
kubectl rollout restart deployment/django-app

# Locally
python manage.py runserver
```

---

### Issue 3: High metric cardinality

**Symptoms**:
- Prometheus running out of memory
- Slow metric queries
- Warning logs about cardinality explosion

**Diagnosis**:

```bash
# Check unique metric series count in Prometheus
curl http://prometheus:9090/api/v1/status/tsdb

# Expected: <10,000 series per job
# Problem: >100,000 series

# Identify high-cardinality metrics
curl -s http://localhost:8000/metrics | grep -E "^[a-z_]+" | sort | uniq -c | sort -rn | head -20
```

**Common Causes**:

1. **Unbounded label values**
   - User IDs in labels
   - Timestamps in labels
   - URLs with dynamic segments

2. **Too many label combinations**
   - Every HTTP status code (200, 201, 404, etc.)
   - Every task name in a large system

**Solutions**:

**Group high-cardinality labels**:
```python
# Bad: Every status code creates a new series
emit_metric(
    metric_type='counter',
    name='http_requests_total',
    labels={'status': str(response.status_code)}  # ← 200, 201, 404, 500, etc.
)

# Good: Group status codes
status_group = f"{response.status_code // 100}xx"  # → 2xx, 4xx, 5xx
emit_metric(
    metric_type='counter',
    name='http_requests_total',
    labels={'status': status_group}  # ← Only 5 possible values
)
```

**Use allowlists for labels**:
```python
# Only track known task names
ALLOWED_TASK_NAMES = {'send_email', 'generate_report', 'process_payment'}

task_name = task.name if task.name in ALLOWED_TASK_NAMES else 'other'
emit_metric(
    metric_type='counter',
    name='tasks_started_total',
    labels={'task_name': task_name}
)
```

**Drop high-cardinality labels**:
```python
# Don't include user-specific data in labels
emit_metric(
    metric_type='counter',
    name='api_calls_total',
    labels={'endpoint': '/api/users'}  # ← No user_id in labels
)
```

---

## Logging Issues

### Issue 4: Correlation IDs missing from logs

**Symptoms**:
- Logs don't include `correlation_id` field
- Can't trace requests across services
- Celery task logs missing correlation IDs

**Diagnosis**:

```bash
# Check log output for correlation_id field
docker logs <container_id> | jq '.correlation_id'

# Check middleware ordering
python manage.py diffsettings | grep MIDDLEWARE
```

**Common Causes**:

1. **Middleware not configured**
   - `CorrelationIDMiddleware` not in `MIDDLEWARE`
   - Middleware too late in stack

2. **JSON logging not enabled**
   - `OBSERVABILITY_LOGGING_JSON = False`
   - Custom logging formatter overriding default

**Solutions**:

**Add middleware early in stack**:
```python
# src/config/settings/base.py

MIDDLEWARE = [
    'observability.middleware.CorrelationIDMiddleware',  # ← Must be early
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
]
```

**Enable JSON logging**:
```python
# src/config/settings/base.py

OBSERVABILITY_LOGGING_JSON = True

LOGGING = {
    'version': 1,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(severity)s %(name)s %(message)s %(correlation_id)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

**Verify correlation ID propagation**:
```bash
# Make test request with correlation ID
curl -H "X-Correlation-ID: test-123" http://localhost:8000/api/test/

# Check logs for correlation_id field
docker logs <container_id> | jq 'select(.correlation_id == "test-123")'
```

---

### Issue 5: PII not being redacted

**Symptoms**:
- Passwords, emails, SSNs visible in logs
- Compliance violation alerts
- Security audit failures

**Diagnosis**:

```bash
# Search logs for sensitive fields
docker logs <container_id> | jq 'select(.password != "[REDACTED]")'
docker logs <container_id> | grep -E '"email":\s*"[^[]'  # Email not [REDACTED]

# Check redaction filter configuration
python manage.py check --deploy
```

**Common Causes**:

1. **PII redaction not enabled**
   - `OBSERVABILITY_PII_REDACTION_ENABLED = False`
   - Redaction filter not applied to handlers

2. **Custom fields not in redaction list**
   - Organization-specific sensitive fields
   - New fields added but not configured for redaction

**Solutions**:

**Enable PII redaction**:
```python
# src/config/settings/base.py

OBSERVABILITY_PII_REDACTION_ENABLED = True

LOGGING = {
    'filters': {
        'pii_redaction': {
            '()': 'observability.logging.PIIRedactionFilter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'filters': ['pii_redaction'],  # ← Apply filter
            'formatter': 'json',
        },
    },
}
```

**Add custom sensitive fields**:
```python
# myproduct/logging_filters.py

from observability.logging import PIIRedactionFilter

class CustomPIIRedactionFilter(PIIRedactionFilter):
    REDACTED_FIELDS = PIIRedactionFilter.REDACTED_FIELDS | {
        'employee_id',
        'badge_number',
        'social_security_number',
        # ... other custom fields
    }

# Update settings.py to use custom filter
LOGGING = {
    'filters': {
        'pii_redaction': {
            '()': 'myproduct.logging_filters.CustomPIIRedactionFilter',
        },
    },
    # ...
}
```

---

## Task Observability Issues

### Issue 6: Task metrics not emitting

**Symptoms**:
- No `tasks_started_total` or `tasks_completed_total` metrics
- Celery tasks running but not tracked
- Task duration metrics missing

**Diagnosis**:

```bash
# Check if tasks use ObservableTask
grep -r "ObservableTask" src/tasks/

# Query Prometheus for task metrics
curl -s http://localhost:8000/metrics | grep tasks_started_total

# Check Celery logs
celery -A config worker --loglevel=info
```

**Common Causes**:

1. **Tasks not using ObservableTask base class**
   - Tasks use default `Task` base
   - Custom base class doesn't inherit from `ObservableTask`

2. **Metrics not enabled**
   - `OBSERVABILITY_METRICS_ENABLED = False`
   - Celery worker not configured with observability

**Solutions**:

**Use ObservableTask for all tasks**:
```python
# src/tasks/services/email.py

from observability.tasks import ObservableTask
from celery import shared_task

@shared_task(base=ObservableTask)  # ← Add base=ObservableTask
def send_email(recipient, subject, body):
    # Task logic
    ...
```

**Configure Celery worker**:
```python
# src/config/celery.py

from celery import Celery

app = Celery('django_core')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Ensure observability is loaded
app.autodiscover_tasks(['observability'])
```

**Restart Celery workers**:
```bash
# Locally
celery -A config worker --loglevel=info

# In Kubernetes
kubectl rollout restart deployment/celery-worker
```

---

## Kubernetes Integration Issues

### Issue 7: Pod stuck in "Not Ready" state

**Symptoms**:
- Pod shows 0/1 containers ready
- Service endpoints don't include pod
- Traffic not routed to pod

**Diagnosis**:

```bash
# Check pod status
kubectl get pods -n prod

# Expected: NAME READY STATUS
# django-app-xxx 0/1 Running  # ← Not ready

# Check readiness probe
kubectl describe pod django-app-xxx | grep -A 10 "Readiness"

# Check probe failures
kubectl get events --sort-by='.lastTimestamp' | grep django-app-xxx
```

**Common Causes**:

1. **Readiness probe configured incorrectly**
   - Wrong port or path
   - Timeout too short
   - Initial delay too short

2. **Application not starting in time**
   - Slow initialization
   - Database migrations taking too long

**Solutions**:

**Increase initial delay**:
```yaml
# deployment/k8s/deployment.yaml

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 30  # ← Increase from 5 to 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Separate liveness and readiness**:
```yaml
# Use different thresholds
livenessProbe:
  failureThreshold: 3  # ← Restart after 3 failures

readinessProbe:
  failureThreshold: 2  # ← Remove from load balancer faster
```

---

## Getting Help

If issues persist after trying these solutions:

1. **Check logs**: `kubectl logs <pod-name> --tail=100`
2. **Review settings**: `python manage.py diffsettings`
3. **Run health check**: `python manage.py check --deploy`
4. **Test locally**: Reproduce issue in development environment
5. **Check dependencies**: Verify PostgreSQL, Redis, Celery are running

For additional help, see:
- [Platform Observability Guide](observability.md)
- [Extension Guide](observability-extension-guide.md)
- [ADR 019: Metric Exporter Pluggability](adr/019-metric-exporter-pluggability.md)

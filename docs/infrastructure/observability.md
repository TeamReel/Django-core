# Observability & Monitoring

## Overview

The Django Core-App includes comprehensive observability features through the **B18 Observability** module.

> **Current status:** Health checks and cache metrics are implemented and active. Sentry, log aggregation, and APM tools are documented as recommended options — not yet configured in production.

## Health Checks

The platform exposes multiple health check endpoints for monitoring:

### Endpoints

**`/health/live`** - Liveness Check
- Indicates if the application is running
- Returns HTTP 200 if alive
- Used by orchestrators (K8s, Railway) to restart unhealthy containers

**`/health/ready`** - Readiness Check
- Indicates if the application can serve requests
- Checks database connectivity
- Returns HTTP 200 if ready, 503 if not

**`/health/db`** - Database Check
- Tests database connectivity
- Returns connection status and latency

**Example Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "latency_ms": 12
}
```

### Configure Health Checks

**Railway:**
- Automatically monitors `/health/live`
- Configure in Railway Dashboard → Service Settings → Health Checks

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Docker Compose:**
```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Metrics Collection

The platform collects metrics for monitoring system health and performance.

### Cache Metrics (B18 Observability)

Metrics are collected every 10 minutes by Celery Beat:

**Tracked Metrics:**
- Hit rate (cache effectiveness)
- Memory usage
- Key count
- Evictions

**View Metrics:**
```bash
# Seed sample metrics (development)
python manage.py seed_cache_metrics

# Check current metrics
python manage.py check_metrics
```

**API Endpoint:**
```bash
GET /api/observability/metrics/cache/
```

**Example Response:**
```json
{
  "results": [
    {
      "timestamp": "2026-01-05T18:30:00Z",
      "hit_rate": 0.85,
      "memory_mb": 128.5,
      "key_count": 1247,
      "evictions": 23
    }
  ]
}
```

### Application Metrics

**Built-in Django Metrics:**
- Request count
- Response time
- Error rate
- Database query count

**Access via:** `/metrics/` endpoint (requires authentication)

## Logging

### Structured Logging

The platform uses structured logging for better searchability and analysis.

**Log Format:**
```json
{
  "timestamp": "2026-01-05T18:30:00Z",
  "level": "INFO",
  "logger": "django.request",
  "message": "GET /api/accounts/me/",
  "user_id": 123,
  "org_id": 456,
  "status_code": 200,
  "duration_ms": 45
}
```

**Log Levels:**
- `DEBUG` - Detailed information (development only)
- `INFO` - General information
- `WARNING` - Warning messages
- `ERROR` - Error events
- `CRITICAL` - Critical failures

### View Logs

**Railway:**
```bash
railway logs
railway logs --filter=ERROR  # Only errors
railway logs --tail           # Stream logs
```

**Docker:**
```bash
docker-compose logs -f web
docker-compose logs --tail=100 web
```

**Kubernetes:**
```bash
kubectl logs -f deployment/django-core-web -n django-core
kubectl logs --previous deployment/django-core-web -n django-core  # Previous container
```

### Log Aggregation

**Recommended Tools:**
- **Grafana Loki** - Open source log aggregation
- **Datadog** - Commercial APM with log management
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **CloudWatch** - AWS native (if on AWS)

**Configuration:**

Add to `settings/production.py`:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
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

## Error Tracking

### Sentry Integration (Recommended)

**1. Install Sentry SDK:**
```bash
pip install sentry-sdk
```

**2. Configure in `settings/production.py`:**
```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,  # 10% of transactions
    send_default_pii=False,  # Don't send PII
)
```

**3. Set Environment Variable:**
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

**Test Sentry:**
```python
# Trigger test error
from django.http import HttpResponse

def trigger_error(request):
    division_by_zero = 1 / 0
```

Visit the endpoint and check Sentry dashboard.

## Performance Monitoring

### Database Query Monitoring

**Django Debug Toolbar** (development only):
```python
# settings/local.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

**Query Logging** (production):
```python
# Log slow queries
LOGGING['loggers']['django.db.backends'] = {
    'handlers': ['console'],
    'level': 'DEBUG',
}
```

### Application Performance Monitoring (APM)

**Recommended Tools:**
- **Sentry Performance** - Transaction tracing
- **Datadog APM** - Full stack monitoring
- **New Relic** - Application monitoring
- **Elastic APM** - Open source APM

## Alerting

### Set Up Alerts

**Railway:**
- Configure via Railway Dashboard
- Alerts for: Deployment failures, High CPU, High memory

**Kubernetes:**
```yaml
# Prometheus AlertManager rules
groups:
  - name: django-core
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

**Sentry:**
- Configure alert rules in Sentry dashboard
- Alerts for: Error spikes, New issues, Performance degradation

### Alert Channels

- Email
- Slack
- PagerDuty
- Discord
- Webhook

## Monitoring Dashboards

### Grafana Dashboard

**Metrics to Track:**
1. Request rate (requests/second)
2. Response time (p50, p95, p99)
3. Error rate (5xx responses)
4. Database connection pool
5. Cache hit rate
6. Celery queue length
7. Memory usage
8. CPU usage

**Example Prometheus Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Celery Monitoring

### Check Worker Status

```bash
# List active workers
celery -A config inspect active

# Check scheduled tasks
celery -A config inspect scheduled

# Worker statistics
celery -A config inspect stats
```

### Celery Flower (Web UI)

```bash
# Install Flower
pip install flower

# Start Flower
celery -A config flower
```

Visit [http://localhost:5555](http://localhost:5555)

**Features:**
- Real-time task monitoring
- Worker management
- Task history
- Task routing visualization

### Beat Scheduler Monitoring

**Check Beat is running:**
```bash
python manage.py check_workers
```

**Verify scheduled tasks are executing:**
```bash
# Check cache metrics are being collected
python manage.py check_metrics
```

## Audit Trail

The **B09 Audit Logging** module tracks all sensitive operations:

**What's Logged:**
- User authentication (login/logout)
- Permission changes
- Data modifications (CRUD)
- Settings changes
- File uploads/downloads

**Query Audit Logs:**
```bash
GET /api/audit-logs/
GET /api/audit-logs/?user_id=123
GET /api/audit-logs/?action=CREATE
```

**Example Log Entry:**
```json
{
  "id": 1,
  "timestamp": "2026-01-05T18:30:00Z",
  "user_id": 123,
  "org_id": 456,
  "action": "CREATE",
  "resource_type": "Organisation",
  "resource_id": 789,
  "changes": {"name": "New Org"},
  "ip_address": "192.168.1.1"
}
```

## Best Practices

1. **Monitor Health Checks**: Set up alerts for failed health checks
2. **Track Key Metrics**: Request rate, error rate, response time
3. **Log Errors**: Use Sentry or similar for error tracking
4. **Regular Reviews**: Check logs and metrics weekly
5. **Alerting**: Set up alerts for critical issues
6. **Retention**: Keep logs for at least 30 days
7. **Privacy**: Don't log sensitive data (passwords, tokens, PII)

## Troubleshooting

### High Memory Usage
- Check for memory leaks in custom code
- Review database query patterns (N+1 queries)
- Monitor cache size
- Check Celery worker memory

### High CPU Usage
- Profile slow endpoints
- Check for inefficient database queries
- Review Celery task patterns
- Monitor background jobs

### Database Connection Issues
- Check connection pool settings
- Monitor active connections
- Review slow queries
- Check for connection leaks

## Next Steps

- Set up [Sentry](https://sentry.io) for error tracking
- Configure log aggregation (Loki/Datadog)
- Create Grafana dashboard for key metrics
- Set up alerts for critical thresholds
- Review [Deployment Guide](deployment.md) for health check configuration

# Observability Extension Guide

This guide shows how to extend the Platform Observability Foundation with custom health checks, metric exporters, and PII redaction rules.

---

## Custom Health Checks

Add health checks for external dependencies like payment gateways, third-party APIs, or specialized services.

### Example: External API Health Check

```python
# myproduct/health_checks.py

from observability.health import HealthCheck, HealthCheckResult, register_health_check
import requests
import time

class PaymentGatewayHealthCheck:
    """Health check for external payment gateway."""
    
    def check(self) -> HealthCheckResult:
        start = time.time()
        try:
            response = requests.get('https://api.payment-gateway.com/health', timeout=0.5)
            latency_ms = (time.time() - start) * 1000
            
            return HealthCheckResult(
                name="payment_gateway",
                status=response.status_code == 200,
                latency_ms=latency_ms,
                details={"endpoint": "https://api.payment-gateway.com/health"}
            )
        except Exception as e:
            latency_ms = (time.time() - start) * 1000
            return HealthCheckResult(
                name="payment_gateway",
                status=False,
                latency_ms=latency_ms,
                details={"error": str(e)}
            )
```

### Registering Custom Health Checks

Register in your Django app's `apps.py` `ready()` method:

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

### Testing Custom Health Checks

```bash
# Test readiness endpoint with custom check
curl http://localhost:8000/health/ready

# Expected response if payment gateway is down:
# {
#   "status": "unhealthy",
#   "checks": {
#     "database": true,
#     "cache": true,
#     "queue": true,
#     "migrations": true,
#     "payment_gateway": false  # ← Custom check
#   }
# }
```

---

## Custom Metric Exporters

Add support for metric backends like StatsD, OpenMetrics, or custom internal systems.

### Example: StatsD Exporter

```python
# myproduct/exporters/statsd.py

from observability.metrics import MetricCollector, register_metric_collector
import statsd

class StatsDCollector:
    """StatsD metric collector implementation."""
    
    def __init__(self, host='localhost', port=8125):
        self.client = statsd.StatsClient(host, port)
    
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        """Increment counter metric."""
        # StatsD doesn't support labels; encode in metric name
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.incr(metric_name, value)
    
    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Record timer observation."""
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.timing(metric_name, value * 1000)  # Convert seconds to milliseconds
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Set gauge value."""
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.gauge(metric_name, value)
```

### Registering Custom Metric Exporters

Register in your Django app's `apps.py` `ready()` method:

```python
# myproduct/apps.py

from django.apps import AppConfig

class MyProductConfig(AppConfig):
    name = 'myproduct'
    
    def ready(self):
        from observability.metrics import register_metric_collector
        from .exporters.statsd import StatsDCollector
        
        register_metric_collector(StatsDCollector(host='statsd.internal', port=8125))
```

### Testing Custom Exporters

```python
# Emit test metric
from observability.metrics import emit_metric

emit_metric(
    metric_type='counter',
    name='myproduct_custom_events_total',
    value=1,
    labels={'event_type': 'user_signup'}
)

# Verify metric appears in StatsD
# (check StatsD logs or backend for myproduct_custom_events_total.event_type_user_signup)
```

---

## Custom PII Redaction Rules

Extend PII redaction to handle organization-specific sensitive fields.

### Example: Organization-Specific Fields

```python
# myproduct/logging_filters.py

from observability.logging import PIIRedactionFilter

class CustomPIIRedactionFilter(PIIRedactionFilter):
    """Extended PII redaction for organization-specific fields."""
    
    REDACTED_FIELDS = PIIRedactionFilter.REDACTED_FIELDS | {
        'employee_id',
        'badge_number',
        'internal_ip',
        'social_security_number',
        'passport_number',
    }
```

### Configuring Custom PII Filters

Update Django logging configuration in `settings.py`:

```python
# src/config/settings/base.py

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'pii_redaction': {
            '()': 'myproduct.logging_filters.CustomPIIRedactionFilter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'filters': ['pii_redaction'],
            'formatter': 'json',
        },
    },
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(severity)s %(name)s %(message)s',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

### Testing Custom Redaction

```python
import logging

logger = logging.getLogger(__name__)

# This should redact employee_id
logger.info("Employee login", extra={
    "employee_id": "EMP-12345",  # ← Will be redacted
    "username": "john.doe",
})

# Expected log output:
# {
#   "timestamp": "2025-12-03T14:23:45.123456Z",
#   "severity": "INFO",
#   "name": "myproduct.views",
#   "message": "Employee login",
#   "employee_id": "[REDACTED]",  # ← Redacted
#   "username": "john.doe"
# }
```

---

## Advanced: Custom Metric Types

For specialized metric types beyond counters, histograms, and gauges.

### Example: Custom Summary Metric

```python
# myproduct/metrics.py

from observability.metrics import emit_metric
import time

def track_api_latency(api_name: str):
    """Decorator to track API call latency with summary metric."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                
                # Emit histogram for percentile calculations
                emit_metric(
                    metric_type='histogram',
                    name='api_call_duration_seconds',
                    value=duration,
                    labels={'api_name': api_name, 'status': 'success'}
                )
                
                return result
            except Exception as e:
                duration = time.time() - start
                
                # Track failures separately
                emit_metric(
                    metric_type='histogram',
                    name='api_call_duration_seconds',
                    value=duration,
                    labels={'api_name': api_name, 'status': 'failure'}
                )
                
                emit_metric(
                    metric_type='counter',
                    name='api_call_failures_total',
                    value=1,
                    labels={'api_name': api_name, 'error_type': type(e).__name__}
                )
                
                raise
        
        return wrapper
    return decorator

# Usage
@track_api_latency('stripe_payment')
def process_stripe_payment(amount: float):
    # Payment processing logic
    ...
```

---

## Best Practices

### Health Checks

1. **Keep timeouts short**: Health checks should complete within 500ms
2. **Mark critical dependencies**: Use `critical=True` for database, queue, required external APIs
3. **Graceful degradation**: Non-critical checks (cache, optional APIs) should use `critical=False`
4. **Avoid heavy operations**: Don't run expensive queries or full system scans

### Metrics

1. **Control label cardinality**: Keep unique label combinations below 1,000
2. **Use standard naming**: Follow Prometheus naming conventions (`_total`, `_seconds`, etc.)
3. **Document custom metrics**: Add comments explaining what each metric measures
4. **Test before production**: Verify metrics appear in Prometheus before deploying

### PII Redaction

1. **Default to redaction**: When in doubt, redact
2. **Test redaction rules**: Verify sensitive fields are actually redacted in logs
3. **Document custom fields**: Maintain a list of organization-specific sensitive fields
4. **Regular audits**: Periodically scan logs for unredacted PII

---

## See Also

- [Platform Observability Guide](observability.md)
- [Troubleshooting Guide](observability-troubleshooting.md)
- [ADR 019: Metric Exporter Pluggability](adr/019-metric-exporter-pluggability.md)
- [src/observability/README.md](../src/observability/README.md)

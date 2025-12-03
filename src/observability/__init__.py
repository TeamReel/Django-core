"""
Observability application for Django Core-App.

Provides:
- Health checks (liveness & readiness probes)
- Structured JSON logging with PII redaction
- Metric collection with Prometheus exporter (via django-prometheus /metrics endpoint)
- HTTP request metrics middleware
- B15 task observability (ObservableTask base class)

See docs/observability.md for usage guide.
"""

default_app_config = "observability.apps.ObservabilityConfig"

# Export key components for easy importing
from .metrics import emit_metric, register_metric_collector
from .tasks import ObservableTask

__all__ = [
    'emit_metric',
    'register_metric_collector',
    'ObservableTask',
]

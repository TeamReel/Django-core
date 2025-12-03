"""
Observability application for Django Core-App.

Provides:
- Health checks (liveness & readiness probes)
- Structured JSON logging with PII redaction
- Metric collection hooks (Prometheus, StatsD)
- B15 task observability integration

See docs/observability.md for usage guide.
"""

default_app_config = "observability.apps.ObservabilityConfig"

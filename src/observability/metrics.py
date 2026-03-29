"""Metric collection infrastructure with pluggable exporters."""

import logging
from typing import Protocol

logger = logging.getLogger(__name__)


# T029: MetricCollector Protocol
class MetricCollector(Protocol):
    """Interface for metric exporter backends."""

    def increment(self, name: str, value: int = 1, labels: dict[str, str] | None = None) -> None:
        """Increment counter metric."""
        ...

    def observe(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Record histogram/summary observation."""
        ...

    def set_gauge(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Set gauge value."""
        ...

    def adjust_gauge(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Increment or decrement gauge value."""
        ...


# T030: Metric collector registry (list-based, consistent with WP01 health checks)
METRIC_COLLECTORS: list[MetricCollector] = []


def register_metric_collector(collector: MetricCollector) -> None:
    """Register a metric collector."""
    METRIC_COLLECTORS.append(collector)


def emit_metric(
    metric_type: str, name: str, value: float, labels: dict[str, str] | None = None
) -> None:
    """
    Emit metric to active collector (FR-009).

    Fire-and-forget with exception isolation per FR-011a.
    """
    if labels is None:
        labels = {}

    try:
        from django.conf import settings

        if not settings.OBSERVABILITY_METRICS_ENABLED:
            return  # Metrics disabled

        if not METRIC_COLLECTORS:
            return  # No collectors registered

        # Validate and sanitize labels (T037)
        sanitized_labels = validate_label_cardinality(labels)

        # Emit to all registered collectors
        for collector in METRIC_COLLECTORS:
            if metric_type == "counter":
                collector.increment(name, int(value), sanitized_labels)
            elif metric_type == "histogram":
                collector.observe(name, value, sanitized_labels)
            elif metric_type == "gauge":
                collector.set_gauge(name, value, sanitized_labels)
            elif metric_type == "gauge_delta":
                collector.adjust_gauge(name, value, sanitized_labels)

    except Exception as e:
        # FR-011a: Never propagate exceptions from observability hooks
        logger.error(
            f"Metric emission failed: {e}",
            extra={"context": {"metric_name": name, "metric_type": metric_type}},
        )
        # Emit observability_signal_failure_total (FR-011b)
        _emit_failure_metric("metric_emission", type(e).__name__)


def _emit_failure_metric(hook_type: str, failure_reason: str) -> None:
    """
    Emit observability_signal_failure_total without recursion (FR-011b, T042).

    Uses direct Prometheus API to avoid recursive emit_metric() calls.
    """
    try:
        from prometheus_client import Counter

        failure_counter = Counter(
            "observability_signal_failure_total",
            "Observability hook failures",
            ["hook_type", "failure_reason"],
        )
        failure_counter.labels(hook_type=hook_type, failure_reason=failure_reason).inc()
    except Exception:
        # Fail silently to avoid infinite recursion
        logger.debug("Failed to emit signal failure metric", exc_info=True)


# T037: Label cardinality validation
ALLOWED_HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
ALLOWED_HTTP_STATUS_GROUPS = {"2xx", "3xx", "4xx", "5xx"}


def validate_label_cardinality(labels: dict[str, str]) -> dict[str, str]:
    """
    Validate and sanitize metric labels per FR-013.

    Restricts label values to predefined sets to control cardinality.
    """
    sanitized = {}

    for key, value in labels.items():
        if key == "method":
            # Validate HTTP method
            if value.upper() in ALLOWED_HTTP_METHODS:
                sanitized[key] = value.upper()
            else:
                sanitized[key] = "OTHER"

        elif key == "status":
            # Group HTTP status codes: 200-299 → 2xx, etc. (FR-013)
            value_str = str(value)
            if value_str.startswith("2"):
                sanitized[key] = "2xx"
            elif value_str.startswith("3"):
                sanitized[key] = "3xx"
            elif value_str.startswith("4"):
                sanitized[key] = "4xx"
            elif value_str.startswith("5"):
                sanitized[key] = "5xx"
            else:
                sanitized[key] = "other"

        elif key in ("task_name", "queue"):
            # Task-specific labels - pass through but limit length
            sanitized[key] = str(value)[:100]  # Prevent unbounded cardinality

        else:
            # Other labels - pass through with length limit
            sanitized[key] = str(value)[:50]

    return sanitized

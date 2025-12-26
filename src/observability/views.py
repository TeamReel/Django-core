"""Observability API views for UI consumption."""

import logging

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from prometheus_client import REGISTRY

logger = logging.getLogger(__name__)


def _safe_get_metric_value(metric_name: str, labels: dict | None = None) -> float | None:
    """
    Safely extract a metric value from Prometheus REGISTRY.

    Returns None if metric not found or has no samples.
    """
    try:
        for collector in REGISTRY._collector_to_names.keys():
            for metric in collector.collect():
                if metric.name == metric_name:
                    for sample in metric.samples:
                        # Match labels if provided
                        if labels:
                            sample_labels = {k: v for k, v in sample.labels.items()}
                            if all(sample_labels.get(k) == v for k, v in labels.items()):
                                return sample.value
                        else:
                            # Return first sample if no label filter
                            return sample.value
        return None
    except Exception as e:
        logger.warning(f"Failed to get metric {metric_name}: {e}")
        return None


@require_http_methods(["GET"])
def metrics_summary(request):
    """
    Minimal JSON summary of platform metrics for UI consumption.

    Returns a safe summary of available Prometheus metrics.
    Never returns 500 - missing metrics are returned as null.
    """
    try:
        # Try to extract common django-prometheus metrics
        # These are emitted by django-prometheus middleware automatically

        summary = {
            "timestamp": None,
            "requests_total": _safe_get_metric_value(
                "django_http_requests_total_by_view_transport_method_total"
            ),
            "error_rate": None,  # Calculated from status codes if available
            "p95_latency_ms": None,  # Not available without custom instrumentation
            "uptime_seconds": None,  # Not tracked by default
            "active_connections": None,  # Not available without additional metrics
            "response_time_p99": None,
            "response_time_p95": None,
            "response_time_median": None,
            "error_rate_4xx": None,
            "error_rate_5xx": None,
            "database_latency": None,
            "cache_hit_ratio": None,
            "message": "Minimal observability metrics available. Some metrics require custom instrumentation.",
            "available": False,  # Set to True when we have at least some data
        }

        # Check if we have any actual metric data
        has_data = any(
            v is not None
            for k, v in summary.items()
            if k not in ["timestamp", "message", "available"]
        )
        summary["available"] = has_data

        return JsonResponse(summary, status=200)

    except Exception as e:
        logger.error(f"Error generating metrics summary: {e}", exc_info=True)
        return JsonResponse(
            {
                "timestamp": None,
                "message": f"Error generating metrics summary: {str(e)}",
                "available": False,
                "error": True,
            },
            status=200,
        )  # Still return 200 to avoid breaking the UI

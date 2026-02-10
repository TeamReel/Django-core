"""Prometheus metrics for notifications."""

from prometheus_client import Counter, Histogram


def _safe_counter(name, documentation, labelnames):
    try:
        return Counter(name, documentation, labelnames)
    except ValueError:
        return Counter(name, documentation, labelnames, registry=None)


def _safe_histogram(name, documentation, labelnames, buckets=None):
    kwargs = {"buckets": buckets} if buckets else {}
    try:
        return Histogram(name, documentation, labelnames, **kwargs)
    except ValueError:
        return Histogram(name, documentation, labelnames, registry=None, **kwargs)


# T085: Notification lifecycle counters
notifications_created_total = _safe_counter(
    "notifications_created_total",
    "Total notifications created",
    ["notification_type", "channel"],
)

notifications_sent_total = _safe_counter(
    "notifications_sent_total",
    "Total notifications sent successfully",
    ["notification_type", "channel"],
)

notifications_failed_total = _safe_counter(
    "notifications_failed_total",
    "Total notifications failed",
    ["notification_type", "channel", "failure_reason"],
)

# Notification delivery metrics
notification_deliveries_total = _safe_counter(
    "notification_deliveries_total",
    "Total notification delivery attempts",
    ["notification_type", "channel", "outcome"],
)

# Retry metrics
notification_retries_total = _safe_counter(
    "notification_retries_total",
    "Total retry attempts for notifications",
    ["notification_type", "channel", "outcome"],
)

notification_retry_delay_seconds = _safe_histogram(
    "notification_retry_delay_seconds",
    "Retry delay calculated for notifications (seconds)",
    ["notification_type", "backoff_strategy"],
    buckets=[5, 15, 30, 60, 120, 300, 600, 1800, 3600],
)

# T086: Delivery performance metrics
notification_delivery_duration_seconds = _safe_histogram(
    "notification_delivery_duration_seconds",
    "Time taken to deliver notification",
    ["notification_type", "channel"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

# Failure metrics
notification_failures_total = _safe_counter(
    "notification_failures_total",
    "Total notification failures by reason",
    ["notification_type", "channel", "failure_type"],
)

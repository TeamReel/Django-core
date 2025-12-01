"""Prometheus metrics for notifications."""

from prometheus_client import Counter, Histogram

# Notification delivery metrics
notification_deliveries_total = Counter(
    "notification_deliveries_total",
    "Total notification delivery attempts",
    ["notification_type", "channel", "outcome"],
)

# Retry metrics
notification_retries_total = Counter(
    "notification_retries_total",
    "Total retry attempts for notifications",
    ["notification_type", "channel", "outcome"],
)

notification_retry_delay_seconds = Histogram(
    "notification_retry_delay_seconds",
    "Retry delay calculated for notifications (seconds)",
    ["notification_type", "backoff_strategy"],
    buckets=[5, 15, 30, 60, 120, 300, 600, 1800, 3600],
)

# Delivery performance metrics
notification_delivery_duration_seconds = Histogram(
    "notification_delivery_duration_seconds",
    "Time taken to deliver notification",
    ["notification_type", "channel"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

# Failure metrics
notification_failures_total = Counter(
    "notification_failures_total",
    "Total notification failures by reason",
    ["notification_type", "channel", "failure_type"],
)

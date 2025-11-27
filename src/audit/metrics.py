"""
Prometheus metrics for audit system.

Metrics provide observability into audit system health and usage patterns.
"""
from prometheus_client import Counter

# Counter: audit_events_recorded_total
# Tracks successful audit event recordings
# Labels: event_type
audit_events_recorded_total = Counter(
    "audit_events_recorded_total",
    "Total number of audit events successfully recorded",
    labelnames=["event_type"],
)


# Counter: audit_failures_total
# Tracks failed audit event recordings
# Labels: event_type, error_type
audit_failures_total = Counter(
    "audit_failures_total",
    "Total number of audit event recording failures",
    labelnames=["event_type", "error_type"],
)

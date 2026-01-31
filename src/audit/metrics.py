"""
Prometheus metrics for audit system.

Metrics provide observability into audit system health and usage patterns.
"""

from prometheus_client import REGISTRY, Counter

# Use a try/except pattern to prevent duplicate registration errors
# This can happen in multi-worker environments or during hot reloads


def _get_or_create_counter(name, description, labelnames):
    """Get existing counter from registry or create new one."""
    # Check if metric already exists in registry
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    # Create new counter
    return Counter(name, description, labelnames=labelnames)


# Counter: audit_events_recorded_total
# Tracks successful audit event recordings
# Labels: event_type
audit_events_recorded_total = _get_or_create_counter(
    "audit_events_recorded_total",
    "Total number of audit events successfully recorded",
    labelnames=["event_type"],
)


# Counter: audit_failures_total
# Tracks failed audit event recordings
# Labels: event_type, error_type
audit_failures_total = _get_or_create_counter(
    "audit_failures_total",
    "Total number of audit event recording failures",
    labelnames=["event_type", "error_type"],
)

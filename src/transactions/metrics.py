"""Prometheus metrics for transactions engine.

This module defines custom Prometheus metrics for monitoring transaction
writes, balance queries, policy violations, and cache performance.
"""

from prometheus_client import REGISTRY, Counter, Histogram


def _get_or_create_counter(name: str, documentation: str, labelnames: list[str]) -> Counter:
    """Get existing counter or create new one, avoiding duplicate registration."""
    try:
        return Counter(name, documentation, labelnames)
    except ValueError:
        # Already registered - get from registry
        return REGISTRY._names_to_collectors.get(name)


def _get_or_create_histogram(
    name: str, documentation: str, labelnames: list[str], buckets: tuple
) -> Histogram:
    """Get existing histogram or create new one, avoiding duplicate registration."""
    try:
        return Histogram(name, documentation, labelnames, buckets=buckets)
    except ValueError:
        # Already registered - get from registry
        return REGISTRY._names_to_collectors.get(name)


# Transaction write metrics
transaction_writes_total = _get_or_create_counter(
    "transaction_writes_total",
    "Total number of transaction writes",
    ["organization_id", "source_type"],
)

transaction_write_latency_seconds = _get_or_create_histogram(
    "transaction_write_latency_seconds",
    "Transaction write latency in seconds",
    ["source_type"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

# Balance query metrics
balance_queries_total = _get_or_create_counter(
    "balance_queries_total",
    "Total number of balance queries",
    ["scope"],  # 'organization' or 'project'
)

balance_query_latency_seconds = _get_or_create_histogram(
    "balance_query_latency_seconds",
    "Balance query latency in seconds",
    ["scope", "cache_hit"],
    buckets=(0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

# Policy enforcement metrics
policy_violations_total = _get_or_create_counter(
    "policy_violations_total",
    "Total number of policy violations",
    ["enforcement_mode", "violation_type"],  # violation_type: 'insufficient_balance'
)

# Cache performance metrics
cache_hits_total = _get_or_create_counter(
    "cache_hits_total",
    "Total number of cache hits",
    ["cache_key_prefix"],  # 'balance:org' or 'balance:proj'
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total number of cache misses",
    ["cache_key_prefix"],
)

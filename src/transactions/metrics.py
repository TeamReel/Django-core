"""Prometheus metrics for transactions engine.

This module defines custom Prometheus metrics for monitoring transaction
writes, balance queries, policy violations, and cache performance.
"""

from prometheus_client import Counter, Histogram

# Transaction write metrics
transaction_writes_total = Counter(
    "transaction_writes_total",
    "Total number of transaction writes",
    ["organization_id", "source_type"],
)

transaction_write_latency_seconds = Histogram(
    "transaction_write_latency_seconds",
    "Transaction write latency in seconds",
    ["source_type"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)

# Balance query metrics
balance_queries_total = Counter(
    "balance_queries_total",
    "Total number of balance queries",
    ["scope"],  # 'organization' or 'project'
)

balance_query_latency_seconds = Histogram(
    "balance_query_latency_seconds",
    "Balance query latency in seconds",
    ["scope", "cache_hit"],
    buckets=(0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

# Policy enforcement metrics
policy_violations_total = Counter(
    "policy_violations_total",
    "Total number of policy violations",
    ["enforcement_mode", "violation_type"],  # violation_type: 'insufficient_balance'
)

# Cache performance metrics
cache_hits_total = Counter(
    "cache_hits_total",
    "Total number of cache hits",
    ["cache_key_prefix"],  # 'balance:org' or 'balance:proj'
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total number of cache misses",
    ["cache_key_prefix"],
)

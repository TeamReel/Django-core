"""Prometheus metrics for project access control and permission resolution."""

from prometheus_client import Counter, Histogram

# Permission resolution metrics
permission_resolution_total = Counter(
    "project_permission_resolution_total",
    "Total number of permission resolution requests",
    ["source", "role"],
)

permission_cache_hits_total = Counter(
    "project_permission_cache_hits_total",
    "Total number of permission cache hits",
)

permission_cache_misses_total = Counter(
    "project_permission_cache_misses_total",
    "Total number of permission cache misses",
)

permission_resolution_duration_seconds = Histogram(
    "project_permission_resolution_duration_seconds",
    "Time taken to resolve project permissions",
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0),
)

# Emergency override tracking
emergency_override_total = Counter(
    "project_emergency_override_total",
    "Total number of emergency override accesses to private projects",
    ["organization_id"],
)

# Cache invalidation metrics
cache_invalidation_total = Counter(
    "project_permission_cache_invalidation_total",
    "Total number of cache invalidation events",
    ["trigger"],
)

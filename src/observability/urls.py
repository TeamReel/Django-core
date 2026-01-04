"""Observability app URLs."""

from django.urls import path

from .seed_api import seed_metrics
from .views import (
    cache_benchmark,
    cache_clear,
    cache_metrics,
    demo_health_check,
    metrics_summary,
)

urlpatterns = [
    path("metrics/", metrics_summary, name="observability-metrics-summary"),
    path("demo-health/", demo_health_check, name="observability-demo-health"),
    # B25: Cache Performance Dashboard APIs
    path(
        "system/cache/metrics/",
        cache_metrics,
        name="observability-cache-metrics",
    ),
    path(
        "system/cache/clear/",
        cache_clear,
        name="observability-cache-clear",
    ),
    path(
        "system/cache/benchmark/",
        cache_benchmark,
        name="observability-cache-benchmark",
    ),
    # Admin: Seed cache metrics (superadmin only)
    path(
        "system/seed-cache-metrics/",
        seed_metrics,
        name="observability-seed-cache-metrics",
    ),
]

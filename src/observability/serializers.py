"""
Serializers for cache metrics API (B25).

Provides structured data for:
- Real-time cache performance stats
- Historical metrics for dashboard charts
"""

from rest_framework import serializers


class RealtimeMetricsSerializer(serializers.Serializer):
    """
    Real-time cache statistics from Redis INFO commands.

    Used by GET /api/v1/system/cache/metrics endpoint.
    """

    hits = serializers.IntegerField(help_text="Total cache hits since restart")
    misses = serializers.IntegerField(help_text="Total cache misses since restart")
    hit_ratio = serializers.FloatField(
        help_text="Cache hit ratio (hits / (hits + misses))", min_value=0.0, max_value=1.0
    )
    memory_used_bytes = serializers.IntegerField(help_text="Total memory used by Redis (bytes)")
    total_keys = serializers.IntegerField(help_text="Total number of keys in cache")


class HistoricalMetricSerializer(serializers.Serializer):
    """
    Single historical data point for dashboard charts.

    Used by GET /api/v1/system/cache/metrics endpoint (history array).
    """

    timestamp = serializers.DateTimeField(help_text="Metric collection timestamp")
    hit_ratio = serializers.FloatField(
        help_text="Cache hit ratio at this timestamp", min_value=0.0, max_value=1.0
    )
    memory_used_bytes = serializers.IntegerField(help_text="Memory usage at this timestamp")


class CacheMetricsResponseSerializer(serializers.Serializer):
    """
    Combined response for GET /api/v1/system/cache/metrics.

    Includes both real-time stats and historical data for dashboard.
    """

    realtime = RealtimeMetricsSerializer(help_text="Current cache performance stats")
    history = HistoricalMetricSerializer(
        many=True, help_text="Historical data points (last 7 days)"
    )


class CacheClearResponseSerializer(serializers.Serializer):
    """Response for POST /api/v1/system/cache/clear."""

    status = serializers.CharField(help_text="Operation status", default="success")
    cleared_keys = serializers.IntegerField(help_text="Number of keys cleared")


class CacheBenchmarkResponseSerializer(serializers.Serializer):
    """Response for POST /api/v1/system/cache/benchmark."""

    uncached_duration_ms = serializers.FloatField(
        help_text="Query duration without cache (milliseconds)"
    )
    cached_duration_ms = serializers.FloatField(
        help_text="Query duration with cache (milliseconds)"
    )
    speedup_factor = serializers.FloatField(help_text="Performance improvement (uncached / cached)")

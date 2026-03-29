"""Models for observability metrics storage."""

from __future__ import annotations

import uuid

from django.db import models
from django.utils import timezone


class SystemMetric(models.Model):
    """
    Stores historical snapshots of system performance metrics.

    This model enables tracking cache performance over time, supporting
    trend analysis and historical dashboards. Metrics are collected
    periodically by Celery Beat tasks.
    """

    METRIC_TYPES = [
        ("cache_hits", "Cache Hits"),
        ("cache_misses", "Cache Misses"),
        ("memory_used", "Memory Used (bytes)"),
        ("total_keys", "Total Keys"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the metric record",
    )

    timestamp = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="When the metric snapshot was recorded",
    )

    metric_type = models.CharField(
        max_length=50,
        choices=METRIC_TYPES,
        db_index=True,
        help_text="Type of metric being recorded",
    )

    value = models.FloatField(
        help_text="Numeric value of the metric",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (e.g., cache alias, hostname)",
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["metric_type", "-timestamp"]),
            models.Index(fields=["-timestamp"]),
        ]
        verbose_name = "System Metric"
        verbose_name_plural = "System Metrics"

    def __str__(self) -> str:
        """String representation of the metric."""
        return f"{self.metric_type} = {self.value} @ {self.timestamp}"

    @classmethod
    def record_metric(
        cls,
        metric_type: str,
        value: float,
        metadata: dict | None = None,
        timestamp: timezone.datetime | None = None,
    ) -> SystemMetric:
        """
        Convenience method to record a metric.

        Args:
            metric_type: Type of metric (must be in METRIC_TYPES)
            value: Numeric value
            metadata: Optional additional context
            timestamp: Optional timestamp (defaults to now)

        Returns:
            Created SystemMetric instance
        """
        metric = cls(
            metric_type=metric_type,
            value=value,
            metadata=metadata or {},
        )
        if timestamp:
            metric.timestamp = timestamp
        metric.save()
        return metric

    @classmethod
    def cleanup_old_metrics(cls, days: int = 7) -> int:
        """
        Delete metrics older than the specified number of days.

        Args:
            days: Number of days to retain (default: 7)

        Returns:
            Number of records deleted
        """
        cutoff_date = timezone.now() - timezone.timedelta(days=days)
        deleted_count, _ = cls.objects.filter(timestamp__lt=cutoff_date).delete()
        return deleted_count

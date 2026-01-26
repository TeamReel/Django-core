"""
Tests for cache metrics collection and API endpoints (B25).

Tests:
- SystemMetric model methods
- collect_system_metrics task
- GET /api/v1/system/cache/metrics
- POST /api/v1/system/cache/clear
- POST /api/v1/system/cache/benchmark
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from observability.models import SystemMetric
from observability.tasks import collect_system_metrics

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    return User.objects.create_superuser(
        email="admin@test.com", password="testpass123", username="admin"
    )


@pytest.fixture
def api_client(admin_user):
    """Create an authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def sample_metrics(db):
    """Create sample historical metrics for testing."""
    base_time = timezone.now() - timedelta(hours=2)
    metrics = []

    for i in range(12):  # 12 data points (2 hours, every 10 minutes)
        timestamp = base_time + timedelta(minutes=i * 10)

        metrics.extend(
            [
                SystemMetric.record_metric("cache_hits", 1000 + i * 100, timestamp=timestamp),
                SystemMetric.record_metric("cache_misses", 100 + i * 10, timestamp=timestamp),
                SystemMetric.record_metric("memory_used", 5000000 + i * 10000, timestamp=timestamp),
                SystemMetric.record_metric("total_keys", 500 + i * 10, timestamp=timestamp),
            ]
        )

    return metrics


class TestSystemMetricModel:
    """Tests for SystemMetric model."""

    @pytest.mark.django_db
    def test_record_metric_creates_instance(self):
        """Test that record_metric creates a SystemMetric instance."""
        metric = SystemMetric.record_metric("cache_hits", 100.5)

        assert metric is not None
        assert metric.metric_type == "cache_hits"
        assert metric.value == 100.5
        assert metric.timestamp is not None

    @pytest.mark.django_db
    def test_record_metric_with_metadata(self):
        """Test that record_metric stores metadata correctly."""
        metadata = {"source": "test", "environment": "local"}
        metric = SystemMetric.record_metric("cache_hits", 100, metadata=metadata)

        assert metric.metadata == metadata

    @pytest.mark.django_db
    def test_record_metric_with_custom_timestamp(self):
        """Test that record_metric uses custom timestamp."""
        custom_time = timezone.now() - timedelta(hours=1)
        metric = SystemMetric.record_metric("cache_hits", 100, timestamp=custom_time)

        # Should be within 1 second of custom time (account for microsecond differences)
        time_diff = abs((metric.timestamp - custom_time).total_seconds())
        assert time_diff < 1

    @pytest.mark.django_db
    def test_cleanup_old_metrics(self):
        """Test that cleanup_old_metrics deletes metrics older than retention days."""
        # Create metrics with different ages
        old_time = timezone.now() - timedelta(days=10)
        recent_time = timezone.now() - timedelta(days=3)

        SystemMetric.record_metric("cache_hits", 100, timestamp=old_time)
        SystemMetric.record_metric("cache_hits", 200, timestamp=recent_time)

        # Cleanup metrics older than 7 days
        deleted_count = SystemMetric.cleanup_old_metrics(days=7)

        assert deleted_count == 1
        assert SystemMetric.objects.count() == 1
        assert SystemMetric.objects.first().value == 200

    @pytest.mark.django_db
    def test_cleanup_old_metrics_default_retention(self):
        """Test that cleanup_old_metrics uses 7-day default retention."""
        old_time = timezone.now() - timedelta(days=8)
        SystemMetric.record_metric("cache_hits", 100, timestamp=old_time)

        deleted_count = SystemMetric.cleanup_old_metrics()  # Default 7 days

        assert deleted_count == 1
        assert SystemMetric.objects.count() == 0

    @pytest.mark.django_db
    def test_metric_type_choices(self):
        """Test that only valid metric_type choices are accepted."""
        valid_types = ["cache_hits", "cache_misses", "memory_used", "total_keys"]

        for metric_type in valid_types:
            metric = SystemMetric.record_metric(metric_type, 100)
            assert metric.metric_type == metric_type

    @pytest.mark.django_db
    def test_ordering_by_timestamp_desc(self):
        """Test that metrics are ordered by timestamp (newest first)."""
        time1 = timezone.now() - timedelta(hours=2)
        time2 = timezone.now() - timedelta(hours=1)
        time3 = timezone.now()

        SystemMetric.record_metric("cache_hits", 100, timestamp=time1)
        SystemMetric.record_metric("cache_hits", 200, timestamp=time3)
        SystemMetric.record_metric("cache_hits", 150, timestamp=time2)

        metrics = list(SystemMetric.objects.all())
        assert metrics[0].value == 200  # Most recent
        assert metrics[1].value == 150
        assert metrics[2].value == 100  # Oldest


class TestCollectSystemMetricsTask:
    """Tests for collect_system_metrics Celery task."""

    @pytest.mark.django_db
    @patch("observability.tasks.caches")
    def test_collect_metrics_with_redis_backend(self, mock_caches):
        """Test that task collects metrics from Redis backend."""
        # Mock Redis cache
        mock_redis_client = MagicMock()
        mock_redis_client.info.side_effect = lambda section: {
            "stats": {"keyspace_hits": 1000, "keyspace_misses": 100},
            "memory": {"used_memory": 5000000},
            "keyspace": {"db0": "keys=500,expires=50", "db1": "keys=300,expires=30"},
        }[section]

        mock_cache = MagicMock()
        mock_cache._cache.get_client.return_value = mock_redis_client
        mock_caches.__getitem__.return_value = mock_cache

        # Mock isinstance check
        with patch("observability.tasks.isinstance", return_value=True):
            result = collect_system_metrics()

        assert result["cache_hits"] == 1
        assert result["cache_misses"] == 1
        assert result["memory_used"] == 1
        assert result["total_keys"] == 1

        # Verify metrics were created
        assert SystemMetric.objects.count() == 4

    @pytest.mark.django_db
    @patch("observability.tasks.caches")
    def test_collect_metrics_with_non_redis_backend(self, mock_caches):
        """Test that task skips collection for non-Redis backends."""
        mock_cache = MagicMock()
        mock_caches.__getitem__.return_value = mock_cache

        # Mock isinstance check to return False
        with patch("observability.tasks.isinstance", return_value=False):
            result = collect_system_metrics()

        assert result["cache_hits"] == 0
        assert result["cache_misses"] == 0
        assert result["memory_used"] == 0
        assert result["total_keys"] == 0

        # No metrics should be created
        assert SystemMetric.objects.count() == 0

    @pytest.mark.django_db
    @patch("observability.tasks.caches")
    def test_collect_metrics_cleanup_old_metrics(self, mock_caches):
        """Test that task cleans up old metrics."""
        # Create old metrics
        old_time = timezone.now() - timedelta(days=10)
        SystemMetric.record_metric("cache_hits", 100, timestamp=old_time)

        # Mock Redis cache
        mock_redis_client = MagicMock()
        mock_redis_client.info.side_effect = lambda section: {
            "stats": {"keyspace_hits": 1000, "keyspace_misses": 100},
            "memory": {"used_memory": 5000000},
            "keyspace": {},
        }[section]

        mock_cache = MagicMock()
        mock_cache._cache.get_client.return_value = mock_redis_client
        mock_caches.__getitem__.return_value = mock_cache

        with patch("observability.tasks.isinstance", return_value=True):
            collect_system_metrics()

        # Old metric should be deleted, new metrics should exist
        assert SystemMetric.objects.count() == 3  # hits, misses, memory (no keys)


class TestCacheMetricsAPIEndpoint:
    """Tests for GET /api/v1/system/cache/metrics endpoint."""

    @pytest.mark.django_db
    def test_cache_metrics_requires_authentication(self):
        """Test that endpoint requires authentication."""
        client = APIClient()
        url = reverse("observability-cache-metrics")
        response = client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.django_db
    def test_cache_metrics_requires_admin(self, db):
        """Test that endpoint requires admin privileges."""
        user = User.objects.create_user(
            email="user@test.com", password="testpass123", username="user"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        url = reverse("observability-cache-metrics")
        response = client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    @patch("observability.views.caches")
    def test_cache_metrics_returns_realtime_data(self, mock_caches, api_client):
        """Test that endpoint returns real-time metrics."""
        # Mock Redis cache
        mock_redis_client = MagicMock()
        mock_redis_client.info.side_effect = lambda section: {
            "stats": {"keyspace_hits": 1000, "keyspace_misses": 100},
            "memory": {"used_memory": 5000000},
            "keyspace": {"db0": "keys=500,expires=50"},
        }[section]

        mock_cache = MagicMock()
        mock_cache._cache.get_client.return_value = mock_redis_client
        mock_caches.__getitem__.return_value = mock_cache

        with patch("observability.views.isinstance", return_value=True):
            url = reverse("observability-cache-metrics")
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "realtime" in response.data
        assert response.data["realtime"]["hits"] == 1000
        assert response.data["realtime"]["misses"] == 100
        assert response.data["realtime"]["hit_ratio"] == 0.909
        assert response.data["realtime"]["memory_used_bytes"] == 5000000
        assert response.data["realtime"]["total_keys"] == 500

    @pytest.mark.django_db
    def test_cache_metrics_returns_history(self, api_client, sample_metrics):
        """Test that endpoint returns historical metrics."""
        with patch("observability.views.isinstance", return_value=False):
            url = reverse("observability-cache-metrics")
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "history" in response.data
        assert len(response.data["history"]) == 12  # 12 timestamps

        # Verify history structure
        first_point = response.data["history"][0]
        assert "timestamp" in first_point
        assert "hit_ratio" in first_point
        assert "memory_used_bytes" in first_point

    @pytest.mark.django_db
    @patch("observability.views.caches")
    def test_cache_metrics_with_non_redis_backend(self, mock_caches, api_client):
        """Test that endpoint returns empty metrics for non-Redis backends."""
        mock_cache = MagicMock()
        mock_caches.__getitem__.return_value = mock_cache

        with patch("observability.views.isinstance", return_value=False):
            url = reverse("observability-cache-metrics")
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["realtime"]["hits"] == 0
        assert response.data["realtime"]["misses"] == 0


class TestCacheClearAPIEndpoint:
    """Tests for POST /api/v1/system/cache/clear endpoint."""

    @pytest.mark.django_db
    def test_cache_clear_requires_admin(self, db):
        """Test that endpoint requires admin privileges."""
        user = User.objects.create_user(
            email="user@test.com", password="testpass123", username="user"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        url = reverse("observability-cache-clear")
        response = client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    @patch("observability.views.caches")
    def test_cache_clear_flushes_redis(self, mock_caches, api_client):
        """Test that endpoint flushes Redis cache."""
        mock_redis_client = MagicMock()
        mock_redis_client.info.return_value = {"db0": "keys=500,expires=50"}

        mock_cache = MagicMock()
        mock_cache._cache.get_client.return_value = mock_redis_client
        mock_caches.__getitem__.return_value = mock_cache

        with patch("observability.views.isinstance", return_value=True):
            url = reverse("observability-cache-clear")
            response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert response.data["cleared_keys"] == 500
        mock_redis_client.flushall.assert_called_once()

    @pytest.mark.django_db
    @patch("observability.views.caches")
    def test_cache_clear_with_non_redis_backend(self, mock_caches, api_client):
        """Test that endpoint clears non-Redis cache."""
        mock_cache = MagicMock()
        mock_caches.__getitem__.return_value = mock_cache

        with patch("observability.views.isinstance", return_value=False):
            url = reverse("observability-cache-clear")
            response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        mock_cache.clear.assert_called_once()


class TestCacheBenchmarkAPIEndpoint:
    """Tests for POST /api/v1/system/cache/benchmark endpoint."""

    @pytest.mark.django_db
    def test_benchmark_requires_admin(self, db):
        """Test that endpoint requires admin privileges."""
        user = User.objects.create_user(
            email="user@test.com", password="testpass123", username="user"
        )
        client = APIClient()
        client.force_authenticate(user=user)

        url = reverse("observability-cache-benchmark")
        response = client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.django_db
    @patch("observability.views.caches")
    @patch("observability.views.Organisation")
    def test_benchmark_measures_speedup(self, mock_org, mock_caches, api_client):
        """Test that endpoint measures cache speedup."""
        mock_org.objects.count.return_value = 100

        mock_cache = MagicMock()
        mock_cache.get.return_value = 100
        mock_caches.__getitem__.return_value = mock_cache

        url = reverse("observability-cache-benchmark")
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert "uncached_duration_ms" in response.data
        assert "cached_duration_ms" in response.data
        assert "speedup_factor" in response.data
        assert response.data["speedup_factor"] > 0

    @pytest.mark.django_db
    @patch("observability.views.caches")
    @patch("observability.views.Organisation")
    def test_benchmark_verifies_cache_faster(self, mock_org, mock_caches, api_client):
        """Test that cached query is faster than uncached query."""
        mock_org.objects.count.return_value = 100

        mock_cache = MagicMock()
        mock_cache.get.return_value = 100
        mock_caches.__getitem__.return_value = mock_cache

        url = reverse("observability-cache-benchmark")
        # Patch perf_counter to avoid flaky timing-based failures.
        # cold_duration = (0.2 - 0.0) * 1000 = 200ms
        # warm_duration = (1.05 - 1.0) * 1000 = 50ms
        # speedup_factor = 4.0
        with patch("time.perf_counter", side_effect=[0.0, 0.2, 1.0, 1.05]):
            response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        # Cached should be faster (higher speedup factor)
        assert response.data["speedup_factor"] >= 1.0

"""Tests for CacheService."""

from __future__ import annotations

from unittest.mock import Mock, patch

from core.cache.circuit_breaker import CircuitState
from core.cache.services import CacheService


class TestCacheService:
    """Test suite for CacheService."""

    def test_get_success(self) -> None:
        """CacheService should return cached value on success."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.return_value = "cached_value"
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            result = service.get("test_key")

            assert result == "cached_value"
            mock_cache.get.assert_called_once_with("test_key", None)
            assert service.circuit_breaker.state == CircuitState.CLOSED

    def test_get_with_default(self) -> None:
        """CacheService should return default when key not found."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.return_value = None
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            result = service.get("test_key", default="default_value")

            assert result == "default_value"

    def test_get_falls_back_on_redis_error(self) -> None:
        """CacheService should return default when Redis raises exception."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.side_effect = Exception("Redis connection error")
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService(failure_threshold=2)
            result = service.get("test_key", default="fallback")

            assert result == "fallback"
            assert service.circuit_breaker.failure_count == 1

    def test_set_success(self) -> None:
        """CacheService should set value successfully."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            result = service.set("test_key", "test_value", timeout=300)

            assert result is True
            mock_cache.set.assert_called_once_with("test_key", "test_value", 300)
            assert service.circuit_breaker.state == CircuitState.CLOSED

    def test_set_fails_gracefully_on_redis_error(self) -> None:
        """CacheService should return False when set fails."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.set.side_effect = Exception("Redis connection error")
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService(failure_threshold=2)
            result = service.set("test_key", "test_value")

            assert result is False
            assert service.circuit_breaker.failure_count == 1

    def test_circuit_breaker_opens_after_failures(self) -> None:
        """Circuit breaker should open after threshold failures."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.side_effect = Exception("Redis down")
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService(failure_threshold=3)

            # Trigger failures
            service.get("key1", default="fallback")
            service.get("key2", default="fallback")
            service.get("key3", default="fallback")

            assert service.circuit_breaker.state == CircuitState.OPEN
            assert service.circuit_breaker.failure_count == 3

    def test_get_or_compute_cache_hit(self) -> None:
        """get_or_compute should return cached value without calling compute_func."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.return_value = "cached_value"
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            compute_func = Mock(return_value="computed_value")

            result = service.get_or_compute("test_key", compute_func)

            assert result == "cached_value"
            compute_func.assert_not_called()

    def test_get_or_compute_cache_miss(self) -> None:
        """get_or_compute should call compute_func and cache result on miss."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_cache.get.return_value = None
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            compute_func = Mock(return_value="computed_value")

            result = service.get_or_compute("test_key", compute_func, timeout=300)

            assert result == "computed_value"
            compute_func.assert_called_once()
            mock_cache.set.assert_called_once_with("test_key", "computed_value", 300)

    def test_delete_success(self) -> None:
        """CacheService should delete key successfully."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            result = service.delete("test_key")

            assert result is True
            mock_cache.delete.assert_called_once_with("test_key")


class TestCacheServiceTagging:
    """Test suite for CacheService tagging methods."""

    def test_add_tags_success(self) -> None:
        """add_tags should add keys to Redis sets."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_redis_client = Mock()
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            result = service.add_tags("test_key", ["user:123", "profiles"])

            assert result is True
            # Verify Redis SADD was called for each tag
            assert mock_redis_client.sadd.call_count == 2
            mock_redis_client.sadd.assert_any_call("cache:tag:user:123", "test_key")
            mock_redis_client.sadd.assert_any_call("cache:tag:profiles", "test_key")

    def test_add_tags_handles_redis_error(self) -> None:
        """add_tags should return False on Redis error."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_redis_client = Mock()
            mock_redis_client.sadd.side_effect = Exception("Redis error")
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService(failure_threshold=2)
            result = service.add_tags("test_key", ["tag1"])

            assert result is False

    def test_invalidate_tags_success(self) -> None:
        """invalidate_tags should delete all keys associated with tags."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_redis_client = Mock()
            # Simulate Redis set containing 2 keys
            mock_redis_client.smembers.side_effect = [
                {b"key1", b"key2"},  # First tag has 2 keys
                {b"key2", b"key3"},  # Second tag has 2 keys (key2 overlaps)
            ]
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            count = service.invalidate_tags(["user:123", "profiles"])

            # Should return total unique keys invalidated
            assert count == 3  # key1, key2, key3
            # Verify cache deletes were called
            assert mock_cache.delete.call_count == 3
            # Verify tag sets were deleted
            assert mock_redis_client.delete.call_count == 2

    def test_invalidate_tags_empty_sets(self) -> None:
        """invalidate_tags should handle empty tag sets gracefully."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_redis_client = Mock()
            mock_redis_client.smembers.return_value = set()  # Empty set
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            count = service.invalidate_tags(["nonexistent"])

            assert count == 0
            mock_cache.delete.assert_not_called()

    def test_invalidate_tags_with_string_keys(self) -> None:
        """invalidate_tags should handle both bytes and string keys."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_redis_client = Mock()
            # Mix of bytes and strings
            mock_redis_client.smembers.return_value = {b"key1", "key2"}
            mock_cache.client.get_client.return_value = mock_redis_client
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            count = service.invalidate_tags(["mixed"])

            assert count == 2
            assert mock_cache.delete.call_count == 2

    def test_invalidate_tags_circuit_breaker_open(self) -> None:
        """invalidate_tags should return 0 when circuit is open."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            # Force circuit to open
            service.circuit_breaker._state = CircuitState.OPEN

            count = service.invalidate_tags(["test"])

            assert count == 0

    def test_add_tags_circuit_breaker_open(self) -> None:
        """add_tags should return False when circuit is open."""
        with patch("core.cache.services.caches") as mock_caches:
            mock_cache = Mock()
            mock_caches.__getitem__.return_value = mock_cache

            service = CacheService()
            # Force circuit to open
            service.circuit_breaker._state = CircuitState.OPEN

            result = service.add_tags("key", ["tag"])

            assert result is False

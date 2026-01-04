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

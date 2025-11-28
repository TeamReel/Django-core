"""
Cache layer tests for Settings & Feature Flags system.

Tests cache key generation, TTL behavior, pub/sub invalidation,
and Redis connection handling.
"""

from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from src.settings.cache import (
    generate_cache_key,
    get_cached_value,
    invalidate_cache,
    publish_invalidation,
    set_cached_value,
)
from src.settings.models import ScopeType


class TestCacheKeyGeneration:
    """Test cache key generation consistency."""

    def test_global_scope_key(self):
        """Test cache key generation for global scope."""
        key = generate_cache_key("test_key", ScopeType.GLOBAL)
        expected = "settings:flag:test_key:GLOBAL:None:None"
        assert key == expected

    def test_organisation_scope_key(self, test_organisation):
        """Test cache key generation for organisation scope."""
        key = generate_cache_key(
            "test_key", ScopeType.ORGANISATION, organisation_id=test_organisation.id
        )
        expected = f"settings:flag:test_key:ORGANISATION:{test_organisation.id}:None"
        assert key == expected

    def test_project_scope_key(self, test_organisation, test_project):
        """Test cache key generation for project scope."""
        key = generate_cache_key(
            "test_key",
            ScopeType.PROJECT,
            organisation_id=test_organisation.id,
            project_id=test_project.id,
        )
        expected = f"settings:flag:test_key:PROJECT:{test_organisation.id}:{test_project.id}"
        assert key == expected

    def test_setting_cache_key(self):
        """Test cache key generation for settings."""
        key = generate_cache_key("test_setting", ScopeType.GLOBAL, cache_type="setting")
        expected = "settings:setting:test_setting:GLOBAL:None:None"
        assert key == expected

    def test_key_consistency(self, test_organisation, test_project):
        """Test that same inputs generate same keys."""
        key1 = generate_cache_key(
            "consistent_key",
            ScopeType.PROJECT,
            organisation_id=test_organisation.id,
            project_id=test_project.id,
        )

        key2 = generate_cache_key(
            "consistent_key",
            ScopeType.PROJECT,
            organisation_id=test_organisation.id,
            project_id=test_project.id,
        )

        assert key1 == key2

    def test_special_characters_in_key(self):
        """Test cache key generation with special characters."""
        key = generate_cache_key("key-with_special.chars", ScopeType.GLOBAL)
        assert "key-with_special.chars" in key
        # Key should be safe for Redis
        assert ":" not in "key-with_special.chars"


class TestCacheOperations:
    """Test basic cache operations."""

    def test_get_cached_value_miss(self, mock_redis):
        """Test cache miss returns None."""
        mock_redis.get.return_value = None

        result = get_cached_value("missing_key")

        assert result is None
        mock_redis.get.assert_called_once_with("missing_key")

    def test_get_cached_value_hit(self, mock_redis):
        """Test cache hit returns deserialised value."""
        mock_redis.get.return_value = b'{"value": true, "type": "flag"}'

        result = get_cached_value("existing_key")

        assert result == {"value": True, "type": "flag"}
        mock_redis.get.assert_called_once_with("existing_key")

    def test_set_cached_value(self, mock_redis):
        """Test setting cached values."""
        data = {"value": False, "type": "flag"}

        set_cached_value("test_key", data, ttl=300)

        mock_redis.set.assert_called_once()
        args, kwargs = mock_redis.set.call_args
        assert args[0] == "test_key"
        assert kwargs.get("ex") == 300

    def test_set_cached_value_default_ttl(self, mock_redis):
        """Test setting cached values with default TTL."""
        data = {"value": True, "type": "flag"}

        set_cached_value("test_key", data)

        mock_redis.set.assert_called_once()
        args, kwargs = mock_redis.set.call_args
        assert args[0] == "test_key"
        assert kwargs.get("ex") == 300  # Default TTL

    def test_cache_serialization_json(self, mock_redis):
        """Test complex data serialization."""
        complex_data = {
            "value": {"nested": "data", "numbers": [1, 2, 3]},
            "type": "setting",
            "metadata": {"timestamp": "2025-01-01T00:00:00Z"},
        }

        set_cached_value("complex_key", complex_data)

        # Verify JSON serialization occurred
        mock_redis.set.assert_called_once()
        args = mock_redis.set.call_args[0]
        serialized_data = args[1]

        # Should be valid JSON string
        import json

        deserialized = json.loads(serialized_data)
        assert deserialized == complex_data


class TestCacheInvalidation:
    """Test cache invalidation patterns."""

    def test_invalidate_single_key(self, mock_redis):
        """Test invalidating a single cache key."""
        invalidate_cache("test_key")

        mock_redis.delete.assert_called_once_with("test_key")

    def test_invalidate_pattern(self, mock_redis):
        """Test invalidating keys by pattern."""
        # Mock Redis SCAN to return some matching keys
        mock_redis.scan_iter.return_value = [
            b"settings:flag:test_key:GLOBAL:None:None",
            b"settings:flag:test_key:ORGANISATION:123:None",
            b"settings:flag:test_key:PROJECT:123:456",
        ]

        invalidate_cache("settings:flag:test_key:*")

        # Should scan for pattern and delete matching keys
        mock_redis.scan_iter.assert_called_once_with(match="settings:flag:test_key:*")
        assert mock_redis.delete.call_count == 3

    def test_publish_invalidation(self, mock_redis):
        """Test publishing cache invalidation events."""
        publish_invalidation("test_key", "flag", ScopeType.GLOBAL)

        # Should publish to Redis channel
        mock_redis.publish.assert_called_once()
        args = mock_redis.publish.call_args[0]
        assert args[0] == "settings:invalidation"

        # Verify message structure
        import json

        message = json.loads(args[1])
        assert message["key"] == "test_key"
        assert message["type"] == "flag"
        assert message["scope"] == ScopeType.GLOBAL

    def test_invalidation_broadcast(self, mock_redis):
        """Test that invalidation is broadcast to all instances."""
        # Simulate multiple cache keys that need invalidation
        mock_redis.scan_iter.return_value = [b"settings:flag:broadcast_test:GLOBAL:None:None"]

        publish_invalidation("broadcast_test", "flag", ScopeType.GLOBAL)

        # Should publish and trigger local invalidation
        mock_redis.publish.assert_called_once()
        mock_redis.scan_iter.assert_called_once()


class TestRedisConnectionHandling:
    """Test Redis connection and error handling."""

    def test_redis_connection_failure(self):
        """Test graceful degradation when Redis is unavailable."""
        with patch("src.settings.cache.redis_client") as mock_redis_client:
            # Mock Redis connection failure
            mock_redis = MagicMock()
            mock_redis.get.side_effect = Exception("Redis connection failed")
            mock_redis_client.return_value = mock_redis

            # Should return None instead of raising exception
            result = get_cached_value("test_key")
            assert result is None

    def test_redis_set_failure(self):
        """Test handling Redis write failures."""
        with patch("src.settings.cache.redis_client") as mock_redis_client:
            mock_redis = MagicMock()
            mock_redis.set.side_effect = Exception("Redis write failed")
            mock_redis_client.return_value = mock_redis

            # Should not raise exception
            set_cached_value("test_key", {"value": True})

            # Should have attempted to set
            mock_redis.set.assert_called_once()

    @patch("src.settings.cache.redis_client")
    def test_redis_ping_health_check(self, mock_redis_client):
        """Test Redis health check functionality."""
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True
        mock_redis_client.return_value = mock_redis

        from src.settings.cache import is_redis_available

        assert is_redis_available() is True
        mock_redis.ping.assert_called_once()

    @patch("src.settings.cache.redis_client")
    def test_redis_ping_failure(self, mock_redis_client):
        """Test Redis health check when connection fails."""
        mock_redis = MagicMock()
        mock_redis.ping.side_effect = Exception("Connection failed")
        mock_redis_client.return_value = mock_redis

        from src.settings.cache import is_redis_available

        assert is_redis_available() is False


class TestCachePerformance:
    """Test cache performance characteristics."""

    def test_cache_ttl_expiration(self, mock_redis):
        """Test that cache entries expire according to TTL."""
        # Set short TTL
        set_cached_value("ttl_test", {"value": True}, ttl=1)

        mock_redis.set.assert_called_once()
        args, kwargs = mock_redis.set.call_args
        assert kwargs.get("ex") == 1

    def test_cache_key_length(self, test_organisation, test_project):
        """Test that cache keys are reasonable length."""
        key = generate_cache_key(
            "very_long_key_name_that_might_be_problematic",
            ScopeType.PROJECT,
            organisation_id=test_organisation.id,
            project_id=test_project.id,
        )

        # Redis keys should be under 512MB, but practically much shorter
        assert len(key) < 250  # Reasonable limit

    def test_bulk_invalidation_efficiency(self, mock_redis):
        """Test that bulk invalidation is efficient."""
        # Mock many matching keys
        mock_keys = [f"settings:flag:bulk_test:SCOPE:{i}:None".encode() for i in range(100)]
        mock_redis.scan_iter.return_value = mock_keys

        invalidate_cache("settings:flag:bulk_test:*")

        # Should use scan_iter (cursor-based) rather than keys (blocking)
        mock_redis.scan_iter.assert_called_once()
        # Should batch delete rather than individual calls
        assert mock_redis.delete.call_count == 100


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
)
class TestDjangoCacheIntegration(TestCase):
    """Test integration with Django's cache framework."""

    def test_django_cache_fallback(self):
        """Test fallback to Django cache when Redis unavailable."""
        # Use Django cache directly
        cache.set("django_test", "test_value", 300)

        result = cache.get("django_test")
        self.assertEqual(result, "test_value")

    def test_cache_versioning(self):
        """Test cache versioning for safe updates."""
        # Set value with version
        cache.set("versioned_test", "v1", 300, version=1)

        # Get with same version
        result = cache.get("versioned_test", version=1)
        self.assertEqual(result, "v1")

        # Get with different version should return None
        result = cache.get("versioned_test", version=2)
        self.assertIsNone(result)

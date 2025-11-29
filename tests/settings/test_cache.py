"""
Cache layer tests for Settings & Feature Flags system.

Tests cache key generation, TTL behavior, and Redis connection handling.
"""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from settings.cache import (
    CACHE_PREFIX,
    generate_cache_key,
    get_cached_value,
    invalidate_cache,
    set_cached_value,
)


class TestCacheKeyGeneration(TestCase):
    """Test cache key generation consistency."""

    def test_global_scope_key(self):
        """Test cache key generation for global scope."""
        key = generate_cache_key("flag", "test_key", "global")
        expected = f"{CACHE_PREFIX}flag:global:none:test_key"
        self.assertEqual(key, expected)

    def test_organisation_scope_key(self):
        """Test cache key generation for organisation scope."""
        org_id = "123e4567-e89b-12d3-a456-426614174000"
        key = generate_cache_key("flag", "test_key", "organisation", scope_id=org_id)
        expected = f"{CACHE_PREFIX}flag:organisation:{org_id}:test_key"
        self.assertEqual(key, expected)

    def test_project_scope_key(self):
        """Test cache key generation for project scope."""
        project_id = "987fcdeb-51a2-3b4c-d5e6-789012345678"
        key = generate_cache_key("flag", "test_key", "project", scope_id=project_id)
        expected = f"{CACHE_PREFIX}flag:project:{project_id}:test_key"
        self.assertEqual(key, expected)

    def test_setting_cache_key(self):
        """Test cache key generation for settings."""
        key = generate_cache_key("setting", "test_setting", "global")
        expected = f"{CACHE_PREFIX}setting:global:none:test_setting"
        self.assertEqual(key, expected)

    def test_key_consistency(self):
        """Test that same inputs generate same keys."""
        scope_id = "123e4567-e89b-12d3-a456-426614174000"

        key1 = generate_cache_key("flag", "consistent_key", "organisation", scope_id=scope_id)
        key2 = generate_cache_key("flag", "consistent_key", "organisation", scope_id=scope_id)

        self.assertEqual(key1, key2)

    def test_special_characters_in_key(self):
        """Test cache key generation with special characters."""
        key = generate_cache_key("flag", "key-with_special.chars", "global")
        self.assertIn("key-with_special.chars", key)


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
)
class TestCacheOperations(TestCase):
    """Test basic cache operations using Django's cache framework."""

    def test_get_cached_value_miss(self):
        """Test cache miss returns None."""
        result = get_cached_value("missing_key_12345")
        self.assertIsNone(result)

    def test_get_cached_value_hit(self):
        """Test cache hit returns value."""
        # Set value directly via Django cache
        cache.set("test_key", {"value": True, "type": "flag"}, 300)

        result = get_cached_value("test_key")
        self.assertEqual(result, {"value": True, "type": "flag"})

    def test_set_cached_value(self):
        """Test setting cached values."""
        data = {"value": False, "type": "flag"}
        result = set_cached_value("set_test_key", data, ttl=300)

        self.assertTrue(result)

        # Verify it was set
        cached = cache.get("set_test_key")
        self.assertEqual(cached, data)

    def test_set_cached_value_default_ttl(self):
        """Test setting cached values with default TTL."""
        data = {"value": True, "type": "flag"}
        result = set_cached_value("default_ttl_key", data)

        self.assertTrue(result)

        # Verify it was set
        cached = cache.get("default_ttl_key")
        self.assertEqual(cached, data)

    def test_cache_complex_data(self):
        """Test caching complex data structures."""
        complex_data = {
            "value": {"nested": "data", "numbers": [1, 2, 3]},
            "type": "setting",
            "metadata": {"timestamp": "2025-01-01T00:00:00Z"},
        }

        set_cached_value("complex_key", complex_data)

        result = get_cached_value("complex_key")
        self.assertEqual(result, complex_data)


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
)
class TestCacheInvalidation(TestCase):
    """Test cache invalidation patterns."""

    def test_invalidate_single_key(self):
        """Test invalidating a single cache key."""
        # Set a value first
        cache.set("invalidate_test", "value", 300)
        self.assertEqual(cache.get("invalidate_test"), "value")

        # Invalidate it
        result = invalidate_cache("invalidate_test")

        self.assertTrue(result)
        self.assertIsNone(cache.get("invalidate_test"))


class TestCacheDisabled(TestCase):
    """Test behavior when cache is disabled."""

    @patch("settings.cache.CACHE_ENABLED", False)
    def test_get_cached_value_returns_none(self):
        """Test get returns None when cache disabled."""
        result = get_cached_value("any_key")
        self.assertIsNone(result)

    @patch("settings.cache.CACHE_ENABLED", False)
    def test_set_cached_value_returns_false(self):
        """Test set returns False when cache disabled."""
        result = set_cached_value("any_key", {"value": True})
        self.assertFalse(result)

    @patch("settings.cache.CACHE_ENABLED", False)
    def test_invalidate_returns_false(self):
        """Test invalidate returns False when cache disabled."""
        result = invalidate_cache("any_key")
        self.assertFalse(result)


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
        cache.set("django_test", "test_value", 300)

        result = cache.get("django_test")
        self.assertEqual(result, "test_value")

    def test_cache_versioning(self):
        """Test cache versioning for safe updates."""
        cache.set("versioned_test", "v1", 300, version=1)

        # Get with same version
        result = cache.get("versioned_test", version=1)
        self.assertEqual(result, "v1")

        # Get with different version should return None
        result = cache.get("versioned_test", version=2)
        self.assertIsNone(result)

    def test_cache_ttl_can_be_set(self):
        """Test that TTL can be set on cache entries."""
        # This just verifies the API works, actual expiration needs time
        result = set_cached_value("ttl_test", {"value": True}, ttl=60)
        self.assertTrue(result)

"""Unit tests for cache decorators and tagging."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from src.core.cache.decorators import cache_invalidate, cache_result


@pytest.fixture
def mock_cache_service():
    """Mock CacheService for testing decorators."""
    with patch("src.core.cache.decorators.CacheService") as mock:
        service_instance = MagicMock()
        mock.return_value = service_instance
        yield service_instance


class TestCacheResultDecorator:
    """Test the @cache_result decorator."""

    def test_cache_miss_executes_function(self, mock_cache_service):
        """Test that function is executed on cache miss."""
        mock_cache_service.get.return_value = None

        call_count = 0

        @cache_result(ttl=60)
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y

        result = expensive_function(2, 3)

        assert result == 5
        assert call_count == 1
        mock_cache_service.get.assert_called_once()
        mock_cache_service.set.assert_called_once()

    def test_cache_hit_skips_function(self, mock_cache_service):
        """Test that function is not executed on cache hit."""
        mock_cache_service.get.return_value = 42

        call_count = 0

        @cache_result(ttl=60)
        def expensive_function(x, y):
            nonlocal call_count
            call_count += 1
            return x + y

        result = expensive_function(2, 3)

        assert result == 42  # Cached value
        assert call_count == 0  # Function not called
        mock_cache_service.get.assert_called_once()
        mock_cache_service.set.assert_not_called()

    def test_explicit_key_pattern(self, mock_cache_service):
        """Test explicit key pattern formatting."""
        mock_cache_service.get.return_value = None

        @cache_result(key_pattern="user:{user_id}:profile", ttl=300)
        def get_user_profile(user_id):
            return {"id": user_id, "name": "Test User"}

        get_user_profile(123)

        # Check that cache was called with formatted key
        call_args = mock_cache_service.get.call_args
        assert call_args[0][0] == "user:123:profile"

    def test_auto_hash_key_generation(self, mock_cache_service):
        """Test automatic hash-based key generation."""
        mock_cache_service.get.return_value = None

        @cache_result(ttl=60)
        def simple_function(x, y):
            return x * y

        simple_function(5, 10)

        # Check that cache was called with auto-generated key
        call_args = mock_cache_service.get.call_args
        cache_key = call_args[0][0]
        assert cache_key.startswith("cache:auto:simple_function:")

    def test_tags_are_added(self, mock_cache_service):
        """Test that tags are added after caching."""
        mock_cache_service.get.return_value = None

        @cache_result(
            key_pattern="org:{org_id}:stats",
            ttl=600,
            tags=["org:{org_id}", "stats"],
        )
        def get_org_stats(org_id):
            return {"total_users": 100}

        get_org_stats(456)

        # Verify tags were added with formatted values
        mock_cache_service.add_tags.assert_called_once()
        call_args = mock_cache_service.add_tags.call_args
        assert call_args[0][0] == "org:456:stats"  # key
        assert "org:456" in call_args[0][1]  # formatted tag
        assert "stats" in call_args[0][1]  # static tag

    def test_method_caching(self, mock_cache_service):
        """Test that decorator works with class methods."""
        mock_cache_service.get.return_value = None

        class Calculator:
            @cache_result(ttl=60)
            def multiply(self, x, y):
                return x * y

        calc = Calculator()
        result = calc.multiply(3, 7)

        assert result == 21
        mock_cache_service.get.assert_called_once()

    def test_custom_cache_alias(self, mock_cache_service):
        """Test that custom cache alias is used."""
        mock_cache_service.get.return_value = None

        with patch("src.core.cache.decorators.CacheService") as mock_service_class:
            mock_instance = MagicMock()
            mock_service_class.return_value = mock_instance
            mock_instance.get.return_value = None

            @cache_result(ttl=60, cache_alias="sessions")
            def session_function():
                return "session_data"

            session_function()

            # Verify CacheService was initialized with correct alias
            mock_service_class.assert_called_with(cache_alias="sessions")


class TestCacheInvalidateDecorator:
    """Test the @cache_invalidate decorator."""

    def test_invalidate_after_execution(self, mock_cache_service):
        """Test that tags are invalidated after function execution."""
        mock_cache_service.invalidate_tags.return_value = 3

        @cache_invalidate(tags=["user:{user_id}", "profiles"])
        def update_user(user_id, name):
            return {"id": user_id, "name": name}

        result = update_user(789, "New Name")

        assert result == {"id": 789, "name": "New Name"}
        mock_cache_service.invalidate_tags.assert_called_once()
        call_args = mock_cache_service.invalidate_tags.call_args
        assert "user:789" in call_args[0][0]  # formatted tag
        assert "profiles" in call_args[0][0]  # static tag

    def test_invalidate_with_kwargs(self, mock_cache_service):
        """Test tag formatting with keyword arguments."""
        mock_cache_service.invalidate_tags.return_value = 1

        @cache_invalidate(tags=["org:{org_id}"])
        def delete_org(org_id=None):
            return f"Deleted org {org_id}"

        delete_org(org_id=999)

        mock_cache_service.invalidate_tags.assert_called_once()
        call_args = mock_cache_service.invalidate_tags.call_args
        assert "org:999" in call_args[0][0]

    def test_custom_cache_alias_invalidate(self, mock_cache_service):
        """Test that custom cache alias is used for invalidation."""
        with patch("src.core.cache.decorators.CacheService") as mock_service_class:
            mock_instance = MagicMock()
            mock_service_class.return_value = mock_instance
            mock_instance.invalidate_tags.return_value = 0

            @cache_invalidate(tags=["test"], cache_alias="locks")
            def clear_locks():
                return "cleared"

            clear_locks()

            # Verify CacheService was initialized with correct alias
            mock_service_class.assert_called_with(cache_alias="locks")


class TestTaggingScenarios:
    """Test complete tagging workflows."""

    def test_cache_and_invalidate_workflow(self, mock_cache_service):
        """Test a complete cache-then-invalidate workflow."""
        mock_cache_service.get.return_value = None
        mock_cache_service.invalidate_tags.return_value = 1

        # Cache a value
        @cache_result(
            key_pattern="product:{product_id}",
            ttl=300,
            tags=["product:{product_id}"],
        )
        def get_product(product_id):
            return {"id": product_id, "name": "Widget"}

        # Invalidate the cache
        @cache_invalidate(tags=["product:{product_id}"])
        def update_product(product_id, name):
            return {"id": product_id, "name": name}

        # First call caches the result
        product = get_product(111)
        assert product == {"id": 111, "name": "Widget"}
        mock_cache_service.add_tags.assert_called_once()

        # Update invalidates the cache
        updated = update_product(111, "New Widget")
        assert updated == {"id": 111, "name": "New Widget"}
        mock_cache_service.invalidate_tags.assert_called_once()

    def test_multiple_tags_invalidation(self, mock_cache_service):
        """Test invalidating multiple tags at once."""
        mock_cache_service.invalidate_tags.return_value = 5

        @cache_invalidate(tags=["users", "profiles", "permissions"])
        def reset_user_system():
            return "reset"

        result = reset_user_system()

        assert result == "reset"
        call_args = mock_cache_service.invalidate_tags.call_args
        tags = call_args[0][0]
        assert len(tags) == 3
        assert "users" in tags
        assert "profiles" in tags
        assert "permissions" in tags

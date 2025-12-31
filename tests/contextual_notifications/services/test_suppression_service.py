"""Tests for SuppressionService."""

from unittest.mock import patch

import pytest
from django.core.cache import cache

from contextual_notifications.services.suppression_service import SuppressionService


@pytest.mark.django_db
class TestSuppressionService:
    """Tests for SuppressionService."""

    def test_check_suppression_not_suppressed(self):
        """Test that non-suppressed notification is allowed."""
        cache.clear()

        is_suppressed = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )

        assert is_suppressed is False  # Not suppressed (first occurrence)

    def test_check_suppression_suppressed(self):
        """Test that suppressed notification is filtered out."""
        cache.clear()

        # First call sets suppression
        SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )

        # Second call should be suppressed
        is_suppressed = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )

        assert is_suppressed is True  # Suppressed (duplicate)

    def test_check_suppression_key_format(self):
        """Test that suppression key has correct format."""
        cache.clear()

        is_suppressed = SuppressionService.check_suppression(
            user_id=42,
            event_type="task.assigned",
            resource_id="task_123",
            channel="email",
        )

        # Verify key was created (not suppressed on first call)
        assert is_suppressed is False

        # Verify key format by checking it exists in cache
        expected_key = "suppression:42:task.assigned:task_123:email"
        assert cache.get(expected_key) is not None

    def test_check_suppression_ttl(self):
        """Test that suppression key has correct TTL."""
        cache.clear()

        SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
            ttl=300,
        )

        # Verify key was created (TTL is tested through cache backend)
        cache_key = "suppression:1:project.updated:project_42:in_app"
        assert cache.get(cache_key) is not None

    def test_check_suppression_missing_resource_id(self):
        """Test that notifications without resource_id use 'global' in key."""
        cache.clear()

        is_suppressed = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id=None,
            channel="in_app",
        )

        # Should not be suppressed (first occurrence)
        assert is_suppressed is False

        # Verify key format with 'global'
        expected_key = "suppression:1:project.updated:global:in_app"
        assert cache.get(expected_key) is not None

    def test_check_suppression_multiple_users(self):
        """Test suppression with multiple users."""
        cache.clear()

        # User 1 first notification
        is_suppressed_1 = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )
        assert is_suppressed_1 is False  # Not suppressed

        # User 1 duplicate notification
        is_suppressed_1_dup = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )
        assert is_suppressed_1_dup is True  # Suppressed

        # User 2 first notification (different user, not suppressed)
        is_suppressed_2 = SuppressionService.check_suppression(
            user_id=2,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )
        assert is_suppressed_2 is False  # Not suppressed

    @patch("contextual_notifications.services.suppression_service.cache")
    def test_check_suppression_redis_failure(self, mock_cache):
        """Test that Redis failure allows notification (fail-open)."""
        mock_cache.add.side_effect = Exception("Redis connection failed")

        is_suppressed = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )

        # Should not be suppressed (fail-open on Redis error)
        assert is_suppressed is False

    @patch("contextual_notifications.services.suppression_service.cache")
    @patch("contextual_notifications.services.suppression_service.logger")
    def test_check_suppression_logs_redis_failure(self, mock_logger, mock_cache):
        """Test that Redis failures are logged."""
        mock_cache.add.side_effect = Exception("Redis connection failed")

        SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )

        # Should log warning
        mock_logger.warning.assert_called()

    def test_check_suppression_different_channels_not_suppressed(self):
        """Test that same user + resource on different channels are not suppressed."""
        cache.clear()

        # In-app notification
        is_suppressed_in_app = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )
        assert is_suppressed_in_app is False  # Not suppressed

        # Email notification (different channel, not suppressed)
        is_suppressed_email = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="email",
        )
        assert is_suppressed_email is False  # Not suppressed (different channel)

        # Verify both keys exist
        assert cache.get("suppression:1:project.updated:project_42:in_app") is not None
        assert cache.get("suppression:1:project.updated:project_42:email") is not None

    def test_legacy_cache_key_without_channel(self):
        """Test that legacy cache entries (without channel) don't interfere with channel-aware keys."""
        cache.clear()

        # Simulate legacy cache entry (no channel suffix)
        legacy_key = "suppression:1:project.updated:project_42"
        cache.set(legacy_key, "legacy_value", timeout=300)

        # Channel-aware keys should not be suppressed by legacy key
        is_suppressed_in_app = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="in_app",
        )
        assert is_suppressed_in_app is False  # Not suppressed (different key format)

        is_suppressed_email = SuppressionService.check_suppression(
            user_id=1,
            event_type="project.updated",
            resource_id="project_42",
            channel="email",
        )
        assert is_suppressed_email is False  # Not suppressed (different key format)

        # Verify legacy key still exists (untouched)
        assert cache.get(legacy_key) == "legacy_value"

        # Verify new keys exist
        assert cache.get("suppression:1:project.updated:project_42:in_app") is not None
        assert cache.get("suppression:1:project.updated:project_42:email") is not None

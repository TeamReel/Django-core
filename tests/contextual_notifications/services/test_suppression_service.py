"""Tests for SuppressionService."""

from unittest.mock import patch

import pytest
from contextual_notifications.services.suppression_service import SuppressionService


@pytest.mark.django_db
class TestSuppressionService:
    """Tests for SuppressionService."""

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_not_suppressed(self, mock_redis):
        """Test that non-suppressed notification is allowed."""
        mock_redis.get.return_value = None  # Not suppressed

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            }
        ]

        filtered = SuppressionService.check_suppression(decisions)

        assert len(filtered) == 1
        assert filtered[0]["user_id"] == 1

        # Should set suppression key
        mock_redis.setex.assert_called_once()

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_suppressed(self, mock_redis):
        """Test that suppressed notification is filtered out."""
        mock_redis.get.return_value = "1"  # Already suppressed

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            }
        ]

        filtered = SuppressionService.check_suppression(decisions)

        # Should be filtered out
        assert len(filtered) == 0

        # Should NOT set new suppression (already exists)
        mock_redis.setex.assert_not_called()

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_key_format(self, mock_redis):
        """Test that suppression key has correct format."""
        mock_redis.get.return_value = None

        decisions = [
            {
                "user_id": 42,
                "channel": "email",
                "event_type": "task.assigned",
                "context": {"resource_id": "task_123"},
                "payload": {"title": "Test"},
            }
        ]

        SuppressionService.check_suppression(decisions)

        # Verify key format: suppression:{user_id}:{event_type}:{resource_id}
        call_args = mock_redis.get.call_args[0][0]
        assert call_args == "suppression:42:task.assigned:task_123"

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_ttl(self, mock_redis):
        """Test that suppression key has correct TTL."""
        mock_redis.get.return_value = None

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            }
        ]

        SuppressionService.check_suppression(decisions)

        # Verify TTL (default 300 seconds = 5 minutes)
        call_args = mock_redis.setex.call_args[0]
        key, ttl, value = call_args
        assert ttl == 300

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_missing_resource_id(self, mock_redis):
        """Test that decisions without resource_id are not suppressed."""
        mock_redis.get.return_value = None

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {},  # No resource_id
                "payload": {"title": "Test"},
            }
        ]

        filtered = SuppressionService.check_suppression(decisions)

        # Should pass through (no suppression without resource_id)
        assert len(filtered) == 1

        # Should NOT call Redis
        mock_redis.get.assert_not_called()
        mock_redis.setex.assert_not_called()

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_multiple_users(self, mock_redis):
        """Test suppression with multiple users."""

        # User 1 suppressed, User 2 not suppressed
        def mock_get(key):
            if "user:1:" in key:
                return "1"  # Suppressed
            return None  # Not suppressed

        mock_redis.get.side_effect = mock_get

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            },
            {
                "user_id": 2,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            },
        ]

        filtered = SuppressionService.check_suppression(decisions)

        # Only user 2 should remain
        assert len(filtered) == 1
        assert filtered[0]["user_id"] == 2

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_redis_failure(self, mock_redis):
        """Test that Redis failure allows notification (fail-open)."""
        mock_redis.get.side_effect = Exception("Redis connection failed")

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            }
        ]

        filtered = SuppressionService.check_suppression(decisions)

        # Should pass through (fail-open on Redis error)
        assert len(filtered) == 1

    @patch("contextual_notifications.services.suppression_service.redis_client")
    @patch("contextual_notifications.services.suppression_service.logger")
    def test_check_suppression_logs_redis_failure(self, mock_logger, mock_redis):
        """Test that Redis failures are logged."""
        mock_redis.get.side_effect = Exception("Redis connection failed")

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            }
        ]

        SuppressionService.check_suppression(decisions)

        # Should log warning
        mock_logger.warning.assert_called()

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_empty_decisions(self, mock_redis):
        """Test suppression with empty decisions list."""
        filtered = SuppressionService.check_suppression([])

        assert filtered == []
        mock_redis.get.assert_not_called()

    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_check_suppression_different_channels_not_suppressed(self, mock_redis):
        """Test that same user + resource on different channels are not suppressed."""
        mock_redis.get.return_value = None

        decisions = [
            {
                "user_id": 1,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            },
            {
                "user_id": 1,
                "channel": "email",
                "event_type": "project.updated",
                "context": {"resource_id": "project_42"},
                "payload": {"title": "Test"},
            },
        ]

        filtered = SuppressionService.check_suppression(decisions)

        # Both should pass (channels are independent)
        assert len(filtered) == 2

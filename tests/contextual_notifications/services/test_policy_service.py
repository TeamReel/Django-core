"""Tests for PolicyService."""

import pytest
from datetime import time, datetime
from unittest.mock import patch
from contextual_notifications.services.policy_service import PolicyService
from contextual_notifications.models import OrganisationNotificationPolicy


@pytest.mark.django_db
class TestPolicyService:
    """Tests for PolicyService."""

    def test_apply_policies_no_policy_configured(self, user):
        """Test that decisions pass through when no policy configured."""
        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"org_id": 999},  # No policy for this org
                "payload": {"title": "Test"},
            }
        ]

        result = PolicyService.apply_policies(decisions)

        assert len(result) == 1

    def test_apply_policies_quiet_hours_disabled(
        self, org_notification_policy_no_quiet_hours, user
    ):
        """Test that decisions pass through when quiet hours disabled."""
        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {
                    "org_id": org_notification_policy_no_quiet_hours.organisation.id
                },
                "payload": {"title": "Test"},
            }
        ]

        result = PolicyService.apply_policies(decisions)

        assert len(result) == 1

    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_apply_policies_outside_quiet_hours(
        self, mock_now, org_notification_policy, user
    ):
        """Test that notifications go through outside quiet hours."""
        # Mock time at 10:00 AM (outside quiet hours 22:00-08:00)
        mock_now.return_value = datetime(2025, 12, 3, 10, 0, 0)

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"org_id": org_notification_policy.organisation.id},
                "payload": {"title": "Test"},
            }
        ]

        result = PolicyService.apply_policies(decisions)

        assert len(result) == 1

    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_apply_policies_during_quiet_hours_urgent(
        self, mock_now, org_notification_policy, user
    ):
        """Test that urgent notifications bypass quiet hours."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "task.overdue",
                "context": {"org_id": org_notification_policy.organisation.id},
                "payload": {"title": "Test"},
                "priority": "urgent",
            }
        ]

        result = PolicyService.apply_policies(decisions)

        # Urgent notifications bypass quiet hours
        assert len(result) == 1

    @patch("contextual_notifications.services.policy_service.timezone.now")
    @patch("contextual_notifications.services.policy_service.redis_client")
    def test_apply_policies_during_quiet_hours_rate_limited(
        self, mock_redis, mock_now, org_notification_policy, user
    ):
        """Test that normal priority notifications are rate limited during quiet hours."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        # Mock Redis to return rate limit count below threshold
        mock_redis.get.return_value = "2"  # Under limit of 5
        mock_redis.incr.return_value = 3

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"org_id": org_notification_policy.organisation.id},
                "payload": {"title": "Test"},
                "priority": "normal",
            }
        ]

        result = PolicyService.apply_policies(decisions)

        # Should pass (under rate limit)
        assert len(result) == 1

        # Should increment counter
        mock_redis.incr.assert_called()

    @patch("contextual_notifications.services.policy_service.timezone.now")
    @patch("contextual_notifications.services.policy_service.redis_client")
    def test_apply_policies_during_quiet_hours_exceeded_rate_limit(
        self, mock_redis, mock_now, org_notification_policy, user
    ):
        """Test that notifications are blocked when rate limit exceeded."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        # Mock Redis to return count at rate limit
        mock_redis.get.return_value = "5"  # At limit
        mock_redis.incr.return_value = 6  # Would exceed

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"org_id": org_notification_policy.organisation.id},
                "payload": {"title": "Test"},
                "priority": "normal",
            }
        ]

        result = PolicyService.apply_policies(decisions)

        # Should be blocked (rate limit exceeded)
        assert len(result) == 0

    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_is_quiet_hours_true(self, mock_now, org_notification_policy):
        """Test quiet hours detection when current time is within window."""
        # Quiet hours: 22:00-08:00
        # Mock time at 23:00
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        result = PolicyService.is_quiet_hours(org_notification_policy.organisation.id)

        assert result is True

    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_is_quiet_hours_false(self, mock_now, org_notification_policy):
        """Test quiet hours detection when current time is outside window."""
        # Quiet hours: 22:00-08:00
        # Mock time at 10:00 AM
        mock_now.return_value = datetime(2025, 12, 3, 10, 0, 0)

        result = PolicyService.is_quiet_hours(org_notification_policy.organisation.id)

        assert result is False

    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_is_quiet_hours_overnight_window(self, mock_now, org_notification_policy):
        """Test quiet hours with overnight window (crosses midnight)."""
        # Quiet hours: 22:00-08:00 (crosses midnight)
        # Mock time at 02:00 AM (should be within quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 2, 0, 0)

        result = PolicyService.is_quiet_hours(org_notification_policy.organisation.id)

        assert result is True

    def test_is_quiet_hours_no_policy(self):
        """Test quiet hours when no policy configured."""
        result = PolicyService.is_quiet_hours(org_id=999)

        assert result is False

    def test_is_quiet_hours_policy_disabled(
        self, org_notification_policy_no_quiet_hours
    ):
        """Test quiet hours when policy has quiet hours disabled."""
        result = PolicyService.is_quiet_hours(
            org_notification_policy_no_quiet_hours.organisation.id
        )

        assert result is False

    @patch("contextual_notifications.services.policy_service.redis_client")
    def test_rate_limit_key_format(self, mock_redis, org_notification_policy, user):
        """Test that rate limit key has correct format."""
        mock_redis.get.return_value = "0"
        mock_redis.incr.return_value = 1

        PolicyService._check_rate_limit(
            org_id=org_notification_policy.organisation.id,
            user_id=user.id,
            policy=org_notification_policy,
        )

        # Verify key format
        call_args = mock_redis.get.call_args[0][0]
        assert f"rate_limit:org:{org_notification_policy.organisation.id}:user:{user.id}" in call_args

    @patch("contextual_notifications.services.policy_service.redis_client")
    def test_apply_policies_empty_decisions(self, mock_redis):
        """Test applying policies to empty decisions list."""
        result = PolicyService.apply_policies([])

        assert result == []
        mock_redis.get.assert_not_called()

    @patch("contextual_notifications.services.policy_service.redis_client")
    @patch("contextual_notifications.services.policy_service.logger")
    def test_apply_policies_redis_failure(
        self, mock_logger, mock_redis, org_notification_policy, user
    ):
        """Test that Redis failure allows notifications (fail-open)."""
        mock_redis.get.side_effect = Exception("Redis connection failed")

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "context": {"org_id": org_notification_policy.organisation.id},
                "payload": {"title": "Test"},
            }
        ]

        result = PolicyService.apply_policies(decisions)

        # Should pass through (fail-open)
        assert len(result) == 1

        # Should log error
        mock_logger.error.assert_called()

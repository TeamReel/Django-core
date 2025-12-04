"""Integration test: Quiet hours rate limiting.

Tests that organization quiet hours policies properly limit notifications.
"""

from datetime import datetime
from unittest.mock import patch

import pytest
from contextual_notifications.models import RoutingRule
from contextual_notifications.services import EventService


@pytest.mark.django_db
class TestQuietHoursRateLimiting:
    """Integration test for quiet hours policy enforcement."""

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_notifications_allowed_outside_quiet_hours(
        self, mock_now, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that notifications go through outside quiet hours."""
        # Mock time at 10:00 AM (outside quiet hours 22:00-08:00)
        mock_now.return_value = datetime(2025, 12, 3, 10, 0, 0)

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={"title": "Project Updated"},
        )

        # Should call handoff (outside quiet hours)
        assert mock_handoff.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_urgent_notifications_bypass_quiet_hours(
        self, mock_now, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that urgent notifications bypass quiet hours."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        RoutingRule.objects.create(
            event_type="task.overdue",
            scope="global",
            channel="in_app",
            priority="urgent",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="task.overdue",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": "task_42",
            },
            payload={"title": "Task Overdue"},
        )

        # Should call handoff (urgent bypasses quiet hours)
        assert mock_handoff.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.policy_service.redis_client")
    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_normal_notifications_rate_limited_during_quiet_hours(
        self, mock_now, mock_redis, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that normal priority notifications are rate limited during quiet hours."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        # Mock Redis rate limit under threshold
        mock_redis.get.return_value = "2"  # Under limit of 5
        mock_redis.incr.return_value = 3

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={"title": "Project Updated"},
        )

        # Should call handoff (under rate limit)
        assert mock_handoff.called

        # Should increment rate limit counter
        mock_redis.incr.assert_called()

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.policy_service.redis_client")
    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_notifications_blocked_when_rate_limit_exceeded(
        self, mock_now, mock_redis, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that notifications are blocked when rate limit is exceeded."""
        # Mock time at 23:00 (during quiet hours)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        # Mock Redis rate limit at threshold
        mock_redis.get.return_value = "5"  # At limit
        mock_redis.incr.return_value = 6  # Would exceed

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={"title": "Project Updated"},
        )

        # Should NOT call handoff (rate limit exceeded)
        assert not mock_handoff.called

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.policy_service.timezone.now")
    def test_no_quiet_hours_policy_allows_all(
        self, mock_now, mock_handoff, user, organisation2, project2, org_notification_policy_no_quiet_hours
    ):
        """Test that orgs without quiet hours policy allow all notifications."""
        # Mock time at 23:00 (would be quiet hours if enabled)
        mock_now.return_value = datetime(2025, 12, 3, 23, 0, 0)

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project2.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation2.id,
                "project_id": project2.id,
                "user_id": user.id,
                "resource_id": f"project_{project2.id}",
            },
            payload={"title": "Project Updated"},
        )

        # Should call handoff (no quiet hours policy)
        assert mock_handoff.called

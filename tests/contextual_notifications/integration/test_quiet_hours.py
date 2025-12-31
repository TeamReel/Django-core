"""Integration test: Quiet hours rate limiting.

Tests that organization quiet hours policies properly limit notifications.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.utils import timezone
from contextual_notifications.models import RoutingRule
from contextual_notifications.services import EventService
from permissions.models import ScopeChoices
from tests.contextual_notifications.conftest import assign_role_to_user


@pytest.mark.django_db
class TestQuietHoursRateLimiting:
    """Integration test for quiet hours policy enforcement."""

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.policy_service.datetime")
    def test_notifications_allowed_outside_quiet_hours(
        self, mock_datetime, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that notifications go through outside quiet hours."""
        from django.core.cache import cache

        cache.clear()  # Prevent rate limit/suppression cache leakage

        # Mock time at 10:00 AM (outside quiet hours 22:00-08:00)
        mock_datetime.now.return_value = timezone.make_aware(datetime(2025, 12, 3, 10, 0, 0))

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to user
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}_outside_quiet",
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Should call handoff (outside quiet hours)
        assert mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.policy_service.datetime")
    def test_urgent_notifications_bypass_quiet_hours(
        self, mock_datetime, mock_handoff, user, organisation, project, org_notification_policy
    ):
        """Test that urgent notifications bypass quiet hours."""
        from django.core.cache import cache

        cache.clear()  # Prevent cache leakage

        # Mock time at 23:00 (during quiet hours)
        mock_datetime.now.return_value = timezone.make_aware(datetime(2025, 12, 3, 23, 0, 0))

        RoutingRule.objects.create(
            event_type="task.overdue",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_URGENT,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to user
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="task.overdue",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": "task_42_urgent",
            },
            payload={"title": "Task Overdue", "body": "A task is overdue"},
        )

        # Should call handoff (urgent bypasses quiet hours)
        assert mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.policy_service.datetime")
    def test_normal_notifications_rate_limited_during_quiet_hours(
        self,
        mock_datetime,
        mock_handoff,
        user,
        organisation,
        project,
        org_notification_policy,
    ):
        """Test that normal priority notifications are rate limited during quiet hours."""
        from django.core.cache import cache as real_cache

        real_cache.clear()  # Prevent cache leakage

        # Mock time at 23:00 (during quiet hours)
        mock_datetime.now.return_value = timezone.make_aware(datetime(2025, 12, 3, 23, 0, 0))

        # NOTE: This test verifies notifications go through during quiet hours under rate limit
        # Real cache behavior tested; we don't mock implementation

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to user
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}_rate_limited",
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Should call handoff (under rate limit)
        assert mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.policy_service.datetime")
    @patch("contextual_notifications.services.policy_service.cache")
    def test_notifications_blocked_when_rate_limit_exceeded(
        self,
        mock_cache,
        mock_datetime,
        mock_handoff,
        user,
        organisation,
        project,
        org_notification_policy,
    ):
        """Test that notifications are blocked when rate limit is exceeded."""
        from django.core.cache import cache as real_cache

        real_cache.clear()  # Prevent cache leakage

        # Mock time at 23:00 (during quiet hours)
        mock_datetime.now.return_value = timezone.make_aware(datetime(2025, 12, 3, 23, 0, 0))

        # Mock cache to simulate rate limit at threshold
        mock_cache.get.return_value = 5  # At limit (int, not string)
        mock_cache.incr.return_value = 6  # Would exceed

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to user
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Should NOT call handoff (rate limit exceeded)
        assert not mock_handoff.called

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    @patch("contextual_notifications.services.policy_service.datetime")
    def test_no_quiet_hours_policy_allows_all(
        self,
        mock_datetime,
        mock_handoff,
        user,
        organisation2,
        project2,
        org_notification_policy_no_quiet_hours,
    ):
        """Test that orgs without quiet hours policy allow all notifications."""
        from django.core.cache import cache

        cache.clear()  # Prevent cache leakage

        # Mock time at 23:00 (would be quiet hours if enabled)
        mock_datetime.now.return_value = timezone.make_aware(datetime(2025, 12, 3, 23, 0, 0))

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to user
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation2.id,
                "project_id": project2.id,
                "user_id": user.id,
                "resource_id": f"project_{project2.id}_no_policy",
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Should call handoff (no quiet hours policy)
        assert mock_handoff.called

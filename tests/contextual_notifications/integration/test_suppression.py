"""Integration test: Suppression window behavior.

Tests that Redis-based suppression prevents duplicate notifications.
"""

import pytest
from unittest.mock import patch, MagicMock
from contextual_notifications.services import EventService
from contextual_notifications.models import RoutingRule


@pytest.mark.django_db
class TestSuppressionWindow:
    """Integration test for suppression service."""

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_first_notification_goes_through(
        self, mock_redis, mock_handoff, user, organisation, project
    ):
        """Test that first notification for a resource goes through."""
        mock_redis.get.return_value = None  # Not suppressed
        mock_redis.setex.return_value = True

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

        # Should call handoff
        assert mock_handoff.called

        # Should set suppression key
        mock_redis.setex.assert_called_once()
        call_args = mock_redis.setex.call_args[0]
        key, ttl, value = call_args

        # Verify key format
        assert f"suppression:{user.id}:project.updated:project_{project.id}" in key
        # Verify TTL (300 seconds = 5 minutes)
        assert ttl == 300

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_duplicate_notification_suppressed(
        self, mock_redis, mock_handoff, user, organisation, project
    ):
        """Test that duplicate notification within window is suppressed."""
        mock_redis.get.return_value = "1"  # Already suppressed

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
            payload={"title": "Project Updated Again"},
        )

        # Should NOT call handoff (suppressed)
        assert not mock_handoff.called

        # Should NOT set new suppression key
        mock_redis.setex.assert_not_called()

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_different_resources_not_suppressed(
        self, mock_redis, mock_handoff, user, organisation, project, project2
    ):
        """Test that different resources are not suppressed together."""
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        project2.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        # First project update
        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}",
            },
            payload={"title": "Project 1 Updated"},
        )

        # Different project update (should not be suppressed)
        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project2.id,
                "user_id": user.id,
                "resource_id": f"project_{project2.id}",
            },
            payload={"title": "Project 2 Updated"},
        )

        # Both should go through (different resources)
        assert mock_handoff.call_count >= 2

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_different_channels_not_suppressed(
        self, mock_redis, mock_handoff, user, organisation, project
    ):
        """Test that different channels are not suppressed together."""
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True

        # Create rules for both channels
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
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

        # Both channels should go through (channels are independent)
        channels = [call[1]["channel"] for call in mock_handoff.call_args_list]
        assert "in_app" in channels
        assert "email" in channels

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    def test_missing_resource_id_bypasses_suppression(
        self, mock_redis, mock_handoff, user, organisation, project
    ):
        """Test that events without resource_id bypass suppression."""
        RoutingRule.objects.create(
            event_type="org.announcement",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="org.announcement",
            context={
                "org_id": organisation.id,
                "user_id": user.id,
                # No resource_id
            },
            payload={"title": "Announcement"},
        )

        # Should go through (no suppression without resource_id)
        assert mock_handoff.called

        # Should NOT call Redis (no suppression)
        mock_redis.get.assert_not_called()

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    @patch("contextual_notifications.services.suppression_service.redis_client")
    @patch("contextual_notifications.services.suppression_service.logger")
    def test_redis_failure_allows_notification(
        self, mock_logger, mock_redis, mock_handoff, user, organisation, project
    ):
        """Test that Redis failure allows notification (fail-open)."""
        mock_redis.get.side_effect = Exception("Redis connection failed")

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

        # Should call handoff (fail-open on Redis error)
        assert mock_handoff.called

        # Should log warning
        mock_logger.warning.assert_called()

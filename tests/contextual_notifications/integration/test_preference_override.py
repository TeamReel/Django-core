"""Integration test: User preference overrides.

Tests that user preferences properly filter routing decisions.
"""

from unittest.mock import patch

import pytest
from contextual_notifications.models import NotificationPreference, RoutingRule
from contextual_notifications.services import EventService


@pytest.mark.django_db
class TestPreferenceOverride:
    """Integration test for preference filtering."""

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_user_opted_out_blocks_notification(
        self, mock_handoff, user, organisation, project, notification_preference
    ):
        """Test that opted-out user does not receive notification."""
        # notification_preference: user opted out of project.updated/email

        # Create email rule
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
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

        # Should not call handoff (user opted out)
        email_calls = [
            call for call in mock_handoff.call_args_list if call[1]["channel"] == "email"
        ]
        assert len(email_calls) == 0

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_user_opted_out_one_channel_receives_other(
        self, mock_handoff, user, organisation, project, notification_preference
    ):
        """Test that user opted out of email still receives in_app."""
        # Create rules for both channels
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
            priority="normal",
            enabled=True,
            target_role="member",
        )
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

        # Should receive in_app but not email
        in_app_calls = [
            call
            for call in mock_handoff.call_args_list
            if call[1]["channel"] == "in_app"
        ]
        email_calls = [
            call for call in mock_handoff.call_args_list if call[1]["channel"] == "email"
        ]

        assert len(in_app_calls) > 0
        assert len(email_calls) == 0

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_multiple_users_different_preferences(
        self, mock_handoff, user, user2, organisation, project
    ):
        """Test that users with different preferences receive different notifications."""
        # User 1 opts out, User 2 does not
        NotificationPreference.objects.create(
            user=user,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )

        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user, user2)
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

        # Only user2 should receive notification
        user_ids = [call[1]["user_id"] for call in mock_handoff.call_args_list]
        assert user2.id in user_ids
        assert user.id not in user_ids

    @patch("contextual_notifications.services.notification_handoff_service.NotificationService.create_notification")
    def test_no_preference_allows_notification(
        self, mock_handoff, user, organisation, project
    ):
        """Test that users without preferences receive notifications (default: enabled)."""
        # No preference configured for user

        RoutingRule.objects.create(
            event_type="project.created",
            scope="global",
            channel="in_app",
            priority="normal",
            enabled=True,
            target_role="member",
        )

        project.members.add(user)
        mock_handoff.return_value = {"id": "notif-123", "status": "pending"}

        EventService.emit_event(
            event_type="project.created",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
            },
            payload={"title": "Project Created"},
        )

        # Should call handoff (no opt-out = allowed)
        assert mock_handoff.called
        assert mock_handoff.call_args[1]["user_id"] == user.id

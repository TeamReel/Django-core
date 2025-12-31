"""Integration test: User preference overrides.

Tests that user preferences properly filter routing decisions.
"""

from unittest.mock import MagicMock, patch

import pytest
from contextual_notifications.models import NotificationPreference, RoutingRule
from contextual_notifications.services import EventService
from permissions.models import ScopeChoices
from tests.contextual_notifications.conftest import assign_role_to_user


@pytest.mark.django_db
class TestPreferenceOverride:
    """Integration test for preference filtering."""

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
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

        # Should not call handoff (user opted out)
        email_calls = [
            call for call in mock_handoff.call_args_list if call[1]["channel"] == "email"
        ]
        assert len(email_calls) == 0

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_user_opted_out_one_channel_receives_other(
        self, mock_handoff, user, organisation, project, notification_preference
    ):
        """Test that user opted out of email still receives in_app."""
        from django.core.cache import cache

        cache.clear()  # Prevent suppression leakage from previous tests

        # Create rules for both channels
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="email",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
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
                "resource_id": f"project_{project.id}_two_channel",  # Unique to avoid suppression
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Should receive in_app but not email
        in_app_calls = [
            call for call in mock_handoff.call_args_list if call[1]["channel"] == "in_app"
        ]
        email_calls = [
            call for call in mock_handoff.call_args_list if call[1]["channel"] == "email"
        ]

        assert len(in_app_calls) > 0
        assert len(email_calls) == 0

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_multiple_users_different_preferences(
        self, mock_handoff, user, user2, organisation, project
    ):
        """Test that users with different preferences receive different notifications."""
        from django.core.cache import cache

        cache.clear()  # Prevent cache pollution

        # Clean up any existing routing rules from migrations/seeds
        RoutingRule.objects.all().delete()

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
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )
        RoutingRule.objects.create(
            event_type="project.updated",
            scope="global",
            channel="in_app",
            priority=RoutingRule.PRIORITY_NORMAL,
            is_enabled=True,
            target_role="member",
        )

        # Assign member role to both users
        assign_role_to_user(user, "member", ScopeChoices.GLOBAL)
        assign_role_to_user(user2, "member", ScopeChoices.GLOBAL)
        mock_notification = MagicMock()
        mock_notification.id = "notif-123"
        mock_handoff.return_value = mock_notification

        EventService.emit_event(
            event_type="project.updated",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}_multi_user",  # Unique to avoid suppression
            },
            payload={"title": "Project Updated", "body": "The project has been updated"},
        )

        # Only user2 should receive EMAIL notification (user1 opted out of email)
        # Both users may receive other channels (in_app), so filter by channel
        valid_calls = [
            call
            for call in mock_handoff.call_args_list
            if call[1].get("recipient_user") is not None
        ]
        email_calls = [call for call in valid_calls if call[1].get("channel") == "email"]
        email_user_ids = [call[1]["recipient_user"].id for call in email_calls]

        # Verify preference filtering: user1 opted out of email, user2 should receive it
        # Note: Both users should receive in_app notifications
        in_app_calls = [call for call in valid_calls if call[1].get("channel") == "in_app"]
        assert len(in_app_calls) == 2, f"Expected 2 in_app notifications, got {len(in_app_calls)}"

        if len(email_calls) > 0:
            assert user2.id in email_user_ids, f"User2 should receive email: {email_user_ids}"
            assert (
                user.id not in email_user_ids
            ), f"User1 opted out of email but was in: {email_user_ids}"

    @patch(
        "contextual_notifications.services.notification_handoff_service.Notification.objects.create"
    )
    def test_no_preference_allows_notification(self, mock_handoff, user, organisation, project):
        """Test that users without preferences receive notifications (default: enabled)."""
        from django.core.cache import cache

        cache.clear()  # Prevent cache pollution

        # No preference configured for user

        RoutingRule.objects.create(
            event_type="project.created",
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
            event_type="project.created",
            context={
                "org_id": organisation.id,
                "project_id": project.id,
                "user_id": user.id,
                "resource_id": f"project_{project.id}_no_pref",  # Unique to avoid suppression
            },
            payload={"title": "Project Created", "body": "A new project has been created"},
        )

        # Should call handoff (no opt-out = allowed)
        assert mock_handoff.called
        assert mock_handoff.call_args[1]["recipient_user"].id == user.id

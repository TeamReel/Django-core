"""Tests for PreferenceService."""

import pytest
from contextual_notifications.models import NotificationPreference
from contextual_notifications.services.preference_service import PreferenceService


@pytest.mark.django_db
class TestPreferenceService:
    """Tests for PreferenceService."""

    def test_filter_by_preferences_no_opt_outs(self, user, project):
        """Test that users with no opt-outs receive all notifications."""
        project.members.add(user)

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
            }
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        assert len(filtered) == 1
        assert filtered[0]["user_id"] == user.id

    def test_filter_by_preferences_user_opted_out(self, user, notification_preference):
        """Test that opted-out users are filtered out."""
        # notification_preference fixture: user opted out of project.updated/email

        decisions = [
            {
                "user_id": user.id,
                "channel": "email",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
            }
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        # Should be filtered out
        assert len(filtered) == 0

    def test_filter_by_preferences_different_channel_allowed(self, user, notification_preference):
        """Test that user opted out of email still receives in_app."""
        # User opted out of email but not in_app

        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
            }
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        # Should NOT be filtered (different channel)
        assert len(filtered) == 1

    def test_filter_by_preferences_different_event_type_allowed(
        self, user, notification_preference
    ):
        """Test that user opted out of one event type still receives others."""
        # User opted out of project.updated

        decisions = [
            {
                "user_id": user.id,
                "channel": "email",
                "event_type": "task.assigned",  # Different event type
                "payload": {"title": "Test"},
            }
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        # Should NOT be filtered (different event type)
        assert len(filtered) == 1

    def test_filter_by_preferences_multiple_users(self, user, user2, notification_preference):
        """Test filtering with multiple users."""
        # user has opt-out, user2 does not

        decisions = [
            {
                "user_id": user.id,
                "channel": "email",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
            },
            {
                "user_id": user2.id,
                "channel": "email",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
            },
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        # Only user2 should remain
        assert len(filtered) == 1
        assert filtered[0]["user_id"] == user2.id

    def test_filter_by_preferences_empty_decisions(self):
        """Test filtering with empty decisions list."""
        filtered = PreferenceService.filter_by_preferences([])

        assert filtered == []

    def test_check_preference_exists_opted_out(self, user, notification_preference):
        """Test checking if preference exists and is disabled."""
        result = PreferenceService.check_preference(
            user_id=user.id,
            event_type="project.updated",
            channel="email",
        )

        assert result is False  # User opted out

    def test_check_preference_exists_enabled(self, user, notification_preference_in_app):
        """Test checking if preference exists and is enabled."""
        result = PreferenceService.check_preference(
            user_id=user.id,
            event_type="task.assigned",
            channel="in_app",
        )

        assert result is True  # User wants these

    def test_check_preference_not_exists(self, user):
        """Test checking preference when none exists (default: enabled)."""
        result = PreferenceService.check_preference(
            user_id=user.id,
            event_type="some.event",
            channel="email",
        )

        assert result is True  # No preference = allowed

    def test_get_user_preferences(self, user, notification_preference):
        """Test retrieving all preferences for a user."""
        prefs = PreferenceService.get_user_preferences(user.id)

        assert len(prefs) >= 1
        assert any(p.event_type == "project.updated" and p.channel == "email" for p in prefs)

    def test_set_preference_creates_new(self, user):
        """Test setting a preference creates new record."""
        PreferenceService.set_preference(
            user_id=user.id,
            event_type="task.completed",
            channel="sms",
            enabled=False,
        )

        pref = NotificationPreference.objects.get(
            user_id=user.id,
            event_type="task.completed",
            channel="sms",
        )

        assert pref.enabled is False

    def test_set_preference_updates_existing(self, user, notification_preference):
        """Test setting preference updates existing record."""
        # Change from disabled to enabled
        PreferenceService.set_preference(
            user_id=user.id,
            event_type="project.updated",
            channel="email",
            enabled=True,
        )

        pref = NotificationPreference.objects.get(
            user_id=user.id,
            event_type="project.updated",
            channel="email",
        )

        assert pref.enabled is True

    def test_filter_preserves_decision_metadata(self, user):
        """Test that filtering preserves all decision fields."""
        decisions = [
            {
                "user_id": user.id,
                "channel": "in_app",
                "event_type": "project.updated",
                "payload": {"title": "Test"},
                "rule_id": 123,
                "priority": "high",
                "custom_field": "preserved",
            }
        ]

        filtered = PreferenceService.filter_by_preferences(decisions)

        assert filtered[0]["rule_id"] == 123
        assert filtered[0]["priority"] == "high"
        assert filtered[0]["custom_field"] == "preserved"

"""Tests for NotificationPreference model."""

import pytest
from contextual_notifications.models import NotificationPreference


@pytest.mark.django_db
class TestNotificationPreferenceModel:
    """Tests for NotificationPreference model."""

    def test_create_preference(self, user):
        """Test creating a notification preference."""
        pref = NotificationPreference.objects.create(
            user=user,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )

        assert pref.user == user
        assert pref.event_type == "project.updated"
        assert pref.channel == "email"
        assert pref.enabled is False

    def test_str_representation(self, user):
        """Test string representation."""
        pref = NotificationPreference.objects.create(
            user=user,
            event_type="task.assigned",
            channel="in_app",
            enabled=True,
        )

        expected = f"{user.email} - task.assigned (in_app): enabled"
        assert str(pref) == expected

    def test_unique_constraint(self, user):
        """Test that user + event_type + channel must be unique."""
        NotificationPreference.objects.create(
            user=user,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )

        # Attempting to create duplicate should raise IntegrityError
        with pytest.raises(Exception):  # Django wraps this differently
            NotificationPreference.objects.create(
                user=user,
                event_type="project.updated",
                channel="email",
                enabled=True,
            )

    def test_enabled_default(self, user):
        """Test that enabled defaults to True."""
        pref = NotificationPreference.objects.create(
            user=user,
            event_type="task.completed",
            channel="in_app",
        )
        assert pref.enabled is True

    def test_query_by_user(self, user, user2):
        """Test querying preferences by user."""
        NotificationPreference.objects.create(
            user=user,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )
        NotificationPreference.objects.create(
            user=user2,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )

        user_prefs = NotificationPreference.objects.filter(user=user)
        assert user_prefs.count() == 1
        assert user_prefs.first().user == user

    def test_query_disabled_preferences(self, user):
        """Test querying only disabled (opted-out) preferences."""
        NotificationPreference.objects.create(
            user=user,
            event_type="project.updated",
            channel="email",
            enabled=False,
        )
        NotificationPreference.objects.create(
            user=user,
            event_type="task.assigned",
            channel="in_app",
            enabled=True,
        )

        opted_out = NotificationPreference.objects.filter(user=user, enabled=False)
        assert opted_out.count() == 1
        assert opted_out.first().event_type == "project.updated"

    def test_created_at_set(self, user):
        """Test that created_at is automatically set."""
        pref = NotificationPreference.objects.create(
            user=user,
            event_type="test.event",
            channel="email",
        )
        assert pref.created_at is not None

    def test_updated_at_set(self, user):
        """Test that updated_at is automatically set."""
        pref = NotificationPreference.objects.create(
            user=user,
            event_type="test.event",
            channel="email",
        )
        assert pref.updated_at is not None

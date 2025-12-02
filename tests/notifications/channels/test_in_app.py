"""Tests for in-app notification channel."""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from notifications.channels import InAppChannel

User = get_user_model()


@pytest.mark.django_db
class TestInAppChannel:
    """Test suite for InAppChannel delivery."""

    def test_send_in_app_notification(self, notification_factory):
        """Test successful in-app notification delivery."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
            status="pending",
        )

        channel = InAppChannel()
        result = channel.send(notification)

        # Verify result
        assert result["outcome"] == "success"
        assert result["channel"] == "in_app"
        assert result["notification_id"] == str(notification.id)
        assert result["recipient_user_id"] == user.id

        # Verify notification updated
        notification.refresh_from_db()
        assert notification.status == "sent"

    def test_send_without_recipient_user_fails(self, notification_factory):
        """Test that in-app requires recipient_user."""
        # Create as email first to bypass model validation
        notification = notification_factory(
            channel="email",
            recipient="user@example.com",
        )
        # Then change to in-app manually
        notification.channel = "in_app"
        notification.recipient_user = None

        channel = InAppChannel()
        with pytest.raises(ValidationError, match="recipient_user"):
            channel.send(notification)

    def test_validate_recipient_with_user(self):
        """Test recipient validation with valid user context."""
        user = User.objects.create_user(email="user@example.com")
        channel = InAppChannel()

        is_valid = channel.validate_recipient("user@example.com", recipient_user=user)
        assert is_valid is True

    def test_validate_recipient_without_user(self):
        """Test recipient validation without user context."""
        channel = InAppChannel()

        is_valid = channel.validate_recipient("user@example.com")
        assert is_valid is False

    def test_validate_config_succeeds(self):
        """Test that in-app channel has no config requirements."""
        channel = InAppChannel()
        # Should not raise
        channel.validate_config()

    def test_channel_name(self):
        """Test channel name property."""
        channel = InAppChannel()
        assert channel.channel_name == "in_app"

    def test_send_is_synchronous(self, notification_factory):
        """Test that send is synchronous (no Celery task)."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
            status="pending",
        )

        channel = InAppChannel()
        before = timezone.now()
        channel.send(notification)
        after = timezone.now()

        # Should complete immediately
        notification.refresh_from_db()
        assert notification.status == "sent"
        assert before <= notification.updated_at <= after

    def test_send_updates_timestamp(self, notification_factory):
        """Test that send updates updated_at timestamp."""
        import time

        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
        )
        original_updated_at = notification.updated_at

        # Small delay to ensure timestamp difference
        time.sleep(0.01)

        channel = InAppChannel()
        channel.send(notification)

        notification.refresh_from_db()
        assert notification.updated_at >= original_updated_at

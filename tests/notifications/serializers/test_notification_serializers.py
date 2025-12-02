"""Tests for notification serializers."""

import pytest
from notifications.serializers import (
    DeliveryAttemptSerializer,
    NotificationListSerializer,
    NotificationSerializer,
    NotificationTypeSerializer,
)


@pytest.mark.django_db
class TestDeliveryAttemptSerializer:
    """Tests for DeliveryAttemptSerializer."""

    def test_serialize_delivery_attempt(self, delivery_attempt_factory):
        """Test serializing a delivery attempt."""
        attempt = delivery_attempt_factory(
            attempt_number=2,
            outcome="transient_failure",
            error_message="Temporary SMTP error",
            duration_ms=1500,
        )

        serializer = DeliveryAttemptSerializer(attempt)
        data = serializer.data

        assert data["id"] == attempt.id
        assert data["attempt_number"] == 2
        assert data["outcome"] == "transient_failure"
        assert data["error_message"] == "Temporary SMTP error"
        assert data["duration_ms"] == 1500
        assert "attempted_at" in data

    def test_serialize_successful_attempt(self, delivery_attempt_factory):
        """Test serializing a successful delivery attempt."""
        attempt = delivery_attempt_factory(
            attempt_number=1,
            outcome="success",
            error_message=None,
            http_status_code=200,
        )

        serializer = DeliveryAttemptSerializer(attempt)
        data = serializer.data

        assert data["outcome"] == "success"
        assert data["error_message"] is None
        assert data["http_status_code"] == 200


@pytest.mark.django_db
class TestNotificationTypeSerializer:
    """Tests for NotificationTypeSerializer."""

    def test_serialize_notification_type(self, notification_type_factory):
        """Test serializing a notification type."""
        notification_type = notification_type_factory(
            code="welcome_email",
            name="Welcome Email",
            description="Welcome message for new users",
            default_channel="email",
        )

        serializer = NotificationTypeSerializer(notification_type)
        data = serializer.data

        assert data["code"] == "welcome_email"
        assert data["name"] == "Welcome Email"
        assert data["description"] == "Welcome message for new users"
        assert data["default_channel"] == "email"


@pytest.mark.django_db
class TestNotificationSerializer:
    """Tests for NotificationSerializer."""

    def test_serialize_notification_with_attempts(
        self,
        notification_factory,
        delivery_attempt_factory,
    ):
        """Test serializing notification with delivery attempts."""
        notification = notification_factory(
            status="sent",
            channel="email",
        )

        # Create multiple delivery attempts
        delivery_attempt_factory(
            notification=notification, attempt_number=1, outcome="transient_failure"
        )
        delivery_attempt_factory(notification=notification, attempt_number=2, outcome="success")

        serializer = NotificationSerializer(notification)
        data = serializer.data

        assert data["id"] == str(notification.id)
        assert data["status"] == "sent"
        assert data["channel"] == "email"
        assert data["type_code"] == notification.type.code
        assert data["type_name"] == notification.type.name
        assert len(data["delivery_attempts"]) == 2
        assert data["delivery_attempts"][0]["attempt_number"] == 1
        assert data["delivery_attempts"][1]["attempt_number"] == 2

    def test_serialize_notification_without_attempts(self, notification_factory):
        """Test serializing notification with no delivery attempts."""
        notification = notification_factory(status="pending")

        serializer = NotificationSerializer(notification)
        data = serializer.data

        assert data["id"] == str(notification.id)
        assert data["status"] == "pending"
        assert data["delivery_attempts"] == []

    def test_includes_type_information(self, notification_factory):
        """Test that serializer includes nested type information."""
        notification = notification_factory()

        serializer = NotificationSerializer(notification)
        data = serializer.data

        assert "type" in data
        assert data["type"]["code"] == notification.type.code
        assert data["type"]["name"] == notification.type.name
        assert data["type"]["default_channel"] == notification.type.default_channel


@pytest.mark.django_db
class TestNotificationListSerializer:
    """Tests for NotificationListSerializer."""

    def test_serialize_for_list_view(self, notification_factory):
        """Test lightweight serialization for list views."""
        notification = notification_factory(status="sent")

        # Simulate annotated queryset with attempts_count
        notification.attempts_count = 3

        serializer = NotificationListSerializer(notification)
        data = serializer.data

        assert data["id"] == str(notification.id)
        assert data["type_code"] == notification.type.code
        assert data["type_name"] == notification.type.name
        assert data["status"] == "sent"
        assert data["attempts_count"] == 3
        # Should not include delivery_attempts (lightweight)
        assert "delivery_attempts" not in data
        # Should not include full type object
        assert "type" not in data

    def test_includes_timestamps(self, notification_factory):
        """Test that list serializer includes timestamps."""
        notification = notification_factory()
        notification.attempts_count = 1

        serializer = NotificationListSerializer(notification)
        data = serializer.data

        assert "created_at" in data
        assert "updated_at" in data
        # Should not include read_at for email notifications
        assert "read_at" not in data or data["read_at"] is None

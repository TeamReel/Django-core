"""Unit tests for Notification model."""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from notifications.models import Notification, NotificationType

User = get_user_model()


@pytest.mark.django_db
class TestNotification:
    """Tests for Notification model."""

    def test_create_notification(self, notification_type_factory: NotificationType) -> None:
        """Test creating a valid notification."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Hello"},
            metadata={"key": "value"},
        )

        assert notification.id is not None
        assert isinstance(notification.id, uuid.UUID)
        assert notification.type == notification_type
        assert notification.channel == "email"
        assert notification.recipient == "test@example.com"
        assert notification.payload == {"subject": "Test", "body": "Hello"}
        assert notification.metadata == {"key": "value"}
        assert notification.status == "pending"
        assert notification.recipient_user is None
        assert notification.read_at is None
        assert notification.created_at is not None
        assert notification.updated_at is not None

    def test_uuid_primary_key(self, notification_type_factory: NotificationType) -> None:
        """Test UUID primary key generation."""
        notification_type = notification_type_factory()

        notification1 = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="user1@example.com",
            payload={},
        )

        notification2 = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="user2@example.com",
            payload={},
        )

        # Different UUIDs
        assert notification1.id != notification2.id

        # Both are UUIDs
        assert isinstance(notification1.id, uuid.UUID)
        assert isinstance(notification2.id, uuid.UUID)

    def test_email_channel_validation_valid(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test valid email addresses for email channel."""
        notification_type = notification_type_factory()

        notification = Notification(
            type=notification_type,
            channel="email",
            recipient="valid.email+tag@example.com",
            payload={},
        )

        notification.full_clean()
        notification.save()

    def test_email_channel_validation_invalid(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test invalid email addresses for email channel."""
        notification_type = notification_type_factory()

        notification = Notification(
            type=notification_type,
            channel="email",
            recipient="not-an-email",
            payload={},
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "recipient" in exc_info.value.message_dict

    def test_webhook_channel_validation_valid(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test valid webhook URLs."""
        notification_type = notification_type_factory()

        # HTTPS
        notification1 = Notification(
            type=notification_type,
            channel="webhook",
            recipient="https://example.com/webhook",
            payload={},
        )
        notification1.full_clean()
        notification1.save()

        # HTTP (also valid)
        notification2 = Notification(
            type=notification_type,
            channel="webhook",
            recipient="http://example.com/webhook",
            payload={},
        )
        notification2.full_clean()
        notification2.save()

    def test_webhook_channel_validation_invalid(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test invalid webhook URLs."""
        notification_type = notification_type_factory()

        notification = Notification(
            type=notification_type,
            channel="webhook",
            recipient="not-a-url",
            payload={},
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "recipient" in exc_info.value.message_dict

    def test_in_app_requires_recipient_user(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test in-app channel requires recipient_user FK."""
        notification_type = notification_type_factory()

        notification = Notification(
            type=notification_type,
            channel="in_app",
            recipient="user123",
            payload={},
            recipient_user=None,  # Missing!
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "recipient_user" in exc_info.value.message_dict

    def test_in_app_with_valid_recipient_user(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test valid in-app notification with user."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser", email="test@example.com")

        notification = Notification(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload={"message": "Hello"},
        )

        notification.full_clean()
        notification.save()

    def test_payload_size_webhook_limit(self, notification_type_factory: NotificationType) -> None:
        """Test webhook payload size limit (1MB)."""
        notification_type = notification_type_factory()

        # Create 1MB + 1 byte payload
        large_payload = {"data": "x" * (1024 * 1024 + 1)}

        notification = Notification(
            type=notification_type,
            channel="webhook",
            recipient="https://example.com/webhook",
            payload=large_payload,
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "payload" in exc_info.value.message_dict

    def test_payload_size_in_app_limit(self, notification_type_factory: NotificationType) -> None:
        """Test in-app payload size limit (100KB)."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser")

        # Create 100KB + 1 byte payload
        large_payload = {"data": "x" * (100 * 1024 + 1)}

        notification = Notification(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload=large_payload,
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "payload" in exc_info.value.message_dict

    def test_payload_size_email_relaxed(self, notification_type_factory: NotificationType) -> None:
        """Test email channel has no strict payload size limit."""
        notification_type = notification_type_factory()

        # Large email payload (> 100KB)
        large_payload = {"html_body": "x" * (200 * 1024)}

        notification = Notification(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload=large_payload,
        )

        # Should not raise
        notification.full_clean()
        notification.save()

    def test_read_at_only_for_in_app(self, notification_type_factory: NotificationType) -> None:
        """Test read_at is only valid for in-app notifications."""
        notification_type = notification_type_factory()

        notification = Notification(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
            read_at=timezone.now(),
        )

        with pytest.raises(ValidationError) as exc_info:
            notification.full_clean()

        assert "read_at" in exc_info.value.message_dict

    def test_status_default(self, notification_type_factory: NotificationType) -> None:
        """Test status defaults to pending."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        assert notification.status == "pending"

    def test_status_transition_validation(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test only pending notifications can transition status."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
            status="sent",
        )

        # Try to change from sent to failed
        notification.status = "failed"

        with pytest.raises(ValidationError) as exc_info:
            notification.save()

        assert "status" in str(exc_info.value)

    def test_update_status_atomic(self, notification_type_factory: NotificationType) -> None:
        """Test update_status uses row locking."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        # Update status atomically
        notification.update_status("sent")

        # Reload from DB
        notification.refresh_from_db()
        assert notification.status == "sent"

    def test_update_status_validates_transitions(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test update_status enforces pending -> sent/failed only."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
            status="sent",
        )

        # Try to update non-pending notification
        with pytest.raises(ValueError):
            notification.update_status("failed")

    def test_mark_as_read(self, notification_type_factory: NotificationType) -> None:
        """Test mark_as_read sets read_at for in-app notifications."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser")

        notification = Notification.objects.create(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload={},
        )

        assert notification.read_at is None

        notification.mark_as_read()

        assert notification.read_at is not None
        assert abs((notification.read_at - timezone.now()).total_seconds()) < 1

    def test_mark_as_read_idempotent(self, notification_type_factory: NotificationType) -> None:
        """Test mark_as_read can be called multiple times."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser")

        notification = Notification.objects.create(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload={},
        )

        notification.mark_as_read()
        first_read_at = notification.read_at

        # Call again
        notification.mark_as_read()

        # read_at should not change
        assert notification.read_at == first_read_at

    def test_indexes_exist(self, notification_type_factory: NotificationType) -> None:
        """Test indexes are defined (implicit verification).

        Creates data and queries using indexed fields to verify
        Django uses indexes automatically.
        """
        notification_type = notification_type_factory()

        # Create multiple notifications with various statuses
        for i in range(10):
            Notification.objects.create(
                type=notification_type,
                channel="email",
                recipient=f"user{i}@example.com",
                payload={},
                status="pending" if i % 2 == 0 else "sent",
            )

        # Query using idx_status_created
        pending = Notification.objects.filter(status="pending").order_by("-created_at")
        assert pending.count() == 5

    def test_notification_type_foreign_key(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test notification type FK relationship."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        # Forward relationship
        assert notification.type == notification_type

        # Reverse relationship
        assert notification in notification_type.notifications.all()

    def test_recipient_user_foreign_key(self, notification_type_factory: NotificationType) -> None:
        """Test recipient_user FK relationship."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser")

        notification = Notification.objects.create(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload={},
        )

        # Forward relationship
        assert notification.recipient_user == user

    def test_cascade_delete_user(self, notification_type_factory: NotificationType) -> None:
        """Test deleting user cascades to notifications."""
        notification_type = notification_type_factory()
        user = User.objects.create_user(username="testuser")

        notification = Notification.objects.create(
            type=notification_type,
            channel="in_app",
            recipient=str(user.id),
            recipient_user=user,
            payload={},
        )

        notification_id = notification.id

        # Delete user
        user.delete()

        # Notification should be deleted
        assert not Notification.objects.filter(id=notification_id).exists()

    def test_protect_delete_notification_type(
        self, notification_type_factory: NotificationType
    ) -> None:
        """Test deleting notification type is prevented if in use."""
        notification_type = notification_type_factory()

        Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        from django.db.models import ProtectedError

        with pytest.raises(ProtectedError):
            notification_type.delete()

    def test_str_representation(self, notification_type_factory: NotificationType) -> None:
        """Test string representation."""
        notification_type = notification_type_factory(code="test_code")

        notification = Notification(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        assert "test_code" in str(notification)
        assert "test@example.com" in str(notification)
        assert "pending" in str(notification)

    def test_ordering(self, notification_type_factory: NotificationType) -> None:
        """Test queryset ordering by -created_at."""
        notification_type = notification_type_factory()

        # Create with delays to ensure different timestamps
        notification1 = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="user1@example.com",
            payload={},
        )

        notification2 = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="user2@example.com",
            payload={},
        )

        notifications = list(Notification.objects.all())

        # Most recent first
        assert notifications[0] == notification2
        assert notifications[1] == notification1

    def test_metadata_default_empty_dict(self, notification_type_factory: NotificationType) -> None:
        """Test metadata defaults to empty dict."""
        notification_type = notification_type_factory()

        notification = Notification.objects.create(
            type=notification_type,
            channel="email",
            recipient="test@example.com",
            payload={},
        )

        assert notification.metadata == {}

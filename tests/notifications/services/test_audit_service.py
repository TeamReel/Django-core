"""Tests for notification audit logging."""

import hashlib
from unittest.mock import patch

import pytest
from notifications.services.audit_service import NotificationAuditService


@pytest.mark.django_db
class TestNotificationAuditService:
    """Tests for NotificationAuditService."""

    def test_hash_recipient(self):
        """Test recipient hashing for privacy."""
        recipient = "user@example.com"
        expected_hash = hashlib.sha256(recipient.encode("utf-8")).hexdigest()

        result = NotificationAuditService.hash_recipient(recipient)

        assert result == expected_hash
        assert len(result) == 64  # SHA-256 hex length

    def test_hash_recipient_consistency(self):
        """Test that hashing is consistent."""
        recipient = "user@example.com"

        hash1 = NotificationAuditService.hash_recipient(recipient)
        hash2 = NotificationAuditService.hash_recipient(recipient)

        assert hash1 == hash2

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_created(self, mock_audit_log, notification_factory):
        """Test logging notification creation."""
        notification = notification_factory(
            recipient="test@example.com",
            status="pending",
        )

        NotificationAuditService.log_notification_created(
            notification,
            additional_metadata={"source": "api"},
        )

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        assert call_args[1]["event_type"] == "notification.created"
        metadata = call_args[1]["metadata"]
        assert metadata["notification_id"] == str(notification.id)
        assert metadata["type"] == notification.type.code
        assert metadata["channel"] == notification.channel
        assert metadata["recipient_hash"] == NotificationAuditService.hash_recipient(
            "test@example.com"
        )
        assert metadata["status"] == "pending"
        assert metadata["source"] == "api"  # Additional metadata included

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_sent(self, mock_audit_log, notification_factory):
        """Test logging successful delivery."""
        notification = notification_factory(recipient="test@example.com")

        NotificationAuditService.log_notification_sent(
            notification,
            attempt_number=2,
            duration_ms=1500,
        )

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        assert call_args[1]["event_type"] == "notification.sent"
        metadata = call_args[1]["metadata"]
        assert metadata["notification_id"] == str(notification.id)
        assert metadata["attempt_number"] == 2
        assert metadata["duration_ms"] == 1500
        assert "recipient_hash" in metadata

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_failed(self, mock_audit_log, notification_factory):
        """Test logging delivery failure."""
        notification = notification_factory(recipient="test@example.com")

        NotificationAuditService.log_notification_failed(
            notification,
            attempt_number=3,
            error_type="permanent_failure",
            error_message="Invalid email address",
        )

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        assert call_args[1]["event_type"] == "notification.failed"
        metadata = call_args[1]["metadata"]
        assert metadata["notification_id"] == str(notification.id)
        assert metadata["attempt_number"] == 3
        assert metadata["error_type"] == "permanent_failure"
        assert metadata["error_message"] == "Invalid email address"

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_failed_truncates_long_error(
        self, mock_audit_log, notification_factory
    ):
        """Test that long error messages are truncated."""
        notification = notification_factory(recipient="test@example.com")
        long_error = "X" * 1000  # 1000 characters

        NotificationAuditService.log_notification_failed(
            notification,
            attempt_number=1,
            error_type="transient_failure",
            error_message=long_error,
        )

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        metadata = call_args[1]["metadata"]
        assert len(metadata["error_message"]) == 500  # Truncated

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_read(self, mock_audit_log, notification_factory):
        """Test logging notification read event."""
        from django.contrib.auth import get_user_model

        user_model = get_user_model()
        user = user_model.objects.create_user(email="user@example.com")

        notification = notification_factory(
            recipient="user@example.com",
            recipient_user=user,
            channel="in_app",
        )

        NotificationAuditService.log_notification_read(notification)

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        assert call_args[1]["event_type"] == "notification.read"
        assert call_args[1]["user"] == user
        metadata = call_args[1]["metadata"]
        assert metadata["notification_id"] == str(notification.id)

    @patch("notifications.services.audit_service.audit_log.record")
    def test_log_notification_retry(self, mock_audit_log, notification_factory):
        """Test logging retry scheduling."""
        notification = notification_factory(recipient="test@example.com")

        NotificationAuditService.log_notification_retry(
            notification,
            attempt_number=3,
            retry_delay_seconds=300,
        )

        mock_audit_log.assert_called_once()
        call_args = mock_audit_log.call_args
        assert call_args[1]["event_type"] == "notification.retry"
        metadata = call_args[1]["metadata"]
        assert metadata["notification_id"] == str(notification.id)
        assert metadata["attempt_number"] == 3
        assert metadata["retry_delay_seconds"] == 300

    def test_recipient_not_exposed_in_logs(self, notification_factory):
        """Test that actual recipient is never logged directly."""
        notification = notification_factory(recipient="sensitive@example.com")

        with patch("notifications.services.audit_service.audit_log.record") as mock_audit_log:
            NotificationAuditService.log_notification_created(notification)

            call_args = mock_audit_log.call_args
            metadata = call_args[1]["metadata"]
            # Recipient should be hashed, not plain
            assert "recipient" not in metadata
            assert "recipient_hash" in metadata
            assert metadata["recipient_hash"] != "sensitive@example.com"

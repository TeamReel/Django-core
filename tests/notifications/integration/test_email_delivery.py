"""Integration tests for email notification delivery."""

import pytest
from unittest.mock import patch

from django.utils import timezone

from notifications.channels.exceptions import TransientChannelError
from notifications.models import DeliveryAttempt, Notification
from notifications.tasks.delivery_tasks import deliver_email_notification


@pytest.mark.django_db
class TestEmailDeliveryIntegration:
    """Integration tests for end-to-end email delivery."""

    @patch("django.core.mail.send_mail")
    def test_successful_delivery_flow(
        self, mock_send_mail, notification_factory, notification_type_factory
    ):
        """Successful email delivery updates notification and creates delivery attempt."""
        mock_send_mail.return_value = 1

        notification_type = notification_type_factory(code="test-success")
        notification = notification_factory(
            type=notification_type,
            recipient="test@example.com",
            status="pending",
            payload={"subject": "Test Email", "body": "Test content"},
        )

        # Execute delivery task synchronously
        deliver_email_notification(str(notification.id))

        # Verify notification status updated
        notification.refresh_from_db()
        assert notification.status == "sent"
        assert notification.updated_at is not None

        # Verify delivery attempt created
        attempts = DeliveryAttempt.objects.filter(notification=notification)
        assert attempts.count() == 1

        attempt = attempts.first()
        assert attempt.attempt_number == 1
        assert attempt.outcome == "success"
        assert attempt.duration_ms is not None
        assert attempt.duration_ms > 0

    @patch("django.core.mail.send_mail")
    def test_permanent_failure_flow(
        self, mock_send_mail, notification_factory, notification_type_factory
    ):
        """Permanent SMTP error marks notification as failed without retry."""
        from smtplib import SMTPException

        mock_send_mail.side_effect = SMTPException("User unknown")

        notification_type = notification_type_factory(code="test-permanent-fail")
        notification = notification_factory(
            type=notification_type,
            recipient="test@example.com",
            status="pending",
            payload={"subject": "Test", "body": "Body"},
        )

        # Execute delivery task
        deliver_email_notification(str(notification.id))

        # Verify notification marked as failed
        notification.refresh_from_db()
        assert notification.status == "failed"

        # Verify delivery attempt recorded failure
        attempts = DeliveryAttempt.objects.filter(notification=notification)
        assert attempts.count() == 1

        attempt = attempts.first()
        assert attempt.outcome == "permanent_failure"
        assert "User unknown" in attempt.error_message

    @patch("django.core.mail.send_mail")
    def test_transient_failure_with_retry(
        self, mock_send_mail, notification_factory, notification_type_factory, retry_policy_factory
    ):
        """Transient SMTP error triggers retry according to RetryPolicy."""
        from smtplib import SMTPException

        mock_send_mail.side_effect = SMTPException("Connection timeout")

        retry_policy = retry_policy_factory(
            max_attempts=3,
            initial_delay_seconds=1,
            backoff_strategy="exponential",
            backoff_multiplier=2.0,
            retry_window_seconds=3600,
        )
        notification_type = notification_type_factory(
            code="test-transient", retry_policy=retry_policy
        )
        notification = notification_factory(
            type=notification_type,
            recipient="test@example.com",
            status="pending",
            payload={"subject": "Test", "body": "Body"},
        )

        # First attempt - should raise TransientChannelError for retry
        with pytest.raises(Exception):  # Celery retry exception
            deliver_email_notification.apply(args=[str(notification.id)]).get()

        # Verify notification still pending (not failed)
        notification.refresh_from_db()
        assert notification.status == "pending"

        # Verify delivery attempt recorded
        attempts = DeliveryAttempt.objects.filter(notification=notification)
        assert attempts.count() == 1
        assert attempts.first().outcome == "transient_failure"

    @patch("django.core.mail.send_mail")
    def test_max_retries_exhausted(
        self, mock_send_mail, notification_factory, notification_type_factory, retry_policy_factory
    ):
        """Notification marked failed after max retry attempts exhausted."""
        from smtplib import SMTPException

        mock_send_mail.side_effect = SMTPException("Connection timeout")

        retry_policy = retry_policy_factory(
            max_attempts=2,  # Only 2 attempts
            initial_delay_seconds=1,
            retry_window_seconds=3600,
        )
        notification_type = notification_type_factory(
            code="test-max-retries", retry_policy=retry_policy
        )
        notification = notification_factory(
            type=notification_type,
            recipient="test@example.com",
            status="pending",
            payload={"subject": "Test", "body": "Body"},
        )

        # Simulate task execution with retries
        task = deliver_email_notification
        
        # First attempt (retries=0)
        task.request.retries = 0
        try:
            task(str(notification.id))
        except Exception:
            pass

        # Second attempt (retries=1, should mark as failed)
        task.request.retries = 1
        task(str(notification.id))

        # Verify notification marked as failed
        notification.refresh_from_db()
        assert notification.status == "failed"

        # Verify 2 delivery attempts recorded
        attempts = DeliveryAttempt.objects.filter(notification=notification)
        assert attempts.count() == 2

    @patch("django.core.mail.send_mail")
    def test_retry_window_expired(
        self, mock_send_mail, notification_factory, notification_type_factory, retry_policy_factory
    ):
        """Notification marked failed if retry window expires."""
        from smtplib import SMTPException
        from datetime import timedelta

        mock_send_mail.side_effect = SMTPException("Connection timeout")

        retry_policy = retry_policy_factory(
            max_attempts=5,
            initial_delay_seconds=1,
            retry_window_seconds=60,  # 1 minute window
        )
        notification_type = notification_type_factory(
            code="test-window", retry_policy=retry_policy
        )

        # Create notification with old timestamp (outside retry window)
        old_timestamp = timezone.now() - timedelta(seconds=120)  # 2 minutes ago
        notification = notification_factory(
            type=notification_type,
            recipient="test@example.com",
            status="pending",
            payload={"subject": "Test", "body": "Body"},
        )
        Notification.objects.filter(pk=notification.pk).update(created_at=old_timestamp)
        notification.refresh_from_db()

        # Execute delivery task
        deliver_email_notification(str(notification.id))

        # Verify notification marked as failed (retry window expired)
        notification.refresh_from_db()
        assert notification.status == "failed"

    @patch("django.core.mail.send_mail")
    def test_invalid_recipient_validation(
        self, mock_send_mail, notification_factory, notification_type_factory
    ):
        """Invalid recipient email caught before SMTP attempt."""
        notification_type = notification_type_factory(code="test-invalid")
        notification = notification_factory(
            type=notification_type,
            recipient="invalid-email",  # Invalid format
            status="pending",
            payload={"subject": "Test", "body": "Body"},
        )

        # Execute delivery task
        deliver_email_notification(str(notification.id))

        # Verify notification marked as failed
        notification.refresh_from_db()
        assert notification.status == "failed"

        # Verify send_mail never called (validation failed first)
        mock_send_mail.assert_not_called()

        # Verify delivery attempt recorded permanent failure
        attempt = DeliveryAttempt.objects.get(notification=notification)
        assert attempt.outcome == "permanent_failure"
        assert "Invalid email address" in attempt.error_message

    def test_nonexistent_notification(self):
        """Task handles nonexistent notification gracefully."""
        fake_uuid = "00000000-0000-0000-0000-000000000000"

        # Should not raise exception
        deliver_email_notification(fake_uuid)

        # No delivery attempts created
        assert DeliveryAttempt.objects.count() == 0

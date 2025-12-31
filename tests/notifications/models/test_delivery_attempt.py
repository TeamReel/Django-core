"""Unit tests for DeliveryAttempt model."""

import pytest
from django.db import IntegrityError
from notifications.models import DeliveryAttempt, Notification


@pytest.mark.django_db
class TestDeliveryAttempt:
    """Tests for DeliveryAttempt model."""

    def test_create_delivery_attempt(self, notification_factory: Notification) -> None:
        """Test creating a valid delivery attempt."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            duration_ms=150,
        )

        assert attempt.notification == notification
        assert attempt.attempt_number == 1
        assert attempt.outcome == "success"
        assert attempt.attempted_at is not None
        assert attempt.duration_ms == 150
        assert attempt.error_message is None
        assert attempt.http_status_code is None
        assert attempt.smtp_response_code is None
        assert attempt.response_body_snippet is None

    def test_outcome_choices(self, notification_factory: Notification) -> None:
        """Test valid outcome choices."""
        notification = notification_factory()

        # Success
        attempt1 = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
        )
        assert attempt1.outcome == "success"

        # Transient failure
        attempt2 = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=2,
            outcome="transient_failure",
        )
        assert attempt2.outcome == "transient_failure"

        # Permanent failure
        attempt3 = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=3,
            outcome="permanent_failure",
        )
        assert attempt3.outcome == "permanent_failure"

    def test_unique_together_notification_attempt_number(
        self, notification_factory: Notification
    ) -> None:
        """Test unique constraint on (notification, attempt_number)."""
        notification = notification_factory()

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
        )

        # Duplicate attempt_number for same notification
        with pytest.raises(IntegrityError):
            DeliveryAttempt.objects.create(
                notification=notification,
                attempt_number=1,
                outcome="success",
            )

    def test_multiple_attempts_different_numbers(self, notification_factory: Notification) -> None:
        """Test multiple attempts with different attempt_numbers."""
        notification = notification_factory()

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="transient_failure",
        )

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=2,
            outcome="transient_failure",
        )

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=3,
            outcome="success",
        )

        assert notification.delivery_attempts.count() == 3

    def test_cascade_delete_notification(self, notification_factory: Notification) -> None:
        """Test deleting notification cascades to attempts."""
        notification = notification_factory()

        attempt1 = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="transient_failure",
        )

        attempt2 = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=2,
            outcome="success",
        )

        attempt1_id = attempt1.id
        attempt2_id = attempt2.id

        # Delete notification
        notification.delete()

        # Attempts should be deleted
        assert not DeliveryAttempt.objects.filter(id=attempt1_id).exists()
        assert not DeliveryAttempt.objects.filter(id=attempt2_id).exists()

    def test_http_status_code_webhook(self, notification_factory: Notification) -> None:
        """Test HTTP status code for webhook deliveries."""
        notification = notification_factory(
            channel="webhook", recipient="https://example.com/webhook"
        )

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            http_status_code=200,
        )

        assert attempt.http_status_code == 200

    def test_smtp_response_code_email(self, notification_factory: Notification) -> None:
        """Test SMTP response code for email deliveries."""
        notification = notification_factory(channel="email")

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            smtp_response_code=250,
        )

        assert attempt.smtp_response_code == 250

    def test_error_message_on_failure(self, notification_factory: Notification) -> None:
        """Test error_message captures failure details."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="permanent_failure",
            error_message="SMTP connection timeout",
        )

        assert attempt.error_message == "SMTP connection timeout"

    def test_response_body_snippet_truncation(self, notification_factory: Notification) -> None:
        """Test response body is truncated to 1KB."""
        notification = notification_factory()

        # Create 2KB response body
        large_response = "x" * (2 * 1024)

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            response_body_snippet=large_response,
        )

        # Reload from DB
        attempt.refresh_from_db()

        # Should be truncated to 1KB (1024 bytes)
        assert len(attempt.response_body_snippet) == 1024

    def test_response_body_snippet_no_truncation_small(
        self, notification_factory: Notification
    ) -> None:
        """Test small response body is not truncated."""
        notification = notification_factory()

        small_response = '{"status": "ok"}'

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            response_body_snippet=small_response,
        )

        attempt.refresh_from_db()

        # Should not be truncated
        assert attempt.response_body_snippet == small_response

    def test_duration_ms_tracking(self, notification_factory: Notification) -> None:
        """Test duration_ms tracks delivery time."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
            duration_ms=1250,  # 1.25 seconds
        )

        assert attempt.duration_ms == 1250

    def test_index_notification_attempt(self, notification_factory: Notification) -> None:
        """Test idx_notification_attempt index (implicit verification)."""
        notification = notification_factory()

        # Create multiple attempts
        for i in range(1, 6):
            DeliveryAttempt.objects.create(
                notification=notification,
                attempt_number=i,
                outcome="success",
            )

        # Query using indexed fields
        attempts = DeliveryAttempt.objects.filter(notification=notification).order_by(
            "attempt_number"
        )

        assert attempts.count() == 5
        assert list(attempts.values_list("attempt_number", flat=True)) == [
            1,
            2,
            3,
            4,
            5,
        ]

    def test_index_outcome_attempted(self, notification_factory: Notification) -> None:
        """Test idx_outcome_attempted index (implicit verification)."""
        notification = notification_factory()

        # Create multiple attempts with different outcomes
        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="transient_failure",
        )

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=2,
            outcome="transient_failure",
        )

        DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=3,
            outcome="success",
        )

        # Query using indexed fields
        failures = DeliveryAttempt.objects.filter(outcome="transient_failure").order_by(
            "attempted_at"
        )

        assert failures.count() == 2

    def test_str_representation(self, notification_factory: Notification) -> None:
        """Test string representation."""
        notification = notification_factory()

        attempt = DeliveryAttempt(
            notification=notification,
            attempt_number=2,
            outcome="success",
        )

        assert "#2" in str(attempt)
        assert "success" in str(attempt)

    def test_ordering(self, notification_factory: Notification) -> None:
        """Test queryset ordering by notification, attempt_number."""
        from django.utils import timezone
        from datetime import timedelta
        from notifications.models import Notification

        now = timezone.now()

        # Create notifications with explicit timestamps to ensure ordering
        # Notification ordering is -created_at (newest first)
        # We want notification1 to be first, so it must be newer
        notification1 = notification_factory()
        Notification.objects.filter(pk=notification1.pk).update(created_at=now)

        notification2 = notification_factory()
        Notification.objects.filter(pk=notification2.pk).update(created_at=now - timedelta(hours=1))

        # Create attempts in mixed order
        attempt1_2 = DeliveryAttempt.objects.create(
            notification=notification1,
            attempt_number=2,
            outcome="success",
        )

        attempt2_1 = DeliveryAttempt.objects.create(
            notification=notification2,
            attempt_number=1,
            outcome="success",
        )

        attempt1_1 = DeliveryAttempt.objects.create(
            notification=notification1,
            attempt_number=1,
            outcome="success",
        )

        # Query all attempts (should be ordered)
        attempts = list(DeliveryAttempt.objects.all())

        # Ordering: (notification, attempt_number)
        # notification1 (newer) should come before notification2 (older)
        # Within notification1: attempt 1 before attempt 2
        assert attempts[0] == attempt1_1
        assert attempts[1] == attempt1_2
        assert attempts[2] == attempt2_1

    def test_foreign_key_relationship(self, notification_factory: Notification) -> None:
        """Test foreign key relationship with notification."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
        )

        # Forward relationship
        assert attempt.notification == notification

        # Reverse relationship
        assert attempt in notification.delivery_attempts.all()

    def test_optional_fields_null(self, notification_factory: Notification) -> None:
        """Test optional fields can be null."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
        )

        # All these should be None/null
        assert attempt.error_message is None
        assert attempt.http_status_code is None
        assert attempt.smtp_response_code is None
        assert attempt.response_body_snippet is None
        assert attempt.duration_ms is None

    def test_attempted_at_auto_now_add(self, notification_factory: Notification) -> None:
        """Test attempted_at is automatically set."""
        notification = notification_factory()

        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=1,
            outcome="success",
        )

        assert attempt.attempted_at is not None

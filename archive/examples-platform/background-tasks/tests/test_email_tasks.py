"""Tests for the Email Tasks example.

This module demonstrates pytest-django testing patterns for Celery tasks including:
- Testing async tasks with eager mode
- Testing task retries
- Testing task chains
- Testing periodic tasks
- Testing email sending
"""

import pytest
from rest_framework import status

from email_tasks.models import EmailLog
from email_tasks.tasks import (
    create_email_validation_workflow,
    log_email_attempt,
    notify_admin_invalid_email,
    send_bulk_emails,
    send_notification_email,
    send_welcome_email,
    validate_email,
)
from email_tasks.scheduler import (
    cleanup_failed_emails,
    cleanup_old_email_logs,
    email_system_health_check,
    generate_email_statistics,
)


@pytest.mark.django_db
class TestSendWelcomeEmail:
    """Test suite for the send_welcome_email task."""

    def test_send_welcome_email_success(self, mailoutbox):
        """Test successful welcome email sending."""
        result = send_welcome_email("test@example.com", "Test User")

        assert result["status"] == "sent"
        assert result["email"] == "test@example.com"
        assert "log_id" in result

        # Verify email was sent
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["test@example.com"]
        assert "Welcome" in mailoutbox[0].subject

    def test_send_welcome_email_creates_log(self, mailoutbox):
        """Test that sending creates an EmailLog entry."""
        result = send_welcome_email("log@example.com", "Log User")

        log = EmailLog.objects.get(id=result["log_id"])
        assert log.email == "log@example.com"
        assert log.status == EmailLog.Status.SENT

    def test_send_welcome_email_updates_log_on_success(self, mailoutbox):
        """Test that log is updated to SENT status."""
        result = send_welcome_email("success@example.com", "Success User")

        log = EmailLog.objects.get(id=result["log_id"])
        assert log.status == EmailLog.Status.SENT
        assert log.error_message == ""


@pytest.mark.django_db
class TestSendNotificationEmail:
    """Test suite for the send_notification_email task."""

    def test_send_notification_success(self, mailoutbox):
        """Test successful notification email."""
        result = send_notification_email(
            user_email="notify@example.com",
            subject="Test Notification",
            message="This is a test notification.",
        )

        assert result["status"] == "sent"
        assert result["subject"] == "Test Notification"

        assert len(mailoutbox) == 1
        assert mailoutbox[0].subject == "Test Notification"


@pytest.mark.django_db
class TestValidateEmail:
    """Test suite for email validation task."""

    def test_validate_valid_email(self):
        """Test validation with valid email format."""
        result = validate_email("valid@example.com")

        assert result["email"] == "valid@example.com"
        assert result["is_valid"] is True

    def test_validate_invalid_email_no_at(self):
        """Test validation with missing @ symbol."""
        result = validate_email("invalid-email")

        assert result["is_valid"] is False

    def test_validate_invalid_email_no_domain(self):
        """Test validation with missing domain."""
        result = validate_email("user@")

        assert result["is_valid"] is False

    def test_validate_complex_valid_email(self):
        """Test validation with complex but valid email."""
        result = validate_email("user.name+tag@subdomain.example.com")

        assert result["is_valid"] is True


@pytest.mark.django_db
class TestLogEmailAttempt:
    """Test suite for log_email_attempt task."""

    def test_log_valid_email(self):
        """Test logging a valid email attempt."""
        input_result = {"email": "test@example.com", "is_valid": True}
        result = log_email_attempt(input_result)

        assert result["log_id"] is not None
        log = EmailLog.objects.get(id=result["log_id"])
        assert log.status == EmailLog.Status.VALIDATED

    def test_log_invalid_email(self):
        """Test logging an invalid email attempt."""
        input_result = {"email": "invalid", "is_valid": False}
        result = log_email_attempt(input_result)

        log = EmailLog.objects.get(id=result["log_id"])
        assert log.status == EmailLog.Status.INVALID


@pytest.mark.django_db
class TestNotifyAdminInvalidEmail:
    """Test suite for notify_admin_invalid_email task."""

    def test_notify_on_invalid(self):
        """Test that admin is notified for invalid emails."""
        input_result = {"email": "bad@", "is_valid": False}
        result = notify_admin_invalid_email(input_result)

        assert result["admin_notified"] is True

    def test_no_notify_on_valid(self):
        """Test that admin is not notified for valid emails."""
        input_result = {"email": "good@example.com", "is_valid": True}
        result = notify_admin_invalid_email(input_result)

        assert result["admin_notified"] is False


@pytest.mark.django_db
class TestEmailValidationWorkflow:
    """Test suite for the email validation chain."""

    def test_full_workflow_valid_email(self):
        """Test complete workflow with valid email."""
        workflow = create_email_validation_workflow("workflow@example.com")
        result = workflow.apply()

        assert result["is_valid"] is True
        assert result["admin_notified"] is False
        assert "log_id" in result

    def test_full_workflow_invalid_email(self):
        """Test complete workflow with invalid email."""
        workflow = create_email_validation_workflow("not-an-email")
        result = workflow.apply()

        assert result["is_valid"] is False
        assert result["admin_notified"] is True


@pytest.mark.django_db
class TestSendBulkEmails:
    """Test suite for bulk email sending."""

    def test_bulk_send_success(self, mailoutbox):
        """Test sending bulk emails."""
        recipients = [
            {"email": "user1@example.com", "name": "User 1"},
            {"email": "user2@example.com", "name": "User 2"},
            {"email": "user3@example.com", "name": "User 3"},
        ]

        result = send_bulk_emails(recipients)

        assert result["total"] == 3
        assert result["sent"] == 3
        assert result["failed"] == 0
        assert len(mailoutbox) == 3

    def test_bulk_send_empty_list(self, mailoutbox):
        """Test bulk send with empty list."""
        result = send_bulk_emails([])

        assert result["total"] == 0
        assert result["sent"] == 0
        assert len(mailoutbox) == 0


@pytest.mark.django_db
class TestCleanupOldEmailLogs:
    """Test suite for cleanup task."""

    def test_cleanup_deletes_old_logs(self, old_email_logs, recent_email_logs):
        """Test that old logs are deleted but recent ones remain."""
        initial_count = EmailLog.objects.count()
        assert initial_count == 10  # 5 old + 5 recent

        result = cleanup_old_email_logs(days=30)

        assert result["deleted_count"] == 5
        assert EmailLog.objects.count() == 5

        # Verify only recent logs remain
        remaining = EmailLog.objects.all()
        for log in remaining:
            assert "recent" in log.email

    def test_cleanup_no_old_logs(self, recent_email_logs):
        """Test cleanup when no old logs exist."""
        result = cleanup_old_email_logs(days=30)

        assert result["deleted_count"] == 0
        assert EmailLog.objects.count() == 5


@pytest.mark.django_db
class TestCleanupFailedEmails:
    """Test suite for failed email cleanup."""

    def test_cleanup_failed_with_max_retries(self, email_log_factory):
        """Test cleanup of failed emails exceeding retry limit."""
        from datetime import timedelta

        from django.utils import timezone

        # Create failed email with max retries
        log = email_log_factory(
            email="failed@example.com",
            status=EmailLog.Status.FAILED,
            retry_count=5,
        )
        # Make it old enough
        old_date = timezone.now() - timedelta(days=10)
        EmailLog.objects.filter(id=log.id).update(created_at=old_date)

        result = cleanup_failed_emails(max_retries=3, days=7)

        assert result["processed_count"] == 1
        assert not EmailLog.objects.filter(id=log.id).exists()


@pytest.mark.django_db
class TestGenerateEmailStatistics:
    """Test suite for statistics generation."""

    def test_generate_stats_with_data(self, email_log_factory):
        """Test statistics generation with email data."""
        # Create some logs
        email_log_factory(status=EmailLog.Status.SENT)
        email_log_factory(status=EmailLog.Status.SENT)
        email_log_factory(status=EmailLog.Status.FAILED)

        result = generate_email_statistics()

        assert "generated_at" in result
        assert "last_24_hours" in result
        assert result["last_24_hours"]["total"] == 3
        assert result["last_24_hours"]["sent"] == 2
        assert result["last_24_hours"]["failed"] == 1

    def test_generate_stats_empty(self):
        """Test statistics generation with no data."""
        result = generate_email_statistics()

        assert result["last_24_hours"]["total"] == 0


@pytest.mark.django_db
class TestEmailSystemHealthCheck:
    """Test suite for health check task."""

    def test_health_check_healthy(self, recent_email_logs):
        """Test health check reports healthy status."""
        result = email_system_health_check()

        assert result["database_accessible"] is True
        assert result["overall_status"] == "healthy"

    def test_health_check_with_failures(self, email_log_factory):
        """Test health check with high failure rate."""
        # Create many failed logs
        for _ in range(10):
            email_log_factory(status=EmailLog.Status.FAILED)

        result = email_system_health_check()

        assert result["database_accessible"] is True
        assert result["recent_failures_rate"] == 100.0
        assert result["overall_status"] == "degraded"


@pytest.mark.django_db
class TestEmailLogModel:
    """Test suite for EmailLog model."""

    def test_email_log_creation(self, email_log_factory):
        """Test creating an email log."""
        log = email_log_factory(
            email="model@example.com",
            status=EmailLog.Status.PENDING,
        )

        assert log.email == "model@example.com"
        assert log.status == EmailLog.Status.PENDING
        assert log.created_at is not None

    def test_mark_sent(self, email_log_factory):
        """Test marking email as sent."""
        log = email_log_factory(status=EmailLog.Status.PENDING)
        log.mark_sent()

        log.refresh_from_db()
        assert log.status == EmailLog.Status.SENT

    def test_mark_failed(self, email_log_factory):
        """Test marking email as failed."""
        log = email_log_factory(status=EmailLog.Status.PENDING)
        log.mark_failed("Connection timeout")

        log.refresh_from_db()
        assert log.status == EmailLog.Status.FAILED
        assert log.error_message == "Connection timeout"
        assert log.retry_count == 1

    def test_str_representation(self, email_log_factory):
        """Test string representation."""
        log = email_log_factory(
            email="str@example.com",
            status=EmailLog.Status.SENT,
        )

        assert str(log) == "str@example.com - sent"

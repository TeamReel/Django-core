"""Unit tests for EmailChannel."""

import pytest
from smtplib import SMTPException
from unittest.mock import Mock, patch

from django.core.validators import ValidationError

from notifications.channels.email import EmailChannel
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.models import Notification


@pytest.mark.django_db
class TestEmailChannel:
    """Test EmailChannel email delivery functionality."""

    def test_validate_recipient_valid_email(self):
        """Valid email addresses should pass validation."""
        channel = EmailChannel()
        assert channel.validate_recipient("user@example.com") is True
        assert channel.validate_recipient("test.user+tag@subdomain.example.com") is True

    def test_validate_recipient_invalid_email(self):
        """Invalid email addresses should fail validation."""
        channel = EmailChannel()
        assert channel.validate_recipient("not-an-email") is False
        assert channel.validate_recipient("missing@domain") is False
        assert channel.validate_recipient("@example.com") is False
        assert channel.validate_recipient("") is False

    @patch("notifications.channels.email.send_mail")
    def test_send_success(self, mock_send_mail, notification_factory):
        """Successful email delivery returns 200 status."""
        mock_send_mail.return_value = 1  # 1 email sent

        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test Subject", "body": "Test Body"},
        )

        channel = EmailChannel()
        result = channel.send(notification)

        assert result["status_code"] == 200
        assert "test@example.com" in result["response"]
        assert "duration_ms" in result
        assert isinstance(result["duration_ms"], int)

        # Verify send_mail was called correctly
        mock_send_mail.assert_called_once()
        call_kwargs = mock_send_mail.call_args[1]
        assert call_kwargs["subject"] == "Test Subject"
        assert call_kwargs["message"] == "Test Body"
        assert call_kwargs["recipient_list"] == ["test@example.com"]

    def test_send_invalid_recipient(self, notification_factory):
        """Invalid recipient raises PermanentChannelError."""
        # Create notification with valid email first, then manually set invalid
        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Body"},
        )
        # Bypass model validation by updating directly
        Notification.objects.filter(pk=notification.pk).update(recipient="invalid-email")
        notification.refresh_from_db()

        channel = EmailChannel()

        with pytest.raises(PermanentChannelError) as exc_info:
            channel.send(notification)

        assert "Invalid email address" in str(exc_info.value)
        assert exc_info.value.channel == "email"
        assert exc_info.value.recipient == "invalid-email"

    @patch("notifications.channels.email.send_mail")
    def test_send_transient_smtp_error(self, mock_send_mail, notification_factory):
        """Transient SMTP errors raise TransientChannelError."""
        mock_send_mail.side_effect = SMTPException("Connection timeout")

        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Body"},
        )

        channel = EmailChannel()

        with pytest.raises(TransientChannelError) as exc_info:
            channel.send(notification)

        assert "Temporary SMTP error" in str(exc_info.value)
        assert "timeout" in str(exc_info.value).lower()
        assert exc_info.value.channel == "email"

    @patch("notifications.channels.email.send_mail")
    def test_send_permanent_smtp_error(self, mock_send_mail, notification_factory):
        """Permanent SMTP errors raise PermanentChannelError."""
        mock_send_mail.side_effect = SMTPException("Mailbox full")

        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Body"},
        )

        channel = EmailChannel()

        with pytest.raises(PermanentChannelError) as exc_info:
            channel.send(notification)

        assert "Permanent SMTP error" in str(exc_info.value)
        assert "Mailbox full" in str(exc_info.value)

    @patch("notifications.channels.email.send_mail")
    def test_send_transient_error_keywords(self, mock_send_mail, notification_factory):
        """Various transient error keywords are recognized."""
        transient_errors = [
            "Connection refused",
            "Temporary failure",
            "Try again later",
            "timeout occurred",
        ]

        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Body"},
        )

        channel = EmailChannel()

        for error_msg in transient_errors:
            mock_send_mail.side_effect = SMTPException(error_msg)

            with pytest.raises(TransientChannelError):
                channel.send(notification)

    @patch("notifications.channels.email.send_mail")
    def test_send_unexpected_error(self, mock_send_mail, notification_factory):
        """Unexpected errors are treated as transient."""
        mock_send_mail.side_effect = RuntimeError("Unexpected error")

        notification = notification_factory(
            recipient="test@example.com",
            payload={"subject": "Test", "body": "Body"},
        )

        channel = EmailChannel()

        with pytest.raises(TransientChannelError) as exc_info:
            channel.send(notification)

        assert "Unexpected error" in str(exc_info.value)

    def test_validate_config_missing_email_backend(self, settings):
        """Missing EMAIL_BACKEND raises ValueError."""
        del settings.EMAIL_BACKEND

        channel = EmailChannel()

        with pytest.raises(ValueError, match="EMAIL_BACKEND not configured"):
            channel.validate_config()

    def test_validate_config_missing_default_from_email(self, settings):
        """Missing DEFAULT_FROM_EMAIL raises ValueError."""
        del settings.DEFAULT_FROM_EMAIL

        channel = EmailChannel()

        with pytest.raises(ValueError, match="DEFAULT_FROM_EMAIL not configured"):
            channel.validate_config()

    def test_validate_config_success(self, settings):
        """Valid configuration passes validation."""
        settings.EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
        settings.DEFAULT_FROM_EMAIL = "noreply@example.com"

        channel = EmailChannel()
        channel.validate_config()  # Should not raise

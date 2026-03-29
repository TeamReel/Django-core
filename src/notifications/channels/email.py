"""Email notification channel."""

import logging
import time
from smtplib import SMTPException
from typing import Any, Dict

from django.conf import settings
from django.core.mail import send_mail
from django.core.validators import EmailValidator, ValidationError
from notifications.channels.base import NotificationChannel
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.models import Notification

logger = logging.getLogger(__name__)


class EmailChannel(NotificationChannel):
    """Email notification delivery via SMTP."""

    def __init__(self):
        """Initialize email channel with Django email validator."""
        self.email_validator = EmailValidator()

    def send(self, notification: Notification) -> Dict[str, Any]:
        """Send notification via email.

        Args:
            notification: Notification instance with recipient email

        Returns:
            Dict with:
                - status_code: 200 on success, 400+ on error
                - response: Delivery result message
                - duration_ms: Email send time in milliseconds
                - message_id: Optional email message ID

        Raises:
            TransientChannelError: SMTP timeout, connection refused, rate limit
            PermanentChannelError: Invalid email, mailbox full, blocked recipient
        """
        start_time = time.time()

        try:
            # Validate recipient before sending
            if not self.validate_recipient(notification.recipient):
                raise PermanentChannelError(
                    message=f"Invalid email address: {notification.recipient}",
                    channel="email",
                    recipient=notification.recipient,
                )

            # Extract email content from notification payload
            subject = notification.payload.get("subject", "Notification")
            body = notification.payload.get("body", "")
            from_email = settings.DEFAULT_FROM_EMAIL

            # Send email using Django's send_mail
            send_mail(
                subject=subject,
                message=body,
                from_email=from_email,
                recipient_list=[notification.recipient],
                fail_silently=False,
            )

            duration_ms = int((time.time() - start_time) * 1000)

            logger.info(
                "Email sent successfully",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                    "duration_ms": duration_ms,
                },
            )

            return {
                "status_code": 200,
                "response": f"Email sent to {notification.recipient}",
                "duration_ms": duration_ms,
            }

        except (PermanentChannelError, TransientChannelError):
            # Re-raise our own exceptions without wrapping
            raise

        except SMTPException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error_msg = str(e)

            # Classify SMTP errors as transient or permanent
            if any(
                keyword in error_msg.lower()
                for keyword in ["timeout", "connection refused", "temporary failure", "try again"]
            ):
                logger.warning(
                    "Transient SMTP error",
                    extra={
                        "notification_id": str(notification.id),
                        "recipient": notification.recipient,
                        "error": error_msg,
                    },
                )
                raise TransientChannelError(
                    message=f"Temporary SMTP error: {error_msg}",
                    channel="email",
                    recipient=notification.recipient,
                ) from e

            # Permanent errors: mailbox full, user unknown, blocked
            logger.error(
                "Permanent SMTP error",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                    "error": error_msg,
                },
            )
            raise PermanentChannelError(
                message=f"Permanent SMTP error: {error_msg}",
                channel="email",
                recipient=notification.recipient,
            ) from e

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.exception(
                "Unexpected error sending email",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                },
            )
            raise TransientChannelError(
                message=f"Unexpected error: {str(e)}",
                channel="email",
                recipient=notification.recipient,
            ) from e

    def validate_recipient(self, recipient: str) -> bool:
        """Validate email address format.

        Args:
            recipient: Email address to validate

        Returns:
            True if valid email format, False otherwise
        """
        try:
            self.email_validator(recipient)
            return True
        except ValidationError:
            return False

    def validate_config(self) -> None:
        """Validate email configuration.

        Raises:
            ValueError: If email backend not configured
        """
        if not hasattr(settings, "EMAIL_BACKEND"):
            raise ValueError("EMAIL_BACKEND not configured in Django settings")

        if not hasattr(settings, "DEFAULT_FROM_EMAIL"):
            raise ValueError("DEFAULT_FROM_EMAIL not configured in Django settings")

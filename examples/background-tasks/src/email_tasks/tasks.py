"""Celery tasks for the email tasks example.

This module demonstrates various Celery task patterns including:
- Basic async tasks with logging
- Retry logic with exponential backoff
- Task chaining for workflows
- Error handling patterns
- Task result tracking

The tasks use Django's email backend and integrate with the
EmailLog model for tracking.
"""

import logging
import re
from typing import Any

from celery import chain, shared_task
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


# =============================================================================
# Basic Async Task with Retries (T071)
# =============================================================================


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
)
def send_welcome_email(self, user_email: str, user_name: str) -> dict[str, Any]:
    """Send welcome email to a new user.

    This task demonstrates:
    - Basic async task execution
    - Automatic retry on failure with exponential backoff
    - Structured logging for observability
    - Result tracking in EmailLog model

    Args:
        user_email: The recipient's email address.
        user_name: The recipient's display name.

    Returns:
        dict with status and email address.

    Raises:
        Retry: If email sending fails (up to 3 times).

    Example:
        >>> # Async execution
        >>> result = send_welcome_email.delay("user@example.com", "John")
        >>> result.get(timeout=30)
        {'status': 'sent', 'email': 'user@example.com'}

        >>> # Direct execution (for testing)
        >>> send_welcome_email("user@example.com", "John")
        {'status': 'sent', 'email': 'user@example.com'}
    """
    from .models import EmailLog

    # Create log entry for tracking
    log_entry = EmailLog.objects.create(
        email=user_email,
        status=EmailLog.Status.PENDING,
        task_id=self.request.id or "",
    )

    try:
        logger.info(
            "Sending welcome email",
            extra={
                "email": user_email,
                "user_name": user_name,
                "task_id": self.request.id,
                "retry_count": self.request.retries,
            },
        )

        send_mail(
            subject="Welcome to Our Platform!",
            message=f"Hello {user_name},\n\nWelcome to our platform! We're excited to have you.",
            from_email="noreply@example.com",
            recipient_list=[user_email],
            fail_silently=False,
        )

        log_entry.mark_sent()
        logger.info(f"Welcome email sent successfully to {user_email}")

        return {"status": "sent", "email": user_email, "log_id": log_entry.id}

    except Exception as exc:
        log_entry.mark_failed(str(exc))
        logger.error(
            f"Failed to send welcome email to {user_email}: {exc}",
            extra={
                "email": user_email,
                "error": str(exc),
                "retry_count": self.request.retries,
            },
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=30,
)
def send_notification_email(
    self,
    user_email: str,
    subject: str,
    message: str,
) -> dict[str, Any]:
    """Send a notification email.

    This task demonstrates:
    - Parameterized email content
    - Custom retry configuration
    - Explicit retry handling

    Args:
        user_email: The recipient's email address.
        subject: Email subject line.
        message: Email body content.

    Returns:
        dict with status and metadata.
    """
    from .models import EmailLog

    log_entry = EmailLog.objects.create(
        email=user_email,
        status=EmailLog.Status.PENDING,
        task_id=self.request.id or "",
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email="notifications@example.com",
            recipient_list=[user_email],
            fail_silently=False,
        )

        log_entry.mark_sent()
        logger.info(f"Notification email sent to {user_email}: {subject}")

        return {
            "status": "sent",
            "email": user_email,
            "subject": subject,
            "log_id": log_entry.id,
        }

    except Exception as exc:
        log_entry.mark_failed(str(exc))
        logger.error(f"Failed to send notification to {user_email}: {exc}")
        raise self.retry(exc=exc, countdown=30 * (2**self.request.retries))


# =============================================================================
# Chained Tasks (T073)
# =============================================================================


@shared_task
def validate_email(email: str) -> dict[str, Any]:
    """Validate email format and basic checks.

    This is the first task in a chain that:
    1. Validates email format
    2. Logs the validation result
    3. Notifies admin of invalid emails

    Args:
        email: The email address to validate.

    Returns:
        dict with email and validation status.

    Example:
        >>> validate_email("user@example.com")
        {'email': 'user@example.com', 'is_valid': True}
        >>> validate_email("invalid-email")
        {'email': 'invalid-email', 'is_valid': False}
    """
    # Basic email regex pattern
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    is_valid = bool(re.match(email_pattern, email))

    logger.info(
        f"Email validation: {email} is {'valid' if is_valid else 'invalid'}"
    )

    return {"email": email, "is_valid": is_valid}


@shared_task
def log_email_attempt(result: dict[str, Any]) -> dict[str, Any]:
    """Log the email validation attempt to the database.

    This is the second task in the chain, receiving the result
    from validate_email.

    Args:
        result: The result from the previous task in the chain.

    Returns:
        dict with the original result plus log_id.
    """
    from .models import EmailLog

    status = EmailLog.Status.VALIDATED if result.get("is_valid") else EmailLog.Status.INVALID

    log_entry = EmailLog.objects.create(
        email=result["email"],
        status=status,
    )

    logger.info(f"Logged email attempt: {result['email']} as {status}")

    return {**result, "log_id": log_entry.id}


@shared_task
def notify_admin_invalid_email(result: dict[str, Any]) -> dict[str, Any]:
    """Notify admin of invalid email attempts.

    This is the final task in the chain. It only takes action
    if the email was invalid.

    Args:
        result: The result from the previous tasks in the chain.

    Returns:
        dict with notification status added.
    """
    if not result.get("is_valid"):
        logger.warning(
            f"Invalid email attempt detected: {result['email']}",
            extra={"email": result["email"], "log_id": result.get("log_id")},
        )
        # In a real app, you might send an admin notification here
        return {**result, "admin_notified": True}

    return {**result, "admin_notified": False}


def create_email_validation_workflow(email: str) -> chain:
    """Create a task chain for email validation workflow.

    This demonstrates the Celery chain pattern for creating
    multi-step workflows where each task receives the result
    of the previous task.

    Args:
        email: The email address to validate.

    Returns:
        A Celery chain ready for execution.

    Example:
        >>> workflow = create_email_validation_workflow("user@example.com")
        >>> result = workflow.apply_async()
        >>> result.get(timeout=30)
        {'email': 'user@example.com', 'is_valid': True, 'log_id': 1, 'admin_notified': False}
    """
    return chain(
        validate_email.s(email),
        log_email_attempt.s(),
        notify_admin_invalid_email.s(),
    )


# =============================================================================
# Batch Processing Task
# =============================================================================


@shared_task(bind=True)
def send_bulk_emails(
    self,
    emails: list[dict[str, str]],
    template: str = "notification",
) -> dict[str, Any]:
    """Send emails to multiple recipients.

    This task demonstrates:
    - Batch processing pattern
    - Progress tracking
    - Partial failure handling

    Args:
        emails: List of dicts with 'email' and 'name' keys.
        template: The email template to use.

    Returns:
        dict with counts of sent and failed emails.

    Example:
        >>> recipients = [
        ...     {"email": "user1@example.com", "name": "User 1"},
        ...     {"email": "user2@example.com", "name": "User 2"},
        ... ]
        >>> send_bulk_emails.delay(recipients)
    """
    sent_count = 0
    failed_count = 0
    errors = []

    total = len(emails)
    logger.info(f"Starting bulk email send to {total} recipients")

    for i, recipient in enumerate(emails):
        try:
            email = recipient["email"]
            name = recipient.get("name", "User")

            send_mail(
                subject="Important Notification",
                message=f"Hello {name}, this is an important update.",
                from_email="bulk@example.com",
                recipient_list=[email],
                fail_silently=False,
            )
            sent_count += 1

            # Update task state for progress tracking
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": i + 1,
                    "total": total,
                    "sent": sent_count,
                    "failed": failed_count,
                },
            )

        except Exception as exc:
            failed_count += 1
            errors.append({"email": recipient["email"], "error": str(exc)})
            logger.error(f"Failed to send to {recipient['email']}: {exc}")

    logger.info(f"Bulk email complete: {sent_count} sent, {failed_count} failed")

    return {
        "total": total,
        "sent": sent_count,
        "failed": failed_count,
        "errors": errors,
    }

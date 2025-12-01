"""Celery tasks for notification delivery."""

import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from notifications.channels.email import EmailChannel
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.models import DeliveryAttempt, Notification

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(TransientChannelError,))
def deliver_email_notification(self, notification_id: str):
    """Deliver email notification with retry logic.

    Args:
        notification_id: UUID of Notification to deliver

    This task automatically retries on TransientChannelError according to
    the notification type's RetryPolicy configuration.
    """
    try:
        # Load notification with related data (avoid N+1 queries)
        notification = Notification.objects.select_related("type", "type__retry_policy").get(
            pk=notification_id
        )

        # Get retry policy from notification type
        policy = notification.type.retry_policy

        # Create DeliveryAttempt record
        attempt = DeliveryAttempt.objects.create(
            notification=notification,
            attempt_number=self.request.retries + 1,
            attempted_at=timezone.now(),
        )

        logger.info(
            "Starting email delivery",
            extra={
                "notification_id": str(notification.id),
                "attempt_number": attempt.attempt_number,
                "recipient": notification.recipient,
            },
        )

        # Attempt delivery via EmailChannel
        channel = EmailChannel()
        result = channel.send(notification)

        # Update attempt with success
        attempt.outcome = "success"
        attempt.duration_ms = result.get("duration_ms")
        attempt.save()

        # Update notification status atomically
        with transaction.atomic():
            notification.status = "sent"
            notification.updated_at = timezone.now()
            notification.save()

        logger.info(
            "Email delivered successfully",
            extra={
                "notification_id": str(notification.id),
                "attempt_number": attempt.attempt_number,
                "duration_ms": attempt.duration_ms,
            },
        )

    except PermanentChannelError as e:
        # Permanent failure - don't retry
        logger.error(
            "Permanent delivery failure",
            extra={
                "notification_id": str(notification.id),
                "attempt_number": self.request.retries + 1,
                "error": str(e),
            },
        )

        attempt.outcome = "permanent_failure"
        attempt.error_message = str(e)
        attempt.save()

        with transaction.atomic():
            notification.status = "failed"
            notification.updated_at = timezone.now()
            notification.save()

    except TransientChannelError as e:
        # Transient failure - retry if within policy limits
        logger.warning(
            "Transient delivery failure",
            extra={
                "notification_id": str(notification.id),
                "attempt_number": self.request.retries + 1,
                "error": str(e),
            },
        )

        attempt.outcome = "transient_failure"
        attempt.error_message = str(e)
        attempt.save()

        # Check retry window (time elapsed since notification creation)
        elapsed_seconds = (timezone.now() - notification.created_at).total_seconds()
        if elapsed_seconds > policy.retry_window_seconds:
            # Outside retry window - mark as failed
            logger.error(
                "Retry window expired",
                extra={
                    "notification_id": str(notification.id),
                    "elapsed_seconds": elapsed_seconds,
                    "retry_window_seconds": policy.retry_window_seconds,
                },
            )
            with transaction.atomic():
                notification.status = "failed"
                notification.updated_at = timezone.now()
                notification.save()

        elif self.request.retries >= policy.max_attempts - 1:
            # Max attempts reached - mark as failed
            logger.error(
                "Max retry attempts reached",
                extra={
                    "notification_id": str(notification.id),
                    "retries": self.request.retries,
                    "max_attempts": policy.max_attempts,
                },
            )
            with transaction.atomic():
                notification.status = "failed"
                notification.updated_at = timezone.now()
                notification.save()

        else:
            # Calculate retry delay using RetryPolicy logic
            next_attempt = self.request.retries + 2  # Next attempt number (1-indexed)
            delay = policy.calculate_retry_delay(next_attempt)

            logger.info(
                "Scheduling retry",
                extra={
                    "notification_id": str(notification.id),
                    "next_attempt": next_attempt,
                    "delay_seconds": delay,
                },
            )

            # Retry with calculated delay
            raise self.retry(countdown=delay, max_retries=policy.max_attempts) from e

    except Notification.DoesNotExist:
        logger.error(
            "Notification not found",
            extra={"notification_id": notification_id},
        )
        # Don't retry - notification was deleted

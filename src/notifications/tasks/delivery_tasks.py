"""Celery tasks for notification delivery."""

import logging

from celery import shared_task
from django.utils import timezone
from notifications.channels.email import EmailChannel
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.metrics import (
    notification_deliveries_total,
    notification_failures_total,
    notification_retries_total,
    notification_retry_delay_seconds,
)
from notifications.models import DeliveryAttempt, Notification
from notifications.services.retry_service import RetryService

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

        # Track delivery success metric
        notification_deliveries_total.labels(
            notification_type=notification.type.code,
            channel="email",
            outcome="success",
        ).inc()

        # Update notification status atomically
        Notification.objects.filter(pk=notification.pk).update(
            status="sent", updated_at=timezone.now()
        )

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

        # Track permanent failure metric
        notification_failures_total.labels(
            notification_type=notification.type.code,
            channel="email",
            failure_type="permanent",
        ).inc()

        Notification.objects.filter(pk=notification.pk).update(
            status="failed", updated_at=timezone.now()
        )

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

        # Track retry attempt metric
        notification_retries_total.labels(
            notification_type=notification.type.code,
            channel="email",
            outcome="transient_failure",
        ).inc()

        # Check if should retry using RetryService
        current_attempts = self.request.retries + 1
        if not RetryService.should_retry(notification, policy, current_attempts):
            # Outside retry window or max attempts reached - mark as failed
            reason = (
                "retry window expired"
                if not RetryService.is_within_window(notification, policy)
                else "max retry attempts reached"
            )

            logger.error(
                f"Retry limit reached: {reason}",
                extra={
                    "notification_id": str(notification.id),
                    "current_attempts": current_attempts,
                    "max_attempts": policy.max_attempts,
                    "elapsed_seconds": (timezone.now() - notification.created_at).total_seconds(),
                    "retry_window_seconds": policy.retry_window_seconds,
                },
            )

            # Track failure metric
            notification_failures_total.labels(
                notification_type=notification.type.code,
                channel="email",
                failure_type="transient_exhausted",
            ).inc()

            Notification.objects.filter(pk=notification.pk).update(
                status="failed", updated_at=timezone.now()
            )
        else:
            # Calculate retry delay using RetryService
            next_attempt = self.request.retries + 2  # Next attempt number (1-indexed)
            delay = RetryService.calculate_delay(policy, next_attempt)

            # Track retry delay metric
            notification_retry_delay_seconds.labels(
                notification_type=notification.type.code,
                backoff_strategy=policy.backoff_strategy,
            ).observe(delay)

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

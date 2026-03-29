"""Webhook notification channel."""

import logging
import time
from typing import Any, Dict

import requests
from django.core.validators import URLValidator, ValidationError
from django.utils import timezone
from notifications.channels.base import NotificationChannel
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.models import Notification
from notifications.services.webhook_signature_service import WebhookSignatureService

logger = logging.getLogger(__name__)


class WebhookChannel(NotificationChannel):
    """Webhook notification delivery via HTTP POST."""

    def __init__(self):
        """Initialize webhook channel with URL validator and signature service."""
        self.url_validator = URLValidator(schemes=["http", "https"])
        self.signature_service = WebhookSignatureService()

    def send(self, notification: Notification) -> Dict[str, Any]:
        """Send notification via webhook HTTP POST.

        Args:
            notification: Notification instance with webhook URL as recipient

        Returns:
            Dict with:
                - status_code: HTTP status code from webhook endpoint
                - response: Delivery result message
                - duration_ms: HTTP request time in milliseconds
                - http_status_code: Actual HTTP response code
                - response_body_snippet: First 1KB of response body

        Raises:
            TransientChannelError: Timeout, 5xx errors, connection errors
            PermanentChannelError: Invalid URL, 4xx errors
        """
        start_time = time.time()

        try:
            # Validate recipient URL before sending
            if not self.validate_recipient(notification.recipient):
                raise PermanentChannelError(
                    message=f"Invalid webhook URL: {notification.recipient}",
                    channel="webhook",
                    recipient=notification.recipient,
                )

            # Build payload
            timestamp = int(timezone.now().timestamp())
            payload = {
                "notification_id": str(notification.id),
                "type": notification.type.code,
                "timestamp": timezone.now().isoformat(),
                "data": notification.payload,
            }

            # Generate HMAC signature
            signature = self.signature_service.generate_signature(payload, timestamp)

            # Send HTTP POST with timeout and redirect handling
            response = requests.post(
                url=notification.recipient,
                json=payload,
                headers={"X-Notification-Signature": signature},
                timeout=30,  # T073: 30s timeout
                allow_redirects=True,  # T074: Follow redirects (max 30 by default)
            )

            duration_ms = int((time.time() - start_time) * 1000)

            # T075: Record response details
            response_body_snippet = response.text[:1024] if response.text else ""

            # T076: Classify response as success/transient/permanent
            if response.ok:  # 2xx status codes
                logger.info(
                    "Webhook sent successfully",
                    extra={
                        "notification_id": str(notification.id),
                        "recipient": notification.recipient,
                        "http_status": response.status_code,
                        "duration_ms": duration_ms,
                    },
                )

                return {
                    "status_code": 200,
                    "response": f"Webhook delivered to {notification.recipient}",
                    "duration_ms": duration_ms,
                    "http_status_code": response.status_code,
                    "response_body_snippet": response_body_snippet,
                }

            elif 400 <= response.status_code < 500:
                # T076: 4xx = permanent failure (don't retry)
                logger.error(
                    "Permanent webhook error (4xx)",
                    extra={
                        "notification_id": str(notification.id),
                        "recipient": notification.recipient,
                        "http_status": response.status_code,
                        "response_body": response_body_snippet,
                    },
                )

                raise PermanentChannelError(
                    message=f"Webhook returned {response.status_code}: {response_body_snippet}",
                    channel="webhook",
                    recipient=notification.recipient,
                )

            else:
                # T076: 5xx = transient failure (retry)
                logger.warning(
                    "Transient webhook error (5xx)",
                    extra={
                        "notification_id": str(notification.id),
                        "recipient": notification.recipient,
                        "http_status": response.status_code,
                        "response_body": response_body_snippet,
                    },
                )

                raise TransientChannelError(
                    message=f"Webhook returned {response.status_code}: {response_body_snippet}",
                    channel="webhook",
                    recipient=notification.recipient,
                )

        except (PermanentChannelError, TransientChannelError):
            # Re-raise our own exceptions without wrapping
            raise

        except requests.Timeout:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(
                "Webhook timeout",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                    "duration_ms": duration_ms,
                },
            )

            raise TransientChannelError(
                message=f"Webhook timeout after {duration_ms}ms",
                channel="webhook",
                recipient=notification.recipient,
            ) from None

        except requests.TooManyRedirects:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "Too many redirects",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                    "duration_ms": duration_ms,
                },
            )

            raise PermanentChannelError(
                message="Too many redirects (max 3)",
                channel="webhook",
                recipient=notification.recipient,
            ) from None

        except requests.RequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.warning(
                "Webhook request error",
                extra={
                    "notification_id": str(notification.id),
                    "recipient": notification.recipient,
                    "error": str(e),
                    "duration_ms": duration_ms,
                },
            )

            raise TransientChannelError(
                message=f"Webhook request error: {str(e)}",
                channel="webhook",
                recipient=notification.recipient,
            ) from e

    def validate_recipient(self, recipient: str) -> bool:
        """Validate webhook URL format.

        Args:
            recipient: Webhook URL (must be HTTP or HTTPS)

        Returns:
            True if URL is valid HTTP/HTTPS URL
        """
        try:
            self.url_validator(recipient)
            return True
        except ValidationError:
            return False

    def validate_config(self) -> None:
        """Validate webhook channel configuration.

        Raises:
            ValueError: If WEBHOOK_SECRET_KEY is not configured
        """
        from django.conf import settings

        if not hasattr(settings, "WEBHOOK_SECRET_KEY") or not settings.WEBHOOK_SECRET_KEY:
            raise ValueError("WEBHOOK_SECRET_KEY must be configured in Django settings")

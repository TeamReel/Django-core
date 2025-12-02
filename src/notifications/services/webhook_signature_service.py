"""Webhook signature service for HMAC-SHA256 signing."""

import hashlib
import hmac
import json
from typing import Any, Dict

from django.conf import settings


class WebhookSignatureService:
    """Service for generating and verifying webhook HMAC signatures.

    Implements timestamp-based HMAC-SHA256 signing to prevent replay attacks
    and verify webhook authenticity.
    """

    @staticmethod
    def generate_signature(payload: Dict[str, Any], timestamp: int) -> str:
        """Generate HMAC-SHA256 signature for webhook payload.

        Args:
            payload: JSON-serializable payload dictionary
            timestamp: Unix timestamp (seconds since epoch)

        Returns:
            Signature string in format: "t={timestamp},v1={hex_signature}"

        Example:
            >>> service = WebhookSignatureService()
            >>> payload = {"notification_id": "123", "type": "alert"}
            >>> timestamp = 1701504000
            >>> signature = service.generate_signature(payload, timestamp)
            >>> signature
            't=1701504000,v1=a3b2c1d4e5f6...'
        """
        secret = settings.WEBHOOK_SECRET_KEY.encode("utf-8")

        # Create message: timestamp.json_payload (sorted keys for consistency)
        message = f"{timestamp}.{json.dumps(payload, sort_keys=True)}".encode("utf-8")

        # Generate HMAC-SHA256 signature
        signature = hmac.new(secret, message, hashlib.sha256).hexdigest()

        return f"t={timestamp},v1={signature}"

    @staticmethod
    def verify_signature(
        payload: Dict[str, Any],
        signature_header: str,
        tolerance_seconds: int = 300,
    ) -> bool:
        """Verify webhook signature and check timestamp freshness.

        Args:
            payload: Received payload dictionary
            signature_header: X-Notification-Signature header value
            tolerance_seconds: Maximum age of signature (default 5 minutes)

        Returns:
            True if signature is valid and within tolerance window

        Raises:
            ValueError: If signature header format is invalid

        Example:
            >>> service = WebhookSignatureService()
            >>> payload = {"notification_id": "123"}
            >>> header = "t=1701504000,v1=a3b2c1..."
            >>> service.verify_signature(payload, header, tolerance_seconds=300)
            True
        """
        import time

        # Parse signature header: "t={timestamp},v1={signature}"
        parts = signature_header.split(",")
        if len(parts) != 2:
            raise ValueError("Invalid signature header format")

        timestamp_part, signature_part = parts
        if not timestamp_part.startswith("t=") or not signature_part.startswith("v1="):
            raise ValueError("Invalid signature header format")

        try:
            timestamp = int(timestamp_part[2:])
            received_signature = signature_part[3:]
        except ValueError:
            raise ValueError("Invalid timestamp in signature header") from None

        # Check timestamp freshness (prevent replay attacks)
        current_timestamp = int(time.time())
        if abs(current_timestamp - timestamp) > tolerance_seconds:
            return False

        # Generate expected signature
        expected_signature_header = WebhookSignatureService.generate_signature(payload, timestamp)
        expected_signature = expected_signature_header.split(",")[1][3:]

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(received_signature, expected_signature)

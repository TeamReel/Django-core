"""Unit tests for webhook signature service."""

import time
from unittest.mock import patch

import pytest
from notifications.services.webhook_signature_service import WebhookSignatureService


class TestWebhookSignatureService:
    """Test webhook signature generation and verification."""

    def test_generate_signature(self):
        """Test signature generation with timestamp."""
        # Arrange
        payload = {"notification_id": "123", "type": "alert", "data": {"message": "test"}}
        timestamp = 1701504000

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature = WebhookSignatureService.generate_signature(payload, timestamp)

        # Assert
        assert signature.startswith(f"t={timestamp},v1=")
        parts = signature.split(",")
        assert len(parts) == 2
        assert parts[0] == f"t={timestamp}"
        assert parts[1].startswith("v1=")
        assert len(parts[1][3:]) == 64  # SHA256 hex digest is 64 chars

    def test_generate_signature_consistent(self):
        """Test same payload/timestamp produces same signature."""
        # Arrange
        payload = {"notification_id": "456"}
        timestamp = 1701504000

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature1 = WebhookSignatureService.generate_signature(payload, timestamp)
            signature2 = WebhookSignatureService.generate_signature(payload, timestamp)

        # Assert
        assert signature1 == signature2

    def test_generate_signature_different_payloads(self):
        """Test different payloads produce different signatures."""
        # Arrange
        payload1 = {"notification_id": "123"}
        payload2 = {"notification_id": "456"}
        timestamp = 1701504000

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature1 = WebhookSignatureService.generate_signature(payload1, timestamp)
            signature2 = WebhookSignatureService.generate_signature(payload2, timestamp)

        # Assert
        assert signature1 != signature2

    def test_generate_signature_different_timestamps(self):
        """Test different timestamps produce different signatures."""
        # Arrange
        payload = {"notification_id": "123"}
        timestamp1 = 1701504000
        timestamp2 = 1701504001

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature1 = WebhookSignatureService.generate_signature(payload, timestamp1)
            signature2 = WebhookSignatureService.generate_signature(payload, timestamp2)

        # Assert
        assert signature1 != signature2

    def test_generate_signature_sorted_keys(self):
        """Test payload keys are sorted for consistent signatures."""
        # Arrange - keys in different order
        payload1 = {"c": 3, "a": 1, "b": 2}
        payload2 = {"a": 1, "b": 2, "c": 3}
        timestamp = 1701504000

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature1 = WebhookSignatureService.generate_signature(payload1, timestamp)
            signature2 = WebhookSignatureService.generate_signature(payload2, timestamp)

        # Assert
        assert signature1 == signature2

    def test_verify_signature_valid(self):
        """Test verification of valid signature."""
        # Arrange
        payload = {"notification_id": "789"}
        timestamp = int(time.time())  # Current time

        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature = WebhookSignatureService.generate_signature(payload, timestamp)

            # Act
            is_valid = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=300
            )

        # Assert
        assert is_valid

    def test_verify_signature_invalid_signature(self):
        """Test verification fails with wrong signature."""
        # Arrange
        payload = {"notification_id": "789"}
        timestamp = int(time.time())
        signature = f"t={timestamp},v1={'a' * 64}"  # Invalid signature

        # Act
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            is_valid = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=300
            )

        # Assert
        assert not is_valid

    def test_verify_signature_expired_timestamp(self):
        """Test verification fails with expired timestamp."""
        # Arrange
        payload = {"notification_id": "789"}
        old_timestamp = int(time.time()) - 600  # 10 minutes ago

        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature = WebhookSignatureService.generate_signature(payload, old_timestamp)

            # Act - only allow 300 seconds (5 minutes)
            is_valid = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=300
            )

        # Assert
        assert not is_valid

    def test_verify_signature_future_timestamp(self):
        """Test verification fails with future timestamp."""
        # Arrange
        payload = {"notification_id": "789"}
        future_timestamp = int(time.time()) + 600  # 10 minutes in future

        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature = WebhookSignatureService.generate_signature(payload, future_timestamp)

            # Act - only allow 300 seconds (5 minutes)
            is_valid = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=300
            )

        # Assert
        assert not is_valid

    def test_verify_signature_invalid_header_format_no_comma(self):
        """Test verification raises error for invalid header format (no comma)."""
        # Arrange
        payload = {"notification_id": "789"}
        invalid_signature = "t=1701504000v1=abc123"  # Missing comma

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            WebhookSignatureService.verify_signature(payload, invalid_signature)

        assert "Invalid signature header format" in str(exc_info.value)

    def test_verify_signature_invalid_header_format_no_t_prefix(self):
        """Test verification raises error for missing t= prefix."""
        # Arrange
        payload = {"notification_id": "789"}
        invalid_signature = "timestamp=1701504000,v1=abc123"

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            WebhookSignatureService.verify_signature(payload, invalid_signature)

        assert "Invalid signature header format" in str(exc_info.value)

    def test_verify_signature_invalid_header_format_no_v1_prefix(self):
        """Test verification raises error for missing v1= prefix."""
        # Arrange
        payload = {"notification_id": "789"}
        invalid_signature = "t=1701504000,signature=abc123"

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            WebhookSignatureService.verify_signature(payload, invalid_signature)

        assert "Invalid signature header format" in str(exc_info.value)

    def test_verify_signature_invalid_timestamp_format(self):
        """Test verification raises error for non-integer timestamp."""
        # Arrange
        payload = {"notification_id": "789"}
        invalid_signature = "t=notanumber,v1=abc123"

        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            WebhookSignatureService.verify_signature(payload, invalid_signature)

        assert "Invalid timestamp" in str(exc_info.value)

    def test_verify_signature_custom_tolerance(self):
        """Test verification with custom tolerance window."""
        # Arrange
        payload = {"notification_id": "789"}
        timestamp = int(time.time()) - 120  # 2 minutes ago

        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key"):
            signature = WebhookSignatureService.generate_signature(payload, timestamp)

            # Act - allow 60 seconds (should fail)
            is_valid_short = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=60
            )

            # Act - allow 180 seconds (should pass)
            is_valid_long = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=180
            )

        # Assert
        assert not is_valid_short
        assert is_valid_long

    def test_verify_signature_different_secret_key(self):
        """Test verification fails with different secret key."""
        # Arrange
        payload = {"notification_id": "789"}
        timestamp = int(time.time())

        # Generate signature with one key
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "secret-key-1"):
            signature = WebhookSignatureService.generate_signature(payload, timestamp)

        # Act - verify with different key
        with patch("django.conf.settings.WEBHOOK_SECRET_KEY", "secret-key-2"):
            is_valid = WebhookSignatureService.verify_signature(
                payload, signature, tolerance_seconds=300
            )

        # Assert
        assert not is_valid

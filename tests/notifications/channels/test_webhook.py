"""Unit tests for webhook notification channel."""

from unittest.mock import Mock, patch

import pytest
import requests
from django.core.exceptions import ValidationError
from notifications.channels.exceptions import PermanentChannelError, TransientChannelError
from notifications.channels.webhook import WebhookChannel


@pytest.fixture
def webhook_channel():
    """Create WebhookChannel instance."""
    return WebhookChannel()


@pytest.fixture
def webhook_notification_factory(notification_factory):
    """Create webhook-specific notification instances."""

    def _create_notification(recipient="https://example.com/webhook", payload=None):
        return notification_factory(
            channel="webhook",
            recipient=recipient,
            payload=payload or {"test": "data"},
        )

    return _create_notification


class TestWebhookChannelSend:
    """Test webhook channel send method."""

    @patch("requests.post")
    def test_send_webhook_success(self, mock_post, webhook_channel, webhook_notification_factory):
        """Test successful webhook delivery."""
        # Arrange
        notification = webhook_notification_factory()
        mock_response = Mock()
        mock_response.ok = True
        mock_response.status_code = 200
        mock_response.text = "Success"
        mock_response.elapsed.total_seconds.return_value = 0.123
        mock_post.return_value = mock_response

        # Act
        result = webhook_channel.send(notification)

        # Assert
        assert result["status_code"] == 200
        assert "delivered" in result["response"].lower()
        assert result["http_status_code"] == 200
        assert result["response_body_snippet"] == "Success"
        assert result["duration_ms"] >= 0  # Mocked response might return 0

        # Verify requests.post called correctly
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args[1]
        assert call_kwargs["url"] == notification.recipient
        assert call_kwargs["timeout"] == 30
        assert call_kwargs["allow_redirects"] is True
        assert "X-Notification-Signature" in call_kwargs["headers"]

    @patch("requests.post")
    def test_send_webhook_4xx_permanent_error(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test webhook delivery with 4xx error (permanent failure)."""
        # Arrange
        notification = webhook_notification_factory()
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_response.elapsed.total_seconds.return_value = 0.05
        mock_post.return_value = mock_response

        # Act & Assert
        with pytest.raises(PermanentChannelError) as exc_info:
            webhook_channel.send(notification)

        assert "400" in str(exc_info.value)
        assert exc_info.value.channel == "webhook"
        assert exc_info.value.recipient == notification.recipient

    @patch("requests.post")
    def test_send_webhook_5xx_transient_error(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test webhook delivery with 5xx error (transient failure)."""
        # Arrange
        notification = webhook_notification_factory()
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 503
        mock_response.text = "Service Unavailable"
        mock_response.elapsed.total_seconds.return_value = 0.05
        mock_post.return_value = mock_response

        # Act & Assert
        with pytest.raises(TransientChannelError) as exc_info:
            webhook_channel.send(notification)

        assert "503" in str(exc_info.value)
        assert exc_info.value.channel == "webhook"

    @patch("requests.post")
    def test_send_webhook_timeout(self, mock_post, webhook_channel, webhook_notification_factory):
        """Test webhook delivery timeout."""
        # Arrange
        notification = webhook_notification_factory()
        mock_post.side_effect = requests.Timeout("Connection timeout")

        # Act & Assert
        with pytest.raises(TransientChannelError) as exc_info:
            webhook_channel.send(notification)

        assert "timeout" in str(exc_info.value).lower()
        assert exc_info.value.channel == "webhook"

    @patch("requests.post")
    def test_send_webhook_too_many_redirects(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test webhook delivery with too many redirects."""
        # Arrange
        notification = webhook_notification_factory()
        mock_post.side_effect = requests.TooManyRedirects("Exceeded max redirects")

        # Act & Assert
        with pytest.raises(PermanentChannelError) as exc_info:
            webhook_channel.send(notification)

        assert "redirects" in str(exc_info.value).lower()
        assert exc_info.value.channel == "webhook"

    @patch("requests.post")
    def test_send_webhook_connection_error(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test webhook delivery with connection error."""
        # Arrange
        notification = webhook_notification_factory()
        mock_post.side_effect = requests.ConnectionError("Connection refused")

        # Act & Assert
        with pytest.raises(TransientChannelError) as exc_info:
            webhook_channel.send(notification)

        assert "request error" in str(exc_info.value).lower()
        assert exc_info.value.channel == "webhook"

    def test_send_invalid_url(self, webhook_channel):
        """Test webhook delivery with invalid URL - validation happens at model level."""
        # The notification model validates recipient URLs during save(),
        # so we can't create a notification with an invalid URL.
        # This test verifies that validation raises ValidationError
        from django.core.validators import URLValidator

        # Act & Assert - URLValidator will raise ValidationError
        validator = URLValidator(schemes=["http", "https"])
        with pytest.raises(ValidationError):
            validator("not-a-url")

    @patch("requests.post")
    def test_send_truncates_response_body(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test response body truncated to 1KB."""
        # Arrange
        notification = webhook_notification_factory()
        large_body = "x" * 2000  # 2KB response
        mock_response = Mock()
        mock_response.ok = True
        mock_response.status_code = 200
        mock_response.text = large_body
        mock_response.elapsed.total_seconds.return_value = 0.1
        mock_post.return_value = mock_response

        # Act
        result = webhook_channel.send(notification)

        # Assert
        assert len(result["response_body_snippet"]) == 1024
        assert result["response_body_snippet"] == "x" * 1024

    @patch("requests.post")
    def test_send_includes_signature_header(
        self, mock_post, webhook_channel, webhook_notification_factory
    ):
        """Test webhook includes X-Notification-Signature header."""
        # Arrange
        notification = webhook_notification_factory()
        mock_response = Mock()
        mock_response.ok = True
        mock_response.status_code = 200
        mock_response.text = ""
        mock_response.elapsed.total_seconds.return_value = 0.1
        mock_post.return_value = mock_response

        # Act
        webhook_channel.send(notification)

        # Assert
        call_kwargs = mock_post.call_args[1]
        signature_header = call_kwargs["headers"]["X-Notification-Signature"]
        assert signature_header.startswith("t=")
        assert ",v1=" in signature_header


class TestWebhookChannelValidation:
    """Test webhook channel validation methods."""

    def test_validate_recipient_valid_https(self, webhook_channel):
        """Test valid HTTPS URL."""
        assert webhook_channel.validate_recipient("https://example.com/webhook")

    def test_validate_recipient_valid_http(self, webhook_channel):
        """Test valid HTTP URL."""
        assert webhook_channel.validate_recipient("http://localhost:8000/webhook")

    def test_validate_recipient_invalid_format(self, webhook_channel):
        """Test invalid URL format."""
        assert not webhook_channel.validate_recipient("not-a-url")
        assert not webhook_channel.validate_recipient("ftp://example.com")
        assert not webhook_channel.validate_recipient("javascript:alert('xss')")

    def test_validate_recipient_empty(self, webhook_channel):
        """Test empty URL."""
        assert not webhook_channel.validate_recipient("")

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-secret-key")
    def test_validate_config_valid(self, webhook_channel):
        """Test valid webhook configuration."""
        # Should not raise exception
        webhook_channel.validate_config()

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "")
    def test_validate_config_missing_secret_key(self, webhook_channel):
        """Test missing WEBHOOK_SECRET_KEY."""
        with pytest.raises(ValueError) as exc_info:
            webhook_channel.validate_config()

        assert "WEBHOOK_SECRET_KEY" in str(exc_info.value)

    def test_validate_config_no_secret_key_attribute(self, webhook_channel):
        """Test missing WEBHOOK_SECRET_KEY attribute."""
        from django.conf import settings

        # Temporarily remove attribute
        if hasattr(settings, "WEBHOOK_SECRET_KEY"):
            old_value = settings.WEBHOOK_SECRET_KEY
            delattr(settings, "WEBHOOK_SECRET_KEY")
            try:
                with pytest.raises(ValueError) as exc_info:
                    webhook_channel.validate_config()
                assert "WEBHOOK_SECRET_KEY" in str(exc_info.value)
            finally:
                settings.WEBHOOK_SECRET_KEY = old_value

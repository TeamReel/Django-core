"""Integration tests for webhook delivery with mock HTTP server."""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

import pytest
from notifications.channels.webhook import WebhookChannel


class MockWebhookHandler(BaseHTTPRequestHandler):
    """Mock HTTP server handler for webhook testing."""

    # Class variables to store request data
    received_requests = []
    response_status = 200
    response_body = "OK"
    response_delay = 0

    def do_POST(self):  # noqa: N802 - Required by http.server
        """Handle POST requests."""
        import time

        # Add delay if configured
        if self.response_delay > 0:
            time.sleep(self.response_delay)

        # Read request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        # Store request data
        self.received_requests.append(
            {
                "path": self.path,
                "headers": dict(self.headers),
                "body": json.loads(body) if body else {},
            }
        )

        # Send response
        self.send_response(self.response_status)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(self.response_body.encode("utf-8"))

    def log_message(self, format, *args):
        """Suppress server logging during tests."""
        pass


@pytest.fixture
def mock_webhook_server():
    """Start mock HTTP server on localhost."""
    # Reset class variables
    MockWebhookHandler.received_requests = []
    MockWebhookHandler.response_status = 200
    MockWebhookHandler.response_body = "OK"
    MockWebhookHandler.response_delay = 0

    server = HTTPServer(("localhost", 0), MockWebhookHandler)  # Random port
    port = server.server_address[1]

    # Start server in background thread
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield f"http://localhost:{port}"

    # Cleanup
    server.shutdown()
    server.server_close()


@pytest.fixture
def webhook_notification_factory(notification_factory):
    """Factory for creating webhook notification instances."""

    def _create_notification(recipient, payload=None):
        return notification_factory(
            channel="webhook",
            recipient=recipient,
            payload=payload or {"message": "test"},
        )

    return _create_notification


class TestWebhookIntegration:
    """Integration tests for webhook delivery."""

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_delivery_end_to_end(self, mock_webhook_server, webhook_notification_factory):
        """Test complete webhook delivery flow."""
        # Arrange
        webhook_url = f"{mock_webhook_server}/webhook"
        notification = webhook_notification_factory(
            recipient=webhook_url,
            payload={"alert": "system", "message": "Test notification"},
        )
        channel = WebhookChannel()

        # Act
        result = channel.send(notification)

        # Assert
        assert result["status_code"] == 200
        assert result["http_status_code"] == 200
        assert result["duration_ms"] > 0

        # Verify request received by mock server
        assert len(MockWebhookHandler.received_requests) == 1
        request = MockWebhookHandler.received_requests[0]
        assert request["path"] == "/webhook"
        assert "X-Notification-Signature" in request["headers"]
        assert request["body"]["notification_id"] == str(notification.id)
        # Type comes from the notification model's type.code field
        assert request["body"]["type"] == notification.type.code
        assert request["body"]["data"]["alert"] == "system"

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_signature_header_format(
        self, mock_webhook_server, webhook_notification_factory
    ):
        """Test signature header has correct format."""
        # Arrange
        webhook_url = f"{mock_webhook_server}/webhook"
        notification = webhook_notification_factory(recipient=webhook_url)
        channel = WebhookChannel()

        # Act
        channel.send(notification)

        # Assert
        request = MockWebhookHandler.received_requests[0]
        signature = request["headers"]["X-Notification-Signature"]
        assert signature.startswith("t=")
        assert ",v1=" in signature

        # Verify signature format
        parts = signature.split(",")
        assert len(parts) == 2
        timestamp = parts[0][2:]
        sig_hash = parts[1][3:]
        assert timestamp.isdigit()
        assert len(sig_hash) == 64  # SHA256 hex

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_4xx_error_handling(self, mock_webhook_server, webhook_notification_factory):
        """Test handling of 4xx client errors."""
        # Arrange
        MockWebhookHandler.response_status = 404
        MockWebhookHandler.response_body = "Not Found"
        webhook_url = f"{mock_webhook_server}/webhook"
        notification = webhook_notification_factory(recipient=webhook_url)
        channel = WebhookChannel()

        # Act & Assert
        from notifications.channels.exceptions import PermanentChannelError

        with pytest.raises(PermanentChannelError) as exc_info:
            channel.send(notification)

        assert "404" in str(exc_info.value)
        assert exc_info.value.channel == "webhook"

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_5xx_error_handling(self, mock_webhook_server, webhook_notification_factory):
        """Test handling of 5xx server errors."""
        # Arrange
        MockWebhookHandler.response_status = 500
        MockWebhookHandler.response_body = "Internal Server Error"
        webhook_url = f"{mock_webhook_server}/webhook"
        notification = webhook_notification_factory(recipient=webhook_url)
        channel = WebhookChannel()

        # Act & Assert
        from notifications.channels.exceptions import TransientChannelError

        with pytest.raises(TransientChannelError) as exc_info:
            channel.send(notification)

        assert "500" in str(exc_info.value)
        assert exc_info.value.channel == "webhook"

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_response_body_truncation(
        self, mock_webhook_server, webhook_notification_factory
    ):
        """Test response body truncated to 1KB."""
        # Arrange
        MockWebhookHandler.response_body = "x" * 2000  # 2KB response
        webhook_url = f"{mock_webhook_server}/webhook"
        notification = webhook_notification_factory(recipient=webhook_url)
        channel = WebhookChannel()

        # Act
        result = channel.send(notification)

        # Assert
        assert len(result["response_body_snippet"]) == 1024
        assert result["response_body_snippet"] == "x" * 1024

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_multiple_notifications(
        self, mock_webhook_server, webhook_notification_factory
    ):
        """Test multiple webhook deliveries to same endpoint."""
        # Arrange
        webhook_url = f"{mock_webhook_server}/webhook"
        notification1 = webhook_notification_factory(
            recipient=webhook_url, payload={"message": "first"}
        )
        notification2 = webhook_notification_factory(
            recipient=webhook_url, payload={"message": "second"}
        )
        channel = WebhookChannel()

        # Act
        result1 = channel.send(notification1)
        result2 = channel.send(notification2)

        # Assert
        assert result1["status_code"] == 200
        assert result2["status_code"] == 200
        assert len(MockWebhookHandler.received_requests) == 2

        # Verify different notifications
        request1 = MockWebhookHandler.received_requests[0]
        request2 = MockWebhookHandler.received_requests[1]
        assert request1["body"]["notification_id"] == str(notification1.id)
        assert request2["body"]["notification_id"] == str(notification2.id)
        assert request1["body"]["data"]["message"] == "first"
        assert request2["body"]["data"]["message"] == "second"

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_json_payload_serialization(
        self, mock_webhook_server, webhook_notification_factory
    ):
        """Test complex JSON payload serialization."""
        # Arrange
        webhook_url = f"{mock_webhook_server}/webhook"
        complex_payload = {
            "user": {"id": 123, "name": "Test User"},
            "items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}],
            "metadata": {"count": 2, "total": 100.50},
        }
        notification = webhook_notification_factory(recipient=webhook_url, payload=complex_payload)
        channel = WebhookChannel()

        # Act
        result = channel.send(notification)

        # Assert
        assert result["status_code"] == 200
        request = MockWebhookHandler.received_requests[0]
        assert request["body"]["data"] == complex_payload

    @patch("django.conf.settings.WEBHOOK_SECRET_KEY", "test-integration-key")
    def test_webhook_connection_to_invalid_host(self, webhook_notification_factory):
        """Test connection error with invalid host."""
        # Arrange
        notification = webhook_notification_factory(
            recipient="http://invalid-host-that-does-not-exist.local/webhook"
        )
        channel = WebhookChannel()

        # Act & Assert
        from notifications.channels.exceptions import TransientChannelError

        with pytest.raises(TransientChannelError) as exc_info:
            channel.send(notification)

        assert "request error" in str(exc_info.value).lower()

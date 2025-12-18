from unittest.mock import MagicMock, patch

from .health import WebSocketHealthCheck


class TestWebSocketHealthCheck:
    @patch("rtc_websockets.health.get_channel_layer")
    @patch("rtc_websockets.health.async_to_sync")
    def test_check_success(self, mock_async_to_sync, mock_get_channel_layer):
        # Setup
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        mock_send = MagicMock()
        mock_async_to_sync.return_value = mock_send

        # Execute
        check = WebSocketHealthCheck()
        result = check.check()

        # Verify
        assert result.status is True
        assert result.name == "websocket"
        mock_get_channel_layer.assert_called_once()
        mock_async_to_sync.assert_called_once_with(mock_channel_layer.send)
        mock_send.assert_called_once_with("health_check", {"type": "ping"})

    @patch("rtc_websockets.health.get_channel_layer")
    def test_check_failure(self, mock_get_channel_layer):
        # Setup
        mock_get_channel_layer.side_effect = Exception("Redis down")

        # Execute
        check = WebSocketHealthCheck()
        result = check.check()

        # Verify
        assert result.status is False
        assert "Redis down" in result.details["error"]

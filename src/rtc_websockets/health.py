import time

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from observability.health import HealthCheckResult


class WebSocketHealthCheck:
    """
    Health check for WebSocket infrastructure (Channel Layer/Redis).
    """

    def check(self) -> HealthCheckResult:
        start_time = time.time()
        try:
            channel_layer = get_channel_layer()
            # Simple check: try to send a message to a test channel
            # This verifies we can talk to the backing store (Redis)
            async_to_sync(channel_layer.send)("health_check", {"type": "ping"})

            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="websocket",
                status=True,
                latency_ms=latency,
                details={"backend": str(channel_layer)},
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="websocket", status=False, latency_ms=latency, details={"error": str(e)}
            )

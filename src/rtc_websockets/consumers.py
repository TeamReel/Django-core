import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class BaseConsumer(AsyncJsonWebsocketConsumer):
    """
    Base WebSocket consumer providing common functionality:
    - Authentication check
    - Error handling
    - JSON encoding/decoding
    """

    async def connect(self):
        """
        Handle new WebSocket connection.
        Validates authentication before accepting.
        """
        try:
            user = self.scope.get("user")
            if not user or not user.is_authenticated:
                logger.warning(
                    f"Rejected unauthenticated connection from {self.scope.get('client')}"
                )
                await self.close(code=4003)  # Forbidden
                return

            await self.accept()
            logger.info(f"Accepted connection for user {user.id}")

        except Exception as e:
            logger.error(f"Error during connection: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle disconnection.
        """
        logger.info(f"Disconnected user {self.scope.get('user', 'unknown')} with code {close_code}")

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming JSON messages.
        """
        pass

    async def send_error(self, code, message):
        """
        Send error message to client.
        """
        await self.send_json({"type": "error", "code": code, "message": message})


class TestConsumer(BaseConsumer):
    """
    Consumer for testing connectivity and auth.
    """

    async def connect(self):
        await super().connect()
        if self.scope.get("user") and self.scope["user"].is_authenticated:
            await self.send_json({"message": "Connected to TestConsumer"})

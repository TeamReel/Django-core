import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone
from organisations.models import Membership

from .models import WebSocketConnection

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


class NotificationConsumer(BaseConsumer):
    """
    Consumer for real-time notifications.
    Handles tenant-scoped broadcasting and connection management.
    """

    async def connect(self):
        await super().connect()

        # If connection was rejected by BaseConsumer, user won't be authenticated or connection closed
        # But BaseConsumer.connect() doesn't return status.
        # We check user auth again to be safe and ensure we only proceed if valid.
        user = self.scope.get("user")
        if user and user.is_authenticated:
            self.user = user
            self.user_groups = []
            self.connection_record = None

            try:
                # Create connection record
                self.connection_record = await self.create_connection_record()

                # Join groups
                await self.join_user_groups()

                logger.info(f"Notification connection established for user {user.id}")
            except Exception as e:
                logger.error(f"Error setting up notification connection: {e}")
                await self.close(code=4000)

    async def disconnect(self, close_code):
        await self.cleanup_connection()
        await super().disconnect(close_code)

    @database_sync_to_async
    def create_connection_record(self):
        return WebSocketConnection.objects.create(
            user=self.user,
            channel_name=self.channel_name,
            last_heartbeat=timezone.now(),
        )

    async def join_user_groups(self):
        """Join relevant channel groups based on user permissions"""
        # User-specific group
        user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(user_group, self.channel_name)
        self.user_groups.append(user_group)

        # Organization groups
        org_groups = await self.get_user_organization_groups()
        for group in org_groups:
            await self.channel_layer.group_add(group, self.channel_name)
            self.user_groups.append(group)

        logger.debug(f"User {self.user.id} joined groups: {self.user_groups}")

    @database_sync_to_async
    def get_user_organization_groups(self):
        """Get organization groups user should join"""
        memberships = Membership.objects.filter(user=self.user, is_active=True).select_related(
            "organisation"
        )

        return [f"org_{membership.organisation.id}" for membership in memberships]

    async def cleanup_connection(self):
        """Remove from groups and delete connection record"""
        logger.info(f"Cleaning up connection for user {self.user.id}")
        if hasattr(self, "user_groups"):
            for group in self.user_groups:
                await self.channel_layer.group_discard(group, self.channel_name)

        await self.delete_connection_record()

    @database_sync_to_async
    def delete_connection_record(self):
        if hasattr(self, "connection_record") and self.connection_record:
            logger.info(f"Deleting connection record {self.connection_record.connection_id}")
            self.connection_record.delete()
        else:
            logger.warning("No connection record to delete")

    async def receive_json(self, content, **kwargs):
        """Handle incoming messages"""
        # Update heartbeat on any activity
        if hasattr(self, "connection_record") and self.connection_record:
            await self.update_heartbeat()

    @database_sync_to_async
    def update_heartbeat(self):
        self.connection_record.last_heartbeat = timezone.now()
        self.connection_record.save(update_fields=["last_heartbeat"])

    async def notification_message(self, event):
        """Handle notification messages from group broadcast"""
        # Send message to client
        await self.send_json(event["message"])

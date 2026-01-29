"""
B31 Content Generation - WebSocket Consumers

WebSocket consumer for real-time content generation status updates.
Integrates with B23 WebSocket infrastructure.
"""

import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class ContentGenerationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for content generation status updates.

    Clients can subscribe to specific ContentItem IDs to receive
    real-time status updates during generation.

    Messages:
        - subscribe: {"action": "subscribe", "contentItemId": 123}
        - unsubscribe: {"action": "unsubscribe", "contentItemId": 123}

    Broadcasts:
        - content_status_update: {"id": 123, "status": "generating", "progress_percent": 50}
    """

    async def connect(self):
        """Accept WebSocket connection"""
        await self.accept()
        logger.debug(f"ContentGenerationConsumer connected: {self.channel_name}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Unsubscribe from all content item groups
        # Channel layer automatically cleans up group memberships
        logger.debug(
            f"ContentGenerationConsumer disconnected: {self.channel_name} (code: {close_code})"
        )

    async def receive_json(self, content):
        """
        Handle incoming JSON messages from WebSocket client.

        Supported actions:
            - subscribe: Subscribe to ContentItem status updates
            - unsubscribe: Unsubscribe from ContentItem status updates
        """
        action = content.get("action")

        if action == "subscribe":
            content_item_id = content.get("contentItemId")
            if content_item_id:
                group_name = f"content_item_{content_item_id}"
                await self.channel_layer.group_add(group_name, self.channel_name)
                logger.debug(f"Subscribed {self.channel_name} to {group_name}")
                await self.send_json(
                    {
                        "action": "subscribed",
                        "contentItemId": content_item_id,
                        "message": f"Subscribed to updates for ContentItem {content_item_id}",
                    }
                )
            else:
                await self.send_json(
                    {"action": "error", "message": "contentItemId is required for subscribe"}
                )

        elif action == "unsubscribe":
            content_item_id = content.get("contentItemId")
            if content_item_id:
                group_name = f"content_item_{content_item_id}"
                await self.channel_layer.group_discard(group_name, self.channel_name)
                logger.debug(f"Unsubscribed {self.channel_name} from {group_name}")
                await self.send_json(
                    {
                        "action": "unsubscribed",
                        "contentItemId": content_item_id,
                        "message": f"Unsubscribed from updates for ContentItem {content_item_id}",
                    }
                )
            else:
                await self.send_json(
                    {"action": "error", "message": "contentItemId is required for unsubscribe"}
                )

        else:
            await self.send_json(
                {
                    "action": "error",
                    "message": f"Unknown action: {action}. Use 'subscribe' or 'unsubscribe'.",
                }
            )

    async def content_status_update(self, event):
        """
        Send content status update to WebSocket client.

        Called by Celery task via channel layer group_send.

        Args:
            event: dict with keys: content_item_id, status, progress_percent, error
        """
        await self.send_json(
            {
                "action": "content_status_update",
                "id": event["content_item_id"],
                "status": event["status"],
                "progress_percent": event.get("progress_percent"),
                "error": event.get("error"),
            }
        )
        logger.debug(
            f"Sent status update for ContentItem {event['content_item_id']}: {event['status']}"
        )

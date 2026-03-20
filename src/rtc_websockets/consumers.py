import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from django.utils import timezone
from organisations.models import Membership
from projects.models import Project

from .metrics import (
    dec_websocket_connections,
    inc_websocket_connections,
    inc_websocket_messages_received,
    inc_websocket_rate_limit_violations,
)
from .models import PresenceStatus, WebSocketConnection
from .ratelimit import AsyncRateLimiter

logger = logging.getLogger(__name__)


class BaseConsumer(AsyncJsonWebsocketConsumer):
    """
    Base WebSocket consumer providing common functionality:
    - Authentication check
    - Error handling
    - JSON encoding/decoding
    - Rate limiting
    """

    consumer_type = "base"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        limit = getattr(settings, "WEBSOCKET_RATELIMIT_LIMIT", 60)
        window = getattr(settings, "WEBSOCKET_RATELIMIT_WINDOW", 60)
        self.rate_limiter = AsyncRateLimiter(limit=limit, window=window)

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
            inc_websocket_connections(self.consumer_type)
            logger.info(f"Accepted connection for user {user.id}")

        except Exception as e:
            logger.error(f"Error during connection: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle disconnection.
        """
        dec_websocket_connections(self.consumer_type)
        logger.info(f"Disconnected user {self.scope.get('user', 'unknown')} with code {close_code}")

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming JSON messages with rate limiting.
        """
        # Rate limiting check
        user_key = (
            str(self.scope["user"].id)
            if self.scope.get("user") and self.scope["user"].is_authenticated
            else self.channel_name
        )
        is_allowed, remaining = await self.rate_limiter.check_limit(user_key)

        if not is_allowed:
            inc_websocket_rate_limit_violations(self.consumer_type)
            await self.send_json(
                {"type": "error", "code": 4029, "message": "Rate limit exceeded. Please slow down."}
            )
            return

        inc_websocket_messages_received(self.consumer_type)
        await self.handle_json(content, **kwargs)

    async def handle_json(self, content, **kwargs):
        """
        Hook for subclasses to handle JSON messages.
        """
        if content.get("type") == "ping":
            await self.send_json({"type": "pong", "message": "pong"})

    async def send_error(self, code, message):
        """
        Send error message to client.
        """
        await self.send_json({"type": "error", "code": code, "message": message})


class TestConsumer(BaseConsumer):
    """
    Consumer for testing connectivity and auth.
    """

    consumer_type = "test"

    async def connect(self):
        await super().connect()
        if self.scope.get("user") and self.scope["user"].is_authenticated:
            await self.send_json({"message": "Connected to TestConsumer"})


class NotificationConsumer(BaseConsumer):
    """
    Consumer for real-time notifications.
    Handles tenant-scoped broadcasting and connection management.
    """

    consumer_type = "notification"

    async def connect(self):
        await super().connect()

        # If connection was rejected by BaseConsumer, user won't be authenticated
        # or connection closed. But BaseConsumer.connect() doesn't return status.
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
                if self.connection_record:
                    await self.delete_connection_record()
                await self.close(code=4000)

    async def disconnect(self, close_code):
        logger.info(f"NotificationConsumer.disconnect called with code {close_code}")
        try:
            await self.cleanup_connection()
        except Exception as e:
            logger.error(f"Error during disconnect cleanup: {e}")
        finally:
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

        # System admin group
        if self.user.is_superuser or self.user.is_staff:
            admin_group = "system_admins"
            await self.channel_layer.group_add(admin_group, self.channel_name)
            self.user_groups.append(admin_group)

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
        if hasattr(self, "user"):
            logger.info(f"Cleaning up connection for user {self.user.id}")

        if hasattr(self, "user_groups"):
            for group in self.user_groups:
                try:
                    await self.channel_layer.group_discard(group, self.channel_name)
                except Exception as e:
                    logger.error(f"Error discarding group {group}: {e}")

        await self.delete_connection_record()

    @database_sync_to_async
    def delete_connection_record(self):
        if hasattr(self, "connection_record") and self.connection_record:
            logger.info(f"Deleting connection record {self.connection_record.connection_id}")
            self.connection_record.delete()
        else:
            logger.warning("No connection record to delete")

    async def handle_json(self, content, **kwargs):
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


class PresenceConsumer(BaseConsumer):
    """
    Consumer for real-time presence tracking.
    Handles heartbeats, status updates, and location tracking.
    """

    async def connect(self):
        """
        Handle new WebSocket connection.
        Validates authentication before accepting.
        """
        try:
            user = self.scope.get("user")
            if user and user.is_authenticated:
                self.user = user
                self.org_id = self.scope["url_route"]["kwargs"].get("org_id")

                # Validate membership
                if not await self.check_membership(self.org_id):
                    logger.warning(f"User {user.id} is not a member of org {self.org_id}")
                    await self.close(code=4003)
                    return

                self.connection_record = None

                self.connection_record = await self.create_connection_record()
                await self.set_status("online")
                logger.info(
                    f"Presence connection established for user {user.id} in org {self.org_id}"
                )

                await super().connect()
            else:
                await self.close(code=4001)
        except Exception as e:
            logger.error(f"Error setting up presence connection: {e}")
            if self.connection_record:
                await self.delete_connection_record()
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "user") and self.user.is_authenticated:
                await self.set_status("offline")
                await self.delete_connection_record()
        except Exception as e:
            logger.error(f"Error during presence disconnect: {e}")
        finally:
            await super().disconnect(close_code)

    async def handle_json(self, content, **kwargs):
        """
        Handle incoming presence messages.
        Expected types: 'heartbeat', 'status_update', 'location_update'
        """
        msg_type = content.get("type")

        if hasattr(self, "connection_record") and self.connection_record:
            await self.update_heartbeat()

        if msg_type == "heartbeat":
            # Heartbeat already updated above
            pass
        elif msg_type == "status_update":
            status = content.get("status")
            if status in ["online", "away", "offline"]:
                await self.set_status(status)
        elif msg_type == "location_update":
            location = content.get("location")
            await self.update_location(location)

    @database_sync_to_async
    def check_membership(self, org_id):
        return Membership.objects.filter(
            user=self.user, organisation_id=org_id, is_active=True
        ).exists()

    @database_sync_to_async
    def create_connection_record(self):
        return WebSocketConnection.objects.create(
            user=self.user,
            channel_name=self.channel_name,
            last_heartbeat=timezone.now(),
        )

    @database_sync_to_async
    def delete_connection_record(self):
        if hasattr(self, "connection_record") and self.connection_record:
            self.connection_record.delete()

    @database_sync_to_async
    def update_heartbeat(self):
        self.connection_record.last_heartbeat = timezone.now()
        self.connection_record.save(update_fields=["last_heartbeat"])

        # Also update PresenceStatus last_seen
        PresenceStatus.objects.update_or_create(
            user=self.user,
            organization_id=self.org_id,
            defaults={"last_seen": timezone.now()},
        )

    @database_sync_to_async
    def set_status(self, status):
        PresenceStatus.objects.update_or_create(
            user=self.user,
            organization_id=self.org_id,
            defaults={
                "status": status,
                "last_seen": timezone.now(),
            },
        )

    @database_sync_to_async
    def update_location(self, location):
        PresenceStatus.objects.update_or_create(
            user=self.user,
            organization_id=self.org_id,
            defaults={
                "current_location": location,
                "last_seen": timezone.now(),
            },
        )


class ActivityConsumer(BaseConsumer):
    """
    Consumer for project activity feeds.
    """

    consumer_type = "activity"

    async def connect(self):
        try:
            user = self.scope.get("user")
            if not user or not user.is_authenticated:
                logger.warning(
                    f"Rejected unauthenticated connection from {self.scope.get('client')}"
                )
                await self.close(code=4003)
                return

            self.user = user
            self.project_id = self.scope["url_route"]["kwargs"].get("project_id")

            if await self.check_project_access(self.project_id):
                await self.accept()
                inc_websocket_connections(self.consumer_type)
                self.group_name = f"activity_project_{self.project_id}"
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                logger.info(f"User {user.id} joined activity feed for project {self.project_id}")
            else:
                logger.warning(f"User {user.id} denied access to project {self.project_id}")
                await self.close(code=4003)

        except Exception as e:
            logger.error(f"Error during connection: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await super().disconnect(close_code)

    async def activity_event(self, event):
        """
        Handle activity event broadcast.
        """
        await self.send_json(event["data"])

    @database_sync_to_async
    def check_project_access(self, project_id):
        try:
            project = Project.objects.get(id=project_id)
            return Membership.objects.filter(
                user=self.user, organisation=project.organisation, is_active=True
            ).exists()
        except Project.DoesNotExist:
            return False


class ContentUpdateConsumer(BaseConsumer):
    """
    B64 — Consumer for real-time content & project updates.

    Clients connect once and dynamically subscribe/unsubscribe to channels:
    - ``content:{content_item_id}`` — status updates for a single content item
    - ``project:{project_id}`` — all events for a project

    Protocol (client → server)::

        {"action": "subscribe",   "channel": "project:123"}
        {"action": "unsubscribe", "channel": "project:123"}
        {"type": "ping"}

    Protocol (server → client)::

        {"type": "subscribed",   "channel": "project:123"}
        {"type": "unsubscribed", "channel": "project:123"}
        {"type": "error", ...}
        {event envelope from RealtimeEventPublisher}
    """

    consumer_type = "content_update"
    MAX_SUBSCRIPTIONS = 20

    async def connect(self):
        await super().connect()
        # BaseConsumer.connect() closes with 4003 if unauthenticated,
        # but the close is async — guard against proceeding on a rejected connection.
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return
        self.user = user
        self.subscribed_groups: list[str] = []
        self.connection_record = await self._create_connection_record()
        logger.info(f"ContentUpdateConsumer connected for user {user.id}")

    async def disconnect(self, close_code):
        # Leave all subscribed groups
        for group in getattr(self, "subscribed_groups", []):
            try:
                await self.channel_layer.group_discard(group, self.channel_name)
            except Exception as e:
                logger.error(f"Error leaving group {group}: {e}")
        # Clean up connection record
        await self._delete_connection_record()
        await super().disconnect(close_code)

    async def handle_json(self, content, **kwargs):
        """Route incoming messages by action type."""
        action = content.get("action")
        channel = content.get("channel", "")

        if action == "subscribe":
            await self._handle_subscribe(channel)
        elif action == "unsubscribe":
            await self._handle_unsubscribe(channel)
        elif content.get("type") == "ping":
            await self.send_json({"type": "pong"})
        else:
            await self.send_error(4001, "Unknown action")

    # ── Subscribe / Unsubscribe ─────────────────────────────────────

    async def _handle_subscribe(self, channel: str) -> None:
        """Subscribe to a content or project channel after permission check."""
        if not channel or ":" not in channel:
            await self.send_error(
                4002, "Invalid channel format. Use 'content:{id}' or 'project:{id}'"
            )
            return

        if len(self.subscribed_groups) >= self.MAX_SUBSCRIPTIONS:
            from .metrics import inc_websocket_rate_limit_violations

            inc_websocket_rate_limit_violations(self.consumer_type)
            await self.send_error(
                4003, f"Max {self.MAX_SUBSCRIPTIONS} subscriptions per connection"
            )
            return

        channel_type, _, channel_id = channel.partition(":")
        if not channel_id:
            await self.send_error(4002, "Missing channel ID")
            return

        # Permission check
        has_access = False
        if channel_type == "project":
            has_access = await self._check_project_access(channel_id)
        elif channel_type == "content":
            has_access = await self._check_content_access(channel_id)
        else:
            await self.send_error(4002, "Unsupported channel type. Use 'content' or 'project'")
            return

        if not has_access:
            await self.send_error(4003, "Access denied")
            return

        group_name = f"{channel_type}_{channel_id}"

        if group_name in self.subscribed_groups:
            await self.send_json({"type": "subscribed", "channel": channel})
            return

        await self.channel_layer.group_add(group_name, self.channel_name)
        self.subscribed_groups.append(group_name)
        from .metrics import inc_subscriptions

        inc_subscriptions(self.consumer_type)
        await self.send_json({"type": "subscribed", "channel": channel})
        logger.info(
            "User %s subscribed to %s (total: %d)",
            self.user.id,
            group_name,
            len(self.subscribed_groups),
            extra={"user_id": self.user.id, "group": group_name},
        )

    async def _handle_unsubscribe(self, channel: str) -> None:
        """Unsubscribe from a channel."""
        if not channel or ":" not in channel:
            await self.send_error(4002, "Invalid channel format")
            return

        channel_type, _, channel_id = channel.partition(":")
        group_name = f"{channel_type}_{channel_id}"

        if group_name in self.subscribed_groups:
            await self.channel_layer.group_discard(group_name, self.channel_name)
            self.subscribed_groups.remove(group_name)
            from .metrics import dec_subscriptions

            dec_subscriptions(self.consumer_type)

        await self.send_json({"type": "unsubscribed", "channel": channel})
        logger.info(
            "User %s unsubscribed from %s (total: %d)",
            self.user.id,
            group_name,
            len(self.subscribed_groups),
            extra={"user_id": self.user.id, "group": group_name},
        )

    # ── Permission checks ───────────────────────────────────────────

    @database_sync_to_async
    def _check_project_access(self, project_id: str) -> bool:
        """Check user has membership in the project's organisation."""
        try:
            project = Project.objects.get(id=project_id)
            return Membership.objects.filter(
                user=self.user, organisation=project.organisation, is_active=True
            ).exists()
        except (Project.DoesNotExist, ValueError):
            return False

    @database_sync_to_async
    def _check_content_access(self, content_item_id: str) -> bool:
        """Check user has membership in the content item's organisation."""
        try:
            from content_generation.models import ContentItem

            item = ContentItem.objects.select_related("project__organisation").get(
                id=content_item_id
            )
            if not item.project:
                return False
            return Membership.objects.filter(
                user=self.user, organisation=item.project.organisation, is_active=True
            ).exists()
        except (ContentItem.DoesNotExist, ValueError):
            return False

    # ── Channel layer event handlers ────────────────────────────────

    async def notification_message(self, event):
        """Handle events sent via NotificationService / RealtimeEventPublisher."""
        await self.send_json(event["message"])

    async def content_status_update(self, event):
        """Handle legacy content_status_update events from broadcast_content_status()."""
        await self.send_json(
            {
                "event_type": "content.status_changed",
                "data": {
                    "content_item_id": event.get("content_item_id"),
                    "status": event.get("status"),
                    "progress_percent": event.get("progress_percent"),
                    "error_message": event.get("error"),
                },
            }
        )

    # ── Connection record management ────────────────────────────────

    @database_sync_to_async
    def _create_connection_record(self):
        return WebSocketConnection.objects.create(
            user=self.user,
            channel_name=self.channel_name,
            last_heartbeat=timezone.now(),
        )

    @database_sync_to_async
    def _delete_connection_record(self):
        if hasattr(self, "connection_record") and self.connection_record:
            self.connection_record.delete()

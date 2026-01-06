# Real-time WebSockets (B23)

**Status**: ✅ Complete
**Location**: `src/rtc_websockets/`

## Purpose

The Real-time WebSockets module provides bidirectional communication infrastructure for live updates, notifications, and collaborative features using Django Channels and WebSocket protocol.

## Scope

**✅ Included**:
- WebSocket connection management with authentication
- Redis-backed channel layers for broadcast
- User, organisation, and project channel subscriptions
- Rate limiting per connection
- Presence tracking (online/offline status)
- Connection metrics and health checks
- Auto-reconnection support
- Integration with B16/B17 Notifications

**❌ Excluded** (Product-Agnostic Constraint):
- Video/audio streaming (RTC in the traditional sense)
- Heavy gaming optimizations (not for sub-100ms latency)
- Complex state synchronization (use simple broadcast patterns)
- Chat/messaging logic (downstream responsibility)

## Key Components

### Models
- **`WebSocketConnection`**: Tracks active connections with user, channel name, and connection timestamp
- **`PresenceStatus`**: User online/offline status with last seen timestamp

### APIs/Views
- **`WS /ws/updates/`**: Main WebSocket endpoint for real-time updates (requires authentication)
- **`GET /api/rtc/health/`**: Health check endpoint for WebSocket infrastructure
- **`GET /api/rtc/metrics/`**: Prometheus metrics for connections and messages

### Services/Managers
- **`BaseConsumer`**: Base WebSocket consumer with authentication, rate limiting, and error handling
- **`UpdatesConsumer`**: Main consumer handling user/org/project channel subscriptions
- **`PresenceConsumer`**: Handles presence tracking (online/offline events)
- **`broadcast_to_user()`**: Helper to send message to specific user
- **`broadcast_to_organisation()`**: Helper to send message to all org members
- **`broadcast_to_project()`**: Helper to send message to project members

### Utilities
- **`ratelimit.py`**: AsyncRateLimiter for per-connection message throttling
- **`metrics.py`**: Prometheus metrics (connections, messages, rate limit violations)
- **`middleware.py`**: ASGI middleware for WebSocket authentication
- **`routing.py`**: WebSocket URL routing configuration

## Public Interface

**Safe to Import** (Stable API):
```python
from rtc_websockets.consumers import BaseConsumer
from rtc_websockets.services import (
    broadcast_to_user,
    broadcast_to_organisation,
    broadcast_to_project,
)
from rtc_websockets.models import PresenceStatus
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from rtc_websockets.ratelimit import AsyncRateLimiter
from rtc_websockets.metrics import inc_websocket_connections
```

## Integration Example

**Minimal Working Example**:

**Backend - Broadcasting Events**:
```python
from rtc_websockets.services import broadcast_to_user, broadcast_to_organisation

# Send notification to specific user
await broadcast_to_user(
    user_id=user.id,
    message_type="notification.new",
    data={
        "id": notification.id,
        "title": "New message",
        "body": "You have a new message from Alice",
        "url": "/messages/123"
    }
)

# Broadcast to all organisation members
await broadcast_to_organisation(
    organisation_id=org.id,
    message_type="project.created",
    data={
        "project_id": project.id,
        "project_name": project.name,
        "created_by": user.email
    }
)

# In a Django view (sync context)
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()
async_to_sync(channel_layer.group_send)(
    f"user.{user.id}",
    {
        "type": "notification.new",
        "data": {"title": "Hello", "body": "World"}
    }
)
```

**Frontend - Connecting to WebSocket**:
```javascript
// Connect with authentication
const wsUrl = `wss://api.example.com/ws/updates/`;
const accessToken = localStorage.getItem('access_token');

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
    console.log('WebSocket connected');

    // Send authentication (if using query param auth)
    ws.send(JSON.stringify({
        type: 'auth',
        token: accessToken
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'notification.new':
            showNotification(message.data);
            break;
        case 'project.updated':
            updateProjectInUI(message.data);
            break;
        case 'presence.status':
            updateUserPresence(message.data);
            break;
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code);

    // Auto-reconnect after 5 seconds
    setTimeout(() => {
        connectWebSocket();
    }, 5000);
};

// Send message to server
ws.send(JSON.stringify({
    type: 'ping'
}));
```

**Custom Consumer**:
```python
# your_product/consumers.py
from rtc_websockets.consumers import BaseConsumer

class ChatConsumer(BaseConsumer):
    """Custom consumer for chat functionality"""

    consumer_type = "chat"

    async def connect(self):
        await super().connect()

        # Join chat room
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        await self.channel_layer.group_add(
            f"chat.{self.room_id}",
            self.channel_name
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            f"chat.{self.room_id}",
            self.channel_name
        )
        await super().disconnect(close_code)

    async def handle_json(self, content):
        if content['type'] == 'chat.message':
            # Broadcast to room
            await self.channel_layer.group_send(
                f"chat.{self.room_id}",
                {
                    'type': 'chat_message',
                    'message': content['message'],
                    'user': self.scope['user'].email
                }
            )

    async def chat_message(self, event):
        # Send to WebSocket
        await self.send_json({
            'type': 'chat.message',
            'message': event['message'],
            'user': event['user']
        })
```

## Related Modules

**Dependencies** (This module requires):
- [B05 Accounts] - User authentication
- [B06 Organisations] - Organisation channel scoping
- [B07 Projects] - Project channel scoping
- Django Channels - WebSocket protocol support
- Redis - Channel layer backend
- ASGI Server (Daphne/Uvicorn) - WebSocket handling

**Used By** (Modules that depend on this):
- [B16 Notifications] - Real-time notification delivery
- [B17 Contextual Notifications] - Activity feed updates
- [B18 Observability] - Live metrics dashboard
- Product features requiring real-time updates

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Message Types**:
   ```python
   # your_product/consumers.py
   from rtc_websockets.consumers import UpdatesConsumer

   class ExtendedUpdatesConsumer(UpdatesConsumer):
       async def handle_json(self, content):
           if content['type'] == 'custom.action':
               # Handle custom message type
               await self.handle_custom_action(content)
           else:
               await super().handle_json(content)

       async def handle_custom_action(self, content):
           # Custom logic
           pass
   ```

2. **Presence Tracking**:
   ```python
   # your_product/presence.py
   from rtc_websockets.models import PresenceStatus

   async def get_online_users(organisation_id):
       return PresenceStatus.objects.filter(
           user__organisation_memberships__organisation_id=organisation_id,
           is_online=True
       ).select_related('user')
   ```

3. **Custom Broadcast Helpers**:
   ```python
   # your_product/websockets.py
   from channels.layers import get_channel_layer

   async def broadcast_to_team(team_id, message_type, data):
       channel_layer = get_channel_layer()
       await channel_layer.group_send(
           f"team.{team_id}",
           {
               "type": message_type.replace(".", "_"),
               "data": data
           }
       )
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    ...
    'channels',
    'rtc_websockets',
]

# Channel Layers (Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("REDIS_URL", "redis://localhost:6379/0")],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

# ASGI Application
ASGI_APPLICATION = "config.asgi.application"
```

**ASGI Configuration** (`config/asgi.py`):
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from rtc_websockets.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

**Environment Variables**:
```bash
REDIS_URL=redis://localhost:6379/0  # Required for channel layer
WEBSOCKET_RATELIMIT_LIMIT=60  # Messages per window (default: 60)
WEBSOCKET_RATELIMIT_WINDOW=60  # Seconds (default: 60)
```

**Optional Settings**:
```python
# settings.py (optional)
WEBSOCKET_RATELIMIT_LIMIT = 60  # Messages per user per minute
WEBSOCKET_RATELIMIT_WINDOW = 60  # Window in seconds
WEBSOCKET_PING_INTERVAL = 30  # Keepalive ping interval
WEBSOCKET_TIMEOUT = 300  # Connection timeout (5 minutes)
```

## Testing

**Run Module Tests**:
```bash
pytest tests/rtc_websockets/ -v
```

**Key Test Coverage**:
- ✅ WebSocket connection establishment
- ✅ Authentication enforcement
- ✅ Message rate limiting
- ✅ Broadcasting to channels (user/org/project)
- ✅ Presence tracking (online/offline)
- ✅ Auto-reconnection behavior
- ✅ Metrics collection
- ✅ Error handling and close codes

**Example Test**:
```python
import pytest
from channels.testing import WebsocketCommunicator
from config.asgi import application

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_connection(user):
    communicator = WebsocketCommunicator(
        application,
        "/ws/updates/",
        headers=[(b"cookie", f"sessionid={user.session_key}".encode())]
    )

    connected, _ = await communicator.connect()
    assert connected

    # Send ping
    await communicator.send_json_to({"type": "ping"})

    # Receive pong
    response = await communicator.receive_json_from()
    assert response["type"] == "pong"

    await communicator.disconnect()
```

## References

- **Spec**: [documents/02-roadmap/modules/done/035-B23-real-time-infrastructure.md](../../documents/02-roadmap/modules/done/035-B23-real-time-infrastructure.md)
- **Module Doc**: [documents/04-modules/backend/B23-real-time-websockets.md](../../documents/04-modules/backend/B23-real-time-websockets.md)
- **API Docs**: WebSocket protocol documentation at `/api/docs/#websockets`
- **Django Channels**: https://channels.readthedocs.io/
- **Redis Channels**: https://github.com/django/channels_redis

## Troubleshooting

**Common Issues**:

1. **Issue**: WebSocket connection fails with 403 Forbidden
   - **Cause**: User not authenticated or session expired
   - **Solution**: Ensure JWT token or session cookie is included in WebSocket request headers

2. **Issue**: Messages not received by clients
   - **Cause**: Redis channel layer not configured or Redis down
   - **Solution**: Verify `REDIS_URL` is correct and Redis is running: `redis-cli ping`

3. **Issue**: Rate limit exceeded (4029 close code)
   - **Cause**: Client sending too many messages (default: 60/minute)
   - **Solution**: Reduce message frequency or increase `WEBSOCKET_RATELIMIT_LIMIT`

4. **Issue**: WebSocket closes immediately after connection
   - **Cause**: ASGI server not configured or wrong protocol
   - **Solution**: Ensure using ASGI server (Daphne/Uvicorn), not WSGI: `daphne config.asgi:application`

5. **Issue**: High memory usage with many connections
   - **Cause**: Channel layer capacity too high or connections not cleaning up
   - **Solution**: Reduce `capacity` in `CHANNEL_LAYERS` config, implement connection timeout

## Migration Notes

**Breaking Changes**:
- **v1.1.0**: Changed presence tracking from simple boolean to timestamp-based model
- **v1.0.0**: Initial release with user/org/project channels

**Deprecations**:
- `simple_broadcast()` (deprecated v1.1): Use `broadcast_to_user()` for better typing

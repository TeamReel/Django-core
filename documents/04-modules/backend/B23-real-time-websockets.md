# B23: Real-time Infrastructure (WebSockets)

## 1. Overview
*   **Module ID:** B23
*   **Phase:** 9 (Backend Infrastructure)
*   **Status:** ✅ Complete
*   **Source Code:** `src/rtc_websockets/`

Real-time bidirectional communication infrastructure using Django Channels and WebSockets. Enables live updates, notifications, and collaborative features.

## 2. Purpose & Scope

**What it does:**
- WebSocket connection management
- Real-time broadcast patterns
- Channel layers (Redis-backed)
- Subscription management
- Live update delivery

**What it does NOT do:**
- Video/audio streaming (not RTC in that sense)
- Heavy real-time gaming (optimized for typical web app updates)
- Complex state synchronization (uses simple broadcast patterns)

## 3. Key Features

### WebSocket Connections
- Persistent bidirectional connections
- Auto-reconnection support
- Authentication via Django session/token
- Connection lifecycle management

### Broadcasting
- User-specific channels (`user.<user_id>`)
- Organization channels (`org.<org_id>`)
- Project channels (`project.<project_id>`)
- Global broadcast channel

### Integration with Notifications (B16/B17)
- Real-time notification delivery
- Activity feed updates
- Status changes broadcast

## 4. API Endpoints

WebSocket connection endpoint:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `WS` | `/ws/updates/` | WebSocket connection for real-time updates. |

## 5. Integrations & Dependencies
*   **Notifications (B16/B17)**: Real-time delivery
*   **Redis**: Channel layer backend
*   **Django Channels**: WebSocket protocol support

## 6. Status & Phase History
*   **Phase:** 9 (Backend Infrastructure)
*   **Status:** ✅ Complete
*   **Source Code:** `src/rtc_websockets/`

## 7. Technical Architecture

**Stack:**
- Django Channels 4.x
- Redis (channel layer)
- ASGI (async server interface)
- WebSocket protocol

**Consumers:**
- `UpdatesConsumer`: Main WebSocket consumer
- Handles connect/disconnect/receive

**Broadcasting:**
```python
# Broadcast to user
channel_layer.group_send(
    f"user.{user_id}",
    {"type": "notification.new", "data": {...}}
)
```

## 8. Configuration

**Settings:**
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("REDIS_URL", "redis://localhost:6379/0")],
        },
    },
}
```

**ASGI Application:**
Configured in `config/asgi.py` to handle both HTTP and WebSocket protocols.

## 9. Testing

**Test Coverage:**
- Connection establishment
- Authentication
- Broadcasting to channels
- Reconnection handling
- Message delivery

## 10. Future Enhancements
- Presence tracking (online/offline status)
- Typing indicators
- Collaborative editing support (if needed)
- Message queuing for offline users

---

**Related Modules:**
- [B16 Notifications](B16-notifications.md)
- [B17 Contextual Notifications](B17-contextual-notifications.md)
- [B18 Observability](B18-observability.md)

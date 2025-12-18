# Quickstart: Real-time WebSocket Infrastructure

## Overview
This guide helps you quickly set up and test the B23 WebSocket infrastructure for real-time notifications, presence tracking, and activity feeds.

## Prerequisites
- Django 5.1+ with existing django-core setup
- Redis server (Docker recommended)
- Existing B05 (authentication), B06 (organizations), B08 (permissions) modules

## Quick Setup (Development)

### 1. Install Dependencies
```bash
# From django-core project root
pip install channels[daphne]>=4.0.0
pip install channels-redis>=4.1.0
pip install PyJWT>=2.8.0
```

### 2. Start Redis (Docker)
```bash
docker run -d --name redis-websockets -p 6379:6379 redis:7-alpine
```

### 3. Configure Django Settings
Add to `src/core/settings/base.py`:
```python
# WebSocket Configuration
INSTALLED_APPS += ['channels']

ASGI_APPLICATION = 'core.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}

# JWT Configuration (for fallback auth)
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24
```

### 4. Update ASGI Configuration
Update `src/core/asgi.py`:
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from realtime import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.local')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
```

### 5. Run Migrations
```bash
cd src
python manage.py makemigrations realtime
python manage.py migrate
```

### 6. Start Development Server
```bash
# Terminal 1: Django/WebSocket Server
cd src
python manage.py runserver 0.0.0.0:8000

# Terminal 2: Frontend (if using Vite demo)
cd examples/demo-shell
npm run dev
```

## Test WebSocket Connection

### 1. Basic Connection Test
```javascript
// Open browser console on localhost:8000
const ws = new WebSocket('ws://localhost:8000/ws/notifications/');

ws.onopen = function(event) {
    console.log('WebSocket connected');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

ws.onclose = function(event) {
    console.log('WebSocket closed:', event.code);
};
```

### 2. Authentication Test
```javascript
// After connection, send JWT if session auth fails
ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token-here'
}));
```

### 3. Send Test Message
```javascript
// Trigger a test notification
fetch('/api/demo/send-notification/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
        message: 'Test notification via WebSocket'
    })
});
```

## Demo Integration

### Access Demo Pages
- **Real-time Activity**: `http://localhost:3000/demo/realtime`
- **Connection Status**: Visual indicator shows WebSocket health
- **Test Controls**: Buttons to trigger notifications and test reconnection

### Demo Features
1. **Live Notifications**: Toast messages appear instantly without page refresh
2. **Online Users Count**: Real-time counter of connected users
3. **Activity Feed**: Stream of recent activities with timestamps
4. **Connection Testing**: Simulate network interruptions and recovery

## Common Development Tasks

### Trigger Notification Programmatically
```python
# In Django shell or view
from realtime.services import NotificationService

NotificationService.send_notification(
    user_id=123,
    title="Test Notification",
    message="This is a test message",
    organization_id=456
)
```

### Update User Presence
```python
from realtime.services import PresenceService

PresenceService.update_presence(
    user_id=123,
    status='online',
    organization_id=456,
    location='/projects/789'
)
```

### Log Activity Event
```python
from realtime.services import ActivityService

ActivityService.log_activity(
    actor_user_id=123,
    action_type='file_upload',
    resource_type='file',
    resource_id=456,
    organization_id=789,
    project_id=101
)
```

## Container Deployment (Production)

### Docker Compose Setup
```yaml
# docker-compose.websockets.yml
version: '3.8'

services:
  redis-websockets:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  django-websockets:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - redis-websockets
    environment:
      - REDIS_URL=redis://redis-websockets:6379
    command: daphne -p 8000 -b 0.0.0.0 core.asgi:application

volumes:
  redis_data:
```

### Start Production Stack
```bash
docker-compose -f docker-compose.websockets.yml up -d
```

## Monitoring & Health Checks

### WebSocket Health Endpoint
```bash
curl http://localhost:8000/health/websocket/
```

### Prometheus Metrics
Available at `http://localhost:8000/metrics`:
- `websocket_connections_active` - Current active connections
- `websocket_messages_sent_total` - Total messages sent
- `websocket_errors_total` - Connection and message errors

### Connection Debugging
```python
# Django shell - check active connections
from realtime.models import WebSocketConnection
active_connections = WebSocketConnection.objects.filter(
    authenticated_at__isnull=False
)
print(f"Active connections: {active_connections.count()}")
```

## Troubleshooting

### Connection Issues
1. **Redis not running**: Ensure Redis is started and accessible
2. **ASGI not configured**: Check `asgi.py` includes WebSocket routing
3. **CORS issues**: Configure `ALLOWED_HOSTS` for WebSocket connections

### Authentication Problems
1. **Session expired**: Connection will attempt JWT fallback automatically
2. **JWT invalid**: Check `JWT_SECRET_KEY` configuration
3. **Permission denied**: Verify user has access to requested organization/project

### Performance Issues
1. **High memory usage**: Check Redis memory usage and connection cleanup
2. **Slow message delivery**: Monitor Redis latency and network connectivity
3. **Rate limiting triggered**: Reduce message frequency or increase limits

## Next Steps
1. Review `/demo/realtime` for live demonstration
2. Integrate with your existing notification triggers
3. Configure production Redis cluster for scaling
4. Set up monitoring dashboards for operational visibility

For detailed implementation guidance, see the full specification in `spec.md` and technical architecture in `plan.md`.

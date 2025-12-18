---
work_package_id: "WP01"
title: "Infrastructure Setup"
lane: "done"
assignee: "copilot"
subtasks: ["T001", "T002", "T003", "T004", "T005", "T006"]
priority: "P1"
estimated_effort: "2-3 days"
dependencies: []
review_status: "approved without changes"
reviewed_by: "copilot-reviewer"
agent: "copilot-reviewer"
shell_pid: "47288"
history:
  - action: "created"
    timestamp: "2025-12-18T15:30:00Z"
    author: "spec-kitty.tasks"
    note: "Generated from WebSocket infrastructure specification"
---

# WP01: Infrastructure Setup

## Objective
Establish the foundational Django Channels WebSocket infrastructure with Redis integration and authentication mechanisms. This work package creates the essential plumbing that all other WebSocket functionality will build upon.

## Context
This is the first work package in the WebSocket infrastructure implementation. It sets up:
- Django Channels with ASGI configuration
- Redis channel layer for message routing
- Base WebSocket consumer with dual authentication
- Container configuration for development and deployment

## Detailed Implementation Guide

### T001: Install and Configure Django Channels Dependencies
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Update requirements** - Add to `requirements/base.txt`:
   ```
   channels[daphne]>=4.0.0
   channels-redis>=4.1.0
   PyJWT>=2.8.0
   ```

2. **Update Django settings** - In `src/core/settings/base.py`:
   ```python
   INSTALLED_APPS += ['channels']

   ASGI_APPLICATION = 'core.asgi.application'

   # JWT Configuration for fallback authentication
   JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
   JWT_ALGORITHM = 'HS256'
   JWT_EXPIRY_HOURS = 24
   ```

3. **Install packages** in development environment:
   ```bash
   pip install -r requirements/base.txt
   ```

**Validation**:
- `python -c "import channels, channels_redis, jwt; print('Dependencies installed')"` runs without errors
- Django settings include new ASGI_APPLICATION configuration

**Files to Create/Modify**:
- `requirements/base.txt` (modify)
- `src/core/settings/base.py` (modify)

---

### T002: Configure ASGI Application with WebSocket Routing
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Create realtime Django app**:
   ```bash
   cd src
   python manage.py startapp realtime
   ```

2. **Update ASGI configuration** - Modify `src/core/asgi.py`:
   ```python
   import os
   from django.core.asgi import get_asgi_application
   from channels.routing import ProtocolTypeRouter, URLRouter
   from channels.auth import AuthMiddlewareStack

   os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.local')
   django_asgi_app = get_asgi_application()

   from realtime import routing

   application = ProtocolTypeRouter({
       'http': django_asgi_app,
       'websocket': AuthMiddlewareStack(
           URLRouter(
               routing.websocket_urlpatterns
           )
       ),
   })
   ```

3. **Create WebSocket routing** - Create `src/realtime/routing.py`:
   ```python
   from django.urls import re_path
   from . import consumers

   websocket_urlpatterns = [
       re_path(r'ws/test/$', consumers.TestConsumer.as_asgi()),
   ]
   ```

4. **Add realtime app to INSTALLED_APPS**:
   ```python
   INSTALLED_APPS += ['realtime']
   ```

**Validation**:
- Django starts without ASGI configuration errors
- WebSocket URLs are properly routed
- Test WebSocket connection can be established

**Files to Create/Modify**:
- `src/realtime/` (new app directory)
- `src/realtime/routing.py` (create)
- `src/core/asgi.py` (modify)
- `src/core/settings/base.py` (modify)

---

### T003: Set Up Redis Channel Layer Configuration
**Estimated Time**: 1-2 hours

**Implementation Steps**:
1. **Add Redis configuration** - In `src/core/settings/base.py`:
   ```python
   CHANNEL_LAYERS = {
       'default': {
           'BACKEND': 'channels_redis.core.RedisChannelLayer',
           'CONFIG': {
               'hosts': [
                   (
                       os.environ.get('REDIS_HOST', 'localhost'),
                       int(os.environ.get('REDIS_PORT', 6379))
                   )
               ],
           },
       },
   }
   ```

2. **Environment-specific overrides** - In `src/core/settings/local.py`:
   ```python
   # Development Redis configuration
   CHANNEL_LAYERS['default']['CONFIG']['hosts'] = [('127.0.0.1', 6379)]
   ```

3. **Test Redis connection**:
   ```python
   # Django shell test
   from channels.layers import get_channel_layer
   channel_layer = get_channel_layer()
   # Should not raise exceptions
   ```

**Validation**:
- Redis connection works in Django shell
- Channel layer configuration is environment-aware
- No connection errors in Django startup

**Files to Create/Modify**:
- `src/core/settings/base.py` (modify)
- `src/core/settings/local.py` (modify)

---

### T004: Create Base WebSocket Consumer Class with Authentication
**Estimated Time**: 3-4 hours

**Implementation Steps**:
1. **Create base consumer** - Create `src/realtime/consumers.py`:
   ```python
   import json
   import logging
   from channels.generic.websocket import AsyncWebsocketConsumer
   from channels.db import database_sync_to_async
   from django.contrib.auth import get_user_model
   from django.contrib.auth.models import AnonymousUser

   User = get_user_model()
   logger = logging.getLogger(__name__)

   class BaseWebSocketConsumer(AsyncWebsocketConsumer):
       async def connect(self):
           self.user = self.scope.get('user', AnonymousUser())

           if self.user.is_authenticated:
               await self.accept()
               await self.send_auth_response(True, "Authenticated via session")
           else:
               # Accept connection but require JWT authentication
               await self.accept()
               await self.send_auth_response(False, "JWT authentication required")

       async def disconnect(self, close_code):
           logger.info(f"WebSocket disconnected: {close_code}")

       async def receive(self, text_data):
           try:
               data = json.loads(text_data)
               message_type = data.get('type')

               if message_type == 'auth' and not self.user.is_authenticated:
                   await self.handle_jwt_auth(data.get('token'))
               elif message_type == 'ping':
                   await self.send_pong()
               else:
                   await self.handle_message(data)
           except json.JSONDecodeError:
               await self.send_error("Invalid JSON format")

       async def handle_jwt_auth(self, token):
           # JWT authentication implementation (T005)
           pass

       async def send_auth_response(self, success, message):
           await self.send(text_data=json.dumps({
               'type': 'auth_response',
               'status': 'success' if success else 'error',
               'message': message,
               'user_id': self.user.id if self.user.is_authenticated else None
           }))

       async def send_pong(self):
           await self.send(text_data=json.dumps({
               'type': 'pong',
               'timestamp': timezone.now().isoformat()
           }))

       async def send_error(self, message):
           await self.send(text_data=json.dumps({
               'type': 'error',
               'message': message
           }))

       async def handle_message(self, data):
           # Override in subclasses
           await self.send_error("Message handling not implemented")
   ```

2. **Create test consumer**:
   ```python
   class TestConsumer(BaseWebSocketConsumer):
       async def handle_message(self, data):
           await self.send(text_data=json.dumps({
               'type': 'echo',
               'message': data.get('message', 'Hello WebSocket!')
           }))
   ```

**Validation**:
- WebSocket connections establish successfully
- Session authentication works for logged-in users
- Basic message handling functions correctly
- Error handling works for malformed messages

**Files to Create/Modify**:
- `src/realtime/consumers.py` (create)

---

### T005: Implement JWT Fallback Authentication Mechanism
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Create JWT utilities** - Create `src/realtime/auth.py`:
   ```python
   import jwt
   from django.conf import settings
   from django.contrib.auth import get_user_model
   from django.utils import timezone
   import logging

   User = get_user_model()
   logger = logging.getLogger(__name__)

   class JWTAuth:
       @staticmethod
       def verify_token(token):
           try:
               payload = jwt.decode(
                   token,
                   settings.JWT_SECRET_KEY,
                   algorithms=[settings.JWT_ALGORITHM]
               )

               user_id = payload.get('user_id')
               if not user_id:
                   return None, "Invalid token: missing user_id"

               user = User.objects.get(id=user_id)

               # Check token expiry
               exp = payload.get('exp')
               if exp and timezone.now().timestamp() > exp:
                   return None, "Token expired"

               return user, None

           except jwt.InvalidTokenError as e:
               logger.warning(f"JWT validation failed: {e}")
               return None, f"Invalid token: {str(e)}"
           except User.DoesNotExist:
               return None, "User not found"
           except Exception as e:
               logger.error(f"JWT verification error: {e}")
               return None, "Authentication error"

       @staticmethod
       def generate_token(user):
           payload = {
               'user_id': user.id,
               'exp': timezone.now() + timezone.timedelta(hours=settings.JWT_EXPIRY_HOURS),
               'iat': timezone.now()
           }
           return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
   ```

2. **Update base consumer JWT handling**:
   ```python
   from .auth import JWTAuth

   async def handle_jwt_auth(self, token):
       if not token:
           await self.send_error("JWT token required")
           return

       user, error = await database_sync_to_async(JWTAuth.verify_token)(token)

       if user:
           self.user = user
           await self.send_auth_response(True, "Authenticated via JWT")
           logger.info(f"User {user.id} authenticated via JWT")
       else:
           await self.send_error(f"Authentication failed: {error}")
           await self.close(code=4001)  # Unauthorized
   ```

**Validation**:
- JWT tokens can be generated for test users
- JWT authentication works in WebSocket consumer
- Invalid/expired tokens are properly rejected
- Successful JWT auth allows full WebSocket functionality

**Files to Create/Modify**:
- `src/realtime/auth.py` (create)
- `src/realtime/consumers.py` (modify)

---

### T006: Create Docker Composition for Redis Service
**Estimated Time**: 1-2 hours

**Implementation Steps**:
1. **Create Redis Docker composition** - Create `docker-compose.websockets.yml`:
   ```yaml
   version: '3.8'

   services:
     redis-websockets:
       image: redis:7-alpine
       container_name: django-core-redis-websockets
       ports:
         - "6379:6379"
       volumes:
         - redis_websocket_data:/data
       command: redis-server --appendonly yes
       restart: unless-stopped

   volumes:
     redis_websocket_data:
   ```

2. **Update main docker-compose.yml** to include Redis service:
   ```yaml
   # Add to existing docker-compose.yml
   redis:
     extends:
       file: docker-compose.websockets.yml
       service: redis-websockets
   ```

3. **Create development startup script** - `scripts/start-websockets.sh`:
   ```bash
   #!/bin/bash
   echo "Starting WebSocket development environment..."
   docker-compose -f docker-compose.websockets.yml up -d
   echo "Redis started. Waiting 2 seconds..."
   sleep 2
   echo "Starting Django server with ASGI..."
   cd src && python manage.py runserver 0.0.0.0:8000
   ```

4. **Add environment variables** - Update `.env.example`:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET_KEY=your-jwt-secret-key-here
   ```

**Validation**:
- Redis container starts successfully with `docker-compose up`
- Django connects to Redis channel layer
- Development script works for quick setup
- Container data persists between restarts

**Files to Create/Modify**:
- `docker-compose.websockets.yml` (create)
- `docker-compose.yml` (modify)
- `scripts/start-websockets.sh` (create)
- `.env.example` (modify)

---

## Testing Strategy

### Unit Tests
- JWT token generation and validation
- Base consumer connection handling
- Authentication flow (session + JWT fallback)
- Error handling for malformed messages

### Integration Tests
- End-to-end WebSocket connection establishment
- Redis channel layer connectivity
- Docker container orchestration
- ASGI application WebSocket routing

### Manual Testing
1. **Basic Connection**: Open browser console, establish WebSocket connection
2. **Session Auth**: Login to Django admin, test WebSocket connection
3. **JWT Auth**: Generate JWT token, test fallback authentication
4. **Redis**: Stop/start Redis, verify connection recovery

## Definition of Done
- [ ] All dependencies installed and configured
- [ ] ASGI application routes WebSocket connections
- [ ] Redis channel layer operational
- [ ] Base consumer handles connections and authentication
- [ ] JWT fallback authentication works
- [ ] Docker composition provides Redis service
- [ ] Basic WebSocket echo functionality works
- [ ] Authentication errors handled gracefully
- [ ] Documentation updated with setup instructions

## Risks & Mitigation
- **Risk**: Django Channels version compatibility
  - **Mitigation**: Pin versions in requirements, test in clean environment
- **Risk**: Redis connection issues in different environments
  - **Mitigation**: Environment-specific configuration, connection testing
- **Risk**: JWT security configuration
  - **Mitigation**: Use strong secrets, proper token expiry, audit logging

## Reviewer Checklist
- [ ] WebSocket connection can be established at `/ws/test/`
- [ ] Session authentication works for logged-in users
- [ ] JWT authentication works with valid tokens
- [ ] Redis channel layer connects successfully
- [ ] Docker Redis service starts and persists data
- [ ] Error handling works for various failure scenarios
- [ ] Code follows django-core style guidelines (Black, Ruff)
- [ ] Logging captures important authentication events

## Activity Log

- 2025-12-18T17:24:02Z – claude – shell_pid=47288 – lane=doing – Started implementation
- 2025-12-18T17:48:11Z – copilot – shell_pid=47288 – lane=for_review – Completed implementation of WP01
- 2025-12-18T17:54:48Z – copilot-reviewer – shell_pid=47288 – lane=done – Approved without changes

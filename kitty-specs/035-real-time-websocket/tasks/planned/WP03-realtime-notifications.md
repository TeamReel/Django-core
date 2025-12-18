---
work_package_id: "WP03"
title: "Real-time Notifications (User Story 1)"
lane: "planned"
subtasks: ["T013", "T014", "T015", "T016", "T017", "T018"]
priority: "P1"
estimated_effort: "3-4 days"
dependencies: ["WP01", "WP02"]
history:
  - action: "created"
    timestamp: "2025-12-18T15:30:00Z"
    author: "spec-kitty.tasks"
    note: "Generated from WebSocket infrastructure specification"
---

# WP03: Real-time Notifications (User Story 1)

## Objective
Implement the core real-time notification system that delivers instant notifications to users without page refresh. This is the MVP functionality that provides the primary user value and demonstrates the WebSocket infrastructure working end-to-end.

## Context
This work package implements User Story 1 (Priority P1) from the specification. It builds on the infrastructure from WP01 and data models from WP02 to create a complete notification delivery system with tenant scoping, message queuing, and connection management.

## User Story Reference
**User Story 1**: Users receive instant notifications without page refresh when events occur in their organization or projects.

**Acceptance Scenarios**:
1. User with active WebSocket connection receives file upload notification instantly
2. User with multiple tabs sees notifications in all tabs simultaneously
3. User with brief connection drop receives missed notifications upon reconnection

## Detailed Implementation Guide

### T013: Create NotificationConsumer with Channel Group Management
**Estimated Time**: 4-5 hours

**Implementation Steps**:
1. **Create NotificationConsumer** - In `src/realtime/consumers.py`:
   ```python
   from .models import WebSocketConnection
   from .services import NotificationService
   import asyncio
   import logging

   logger = logging.getLogger(__name__)

   class NotificationConsumer(BaseWebSocketConsumer):
       def __init__(self, *args, **kwargs):
           super().__init__(*args, **kwargs)
           self.connection_record = None
           self.user_groups = []

       async def connect(self):
           await super().connect()

           if self.user.is_authenticated:
               await self.setup_connection()

       async def setup_connection(self):
           """Set up connection tracking and channel groups"""
           try:
               # Create connection record
               self.connection_record = await self.create_connection_record()

               # Join user-specific group
               await self.join_user_groups()

               logger.info(f"NotificationConsumer connected for user {self.user.id}")

           except Exception as e:
               logger.error(f"Connection setup failed: {e}")
               await self.close(code=4000)

       async def disconnect(self, close_code):
           """Clean up connection and channel groups"""
           if self.connection_record:
               await self.cleanup_connection()
           await super().disconnect(close_code)

       @database_sync_to_async
       def create_connection_record(self):
           """Create database record for this connection"""
           connection = WebSocketConnection.objects.create(
               user=self.user,
               channel_name=self.channel_name,
               auth_method='session' if self.scope.get('session') else 'jwt',
               client_info=self.extract_client_info()
           )
           return connection

       def extract_client_info(self):
           """Extract client metadata from connection scope"""
           headers = dict(self.scope.get('headers', []))
           return {
               'user_agent': headers.get(b'user-agent', b'').decode(),
               'origin': headers.get(b'origin', b'').decode(),
               'remote_addr': self.scope.get('client', ['unknown'])[0]
           }

       async def join_user_groups(self):
           """Join relevant channel groups based on user permissions"""
           # User-specific group
           user_group = f"user_{self.user.id}"
           await self.channel_layer.group_add(user_group, self.channel_name)
           self.user_groups.append(user_group)

           # Organization groups (from user's organization memberships)
           org_groups = await self.get_user_organization_groups()
           for group in org_groups:
               await self.channel_layer.group_add(group, self.channel_name)
               self.user_groups.append(group)

           logger.info(f"User {self.user.id} joined groups: {self.user_groups}")

       @database_sync_to_async
       def get_user_organization_groups(self):
           """Get organization groups user should join"""
           # Integrate with B06 (Organization Management) and B08 (Permissions)
           from organisations.models import OrganisationMembership

           memberships = OrganisationMembership.objects.filter(
               user=self.user,
               is_active=True
           ).select_related('organisation')

           return [f"org_{membership.organisation.id}" for membership in memberships]

       async def cleanup_connection(self):
           """Remove from groups and delete connection record"""
           # Leave all groups
           for group in self.user_groups:
               await self.channel_layer.group_discard(group, self.channel_name)

           # Delete connection record
           await self.delete_connection_record()

       @database_sync_to_async
       def delete_connection_record(self):
           if self.connection_record:
               self.connection_record.delete()

       async def receive(self, text_data):
           """Handle incoming messages"""
           await super().receive(text_data)

           # Update heartbeat timestamp
           if self.connection_record:
               await self.update_heartbeat()

       @database_sync_to_async
       def update_heartbeat(self):
           self.connection_record.last_heartbeat = timezone.now()
           self.connection_record.save(update_fields=['last_heartbeat'])

       # Group message handler for notifications
       async def notification_message(self, event):
           """Handle notification messages from group broadcast"""
           await self.send(text_data=json.dumps(event['message']))
   ```

2. **Update routing** - In `src/realtime/routing.py`:
   ```python
   websocket_urlpatterns = [
       re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
       re_path(r'ws/test/$', consumers.TestConsumer.as_asgi()),
   ]
   ```

**Validation**:
- Consumer establishes connections and joins appropriate groups
- Connection records are created/deleted properly
- User organization permissions are respected
- Heartbeat updates work correctly

**Files to Create/Modify**:
- `src/realtime/consumers.py` (modify)
- `src/realtime/routing.py` (modify)

---

### T014: Implement Tenant-Scoped Broadcasting (User/Org/Project)
**Estimated Time**: 3-4 hours

**Implementation Steps**:
1. **Create broadcasting service** - Create `src/realtime/services.py`:
   ```python
   from channels.layers import get_channel_layer
   from asgiref.sync import async_to_sync
   from .models import RealtimeMessage
   import json
   import logging

   logger = logging.getLogger(__name__)

   class NotificationService:
       def __init__(self):
           self.channel_layer = get_channel_layer()

       def send_notification(self, user_id=None, organization_id=None, project_id=None,
                           title=None, message=None, action_url=None, priority='normal',
                           actor_user=None, **kwargs):
           """
           Send notification to appropriate scope (user, organization, or project)
           """
           try:
               # Determine scope
               if user_id:
                   scope_type = 'user'
                   scope_id = user_id
               elif project_id:
                   scope_type = 'project'
                   scope_id = project_id
               elif organization_id:
                   scope_type = 'organization'
                   scope_id = organization_id
               else:
                   raise ValueError("Must specify user_id, organization_id, or project_id")

               # Create message content
               content = {
                   'title': title,
                   'message': message,
                   'action_url': action_url,
                   'priority': priority,
                   'actor': self._format_actor_info(actor_user) if actor_user else None,
                   **kwargs
               }

               # Create message record
               message_record = RealtimeMessage.objects.create(
                   message_type='notification',
                   scope_type=scope_type,
                   scope_id=scope_id,
                   sender_user=actor_user or self._get_system_user(),
                   content=content
               )

               # Broadcast to appropriate group
               self._broadcast_to_group(scope_type, scope_id, message_record)

               logger.info(f"Notification sent: {scope_type}:{scope_id} - {title}")

           except Exception as e:
               logger.error(f"Failed to send notification: {e}")
               raise

       def _format_actor_info(self, user):
           """Format user info for notification display"""
           return {
               'id': user.id,
               'name': user.get_full_name() or user.username,
               'avatar_url': getattr(user, 'avatar_url', None)
           }

       def _get_system_user(self):
           """Get system user for automated notifications"""
           from django.contrib.auth import get_user_model
           User = get_user_model()
           # Return system user or first superuser
           return User.objects.filter(is_superuser=True).first()

       def _broadcast_to_group(self, scope_type, scope_id, message_record):
           """Broadcast message to appropriate channel group"""
           group_name = f"{scope_type}_{scope_id}"

           envelope = message_record.to_envelope_format()

           async_to_sync(self.channel_layer.group_send)(
               group_name,
               {
                   'type': 'notification_message',
                   'message': envelope
               }
           )

           # Mark as delivered (immediate broadcast)
           message_record.mark_delivered()

       def send_file_upload_notification(self, file_obj, project, uploader):
           """Convenience method for file upload notifications"""
           self.send_notification(
               project_id=project.id,
               organization_id=project.organisation.id,
               title="New file uploaded",
               message=f"{file_obj.name} was uploaded to {project.name}",
               action_url=f"/projects/{project.id}/files/{file_obj.id}",
               priority="normal",
               actor_user=uploader
           )

       def send_project_notification(self, project, title, message, actor_user):
           """Convenience method for project-level notifications"""
           self.send_notification(
               project_id=project.id,
               organization_id=project.organisation.id,
               title=title,
               message=message,
               actor_user=actor_user
           )
   ```

2. **Add permission validation** for group membership:
   ```python
   from django.contrib.auth.models import User

   class NotificationPermissionService:
       @staticmethod
       def can_receive_notification(user, scope_type, scope_id):
           """Check if user has permission to receive notifications from scope"""
           if scope_type == 'user':
               return user.id == scope_id

           elif scope_type == 'organization':
               # Check organization membership via B08 permissions
               from access_control.services import PermissionService
               return PermissionService.user_has_org_access(user, scope_id)

           elif scope_type == 'project':
               # Check project membership via B08 permissions
               from access_control.services import PermissionService
               return PermissionService.user_has_project_access(user, scope_id)

           return False
   ```

**Validation**:
- Notifications broadcast to correct channel groups
- Permission validation prevents unauthorized access
- Message records are created and marked delivered
- Convenience methods work for common notification types

**Files to Create/Modify**:
- `src/realtime/services.py` (create)

---

### T015: Build Structured Envelope Message Formatting
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Create message formatter** - In `src/realtime/formatters.py`:
   ```python
   from datetime import datetime
   import uuid

   class MessageFormatter:
       @staticmethod
       def create_notification_envelope(notification_data, user_id, scope):
           """Create structured notification envelope"""
           return {
               'meta': {
                   'type': 'notification',
                   'id': str(uuid.uuid4()),
                   'timestamp': datetime.now().isoformat(),
                   'version': '1.0'
               },
               'payload': {
                   'data': notification_data
               },
               'auth': {
                   'user_id': user_id,
                   'scope': scope,
                   'permissions': ['read']  # Basic read permission
               }
           }

       @staticmethod
       def create_error_envelope(error_code, error_message):
           """Create structured error envelope"""
           return {
               'meta': {
                   'type': 'error',
                   'id': str(uuid.uuid4()),
                   'timestamp': datetime.now().isoformat(),
                   'version': '1.0'
               },
               'payload': {
                   'data': {
                       'code': error_code,
                       'message': error_message
                   }
               }
           }

       @staticmethod
       def create_system_envelope(system_type, system_data):
           """Create structured system message envelope"""
           return {
               'meta': {
                   'type': 'system',
                   'subtype': system_type,
                   'id': str(uuid.uuid4()),
                   'timestamp': datetime.now().isoformat(),
                   'version': '1.0'
               },
               'payload': {
                   'data': system_data
               }
           }
   ```

2. **Update consumer to use formatted messages**:
   ```python
   # In NotificationConsumer
   from .formatters import MessageFormatter

   async def send_auth_response(self, success, message):
       envelope = MessageFormatter.create_system_envelope('auth_response', {
           'status': 'success' if success else 'error',
           'message': message,
           'user_id': self.user.id if self.user.is_authenticated else None,
           'connection_id': str(self.connection_record.connection_id) if self.connection_record else None
       })
       await self.send(text_data=json.dumps(envelope))

   async def send_error(self, error_code, message):
       envelope = MessageFormatter.create_error_envelope(error_code, message)
       await self.send(text_data=json.dumps(envelope))
   ```

**Validation**:
- All messages follow structured envelope format
- Timestamps are properly formatted ISO strings
- Message IDs are unique UUIDs
- Auth information is correctly included

**Files to Create/Modify**:
- `src/realtime/formatters.py` (create)
- `src/realtime/consumers.py` (modify)

---

### T016: Create Notification Services for Triggering Events
**Estimated Time**: 3-4 hours

**Implementation Steps**:
1. **Create integration service** - Continue in `src/realtime/services.py`:
   ```python
   class NotificationTriggerService:
       """Service to integrate with other django-core modules for automatic notifications"""

       def __init__(self):
           self.notification_service = NotificationService()

       def trigger_file_upload(self, file_obj, project, uploader):
           """Trigger notification when file is uploaded"""
           self.notification_service.send_file_upload_notification(
               file_obj=file_obj,
               project=project,
               uploader=uploader
           )

       def trigger_project_created(self, project, creator):
           """Trigger notification when project is created"""
           self.notification_service.send_notification(
               organization_id=project.organisation.id,
               title="New project created",
               message=f"{creator.get_full_name()} created project '{project.name}'",
               action_url=f"/projects/{project.id}/",
               actor_user=creator
           )

       def trigger_user_joined_org(self, user, organization, inviter):
           """Trigger notification when user joins organization"""
           self.notification_service.send_notification(
               organization_id=organization.id,
               title="New team member",
               message=f"{user.get_full_name()} joined the organization",
               action_url=f"/organizations/{organization.id}/members/",
               actor_user=inviter
           )

       def trigger_comment_added(self, comment, commented_item, commenter):
           """Trigger notification when comment is added"""
           # Determine project/org context from commented item
           project = getattr(commented_item, 'project', None)
           organization = project.organisation if project else getattr(commented_item, 'organisation', None)

           if project:
               self.notification_service.send_notification(
                   project_id=project.id,
                   organization_id=organization.id,
                   title="New comment added",
                   message=f"{commenter.get_full_name()} commented on {commented_item}",
                   action_url=f"/comments/{comment.id}/",
                   actor_user=commenter
               )
   ```

2. **Create Django signals integration**:
   ```python
   # In src/realtime/signals.py
   from django.db.models.signals import post_save
   from django.dispatch import receiver
   from .services import NotificationTriggerService

   trigger_service = NotificationTriggerService()

   # Example integration with project creation
   @receiver(post_save, sender='projects.Project')
   def project_created_notification(sender, instance, created, **kwargs):
       if created:
           trigger_service.trigger_project_created(
               project=instance,
               creator=instance.created_by
           )

   # Add in apps.py
   class RealtimeConfig(AppConfig):
       default_auto_field = 'django.db.models.BigAutoField'
       name = 'realtime'

       def ready(self):
           import realtime.signals
   ```

3. **Create REST API endpoint for manual triggers** - In `src/realtime/views.py`:
   ```python
   from rest_framework import status
   from rest_framework.decorators import api_view, permission_classes
   from rest_framework.permissions import IsAuthenticated
   from rest_framework.response import Response
   from .services import NotificationService

   @api_view(['POST'])
   @permission_classes([IsAuthenticated])
   def send_demo_notification(request):
       """API endpoint for sending demo notifications"""
       data = request.data

       service = NotificationService()

       try:
           service.send_notification(
               user_id=request.user.id,  # Send to current user for demo
               title=data.get('title', 'Demo Notification'),
               message=data.get('message', 'This is a test notification via WebSocket'),
               priority=data.get('priority', 'normal'),
               actor_user=request.user
           )

           return Response({'status': 'notification sent'}, status=status.HTTP_200_OK)

       except Exception as e:
           return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
   ```

**Validation**:
- Integration services trigger appropriate notifications
- Django signals fire notifications automatically
- REST API allows manual notification testing
- All notification types format correctly

**Files to Create/Modify**:
- `src/realtime/services.py` (modify)
- `src/realtime/signals.py` (create)
- `src/realtime/views.py` (create)
- `src/realtime/apps.py` (modify)

---

### T017: Implement In-Memory Queuing for Redis Failures
**Estimated Time**: 3-4 hours

**Implementation Steps**:
1. **Create queue manager** - In `src/realtime/queue.py`:
   ```python
   import asyncio
   from collections import defaultdict, deque
   from datetime import datetime, timedelta
   import logging

   logger = logging.getLogger(__name__)

   class InMemoryMessageQueue:
       """Manages in-memory message queuing during Redis failures"""

       def __init__(self, max_queue_size=1000):
           self.queues = defaultdict(lambda: deque(maxlen=max_queue_size))
           self.max_queue_size = max_queue_size
           self.redis_available = True

       def queue_message(self, connection_id, message):
           """Queue message for later delivery"""
           timestamp = datetime.now()
           queued_message = {
               'message': message,
               'queued_at': timestamp,
               'attempts': 0
           }

           queue = self.queues[connection_id]
           if len(queue) >= self.max_queue_size:
               # Remove oldest message
               dropped = queue.popleft()
               logger.warning(f"Dropped message for connection {connection_id}: queue full")

           queue.append(queued_message)
           logger.info(f"Queued message for connection {connection_id}, queue size: {len(queue)}")

       def get_queued_messages(self, connection_id):
           """Get all queued messages for a connection"""
           queue = self.queues.get(connection_id, deque())
           messages = list(queue)
           self.queues[connection_id].clear()  # Clear after retrieval
           return messages

       def clear_expired_messages(self, max_age_minutes=30):
           """Remove messages older than max_age"""
           cutoff = datetime.now() - timedelta(minutes=max_age_minutes)

           for connection_id, queue in self.queues.items():
               original_size = len(queue)
               # Filter out expired messages
               queue = deque([msg for msg in queue if msg['queued_at'] > cutoff],
                           maxlen=self.max_queue_size)
               self.queues[connection_id] = queue

               if len(queue) < original_size:
                   logger.info(f"Cleared {original_size - len(queue)} expired messages for {connection_id}")

   # Global queue manager instance
   message_queue = InMemoryMessageQueue()
   ```

2. **Update consumer with queue handling**:
   ```python
   # In NotificationConsumer
   from .queue import message_queue

   async def connect(self):
       await super().connect()

       if self.user.is_authenticated:
           await self.setup_connection()
           await self.deliver_queued_messages()

   async def deliver_queued_messages(self):
       """Deliver any messages queued while connection was down"""
       if self.connection_record:
           connection_id = str(self.connection_record.connection_id)
           queued_messages = message_queue.get_queued_messages(connection_id)

           for queued_msg in queued_messages:
               try:
                   await self.send(text_data=json.dumps(queued_msg['message']))
                   logger.info(f"Delivered queued message to {connection_id}")
               except Exception as e:
                   logger.error(f"Failed to deliver queued message: {e}")

   async def notification_message(self, event):
       """Handle notification with queue fallback"""
       try:
           await self.send(text_data=json.dumps(event['message']))
       except Exception as e:
           # Queue message if sending fails
           if self.connection_record:
               connection_id = str(self.connection_record.connection_id)
               message_queue.queue_message(connection_id, event['message'])
               logger.warning(f"Queued message due to send failure: {e}")
   ```

3. **Create Redis health monitoring**:
   ```python
   # In services.py
   from django.core.cache import cache
   from channels.layers import get_channel_layer

   class RedisHealthService:
       @staticmethod
       def check_redis_health():
           """Check if Redis is available"""
           try:
               channel_layer = get_channel_layer()
               # Try a simple operation
               cache.set('redis_health_check', 'ok', timeout=10)
               result = cache.get('redis_health_check')
               return result == 'ok'
           except Exception as e:
               logger.error(f"Redis health check failed: {e}")
               return False

       @staticmethod
       def handle_redis_failure():
           """Handle Redis failure by enabling queue mode"""
           message_queue.redis_available = False
           logger.error("Redis failure detected, switching to in-memory queue mode")

       @staticmethod
       def handle_redis_recovery():
           """Handle Redis recovery"""
           message_queue.redis_available = True
           logger.info("Redis recovered, resuming normal operation")
   ```

**Validation**:
- Messages are queued when Redis is unavailable
- Queued messages are delivered upon reconnection
- Queue size limits prevent memory exhaustion
- Expired messages are cleaned up automatically

**Files to Create/Modify**:
- `src/realtime/queue.py` (create)
- `src/realtime/consumers.py` (modify)
- `src/realtime/services.py` (modify)

---

### T018: Add Connection State Management and Cleanup
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Create connection manager** - In `src/realtime/managers.py`:
   ```python
   from django.utils import timezone
   from datetime import timedelta
   from .models import WebSocketConnection
   import logging

   logger = logging.getLogger(__name__)

   class ConnectionManager:
       @staticmethod
       def cleanup_stale_connections(timeout_minutes=5):
           """Remove stale connections that haven't sent heartbeat"""
           cutoff = timezone.now() - timedelta(minutes=timeout_minutes)

           stale_connections = WebSocketConnection.objects.filter(
               last_heartbeat__lt=cutoff
           )

           count = stale_connections.count()
           if count > 0:
               stale_connections.delete()
               logger.info(f"Cleaned up {count} stale WebSocket connections")

           return count

       @staticmethod
       def get_active_connections_count():
           """Get count of currently active connections"""
           recent = timezone.now() - timedelta(minutes=5)
           return WebSocketConnection.objects.filter(
               last_heartbeat__gte=recent
           ).count()

       @staticmethod
       def get_user_connections(user):
           """Get all active connections for a user"""
           recent = timezone.now() - timedelta(minutes=5)
           return WebSocketConnection.objects.filter(
               user=user,
               last_heartbeat__gte=recent
           )
   ```

2. **Create management command for cleanup**:
   ```python
   # src/realtime/management/commands/cleanup_websocket_connections.py
   from django.core.management.base import BaseCommand
   from realtime.managers import ConnectionManager

   class Command(BaseCommand):
       help = 'Clean up stale WebSocket connections'

       def add_arguments(self, parser):
           parser.add_argument(
               '--timeout-minutes',
               type=int,
               default=5,
               help='Timeout in minutes for considering connection stale'
           )

       def handle(self, *args, **options):
           timeout = options['timeout_minutes']
           cleaned = ConnectionManager.cleanup_stale_connections(timeout)

           self.stdout.write(
               self.style.SUCCESS(f'Cleaned up {cleaned} stale connections')
           )
   ```

3. **Add periodic cleanup task**:
   ```python
   # In consumers.py - add to NotificationConsumer
   import asyncio

   async def setup_connection(self):
       await super().setup_connection()

       # Start periodic cleanup task for this connection
       asyncio.create_task(self.periodic_heartbeat())

   async def periodic_heartbeat(self):
       """Send periodic heartbeat and update timestamp"""
       while self.connection_record:
           try:
               await asyncio.sleep(30)  # 30 second intervals

               if self.connection_record:
                   await self.update_heartbeat()

                   # Send heartbeat to client
                   heartbeat = {
                       'type': 'heartbeat',
                       'timestamp': timezone.now().isoformat(),
                       'connection_id': str(self.connection_record.connection_id)
                   }
                   await self.send(text_data=json.dumps(heartbeat))

           except asyncio.CancelledError:
               break
           except Exception as e:
               logger.error(f"Heartbeat error: {e}")
               break
   ```

**Validation**:
- Stale connections are cleaned up automatically
- Active connection counts are accurate
- Management command works for manual cleanup
- Heartbeat system keeps connections alive

**Files to Create/Modify**:
- `src/realtime/managers.py` (create)
- `src/realtime/management/commands/cleanup_websocket_connections.py` (create)
- `src/realtime/consumers.py` (modify)

---

## Testing Strategy

### Manual Testing
1. **Basic Notification**: Login, open WebSocket connection, trigger notification via API
2. **Multi-tab Testing**: Open multiple tabs, verify notifications appear in all tabs
3. **Reconnection**: Disconnect network, reconnect, verify missed notifications delivered
4. **Permission Testing**: Test notifications with different organization/project access

### Integration Testing
- WebSocket connection establishment and authentication
- Channel group membership based on user permissions
- Message broadcasting to appropriate scopes
- Redis failure and recovery scenarios

### Performance Testing
- Multiple concurrent connections (aim for 100+ in development)
- Message delivery latency measurement
- Memory usage during queue operations
- Connection cleanup effectiveness

## Definition of Done
- [ ] NotificationConsumer handles connections and group management
- [ ] Tenant-scoped broadcasting works for user/org/project scopes
- [ ] Structured envelope format used for all messages
- [ ] Integration services trigger notifications from other modules
- [ ] In-memory queuing works during Redis failures
- [ ] Connection state management and cleanup functions properly
- [ ] All three acceptance scenarios pass testing
- [ ] Performance targets met (instant delivery, multi-tab sync)
- [ ] Error handling works for various failure scenarios

## Risks & Mitigation
- **Risk**: Channel group membership complexity with permissions
  - **Mitigation**: Thorough testing with various permission scenarios
- **Risk**: Memory consumption during extended Redis outages
  - **Mitigation**: Queue size limits and message expiry
- **Risk**: Race conditions in message delivery
  - **Mitigation**: Atomic operations and proper async handling

## Reviewer Checklist
- [ ] WebSocket connections establish and authenticate properly
- [ ] Notifications deliver instantly without page refresh
- [ ] Multi-tab synchronization works correctly
- [ ] Permission-based message scoping functions properly
- [ ] In-memory queuing prevents message loss during Redis failures
- [ ] Connection cleanup prevents resource leaks
- [ ] Structured message format is consistent
- [ ] Integration with existing django-core modules works

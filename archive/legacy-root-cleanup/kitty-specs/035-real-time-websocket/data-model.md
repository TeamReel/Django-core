# Data Model: Real-time WebSocket Infrastructure

## Core Entities

### WebSocketConnection
Represents an active WebSocket connection with authentication and tracking metadata.

**Properties**:
- `connection_id`: str (UUID4) - Unique identifier for the connection
- `user_id`: int (FK to User) - Associated authenticated user
- `channel_name`: str - Django Channels channel name for routing
- `authenticated_at`: datetime - Timestamp of successful authentication
- `last_heartbeat`: datetime - Last received heartbeat for connection health
- `message_count`: int - Number of messages sent through this connection (rate limiting)
- `auth_method`: str - Authentication method used ('session', 'jwt')
- `client_info`: JSONField - Browser/client metadata for debugging

**Relationships**:
- Belongs to User (many-to-one)
- Associated with Organizations/Projects through User permissions

**State Transitions**:
- connecting → authenticated → active → disconnected
- active → rate_limited → active (after cooldown)
- authenticated → reauthenticating (session expiry) → authenticated

**Validation Rules**:
- connection_id must be unique globally
- authenticated_at required for active connections
- message_count resets every minute for rate limiting

---

### RealtimeMessage
Represents a structured message sent through WebSocket connections.

**Properties**:
- `message_id`: str (UUID4) - Unique identifier for message tracking
- `message_type`: str - Type of message ('notification', 'presence', 'activity')
- `scope_type`: str - Broadcast scope ('user', 'organization', 'project')
- `scope_id`: int - ID of the scope (user_id, org_id, project_id)
- `sender_user_id`: int (FK to User) - User who triggered the message
- `content`: JSONField - Message payload data
- `created_at`: datetime - Message creation timestamp
- `delivered_at`: datetime (nullable) - When message was delivered
- `retry_count`: int - Number of delivery attempts

**Relationships**:
- Originated by User (many-to-one)
- Delivered to Connection(s) (many-to-many through delivery tracking)

**Validation Rules**:
- message_type must be in ['notification', 'presence', 'activity']
- scope_type must be in ['user', 'organization', 'project']
- content must follow structured envelope format
- retry_count limited to maximum of 3 attempts

---

### PresenceStatus
Represents a user's current online/away/offline status within tenant scopes.

**Properties**:
- `user_id`: int (FK to User) - User whose presence is tracked
- `status`: str - Current presence status ('online', 'away', 'offline')
- `last_seen`: datetime - Last activity timestamp
- `current_location`: str (nullable) - Current page/project location
- `organization_id`: int (FK to Organization) - Scope of presence visibility
- `project_id`: int (FK to Project, nullable) - Specific project scope if applicable
- `updated_at`: datetime - Last status update timestamp

**Relationships**:
- Belongs to User (many-to-one)
- Scoped to Organization (many-to-one)
- Optionally scoped to Project (many-to-one)

**State Transitions**:
- online → away (Page Visibility API trigger)
- away → online (user activity detected)
- online/away → offline (connection lost for >5 minutes)

**Validation Rules**:
- Unique constraint: (user_id, organization_id, project_id)
- status must be in ['online', 'away', 'offline']
- last_seen updated on any status change

---

### ActivityEvent
Represents system activities that generate real-time notifications.

**Properties**:
- `event_id`: str (UUID4) - Unique identifier for the activity
- `actor_user_id`: int (FK to User) - User who performed the action
- `action_type`: str - Type of action performed
- `resource_type`: str - Type of resource affected
- `resource_id`: int - ID of the affected resource
- `organization_id`: int (FK to Organization) - Organization context
- `project_id`: int (FK to Project, nullable) - Project context if applicable
- `occurred_at`: datetime - When the activity occurred
- `metadata`: JSONField - Additional activity-specific data

**Relationships**:
- Performed by User (many-to-one)
- Scoped to Organization (many-to-one)
- Optionally scoped to Project (many-to-one)

**Validation Rules**:
- actor_user_id must have permission to perform action_type
- organization_id and project_id must match resource ownership
- metadata follows activity-type-specific schema

## Message Format Schema

### Structured Envelope Format
All WebSocket messages follow this standardized structure:

```json
{
  "meta": {
    "type": "notification|presence|activity",
    "id": "uuid4-string",
    "timestamp": "2025-12-18T10:30:00Z",
    "version": "1.0"
  },
  "payload": {
    "data": {
      // Message-type-specific content
    }
  },
  "auth": {
    "user_id": 123,
    "scope": "organization:456|project:789",
    "permissions": ["read", "write"]
  }
}
```

### Message Type Schemas

**Notification Message**:
```json
{
  "payload": {
    "data": {
      "title": "File uploaded",
      "message": "document.pdf was uploaded to Project Alpha",
      "action_url": "/projects/123/files/456",
      "priority": "normal|high|urgent",
      "actor": {
        "id": 789,
        "name": "John Doe",
        "avatar_url": "/avatars/789.jpg"
      }
    }
  }
}
```

**Presence Message**:
```json
{
  "payload": {
    "data": {
      "user_id": 123,
      "status": "online|away|offline",
      "location": "/projects/456",
      "users_online": 5
    }
  }
}
```

**Activity Message**:
```json
{
  "payload": {
    "data": {
      "activity_type": "file_upload|project_created|user_joined",
      "actor": {
        "id": 123,
        "name": "Jane Smith"
      },
      "resource": {
        "type": "file|project|user",
        "id": 456,
        "name": "document.pdf"
      },
      "occurred_at": "2025-12-18T10:30:00Z"
    }
  }
}
```

## Redis Data Structures

### Channel Groups
- `user_{user_id}` - User-specific notifications
- `org_{organization_id}` - Organization-wide broadcasts
- `project_{project_id}` - Project-specific activity
- `presence_{organization_id}` - Presence updates within organization

### Rate Limiting Keys
- `rate_limit:conn:{connection_id}` - Message count per connection (TTL: 60s)
- `rate_limit:user:{user_id}` - Global user rate limiting (TTL: 60s)

### Connection Tracking
- `connection:{connection_id}` - Connection metadata (TTL: 1800s)
- `user_connections:{user_id}` - Set of active connection IDs

### Message Queues (Redis failure handling)
- `queue:conn:{connection_id}` - Per-connection message queue (max 1000)
- `queue:delivery_failed` - Failed message delivery tracking

## Database Indexes

### Performance Optimization Indexes
```sql
-- WebSocketConnection indexes
CREATE INDEX idx_websocket_connection_user_id ON websocket_connection(user_id);
CREATE INDEX idx_websocket_connection_active ON websocket_connection(authenticated_at)
  WHERE authenticated_at IS NOT NULL;

-- PresenceStatus indexes
CREATE UNIQUE INDEX idx_presence_status_unique ON presence_status(user_id, organization_id, project_id);
CREATE INDEX idx_presence_status_org ON presence_status(organization_id, status);

-- ActivityEvent indexes
CREATE INDEX idx_activity_event_org_time ON activity_event(organization_id, occurred_at);
CREATE INDEX idx_activity_event_project_time ON activity_event(project_id, occurred_at);
CREATE INDEX idx_activity_event_actor ON activity_event(actor_user_id);

-- RealtimeMessage indexes
CREATE INDEX idx_realtime_message_scope ON realtime_message(scope_type, scope_id, created_at);
CREATE INDEX idx_realtime_message_delivery ON realtime_message(created_at)
  WHERE delivered_at IS NULL;
```

## Data Volume Assumptions

### Scale Targets
- **Concurrent Connections**: 1,000 per server instance
- **Message Volume**: 10-50 messages per user per hour during active periods
- **Presence Updates**: ~100 updates per minute organization-wide
- **Activity Events**: ~500 events per hour per active organization

### Data Retention
- **WebSocketConnection**: Cleanup after 24 hours of inactivity
- **RealtimeMessage**: Retain for 7 days for debugging, then archive
- **PresenceStatus**: Real-time data, cleanup offline entries after 30 days
- **ActivityEvent**: Retain for audit purposes, integrate with B09 retention policy

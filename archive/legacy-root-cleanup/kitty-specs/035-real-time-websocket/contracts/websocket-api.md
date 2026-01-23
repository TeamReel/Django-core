# WebSocket API Contracts

## Connection Endpoints

### Notification Consumer
- **Path**: `/ws/notifications/`
- **Purpose**: Real-time notification delivery
- **Authentication**: Session (primary) + JWT fallback
- **Channel Groups**: `user_{user_id}`, `org_{organization_id}`

### Presence Consumer
- **Path**: `/ws/presence/`
- **Purpose**: User online/away status tracking
- **Authentication**: Session (primary) + JWT fallback
- **Channel Groups**: `presence_{organization_id}`

### Activity Consumer
- **Path**: `/ws/activity/`
- **Purpose**: Live activity feed updates
- **Authentication**: Session (primary) + JWT fallback
- **Channel Groups**: `org_{organization_id}`, `project_{project_id}`

## Message Protocols

### Connection Handshake

#### 1. Initial Connection
Client establishes WebSocket connection to appropriate endpoint using session authentication.

#### 2. JWT Fallback (if session invalid)
```json
{
  "type": "auth",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### 3. Authentication Response
```json
{
  "type": "auth_response",
  "status": "success|error",
  "user_id": 123,
  "message": "Authenticated successfully",
  "connection_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Heartbeat Protocol
```json
// Client → Server (every 30 seconds)
{
  "type": "ping"
}

// Server → Client
{
  "type": "pong",
  "timestamp": "2025-12-18T10:30:00Z"
}
```

### Rate Limiting Response
```json
{
  "type": "rate_limit_warning",
  "current_rate": 105,
  "limit": 100,
  "throttled_until": "2025-12-18T10:31:00Z",
  "message": "Rate limit exceeded. Messages throttled to 1 per 10 seconds."
}
```

## Message Type Specifications

### Notification Messages

#### Inbound (Trigger)
```json
{
  "type": "notification_ack",
  "notification_id": "uuid4-string"
}
```

#### Outbound (Delivery)
```json
{
  "meta": {
    "type": "notification",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-12-18T10:30:00Z",
    "version": "1.0"
  },
  "payload": {
    "data": {
      "title": "New file uploaded",
      "message": "document.pdf was uploaded to Project Alpha",
      "action_url": "/projects/123/files/456",
      "priority": "normal",
      "actor": {
        "id": 789,
        "name": "John Doe",
        "avatar_url": "/avatars/789.jpg"
      },
      "organization_id": 456,
      "project_id": 123
    }
  },
  "auth": {
    "user_id": 123,
    "scope": "project:123",
    "permissions": ["read"]
  }
}
```

### Presence Messages

#### Inbound (Status Update)
```json
{
  "type": "presence_update",
  "status": "online|away",
  "location": "/projects/123"
}
```

#### Outbound (Status Broadcast)
```json
{
  "meta": {
    "type": "presence",
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2025-12-18T10:30:00Z",
    "version": "1.0"
  },
  "payload": {
    "data": {
      "user_id": 789,
      "status": "online",
      "location": "/projects/123",
      "users_online": 5,
      "organization_id": 456
    }
  },
  "auth": {
    "user_id": 123,
    "scope": "organization:456",
    "permissions": ["read"]
  }
}
```

### Activity Messages

#### Outbound (Activity Feed)
```json
{
  "meta": {
    "type": "activity",
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "timestamp": "2025-12-18T10:30:00Z",
    "version": "1.0"
  },
  "payload": {
    "data": {
      "activity_type": "file_upload",
      "actor": {
        "id": 789,
        "name": "John Doe",
        "avatar_url": "/avatars/789.jpg"
      },
      "resource": {
        "type": "file",
        "id": 456,
        "name": "document.pdf"
      },
      "occurred_at": "2025-12-18T10:30:00Z",
      "organization_id": 456,
      "project_id": 123
    }
  },
  "auth": {
    "user_id": 123,
    "scope": "project:123",
    "permissions": ["read"]
  }
}
```

## Error Responses

### Authentication Error
```json
{
  "type": "error",
  "code": "AUTH_FAILED",
  "message": "Authentication required. Please provide valid session or JWT token.",
  "close_connection": true
}
```

### Permission Error
```json
{
  "type": "error",
  "code": "PERMISSION_DENIED",
  "message": "Insufficient permissions for requested scope.",
  "requested_scope": "project:123",
  "user_permissions": ["organization:456:read"]
}
```

### Rate Limit Error
```json
{
  "type": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Message rate limit exceeded. Connection throttled.",
  "current_rate": 105,
  "limit": 100,
  "retry_after": 10
}
```

### Malformed Message Error
```json
{
  "type": "error",
  "code": "INVALID_MESSAGE",
  "message": "Message format invalid or missing required fields.",
  "received_message": "...",
  "validation_errors": ["Missing 'type' field", "Invalid JSON structure"]
}
```

## Connection Lifecycle

### Connection States
1. **Connecting**: Initial WebSocket handshake
2. **Authenticating**: Validating session or processing JWT token
3. **Active**: Authenticated and ready for message exchange
4. **Rate Limited**: Temporarily throttled due to excess messages
5. **Reauthenticating**: Session expired, attempting JWT fallback
6. **Disconnected**: Connection closed (graceful or error)

### State Transitions
```
Connecting → Authenticating → Active
Active → Rate Limited → Active (after cooldown)
Active → Reauthenticating → Active (JWT success) | Disconnected (JWT fail)
Any State → Disconnected (network/error)
```

### Connection Cleanup
- Automatic cleanup after 30 seconds of no heartbeat
- Graceful close message sent before server-initiated disconnection
- Redis cleanup of channel group memberships
- Audit logging of all connection state changes

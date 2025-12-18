# Research: Real-time WebSocket Infrastructure

## Technology Decisions

### Django Channels + Redis Architecture

**Decision**: Use Django Channels with Redis channel layer backend in container deployment

**Rationale**:
- Proven scalability for WebSocket connections
- Redis provides reliable message delivery and channel group management
- Container deployment enables cloud-native scaling and DevOps integration
- Integrates seamlessly with existing django-core infrastructure

**Alternatives considered**:
- Raw WebSocket implementation: Too low-level, would require building channel layer functionality
- Socket.IO: Not Django-native, additional JavaScript dependency, protocol complexity
- Server-Sent Events: One-way only, doesn't support full real-time interaction

### Consumer Architecture Pattern

**Decision**: Three separate consumer classes with shared base class

**Rationale**:
- Clear separation of concerns (notifications vs presence vs activity)
- Independent testing and deployment of each message type
- Specific permission validation per endpoint
- Modular codebase that can evolve independently

**Alternatives considered**:
- Single unified consumer: Would create monolithic design, harder to test specific functionality
- Event-driven architecture: Over-engineered for current scope, unnecessary complexity
- Two-tier design: Additional abstraction layer without clear benefit

### JWT Fallback Authentication

**Decision**: JWT tokens sent via first WebSocket message after connection establishment

**Rationale**:
- Maximum browser compatibility (no custom headers or subprotocol requirements)
- Secure token transmission after connection established
- Allows graceful fallback from session to JWT authentication
- Supports future mobile/API client integration

**Alternatives considered**:
- JWT in query parameters: Security risk due to URL logging and browser history
- JWT in WebSocket subprotocol: Browser support limitations, implementation complexity
- JWT in HTTP headers: Browser WebSocket API doesn't support custom headers

### Monitoring Strategy

**Decision**: Django-prometheus integration with custom WebSocket metrics

**Rationale**:
- Builds on existing B06 prometheus infrastructure
- Provides essential metrics: connection count, message rate, error tracking
- Enterprise-ready monitoring without operational overhead
- Easily extensible to full observability stack later

**Alternatives considered**:
- Full OpenTelemetry stack: Over-engineered for current requirements, high complexity
- ELK stack only: Missing real-time metrics, primarily for debugging rather than monitoring
- Minimal monitoring: Inadequate for enterprise requirements and operational visibility

### Tenant Isolation Strategy

**Decision**: Redis channel groups per tenant with permission validation at group join

**Rationale**:
- Efficient message broadcasting using Redis native functionality
- Clear tenant boundaries prevent data leakage
- Scales well with tenant growth
- Integrates with existing B08 hierarchical access control

**Alternatives considered**:
- Application-level filtering: Inefficient, broadcasts to all connections then filters
- Hierarchical channel names: Complex channel management, wildcard performance issues
- Permission matrix caching: Over-engineered, cache consistency complexity

## Implementation Dependencies

### Required Packages
- `channels[daphne]>=4.0.0` - Django Channels with ASGI server
- `channels-redis>=4.1.0` - Redis channel layer backend
- `django-prometheus>=2.3.1` - Metrics integration (existing)
- `redis>=4.5.0` - Redis client library
- `PyJWT>=2.8.0` - JWT token handling

### Integration Points
- **B05 (Authentication)**: Session validation, user model integration
- **B06 (Organization Management)**: Tenant scoping, organization permissions
- **B07 (Projects & Workspaces)**: Project-level message scoping
- **B08 (Hierarchical Access Control)**: Permission validation for message delivery
- **B09 (Audit Logging)**: Connection events, message delivery audit trail

### Container Configuration
- Redis service container with persistent storage
- Django application container with ASGI server (Daphne)
- Network configuration for inter-service communication
- Environment variables for Redis connection and JWT secrets

## Performance Considerations

### Connection Scaling
- Target: 1000 concurrent connections per server instance
- Redis connection pooling to prevent resource exhaustion
- Connection heartbeat every 30 seconds to detect dead connections
- Graceful connection cleanup on server restart

### Message Delivery
- Target: 95% of messages delivered within 100ms
- In-memory message queuing (1000 msg limit) during Redis failures
- Rate limiting: 100 messages per minute per connection
- Throttling to 1 msg/10 seconds when limit exceeded

### Memory Management
- Connection tracking in Redis with TTL cleanup
- Message queue size limits to prevent memory bloat
- Periodic cleanup of stale presence data
- Monitoring of WebSocket connection memory usage

## Security Considerations

### Authentication Flow
1. Initial connection via session authentication (primary)
2. JWT fallback if session expires or unavailable
3. Connection termination if both authentication methods fail
4. Audit logging of all authentication events

### Message Security
- Structured envelope format with authentication metadata
- Tenant-scoped message delivery based on user permissions
- Rate limiting to prevent abuse and DoS attacks
- Input validation on all WebSocket message content

### Data Protection
- No sensitive data in WebSocket URLs or logs
- Encrypted Redis traffic in production environment
- Connection audit trail with correlation IDs
- Graceful handling of malformed or malicious messages

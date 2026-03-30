# B23: Real-time Infrastructure

**Phase:** 9
**Status:** ✅ Done
**Module ID:** 035
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 35. B23 – Real-time Infrastructure (WebSocket/Channels)

**Doel**: Django Channels setup voor WebSocket support, broadcast patterns en live updates.

**Waarom agnostisch**: Real-time updates zijn universeel - notifications, collaboration, live data feeds.

**Wat moet er gebeuren**:
- **Django Channels**: ASGI configuration + Redis channel layer
  - Update `asgi.py` for ASGI app
  - Configure channel layer in settings
  - Redis backend for channel persistence
- **WebSocket routing**: `/ws/` namespace
  - `/ws/notifications` (user-specific)
  - `/ws/presence` (online users)
  - `/ws/activity` (org/project activity feed)
- **Broadcast utilities**: Send updates to specific scopes
  - `broadcast_to_user(user_id, message)` (user channel)
  - `broadcast_to_org(org_id, message)` (all org members)
  - `broadcast_to_project(project_id, message)` (project members)
- **Connection authentication**: JWT token validation via WebSocket headers
  - `Authorization: Bearer <token>` in WebSocket handshake
  - Reject unauthenticated connections
- **Reconnection**: Exponential backoff, automatic reconnect
  - Client-side: retry 3 times with 1s, 2s, 4s delays
  - Server-side: heartbeat ping every 30s
- **Rate limiting**: Max 100 messages/minute per connection
  - Track per connection (Redis counter)
  - Disconnect if exceeded
- **Monitoring**: Active connections, message throughput, errors
  - Prometheus metrics: `websocket_connections_active`, `websocket_messages_total`

**Demo Requirements**:
- 📡 **Live Activity Feed** (`/demo/realtime`):
  - WebSocket connection status indicator (green = connected, red = disconnected)
  - Live notifications (appear instantly without page refresh)
  - Online users count (updates in real-time)
  - Activity feed (login events, project updates, file uploads)
  - Reconnect button (manual test)
  - Tests: connect WebSocket → send notification → verify instant display

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B23-realtime-infrastructure-channels

[feature summary]
Django Channels WebSocket infrastructure for real-time updates (notifications, presence, activity).

[goals]
- ASGI + Redis channel layer
- WebSocket routing + authentication
- Broadcast patterns (user, org, project scopes)
- Connection management + rate limiting
- Monitoring + observability

[demo requirements]
Demo page: /demo/realtime
- Connection status indicator
- Live notifications (no refresh)
- Online users count
- Activity feed
- Tests: WebSocket connect → broadcast → verify display
```

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Real-time WebSocket Infrastructure
*Path: [templates/spec-template.md*

**Feature Branch**: `035-real-time-websocket`
**Created**: December 18, 2025
**Status**: Draft
**Input**: User description: "Django Channels WebSocket infrastructure for real-time updates (notifications, presence, activity) with dual authentication (session + JWT fallback), tenant-scoped broadcasting, rate limiting, and monitoring for enterprise scalability."

## Clarifications

### Session 2025-12-18

- Q: What should happen when Redis becomes temporarily unavailable during active WebSocket connections? → A: Queue messages in memory temporarily (with size limits) and flush when Redis returns
- Q: How should the system determine when a user transitions from "online" to "away" status? → A: When browser tab becomes inactive/hidden (Page Visibility API)
- Q: What specific message format structure should be used for WebSocket communications? → A: Structured envelope: {meta: {type, id, timestamp}, payload: {data}, auth: {user_id, scope}}
- Q: How should the system handle message delivery when a user exceeds the rate limit (100 msgs/min)? → A: Send rate limit warning and throttle to 1 msg/10 seconds
- Q: What should happen when a user's Django session expires while they have an active WebSocket connection? → A: Attempt JWT fallback authentication if available, else close gracefully

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Real-time Notification Delivery (Priority: P1)

Users receive instant notifications without page refresh when events occur in their organization or projects.

**Why this priority**: Core value proposition - real-time communication is the foundation all other features build upon.

**Independent Test**: Can be fully tested by triggering a notification event and verifying immediate delivery without refresh, delivering instant user engagement.

**Acceptance Scenarios**:

1. **Given** user is logged in with active WebSocket connection, **When** another user uploads a file to their project, **Then** notification appears instantly on screen without page refresh
2. **Given** user has multiple tabs open, **When** notification is sent to user, **Then** notification appears in all connected tabs simultaneously
3. **Given** user's connection drops briefly, **When** connection is restored, **Then** missed notifications are delivered upon reconnection

---

### User Story 2 - Live Presence Tracking (Priority: P2)

Users can see who else is currently active in their organization and projects in real-time.

**Why this priority**: Enhances collaboration by showing team availability and activity levels.

**Independent Test**: Can be tested by opening multiple sessions and verifying online user count updates instantly.

**Acceptance Scenarios**:

1. **Given** user is viewing activity feed, **When** team member logs in, **Then** online users count increments immediately
2. **Given** user is viewing project workspace, **When** team member joins same project view, **Then** their presence indicator appears
3. **Given** user has active browser tab, **When** user switches to different tab or minimizes window, **Then** user status changes to "away" via Page Visibility API

---

### User Story 3 - Live Activity Feed (Priority: P2)

Users see real-time stream of activities happening across their accessible organizations and projects.

**Why this priority**: Provides situational awareness and team coordination capabilities.

**Independent Test**: Can be tested by performing actions (file upload, project creation) and verifying immediate feed updates.

**Acceptance Scenarios**:

1. **Given** user is viewing activity feed, **When** team member creates new project, **Then** activity appears instantly in feed with user avatar and timestamp
2. **Given** user has access to multiple organizations, **When** viewing activity feed, **Then** only activities from accessible orgs/projects are shown
3. **Given** activity feed is showing 50 recent items, **When** new activity occurs, **Then** oldest item is removed and new item appears at top

---

### User Story 4 - Connection Resilience (Priority: P3)

Users maintain reliable WebSocket connections with automatic reconnection and graceful degradation.

**Why this priority**: Ensures robust user experience under network conditions but not core functionality.

**Independent Test**: Can be tested by simulating network interruptions and verifying automatic recovery.

**Acceptance Scenarios**:

1. **Given** user has stable connection, **When** network briefly disconnects, **Then** connection automatically reconnects within 5 seconds
2. **Given** user's connection fails 3 times, **When** reconnection attempts exhaust, **Then** clear error message explains fallback to page refresh notifications
3. **Given** user is on slow network, **When** heartbeat timeout occurs, **Then** connection gracefully degrades with user notification

---

### Edge Cases

- When Redis becomes unavailable: System maintains in-memory message queue (maximum 1000 messages per connection, 5-minute retention) and automatically flushes queued messages when Redis reconnects, with connection degradation notification to users after 30 seconds of Redis unavailability
- When user exceeds 100 msgs/min: System sends rate limit warning and throttles connection to 1 message per 10 seconds
- When user's session expires during WebSocket connection: System attempts JWT fallback authentication, gracefully closes if JWT unavailable
- When malformed WebSocket messages or injection attempts occur: System validates all incoming messages against structured envelope schema, logs security violations with client IP, temporarily blocks connections with >3 malformed messages per minute, and responds with error message without exposing internal details

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST provide WebSocket support through Django Channels with Redis channel layer backend
- **FR-002**: System MUST support both session-based and JWT token authentication with automatic fallback
- **FR-003**: Users MUST be able to establish WebSocket connections at `/ws/notifications`, `/ws/presence`, and `/ws/activity`
- **FR-004**: System MUST maintain stable connections with 30-second heartbeat and automatic reconnection
- **FR-005**: System MUST broadcast messages to tenant-specific scopes (user, organization, project) based on permissions
- **FR-006**: System MUST handle notification, presence, and activity message types using structured envelope format: {meta: {type, id, timestamp}, payload: {data}, auth: {user_id, scope}}
- **FR-007**: System MUST queue messages for temporarily disconnected users and deliver upon reconnection
- **FR-008**: System MUST limit connections to 100 messages per minute, sending warning and throttling to 1 message per 10 seconds when exceeded
- **FR-009**: System MUST validate user identity on connection and reject unauthenticated attempts
- **FR-010**: System MUST track specific metrics via Prometheus: websocket_connections_total (counter), websocket_connections_active (gauge), websocket_messages_sent_total (counter), websocket_messages_received_total (counter), websocket_message_delivery_seconds (histogram), websocket_errors_total (counter by type), websocket_rate_limit_violations_total (counter)
- **FR-011**: System MUST provide health status endpoint at `/health/websocket`
- **FR-012**: System MUST log connection events and errors with correlation IDs for debugging

- **FR-014**: System MUST detect user presence using Page Visibility API to transition between online/away status when browser tab becomes inactive
- **FR-015**: System MUST attempt JWT fallback authentication when session expires, gracefully closing connection if JWT unavailable

### Key Entities *(include if feature involves data)*

- **WebSocket Connection**: Represents active user connection with properties (user_id, connection_id, channel_name, authenticated_at, last_heartbeat, message_count) and relationships to User, Organizations/Projects
- **Real-time Message**: Represents broadcast message using structured envelope format with meta (type, id, timestamp), payload (message data), and auth (user_id, scope) sections, with relationships to Connection(s) and originating User
- **Presence Status**: Represents user's current availability with properties (user_id, status, last_seen, current_location) visible within Organization/Project scope
- **Activity Event**: Represents system activity with properties (event_id, actor_user_id, action_type, resource_type, resource_id, organization_id, project_id, occurred_at)

## Constitution Alignment *(mandatory)*

<!--
  Verify this feature complies with the Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md
-->

### Product-Agnostic Constraint (Principle I)
- [ ] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [ ] All functionality is reusable across multiple downstream products
- [ ] Extension points are clearly documented if product-specific behavior is needed

### Architecture & Modularity (Principle II)
- [ ] Feature respects clear layering and single responsibility per Django app
- [ ] No circular dependencies introduced
- [ ] Extension points are stable and documented

### Code Quality (Principle III)
- [ ] Python 3.12+ baseline maintained
- [ ] Type hints will be used in core modules
- [ ] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [ ] Test plan includes pytest + pytest-django tests
- [ ] Coverage targets defined
- [ ] Integration tests planned for key flows

### Security & Privacy (Principle V)
- [ ] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [ ] No secrets in code; env vars/secret managers documented
- [ ] Authentication/authorization handled through centralized mechanisms
- [ ] No sensitive data will be logged

### Performance & Reliability (Principle VI)
- [ ] No N+1 queries (query optimization plan documented if applicable)
- [ ] Pagination implemented for unbounded responses
- [ ] Structured logging and metrics hooks included
- [ ] Graceful degradation strategy defined for failure scenarios

### API Design (Principle VII)
- [ ] DRF standards followed
- [ ] API responses are consistent and documented
- [ ] Breaking changes use versioning or deprecation paths
- [ ] Validation occurs at boundary (serializers/forms)

### Documentation (Principle XI)
- [ ] Feature documentation plan included
- [ ] Extension guide updates identified if applicable
- [ ] ADR planned if major architectural decision involved

**Violations Requiring Justification**: [List any principle violations and why simpler alternatives were rejected, or write "None"]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 95% of notifications delivered within 100ms of event occurrence
- **SC-002**: System handles 1000 concurrent WebSocket connections per server instance without degradation
- **SC-003**: 99% connection uptime with automatic reconnection within 5 seconds of interruption
- **SC-004**: 99.9% message delivery rate with queue fallback for temporary disconnections
- **SC-005**: 100% of connections authenticated through either session or JWT validation
- **SC-006**: System blocks 100% of connections exceeding 100 messages/minute rate limit
- **SC-007**: All connection events, errors, and performance metrics captured in observability system
- **SC-008**: 100% of users only receive messages from accessible organizations/projects (tenant isolation)

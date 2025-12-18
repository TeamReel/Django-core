# Tasks: Real-time WebSocket Infrastructure

**Feature**: Real-time WebSocket Infrastructure
**Branch**: `035-real-time-websocket`
**Status**: Ready for Implementation
**Last Updated**: December 18, 2025

## Work Packages Overview

This feature is broken down into 6 work packages that can be developed and deployed incrementally. Each work package delivers independent value and includes its own testing and validation.

### Package Priorities
- **WP01-WP02**: Foundation (required for MVP)
- **WP03**: Core value (User Story 1 - Notifications)
- **WP04-WP05**: Enhanced features (User Stories 2-3)
- **WP06**: Production readiness

---

## Setup & Foundation

### WP01 - Infrastructure Setup
**Priority**: P1 (Blocker)
**Estimated Effort**: 2-3 days
**Dependencies**: None
**Prompt**: [WP01-infrastructure-setup.md](tasks/done/WP01-infrastructure-setup.md)

**Goal**: Establish Django Channels infrastructure with Redis integration and basic WebSocket routing.

**Subtasks**:
- [x] **T001**: Install and configure Django Channels dependencies
- [x] **T002**: Configure ASGI application with WebSocket routing
- [x] **T003**: Set up Redis channel layer configuration
- [x] **T004**: Create base WebSocket consumer class with authentication for three endpoints (/ws/notifications, /ws/presence, /ws/activity)
- [x] **T005**: Implement JWT fallback authentication mechanism
- [x] **T006**: Create Docker composition for Redis service

**Success Criteria**:
- WebSocket connection can be established at `/ws/test/`
- Session authentication works for authenticated users
- JWT fallback authentication functions correctly
- Redis channel layer is operational

**Risks**:
- Django Channels version compatibility issues
- Redis channel layer configuration in different environments

---

### WP02 - Data Models & Migrations
**Priority**: P1 (Blocker)
**Estimated Effort**: 1-2 days
**Dependencies**: WP01 complete
**Prompt**: [WP02-data-models-migrations.md](tasks/done/WP02-data-models-migrations.md)

**Goal**: Create database models for WebSocket connections, messages, presence, and activity tracking.

**Subtasks**:
- [x] **T007**: Create WebSocketConnection model with validation
- [x] **T008**: Create RealtimeMessage model with envelope format
- [x] **T009**: Create PresenceStatus model with unique constraints
- [x] **T010**: Create ActivityEvent model for audit logging
- [x] **T011**: Generate and run database migrations
- [x] **T012**: Add database indexes for performance optimization

**Success Criteria**:
- All models created with proper field validation
- Database migrations apply cleanly
- Performance indexes are in place
- Models integrate with existing User/Organization/Project models

**Risks**:
- Migration conflicts with existing schema
- Performance impact of new indexes

---

## Core Features

### WP03 - Real-time Notifications (User Story 1)
**Priority**: P1 (MVP Core)
**Estimated Effort**: 3-4 days
**Dependencies**: WP01, WP02 complete
**Prompt**: [WP03-realtime-notifications.md](tasks/done/WP03-realtime-notifications.md)

**Goal**: Implement instant notification delivery system with tenant scoping and message queuing.

**Subtasks**:
- [x] **T013**: Create NotificationConsumer with channel group management
- [x] **T014**: Implement tenant-scoped broadcasting (user/org/project)
- [x] **T015**: Build structured envelope message formatting
- [x] **T016**: Create notification services for triggering events
- [x] **T017**: Implement in-memory queuing for Redis failures
- [x] **T018**: Add connection state management and cleanup

**Success Criteria**:
- Notifications deliver instantly without page refresh
- Multi-tab synchronization works correctly
- Messages are properly scoped to user permissions
- Redis failure mode works with in-memory queuing

**Risks**:
- Message delivery race conditions
- Memory consumption during Redis outages
- Permission validation complexity

---

### WP04 - Live Presence Tracking (User Story 2)
**Priority**: P2 (Enhanced)
**Estimated Effort**: 2-3 days
**Dependencies**: WP03 complete
**Prompt**: [WP04-live-presence-tracking.md](tasks/planned/WP04-live-presence-tracking.md)

**Goal**: Real-time user presence status with Page Visibility API integration.

**Subtasks**:
- [ ] **T019**: Create PresenceConsumer for status broadcasting
- [ ] **T020**: Implement Page Visibility API detection
- [ ] **T021**: Build presence update services and status management
- [ ] **T022**: Add online user counting per organization
- [ ] **T023**: Implement presence cleanup for disconnected users

**Success Criteria**:
- User presence updates in real-time across organization
- Page visibility triggers status changes correctly
- Online user counts are accurate and updated live
- Stale presence data is cleaned up automatically

**Risks**:
- Page Visibility API browser compatibility
- Presence data consistency across multiple connections

---

### WP05 - Activity Feed & Monitoring (User Story 3)
**Priority**: P2 (Enhanced)
**Estimated Effort**: 2-3 days
**Dependencies**: WP04 complete
**Prompt**: [WP05-activity-feed-monitoring.md](tasks/done/WP05-activity-feed-monitoring.md)

**Goal**: Live activity stream with system monitoring and metrics integration.

**Subtasks**:
- [x] **T024**: Create ActivityConsumer for live activity updates
- [x] **T025**: Implement activity event logging and broadcasting
- [x] **T026**: Add Prometheus metrics: websocket_connections_total, websocket_connections_active, websocket_messages_sent/received_total, websocket_message_delivery_seconds, websocket_errors_total, websocket_rate_limit_violations_total
- [x] **T027**: Create health check endpoints at /health/websocket with Redis connectivity and connection count status
- [x] **T028**: Build activity feed aggregation and filtering

**Success Criteria**:
- Activity events stream in real-time to relevant users
- Prometheus metrics capture connection and message data
- Health endpoints provide WebSocket service status
- Activity feed shows relevant events with proper permissions

**Risks**:
- High activity volume causing performance issues
- Metrics collection overhead
- Activity permission filtering complexity

---

## Production & Demo

### WP06 - Rate Limiting & Demo Integration
**Priority**: P3 (Polish)
**Estimated Effort**: 2-3 days
**Dependencies**: WP05 complete
**Prompt**: [WP06-rate-limiting-demo.md](tasks/planned/WP06-rate-limiting-demo.md)

**Goal**: Production-ready rate limiting with comprehensive demo interface.

**Subtasks**:
- [ ] **T029**: Implement rate limiting with Redis-based tracking
- [ ] **T030**: Add throttling and warning message system
- [ ] **T031**: Create comprehensive demo page at `/demo/realtime`
- [ ] **T032**: Build connection testing and monitoring interface
- [ ] **T033**: Add manual notification triggers for demonstration
- [ ] **T034**: Implement error handling and connection recovery

**Success Criteria**:
- Rate limiting prevents abuse while maintaining usability
- Demo page showcases all WebSocket functionality
- Connection recovery works seamlessly
- Error messages are clear and actionable

**Risks**:
- Rate limiting false positives
- Demo complexity overwhelming users
- Edge case handling in production scenarios

---

## Implementation Notes

### Parallelization Opportunities
- **Phase 1**: WP01 and WP02 can start simultaneously (different concerns)
- **Phase 2**: WP04 and WP05 can be developed in parallel after WP03
- **Testing**: Each work package includes independent test scenarios

### MVP Recommendation
**Minimum Viable Product**: Complete WP01-WP03
- Provides core real-time notification infrastructure
- Demonstrates WebSocket functionality with authentication
- Includes essential monitoring and error handling
- Delivers primary user value (User Story 1)

### Dependencies Summary
```
WP01 (Infrastructure) → WP02 (Data Models) → WP03 (Notifications)
                                          ↘ WP04 (Presence) ↘
                                                         WP05 (Activity) → WP06 (Demo)
```

### Integration Points
- **B05 (Authentication)**: Session validation and user model integration
- **B06 (Organizations)**: Tenant scoping for message broadcasting
- **B07 (Projects)**: Project-level activity and notification scoping
- **B08 (Permissions)**: Authorization checks for message delivery
- **B09 (Audit)**: Connection and message event logging

### Success Metrics
- **Performance**: 1000 concurrent connections, <100ms message delivery
- **Reliability**: 99% uptime, automatic reconnection within 5 seconds
- **Security**: 100% authentication coverage, proper tenant isolation
- **Usability**: Demo page showcases all functionality with clear testing

---

**Next Steps**: Start with WP01 to establish the infrastructure foundation, then proceed through the packages in sequence or parallelize where dependencies allow.

# B17: Contextual Notification Service

**Phase:** 4
**Status:** ✅ Done
**Module ID:** 017
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 17. B17 – Contextual Notification Service

**Doel**: Higher-level routing en filtering van notifications per context (org/project).

**Status**: ✅ Complete

**Key Features**:
- Context-aware routing rules
- Notification filtering by user preferences
- Org/project-level notification settings
- Batch notification delivery
- Integration with B16 baseline

---

**Fase 4 Compleet**: 5 modules (B13-B17)
**Outcome**: Backend can serve APIs, basic UI, async work and notifications
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Contextual Notification Service
*Path: [kitty-specs/017-contextual-notification-service/spec.md](../../../../kitty-specs/017-contextual-notification-service/spec.md)*

**Feature Branch**: `017-contextual-notification-service`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Add a higher-level contextual notification service that routes, filters and targets notifications based on user, organisation, project and event type."

## Clarifications

### Session 2025-12-02

- Q: How is event priority determined for routing decisions? → A: Routing rules define priority per event type during configuration
- Q: What is the scope for detecting duplicate events to suppress? → A: Per user + event type + resource ID (user gets 1 notification per project, but multiple projects = multiple notifications)
- Q: Does B12 User Preferences feature currently exist? → A: Yes, B12 exists as i18n_preferences app (language/locale/timezone only). B17 will implement its own notification preferences storage with adapter interface for future integration.
- Q: How should queued notifications be sent after quiet hours end? → A: Rate-limited delivery (e.g., 10/minute to avoid spam) - no burst at 8am
- Q: Who can configure routing rules? → A: Both - superadmins for global rules, org admins for org-specific overrides

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Domain Event Triggers Targeted Notifications (Priority: P1)

A developer emits a domain event (e.g., "project.updated"), and the contextual notification service automatically determines which users should be notified and via which channels, without the developer needing to specify recipients or channels manually.

**Why this priority**: Core value proposition - simplifies notification integration for domain code and ensures consistent notification behavior across the platform.

**Independent Test**: Emit a single domain event (e.g., project created) and verify that project owner receives email and in-app notification while non-members receive nothing.

**Acceptance Scenarios**:

1. **Given** a project is created by User A in Organisation X, **When** the "project.created" event is emitted, **Then** User A receives an in-app notification and email confirmation
2. **Given** a project is updated by User B, **When** the "project.updated" event is emitted, **Then** only project members receive notifications, not all organisation members
3. **Given** a user is added to a project, **When** the "project.member_added" event is emitted, **Then** the new member receives a welcome notification via their preferred channel
4. **Given** an invalid event type is emitted, **When** the service processes it, **Then** it logs a warning and does not send any notifications

---

### User Story 2 - User Controls Notification Preferences (Priority: P2)

Users configure their notification preferences (e.g., "only email for high-priority events", "no in-app notifications for project updates"), and the routing service respects these preferences when dispatching notifications.

**Why this priority**: Essential for reducing notification fatigue and respecting user autonomy. Builds on B12 preferences framework.

**Independent Test**: User disables email notifications for "project.updated" events, then trigger such an event. Verify user receives in-app notification only.

**Acceptance Scenarios**:

1. **Given** User A has disabled email notifications for "project.updated" events, **When** such an event occurs, **Then** User A receives only in-app notifications
2. **Given** User B has set "high priority events only" preference, **When** a low-priority event occurs, **Then** User B receives no notification
3. **Given** User C has enabled all channels for "project.member_added" events, **When** such an event occurs, **Then** User C receives email, in-app, and webhook notifications (if configured)
4. **Given** User D has no explicit preferences set, **When** any event occurs, **Then** system uses default notification behavior for that event type

---

### User Story 3 - Organisation Admin Sets Notification Policies (Priority: P2)

An organisation admin configures organisation-level notification policies (e.g., "disable webhooks for all low-priority events", "require email for security events"), which override or supplement individual user preferences where appropriate.

**Why this priority**: Enables governance and compliance requirements, prevents notification spam at scale.

**Independent Test**: Admin disables all webhook notifications at org level. Verify that even users with webhook preferences enabled do not receive webhook notifications.

**Acceptance Scenarios**:

1. **Given** Organisation X has disabled webhook notifications, **When** any event occurs, **Then** no users in Organisation X receive webhook notifications regardless of personal preferences
2. **Given** Organisation Y requires email for all "security.*" events, **When** a security event occurs, **Then** all relevant users receive email even if they disabled email notifications
3. **Given** Organisation Z has set a global "quiet hours" policy (8pm-8am), **When** a non-urgent event occurs during quiet hours, **Then** notifications are queued and sent after 8am with rate-limiting (e.g., 10/minute) to avoid spam burst
4. **Given** an admin attempts to set conflicting policies, **When** saving the configuration, **Then** the system validates and rejects the conflicting rules with a clear error message

---

### User Story 4 - System Suppresses Redundant Notifications (Priority: P3)

When multiple similar events occur in a short time window (e.g., 5 "project.updated" events in 2 minutes), the system aggregates or suppresses notifications to prevent spam, sending a single summary notification instead.

**Why this priority**: Quality-of-life improvement that reduces notification fatigue without losing important information.

**Independent Test**: Trigger 5 identical event types within 1 minute. Verify only 1 aggregated notification is sent after the suppression window expires.

**Acceptance Scenarios**:

1. **Given** 5 "project.updated" events occur within 2 minutes for the same project, **When** the suppression window expires, **Then** users receive a single notification summarizing all updates
2. **Given** 2 "project.updated" events occur 10 minutes apart, **When** each event is processed, **Then** users receive separate notifications (no suppression)
3. **Given** a high-priority event occurs during an active suppression window, **When** the event is processed, **Then** the high-priority event bypasses suppression and is sent immediately
4. **Given** suppression is configured for a specific event type, **When** that event type occurs, **Then** only that event type is suppressed, not other event types

---

### User Story 5 - Developer Debugs Notification Routing (Priority: P3)

A developer or support agent needs to understand why a user did or did not receive a notification. They access routing decision logs that show which rules were evaluated and why a notification was sent, suppressed, or filtered out.

**Why this priority**: Critical for troubleshooting and support, but doesn't block core functionality.

**Independent Test**: Review audit logs after a notification is sent/suppressed. Verify logs contain event type, user, matched rules, and decision rationale.

**Acceptance Scenarios**:

1. **Given** a notification was sent to User A, **When** viewing audit logs, **Then** logs show event type, matched routing rule, applied user preferences, and selected channels
2. **Given** a notification was suppressed for User B, **When** viewing audit logs, **Then** logs show suppression reason (e.g., "user preference", "org policy", "rate limit")
3. **Given** a notification failed to send, **When** viewing audit logs, **Then** logs show failure reason, retry attempts, and any error details
4. **Given** a support agent searches for all routing decisions for a specific event, **When** querying logs, **Then** results show all users evaluated and their individual routing outcomes

---

### Edge Cases

- What happens when a user belongs to multiple organisations with conflicting notification policies? (Decision: Organisation-specific rules apply only within that org's context; system requires event context to include org scope)
- How does system handle routing when user preferences conflict with organisation policies? (Decision: Org policies take precedence for security/compliance events; user preferences take precedence otherwise; document priority hierarchy)
- What happens if an event type has no routing rules configured? (Decision: System uses safe default - notify via in-app channel only to directly involved users; log warning for missing rule)
- How does system handle extremely high event volumes (e.g., 10,000 events/second)? (Decision: Async processing via Celery queue; apply backpressure if queue depth exceeds threshold; document performance limits)
- What happens when B16 notification delivery fails? (Decision: Contextual service logs routing decision; B16 handles retries; no duplicate routing on retry)
- How are notifications routed for deleted/deactivated users? (Decision: Skip notification; log as informational event; no error)
- What happens when event payload is missing required context (e.g., no user_id or org_id)? (Decision: Reject event; log error; require all events to include minimal context schema)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept domain events with event type, context (user, organisation, project), and payload
- **FR-002**: System MUST evaluate routing rules based on event type and context to determine target users
- **FR-003**: System MUST apply basic conditional logic (e.g., "IF user is project owner AND event is project.updated THEN notify via email")
- **FR-004**: System MUST respect user notification preferences from B12 when selecting channels
- **FR-005**: System MUST respect organisation-level notification policies that override or supplement user preferences
- **FR-006**: System MUST integrate with B16 notifications baseline to dispatch notifications via appropriate channels
- **FR-007**: System MUST support suppression/aggregation of duplicate or similar notifications within a configurable time window
- **FR-008**: System MUST log all routing decisions (event received, rules evaluated, users targeted, channels selected, suppression applied) for audit and debugging
- **FR-009**: System MUST provide a simple API/interface for domain code to emit events without coupling to notification implementation details
- **FR-010**: System MUST validate event schema and reject malformed events with clear error messages
- **FR-011**: System MUST handle routing for at least these event types: project.created, project.updated, project.member_added, org.member_invited, org.settings_changed
- **FR-012**: System MUST support default routing rules for each event type that apply when no custom rules are configured
- **FR-013**: System MUST allow configuration of routing rules via admin interface or management command; platform superadmins configure global rules, organisation admins configure org-specific overrides
- **FR-014**: System MUST check feature flags from B10 to enable/disable specific notification features at org or user level
- **FR-015**: System MUST process events asynchronously to avoid blocking domain code execution

### Key Entities *(include if feature involves data)*

- **Event**: Represents a domain event (type, timestamp, context including user/org/project IDs, payload); used for routing decisions
- **RoutingRule**: Defines conditions (event type + context filters) and actions (notify which users via which channels); supports basic conditional logic; includes priority level for the event type; can be global (platform-wide) or org-specific
- **NotificationPreference**: User-level preferences for notification channels and event types; stored in B17 with adapter interface for future integration
- **OrganisationNotificationPolicy**: Org-level policies that override or supplement user preferences; includes quiet hours, required channels, disabled channels
- **SuppressionWindow**: Tracks recent notifications per user/event type/resource ID combination to detect and suppress duplicates within configurable time window; includes aggregation logic
- **RoutingDecisionLog**: Audit record of routing decisions (event, evaluated rules, target users, selected channels, outcome); linked to B09 audit events

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

*Justification*: Contextual notification routing is a generic capability. Event types (project.*, org.*) represent domain concepts, not product features. Routing rules are configurable and extensible for any downstream product.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

*Justification*: Creates new `contextual_notifications` app. Depends on B16 (notifications), B10 (settings), B12 (preferences), B08 (permissions for org policies), B09 (audit). No reverse dependencies. Provides clear event emission API for domain code.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

*Justification*: Will include unit tests for routing logic, integration tests for event emission → notification delivery flow, and tests for preference/policy override behavior. Target 90%+ coverage.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

*Justification*: Event payloads may contain sensitive data - will redact/mask in logs. Routing decision logs use B09 audit. Org policy configuration requires appropriate permissions via B08. Event emission API validates caller context.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

*Justification*: Async event processing via Celery. Bulk user lookups with select_related/prefetch_related. If routing fails, event is logged and can be replayed. If B16 delivery fails, B16 handles retries (no duplicate routing). Metrics tracked: events processed, routing time, users notified, suppressions applied.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

*Justification*: Event emission API uses standard validation. Routing rule configuration via DRF serializers. Admin API for querying routing logs follows DRF conventions.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

*Justification*: Will document: (1) How to emit events from domain code, (2) How to configure routing rules, (3) How user preferences and org policies interact, (4) How to debug routing decisions. ADR for routing rule evaluation order and suppression strategy.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can emit domain events and trigger notifications without directly calling notification APIs (decoupled integration verified in at least 3 domain areas: projects, organisations, user management)
- **SC-002**: Users receive relevant notifications with 95% accuracy (correct recipients, correct channels, correct content) based on routing rules and preferences
- **SC-003**: Notification volume is reduced by at least 30% through suppression and aggregation compared to naive "notify everyone" approach
- **SC-004**: Routing decision logs enable support agents to answer "why didn't I get notified?" questions within 2 minutes of investigation
- **SC-005**: System processes at least 1000 events per minute without queue backlog exceeding 10 seconds
- **SC-006**: User can update notification preferences and see changes reflected in subsequent notifications within 1 minute
- **SC-007**: Organisation admin can configure notification policy and see changes applied to all org members within 5 minutes
- **SC-008**: Zero security incidents related to unauthorized access to notification routing configuration or event data

## Assumptions *(include if relevant)*

- **A-001**: B16 notifications baseline is fully functional and provides reliable email, in-app, and webhook delivery
- **A-002**: B12 i18n_preferences exists for language/locale/timezone but does not handle notification preferences; B17 will implement dedicated NotificationPreference model with adapter interface for potential future B10 settings integration
- **A-003**: B10 settings/feature flags is available for enabling/disabling notification features at org/user level
- **A-004**: B08 permissions framework is available for protecting org-level notification policy configuration
- **A-005**: Domain events follow a consistent schema (type, context, payload) and include sufficient context (user_id, org_id, project_id where applicable)
- **A-006**: Celery and Redis are configured and operational for async event processing
- **A-007**: Routing rules are initially configured by developers/admins via management commands or admin interface, not by end users (self-service rule configuration is a future enhancement)
- **A-008**: Event volume remains under 10,000 events/minute in MVP; horizontal scaling strategy is deferred to future iteration
- **A-009**: Initial routing logic supports "AND" conditions only (e.g., "event type = X AND user role = Y"); "OR" and complex boolean logic deferred to future iteration
- **A-010**: Suppression windows are configured globally per event type; per-user or per-org suppression customization is deferred

## Dependencies *(include if relevant)*

- **B16 Notifications Baseline**: Required for dispatching notifications via email, in-app, webhook channels
- **B10 Settings & Feature Flags**: Required for enabling/disabling notification features at org/user level
- **B12 i18n Preferences**: Not a direct dependency (handles only language/locale/timezone); B17 implements its own notification preferences
- **B08 Hierarchical Access Control**: Required for protecting org-level notification policy configuration
- **B09 Audit Logging System**: Required for storing routing decision logs and audit trail
- **B06 Organisation Management**: Required for organisation-level policy scope and multi-tenancy
- **B07 Projects & Workspaces**: Required for project-level context in routing decisions
- **B15 Tasks & Scheduling Foundation**: Required for async event processing via Celery

## Out of Scope *(include if helpful)*

- Rich campaign or marketing automation logic (e.g., A/B testing notification content, scheduled campaigns)
- External customer engagement tool integrations (e.g., SendGrid campaigns, Mailchimp, Intercom)
- Complex analytics dashboards for notification performance (open rates, click-through rates, conversion tracking)
- Self-service routing rule configuration by end users (admin-only in MVP)
- "OR" conditions or complex boolean logic in routing rules (AND-only in MVP)
- Per-user or per-org suppression window customization (global config only in MVP)
- Real-time notification routing (async processing via Celery is acceptable for MVP)
- Multi-region or geo-distributed routing (single region only)
- Machine learning-based personalization or smart routing ("best channel" predictions)
- Notification content templating or localization (B16 handles content; this feature handles routing only)

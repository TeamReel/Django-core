# B09: Audit Logging

**Phase:** 3
**Status:** ✅ Done
**Module ID:** 009
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 9. B09 – Audit Logging System

**Doel**: Structured audit logs voor security events, config changes, belangrijke operaties.

**Status**: ✅ Complete

**Key Features**:
- AuditEvent model with JSONField metadata
- Event type registry
- GIN indexes for metadata queries
- Integration with django-prometheus (metrics)
- Signal-based logging hooks
- Contextual metadata (user, org, project, IP)

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Audit Logging System
*Path: [kitty-specs/009-audit-logging-system/spec.md](../../../../kitty-specs/009-audit-logging-system/spec.md)*

**Feature Branch**: `009-audit-logging-system`
**Created**: 2025-11-27
**Status**: Draft
**Input**: User description: "Provide a structured, extensible audit logging system for recording important security- and configuration-sensitive actions across the platform, with clean APIs for writing and retrieving audit events."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Records Audit Events (Priority: P1)

As a developer implementing a feature, I can emit structured audit events from any Django app or business action using a simple, consistent API. When a security-sensitive action occurs (authentication, permission change, config update), I call the audit logging API with event type, actor, context, and metadata, and the system reliably records it for later review.

**Why this priority**: This is the foundation - without the ability to record events, the system has no value. All other stories depend on events being captured.

**Independent Test**: Can be fully tested by calling the audit logging API from a simple Django view or management command and verifying the event appears in the database with correct fields (actor, timestamp, event type, metadata).

**Acceptance Scenarios**:

1. **Given** a user authenticates successfully, **When** the authentication handler calls `audit_log.record(event_type='auth.login', user=user, metadata={'ip': ip_address})`, **Then** an audit event is created with timestamp, user reference, event type, and IP metadata
2. **Given** a permission is granted to a user, **When** the permission handler calls `audit_log.record(event_type='permission.granted', user=admin, target_user=user, resource=role, metadata={'scope': 'organization'})`, **Then** an audit event captures who granted what permission to whom
3. **Given** a configuration setting is changed, **When** the config API calls `audit_log.record(event_type='config.updated', user=admin, metadata={'setting': 'retention_days', 'old_value': 90, 'new_value': 180})`, **Then** an audit event records the configuration change with before/after values
4. **Given** an event recording fails due to database error, **When** the audit API encounters an exception, **Then** it logs the failure to standard logging but does not crash the calling code (graceful degradation)

---

### User Story 2 - Auditor Searches and Filters Events (Priority: P1)

As an auditor or security officer, I can search and filter audit events in the Django admin UI by user, event type, date range, organization, and project. I can quickly locate specific events (e.g., "all permission changes by this admin in the last 30 days") to investigate incidents, verify compliance, or reconstruct security-relevant actions.

**Why this priority**: Recording events is useless without the ability to search them. This is the primary interface for consuming audit data and must be part of the MVP.

**Independent Test**: Can be fully tested by creating sample audit events via the API, then opening Django admin and verifying that filters (user, event type, date range, organization) work correctly and return expected results.

**Acceptance Scenarios**:

1. **Given** 1000 audit events exist, **When** an auditor filters by user="john@example.com" and date_range="last 7 days", **Then** only events matching both criteria are displayed
2. **Given** events span multiple organizations, **When** an auditor filters by organization="Acme Corp", **Then** only events related to that organization are shown
3. **Given** mixed event types exist, **When** an auditor filters by event_type="permission.granted", **Then** only permission grant events are displayed
4. **Given** an auditor searches for events, **When** results exceed 100 items, **Then** pagination is applied and the auditor can navigate through pages
5. **Given** an auditor needs event details, **When** clicking on an event in the list, **Then** full event details are displayed including all metadata fields

---

### User Story 3 - Security Officer Reconstructs Incident Timeline (Priority: P2)

As a security officer investigating a potential security incident, I can view a chronological timeline of events related to a specific user, resource, or organization. I can see who accessed what, when permissions changed, and what configurations were modified, enabling me to reconstruct the sequence of actions during the incident window.

**Why this priority**: While basic search (P1) lets you filter events, this story adds the ability to construct narratives and timelines - critical for security investigations but can be built after basic filtering works.

**Independent Test**: Can be fully tested by creating a sequence of related events (e.g., user login → permission granted → resource accessed → permission revoked) and verifying they can be retrieved in chronological order with clear relationships.

**Acceptance Scenarios**:

1. **Given** a user "alice@example.com" performed multiple actions, **When** a security officer views events for that user, **Then** events are displayed in chronological order (newest first by default, sortable)
2. **Given** events reference related entities (user, organization, project), **When** viewing an event, **Then** links to related entities are displayed for quick navigation
3. **Given** a permission was granted then revoked, **When** viewing the grant event, **Then** the security officer can see if/when it was later revoked (relationship between events)
4. **Given** an incident occurred in a specific time window, **When** filtering by start_time="2025-11-20 14:00" and end_time="2025-11-20 16:00", **Then** only events within that window are shown

---

### User Story 4 - Admin Exports Audit Events for External Analysis (Priority: P3)

As an admin or compliance officer, I can export filtered audit events to CSV or JSON format for import into external analysis tools, SIEM systems, or compliance reporting platforms. This allows integration with existing security infrastructure without building custom APIs.

**Why this priority**: Nice to have for advanced workflows, but not essential for core audit functionality. Can be added after basic recording and search are proven.

**Independent Test**: Can be fully tested by filtering events in Django admin, clicking an "Export" button, and verifying the downloaded file contains all filtered events in the specified format with all required fields.

**Acceptance Scenarios**:

1. **Given** 50 filtered events are displayed, **When** an admin clicks "Export to CSV", **Then** a CSV file is downloaded containing all 50 events with columns: timestamp, user, event_type, organization, project, metadata
2. **Given** events contain nested metadata, **When** exporting to JSON, **Then** the JSON file preserves the full metadata structure (not flattened)
3. **Given** an admin exports 10,000 events, **When** the export is triggered, **Then** the export completes within 30 seconds or provides async download link for large exports

---

### User Story 5 - System Integrates with B08 Permission System (Priority: P1)

As a system administrator, I want audit events to automatically capture permission checks and role assignments from the B08 Hierarchical Access Control system, so that all permission-related actions are logged without requiring manual instrumentation in every permission check.

**Why this priority**: B08 integration is explicitly called out as a goal and provides immediate value by automatically capturing a high-value category of events. Should be built alongside core event recording.

**Independent Test**: Can be fully tested by performing permission checks and role assignments through B08 APIs and verifying that corresponding audit events are created automatically without explicit audit_log calls.

**Acceptance Scenarios**:

1. **Given** a user's permission is checked via `evaluator.check_permission()`, **When** the check completes, **Then** an audit event is created with event_type="permission.checked", result="allowed" or "denied", and permission details
2. **Given** a role is assigned to a user, **When** `RoleAssignment.objects.create()` is called, **Then** an audit event is created with event_type="role.assigned" capturing who assigned the role, to whom, and at what scope
3. **Given** a role is removed from a user, **When** the role assignment is deleted, **Then** an audit event is created with event_type="role.revoked" capturing the removal details
4. **Given** B08 is not installed or disabled, **When** the audit system initializes, **Then** it gracefully degrades and continues to work for non-B08 events (optional integration)

---

### Edge Cases

- What happens when the database is unavailable during event recording? (System logs to fallback logger, does not crash, retries on next event if configured)
- How does the system handle extremely large metadata payloads? (Enforce 10KB max metadata JSON size, reject event with ValueError if exceeded)
- What happens when a user is deleted but has audit events? (User reference uses soft foreign key or nullable FK to preserve events even after user deletion)
- How are events recorded for system actions with no user? (Support null user field, record system_actor="background_task" or similar in metadata)
- What if two events are recorded with identical timestamps? (Include microsecond precision and auto-increment ID for ordering)
- How are sensitive fields in metadata protected? (Document which fields should never be logged - passwords, tokens, PII - provide examples and linting guidance)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Python API for recording audit events with required fields: event_type, timestamp, user (nullable), organization (nullable), project (nullable), and extensible metadata (JSON). Metadata exceeding 10KB must raise ValueError and reject the event
- **FR-002**: System MUST persist audit events to PostgreSQL with automatic timestamp capture (created_at field)
- **FR-003**: System MUST support at least these event type categories: authentication (auth.*), permission (permission.*), configuration (config.*), role management (role.*), resource access (resource.*)
- **FR-004**: System MUST provide Django admin interface for searching and filtering audit events by user, event_type, date range, organization, and project
- **FR-005**: System MUST paginate audit event listings to handle large result sets (default 100 per page)
- **FR-006**: System MUST fail gracefully when event recording fails (log to standard Django logger, do not raise exceptions that crash calling code)
- **FR-007**: System MUST integrate with B08 Hierarchical Access Control to automatically log permission checks and role assignments/revocations
- **FR-008**: System MUST support null values for user, organization, and project fields to handle system-generated events and cross-entity actions
- **FR-009**: System MUST provide a management command for seeding example audit events for testing and demonstration purposes
- **FR-010**: System MUST document retention policy with 90 days as recommended default (1 year for compliance-sensitive environments) without enforcing automated deletion in MVP
- **FR-011**: System MUST support exporting filtered audit events to CSV format from Django admin
- **FR-012**: System MUST include indexes on frequently-queried fields (user, event_type, created_at, organization, project) for search performance
- **FR-013**: System MUST validate event_type follows naming convention (category.action format, lowercase with underscores, e.g., "auth.login", "permission.checked")
- **FR-014**: System MUST capture IP address and user agent in metadata for all events with HTTP request context (authentication, permission checks, configuration changes, etc.)
- **FR-015**: System MUST provide read-only Django admin interface (auditors can view but not edit/delete events)

### Key Entities *(include if feature involves data)*

- **AuditEvent**: Represents a single logged action with timestamp, actor (user), event type, context (organization/project), and extensible metadata. Core entity for all audit data. Relationships: belongs to User (nullable), Organization (nullable), Project (nullable).
- **EventType**: Categorizes events using dot-notation (e.g., "auth.login", "permission.granted"). Stored as string field, not separate table in MVP. Indexed for fast filtering.
- **Metadata**: JSON field containing event-specific details (e.g., IP address for logins, permission name for checks, old/new values for config changes). Structure varies by event type but must follow documented schema patterns.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [X] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [X] All functionality is reusable across multiple downstream products
- [X] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Audit logging is a pure infrastructure capability. Event types and metadata schemas can be extended by downstream products without modifying core audit system.

### Architecture & Modularity (Principle II)
- [X] Feature respects clear layering and single responsibility per Django app
- [X] No circular dependencies introduced
- [X] Extension points are stable and documented

**Justification**: Creates new `audit` Django app with clear boundaries. Integrates with B08 via signal listeners (loose coupling, no imports from B08 models). Provides public API (`audit_log.record()`) as extension point.

### Code Quality (Principle III)
- [X] Python 3.12+ baseline maintained
- [X] Type hints will be used in core modules
- [X] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [X] Test plan includes pytest + pytest-django tests
- [X] Coverage targets defined
- [X] Integration tests planned for key flows

**Coverage Targets**: >85% for audit app, 100% for audit_log API, >90% for B08 integration signal handlers.

### Security & Privacy (Principle V)
- [X] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [X] No secrets in code; env vars/secret managers documented
- [X] Authentication/authorization handled through centralized mechanisms
- [X] No sensitive data will be logged

**Privacy Considerations**: Documentation will explicitly list fields that should NEVER appear in metadata (passwords, API keys, tokens, credit card numbers). Admin interface will be read-only to prevent tampering with audit trail.

### Performance & Reliability (Principle VI)
- [X] No N+1 queries (query optimization plan documented if applicable)
- [X] Pagination implemented for unbounded responses
- [X] Structured logging and metrics hooks included
- [X] Graceful degradation strategy defined for failure scenarios

**Performance Plan**: Indexes on user_id, event_type, created_at, organization_id, project_id. Use `select_related()` for admin list view. Graceful degradation: if audit DB write fails, log to standard Django logger but don't crash calling code.

### API Design (Principle VII)
- [X] DRF standards followed
- [X] API responses are consistent and documented
- [X] Breaking changes use versioning or deprecation paths
- [X] Validation occurs at boundary (serializers/forms)

**API Notes**: Primary API is Python (`audit_log.record()`), not REST. If REST API added later (Story 4 extension), will use DRF standards. Validation occurs in `audit_log.record()` function (event_type format, metadata size limits).

### Documentation (Principle XI)
- [X] Feature documentation plan included
- [X] Extension guide updates identified if applicable
- [X] ADR planned if major architectural decision involved

**Documentation Plan**: Create `src/audit/README.md` with API usage examples, event type conventions, metadata schema patterns. Update main docs with section on "Adding Audit Events to Your App". ADR for event storage strategy (PostgreSQL JSON vs separate tables).

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can emit audit events with <5 lines of code (measure: count LOC in working examples)
- **SC-002**: Auditors can locate specific events within 30 seconds using Django admin filters (measure: user testing with sample scenarios)
- **SC-003**: System records 100 audit events per second per application instance without degrading primary application performance by more than 10ms per request (measure: load testing with concurrent writes on single instance)
- **SC-004**: Audit event search returns results in under 2 seconds for 100,000+ event database (measure: query performance tests with realistic data volume)
- **SC-005**: 95% of permission checks from B08 automatically generate corresponding audit events without manual developer action (measure: integration test coverage)
- **SC-006**: Zero security incidents go undetected due to missing audit events for critical actions (auth, permission, config) (measure: security review checklist, manual verification)
- **SC-007**: Audit data storage grows predictably at <1MB per 1000 events (measure: database size monitoring over 30 days)

## Assumptions *(if applicable)*

- B08 Hierarchical Access Control system is already implemented and provides signal hooks or middleware for permission checks (confirmed from prior context)
- PostgreSQL is the target database with JSON field support (confirmed from project baseline)
- Django admin is acceptable UI for MVP; custom React admin can be added later if needed
- Retention policy enforcement will be manual (admin runs cleanup commands) in MVP, can be automated in future iteration
- Average event rate is <10 events/second in typical usage; spikes to 100 events/second during high activity (auth storms, batch operations)
- Events older than retention period can be archived to S3 or deleted (policy TBD, implemented in future phase)
- SIEM integration will use exported CSV/JSON in MVP; real-time streaming can be added later
- IP address and user agent are available in Django request context for web-based events

## Dependencies *(if applicable)*

- **B03 (Security Baseline)**: Audit system will log authentication events; requires auth signals or middleware hooks from B03
- **B08 (Hierarchical Access Control)**: Audit system will automatically log permission checks and role assignments; requires signal hooks from B08 models and evaluator
- **B05 (Accounts)**: User model from accounts app used as foreign key for AuditEvent.user field
- **B06 (Organization Management)**: Organization model used as foreign key for AuditEvent.organization field
- **B07 (Projects/Workspaces)**: Project model used as foreign key for AuditEvent.project field

## Out of Scope *(if applicable)*

- Automated retention policy enforcement (deletion/archiving of old events)
- Advanced privacy masking rules (PII redaction, field-level encryption)
- Scheduled export jobs or real-time streaming to SIEM
- Custom React-based audit event viewer (Django admin sufficient for MVP)
- Event tamper detection or cryptographic signing (assumes trusted environment)
- Multi-region event replication or disaster recovery
- Performance telemetry or high-frequency activity logging (focus is security/config events, not system metrics)
- Legal compliance guarantees (GDPR, SOX, HIPAA) - provides tools for compliance but no formal certification

## Risks & Mitigations *(if applicable)*

- **Risk**: Audit event recording failures cause primary application to fail
  - **Mitigation**: Wrap all audit_log.record() calls in try/except, log failures to standard logger, continue execution
- **Risk**: Database fills up with audit events
  - **Mitigation**: Document retention policy in README, provide management command for manual cleanup, monitor storage growth
- **Risk**: N+1 queries slow down audit event search in Django admin
  - **Mitigation**: Use select_related() for user/organization/project FKs, add indexes on filter fields, paginate results
- **Risk**: Sensitive data accidentally logged in metadata
  - **Mitigation**: Document prohibited fields clearly, provide linting examples, code review checklist item
- **Risk**: B08 integration breaks if B08 API changes
  - **Mitigation**: Use Django signals for loose coupling, version-check B08 app in audit app config, gracefully degrade if B08 not installed
- **Risk**: Audit events become legal evidence, tampering concerns
  - **Mitigation**: Django admin is read-only, no delete permission. Future: add cryptographic signatures or immutable storage if legally required

## Open Questions *(track items needing clarification)*

*None - all critical decisions resolved during discovery phase.*

---

## Clarifications

### Session 2025-11-27

**Q1: Metadata Size Enforcement** - What should happen when metadata exceeds 10KB limit?
- **Answer**: Reject the entire event (raise exception, don't record)
- **Impact**: FR-001 will include size validation that raises `ValueError` when metadata exceeds 10KB JSON size

**Q2: Default Retention Period** - What should the documented default retention period be?
- **Answer**: 90 days
- **Impact**: FR-010 updated to specify 90 days as recommended default, with 1 year as option for compliance-sensitive environments

**Q3: Metadata Truncation Behavior** - Should edge case match Q1 answer (reject vs truncate)?
- **Answer**: Yes, update edge case to "reject with exception"
- **Impact**: Edge case updated to align with rejection behavior from Q1

**Q4: Performance Target Scope** - What is the scope of "100 events/second" in SC-003?
- **Answer**: Per application instance
- **Impact**: SC-003 updated to clarify "per application instance" for performance target

**Q5: IP/User Agent Capture Scope** - Should IP/user agent be captured beyond auth events?
- **Answer**: All events with HTTP request context
- **Impact**: FR-014 updated to capture IP/user agent for all events when HTTP request is available, not just authentication

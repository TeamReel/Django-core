# B16: Notifications Baseline

**Phase:** 4
**Status:** ✅ Done
**Module ID:** 016
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 16. B16 – Notifications Baseline

**Doel**: Multi-channel notification model en delivery framework (email, in-app, SMS, webhook).

**Status**: ✅ Complete

**Key Features**:
- Notification model (polymorphic channels)
- Channel abstraction (email, in-app, SMS adapters)
- Template-based notification rendering
- Delivery queue (Celery tasks)
- Delivery status tracking
- Notification preferences per user

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Notifications Baseline
*Path: [kitty-specs/016-notifications-baseline/spec.md](../../../../kitty-specs/016-notifications-baseline/spec.md)*

**Feature Branch**: `016-notifications-baseline`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "Implement a generic notifications framework for sending and storing notifications across channels (email, in-app, webhooks) with delivery state tracking, configurable retry policies per notification type, 90-day retention, and integration with B15 task scheduling."

## Clarifications

### Session 2025-12-01

- Q: Who configures SMTP servers and webhook endpoints? → A: System administrators via Django admin interface (global config per deployment). SMTP servers and webhook endpoints are managed as global deployment-level configuration (backed by settings/env), editable by system administrators via Django admin. Per-org overrides can be added in future product-specific features, but are out of scope for B16.
- Q: How should retry attempts be distributed within the retry window? → A: Exponential backoff. Within the retry_window, retries should use a simple exponential backoff (e.g. short initial delay, then increasing intervals) with a sensible default multiplier. Exact timings don't need to be per-policy configurable in B16; a single standard exponential strategy is fine as the baseline.
- Q: Does B16 ship with pre-configured notification types, or must all types be created by administrators? → A: Ship with one generic "default" type only. B16 should create a single generic default notification type (e.g. "default") for simple usage and tests. All other notification types (password_reset, account_verification, etc.) are product-specific and must be created/configured by administrators or downstream products.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Email Notification with Status Tracking (Priority: P1)

A developer triggers an email notification (e.g., password reset, account verification) using a simple API. The system stores the notification with its delivery status, attempts delivery asynchronously via B15 task scheduling, and retries on failure according to the notification type's retry policy. Operators can inspect the notification status to diagnose delivery issues.

**Why this priority**: Core capability - email is the most common notification channel and establishes the baseline pattern for status tracking, async delivery, and retry logic that all other channels will follow.

**Independent Test**: Can be fully tested by triggering a notification via API, verifying database record creation, confirming async task execution, simulating delivery failures, and inspecting status updates through operator interface or database queries.

**Acceptance Scenarios**:

1. **Given** a developer calls the notification API with recipient email, subject, and body, **When** the API processes the request, **Then** a notification record is created with status "pending" and a B15 task is queued for delivery
2. **Given** a pending notification, **When** the B15 task executes successfully, **Then** the notification status updates to "sent" with delivery timestamp
3. **Given** a pending notification, **When** the B15 task fails due to transient error (e.g., SMTP timeout), **Then** the system retries according to the notification type's retry policy and updates attempt count
4. **Given** a notification that exhausts all retry attempts, **When** final retry fails, **Then** the notification status updates to "failed" with error details stored
5. **Given** a failed notification, **When** an operator queries notification status, **Then** they can see failure reason, attempt history, and timestamps

---

### User Story 2 - Configurable Retry Policies per Notification Type (Priority: P2)

An operator defines notification types (e.g., "password_reset" as critical, "newsletter" as best-effort) with different retry policies. Critical notifications retry aggressively (e.g., 10 attempts over 24 hours), while best-effort notifications retry less (e.g., 3 attempts over 1 hour). The system respects these policies during delivery failures.

**Why this priority**: Enables differentiation between critical and non-critical notifications - essential for production reliability but builds on the core delivery mechanism from P1.

**Independent Test**: Can be tested by configuring two notification types with different retry policies, triggering failures for each, and verifying the system respects the configured attempt counts and time windows.

**Acceptance Scenarios**:

1. **Given** an operator configures a "critical" notification type with 10 retry attempts over 24 hours, **When** a notification of this type fails delivery, **Then** the system retries up to 10 times with appropriate backoff
2. **Given** an operator configures a "best-effort" notification type with 3 retry attempts over 1 hour, **When** a notification of this type fails delivery, **Then** the system retries up to 3 times with appropriate backoff
3. **Given** a notification type with no custom retry policy configured, **When** a notification of this type fails delivery, **Then** the system uses the default retry policy (3 attempts over 1 hour)
4. **Given** a notification that reaches its retry limit, **When** the final attempt fails, **Then** the status updates to "failed" and no further retries are scheduled

---

### User Story 3 - Notification History & Audit API (Priority: P2)

An operator or developer queries notification history to debug delivery issues, verify compliance, or analyze notification patterns. The system provides a queryable API that shows all notifications, their delivery status, retry attempts, and timestamps. Critical notification events (creation, delivery, failure) are logged to B09 audit system.

**Why this priority**: Essential for production observability and debugging - required before going live but builds on existing infrastructure (B09 audit logging).

**Independent Test**: Can be tested by creating multiple notifications, querying the history API with various filters (status, type, date range), and verifying B09 audit events are created for critical state transitions.

**Acceptance Scenarios**:

1. **Given** multiple notifications exist in the system, **When** an operator queries the notification history API, **Then** they receive a paginated list of notifications with status, type, recipient, and timestamps
2. **Given** a notification with multiple delivery attempts, **When** an operator queries its detail, **Then** they can see all attempt timestamps, outcomes, and error messages
3. **Given** a notification is created, **When** the system processes the creation, **Then** a B09 audit event is logged with notification type, recipient (hashed for privacy), and creation timestamp
4. **Given** a notification fails permanently, **When** the final retry fails, **Then** a B09 audit event is logged with failure reason and attempt count
5. **Given** an operator needs to analyze notification patterns, **When** they query by date range and status, **Then** the API returns filtered results with pagination

---

### User Story 4 - In-App Notification Channel (Priority: P3)

A product sends in-app notifications (e.g., "New feature available", "Action required") that appear in a user's notification center. The system stores in-app notifications with read/unread status, provides an API to query unread notifications, and marks them as read when the user views them.

**Why this priority**: Valuable enhancement but not essential for baseline - products can launch with email-only and add in-app later.

**Independent Test**: Can be tested by triggering in-app notifications for a user, querying the unread notifications API, marking notifications as read, and verifying the status updates.

**Acceptance Scenarios**:

1. **Given** a developer triggers an in-app notification for a user, **When** the API processes the request, **Then** a notification record is created with channel "in-app" and status "unread"
2. **Given** a user has unread in-app notifications, **When** they query their notifications, **Then** they receive a list of unread notifications with message content and creation timestamp
3. **Given** a user views an in-app notification, **When** they mark it as read, **Then** the notification status updates to "read" with a read timestamp
4. **Given** a user has both read and unread notifications, **When** they query with a filter, **Then** they receive only the requested subset (read-only or unread-only)

---

### User Story 5 - Webhook Notification Channel (Priority: P3)

A product configures webhook endpoints to receive notifications about events (e.g., third-party integrations, external services). The system sends HTTP POST requests to the configured webhook URLs with the notification payload, tracks delivery status, and retries on HTTP errors according to the retry policy.

**Why this priority**: Enables extensibility for future integrations but not required for initial product launch - can be added when specific integration needs arise.

**Independent Test**: Can be tested by configuring a webhook endpoint (using a test HTTP server), triggering webhook notifications, verifying the HTTP POST is sent with correct payload, and simulating failures to test retry logic.

**Acceptance Scenarios**:

1. **Given** an operator configures a webhook endpoint URL, **When** a webhook notification is triggered, **Then** the system sends an HTTP POST to the configured URL with the notification payload as JSON
2. **Given** a webhook endpoint returns a 2xx status code, **When** the delivery completes, **Then** the notification status updates to "sent" with the HTTP response code
3. **Given** a webhook endpoint returns a 5xx error, **When** the delivery fails, **Then** the system retries according to the retry policy and records the error
4. **Given** a webhook endpoint returns a 3xx redirect, **When** the delivery is attempted, **Then** the system follows the redirect up to a configured limit (e.g., 3 redirects)
5. **Given** a webhook endpoint times out, **When** the request exceeds the timeout threshold, **Then** the delivery is marked as failed and retries are scheduled

---

### Edge Cases

- **Invalid recipient**: What happens when an email address is malformed or a webhook URL is unreachable? → System validates recipient format during notification creation, returns validation error for malformed input. For reachable but failing endpoints (e.g., DNS resolution fails), marks as "failed" after exhausting retries.
- **Malformed notification data**: How does the system handle missing required fields (e.g., no subject for email)? → API validation rejects requests missing required fields before notification creation. Returns 400 Bad Request with specific field errors.
- **Queue backlog**: What if the notification queue grows too large (thousands of pending notifications)? → B15 task scheduling handles queue management. If queue depth exceeds configured threshold, system logs alert to B09 and optionally throttles new notification creation (returns 429 Too Many Requests).
- **Concurrent status updates**: What if multiple delivery attempts update the same notification record simultaneously? → Database row-level locking ensures atomic status transitions. Each delivery attempt acquires lock before updating, preventing race conditions.
- **Permanent vs transient failures**: How does the system distinguish between permanent failures (invalid email) and transient failures (SMTP timeout)? → SMTP/HTTP error codes determine retry behavior: 4xx permanent errors (e.g., 404, 550) skip retries and mark as "failed" immediately. 5xx transient errors (e.g., 503, SMTP temp failure) trigger retry logic.
- **Large notification payloads**: What if a webhook payload exceeds reasonable size limits? → System enforces max payload size (e.g., 1MB) during notification creation. Rejects oversized payloads with validation error. Products needing larger payloads should use reference URLs instead of inline content.
- **Webhook redirect loops**: What if a webhook endpoint redirects infinitely? → System enforces max redirect count (default 3). If exceeded, treats as failed delivery and records error details.
- **Timezone handling**: How are notification timestamps stored and displayed? → All timestamps stored in UTC in database. APIs return ISO 8601 formatted timestamps with timezone (UTC). Products can convert to local timezone for display.

## Requirements *(mandatory)*

### Functional Requirements

#### Core Notification Model

- **FR-001**: System MUST store notifications with: unique ID, notification type, channel (email/in-app/webhook), recipient identifier, message payload (subject/body/data), status (pending/sent/failed), created/updated timestamps, and optional metadata JSON
- **FR-002**: System MUST support three notification channels: email (SMTP delivery), in-app (stored in database, queryable by user), and webhook (HTTP POST to configured URL)
- **FR-003**: System MUST provide a REST API to create notifications with validation for required fields (type, channel, recipient, payload). System ships with one generic "default" notification type; additional types must be created by administrators.
- **FR-004**: System MUST validate recipient format during notification creation: email addresses must be RFC 5322 compliant, webhook URLs must be valid HTTP/HTTPS URLs

#### Async Delivery & Retry

- **FR-005**: System MUST integrate with B15 task scheduling to deliver notifications asynchronously (email and webhook channels only; in-app notifications are synchronous)
- **FR-006**: System MUST support configurable retry policies per notification type with parameters: max_attempts (default 3), retry_window (default 1 hour), backoff_strategy (linear/exponential)
- **FR-007**: System MUST provide a default "best-effort" retry policy (3 attempts over 1 hour with exponential backoff) for notification types without custom policies. Retry attempts use exponential backoff with a standard multiplier (e.g., delays of 1min, 5min, 25min).
- **FR-008**: System MUST distinguish permanent failures (SMTP 5xx codes like 550 mailbox unavailable, HTTP 4xx client errors) from transient failures (SMTP 4xx temporary failures, HTTP 5xx server errors) and skip retries for permanent failures. Note: SMTP uses 5xx for permanent errors (opposite of HTTP where 5xx indicates transient server errors)
- **FR-009**: System MUST record delivery attempt details: attempt number, timestamp, outcome (success/transient_failure/permanent_failure), error message, HTTP status code (if applicable)
- **FR-010**: System MUST ensure atomic status transitions during delivery attempts using database row-level locking to prevent race conditions

#### Email Channel

- **FR-011**: System MUST send email notifications via configured SMTP server with TLS support (SMTP server configured globally per deployment via Django admin or environment variables)
- **FR-012**: System MUST support HTML and plain-text email templates with variable substitution
- **FR-013**: System MUST validate email addresses using standard email validation (regex + DNS MX lookup optional)
- **FR-014**: System MUST record SMTP response codes and delivery errors in delivery attempt history
- **FR-015**: System MUST provide a plugin hook for custom email template rendering (allowing products to override default templates)

#### In-App Channel

- **FR-016**: System MUST store in-app notifications with read/unread status and optional read timestamp
- **FR-017**: System MUST provide an API to query notifications for a specific user with filters: unread_only, read_only, date_range, pagination
- **FR-018**: System MUST provide an API to mark notifications as read (single or bulk update)
- **FR-019**: System MUST support optional expiration for in-app notifications (auto-delete after configured TTL, e.g., 30 days)

#### Webhook Channel

- **FR-020**: System MUST send webhook notifications as HTTP POST requests with JSON payload containing: notification_id, type, timestamp, data (custom payload from notification creation). Webhook endpoints configured globally per deployment via Django admin or environment variables.
- **FR-021**: System MUST record HTTP response code, response body (truncated to reasonable size, e.g., 1KB), and delivery timestamp in delivery attempt history
- **FR-022**: System MUST follow HTTP redirects (3xx) up to a configured limit (default 3 redirects) and treat redirect loops as failed delivery
- **FR-023**: System MUST enforce HTTP request timeout (default 30 seconds) and treat timeouts as transient failures eligible for retry
- **FR-024**: System MUST support optional webhook signing (HMAC-SHA256) to verify webhook authenticity at the receiving end

#### Status Tracking & Observability

- **FR-025**: System MUST provide a REST API to query notification status by: notification_id, type, status, date_range, recipient (with pagination)
- **FR-026**: System MUST expose Prometheus metrics for: notifications_created_total (counter by type, channel), notifications_sent_total (counter by type, channel), notifications_failed_total (counter by type, channel, failure_reason), notification_delivery_duration_seconds (histogram)
- **FR-027**: System MUST log critical notification events to B09 audit system: notification_created (with type, channel, recipient hash), notification_sent (with delivery duration), notification_failed (with failure reason and attempt count)
- **FR-028**: System MUST NOT log sensitive data (email content, webhook payloads) in audit events; only metadata (type, channel, status, timestamps) is logged

#### Retention & Cleanup

- **FR-029**: System MUST retain notification records for 90 days after creation
- **FR-030**: System MUST provide a scheduled task (via B15) to delete notifications older than 90 days, running daily during off-peak hours
- **FR-031**: System MUST support optional archival before deletion: export old notifications to cold storage (e.g., S3) before purging from database

#### Extensibility

- **FR-032**: System MUST provide a plugin architecture for adding custom notification channels (e.g., SMS, push notifications) without modifying core code
- **FR-033**: System MUST provide hooks for custom notification types with type-specific validation, templating, and delivery logic
- **FR-034**: System MUST provide hooks for custom retry policies allowing products to implement advanced backoff strategies (e.g., circuit breaker, rate limiting)

### Key Entities

- **Notification**: Represents a single notification with: id, type (FK to NotificationType), channel (email/in-app/webhook), recipient, payload (JSON), status (pending/sent/failed), created_at, updated_at, read_at (in-app only), metadata (JSON). Relationships: 1-to-many with DeliveryAttempt.
- **NotificationType**: Defines notification categories with: code (unique slug, e.g., "password_reset"), name, description, default_channel, retry_policy (FK to RetryPolicy). Allows grouping and policy assignment. B16 ships with one "default" notification type; product-specific types (password_reset, account_verification, etc.) must be created by administrators.
- **DeliveryAttempt**: Tracks each delivery attempt with: id, notification (FK), attempt_number, attempted_at, outcome (success/transient_failure/permanent_failure), error_message, http_status_code, response_body_snippet. Enables delivery debugging and retry tracking.
- **RetryPolicy**: Configures retry behavior with: id, name, max_attempts, retry_window_seconds, backoff_strategy (linear/exponential), backoff_multiplier. Decouples retry logic from notification types for reusability. B16 baseline uses exponential backoff with a standard multiplier; custom timing strategies can be added via FR-034 extensibility hooks.
- **NotificationChannel** (plugin interface): Abstract base class for channel implementations (EmailChannel, InAppChannel, WebhookChannel). Defines deliver() method signature and validation contract for custom channels.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
  - *Rationale*: The notifications framework is fully generic - it provides core delivery mechanisms (email, in-app, webhook) without any product-specific notification types, templates, or workflows. Products define their own notification types (e.g., "invoice_due", "new_message") by extending the plugin architecture. The baseline only provides infrastructure.*
- [x] All functionality is reusable across multiple downstream products
  - *Rationale*: Every component (channels, retry policies, status tracking, audit logging) is designed for multi-product reuse. Products configure notification types and templates without modifying core code. Extensibility hooks (custom channels, custom retry policies) enable product-specific customization without coupling.*
- [x] Extension points are clearly documented if product-specific behavior is needed
  - *Rationale*: FR-032 through FR-034 define clear plugin interfaces for custom channels, notification types, and retry policies. The NotificationChannel base class and template rendering hooks provide stable extension points. Products can add SMS, push notifications, or custom logic without touching baseline code.*

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
  - *Rationale*: The notifications app is self-contained with clear boundaries: models for persistence, API for creation/querying, tasks for async delivery (via B15), audit hooks to B09. No circular dependencies - notifications depends on tasks (B15) and audit (B09), not vice versa. Single responsibility: notification delivery infrastructure only.*
- [x] No circular dependencies introduced
  - *Rationale*: Dependency flow is unidirectional: notifications → B15 (task scheduling) → B09 (audit logging) → B13 (API standards) → B05 (user model). No feature depends on notifications, ensuring clean dependency graph.*
- [x] Extension points are stable and documented
  - *Rationale*: Plugin interfaces (NotificationChannel base class, template hooks, retry policy customization) are defined with explicit contracts. Once shipped, these interfaces will be versioned and backward-compatible per API design principles (Principle VII).*

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
  - *Rationale*: All code will use Python 3.12+ features (type hints, structural pattern matching if applicable). Django 5.1+ ORM features will be used for database interactions.*
- [x] Type hints will be used in core modules
  - *Rationale*: All public APIs (NotificationService, channel implementations, retry policy logic) will have full type hints with mypy strict mode enforcement. Improves IDE support and catches type errors early.*
- [x] Code will be formatted with Black and linted with Ruff
  - *Rationale*: Consistent with project-wide standards. Pre-commit hooks will enforce formatting and linting.*

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
  - *Rationale*: Each user story has independent test scenarios. Unit tests for models, serializers, tasks. Integration tests for end-to-end delivery flows (create → queue → deliver → status update). Mocking external dependencies (SMTP, webhook endpoints) for fast, reliable tests.*
- [x] Coverage targets defined
  - *Rationale*: Target 90%+ coverage for core logic (models, tasks, channel implementations). Edge cases (concurrent updates, retry exhaustion, failure handling) have dedicated tests.*
- [x] Integration tests planned for key flows
  - *Rationale*: P1 user story (email with status tracking) will have full integration test: API call → B15 task execution → SMTP mock → status update → audit log verification. Similar tests for P2 (retry policies) and P3 (in-app, webhooks).*

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
  - *Rationale*: API follows B13 DRF standards with CSRF protection. Webhook signature verification (FR-024) prevents unauthorized webhook spoofing. No security mechanisms are weakened.*
- [x] No secrets in code; env vars/secret managers documented
  - *Rationale*: SMTP credentials, webhook signing keys stored in environment variables (SMTP_PASSWORD, WEBHOOK_SECRET_KEY). Documentation will specify secret management requirements.*
- [x] Authentication/authorization handled through centralized mechanisms
  - *Rationale*: Notification creation API requires authentication via B05 (accounts). Authorization checks (e.g., user can only query their own in-app notifications) use B08 permission system. No custom auth logic.*
- [x] No sensitive data will be logged
  - *Rationale*: FR-028 explicitly prohibits logging email content or webhook payloads. Audit events log only metadata (type, channel, status). Recipient identifiers are hashed before logging to B09.*

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
  - *Rationale*: Notification history API (FR-025) uses select_related() for notification type, prefetch_related() for delivery attempts to avoid N+1. Pagination enforced (default 50 items per page) to prevent unbounded result sets.*
- [x] Pagination implemented for unbounded responses
  - *Rationale*: All list APIs (notification history, in-app notifications) use DRF's PageNumberPagination with max page size limit. Prevents memory exhaustion from large result sets.*
- [x] Structured logging and metrics hooks included
  - *Rationale*: FR-026 defines Prometheus metrics for observability (counters, histograms). B09 audit logging provides structured events for critical state transitions. Enables monitoring and alerting.*
- [x] Graceful degradation strategy defined for failure scenarios
  - *Rationale*: Retry policies handle transient failures (FR-008). Permanent failures skip retries and mark as "failed" immediately. Queue backlog triggers throttling (429 responses) to protect system resources. SMTP/HTTP timeouts prevent indefinite blocking.*

### API Design (Principle VII)
- [x] DRF standards followed
  - *Rationale*: All APIs use DRF serializers, viewsets, and B13 error envelopes. Consistent response format: {data: {...}, meta: {...}}. Validation errors return 400 with field-level details.*
- [x] API responses are consistent and documented
  - *Rationale*: OpenAPI schema generation via drf-spectacular. All endpoints documented with request/response examples. Status codes follow HTTP semantics (201 for creation, 400 for validation errors, 429 for throttling).*
- [x] Breaking changes use versioning or deprecation paths
  - *Rationale*: Initial version is v1. If breaking changes needed in future (e.g., payload format change), v2 endpoint will be added with deprecation notice for v1. Follows B13 API versioning standards.*
- [x] Validation occurs at boundary (serializers/forms)
  - *Rationale*: FR-003 and FR-004 specify validation during notification creation. Serializers enforce required fields, format validation (email, URLs), and payload size limits before database writes.*

### Documentation (Principle XI)
- [x] Feature documentation plan included
  - *Rationale*: Will create docs/notifications-baseline.md with: architecture overview, channel configuration guide, retry policy examples, API reference, troubleshooting guide. Products extending the framework get docs/notifications-extension-guide.md.*
- [x] Extension guide updates identified if applicable
  - *Rationale*: Custom channel implementation guide (how to subclass NotificationChannel), custom retry policy examples, webhook signature verification setup. Enables products to extend without core team support.*
- [x] ADR planned if major architectural decision involved
  - *Rationale*: Will create ADR-016-notification-retry-policies.md to document retry strategy design (why exponential backoff, why per-type policies, alternatives considered). Helps future maintainers understand design rationale.*

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Email notifications are delivered within 5 minutes of creation under normal load (99th percentile delivery time < 5 min)
- **SC-002**: System handles at least 10,000 notifications per hour without queue backlog (queue depth < 100 pending notifications)
- **SC-003**: Retry policies reduce transient failure impact: 90%+ of transiently failed notifications succeed within retry window
- **SC-004**: Notification history queries return results within 2 seconds for typical filters (date range: 30 days, pagination: 50 items)
- **SC-005**: In-app notification read/unread status updates are reflected immediately (< 1 second latency)
- **SC-006**: Webhook delivery success rate is 99%+ for endpoints with 5xx error rates < 1% (measures system reliability, not endpoint reliability)
- **SC-007**: Critical notification events (creation, delivery, failure) are logged to B09 audit system with < 1 second latency
- **SC-008**: Notification retention cleanup task completes within 1 hour for 90-day window (even with millions of old notifications)
- **SC-009**: System exposes Prometheus metrics with < 100ms p99 latency (metrics scraping doesn't impact notification delivery performance)
- **SC-010**: Products can implement custom notification types and retry policies without modifying core notifications code (measured by successful product team adoption)

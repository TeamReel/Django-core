# Research: Notifications Baseline
*Path: [kitty-specs/016-notifications-baseline/research.md](kitty-specs/016-notifications-baseline/research.md)*

**Feature**: B16 Notifications Baseline
**Date**: 2025-12-01
**Status**: Complete

## Research Tasks

### 1. Celery Retry Integration Strategy

**Question**: How should notification retry policies integrate with Celery's built-in retry mechanism?

**Decision**: Use Celery's standard retry mechanism driven by per-notification-type policies

**Rationale**:
- Celery provides mature retry primitives (`autoretry_for`, `retry_backoff`, `max_retries`) - no need to reinvent
- NotificationType/RetryPolicy models define business rules (max_attempts, retry_window)
- Delivery task maps policy → Celery parameters dynamically per notification
- Celery handles scheduling, backoff calculation, and task state management
- We only add thin policy layer + DeliveryAttempt tracking for audit

**Alternatives Considered**:
- Custom retry scheduler on top of Celery: Rejected - duplicates Celery functionality, adds complexity
- Pure Celery task-level retries: Rejected - cannot support per-type policies without task proliferation
- Manual retry scheduling with database polling: Rejected - defeats purpose of async task queue

**Implementation Notes**:
- Delivery task receives `notification_id`, loads Notification → NotificationType → RetryPolicy
- Task uses `self.retry(countdown=calculated_delay, max_retries=policy.max_attempts)`
- Exponential backoff calculated: `delay = initial_delay * (backoff_multiplier ** attempt_number)`
- Each attempt creates DeliveryAttempt record before task retry

---

### 2. Email Template Rendering Approach

**Question**: Should B16 use Django templates or simpler string formatting for email rendering?

**Decision**: Use Django's built-in template system for email rendering

**Rationale**:
- Consistency with rest of django-core-app (all other features use Django templates)
- Supports FR-015 (pluggable templates) via standard Django template loader override mechanism
- Products can override templates in their own template directories without modifying core
- Provides rich features (template inheritance, filters, conditionals) for complex emails
- No additional dependencies - Django templates already available

**Alternatives Considered**:
- F-strings/str.format: Rejected - too limited, no override mechanism, products would need custom template system anyway
- Jinja2: Rejected - adds external dependency, not consistent with Django ecosystem
- Handlebars/Mustache: Rejected - requires additional library, less familiar to Django developers

**Implementation Notes**:
- Email templates stored in `notifications/templates/notifications/email/`
- Template naming: `{notification_type_code}_subject.txt`, `{notification_type_code}_body.html`, `{notification_type_code}_body.txt`
- Default templates for "default" type ship with B16
- Products override via TEMPLATES DIRS configuration
- Context includes: `notification`, `recipient`, `data` (custom payload), `metadata`

---

### 3. NotificationChannel Plugin Architecture

**Question**: Should NotificationChannel be ABC (Abstract Base Class) or duck-typed interface?

**Decision**: Define NotificationChannel as Abstract Base Class with explicit abstract methods

**Rationale**:
- Strong contract enforcement at class definition time (errors caught early, not at runtime)
- Better IDE support (autocomplete, type hints, signature validation)
- Clear documentation of required methods for product teams extending baseline
- Consistent with Python 3.12+ type hints approach (constitution principle III)
- mypy can verify implementations without runtime execution

**Alternatives Considered**:
- Duck typing (informal interface): Rejected - errors appear at runtime, harder to discover contract violations
- Protocol (typing.Protocol): Considered but ABC provides runtime checking + type hints together
- Explicit registration pattern: Rejected - more complex, ABC simpler and more idiomatic

**Implementation Notes**:
```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class NotificationChannel(ABC):
    """Base class for notification delivery channels."""

    @abstractmethod
    def send(self, notification: Notification) -> Dict[str, Any]:
        """Send notification. Returns delivery metadata."""
        pass

    @abstractmethod
    def validate_recipient(self, recipient: str) -> bool:
        """Validate recipient format for this channel."""
        pass

    def validate_config(self) -> None:
        """Optional: Validate channel-specific configuration."""
        pass
```

Products implement:
```python
class SMSChannel(NotificationChannel):
    def send(self, notification):
        # Twilio integration

    def validate_recipient(self, recipient):
        # Phone number validation
```

---

### 4. Webhook Signature Security

**Question**: Should webhook signing be mandatory or optional?

**Decision**: HMAC-SHA256 signing mandatory by default with explicit per-endpoint opt-out

**Rationale**:
- Secure by default (constitution principle V)
- Prevents webhook spoofing/replay attacks
- Opt-out requires conscious choice (good for test environments, bad for production laziness)
- Industry standard (Stripe, GitHub, Shopify all use HMAC signatures)
- Minimal performance impact

**Alternatives Considered**:
- Mandatory always: Rejected - too rigid for local development/testing
- Optional always: Rejected - products might skip security, weakens baseline
- OAuth/JWT: Rejected - overkill for webhook verification, adds complexity

**Implementation Notes**:
- WebhookEndpoint model has `require_signature` field (default True)
- Signing key in environment variable `WEBHOOK_SECRET_KEY` (base64 encoded)
- Signature calculated: `HMAC-SHA256(secret_key, timestamp + notification_id + payload_json)`
- Include in header: `X-Notification-Signature: t=<timestamp>,v1=<signature>`
- Recipient validates by recalculating and comparing
- Documentation includes verification examples (Python, Node.js, PHP)

---

### 5. Payload Size Limits Strategy

**Question**: Should payload limits be global or channel-specific?

**Decision**: Channel-specific payload size limits with validation at channel level

**Rationale**:
- Different channels have different practical constraints:
  - Email: Can handle larger HTML content (images, styles) - 10MB limit
  - Webhook: Network efficiency matters - 1MB limit (FR mentions this)
  - In-app: UI display constraints, should be concise - 100KB limit
- Channel-aware error messages more helpful ("Webhook payload exceeds 1MB" vs "Payload too large")
- Future channels (SMS, push) have very different limits (160 chars, 4KB)

**Alternatives Considered**:
- Single global limit: Rejected - too restrictive for email, too permissive for in-app
- No limits: Rejected - database JSONField can handle large data but hurts performance
- Per-notification-type limits: Rejected - limits are channel constraints, not type constraints

**Implementation Notes**:
```python
class EmailChannel(NotificationChannel):
    MAX_PAYLOAD_SIZE = 10 * 1024 * 1024  # 10MB

class WebhookChannel(NotificationChannel):
    MAX_PAYLOAD_SIZE = 1 * 1024 * 1024  # 1MB

class InAppChannel(NotificationChannel):
    MAX_PAYLOAD_SIZE = 100 * 1024  # 100KB
```

Validation in serializer:
```python
def validate(self, attrs):
    channel = attrs['channel']
    payload_size = len(json.dumps(attrs['payload']))
    if payload_size > channel.MAX_PAYLOAD_SIZE:
        raise ValidationError(
            f"{channel.name} payload exceeds {channel.MAX_PAYLOAD_SIZE} bytes"
        )
```

---

## Best Practices Research

### Celery Task Design
- Use `bind=True` to access task instance for retry
- Set `acks_late=True` to prevent message loss on worker crash
- Use `autoretry_for=(SMTPException, HTTPError)` for known transient errors
- Log task_id with notification_id for correlation
- Keep tasks idempotent (safe to retry)

### Django Email Best Practices
- Use `django.core.mail.EmailMultiAlternatives` for HTML+text emails
- Set `fail_silently=False` to catch SMTP errors
- Use connection pooling for bulk sends (`get_connection()`
- Validate email with `django.core.validators.validate_email`
- Include `List-Unsubscribe` header for compliance

### Webhook Delivery Patterns
- Use `requests.post()` with timeout (30s default)
- Follow redirects with `allow_redirects=True`, `max_redirects=3`
- Record full request/response for debugging (truncate body)
- Implement circuit breaker for frequently failing endpoints (future enhancement)
- Include `User-Agent: django-core-notifications/1.0` header

### PostgreSQL JSONField Optimization
- Use GIN index for metadata queries: `CREATE INDEX idx_metadata ON notifications USING gin(metadata);`
- Query with `@>` operator: `Notification.objects.filter(metadata__contains={'priority': 'high'})`
- Avoid deep nesting in JSON (max 2-3 levels for query performance)
- Consider JSONB over JSON for better performance (Django default)

---

## Integration Patterns

### B15 (Task Scheduling) Integration
- Register delivery tasks in `notifications/tasks.py`
- Use B15's Celery app instance (don't create separate Celery app)
- Cleanup task scheduled via Celery Beat (daily at 2AM UTC)
- Task naming: `notifications.tasks.deliver_email`, `notifications.tasks.deliver_webhook`

### B09 (Audit Logging) Integration
- Log events: `notification.created`, `notification.sent`, `notification.failed`
- Include in context: `notification_type`, `channel`, `recipient_hash`, `delivery_duration`
- Use B09's `create_audit_event()` helper
- Hash recipients with SHA256 before logging (privacy)

### B13 (API Standards) Integration
- Use DRF viewsets with B13 error envelope
- Validation errors return B13 format: `{"error": {"code": "VALIDATION_ERROR", "details": {...}}}`
- Pagination via B13's configured PageNumberPagination
- OpenAPI schema via drf-spectacular

### B05 (Accounts) Integration
- Notification.recipient_user FK to User model (nullable - emails might not be users)
- Permission: `notifications.view_notification` checks ownership
- In-app notifications filtered by `recipient_user=request.user`

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-01 | Use Celery retry mechanism | Mature, battle-tested, avoids reinventing retry logic |
| 2025-12-01 | Django templates for email | Consistency, extensibility via template loaders |
| 2025-12-01 | ABC for NotificationChannel | Strong contracts, IDE support, early error detection |
| 2025-12-01 | Mandatory webhook signing | Secure by default, explicit opt-out for tests |
| 2025-12-01 | Channel-specific payload limits | Different channels have different constraints |

---

## Open Questions / Future Enhancements

*None - all planning questions resolved*

**Future enhancements (out of scope for B16)**:
- Circuit breaker for failing webhook endpoints
- Rate limiting per notification type
- Per-organization SMTP/webhook configuration
- SMS and push notification channels
- Notification preferences (user opt-out)
- Scheduled/delayed notifications
- Bulk notification API

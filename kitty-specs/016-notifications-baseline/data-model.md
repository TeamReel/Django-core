# Data Model: Notifications Baseline
*Path: [kitty-specs/016-notifications-baseline/data-model.md](kitty-specs/016-notifications-baseline/data-model.md)*

**Feature**: B16 Notifications Baseline
**Date**: 2025-12-01

## Entity-Relationship Overview

```
┌─────────────────┐
│   RetryPolicy   │
│  (Reusable)     │
└────────┬────────┘
         │
         │ FK
         ▼
┌─────────────────────┐
│ NotificationType    │◄───────┐
│ (e.g., "default")   │        │
└─────────────────────┘        │ FK
                               │
┌──────────────────────────────┴─────┐
│         Notification                │
│  (Core entity)                      │
└──────────────┬──────────────────────┘
               │
               │ 1:N
               ▼
       ┌───────────────────┐
       │  DeliveryAttempt  │
       │  (Audit trail)    │
       └───────────────────┘
```

---

## Entities

### 1. Notification

**Purpose**: Represents a single notification to be delivered via one channel.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `type` | FK(NotificationType) | NOT NULL | Notification category (e.g., "default") |
| `channel` | CharField(20) | NOT NULL, choices | Delivery channel: "email", "in_app", "webhook" |
| `recipient` | CharField(255) | NOT NULL | Email address, user ID, or webhook URL |
| `recipient_user` | FK(User) | NULL | Link to User model if recipient is a user (for in-app) |
| `payload` | JSONField | NOT NULL | Channel-specific data (subject/body/data) |
| `metadata` | JSONField | NULL, default={} | Optional custom metadata for filtering |
| `status` | CharField(20) | NOT NULL, choices, indexed | "pending", "sent", "failed" |
| `created_at` | DateTimeField | auto_now_add, indexed | When notification was created |
| `updated_at` | DateTimeField | auto_now | Last status change |
| `read_at` | DateTimeField | NULL | When user read (in-app only) |

**Indexes**:
- `idx_status_created`: `(status, created_at)` - For cleanup queries, status dashboards
- `idx_recipient_user`: `(recipient_user, status, created_at)` - For user's in-app notifications
- `idx_metadata_gin`: GIN index on `metadata` - For metadata queries
- `idx_type_channel`: `(type, channel, created_at)` - For analytics

**Validation Rules**:
- `recipient` format validated based on `channel`:
  - email: RFC 5322 compliant email address
  - in_app: Must have `recipient_user` set
  - webhook: Valid HTTP/HTTPS URL
- `payload` size validated per channel (see research.md)
- `status` transitions: pending → sent/failed (atomic, no other paths)
- `read_at` only set if `channel == "in_app"`

**Lifecycle**:
1. Created with `status="pending"` via API
2. Celery task queued for delivery (email/webhook) or stored immediately (in-app)
3. Status updated to "sent" on success, "failed" after retry exhaustion
4. Deleted after 90 days (retention policy)

---

### 2. NotificationType

**Purpose**: Defines notification categories with their retry policies and defaults.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Auto-increment ID |
| `code` | SlugField(50) | UNIQUE, NOT NULL | Unique slug (e.g., "password_reset", "default") |
| `name` | CharField(100) | NOT NULL | Human-readable name |
| `description` | TextField | NULL | Purpose/usage documentation |
| `default_channel` | CharField(20) | NOT NULL, choices | Default channel if not specified |
| `retry_policy` | FK(RetryPolicy) | NOT NULL | Retry configuration |
| `is_active` | BooleanField | default=True | Soft delete / disable |
| `created_at` | DateTimeField | auto_now_add | When type was created |

**Indexes**:
- `idx_code`: UNIQUE index on `code`
- `idx_active`: `(is_active, code)` - For active types lookup

**Validation Rules**:
- `code` must be lowercase, alphanumeric with underscores/hyphens only
- `default_channel` must be valid channel choice
- Cannot delete NotificationType with active Notifications (FK constraint)

**Seeded Data** (B16 baseline):
- Code: "default"
- Name: "Default Notification"
- Description: "Generic notification type for simple usage"
- Default Channel: "email"
- Retry Policy: FK to default "best-effort" policy

Products create additional types via Django admin or migrations.

---

### 3. RetryPolicy

**Purpose**: Configures retry behavior for notification types.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Auto-increment ID |
| `name` | CharField(100) | UNIQUE, NOT NULL | Policy name (e.g., "best-effort", "critical") |
| `max_attempts` | PositiveIntegerField | NOT NULL, default=3 | Maximum delivery attempts |
| `retry_window_seconds` | PositiveIntegerField | NOT NULL, default=3600 | Time window for all retries (1 hour default) |
| `backoff_strategy` | CharField(20) | NOT NULL, choices, default="exponential" | "linear" or "exponential" |
| `backoff_multiplier` | FloatField | NOT NULL, default=5.0 | Multiplier for exponential backoff |
| `initial_delay_seconds` | PositiveIntegerField | NOT NULL, default=60 | First retry delay (1 minute default) |
| `created_at` | DateTimeField | auto_now_add | When policy was created |

**Indexes**:
- `idx_name`: UNIQUE index on `name`

**Validation Rules**:
- `max_attempts` must be >= 1, <= 20 (sanity limit)
- `retry_window_seconds` must be >= `initial_delay_seconds`
- `backoff_multiplier` must be > 1.0 for exponential strategy

**Retry Calculation** (exponential backoff):
```python
delay = initial_delay_seconds * (backoff_multiplier ** attempt_number)
# Capped at retry_window_seconds / max_attempts to fit within window
```

**Seeded Data** (B16 baseline):

1. **best-effort** (default):
   - max_attempts: 3
   - retry_window_seconds: 3600 (1 hour)
   - backoff_strategy: "exponential"
   - backoff_multiplier: 5.0
   - initial_delay_seconds: 60
   - Retry timeline: 1min, 5min, 25min

2. **critical** (example for docs, not auto-seeded):
   - max_attempts: 10
   - retry_window_seconds: 86400 (24 hours)
   - backoff_strategy: "exponential"
   - backoff_multiplier: 2.0
   - initial_delay_seconds: 300 (5 min)

---

### 4. DeliveryAttempt

**Purpose**: Tracks each delivery attempt for audit and debugging.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Auto-increment ID |
| `notification` | FK(Notification) | NOT NULL, on_delete=CASCADE | Parent notification |
| `attempt_number` | PositiveIntegerField | NOT NULL | Attempt sequence (1, 2, 3...) |
| `attempted_at` | DateTimeField | auto_now_add | When attempt was made |
| `outcome` | CharField(30) | NOT NULL, choices | "success", "transient_failure", "permanent_failure" |
| `error_message` | TextField | NULL | Error details if failed |
| `http_status_code` | PositiveIntegerField | NULL | HTTP status for webhooks |
| `smtp_response_code` | PositiveIntegerField | NULL | SMTP code for emails |
| `response_body_snippet` | TextField | NULL | Response body (truncated to 1KB) |
| `duration_ms` | PositiveIntegerField | NULL | Delivery duration in milliseconds |

**Indexes**:
- `idx_notification_attempt`: `(notification, attempt_number)` - For attempt history
- `idx_outcome_attempted`: `(outcome, attempted_at)` - For analytics

**Validation Rules**:
- `attempt_number` must match retry policy's max_attempts limit
- `outcome` determines next action:
  - "success" → Notification status = "sent", no more retries
  - "transient_failure" → Retry if attempts < max_attempts
  - "permanent_failure" → Notification status = "failed", no more retries

**Lifecycle**:
1. Created BEFORE each delivery attempt
2. Updated with outcome, error details, response codes
3. Celery task checks outcome to decide whether to retry
4. Deleted when parent Notification is deleted (CASCADE)

---

## Relationships

### NotificationType ← Notification
- **Type**: Many Notifications : 1 NotificationType
- **FK**: `Notification.type` → `NotificationType.id`
- **On Delete**: PROTECT (cannot delete type with active notifications)
- **Purpose**: Group notifications for policy application, analytics

### RetryPolicy ← NotificationType
- **Type**: Many NotificationTypes : 1 RetryPolicy
- **FK**: `NotificationType.retry_policy` → `RetryPolicy.id`
- **On Delete**: PROTECT (cannot delete policy in use)
- **Purpose**: Reusable retry configurations

### Notification → DeliveryAttempt
- **Type**: 1 Notification : Many DeliveryAttempts
- **FK**: `DeliveryAttempt.notification` → `Notification.id`
- **On Delete**: CASCADE (delete attempts when notification deleted)
- **Purpose**: Audit trail for delivery debugging

### User ← Notification (optional)
- **Type**: Many Notifications : 1 User
- **FK**: `Notification.recipient_user` → `User.id`
- **On Delete**: SET_NULL (keep notification record, orphan it)
- **Purpose**: Link in-app notifications to users for querying

---

## State Transitions

### Notification.status

```
          ┌─────────┐
   CREATE │ pending │
          └────┬────┘
               │
     ┌─────────┴─────────┐
     │                   │
     ▼                   ▼
┌─────────┐         ┌────────┐
│  sent   │         │ failed │
└─────────┘         └────────┘
 (success)        (exhausted retries
                   or permanent error)
```

**Rules**:
- Only transition: `pending` → `sent` OR `pending` → `failed`
- No transitions from `sent` or `failed` (terminal states)
- Transition triggers B09 audit event

### DeliveryAttempt.outcome

**Deterministic mapping**:

| Error Type | Outcome | Next Action |
|------------|---------|-------------|
| SMTP 5xx permanent (e.g., 550 user unknown) | permanent_failure | Set notification status = "failed", no retry |
| SMTP temp failure (e.g., 4xx, timeout) | transient_failure | Retry if attempts < max_attempts |
| HTTP 4xx (client error) | permanent_failure | Set notification status = "failed", no retry |
| HTTP 5xx (server error) | transient_failure | Retry if attempts < max_attempts |
| HTTP timeout (>30s) | transient_failure | Retry if attempts < max_attempts |
| Success (SMTP 250, HTTP 2xx) | success | Set notification status = "sent" |

---

## Constraints & Invariants

### Data Integrity

1. **Unique Notification Identifiers**: UUID primary key ensures uniqueness
2. **Recipient Validation**: Format validated before creation (serializer)
3. **Status Consistency**: DeliveryAttempt records must align with Notification status
4. **Retry Window Enforcement**: Last attempt timestamp must be within `created_at + retry_window_seconds`

### Performance Constraints

1. **Payload Size Limits**:
   - Email: 10MB (large HTML emails)
   - Webhook: 1MB (network efficiency)
   - In-app: 100KB (UI display)
2. **Query Pagination**: All list queries limited to max 100 items per page
3. **Index Usage**: All status/created_at queries use composite index
4. **Retention Cleanup**: Deletes notifications older than 90 days daily

### Security Constraints

1. **Recipient Privacy**: Hashed before logging to B09
2. **Payload Privacy**: Never logged to audit system (FR-028)
3. **Webhook Signing**: HMAC-SHA256 signature required by default
4. **SMTP TLS**: TLS required for SMTP connections

---

## Migration Strategy

### Initial Migration (0001_initial.py)

1. Create RetryPolicy table
2. Create NotificationType table
3. Create Notification table
4. Create DeliveryAttempt table
5. Add indexes
6. Seed "best-effort" RetryPolicy
7. Seed "default" NotificationType

### Data Seeding (0002_seed_baseline_data.py)

```python
def seed_baseline_data(apps, schema_editor):
    RetryPolicy = apps.get_model('notifications', 'RetryPolicy')
    NotificationType = apps.get_model('notifications', 'NotificationType')

    # Create best-effort retry policy
    best_effort = RetryPolicy.objects.create(
        name="best-effort",
        max_attempts=3,
        retry_window_seconds=3600,
        backoff_strategy="exponential",
        backoff_multiplier=5.0,
        initial_delay_seconds=60,
    )

    # Create default notification type
    NotificationType.objects.create(
        code="default",
        name="Default Notification",
        description="Generic notification type for simple usage",
        default_channel="email",
        retry_policy=best_effort,
        is_active=True,
    )
```

---

## Query Patterns

### Common Queries (optimized)

```python
# Get user's unread in-app notifications
Notification.objects.filter(
    recipient_user=user,
    channel='in_app',
    read_at__isnull=True
).select_related('type').order_by('-created_at')[:50]

# Get notification with delivery history
notification = Notification.objects.select_related('type__retry_policy').get(pk=notification_id)
attempts = notification.deliveryattempt_set.order_by('attempt_number')

# Get pending notifications for cleanup
old_pending = Notification.objects.filter(
    status='pending',
    created_at__lt=timezone.now() - timedelta(hours=24)
)

# Analytics: Failed notifications by type
from django.db.models import Count
Notification.objects.filter(
    status='failed',
    created_at__gte=start_date
).values('type__code').annotate(
    count=Count('id')
).order_by('-count')
```

---

## Future Schema Evolution

**Out of scope for B16, potential extensions**:

1. **NotificationPreference**: User opt-out per type
2. **WebhookEndpoint**: Store webhook URLs with signing config
3. **SMTPConfiguration**: Per-organization SMTP settings
4. **NotificationBatch**: Bulk send tracking
5. **NotificationTemplate**: Store custom templates per type

These require spec updates and constitutional review before implementation.

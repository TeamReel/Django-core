# Data Model: Contextual Notification Service
*Path: [kitty-specs/017-contextual-notification-service/data-model.md](kitty-specs/017-contextual-notification-service/data-model.md)*

**Feature**: B17 Contextual Notification Service
**Date**: 2025-12-02
**Status**: Planning Phase

## Entity Overview

```
Event (ephemeral dict)
    ↓
RoutingRule (determines who gets notified)
    ↓
NotificationPreference (user opt-outs)
    ↓
OrganisationNotificationPolicy (org overrides)
    ↓
SuppressionWindow (Redis cache)
    ↓
RoutingDecisionLog (audit via B09)
```

## Entity Definitions

### 1. Event (Ephemeral Structure)

**Purpose**: Domain event representation for routing evaluation

**Structure**:
```python
{
    "type": str,              # e.g., "project.updated", "task.assigned"
    "context": {              # Routing context
        "org_id": int,        # Organisation ID (required)
        "project_id": int,    # Project ID (optional)
        "user_id": int,       # Actor user ID (optional)
        "resource_id": str,   # Generic resource identifier (optional)
    },
    "payload": {              # Notification content
        "title": str,         # Notification title
        "body": str,          # Notification body
        "url": str,           # Action URL (optional)
        # ... additional payload fields
    }
}
```

**Validation Rules**:
- `type` must be non-empty string matching pattern `^[a-z0-9._]+$`
- `context.org_id` is required
- `payload.title` and `payload.body` are required for notifications

**Lifecycle**: Created by domain code → validated by EventService → consumed by RoutingService → discarded (not persisted)

**Example**:
```python
{
    "type": "project.updated",
    "context": {
        "org_id": 42,
        "project_id": 123,
        "user_id": 7,  # Actor who updated project
    },
    "payload": {
        "title": "Project 'Alpha' updated",
        "body": "John Doe updated project Alpha",
        "url": "/projects/123",
    }
}
```

---

### 2. RoutingRule (Database Model)

**Purpose**: Defines which events trigger notifications for which users via which channels

**Model**: `contextual_notifications.models.RoutingRule`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | Primary Key | Auto-increment ID |
| `event_type` | CharField(255) | NOT NULL, indexed | Event type pattern (e.g., "project.updated") |
| `scope` | CharField(20) | Choices: "global", "org", "project" | Rule application scope |
| `organisation` | ForeignKey | NULL, indexed | Organisation (NULL for global rules) |
| `project` | ForeignKey | NULL | Project (NULL for org/global rules) |
| `target_role` | CharField(50) | NULL | Target role (e.g., "org_admin", "project_member") |
| `priority` | IntegerField | Default: 0 | Event priority (0=low, 1=normal, 2=high, 3=urgent) |
| `channel` | CharField(20) | Choices: "in_app", "email", "push" | Delivery channel |
| `is_enabled` | BooleanField | Default: True | Active flag |
| `created_at` | DateTimeField | Auto-now-add | Creation timestamp |
| `updated_at` | DateTimeField | Auto-now | Last update timestamp |
| `created_by` | ForeignKey(User) | NULL | Creator (for audit) |

**Indexes**:
- Single: `event_type`, `organisation_id`, `is_enabled`
- Composite: `(event_type, organisation_id)`, `(event_type, scope)`

**Constraints**:
- Check: `scope='global' → organisation IS NULL AND project IS NULL`
- Check: `scope='org' → organisation IS NOT NULL AND project IS NULL`
- Check: `scope='project' → organisation IS NOT NULL AND project IS NOT NULL`
- Unique: `(event_type, scope, organisation, project, target_role, channel)` (no duplicate rules)

**Relationships**:
- `organisation`: ForeignKey → `organisations.Organisation` (CASCADE)
- `project`: ForeignKey → `projects.Project` (CASCADE)
- `created_by`: ForeignKey → `accounts.User` (SET_NULL)

**Business Logic**:
- Global rules apply to all organisations
- Org rules override global rules for that organisation
- Project rules override org rules for that project
- Rules with `is_enabled=False` are skipped in evaluation

**Example Records**:
```python
# Global rule: All project updates send in-app notifications to project members
RoutingRule(
    event_type="project.updated",
    scope="global",
    organisation=None,
    project=None,
    target_role="project_member",
    priority=1,
    channel="in_app",
    is_enabled=True
)

# Org override: Org 42 wants email for project updates
RoutingRule(
    event_type="project.updated",
    scope="org",
    organisation=Org(id=42),
    project=None,
    target_role="project_member",
    priority=1,
    channel="email",
    is_enabled=True
)
```

---

### 3. NotificationPreference (Database Model)

**Purpose**: Per-user opt-out preferences for event types and channels

**Model**: `contextual_notifications.models.NotificationPreference`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | Primary Key | Auto-increment ID |
| `user` | ForeignKey(User) | NOT NULL, indexed | User who owns preference |
| `event_type` | CharField(255) | NOT NULL | Event type (e.g., "project.updated") |
| `channel` | CharField(20) | Choices: "in_app", "email", "push" | Delivery channel |
| `enabled` | BooleanField | Default: True | Enabled flag (False = user opted out) |
| `created_at` | DateTimeField | Auto-now-add | Creation timestamp |
| `updated_at` | DateTimeField | Auto-now | Last update timestamp |

**Indexes**:
- Single: `user_id`, `event_type`
- Composite: `(user_id, event_type, channel)` (for fast lookups)

**Constraints**:
- Unique: `(user, event_type, channel)` (one preference per user per event type per channel)

**Relationships**:
- `user`: ForeignKey → `accounts.User` (CASCADE)

**Business Logic**:
- If no preference exists, default is `enabled=True` (user receives notifications)
- If preference exists with `enabled=False`, notification is skipped for that (user, event_type, channel)
- Preferences checked after routing rules evaluated (rules determine candidates, preferences filter them)

**Example Records**:
```python
# User 7 opts out of email for project.updated events
NotificationPreference(
    user=User(id=7),
    event_type="project.updated",
    channel="email",
    enabled=False
)

# User 7 still receives in-app for project.updated (no opt-out preference)
```

---

### 4. OrganisationNotificationPolicy (Database Model)

**Purpose**: Organisation-level policies for quiet hours and rate limiting

**Model**: `contextual_notifications.models.OrganisationNotificationPolicy`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | Primary Key | Auto-increment ID |
| `organisation` | OneToOneField | NOT NULL, unique | Organisation (one policy per org) |
| `policy_type` | CharField(50) | NOT NULL, default: "default" | Policy type (future extensibility) |
| `quiet_hours_enabled` | BooleanField | Default: False | Enable quiet hours rate limiting |
| `quiet_hours_start` | TimeField | NULL | Quiet hours start time (e.g., 22:00) |
| `quiet_hours_end` | TimeField | NULL | Quiet hours end time (e.g., 08:00) |
| `quiet_hours_timezone` | CharField(63) | Default: "UTC" | Timezone for quiet hours (pytz timezone name) |
| `quiet_hours_rate_limit` | IntegerField | Default: 10 | Max notifications per minute during quiet hours |
| `created_at` | DateTimeField | Auto-now-add | Creation timestamp |
| `updated_at` | DateTimeField | Auto-now | Last update timestamp |

**Indexes**:
- Single: `organisation_id` (already unique)

**Constraints**:
- Check: `quiet_hours_enabled=True → quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL`

**Relationships**:
- `organisation`: OneToOneField → `organisations.Organisation` (CASCADE)

**Business Logic**:
- If no policy exists for org, use system defaults (no quiet hours)
- During quiet hours, rate limit notifications to `quiet_hours_rate_limit` per minute
- Rate limit applies per-organisation (not per-user)

**Example Records**:
```python
# Org 42 enables quiet hours: 22:00-08:00 CET, max 10 notifications/minute
OrganisationNotificationPolicy(
    organisation=Org(id=42),
    policy_type="default",
    quiet_hours_enabled=True,
    quiet_hours_start=time(22, 0),
    quiet_hours_end=time(8, 0),
    quiet_hours_timezone="Europe/Amsterdam",
    quiet_hours_rate_limit=10
)
```

---

### 5. SuppressionWindow (Redis Cache)

**Purpose**: Temporary suppression of duplicate notifications for same (user, event_type, resource_id)

**Storage**: Redis cache via `django-redis`

**Key Structure**:
```
suppression:{user_id}:{event_type}:{resource_id}
```

**Value**: Integer timestamp of suppression creation (for debugging)

**TTL**: Configurable per event type (default: 300 seconds = 5 minutes)

**Operations**:

1. **Check if suppressed**:
   ```python
   key = f"suppression:{user_id}:{event_type}:{resource_id}"
   is_suppressed = cache.get(key) is not None
   ```

2. **Create suppression window**:
   ```python
   key = f"suppression:{user_id}:{event_type}:{resource_id}"
   cache.set(key, int(time.time()), timeout=300)  # 5 minutes
   ```

3. **Atomic check-and-suppress**:
   ```python
   key = f"suppression:{user_id}:{event_type}:{resource_id}"
   is_new = cache.add(key, int(time.time()), timeout=300)  # Returns False if exists
   ```

**Business Logic**:
- Suppression windows prevent duplicate notifications within TTL window
- Use atomic `add()` to prevent race conditions (only first notification succeeds)
- TTL automatically cleans up expired suppressions (no manual cleanup needed)

**Example Keys**:
```
suppression:7:project.updated:project_123    # User 7, project 123 updated
suppression:7:task.assigned:task_456         # User 7, task 456 assigned
```

---

### 6. RoutingDecisionLog (Audit via B09)

**Purpose**: Audit trail for routing decisions (stored via B09 audit logging)

**Storage**: Via B09's `AuditEvent` model

**Structure**:
```python
# Logged via B09's create_audit_event()
{
    "event_type": "notification_routing_decision",
    "category": "notification_routing",
    "actor": User(id=system_user_id),  # System actor
    "organisation": Org(id=event_context['org_id']),
    "metadata": {
        "domain_event_type": "project.updated",
        "domain_event_context": {...},  # Event context dict
        "matched_rules": [rule_id1, rule_id2],
        "target_users": [user_id1, user_id2],
        "selected_channels": {
            user_id1: ["in_app", "email"],
            user_id2: ["in_app"]
        },
        "suppressed_users": [user_id3],
        "preference_filtered_users": [user_id4],
        "routing_time_ms": 45,
        "timestamp": "2025-12-02T10:30:00Z"
    }
}
```

**Business Logic**:
- Log every routing decision (success and failure)
- Include matched rules for debugging
- Include suppressed/filtered users for audit
- Queryable via B09's audit log API

---

## Entity Relationships Diagram

```
┌─────────────────────┐
│  Event (ephemeral)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐        ┌──────────────────────┐
│   RoutingRule       │◄───────│  Organisation        │
│  ─────────────────  │        └──────────────────────┘
│  event_type         │
│  scope              │        ┌──────────────────────┐
│  organisation_id    │◄───────│  Project             │
│  project_id         │        └──────────────────────┘
│  target_role        │
│  priority           │
│  channel            │
│  is_enabled         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  NotificationPreference      │        ┌──────────────────────┐
│  ─────────────────────────  │◄───────│  User                │
│  user_id                     │        └──────────────────────┘
│  event_type                  │
│  channel                     │
│  enabled                     │
└──────────┬──────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  OrganisationNotificationPolicy│     ┌──────────────────────┐
│  ────────────────────────────  │◄────│  Organisation        │
│  organisation_id (1:1)          │     └──────────────────────┘
│  quiet_hours_enabled            │
│  quiet_hours_start/end          │
│  quiet_hours_rate_limit         │
└──────────┬─────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  SuppressionWindow (Redis)       │
│  ───────────────────────────────│
│  Key: suppression:{user}:{type}:{resource}
│  TTL: 300 seconds                │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  RoutingDecisionLog (via B09)   │
│  ───────────────────────────────│
│  Stores routing decisions        │
│  in AuditEvent model             │
└──────────────────────────────────┘
```

## Data Migration Plan

### Phase 1: Initial Models

1. Create `RoutingRule` model with indexes
2. Create `NotificationPreference` model with indexes
3. Create `OrganisationNotificationPolicy` model
4. Add foreign key constraints
5. Generate migration: `0001_initial.py`

### Phase 2: Seed Data

1. Create default global routing rules for common events:
   - `project.created` → in_app (project_member)
   - `project.updated` → in_app (project_member)
   - `task.assigned` → in_app, email (assignee)
   - `task.completed` → in_app (creator)

2. Generate data migration: `0002_seed_default_routing_rules.py`

### Phase 3: Redis Configuration

1. Configure Redis cache alias `"suppression"` in settings
2. Test Redis TTL behavior
3. Add Prometheus metrics for cache hits/misses

## Validation Rules

### Event Validation

- `type` matches `^[a-z0-9._]+$` (lowercase, alphanumeric, dots, underscores)
- `context.org_id` is a valid organisation ID
- `context.project_id` (if present) is a valid project ID
- `payload.title` and `payload.body` are non-empty strings

### RoutingRule Validation

- `scope` and foreign keys consistency (enforced by DB constraints)
- `event_type` matches event type pattern
- `target_role` is a valid B08 role name
- `channel` is a valid B16 channel

### NotificationPreference Validation

- `event_type` matches event type pattern
- `channel` is a valid B16 channel

### OrganisationNotificationPolicy Validation

- `quiet_hours_timezone` is a valid pytz timezone name
- `quiet_hours_start < quiet_hours_end` (or wraps midnight)
- `quiet_hours_rate_limit > 0`

## Query Patterns

### Common Queries

1. **Get routing rules for event**:
   ```python
   # Global rules
   RoutingRule.objects.filter(
       event_type=event_type,
       scope='global',
       is_enabled=True
   )

   # Org-specific rules
   RoutingRule.objects.filter(
       event_type=event_type,
       scope='org',
       organisation_id=org_id,
       is_enabled=True
   )
   ```

2. **Check user preference**:
   ```python
   NotificationPreference.objects.filter(
       user_id=user_id,
       event_type=event_type,
       channel=channel
   ).values_list('enabled', flat=True).first()
   # Returns: True/False/None (None = no preference = enabled by default)
   ```

3. **Get org policy**:
   ```python
   OrganisationNotificationPolicy.objects.filter(
       organisation_id=org_id
   ).first()
   # Returns: policy or None (None = use system defaults)
   ```

## Performance Considerations

### Database Optimization

- **Indexes**: Composite indexes on hot query paths (event_type + org_id)
- **Select Related**: Always use `select_related('organisation', 'project')` when loading rules
- **Bulk Lookups**: Fetch all preferences for target users in single query

### Redis Optimization

- **Pipeline Operations**: Batch suppression checks for multiple users
- **Key Expiry**: Use TTL at creation time (not separate EXPIRE command)
- **Connection Pooling**: Reuse django-redis connection pool

### Query Optimization

- **Rule Evaluation**: Query global rules once, cache in-memory for event batch
- **Preference Lookup**: Bulk fetch preferences for all target users
- **Policy Lookup**: Cache org policies in-memory (updated on policy change)

## Next Steps

1. Generate Django models from entity definitions
2. Create and apply initial migration
3. Implement service layer (EventService, RoutingService, SuppressionService)
4. Write unit tests for each model's business logic
5. Create integration tests for full routing flow

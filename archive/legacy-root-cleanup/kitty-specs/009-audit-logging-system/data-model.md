# Data Model: Audit Logging System
*Path: [kitty-specs/009-audit-logging-system/data-model.md](kitty-specs/009-audit-logging-system/data-model.md)*

**Feature Branch**: `009-audit-logging-system`
**Date**: 2025-11-27

## Overview

The Audit Logging System data model consists of a single core entity (`AuditEvent`) with foreign key relationships to existing platform entities (`User`, `Organization`, `Project`). The model prioritizes immutability, query performance, and extensibility.

---

## Entity: AuditEvent

**Purpose**: Represents a single logged security or configuration action with timestamp, actor, context, and extensible metadata.

**Table**: `audit_auditevent`

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK, Auto-increment | Unique identifier |
| `created_at` | DateTimeField | NOT NULL, auto_now_add, indexed | Timestamp when event was recorded (immutable) |
| `event_type` | CharField(100) | NOT NULL, indexed | Dot-notation event category (e.g., "auth.login", "permission.granted") |
| `user` | ForeignKey(User) | NULL, on_delete=SET_NULL, indexed | Actor who performed the action (null for system events) |
| `organization` | ForeignKey(Organization) | NULL, on_delete=SET_NULL, indexed | Organization context (null for cross-org or system events) |
| `project` | ForeignKey(Project) | NULL, on_delete=SET_NULL, indexed | Project context (null for org-level or system events) |
| `metadata` | JSONField | NOT NULL, default={}, GIN indexed | Event-specific structured data (IP, user agent, resource IDs, etc.) |

### Indexes

```python
class Meta:
    indexes = [
        models.Index(fields=['-created_at'], name='audit_created_desc_idx'),
        models.Index(fields=['event_type'], name='audit_event_type_idx'),
        models.Index(fields=['user'], name='audit_user_idx'),
        models.Index(fields=['organization'], name='audit_org_idx'),
        models.Index(fields=['project'], name='audit_project_idx'),
        GinIndex(fields=['metadata'], name='audit_metadata_gin_idx'),
    ]
    ordering = ['-created_at']
    default_permissions = ('view',)  # Remove add, change, delete
    permissions = [
        ('view_auditevent', 'Can view audit events'),
    ]
```

### Relationships

```
User (accounts.User)
  └─> AuditEvent.user (nullable, SET_NULL on delete)

Organization (organizations.Organization)
  └─> AuditEvent.organization (nullable, SET_NULL on delete)

Project (projects.Project)
  └─> AuditEvent.project (nullable, SET_NULL on delete)
```

**Deletion Behavior**: All foreign keys use `on_delete=SET_NULL` to preserve audit events even after referenced entities are deleted. This ensures audit trail integrity for historical analysis.

### Validation Rules

1. **Event Type Format**: Must match regex `^[a-z0-9_]+\.[a-z0-9_]+$` (category.action)
2. **Event Type Registration**: Must be pre-registered in `audit.registry` before use
3. **Metadata Size**: Serialized JSON must not exceed 10KB (enforced in `audit_log.record()`)
4. **Metadata Schema**: Varies by event type, documented in event type registry
5. **Immutability**: Once created, records should never be updated (enforced by admin, not database)

### State Transitions

**None** - Audit events are write-once, immutable records. No state machine or lifecycle transitions.

---

## Event Type Registry (In-Memory)

**Purpose**: Runtime registry of valid event types for validation and documentation.

**Storage**: In-memory dictionary in `audit/registry.py`

**Structure**:
```python
{
    "auth.login": EventTypeMetadata(
        category="auth",
        action="login",
        description="User authenticated successfully",
        required_metadata=["ip", "user_agent"],
        optional_metadata=["method"],
    ),
    "permission.granted": EventTypeMetadata(
        category="permission",
        action="granted",
        description="Permission granted to user or role",
        required_metadata=["permission_name", "target_user_id"],
        optional_metadata=["scope", "granted_by"],
    ),
    # ... more event types ...
}
```

**Registration API**:
```python
from audit.registry import register_event_type

register_event_type(
    event_type="auth.login",
    description="User authenticated successfully",
    required_metadata=["ip", "user_agent"],
    optional_metadata=["method"],
)
```

---

## Metadata Schemas by Event Type

### Authentication Events

**auth.login**
```json
{
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "method": "password|sso|api_key",
  "session_id": "abc123..."
}
```

**auth.logout**
```json
{
  "ip": "192.168.1.1",
  "session_id": "abc123..."
}
```

**auth.login_failed**
```json
{
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "username": "attempted_username",
  "reason": "invalid_password|account_locked|invalid_username"
}
```

**auth.password_changed**
```json
{
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "changed_by": "self|admin_user_id"
}
```

### Permission Events

**permission.checked**
```json
{
  "permission": "projects.create_project",
  "resource_type": "organization",
  "resource_id": 123,
  "result": "allowed|denied",
  "reason": "explicit_grant|role_assignment|no_permission"
}
```

**permission.granted**
```json
{
  "permission": "projects.create_project",
  "target_user_id": 456,
  "target_user_email": "user@example.com",
  "scope": "organization|project",
  "scope_id": 123,
  "granted_by": "admin_user_id"
}
```

**permission.denied**
```json
{
  "permission": "projects.create_project",
  "resource_type": "organization",
  "resource_id": 123,
  "reason": "no_permission|insufficient_role|blocked"
}
```

### Role Events

**role.assigned**
```json
{
  "role_name": "org_admin",
  "target_user_id": 456,
  "target_user_email": "user@example.com",
  "scope": "organization",
  "scope_id": 123,
  "assigned_by": "admin_user_id"
}
```

**role.revoked**
```json
{
  "role_name": "org_admin",
  "target_user_id": 456,
  "target_user_email": "user@example.com",
  "scope": "organization",
  "scope_id": 123,
  "revoked_by": "admin_user_id",
  "reason": "access_removed|user_deactivated|role_restructure"
}
```

### Configuration Events

**config.updated**
```json
{
  "setting": "retention_days",
  "old_value": 90,
  "new_value": 180,
  "scope": "organization",
  "scope_id": 123
}
```

**config.feature_toggled**
```json
{
  "feature": "advanced_permissions",
  "enabled": true,
  "scope": "organization",
  "scope_id": 123
}
```

### Resource Events

**resource.created**
```json
{
  "resource_type": "project",
  "resource_id": 789,
  "resource_name": "New Project"
}
```

**resource.deleted**
```json
{
  "resource_type": "project",
  "resource_id": 789,
  "resource_name": "Deleted Project",
  "reason": "user_request|admin_action|retention_policy"
}
```

---

## Query Patterns

### Common Queries

**All events for a user**
```python
AuditEvent.objects.filter(user=user).order_by('-created_at')
```

**Events by type in date range**
```python
AuditEvent.objects.filter(
    event_type='auth.login',
    created_at__gte=start_date,
    created_at__lte=end_date
).select_related('user', 'organization')
```

**Permission events for organization**
```python
AuditEvent.objects.filter(
    organization=org,
    event_type__startswith='permission.'
).select_related('user')
```

**Failed login attempts**
```python
AuditEvent.objects.filter(
    event_type='auth.login_failed',
    metadata__ip=ip_address
).count()
```

**Events with specific metadata value (using GIN index)**
```python
AuditEvent.objects.filter(
    metadata__ip='192.168.1.1'
)
```

### Performance Considerations

- **created_at descending index**: Optimizes default ordering and recent events queries
- **select_related()**: Always use for user/organization/project to avoid N+1 queries
- **Pagination**: Default 100 per page in admin, configurable via API
- **GIN index**: Enables fast JSON queries but increases write time by ~10-20%
- **Date range queries**: Use `__gte` and `__lte` to leverage btree index on created_at

---

## Database Migrations

### Initial Migration (001_initial.py)

```python
operations = [
    migrations.CreateModel(
        name='AuditEvent',
        fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True)),
            ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ('event_type', models.CharField(max_length=100, db_index=True)),
            ('metadata', models.JSONField(default=dict, blank=True)),
            ('organization', models.ForeignKey(
                null=True, blank=True,
                on_delete=models.SET_NULL,
                to='organizations.organization',
                related_name='audit_events'
            )),
            ('project', models.ForeignKey(
                null=True, blank=True,
                on_delete=models.SET_NULL,
                to='projects.project',
                related_name='audit_events'
            )),
            ('user', models.ForeignKey(
                null=True, blank=True,
                on_delete=models.SET_NULL,
                to='accounts.user',
                related_name='audit_events'
            )),
        ],
        options={
            'ordering': ['-created_at'],
            'default_permissions': ('view',),
            'permissions': [('view_auditevent', 'Can view audit events')],
        },
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=models.Index(fields=['-created_at'], name='audit_created_desc_idx'),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=models.Index(fields=['event_type'], name='audit_event_type_idx'),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=models.Index(fields=['user'], name='audit_user_idx'),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=models.Index(fields=['organization'], name='audit_org_idx'),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=models.Index(fields=['project'], name='audit_project_idx'),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=GinIndex(fields=['metadata'], name='audit_metadata_gin_idx'),
    ),
]
```

---

## Storage Estimates

**Assumptions**:
- Average event: 500 bytes (base fields + ~200 bytes metadata)
- 1000 events: ~500KB
- 10,000 events: ~5MB
- 100,000 events: ~50MB
- 1,000,000 events: ~500MB

**Index Overhead**:
- Btree indexes: ~20% of data size
- GIN index: ~50% of data size
- Total with indexes: ~170% of raw data size

**Example: 1M events**
- Raw data: 500MB
- Btree indexes: 100MB
- GIN index: 250MB
- Total: ~850MB

**Retention Policy**: 90 days default = ~900K events at 10 events/sec average = ~750MB

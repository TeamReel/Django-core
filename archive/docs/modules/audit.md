# Audit Module

Immutable audit logging system for compliance and security tracking.

## Overview

The `audit` module provides an append-only audit trail for system-wide activity tracking. Every significant action is recorded with context about who did what, when, and where.

**App location**: `src/audit/`
**Feature spec**: `kitty-specs/009-audit-logging-system/`

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'audit.apps.AuditConfig',
    ...
]

# Audit retention (days)
AUDIT_RETENTION_DAYS = 365 * 7  # 7 years

# Maximum metadata size (bytes)
AUDIT_MAX_METADATA_SIZE = 10240  # 10KB
```

## Models

### AuditEvent

Immutable audit record.

| Field | Type | Description |
|-------|------|-------------|
| `id` | BigAutoField | Primary key |
| `created_at` | DateTimeField | Event timestamp (indexed) |
| `event_type` | CharField | Event category (indexed) |
| `user` | ForeignKey | Actor who triggered event |
| `organization` | ForeignKey | Organizational context |
| `project` | ForeignKey | Project context |
| `metadata` | JSONField | Event-specific details |

**Constraints**:
- Append-only (no updates or deletes)
- Maximum metadata size: 10KB
- Retention: 7 years minimum

## Event Types

### Authentication Events

| Event Type | Description |
|------------|-------------|
| `auth.login` | User logged in |
| `auth.logout` | User logged out |
| `auth.login_failed` | Failed login attempt |
| `auth.password_reset` | Password reset requested |
| `auth.password_changed` | Password changed |

### User Management Events

| Event Type | Description |
|------------|-------------|
| `user.created` | New user registered |
| `user.activated` | User activated |
| `user.deactivated` | User deactivated |
| `user.role_changed` | User role modified |

### Permission Events

| Event Type | Description |
|------------|-------------|
| `role.assigned` | Role assigned to user |
| `role.revoked` | Role removed from user |
| `permission.check` | Permission check (sensitive) |
| `permission.denied` | Access denied |

### Resource Events

| Event Type | Description |
|------------|-------------|
| `org.created` | Organization created |
| `org.updated` | Organization modified |
| `org.deleted` | Organization deleted |
| `project.created` | Project created |
| `project.archived` | Project archived |

## API Endpoints

### Query Audit Events

```http
GET /api/v1/audit/events/
Authorization: Bearer <token>
```

**Query Parameters**:
- `event_type` - Filter by type
- `user` - Filter by actor ID
- `organization` - Filter by org ID
- `from_date` - Events after date
- `to_date` - Events before date
- `page` - Pagination

**Response**:
```json
{
  "count": 1250,
  "next": "/api/v1/audit/events/?page=2",
  "results": [
    {
      "id": 12345,
      "event_type": "auth.login",
      "created_at": "2024-01-15T10:30:00Z",
      "user": {
        "id": 1,
        "email": "user@example.com"
      },
      "organization": null,
      "metadata": {
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
      }
    }
  ]
}
```

### Get Event Details

```http
GET /api/v1/audit/events/{id}/
Authorization: Bearer <token>
```

### Export Audit Log

```http
GET /api/v1/audit/events/export/
Authorization: Bearer <token>
Accept: text/csv
```

## Usage Examples

### Recording Events

```python
from audit.api import audit_log

# Basic event
audit_log.record(
    'project.created',
    user=request.user,
    organization=org,
    metadata={'project_name': 'New Project'}
)

# Event with project context
audit_log.record(
    'resource.accessed',
    user=request.user,
    organization=org,
    project=project,
    metadata={
        'resource_type': 'document',
        'resource_id': str(doc.id),
    }
)
```

### Automatic Logging via Signals

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from audit.api import audit_log

@receiver(post_save, sender=Project)
def log_project_save(sender, instance, created, **kwargs):
    event_type = 'project.created' if created else 'project.updated'
    audit_log.record(
        event_type,
        user=instance.creator if created else None,
        organization=instance.organisation,
        metadata={
            'project_id': str(instance.id),
            'project_name': instance.name,
        }
    )
```

### Querying Events

```python
from audit.models import AuditEvent
from datetime import timedelta
from django.utils import timezone

# Recent login failures
failures = AuditEvent.objects.filter(
    event_type='auth.login_failed',
    created_at__gte=timezone.now() - timedelta(hours=1),
)

# User's activity history
activity = AuditEvent.objects.filter(
    user=user,
    created_at__gte=timezone.now() - timedelta(days=30),
).order_by('-created_at')

# Organization audit trail
org_events = AuditEvent.objects.filter(
    organization=org,
).select_related('user', 'project')
```

### Security Monitoring

```python
# Detect suspicious activity
from django.db.models import Count

# Failed logins by IP
suspicious_ips = AuditEvent.objects.filter(
    event_type='auth.login_failed',
    created_at__gte=timezone.now() - timedelta(minutes=15),
).values('metadata__ip_address').annotate(
    count=Count('id')
).filter(count__gte=5)

# Permission denials
access_issues = AuditEvent.objects.filter(
    event_type='permission.denied',
    user=user,
).order_by('-created_at')[:10]
```

## Immutability

The audit system enforces immutability:

```python
# At database level
class AuditEvent(models.Model):
    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Audit events cannot be modified")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit events cannot be deleted")
```

## Performance

### Indexes

```python
class Meta:
    indexes = [
        models.Index(fields=['-created_at']),
        models.Index(fields=['event_type']),
        models.Index(fields=['user']),
        models.Index(fields=['organization']),
        GinIndex(fields=['metadata']),  # JSON queries
    ]
```

### Partitioning

For high-volume deployments, partition by time:

```sql
CREATE TABLE audit_events (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_events_2024_q1
PARTITION OF audit_events
FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

## Related Features

- [Permissions](./permissions.md) - Permission change auditing
- [Accounts](./accounts.md) - Authentication auditing
- [Security Model](../architecture/security-model.md) - Audit requirements

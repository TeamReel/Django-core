# Quick Start: Audit Logging System
*Path: [kitty-specs/009-audit-logging-system/quickstart.md](kitty-specs/009-audit-logging-system/quickstart.md)*

**Feature**: Audit Logging System
**Date**: 2025-11-27

## Overview

This guide shows how to use the audit logging system to record security and configuration events in your Django application.

---

## Basic Usage

### 1. Record an Event

```python
from audit.api import audit_log

# Simple event with user context
audit_log.record(
    event_type="auth.login",
    user=request.user,
    metadata={"ip": "192.168.1.1"}
)
```

### 2. Record with Full Context

```python
# Event with organization and project context
audit_log.record(
    event_type="config.updated",
    user=request.user,
    organization=organization,
    project=project,
    metadata={
        "setting": "retention_days",
        "old_value": 90,
        "new_value": 180
    }
)
```

### 3. Automatic Request Context

```python
# Pass request object for automatic IP/user agent capture
audit_log.record(
    event_type="auth.login",
    user=user,
    request=request,  # Extracts IP and user agent automatically
    metadata={"method": "password"}
)
```

### 4. System Events (No User)

```python
# Events triggered by background jobs or system actions
audit_log.record(
    event_type="resource.deleted",
    organization=organization,
    metadata={
        "resource_type": "project",
        "resource_id": 789,
        "reason": "retention_policy"
    }
)
```

---

## Registering Custom Event Types

### In Your App Config

```python
# myapp/apps.py
from django.apps import AppConfig
from audit.registry import register_event_type

class MyAppConfig(AppConfig):
    name = 'myapp'

    def ready(self):
        # Register custom event types for your app
        register_event_type(
            "workflow.started",
            description="Workflow execution started",
            required_metadata=["workflow_id", "workflow_name"],
            optional_metadata=["trigger"]
        )

        register_event_type(
            "workflow.completed",
            description="Workflow execution completed",
            required_metadata=["workflow_id", "duration_seconds"],
            optional_metadata=["status", "error"]
        )
```

### Using Custom Events

```python
from audit.api import audit_log

def start_workflow(workflow, user):
    audit_log.record(
        event_type="workflow.started",
        user=user,
        organization=workflow.organization,
        metadata={
            "workflow_id": workflow.id,
            "workflow_name": workflow.name,
            "trigger": "manual"
        }
    )
```

---

## Viewing Audit Events

### Django Admin

1. Navigate to `/admin/audit/auditevent/`
2. Use filters:
   - Event type (dropdown)
   - User (search)
   - Date range (date hierarchy)
   - Organization (dropdown if applicable)
3. Click event to view full details including metadata

### Programmatic Access

```python
from audit.models import AuditEvent

# Recent events for a user
events = AuditEvent.objects.filter(user=user).order_by('-created_at')[:10]

# Events in date range
from datetime import datetime, timedelta

start_date = datetime.now() - timedelta(days=7)
events = AuditEvent.objects.filter(
    created_at__gte=start_date,
    event_type='auth.login'
).select_related('user', 'organization')

# Events with specific metadata
events = AuditEvent.objects.filter(
    metadata__ip='192.168.1.1'
)

# Failed login attempts from IP
failed_logins = AuditEvent.objects.filter(
    event_type='auth.login_failed',
    metadata__ip='192.168.1.1'
).count()
```

---

## Common Patterns

### Authentication Events

```python
# Successful login
audit_log.record(
    event_type="auth.login",
    user=user,
    request=request,
    metadata={"method": "password"}
)

# Failed login
audit_log.record(
    event_type="auth.login_failed",
    request=request,
    metadata={
        "username": username,
        "reason": "invalid_password"
    }
)

# Password changed
audit_log.record(
    event_type="auth.password_changed",
    user=user,
    request=request,
    metadata={"changed_by": "self"}
)

# Logout
audit_log.record(
    event_type="auth.logout",
    user=user,
    request=request
)
```

### Permission Events

```python
# Permission checked
audit_log.record(
    event_type="permission.checked",
    user=user,
    organization=organization,
    metadata={
        "permission": "projects.create_project",
        "resource_type": "organization",
        "resource_id": organization.id,
        "result": "allowed"
    }
)

# Permission granted
audit_log.record(
    event_type="permission.granted",
    user=admin_user,
    organization=organization,
    metadata={
        "target_user_id": target_user.id,
        "target_user_email": target_user.email,
        "permission": "projects.create_project",
        "scope": "organization"
    }
)

# Permission denied
audit_log.record(
    event_type="permission.denied",
    user=user,
    organization=organization,
    metadata={
        "permission": "projects.delete_project",
        "resource_type": "project",
        "resource_id": project.id,
        "reason": "insufficient_role"
    }
)
```

### Role Events

```python
# Role assigned
audit_log.record(
    event_type="role.assigned",
    user=admin_user,
    organization=organization,
    metadata={
        "role_name": "org_admin",
        "target_user_id": target_user.id,
        "target_user_email": target_user.email,
        "scope": "organization",
        "scope_id": organization.id
    }
)

# Role revoked
audit_log.record(
    event_type="role.revoked",
    user=admin_user,
    organization=organization,
    metadata={
        "role_name": "org_admin",
        "target_user_id": target_user.id,
        "reason": "access_removed"
    }
)
```

### Configuration Events

```python
# Setting updated
audit_log.record(
    event_type="config.updated",
    user=admin_user,
    organization=organization,
    metadata={
        "setting": "retention_days",
        "old_value": 90,
        "new_value": 180,
        "scope": "organization"
    }
)

# Feature toggled
audit_log.record(
    event_type="config.feature_toggled",
    user=admin_user,
    organization=organization,
    metadata={
        "feature": "advanced_permissions",
        "enabled": True
    }
)
```

### Resource Events

```python
# Resource created
audit_log.record(
    event_type="resource.created",
    user=user,
    organization=organization,
    project=project,
    metadata={
        "resource_type": "document",
        "resource_id": document.id,
        "resource_name": document.title
    }
)

# Resource deleted
audit_log.record(
    event_type="resource.deleted",
    user=user,
    organization=organization,
    metadata={
        "resource_type": "project",
        "resource_id": project.id,
        "resource_name": project.name,
        "reason": "user_request"
    }
)
```

---

## Error Handling

### Validation Errors

```python
from audit.api import audit_log

try:
    # Unregistered event type
    audit_log.record("invalid.type", user=user)
except ValueError as e:
    print(f"Invalid event type: {e}")

try:
    # Metadata too large (> 10KB)
    huge_metadata = {"data": "x" * 100000}
    audit_log.record("auth.login", user=user, metadata=huge_metadata)
except ValueError as e:
    print(f"Metadata too large: {e}")
```

### Graceful Degradation

```python
# If database is unavailable, record() returns None but doesn't crash
event = audit_log.record("auth.login", user=user)

if event is None:
    # Recording failed - check logs for details
    # Application continues normally (graceful degradation)
    pass
else:
    # Recording succeeded
    print(f"Event recorded: {event.id}")
```

---

## Monitoring Audit Health

### Prometheus Metrics

```prometheus
# Alert on any audit failures
rate(audit_failures_total[5m]) > 0

# Monitor event recording rate
rate(audit_events_recorded_total[5m])

# Failed events by type
sum(audit_failures_total) by (event_type, reason)
```

### Django Signals

```python
# myapp/signals.py
from django.dispatch import receiver
from audit.signals import audit_record_failed
from audit.models import AuditEvent

@receiver(audit_record_failed, sender=AuditEvent)
def handle_audit_failure(sender, exception, event_data, **kwargs):
    """Send alert for critical audit failures"""
    event_type = event_data.get('event_type')

    # Page ops for auth event failures
    if event_type and event_type.startswith('auth.'):
        send_page_alert(
            f"Critical: Audit recording failed for {event_type}",
            exception=str(exception)
        )

    # Log all failures
    logger.error(
        "Audit recording failed",
        extra={
            "event_type": event_type,
            "exception": str(exception),
            "event_data": event_data
        }
    )
```

---

## Management Commands

### Seed Example Events

```bash
# Create 100 example audit events for testing
python manage.py audit_seed --count 100

# Seed specific event types
python manage.py audit_seed --event-types auth.login,permission.checked --count 50
```

### List Event Types

```bash
# Show all registered event types
python manage.py audit_list_event_types

# Filter by category
python manage.py audit_list_event_types --category auth
```

### Export Events

```bash
# Export to CSV
python manage.py audit_export --output audit_events.csv --days 30

# Export specific event types
python manage.py audit_export --output auth_events.csv --event-types auth.login,auth.logout
```

### Cleanup Old Events

```bash
# Delete events older than 90 days (default retention)
python manage.py audit_cleanup --days 90

# Dry run to see what would be deleted
python manage.py audit_cleanup --days 90 --dry-run
```

---

## Best Practices

### 1. Event Type Naming

✅ **Good**:
- `auth.login` - Clear category and action
- `permission.granted` - Specific action
- `config.feature_toggled` - Descriptive action

❌ **Bad**:
- `user_login` - Missing category separator
- `PERMISSION_GRANTED` - Wrong case (use lowercase)
- `do_thing` - Vague action

### 2. Metadata Structure

✅ **Good**:
```python
metadata={
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "permission": "projects.create",
    "result": "allowed"
}
```

❌ **Bad**:
```python
metadata={
    "data": "ip=192.168.1.1 user_agent=Mozilla/5.0...",  # Unstructured string
    "sensitive_password": "plaintextpass",  # Never log passwords!
    "huge_dump": document.content  # May exceed 10KB limit
}
```

### 3. Context Completeness

✅ **Good**:
```python
# Include all relevant context
audit_log.record(
    event_type="permission.granted",
    user=admin_user,  # Who granted
    organization=organization,  # Where
    metadata={
        "target_user_id": target_user.id,  # To whom
        "permission": "projects.create"  # What
    }
)
```

❌ **Bad**:
```python
# Missing context
audit_log.record(
    event_type="permission.granted",
    metadata={"permission": "projects.create"}  # Who granted? To whom? Where?
)
```

### 4. Security

**Never log**:
- Passwords (plaintext or hashed)
- API keys, tokens, secrets
- Credit card numbers, SSNs
- Full request bodies (may contain sensitive data)

**Do log**:
- IP addresses (for security analysis)
- User agents (for device tracking)
- Resource IDs and names
- Action results (allowed/denied)
- Timestamps (automatic)

---

## Testing

### Unit Tests

```python
import pytest
from audit.api import audit_log
from audit.models import AuditEvent

@pytest.mark.django_db
def test_audit_event_creation(user):
    event = audit_log.record(
        event_type="auth.login",
        user=user,
        metadata={"ip": "127.0.0.1"}
    )

    assert event is not None
    assert event.event_type == "auth.login"
    assert event.user == user
    assert event.metadata["ip"] == "127.0.0.1"

@pytest.mark.django_db
def test_audit_query_by_user(user):
    audit_log.record("auth.login", user=user)
    audit_log.record("auth.logout", user=user)

    events = AuditEvent.objects.filter(user=user)
    assert events.count() == 2
```

### Integration Tests

```python
@pytest.mark.django_db
def test_permission_check_creates_audit_event(user, organization):
    from permissions.evaluator import PermissionEvaluator

    evaluator = PermissionEvaluator()
    evaluator.check_permission(user, "projects.create", organization)

    # Verify audit event was created
    event = AuditEvent.objects.filter(
        event_type="permission.checked",
        user=user
    ).latest('created_at')

    assert event.metadata["permission"] == "projects.create"
    assert event.metadata["result"] in ["allowed", "denied"]
```

---

## Troubleshooting

### Events Not Appearing

1. **Check event type registration**:
   ```bash
   python manage.py audit_list_event_types
   ```

2. **Check for validation errors**:
   ```python
   import logging
   logging.getLogger('audit').setLevel(logging.DEBUG)
   ```

3. **Check Prometheus metrics**:
   ```
   audit_failures_total{event_type="auth.login"}
   ```

### Performance Issues

1. **Verify indexes exist**:
   ```sql
   \d+ audit_auditevent  -- PostgreSQL
   ```

2. **Check query patterns**:
   ```python
   # Bad (N+1 queries)
   for event in AuditEvent.objects.all():
       print(event.user.email)

   # Good (uses select_related)
   for event in AuditEvent.objects.select_related('user'):
       print(event.user.email)
   ```

3. **Monitor query performance**:
   ```python
   from django.db import connection
   from django.test.utils import override_settings

   with override_settings(DEBUG=True):
       events = AuditEvent.objects.filter(event_type='auth.login')[:100]
       print(f"Queries: {len(connection.queries)}")
   ```

### Metadata Size Errors

```python
import json

# Check metadata size before recording
metadata = {"large_field": some_data}
json_str = json.dumps(metadata)
size_kb = len(json_str.encode('utf-8')) / 1024

if size_kb > 10:
    # Truncate or summarize large fields
    metadata["large_field"] = metadata["large_field"][:1000] + "... (truncated)"

audit_log.record("event.type", metadata=metadata)
```

---

## Next Steps

- Read [data-model.md](data-model.md) for database schema details
- Read [python-api.md](contracts/python-api.md) for complete API reference
- Review [research.md](research.md) for architecture decisions
- Check Django admin at `/admin/audit/auditevent/` for event browsing

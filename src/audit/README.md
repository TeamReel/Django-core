# Audit Logging System

Immutable audit trail for system-wide activity tracking.

## Quick Start

```python
from audit.api import audit_log

# Record an event
event = audit_log.record(
    'auth.login',
    user=request.user,
    metadata={'ip': request.META['REMOTE_ADDR']}
)
```

## API Reference

### audit_log.record()

Record an audit event.

**Arguments**:
- `event_type` (str, required): Registered event type (e.g., 'auth.login')
- `user` (User, optional): User who triggered the event
- `organization` (Organisation, optional): Organization context
- `project` (Project, optional): Project context
- `metadata` (dict, optional): Event-specific details (max 10KB)
- `request` (HttpRequest, optional): Auto-captures IP and user agent

**Returns**: `AuditEvent` instance or `None` (if graceful failure)

**Raises**: `ValueError` if event type not registered or metadata exceeds 10KB

**Example**:
```python
audit_log.record(
    'permission.checked',
    user=user,
    organization=org,
    metadata={
        'permission': 'projects.create',
        'result': 'allowed'
    }
)
```

### register_event_type()

Register a custom event type.

**Arguments**:
- `name` (str): Event type name in 'category.action' format
- `category` (str): Event category (e.g., 'auth', 'permission')
- `description` (str): Human-readable description
- `required_metadata_keys` (list, optional): Required metadata keys

**Example**:
```python
from audit.registry import register_event_type

register_event_type(
    'deployment.started',
    'deployment',
    'Deployment process initiated',
    required_metadata_keys=['environment', 'version']
)
```

## Event Type Conventions

**Format**: `category.action` (e.g., 'auth.login', 'permission.checked')

**Core Categories**:
- **auth**: Authentication events (login, logout, password changes)
- **permission**: Permission checks and grants
- **role**: Role assignments and revocations
- **config**: Configuration changes
- **resource**: Resource CRUD operations

**Naming Guidelines**:
- Use lowercase with underscores: `auth.password_changed`
- Use past tense for completed actions: `role.assigned`, not `role.assign`
- Be specific: `auth.login_failed` better than `auth.error`

## Metadata Guidelines

**Size Limit**: 10KB per event (enforced)

**Structure**:
- Use flat key-value pairs when possible
- Use nested objects for complex data
- Always include `ip` for security events
- Use ISO 8601 for timestamps

**Example**:
```python
metadata = {
    'ip': '192.168.1.100',
    'user_agent': 'Mozilla/5.0...',
    'action': 'create',
    'resource_type': 'project',
    'resource_id': 'proj_123',
    'changes': {
        'name': {'old': 'Test', 'new': 'Production'}
    }
}
```

## Monitoring

### Prometheus Metrics

- `audit_events_recorded_total{event_type}`: Successful recordings
- `audit_failures_total{event_type, error_type}`: Failed recordings

**Example Alert**:
```yaml
- alert: HighAuditFailureRate
  expr: rate(audit_failures_total[5m]) > 10
  annotations:
    summary: Audit system experiencing failures
```

### Django Signals

Listen for audit failures:

```python
from django.dispatch import receiver
from audit.signals import audit_record_failed

@receiver(audit_record_failed)
def handle_audit_failure(sender, event_type, exception, event_data, **kwargs):
    # Alert ops team
    logger.critical(f"Audit failure: {event_type}", exc_info=exception)
```

## Performance

- **Throughput**: 100 events/sec per instance (tested)
- **Overhead**: <10ms per audit_log.record() call
- **Search**: <2s for queries on 100k+ events (GIN indexed metadata)

## Best Practices

1. **Always use request parameter**: Auto-captures IP and user agent
2. **Register event types at startup**: In apps.py ready() method
3. **Keep metadata small**: Store large data elsewhere, reference by ID
4. **Use consistent naming**: Follow 'category.action' convention
5. **Don't log sensitive data**: No passwords, tokens, or PII in metadata

## Troubleshooting

**Q: Events not appearing in admin?**
- Verify event type is registered: `from audit.registry import list_event_types; list_event_types()`
- Check migrations applied: `python manage.py showmigrations audit`

**Q: ValueError: Event type not registered?**
- Register in apps.py: `register_event_type('your.event', 'category', 'description')`

**Q: Slow admin searches?**
- Verify GIN index: `\d audit_events` in psql should show `audit_metadata_gin`
- Use indexed filters: created_at, event_type, user rather than full-text search

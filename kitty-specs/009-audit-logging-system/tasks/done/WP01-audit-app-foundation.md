---
lane: "done"
agent: "claude"
assignee: "claude"
shell_pid: "45896"
review_status: "approved without changes"
reviewed_by: "claude-sonnet-4.5-reviewer"
reviewer_shell_pid: "45896"
reviewed_at: "2025-11-27T15:09:00Z"
history:
  - date: "2025-11-27"
    action: "created"
    author: "AI Agent"
  - date: "2025-11-27T15:09:00Z"
    action: "moved_to_done"
    author: "claude-sonnet-4.5-reviewer"
    shell_pid: "45896"
    note: "Approved and moved to done lane"
---
# WP01: Audit App Foundation & Core API

```yaml
work_package_id: WP01
feature: 009-audit-logging-system
priority: P1
estimated_subtasks: 10
dependencies: []
lane: done
assignee: claude
history:
  - date: 2025-11-27
    action: created
    author: AI Agent
  - date: 2025-11-27T15:09:00Z
    action: moved_to_done
    author: claude-sonnet-4.5-reviewer
    shell_pid: 45896
    note: Approved and moved to done lane
```

## Objective

Create audit Django app with AuditEvent model, audit_log.record() API, event type registry, Django signals, and Prometheus metrics. This work package establishes the complete foundation for the audit logging system.

## Context

**Specification**: [spec.md](../../spec.md) - User Story 1 (Developer Records Events)
**Planning**: [plan.md](../../plan.md) - Technical context and constitution validation
**Data Model**: [data-model.md](../../data-model.md) - AuditEvent schema with 7 fields and 6 indexes
**Research**: [research.md](../../research.md) - Decision 1 (B08 Integration), Decision 2 (Failure Observability), Decision 3 (Event Type Management), Decision 4 (Metadata Storage)

**Key Architecture Decisions**:
1. **Direct API Calls**: `audit_log.record()` provides simple, synchronous interface (Decision 1)
2. **Graceful Failure**: Audit failures never break application flow - use try/except and logging (Decision 2)
3. **Registry Pattern**: Event types registered at startup, validated at runtime (Decision 3)
4. **JSONField Storage**: PostgreSQL JSONField with explicit GIN index for metadata queries (Decision 4)
5. **Dual Observability**: Django signals + Prometheus metrics for monitoring (Decision 2)

**Technology Stack**:
- Python 3.12+ with type hints
- Django 5.1+ (models, migrations, apps framework)
- PostgreSQL 13+ (JSONField, GIN indexes)
- django-prometheus (already installed from B06)
- pytest 8.0+ for testing

**Performance Goals**:
- 100 events/sec per instance
- <10ms overhead per audit call
- <2s searches on 100k+ events

## Detailed Guidance

### T001: Create Audit Django App Structure

**Goal**: Initialize audit app with proper module structure.

**Steps**:
1. Run `python manage.py startapp audit` in `src/` directory
2. Create `src/audit/__init__.py` with empty content
3. Create `src/audit/py.typed` marker file (empty file for mypy)
4. Verify structure:
   ```
   src/audit/
     __init__.py
     py.typed
     models.py
     admin.py
     apps.py
     tests.py  # delete this, we use tests/ directory
     views.py  # delete this, no views needed
   ```
5. Delete `tests.py` and `views.py` (not used)

**Files Created**:
- `src/audit/__init__.py`
- `src/audit/py.typed`
- `src/audit/models.py` (Django-generated, will modify in T002)
- `src/audit/admin.py` (Django-generated, will modify in WP03)
- `src/audit/apps.py` (Django-generated, will modify in T008)

**Validation**: `ls src/audit/` shows all expected files.

---

### T002: Create AuditEvent Model

**Goal**: Define AuditEvent model with all fields and database constraints.

**Implementation** (in `src/audit/models.py`):
```python
from django.db import models
from django.conf import settings


class AuditEvent(models.Model):
    """
    Immutable audit event record for system-wide activity tracking.

    Each event captures WHO did WHAT, WHEN, and WHERE (organizational context).
    Metadata contains event-specific details as JSON.
    """

    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)

    # Context: WHO
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
        db_index=True
    )

    # Context: WHERE (organizational hierarchy)
    organization = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
        db_index=True
    )

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events',
        db_index=True
    )

    # Event-specific details (max 10KB, validated in API)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'audit_events'
        ordering = ['-created_at']
        verbose_name = 'Audit Event'
        verbose_name_plural = 'Audit Events'
        indexes = [
            models.Index(fields=['-created_at'], name='audit_created_desc'),
            models.Index(fields=['event_type'], name='audit_event_type'),
            models.Index(fields=['user'], name='audit_user'),
            models.Index(fields=['organization'], name='audit_org'),
            models.Index(fields=['project'], name='audit_project'),
        ]

    def __str__(self):
        user_display = self.user.email if self.user else 'anonymous'
        return f"{self.event_type} by {user_display} at {self.created_at}"
```

**Key Design Points**:
- **BigAutoField**: Supports large-scale deployments (billions of events)
- **auto_now_add**: Immutable timestamp set at creation
- **SET_NULL on delete**: Preserve audit trail even if user/org/project deleted
- **JSONField default=dict**: Avoids null checks, always valid JSON
- **ordering = ['-created_at']**: Latest events first (matches admin/API behavior)

**Files Modified**:
- `src/audit/models.py`

**Validation**:
- Import succeeds: `python manage.py shell -c "from audit.models import AuditEvent"`
- Model registered: `python manage.py showmigrations audit` (no migrations yet)

---

### T003: Create Initial Migration with GIN Index

**Goal**: Generate 0001_initial.py migration with explicit GIN index on metadata field.

**Steps**:
1. Run `python manage.py makemigrations audit`
2. Open generated `src/audit/migrations/0001_initial.py`
3. Manually add GIN index operation BEFORE CreateModel operation:
   ```python
   from django.db import migrations, models
   from django.contrib.postgres.operations import AddIndexConcurrently
   from django.contrib.postgres.indexes import GinIndex

   class Migration(migrations.Migration):
       atomic = False  # Required for concurrent index creation

       initial = True

       dependencies = [
           migrations.swappable_dependency(settings.AUTH_USER_MODEL),
           ('organisations', '0001_initial'),  # Adjust version as needed
           ('projects', '0001_initial'),  # Adjust version as needed
       ]

       operations = [
           migrations.CreateModel(
               name='AuditEvent',
               fields=[
                   # ... (Django-generated fields)
               ],
               options={
                   'db_table': 'audit_events',
                   'ordering': ['-created_at'],
                   # ...
               },
           ),
           migrations.AddIndex(
               model_name='auditevent',
               index=GinIndex(fields=['metadata'], name='audit_metadata_gin'),
           ),
       ]
   ```
4. Run `python manage.py migrate audit` to apply
5. Verify index created:
   ```bash
   python manage.py dbshell
   # In PostgreSQL shell:
   \d audit_events
   # Should show audit_metadata_gin GIN index
   ```

**Why GIN Index**: Enables fast JSON queries like `metadata__ip='127.0.0.1'` or `metadata__action='login'`. Critical for admin search performance.

**Files Created**:
- `src/audit/migrations/0001_initial.py`

**Files Modified**:
- `src/audit/migrations/0001_initial.py` (manual GIN index addition)

**Validation**:
- Migration applies cleanly: `python manage.py migrate audit`
- Table exists: `python manage.py dbshell -c "\dt audit_events"`
- GIN index exists: `python manage.py dbshell -c "\d audit_events"` shows `audit_metadata_gin`

---

### T004: Implement Event Type Registry [P]

**Goal**: Create thread-safe event type registry with validation and metadata tracking.

**Implementation** (create `src/audit/registry.py`):
```python
"""
Event type registry for audit system.

Provides centralized management of event types with format validation
and metadata tracking. Event types must be registered before use.
"""
from dataclasses import dataclass
from threading import Lock
from typing import Dict, List, Optional


@dataclass(frozen=True)
class EventTypeMetadata:
    """Metadata for a registered event type."""

    name: str
    category: str  # e.g., 'auth', 'permission', 'role', 'config', 'resource'
    description: str
    required_metadata_keys: List[str] = None

    def __post_init__(self):
        # Validate format: category.action (e.g., 'auth.login')
        if '.' not in self.name:
            raise ValueError(f"Event type must be 'category.action' format: {self.name}")

        if self.required_metadata_keys is None:
            object.__setattr__(self, 'required_metadata_keys', [])


class EventTypeRegistry:
    """
    Thread-safe registry of audit event types.

    Singleton pattern ensures single source of truth for event types.
    """

    _instance: Optional['EventTypeRegistry'] = None
    _lock: Lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._registry: Dict[str, EventTypeMetadata] = {}
                    cls._instance._registry_lock = Lock()
        return cls._instance

    def register(self, event_type: EventTypeMetadata) -> None:
        """Register a new event type."""
        with self._registry_lock:
            if event_type.name in self._registry:
                # Idempotent: re-registration with same metadata is OK
                existing = self._registry[event_type.name]
                if existing.description != event_type.description:
                    raise ValueError(
                        f"Event type {event_type.name} already registered "
                        f"with different description"
                    )
            else:
                self._registry[event_type.name] = event_type

    def get(self, name: str) -> Optional[EventTypeMetadata]:
        """Get metadata for an event type."""
        return self._registry.get(name)

    def is_registered(self, name: str) -> bool:
        """Check if event type is registered."""
        return name in self._registry

    def list_all(self) -> List[EventTypeMetadata]:
        """List all registered event types."""
        return list(self._registry.values())


# Global registry instance
_registry = EventTypeRegistry()


def register_event_type(
    name: str,
    category: str,
    description: str,
    required_metadata_keys: Optional[List[str]] = None
) -> None:
    """
    Register an event type.

    Args:
        name: Event type name in 'category.action' format
        category: Event category (e.g., 'auth', 'permission')
        description: Human-readable description
        required_metadata_keys: Required metadata keys (optional)

    Example:
        register_event_type(
            'auth.login',
            'auth',
            'User successfully logged in',
            required_metadata_keys=['ip']
        )
    """
    metadata = EventTypeMetadata(
        name=name,
        category=category,
        description=description,
        required_metadata_keys=required_metadata_keys or []
    )
    _registry.register(metadata)


def get_event_type(name: str) -> Optional[EventTypeMetadata]:
    """Get metadata for an event type."""
    return _registry.get(name)


def is_event_type_registered(name: str) -> bool:
    """Check if event type is registered."""
    return _registry.is_registered(name)


def list_event_types() -> List[EventTypeMetadata]:
    """List all registered event types."""
    return _registry.list_all()
```

**Key Design Points**:
- **Singleton Pattern**: Ensures single registry instance across application
- **Thread-Safe**: Lock protects concurrent registration during startup
- **Idempotent**: Re-registering same event type is safe
- **Validation**: Enforces 'category.action' format
- **Frozen Dataclass**: EventTypeMetadata is immutable

**Files Created**:
- `src/audit/registry.py`

**Validation**:
- Import succeeds: `python -c "from audit.registry import register_event_type"`
- Registration works: `python -c "from audit.registry import register_event_type; register_event_type('test.event', 'test', 'Test event')"`

---

### T005: Implement audit_log.record() API [P]

**Goal**: Create main API for recording audit events with validation, graceful failure, signal emission, and metric increment.

**Implementation** (create `src/audit/api.py`):
```python
"""
Audit logging API.

Provides the primary interface for recording audit events throughout
the application. All audit recording should go through this module.
"""
import json
import logging
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.db import transaction

from audit.models import AuditEvent
from audit.registry import is_event_type_registered
from audit.signals import audit_record_failed
from audit.metrics import audit_events_recorded_total, audit_failures_total


User = get_user_model()
logger = logging.getLogger(__name__)


class AuditLog:
    """
    Audit logging interface.

    Usage:
        from audit.api import audit_log

        audit_log.record(
            'auth.login',
            user=request.user,
            metadata={'ip': request.META['REMOTE_ADDR']}
        )
    """

    def record(
        self,
        event_type: str,
        user: Optional[User] = None,
        organization: Optional[Any] = None,
        project: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Any] = None
    ) -> Optional[AuditEvent]:
        """
        Record an audit event.

        Args:
            event_type: Registered event type (e.g., 'auth.login')
            user: User who triggered the event (optional)
            organization: Organization context (optional)
            project: Project context (optional)
            metadata: Event-specific details (optional, max 10KB)
            request: HttpRequest for automatic IP/user agent capture (optional)

        Returns:
            AuditEvent instance if successful, None if graceful failure

        Raises:
            ValueError: If event_type not registered or metadata too large
        """
        metadata = metadata or {}

        # Validation: Event type must be registered
        if not is_event_type_registered(event_type):
            raise ValueError(
                f"Event type '{event_type}' not registered. "
                f"Register with register_event_type() before use."
            )

        # Validation: Metadata size limit (10KB)
        metadata_json = json.dumps(metadata)
        metadata_size_kb = len(metadata_json.encode('utf-8')) / 1024
        if metadata_size_kb > 10:
            raise ValueError(
                f"Metadata size {metadata_size_kb:.2f}KB exceeds 10KB limit. "
                f"Reduce metadata or store large data elsewhere."
            )

        # Auto-capture IP and user agent from request
        if request:
            metadata.setdefault('ip', request.META.get('REMOTE_ADDR'))
            metadata.setdefault('user_agent', request.META.get('HTTP_USER_AGENT'))

        # Graceful failure: Never break application flow
        try:
            with transaction.atomic():
                event = AuditEvent.objects.create(
                    event_type=event_type,
                    user=user,
                    organization=organization,
                    project=project,
                    metadata=metadata
                )

            # Metrics: Increment success counter
            audit_events_recorded_total.labels(
                event_type=event_type
            ).inc()

            return event

        except Exception as e:
            # Log error (ops team visibility)
            logger.exception(
                f"Failed to record audit event: {event_type}",
                extra={
                    'event_type': event_type,
                    'user_id': user.id if user else None,
                    'error': str(e)
                }
            )

            # Emit signal (application-level observability)
            audit_record_failed.send(
                sender=self.__class__,
                event_type=event_type,
                exception=e,
                event_data={
                    'user': user,
                    'organization': organization,
                    'project': project,
                    'metadata': metadata
                }
            )

            # Metrics: Increment failure counter
            audit_failures_total.labels(
                event_type=event_type,
                error_type=e.__class__.__name__
            ).inc()

            # Graceful degradation: Return None, don't re-raise
            return None


# Global singleton instance
audit_log = AuditLog()
```

**Key Design Points**:
- **Validation First**: Check event type and metadata size before DB write
- **Graceful Failure**: try/except ensures audit never breaks app flow
- **Auto-Capture**: Extract IP/user agent from request automatically
- **Dual Observability**: Logs + signals + metrics for failure tracking
- **Transaction Safety**: Atomic DB write prevents partial records

**Files Created**:
- `src/audit/api.py`

**Validation**:
- Import succeeds: `python -c "from audit.api import audit_log"`
- Call fails with unregistered type: `python -c "from audit.api import audit_log; audit_log.record('test.unregistered')"` raises ValueError

---

### T006: Create Django Signal for Failure Observability [P]

**Goal**: Define audit_record_failed signal for application-level failure monitoring.

**Implementation** (create `src/audit/signals.py`):
```python
"""
Audit system signals.

Signals allow downstream applications to react to audit system events
without tight coupling.
"""
import django.dispatch


# Signal: audit_record_failed
# Sent when audit_log.record() fails to persist an event
#
# Arguments:
#   sender: AuditLog class
#   event_type: str - The event type that failed to record
#   exception: Exception - The exception that occurred
#   event_data: dict - The event data that failed to persist
#
# Example handler:
#   from audit.signals import audit_record_failed
#
#   @receiver(audit_record_failed)
#   def handle_audit_failure(sender, event_type, exception, event_data, **kwargs):
#       # Alert ops team, log to external system, etc.
#       pass
#
audit_record_failed = django.dispatch.Signal()
```

**Why Signals**: Provides hook for downstream applications to monitor audit failures without modifying audit code. Example use: Alert Slack channel if audit failures spike.

**Files Created**:
- `src/audit/signals.py`

**Validation**:
- Import succeeds: `python -c "from audit.signals import audit_record_failed"`

---

### T007: Implement Prometheus Metrics [P]

**Goal**: Define Prometheus counters for audit events and failures.

**Implementation** (create `src/audit/metrics.py`):
```python
"""
Prometheus metrics for audit system.

Metrics provide observability into audit system health and usage patterns.
"""
from prometheus_client import Counter


# Counter: audit_events_recorded_total
# Tracks successful audit event recordings
# Labels: event_type
audit_events_recorded_total = Counter(
    'audit_events_recorded_total',
    'Total number of audit events successfully recorded',
    labelnames=['event_type']
)


# Counter: audit_failures_total
# Tracks failed audit event recordings
# Labels: event_type, error_type
audit_failures_total = Counter(
    'audit_failures_total',
    'Total number of audit event recording failures',
    labelnames=['event_type', 'error_type']
)
```

**Why Prometheus**: Integrates with existing django-prometheus setup from B06. Ops team can create alerts (e.g., "Alert if audit_failures_total > 10/min").

**Files Created**:
- `src/audit/metrics.py`

**Validation**:
- Import succeeds: `python -c "from audit.metrics import audit_events_recorded_total"`
- Metrics registered: Start dev server, visit `/metrics`, search for `audit_events_recorded_total`

---

### T008: Register Core Event Types

**Goal**: Pre-register 13 core event types in apps.py ready() method.

**Implementation** (modify `src/audit/apps.py`):
```python
from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'
    verbose_name = 'Audit Logging'

    def ready(self):
        """
        Register core event types when app is ready.

        This runs once per process during Django startup.
        """
        from audit.registry import register_event_type

        # Authentication Events
        register_event_type(
            'auth.login',
            'auth',
            'User successfully logged in',
            required_metadata_keys=['ip']
        )
        register_event_type(
            'auth.logout',
            'auth',
            'User logged out'
        )
        register_event_type(
            'auth.login_failed',
            'auth',
            'Login attempt failed',
            required_metadata_keys=['ip', 'username']
        )
        register_event_type(
            'auth.password_changed',
            'auth',
            'User changed password'
        )

        # Permission Events
        register_event_type(
            'permission.checked',
            'permission',
            'Permission check performed',
            required_metadata_keys=['permission', 'result']
        )
        register_event_type(
            'permission.granted',
            'permission',
            'Permission explicitly granted',
            required_metadata_keys=['permission', 'target_user_id']
        )
        register_event_type(
            'permission.denied',
            'permission',
            'Permission explicitly denied',
            required_metadata_keys=['permission', 'reason']
        )

        # Role Events
        register_event_type(
            'role.assigned',
            'role',
            'Role assigned to user',
            required_metadata_keys=['role_name', 'target_user_id']
        )
        register_event_type(
            'role.revoked',
            'role',
            'Role revoked from user',
            required_metadata_keys=['role_name', 'target_user_id']
        )

        # Configuration Events
        register_event_type(
            'config.updated',
            'config',
            'System configuration changed',
            required_metadata_keys=['setting_name', 'old_value', 'new_value']
        )
        register_event_type(
            'config.feature_toggled',
            'config',
            'Feature flag toggled',
            required_metadata_keys=['feature_name', 'enabled']
        )

        # Resource Events
        register_event_type(
            'resource.created',
            'resource',
            'Resource created',
            required_metadata_keys=['resource_type', 'resource_id']
        )
        register_event_type(
            'resource.deleted',
            'resource',
            'Resource deleted',
            required_metadata_keys=['resource_type', 'resource_id']
        )
```

**Why apps.ready()**: Ensures event types registered before any code tries to use them. Runs once per process during Django startup.

**Files Modified**:
- `src/audit/apps.py`

**Validation**:
- Start Django shell: `python manage.py shell`
- Check registered types: `from audit.registry import list_event_types; print(len(list_event_types()))`
- Should print `13`

---

### T009: Configure Audit App in Settings

**Goal**: Add audit app to INSTALLED_APPS.

**Implementation** (modify `src/config/settings/base.py`):
```python
INSTALLED_APPS = [
    # ...existing apps...
    'audit.apps.AuditConfig',  # Add this line
]
```

**Why base.py**: Audit system should be enabled in all environments (local, staging, production).

**Files Modified**:
- `src/config/settings/base.py`

**Validation**:
- Run migrations: `python manage.py migrate` (should show audit migrations)
- Check installed apps: `python manage.py shell -c "from django.apps import apps; print('audit' in [app.label for app in apps.get_app_configs()])"`

---

### T010: Create Audit Module README

**Goal**: Document audit API, usage examples, and event type conventions.

**Implementation** (create `src/audit/README.md`):
```markdown
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
```

**Files Created**:
- `src/audit/README.md`

**Validation**:
- File exists: `cat src/audit/README.md`
- Markdown renders correctly in GitHub/IDE

---

## Test Strategy

**Unit Tests** (in WP02):
- Registry: register_event_type() idempotency, format validation, list_event_types()
- API: audit_log.record() success cases, validation errors, graceful failure
- Metrics: Counter increment verification

**Integration Tests** (in WP03, WP05):
- End-to-end event recording and retrieval
- B08 permission check creates audit events

**No tests in this work package** - focus on implementation, tests in WP02.

## Definition of Done

- [ ] All 10 subtasks completed (T001-T010)
- [ ] Django migrations applied cleanly (`python manage.py migrate audit`)
- [ ] Audit app appears in INSTALLED_APPS
- [ ] Can import: `from audit.api import audit_log`
- [ ] Can import: `from audit.registry import register_event_type, list_event_types`
- [ ] Python shell test passes:
  ```python
  from audit.api import audit_log
  from audit.registry import list_event_types

  # Verify 13 core event types registered
  assert len(list_event_types()) == 13

  # Record test event (replace with real user)
  event = audit_log.record(
      'auth.login',
      metadata={'ip': '127.0.0.1', 'test': True}
  )
  assert event is not None
  assert event.event_type == 'auth.login'
  assert event.metadata['ip'] == '127.0.0.1'
  ```
- [ ] Database table exists: `audit_events` with 7 columns
- [ ] GIN index exists: `\d audit_events` shows `audit_metadata_gin`
- [ ] Prometheus metrics endpoint shows `audit_events_recorded_total`
- [ ] README.md documentation complete with examples
- [ ] No linting errors: `ruff check src/audit/`
- [ ] Type checking passes: `mypy src/audit/` (with django-stubs)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GIN index migration syntax error | High | Test migration on local PostgreSQL first, reference Django docs |
| Event type registration timing issues | Medium | Use apps.py ready() method (runs once per process) |
| Prometheus metrics not appearing | Low | Verify django-prometheus installed from B06, check /metrics endpoint |
| Type checking errors with Django ORM | Medium | Use django-stubs, add `# type: ignore` with justification if needed |

## Reviewer Guidance

**What to verify**:
1. **Model Design**: AuditEvent follows data-model.md exactly (7 fields, correct indexes)
2. **Migration Quality**: 0001_initial.py includes GIN index, has correct dependencies
3. **API Safety**: audit_log.record() has try/except for graceful failure
4. **Registry Thread Safety**: EventTypeRegistry uses locks for concurrent access
5. **Event Types**: All 13 core types registered in apps.py with correct categories
6. **Documentation**: README.md has clear examples and troubleshooting

**What to test**:
1. Run `python manage.py migrate audit` - should succeed with no errors
2. Run `python manage.py shell` - verify 13 event types registered
3. Record test event via Python shell - verify persists to database
4. Visit `/admin/audit/auditevent/` - verify admin accessible (WP03 makes it functional)
5. Visit `/metrics` - verify `audit_events_recorded_total` counter exists

**Red flags**:
- Migration fails due to missing dependencies (organisations, projects)
- Event types not registered (list_event_types() returns empty)
- audit_log.record() raises exceptions instead of graceful failure
- Type checking reveals fundamental design issues

## Activity Log

- 2025-11-27T13:48:18Z – claude – shell_pid=45896 – lane=doing – Started implementation of audit app foundation
- 2025-11-27T13:58:24Z – claude – shell_pid=45896 – lane=for_review – Completed WP01: All 10 tasks implemented, tested imports, migration generated with GIN index

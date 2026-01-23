# Research: Audit Logging System
*Path: [kitty-specs/009-audit-logging-system/research.md](kitty-specs/009-audit-logging-system/research.md)*

**Feature Branch**: `009-audit-logging-system`
**Date**: 2025-11-27
**Spec**: [spec.md](spec.md)

## Research Summary

This document consolidates all technical research and decisions made during planning for the Audit Logging System feature.

---

## Decision 1: B08 Integration Pattern

**Context**: The specification requires automatic logging of permission checks and role assignments from the B08 Hierarchical Access Control system. Multiple integration approaches were considered.

**Decision**: Direct calls from B08 code to audit API

**Rationale**:
- **Guaranteed Coverage**: Direct calls ensure 100% coverage of permission events without risk of missing signals or middleware bypasses
- **Simplicity**: Straightforward implementation without complex signal infrastructure
- **Performance**: Minimal overhead compared to signal dispatch/subscription mechanisms
- **Explicit Dependencies**: Makes the audit dependency clear in B08 code
- **Stable API**: B08 calls `audit_log.record()` - a simple, stable public API

**Alternatives Considered**:
1. **Django Signals** (post_save on RoleAssignment, custom signals from evaluator)
   - Pros: Loose coupling, follows Django patterns
   - Cons: May miss direct database operations, signals can be disconnected, harder to debug missing events

2. **Middleware** wrapping permission checks
   - Pros: Centralized interception point
   - Cons: Cannot capture all permission check paths (management commands, background tasks), performance overhead on every request

3. **Decorator Pattern** on permission check functions
   - Pros: Explicit per-function control
   - Cons: Easy to forget decorators, scattered instrumentation, doesn't cover model-level operations

**Implementation Notes**:
- B08 will import `from audit.api import audit_log`
- Integration points: `RoleAssignment.save()`, `evaluator.check_permission()`, role deletion
- Requires coordination with B08 maintainers during implementation
- Audit API must remain backward compatible

**Trade-offs Accepted**:
- Tight coupling between B08 and audit systems (mitigated by stable public API)
- B08 code changes required (acceptable for guaranteed coverage)

---

## Decision 2: Failure Observability

**Context**: FR-006 requires graceful degradation when audit recording fails (log but don't crash). However, silent failures create security blind spots.

**Decision**: Django signals + Prometheus metrics (dual observability)

**Rationale**:
- **Proactive Monitoring**: Prometheus `audit_failures_total` counter enables alerting before incidents occur
- **Real-time Visibility**: Metrics dashboards show audit health at a glance
- **Extensibility**: Django `audit_record_failed` signal allows custom handlers (email alerts, ticket creation, etc.)
- **Standard Logging**: Still logs to Django logger as baseline
- **No Application Impact**: Failures don't crash calling code per FR-006

**Alternatives Considered**:
1. **Standard Django logging only**
   - Pros: Simple, no dependencies
   - Cons: Logs easily missed, reactive not proactive, no aggregation

2. **Emit Django signals only**
   - Pros: Extensible via signal handlers
   - Cons: Requires custom handler implementation, no built-in metrics

3. **Increment Prometheus counters only**
   - Pros: Built-in alerting and dashboards
   - Cons: Requires Prometheus setup, less context than logs

**Implementation Notes**:
- Signal: `audit_record_failed` with sender=AuditEvent, exception=Exception, event_data=dict
- Metric: `audit_failures_total{event_type="auth.login", reason="database_unavailable"}`
- Logging: `logger.exception("Failed to record audit event", extra={...})`
- All three fire on any `audit_log.record()` exception

**Best Practices**:
- Set up Prometheus alert: `rate(audit_failures_total[5m]) > 0`
- Optional signal handler for critical event types (auth.login failures → page ops)
- Include event_type and error class in metric labels for granular alerting

---

## Decision 3: Event Type Management

**Context**: FR-013 requires event type validation with dot-notation format (e.g., "auth.login", "permission.granted"). Need extensibility for downstream products while maintaining type safety.

**Decision**: Registry pattern allowing apps to register custom types

**Rationale**:
- **Product-Agnostic**: Core system doesn't hardcode all possible event types
- **Extensibility**: Downstream products register their own types: `audit.registry.register_event_type("billing.subscription_created")`
- **Runtime Validation**: Invalid types rejected at registration or recording time
- **Backward Compatible**: Core types pre-registered during app ready
- **Documentation**: Registry serves as single source of truth for valid types

**Alternatives Considered**:
1. **String constants only** (e.g., `EVENT_TYPE_AUTH_LOGIN = "auth.login"`)
   - Pros: Simple, no infrastructure
   - Cons: No validation, typos cause silent failures, no discoverability

2. **Enum class** (e.g., `EventType.AUTH_LOGIN`)
   - Pros: Type safety, IDE autocomplete
   - Cons: Not extensible without modifying core code, violates product-agnostic principle

3. **Database table** with seed data
   - Pros: Centralized, queryable
   - Cons: Runtime overhead, migration complexity, overkill for validation

**Implementation Notes**:
```python
# Core audit app ready:
from audit.registry import register_event_type
register_event_type("auth.login", description="User authenticated successfully")
register_event_type("permission.granted", description="Permission granted to user")

# Downstream product app ready:
register_event_type("billing.subscription_created", description="New subscription")

# API validation:
audit_log.record(event_type="auth.login")  # ✅ Valid
audit_log.record(event_type="invalid")     # ❌ ValueError: Unregistered event type
```

**Registry Structure**:
- Module: `audit/registry.py`
- Storage: In-memory dict `{event_type: EventTypeMetadata}`
- Thread-safe registration using lock
- Admin command: `./manage.py audit_list_event_types`

**Validation Rules**:
- Format: `^[a-z0-9_]+\.[a-z0-9_]+$` (category.action)
- Uniqueness: Duplicate registration raises error
- Required: Metadata includes description for documentation

---

## Decision 4: Metadata Storage

**Context**: FR-001 requires extensible JSON metadata. FR-012 requires indexes on frequently-queried fields. Need balance between query performance and storage efficiency.

**Decision**: JSONField with explicit GIN index in migration

**Rationale**:
- **Query Performance**: GIN index enables fast JSON queries: `.filter(metadata__ip="192.168.1.1")`
- **Standard Django**: `models.JSONField` is built-in, well-documented
- **PostgreSQL Native**: Leverages PostgreSQL JSON operators and indexing
- **Extensibility**: Apps can add arbitrary metadata without schema changes
- **Size Control**: 10KB limit (FR-001 clarification) prevents runaway storage

**Alternatives Considered**:
1. **TextField with JSON serialization**
   - Pros: Simple, universal
   - Cons: No query support, manual deserialization, no validation

2. **Hybrid approach** (JSONField for queryable, TextField for overflow)
   - Pros: Handles large metadata
   - Cons: Complex implementation, split data model, unclear when to use which

3. **JSONField without GIN index**
   - Pros: Simpler migration
   - Cons: Slow JSON queries, defeats purpose of structured metadata

**Implementation Notes**:
```python
# Model:
class AuditEvent(models.Model):
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            GinIndex(fields=['metadata'], name='audit_metadata_gin_idx'),
        ]

# Migration:
operations = [
    migrations.AddField(
        model_name='auditevent',
        name='metadata',
        field=models.JSONField(blank=True, default=dict),
    ),
    migrations.AddIndex(
        model_name='auditevent',
        index=GinIndex(fields=['metadata'], name='audit_metadata_gin_idx'),
    ),
]

# Usage:
audit_log.record(
    event_type="auth.login",
    user=user,
    metadata={"ip": "192.168.1.1", "user_agent": "Mozilla/5.0..."}
)

# Query:
AuditEvent.objects.filter(metadata__ip="192.168.1.1")
```

**Size Validation**:
```python
import json

def validate_metadata_size(metadata: dict) -> None:
    """Ensure metadata <= 10KB when serialized"""
    json_str = json.dumps(metadata)
    size_kb = len(json_str.encode('utf-8')) / 1024
    if size_kb > 10:
        raise ValueError(f"Metadata size {size_kb:.2f}KB exceeds 10KB limit")
```

**Performance Considerations**:
- GIN index increases write time by ~10-20% (acceptable for audit system)
- Index size: ~50% of data size (e.g., 50MB index for 100MB data)
- Query speedup: 10-100x for JSON path queries on large tables

---

## Decision 5: Admin Read-Only Enforcement

**Context**: FR-015 requires read-only Django admin to prevent audit trail tampering. Need defense-in-depth approach for security-critical feature.

**Decision**: Multi-layer enforcement (permissions + admin overrides)

**Rationale**:
- **Defense in Depth**: Multiple independent controls prevent single point of failure
- **Permission Layer**: Custom `audit.view_auditevent` permission (no add/change/delete)
- **Admin Layer**: Override `has_add_permission`, `has_change_permission`, `has_delete_permission` to return False
- **Model Layer**: Optional `AuditEvent.save()` override to raise exception for updates (debatable - may break migrations)
- **Audit Trail Integrity**: Critical for compliance, legal evidence, security investigations

**Alternatives Considered**:
1. **Permission checks only**
   - Pros: Standard Django pattern
   - Cons: Admin superuser bypasses permissions, single layer

2. **Admin method overrides only**
   - Pros: Works regardless of permissions
   - Cons: Doesn't prevent direct model operations, less discoverable

3. **Separate permission class only**
   - Pros: Explicit permission model
   - Cons: Requires permission assignment, easy to misconfigure

**Implementation Notes**:
```python
# admin.py
from django.contrib import admin
from .models import AuditEvent

@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'event_type', 'user', 'organization', 'project']
    list_filter = ['event_type', 'created_at', 'organization']
    search_fields = ['user__email', 'event_type', 'metadata']
    readonly_fields = ['created_at', 'event_type', 'user', 'organization', 'project', 'metadata']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions
```

```python
# models.py
class AuditEvent(models.Model):
    # ... fields ...

    class Meta:
        permissions = [
            ('view_auditevent', 'Can view audit events'),
        ]
        default_permissions = ('view',)  # Remove add, change, delete
```

**User Assignment**:
- Create group: "Auditors"
- Assign permission: `audit.view_auditevent`
- Assign users to group
- Superusers still blocked by admin method overrides

**Testing**:
- Test superuser cannot add/change/delete via admin
- Test staff user with permission can view but not modify
- Test direct model operations (should work - admin restriction only)
- Test CSV export still functions

---

## Technology Stack Summary

Based on planning decisions and feature requirements:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | Python 3.12+ | Constitution baseline |
| **Framework** | Django 5.1+ | Project baseline |
| **Database** | PostgreSQL 13+ | JSON field support, GIN indexes |
| **ORM** | Django ORM | Standard, with explicit GIN index |
| **API** | Python function (`audit_log.record()`) | Simplicity, not REST API in MVP |
| **Admin** | Django Admin | FR-004 requirement, sufficient for MVP |
| **Metrics** | Prometheus + django-prometheus | Already in use (B06 feature) |
| **Signals** | Django signals | Standard Django pattern |
| **Testing** | pytest + pytest-django | Constitution requirement |
| **Type Checking** | mypy with django-stubs | Constitution requirement |
| **Linting** | Black + Ruff | Constitution requirement |

---

## Integration Points

### B08 Hierarchical Access Control
- **Files Modified**: `src/permissions/evaluator.py`, `src/permissions/models.py`
- **Integration**: Direct imports: `from audit.api import audit_log`
- **Events Generated**:
  - `permission.checked` - Every `evaluator.check_permission()` call
  - `role.assigned` - RoleAssignment creation
  - `role.revoked` - RoleAssignment deletion
  - `permission.granted` - Explicit permission grants
  - `permission.denied` - Permission check failures

### B03 Security Baseline
- **Files Modified**: `src/accounts/views.py` (auth views)
- **Integration**: Direct imports: `from audit.api import audit_log`
- **Events Generated**:
  - `auth.login` - Successful authentication
  - `auth.logout` - User logout
  - `auth.login_failed` - Failed authentication attempt
  - `auth.password_changed` - Password update

### B05 Accounts
- **Dependency**: `AuditEvent.user` foreign key to `accounts.User`
- **Events**: User lifecycle events (creation, activation, deactivation)

### B06 Organization Management
- **Dependency**: `AuditEvent.organization` foreign key to `organizations.Organization`
- **Events**: Organization config changes, member additions/removals

### B07 Projects/Workspaces
- **Dependency**: `AuditEvent.project` foreign key to `projects.Project`
- **Events**: Project creation, deletion, settings changes

---

## Open Research Questions

*All critical questions resolved during planning interrogation. No blockers remain.*

---

## References

- Feature Specification: [spec.md](spec.md)
- Django JSON Fields: https://docs.djangoproject.com/en/5.1/ref/models/fields/#jsonfield
- PostgreSQL GIN Indexes: https://www.postgresql.org/docs/current/gin-intro.html
- Django Signals: https://docs.djangoproject.com/en/5.1/topics/signals/
- Prometheus Python Client: https://prometheus.io/docs/instrumenting/clientlibs/
- Django Admin Customization: https://docs.djangoproject.com/en/5.1/ref/contrib/admin/

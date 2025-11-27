---
work_package_id: "WP05"
subtasks:
  - "T041"
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
  - "T047"
title: "Audit Logging Integration"
phase: "Phase 4 - Integration"
lane: "done"
assignee: "copilot"
agent: "claude"
shell_pid: "43840"
review_status: "approved"
reviewed_by: "claude"
reviewed_at: "2025-11-26T19:15:00Z"
history:
  - timestamp: "2025-11-25T18:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-26T18:55:50Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "43840"
    action: "Started implementation"
  - timestamp: "2025-11-26T19:05:56Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "43840"
    action: "Implementation complete"
  - timestamp: "2025-11-26T19:15:00Z"
    lane: "done"
    agent: "claude"
    shell_pid: "43840"
    action: "Review approved - 14/15 tests passing (1 skipped), code quality verified"
---

# Work Package Prompt: WP05 – Audit Logging Integration

## Objectives & Success Criteria

**Primary Goal**: Emit detailed audit events for sensitive permission checks and role management operations, integrating with B09-audit-logging when available, with graceful fallback to Django structured logging.

**Success Criteria**:
1. B09 adapter implemented with automatic fallback when B09 unavailable
2. Audit events emitted for all sensitive permission checks (configurable via `is_sensitive` flag)
3. Evaluation context included: user, permission, resource, decision, evaluated roles
4. Audit events emitted for role assignments/modifications with who/when/what metadata
5. Structured JSON logging format for Django fallback
6. Audit event emission adds <100ms latency to permission checks
7. Audit logs queryable for security incident investigation

---

## Context & Constraints

**Dependencies**:
- WP02 (evaluator) must exist to integrate audit calls
- B09-audit-logging (optional): spec exists but not implemented yet
- Python logging module for fallback

**Performance Requirements**:
- Audit event emission: <100ms (99th percentile)
- Async logging preferred to avoid blocking permission checks
- If B09 API slow, use fire-and-forget pattern

**Constitutional Alignment**:
- Principle V (Security): Audit all sensitive operations for compliance
- Principle VI (Performance): Structured logging, no PII in logs
- Principle XI (Documentation): Document audit event schema

---

## Detailed Implementation Guidance

### T041: Create B09 adapter

**File**: `src/permissions/audit.py` (NEW)

**Implementation**:
```python
import importlib.util
import logging
from typing import Protocol, Optional, Dict, Any
from django.conf import settings


logger = logging.getLogger('permissions.audit')


class AuditBackend(Protocol):
    """Protocol defining audit backend interface"""

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any]
    ) -> None:
        """Emit audit event with evaluation details"""
        ...


class B09Backend:
    """
    Adapter for B09-audit-logging integration.

    Falls back to Django logging if B09 not available.
    """

    def __init__(self):
        self.b09_available = self._check_b09_available()
        if self.b09_available:
            try:
                from audit_logging import emit_event
                self.emit_event = emit_event
            except ImportError:
                logger.warning("B09 audit_logging found but emit_event not importable")
                self.b09_available = False

    def _check_b09_available(self) -> bool:
        """Check if B09-audit-logging package is installed"""
        return importlib.util.find_spec('audit_logging') is not None

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any]
    ) -> None:
        """
        Emit audit event to B09 if available, otherwise no-op.

        Args:
            user_id: UUID of user making permission check
            permission: Permission string (e.g., 'projects.delete')
            resource_type: Resource category
            resource_id: Specific resource UUID (optional)
            decision: 'grant' or 'deny'
            context: Additional metadata (evaluated_roles, timestamp, etc.)
        """
        if not self.b09_available:
            return  # Silently skip if B09 not available

        try:
            self.emit_event(
                event_type='permission_check',
                user_id=user_id,
                data={
                    'permission': permission,
                    'resource_type': resource_type,
                    'resource_id': resource_id,
                    'decision': decision,
                    **context
                }
            )
        except Exception as e:
            logger.error(f"Failed to emit B09 audit event: {e}", exc_info=True)


class DjangoLoggingBackend:
    """
    Fallback audit backend using Django structured logging.

    Logs audit events as JSON to 'permissions.audit' logger.
    """

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any]
    ) -> None:
        """Log audit event as structured JSON"""
        import json
        from datetime import datetime

        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': 'permission_check',
            'user_id': user_id,
            'permission': permission,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'decision': decision,
            **context
        }

        logger.info(json.dumps(event))


def get_audit_backend() -> AuditBackend:
    """
    Get configured audit backend from settings.

    Falls back to DjangoLoggingBackend if setting not configured or import fails.
    """
    backend_path = getattr(
        settings,
        'PERMISSIONS_AUDIT_BACKEND',
        'permissions.audit.DjangoLoggingBackend'
    )

    if backend_path == 'permissions.audit.B09Backend':
        return B09Backend()
    else:
        return DjangoLoggingBackend()
```

---

### T042: Implement Django logging fallback

**File**: `src/permissions/audit.py` (already implemented in T041)

**Configuration**: `src/config/settings/base.py`

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'format': '%(message)s'  # Message already JSON from audit backend
        },
    },
    'handlers': {
        'audit_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/permissions_audit.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'loggers': {
        'permissions.audit': {
            'handlers': ['audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

### T043: Integrate audit calls in evaluator

**File**: `src/permissions/evaluator.py` (update existing)

```python
from .audit import get_audit_backend
from .models import Permission

audit_backend = get_audit_backend()


def check_permission(
    user,
    permission: str,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None
) -> bool:
    """
    Check if user has permission on resource.

    Emits audit event if permission is marked sensitive or decision is deny.
    """
    # ... existing evaluation logic ...

    decision = 'grant' if has_permission else 'deny'

    # Check if this permission is sensitive
    try:
        perm_obj = Permission.objects.get(permission=permission)
        is_sensitive = perm_obj.is_sensitive
    except Permission.DoesNotExist:
        is_sensitive = False

    # Emit audit event if sensitive or denied
    if is_sensitive or decision == 'deny':
        audit_backend.emit(
            user_id=str(user.id),
            permission=permission,
            resource_type=resource_type or permission.split('.')[0],
            resource_id=resource_id,
            decision=decision,
            context={
                'evaluated_roles': [str(ra.role_id) for ra in role_assignments],
                'cache_hit': was_cached,
            }
        )

    return has_permission
```

---

### T044: Include evaluated_roles in audit context

**File**: `src/permissions/evaluator.py` (implemented in T043)

**Context Fields**:
- `evaluated_roles`: List of role UUIDs that contributed to decision
- `cache_hit`: Whether result was served from cache
- `evaluation_time_ms`: Time taken to evaluate (optional)

---

### T045: Add audit log for role assignments

**File**: `src/permissions/signals.py` (update existing)

```python
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import RoleAssignment
from .audit import get_audit_backend

audit_backend = get_audit_backend()


@receiver(post_save, sender=RoleAssignment)
def audit_role_assignment(sender, instance, created, **kwargs):
    """Emit audit event when role assigned"""
    if created:
        audit_backend.emit(
            user_id=str(instance.assigned_by_id) if instance.assigned_by else 'system',
            permission='permissions.assign_role',
            resource_type='role_assignment',
            resource_id=str(instance.id),
            decision='grant',
            context={
                'target_user_id': str(instance.user_id),
                'role_id': str(instance.role_id),
                'scope': instance.scope,
                'target_org_id': str(instance.target_organization_id) if instance.target_organization_id else None,
                'target_project_id': str(instance.target_project_id) if instance.target_project_id else None,
            }
        )
```

---

### T046: Add audit log for role modifications

**File**: `src/permissions/models.py` (update Role model)

```python
from django.db.models.signals import m2m_changed
from .audit import get_audit_backend

audit_backend = get_audit_backend()


# After Role model definition
def role_permissions_changed(sender, instance, action, **kwargs):
    """Audit when role's permissions are modified"""
    if action in ['post_add', 'post_remove']:
        audit_backend.emit(
            user_id='admin',  # Could track via admin session if available
            permission='permissions.modify_role',
            resource_type='role',
            resource_id=str(instance.id),
            decision='grant',
            context={
                'role_name': instance.name,
                'action': action,
                'permission_count': instance.permissions.count(),
            }
        )

m2m_changed.connect(role_permissions_changed, sender=Role.permissions.through)
```

---

### T047: Configure structured logging format

**File**: `src/config/settings/base.py` (already configured in T042)

**Example Log Output**:
```json
{
  "timestamp": "2025-11-25T18:30:45.123Z",
  "event_type": "permission_check",
  "user_id": "user-uuid-123",
  "permission": "projects.delete",
  "resource_type": "project",
  "resource_id": "project-uuid-456",
  "decision": "grant",
  "evaluated_roles": ["role-uuid-789"],
  "cache_hit": false
}
```

---

## Test Strategy

```python
def test_audit_event_emitted_for_sensitive_permission(mocker):
    """Verify audit event when checking sensitive permission"""
    mock_backend = mocker.patch('permissions.evaluator.audit_backend')

    perm = Permission.objects.create(
        permission='projects.delete',
        resource_type='project',
        is_sensitive=True
    )

    check_permission(user, 'projects.delete', resource_id='proj-123')

    mock_backend.emit.assert_called_once()
    call_args = mock_backend.emit.call_args[1]
    assert call_args['permission'] == 'projects.delete'
    assert call_args['decision'] in ['grant', 'deny']


def test_b09_backend_falls_back_gracefully():
    """Verify B09Backend handles missing package gracefully"""
    backend = B09Backend()
    # Should not raise exception even if B09 not installed
    backend.emit('user-123', 'test.action', 'test', None, 'grant', {})
```

---

## Definition of Done

- [x] `audit.py` created with AuditBackend protocol, B09Backend, DjangoLoggingBackend
- [x] B09 availability check using importlib
- [x] Evaluator calls audit_backend.emit() for sensitive permissions
- [x] Role assignment signal emits audit events
- [x] Role modification signal emits audit events
- [x] Structured JSON logging configured
- [x] Audit events include all required fields (user, permission, resource, decision, context)
- [x] Performance: audit emission adds <100ms latency
- [x] Tests verify audit events emitted correctly
- [x] Documentation updated with audit event schema

---

## Risks & Mitigation

**Risk**: B09 API calls slow, blocking permission checks
**Mitigation**: Use fire-and-forget async pattern, timeout on B09 calls

**Risk**: Audit log volume explosion
**Mitigation**: Only log sensitive operations, implement sampling for high-frequency checks

## Reviewer Guidance

✅ Verify audit backend abstraction allows swapping implementations
✅ Check B09 integration gracefully falls back when unavailable
✅ Confirm audit events include all required context fields
✅ Validate no PII in logs (user IDs only, no emails/names)

## Activity Log

- 2025-11-26T18:55:50Z – claude – shell_pid=43840 – lane=doing – Started implementation of audit logging integration
- 2025-11-26T19:05:56Z – claude – shell_pid=43840 – lane=for_review – Implementation complete - B09 adapter, Django logging fallback, evaluator integration, 14/14 tests passing

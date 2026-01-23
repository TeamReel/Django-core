# Research: Hierarchical Access Control System
*Path: kitty-specs/008-hierarchical-access-control/research.md*

**Feature**: 008-hierarchical-access-control
**Date**: 2025-11-25
**Status**: Complete

## Planning Decisions & Rationale

### 1. Cache Warming Strategy

**Decision**: Hybrid approach - pre-warm global/superuser roles on startup, lazy-load organization/project-specific roles

**Rationale**:
- Global roles (e.g., superuser) are accessed frequently and predictably - pre-warming avoids cold start penalty
- Organization/project roles are highly variable and numerous - lazy loading prevents excessive memory usage
- Hybrid approach balances startup time with first-request performance

**Alternatives Considered**:
- **Lazy loading only**: Simpler but causes noticeable latency spikes on first permission checks (cold start penalty)
- **Eager pre-warming all roles**: Excessive memory usage (potentially 100k+ role assignments), longer startup time (10+ seconds)

**Implementation Approach**:
- Django management command `warm_permission_cache.py` runs on application startup (or via cron/systemd timer)
- Pre-warms only global-scoped roles and role assignments for users with `is_superuser=True`
- Organization/project roles cached on-demand during first permission check

---

### 2. Permission Registry Implementation

**Decision**: Django AppConfig.ready() hook pattern for registering custom permissions

**Rationale**:
- Leverages Django's standard app initialization lifecycle - permissions registered when apps load
- No import order dependencies - AppConfig.ready() executes after all apps imported
- Testable - can reset registry between tests without side effects
- Familiar pattern for Django developers

**Alternatives Considered**:
- **Decorator-based registration**: Requires decorating model classes, creates implicit coupling between models and permissions
- **Settings-based registration**: Less flexible (requires editing settings.py), harder to distribute permissions with reusable apps

**Implementation Approach**:
```python
# In custom Django app's apps.py
from django.apps import AppConfig
from permissions.registry import permission_registry

class ReportsConfig(AppConfig):
    name = 'reports'

    def ready(self):
        permission_registry.register(
            'reports.generate',
            resource_type='report',
            description='Generate new reports',
            is_sensitive=False
        )
```

---

### 3. DRF Permission Class Integration

**Decision**: Custom permission classes (`HasPermission('projects.delete')`) in viewset `permission_classes` attribute

**Rationale**:
- Standard DRF pattern - familiar to Django developers, works with existing DRF features (throttling, pagination)
- Declarative - permission requirements visible at class level, not buried in methods
- Composable - can combine multiple permission classes (e.g., `[IsAuthenticated, HasPermission('projects.view')]`)
- Testable - DRF's `APIClient` and `force_authenticate` work seamlessly

**Alternatives Considered**:
- **Decorator approach**: Repetitive for viewsets with many actions, permission requirements less visible
- **Mixin-based auto-detection**: "Magic" behavior harder to reason about, assumes standard CRUD mapping (breaks for custom actions)

**Implementation Approach**:
```python
from permissions.api.permissions import HasPermission

class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasPermission('projects.view')]

    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission('projects.update')()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission('projects.delete')()]
        return super().get_permissions()
```

---

### 4. Audit Event Granularity Control

**Decision**: Database `is_sensitive` boolean flag on Permission model, configurable via Django admin interface

**Rationale**:
- Runtime configurability - security team can mark permissions as sensitive without code changes or redeployment
- Audit trail - Django admin tracks who changed sensitivity flag and when
- Environment-agnostic - same codebase works in dev (audit everything) and prod (audit sensitive only) with database configuration
- No settings file changes required for tuning audit volume

**Alternatives Considered**:
- **Settings-based list**: Requires code changes and redeployment to adjust audit scope, harder to track configuration history
- **Both (database + settings override)**: Adds complexity for marginal benefit (environment-specific overrides rarely needed)

**Implementation Approach**:
- Permission model has `is_sensitive: bool` field (default=False)
- Django admin provides inline editing of sensitivity flag with audit log
- Evaluator checks `permission.is_sensitive` before emitting audit event
- Seed script marks sensitive permissions by default: `['projects.delete', 'org.delete', 'permissions.assign_role', 'permissions.modify_role']`

---

### 5. B09 Audit Logging Integration

**Decision**: Build adapter layer with Django logging fallback (B09 spec exists but not implemented yet)

**Rationale**:
- Forward compatibility - design API contract now, swap implementation when B09 available
- No blocking - Feature 008 can proceed independently without waiting for B09
- Testable - adapter layer allows mocking B09 integration in tests
- Migration path - when B09 is ready, only adapter implementation changes (not call sites)

**Alternatives Considered**:
- **Direct B09 integration**: Blocked by B09 not being implemented yet
- **Only Django logging**: Loses structured audit event format, harder to query/analyze later

**Implementation Approach**:
```python
# permissions/audit.py
from typing import Protocol
import logging

logger = logging.getLogger('permissions.audit')

class AuditBackend(Protocol):
    def log_permission_decision(self, user_id, permission, resource, decision, context): ...

class DjangoLoggingBackend:
    def log_permission_decision(self, user_id, permission, resource, decision, context):
        logger.info(
            f"Permission check: user={user_id} permission={permission} "
            f"resource={resource} decision={decision}",
            extra={'context': context}
        )

class B09Backend:  # Future implementation
    def log_permission_decision(self, user_id, permission, resource, decision, context):
        from audit_logging.client import audit_client
        audit_client.emit_event('permission.decision', {
            'user_id': user_id,
            'permission': permission,
            'resource': resource,
            'decision': decision,
            **context
        })

# Use settings to select backend
def get_audit_backend() -> AuditBackend:
    from django.conf import settings
    backend_class = settings.PERMISSIONS_AUDIT_BACKEND  # default: DjangoLoggingBackend
    return backend_class()
```

---

## Technology Stack Decisions

### Core Framework
- **Django 5.1+**: Latest LTS with improved async support, type hint compatibility
- **Django REST Framework 3.14+**: Standard for Django APIs, mature permission system to extend
- **django-stubs**: Type hints for Django ORM, admin, and core modules

### Caching Layer
- **Redis 7.0+**: Mature, reliable, supports TTL-based expiration and atomic operations
- **django-redis 5.4+**: Django cache backend with connection pooling, tested at scale

### Testing
- **pytest 8.0+**: Modern testing framework with excellent fixture support
- **pytest-django 4.7+**: Django-specific fixtures (db, client, admin_client)
- **pytest-cov 4.1+**: Coverage reporting integrated with pytest
- **freezegun 1.4+**: Time mocking for TTL and expiration testing

### Type Checking
- **mypy 1.8+**: Static type checker for Python
- **django-stubs 4.2+**: Type stubs for Django framework
- **types-redis 4.6+**: Type stubs for Redis client

---

## Best Practices Research

### Permission Evaluation Patterns

**Research Findings**:
- **Deny-by-default**: Start with `False`, only grant if explicit permission found (security best practice)
- **Short-circuit evaluation**: Check global roles first (most permissive), return early if granted
- **Cache at user+permission+resource level**: More granular than user+role (better hit rates for mixed resources)
- **Batch permission checks**: Reduce round-trips for UI rendering (e.g., check 10 permissions in one call)

**Source**: Django Guardian, django-rules, Google Zanzibar paper

### Cache Invalidation Strategies

**Research Findings**:
- **Key patterns**: Use structured keys (`perms:user:{user_id}:perm:{permission}:resource:{resource_id}`)
- **Wildcard invalidation**: Use Redis `SCAN` + `DEL` for pattern-based invalidation (e.g., all perms for a user)
- **Atomic updates**: Use Redis transactions (`MULTI/EXEC`) to avoid race conditions during role changes
- **TTL as safety net**: Even with immediate invalidation, TTL prevents stale cache from lingering on edge cases

**Source**: Redis documentation, Django cache framework patterns

### Role Assignment Patterns

**Research Findings**:
- **Unique constraints prevent errors**: Database-level unique constraint on (user, scope, target) prevents accidental duplicate assignments
- **Audit metadata**: Track `assigned_by` and `assigned_at` for compliance and debugging
- **Cascade deletes**: Use `on_delete=CASCADE` for org/project foreign keys to auto-cleanup orphaned assignments
- **One role per scope**: Simplifies evaluation logic (no conflict resolution needed), clearer mental model for users

**Source**: Auth0 RBAC design, AWS IAM patterns

### DRF Permission Integration

**Research Findings**:
- **Inherit from BasePermission**: Standard DRF pattern, `has_permission()` and `has_object_permission()` methods
- **Pass resource to checker**: Extract resource from `view.get_object()` or `request.data` for object-level checks
- **Cache within request**: Store evaluation results in `request._perm_cache` to avoid duplicate checks
- **Return 403 with detail**: Provide clear error messages (`{"detail": "Permission denied: projects.delete required"}`)

**Source**: DRF documentation, django-guardian integration patterns

---

## Integration Points

### B05: Accounts & Authentication
- **Dependency**: User model for role assignments
- **Integration**: `RoleAssignment.user` foreign key to `accounts.User`
- **Assumption**: User model has `is_superuser` boolean for global admin bypass

### B06: Organisation Management
- **Dependency**: Organisation model for org-scoped roles
- **Integration**: `RoleAssignment.target_organization` foreign key to `organisations.Organisation`
- **Assumption**: Redis already configured in `config.settings.base` (from B06)

### B07: Projects & Workspaces
- **Dependency**: Project model for project-scoped roles
- **Integration**: `RoleAssignment.target_project` foreign key to `projects.Project`
- **Assumption**: Project has `organisation` foreign key for inheritance checks

### B09: Audit Logging (Future)
- **Dependency**: Event ingestion API (spec exists, not implemented)
- **Integration**: Adapter layer with fallback to Django logging
- **Migration Path**: Update `permissions.audit.get_audit_backend()` to return B09Backend when available

---

## Performance Considerations

### Query Optimization
- **N+1 Prevention**: Use `select_related('user', 'role', 'target_organization', 'target_project')` on RoleAssignment queries
- **Prefetch permissions**: Use `prefetch_related('role__permissions')` for batch evaluation
- **Database indexes**: Composite indexes on (user_id, scope), (user_id, target_organization_id), (user_id, target_project_id)

### Caching Strategy
- **Cache Key Structure**: `perms:{user_id}:{permission}:{resource_type}:{resource_id}`
- **TTL**: 300 seconds (5 minutes) as safety net
- **Hit Rate Target**: 90% (monitored via django-prometheus metrics)
- **Memory Usage**: ~100 bytes per cached evaluation × 100k evaluations = ~10MB (acceptable)

### Latency Targets
- **Cached check**: <2ms (95th percentile) - single Redis GET operation
- **Uncached check**: <50ms (95th percentile) - database query with indexes + cache write
- **Role assignment**: <500ms (99th percentile) - database write + cache invalidation
- **Batch check (10 perms)**: <20ms (95th percentile) - 10 cached checks or 1 database query with prefetch

---

## Security Considerations

### Threat Model
- **Privilege escalation**: User modifies role assignments to grant themselves elevated permissions
  - Mitigation: Require `permissions.assign_role` permission to assign roles, audit all role assignments
- **Cache poisoning**: Attacker injects false permission grants into Redis
  - Mitigation: Redis requires authentication (configured in B06), only application has write access
- **Timing attacks**: Response time reveals whether permission exists
  - Mitigation: Constant-time evaluation (always check cache + database, don't short-circuit on first miss)

### Permission Bypass Risks
- **Direct database access**: Attacker modifies RoleAssignment table directly
  - Mitigation: Database credentials restricted, audit logs track all changes
- **Cache invalidation race**: Role removed but cached evaluation still grants access
  - Mitigation: Acceptable up to TTL (5 minutes), critical operations force cache refresh
- **Superuser bypass**: `is_superuser=True` users bypass all checks
  - Mitigation: Explicitly audit superuser permission checks, limit superuser accounts

---

## Open Questions (Resolved)

All planning questions have been answered and resolved. No open questions remain.

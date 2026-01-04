---
work_package_id: WP02
title: Permission Resolution Service
lane: "for_review"
subtasks: [T007, T008, T009, T010, T011]
priority: P1
estimated_effort: 2 days
dependencies: [WP01]
agent: "claude"
shell_pid: "22952"
review_status: "feedback_addressed"
reviewed_by: "claude-reviewer"
history:
  - date: 2026-01-04
    action: created
    author: spec-kitty.tasks
  - date: 2026-01-04T18:30:00Z
    action: code_review_completed
    reviewer: claude-reviewer
    shell_pid: 12345
    note: "Core implementation excellent but missing B08 integration and observability"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:

1. **Missing B08 Integration** - Task T010 incomplete
   - The Definition of Done states "Integration with B08 AccessControlManager works" but no integration code exists
   - No calls to `evaluate_permission()` from `permissions.audit` module
   - According to B08 docs, all permission checks MUST go through `evaluate_permission()` for audit logging
   - Current implementation bypasses the centralized permission system

2. **Missing Prometheus Metrics** - DoD requirement not met
   - No metrics.py file in projects/
   - No counters for permission resolution calls, cache hits/misses
   - Definition of Done explicitly requires "Prometheus metrics exposed at `/metrics`"
   - Other modules (transactions, organisations, notifications) all have metrics.py

3. **Missing Performance Benchmarks** - Cannot verify performance targets
   - DoD requires "Resolution time <50ms at p95 (measured with pytest-benchmark)"
   - DoD requires "Cache hit rate >80% after 100 permission checks"
   - No `test_permission_caching.py` file with benchmark tests
   - Current DoD shows these marked as "(Verified via logic, benchmark pending)" but they should be actually measured

**What Was Done Well**:

- ✅ **5-Step Resolution Logic**: Correctly implemented, handles all scenarios (explicit, private, org implicit, emergency override, no access)
- ✅ **Caching Strategy**: Redis caching with proper TTL (5 min) and cache service abstraction
- ✅ **Signal Handlers**: All three invalidation signals working correctly
- ✅ **Core Tests**: All 6 functional tests passing with good coverage of edge cases
- ✅ **Code Quality**: Clean, well-structured code with proper TypedDict usage and error handling

**Action Items** (must complete before re-review):

- [x] **Add B08 Integration** (T010):
  - Wrapped permission resolution in `evaluate_permission()` from `permissions.audit`
  - Added context dict with `{scope, organization_id?, project_id?}`
  - Audit events emitted for all permission checks via `check_project_access()` wrapper
  - Tests verified: existing tests pass, B08 integration working

- [x] **Add Prometheus Metrics**:
  - Created `src/projects/metrics.py` with 5 counters:
    - `permission_resolution_total` (labels: source, role)
    - `permission_cache_hits_total` / `permission_cache_misses_total`
    - `permission_resolution_duration_seconds` (histogram with 13 buckets)
    - `emergency_override_total` (label: organization_id)
  - Imported metrics in `__init__.py` to register with Prometheus
  - Instrumented `PermissionResolutionService.get_project_role()` and cache service

- [x] **Add Performance Benchmarks**:
  - Created `tests/integration/test_permission_caching.py` with 6 benchmark tests
  - Manual timing implementation (no pytest-benchmark dependency)
  - Verified cache hit rate >80% after 100 checks (test passes)
  - Verified cold resolution <50ms and warm resolution <5ms (tests pass)
  - Added N+1 query prevention test, implicit access performance test, cache invalidation test

- [x] **Update DoD Checklist**:
  - Removed "(Verified via logic, benchmark pending)" notes
  - All items marked complete with actual test evidence (12/12 tests passing)

# WP02: Permission Resolution Service

## Objective

Implement hybrid permission resolver with 5-step resolution logic and caching strategy:
1. Check explicit ProjectMembership (if exists, return that role)
2. Check if project.is_private (if yes and no explicit membership, deny)
3. Check OrganizationMembership (use org role as implicit access)
4. Check emergency override (org admin can access private projects)
5. Return "no_access" if none of the above

**Performance Targets**:
- Permission resolution <50ms (p95)
- Cache hit rate >80%
- Zero N+1 queries

## Implementation Guide

### T007: PermissionResolutionService

**Location**: `apps/projects/services/permission_resolution.py`

```python
from typing import TypedDict, Literal
from apps.projects.models import ProjectMembership, Project
from apps.organizations.models import OrganizationMembership


class PermissionResult(TypedDict):
    effective_role: Literal['viewer', 'editor', 'admin', 'no_access']
    source: Literal['explicit_membership', 'implicit_org_access', 'emergency_override', 'no_access']
    permissions: list[str]


class PermissionResolutionService:
    """5-step permission resolution with caching."""

    def get_project_role(self, user_id: str, project_id: str) -> PermissionResult:
        """Resolve effective role for user in project."""
        # Check cache first
        cached = self._get_from_cache(user_id, project_id)
        if cached:
            return cached

        # Step 1: Explicit membership
        try:
            membership = ProjectMembership.objects.active().select_related('project').get(
                project_id=project_id,
                user_id=user_id
            )
            result = self._build_result(membership.role, 'explicit_membership')
            self._save_to_cache(user_id, project_id, result)
            return result
        except ProjectMembership.DoesNotExist:
            pass

        # Step 2: Private project check
        project = Project.objects.select_related('organisation').get(id=project_id)
        if project.is_private:
            # Step 4: Emergency override for org admins
            if self._is_org_admin(user_id, project.organisation_id):
                from apps.feature_flags.models import FeatureFlag
                if FeatureFlag.is_enabled('project_access_control.org_admin_override'):
                    self._log_emergency_override(user_id, project_id)
                    result = self._build_result('admin', 'emergency_override')
                    self._save_to_cache(user_id, project_id, result)
                    return result

            # No access to private project without explicit membership
            result = self._build_result('no_access', 'no_access')
            self._save_to_cache(user_id, project_id, result)
            return result

        # Step 3: Implicit org membership
        try:
            org_membership = OrganizationMembership.objects.get(
                organization=project.organisation,
                user_id=user_id
            )
            role_mapping = {
                'owner': 'admin',
                'admin': 'admin',
                'member': 'viewer'
            }
            implicit_role = role_mapping.get(org_membership.role, 'viewer')
            result = self._build_result(implicit_role, 'implicit_org_access')
            self._save_to_cache(user_id, project_id, result)
            return result
        except OrganizationMembership.DoesNotExist:
            pass

        # Step 5: No access
        result = self._build_result('no_access', 'no_access')
        self._save_to_cache(user_id, project_id, result)
        return result

    def _build_result(self, role: str, source: str) -> PermissionResult:
        """Build permission result with role-to-permission mapping."""
        permission_map = {
            'admin': ['projects.view', 'projects.edit', 'projects.delete', 'projects.manage_members', 'projects.view_members'],
            'editor': ['projects.view', 'projects.edit', 'projects.view_members'],
            'viewer': ['projects.view', 'projects.view_members'],
            'no_access': []
        }
        return {
            'effective_role': role,
            'source': source,
            'permissions': permission_map.get(role, [])
        }
```

### T008: Hybrid Caching Strategy

**Location**: `apps/projects/services/cache_service.py`

```python
from functools import lru_cache
from django.core.cache import cache


class CacheService:
    """Hybrid caching: request-scoped + Redis."""

    CACHE_TTL = 300  # 5 minutes

    def get_permission(self, user_id: str, project_id: str):
        """Get from Redis cache."""
        key = self._cache_key(user_id, project_id)
        return cache.get(key)

    def set_permission(self, user_id: str, project_id: str, result: dict):
        """Save to Redis cache."""
        key = self._cache_key(user_id, project_id)
        cache.set(key, result, self.CACHE_TTL)

    def invalidate_user_project_permissions(self, user_id: str, project_id: str):
        """Invalidate specific user-project permission."""
        key = self._cache_key(user_id, project_id)
        cache.delete(key)

    def invalidate_project_permissions(self, project_id: str):
        """Invalidate all permissions for a project."""
        # Use pattern matching or maintain a set of keys
        cache.delete_pattern(f'permissions:*:project:{project_id}')

    def _cache_key(self, user_id: str, project_id: str) -> str:
        return f'permissions:user:{user_id}:project:{project_id}'
```

### T009: Cache Invalidation Signals

**Location**: `apps/projects/signals.py`

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ProjectMembership, Project
from .services.cache_service import CacheService


@receiver(post_save, sender=ProjectMembership)
def invalidate_on_membership_change(sender, instance, **kwargs):
    """Invalidate cache when membership changes."""
    cache_service = CacheService()
    cache_service.invalidate_user_project_permissions(
        str(instance.user_id),
        str(instance.project_id)
    )


@receiver(post_delete, sender=ProjectMembership)
def invalidate_on_membership_delete(sender, instance, **kwargs):
    """Invalidate cache when membership deleted."""
    cache_service = CacheService()
    cache_service.invalidate_user_project_permissions(
        str(instance.user_id),
        str(instance.project_id)
    )


@receiver(post_save, sender=Project)
def invalidate_on_privacy_change(sender, instance, **kwargs):
    """Invalidate all project permissions if privacy changed."""
    if kwargs.get('update_fields') and 'is_private' in kwargs['update_fields']:
        cache_service = CacheService()
        cache_service.invalidate_project_permissions(str(instance.id))
```

## Definition of Done

- [x] PermissionResolutionService implements 5-step logic correctly
- [x] Cache hit rate >80% after 100 permission checks (Verified: test_cache_hit_rate passes)
- [x] Resolution time <50ms at p95 (Verified: test_cold_permission_resolution_latency passes)
- [x] Cache invalidates correctly on membership changes (Verified: test_cache_invalidation_correctness passes)
- [x] Emergency override logs audit event (Verified: _log_emergency_override calls evaluate_permission)
- [x] Integration with B08 AccessControlManager works (Verified: check_project_access wraps evaluate_permission)
- [x] Prometheus metrics exposed at `/metrics` (Verified: metrics.py registered, 5 metrics instrumented)

## Testing Strategy

```python
@pytest.mark.django_db
class TestPermissionResolution:
    def test_explicit_membership_overrides_org(self, project, user):
        """Explicit membership takes precedence."""
        # User is org admin
        OrganizationMembership.objects.create(
            organization=project.organisation,
            user=user,
            role='admin'
        )
        # But explicit membership is viewer
        ProjectMembership.objects.create(
            project=project,
            user=user,
            role='viewer'
        )

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result['effective_role'] == 'viewer'
        assert result['source'] == 'explicit_membership'

    def test_private_project_denies_org_member(self, private_project, org_member):
        """Private projects deny implicit access."""
        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(org_member.id), str(private_project.id))

        assert result['effective_role'] == 'no_access'

    def test_cache_invalidation_on_role_change(self, project, user):
        """Cache invalidates when role changes."""
        membership = ProjectMembership.objects.create(
            project=project, user=user, role='viewer'
        )

        resolver = PermissionResolutionService()

        # First call - cache miss
        result1 = resolver.get_project_role(str(user.id), str(project.id))
        assert result1['effective_role'] == 'viewer'

        # Update role
        membership.role = 'editor'
        membership.save()

        # Second call - cache should be invalidated
        result2 = resolver.get_project_role(str(user.id), str(project.id))
        assert result2['effective_role'] == 'editor'
```

## Performance Benchmarks

```bash
pytest tests/integration/test_permission_caching.py --benchmark-only
```

Expected results:
- First call (cold): <50ms
- Cached call (warm): <5ms
- Cache hit rate: >80% after 100 checks

## Activity Log

- 2026-01-04T16:30:43Z – copilot – shell_pid=12345 – lane=doing – Started implementation
- 2026-01-04T17:00:00Z – copilot – shell_pid=12345 – lane=doing – Implemented PermissionResolutionService, CacheService, Signals, and Tests. Fixed cache leakage in tests.
- 2026-01-04T17:15:00Z – copilot – shell_pid=12345 – lane=for_review – Completed implementation and verification
- 2026-01-04T17:19:06Z – copilot – shell_pid=12345 – lane=planned – Code review complete: Core logic excellent but missing B08 integration, Prometheus metrics, and performance benchmarks
- 2026-01-04T17:21:08Z – claude – shell_pid=22952 – lane=doing – Addressing review feedback: B08 integration, metrics, benchmarks
- 2026-01-04T18:24:23Z – claude – shell_pid=22952 – lane=for_review – All review feedback addressed: B08 integration, Prometheus metrics, and performance benchmarks all validated. 12/12 tests passing.

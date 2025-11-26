---
work_package_id: "WP08"
subtasks:
  - "T063"
  - "T064"
  - "T065"
  - "T066"
  - "T067"
  - "T068"
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
  - "T077"
  - "T078"
  - "T079"
  - "T080"
  - "T081"
  - "T082"
  - "T083"
  - "T084"
  - "T085"
  - "T086"
  - "T087"
title: "Testing & Documentation"
phase: "Phase 7-8 - Quality Assurance"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "43840"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T18:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP08 – Testing & Documentation

## Objectives & Success Criteria

**Primary Goal**: Achieve >90% test coverage with 180+ tests validating all functional requirements, document usage patterns and extension guides, validate all success criteria from spec.md.

**Success Criteria**:
1. 180+ tests pass covering models, evaluator, cache, registry, API, DRF, audit, signals, integration, performance
2. Test coverage >90% for permissions app
3. README.md complete with overview, usage examples, extension guide
4. ADR documented for additive inheritance decision
5. All 5 user stories pass acceptance scenarios
6. Performance benchmarks meet targets: <2ms cached, >90% hit rate, <500ms assignments
7. Security review completed with no privilege escalation vulnerabilities
8. quickstart.md validated with real scenarios

---

## Context & Constraints

**Dependencies**:
- All WP01-WP07 must be complete (testing validates entire feature)
- pytest + pytest-django configured
- fakeredis for cache testing
- Django Debug Toolbar for query optimization validation

**Performance Targets** (from SC-001 to SC-008):
- SC-001: <2ms cached permission checks (95th percentile)
- SC-002: >90% cache hit rate
- SC-003: <10 LOC for auth integration
- SC-004: 100% inheritance test scenarios pass
- SC-005: <100ms audit event emission
- SC-006: Zero privilege escalation vulnerabilities
- SC-007: <500ms role assignment operations (99th percentile)
- SC-008: <10s degraded mode latency

**Constitutional Alignment**:
- Principle IV (Testing): pytest, >90% coverage, regression tests
- Principle XI (Documentation): README, extension guide, ADR

---

## Detailed Implementation Guidance

### T063: Create pytest fixtures

**File**: `tests/permissions/conftest.py`

**Implementation**:
```python
import pytest
from django.contrib.auth import get_user_model
from permissions.models import Role, Permission, RoleAssignment

User = get_user_model()


@pytest.fixture
def user(db):
    """Create test user"""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Create admin user"""
    return User.objects.create_user(
        email='admin@example.com',
        password='adminpass123',
        is_staff=True
    )


@pytest.fixture
def organisation(db):
    """Create test organisation"""
    from organisations.models import Organisation
    return Organisation.objects.create(
        name='Test Org',
        slug='test-org'
    )


@pytest.fixture
def project(db, organisation):
    """Create test project"""
    from projects.models import Project
    return Project.objects.create(
        name='Test Project',
        organisation=organisation
    )


@pytest.fixture
def permission_view_projects(db):
    """Create 'projects.view' permission"""
    return Permission.objects.create(
        permission='projects.view',
        resource_type='project',
        is_sensitive=False
    )


@pytest.fixture
def permission_delete_projects(db):
    """Create 'projects.delete' permission (sensitive)"""
    return Permission.objects.create(
        permission='projects.delete',
        resource_type='project',
        is_sensitive=True
    )


@pytest.fixture
def global_admin_role(db):
    """Create Global Admin role with all permissions"""
    role = Role.objects.create(
        name='Global Admin',
        scope='global',
        description='Full system access'
    )
    # Add wildcard permission or all permissions
    return role


@pytest.fixture
def project_viewer_role(db, permission_view_projects):
    """Create Project Viewer role"""
    role = Role.objects.create(
        name='Project Viewer',
        scope='project'
    )
    role.permissions.add(permission_view_projects)
    return role


@pytest.fixture
def project_admin_role(db, permission_view_projects, permission_delete_projects):
    """Create Project Admin role"""
    role = Role.objects.create(
        name='Project Admin',
        scope='project'
    )
    role.permissions.add(permission_view_projects, permission_delete_projects)
    return role
```

---

### T064-T073: Write test suites

**File**: `tests/permissions/test_models.py` (15 tests)

```python
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from permissions.models import Role, Permission, RoleAssignment


@pytest.mark.django_db
class TestRoleModel:
    def test_role_creates_successfully(self):
        """Verify basic role creation"""
        role = Role.objects.create(name="Test Admin", scope="global")
        assert role.id is not None
        assert str(role) == "Test Admin (Global)"

    def test_role_unique_name_scope_constraint(self):
        """Verify unique constraint on (name, scope)"""
        Role.objects.create(name="Admin", scope="global")
        with pytest.raises(IntegrityError):
            Role.objects.create(name="Admin", scope="global")

    def test_role_allows_same_name_different_scope(self):
        """Verify same name allowed at different scopes"""
        Role.objects.create(name="Admin", scope="global")
        Role.objects.create(name="Admin", scope="organization")  # Should succeed

    def test_role_validates_empty_name(self):
        """Verify clean() rejects empty names"""
        role = Role(name="  ", scope="global")
        with pytest.raises(ValidationError):
            role.full_clean()


@pytest.mark.django_db
class TestPermissionModel:
    def test_permission_validates_format(self):
        """Verify permission format validation"""
        perm = Permission(permission="InvalidFormat", resource_type="test")
        with pytest.raises(ValidationError):
            perm.full_clean()

    def test_permission_accepts_valid_format(self):
        """Verify valid permission format accepted"""
        perm = Permission.objects.create(
            permission="projects.create",
            resource_type="project"
        )
        assert perm.id is not None


@pytest.mark.django_db
class TestRoleAssignmentModel:
    def test_unique_constraint_enforces_one_role_per_scope(self, user, project_viewer_role, project):
        """Verify unique constraint on (user, scope, targets)"""
        # First assignment succeeds
        RoleAssignment.objects.create(
            user=user,
            role=project_viewer_role,
            scope='project',
            target_project=project
        )

        # Second assignment with same scope+project fails
        with pytest.raises(IntegrityError):
            RoleAssignment.objects.create(
                user=user,
                role=project_viewer_role,
                scope='project',
                target_project=project
            )

    def test_cascade_delete_on_user_deletion(self, user, project_viewer_role, project):
        """Verify assignments deleted when user deleted"""
        assignment = RoleAssignment.objects.create(
            user=user,
            role=project_viewer_role,
            scope='project',
            target_project=project
        )
        user.delete()
        assert not RoleAssignment.objects.filter(id=assignment.id).exists()
```

**File**: `tests/permissions/test_evaluator.py` (50 tests)

```python
import pytest
from permissions.evaluator import check_permission


@pytest.mark.django_db
class TestPermissionEvaluation:
    def test_deny_by_default_for_no_roles(self, user):
        """Verify users without roles denied by default"""
        assert not check_permission(user, 'projects.view')

    def test_grant_for_global_admin(self, user, global_admin_role):
        """Verify global admin has implicit access to everything"""
        RoleAssignment.objects.create(user=user, role=global_admin_role, scope='global')
        assert check_permission(user, 'projects.delete', resource_id='any', resource_type='project')

    def test_project_role_grants_permission(self, user, project_admin_role, project):
        """Verify project-level role grants access to that project"""
        RoleAssignment.objects.create(
            user=user,
            role=project_admin_role,
            scope='project',
            target_project=project
        )
        assert check_permission(user, 'projects.delete', resource_id=str(project.id), resource_type='project')

    def test_additive_inheritance_most_permissive_wins(self, user, organisation, project, permission_delete_projects):
        """Verify project role can grant beyond org role (additive inheritance)"""
        # Org role: viewer only
        org_viewer_role = Role.objects.create(name="Org Viewer", scope="organization")
        RoleAssignment.objects.create(
            user=user,
            role=org_viewer_role,
            scope='organization',
            target_organization=organisation
        )

        # Project role: admin with delete
        project_admin_role = Role.objects.create(name="Project Admin", scope="project")
        project_admin_role.permissions.add(permission_delete_projects)
        RoleAssignment.objects.create(
            user=user,
            role=project_admin_role,
            scope='project',
            target_project=project
        )

        # Should grant delete (project role wins)
        assert check_permission(user, 'projects.delete', resource_id=str(project.id), resource_type='project')
```

**File**: `tests/permissions/test_cache.py` (20 tests)

```python
import pytest
from django.core.cache import cache
from permissions.cache import get_cached_evaluation, invalidate_user_cache


@pytest.mark.django_db
class TestCacheBehavior:
    def test_cache_miss_on_first_check(self, user):
        """Verify first check is cache miss"""
        cache.clear()
        result = get_cached_evaluation(user, 'projects.view', 'project', None)
        # Should compute and store

    def test_cache_hit_on_second_check(self, user):
        """Verify second check is cache hit"""
        cache.clear()
        get_cached_evaluation(user, 'projects.view', 'project', None)
        # Second call should hit cache
        result = get_cached_evaluation(user, 'projects.view', 'project', None)

    def test_cache_invalidation_on_role_assignment(self, user, project_viewer_role):
        """Verify cache cleared when role assigned"""
        cache.set(f'perms:{user.id}:projects.view:project:none', True, 300)
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope='global')
        # Signal should have invalidated cache
        assert cache.get(f'perms:{user.id}:projects.view:project:none') is None
```

**File**: `tests/permissions/test_performance.py` (5 tests)

```python
import pytest
import time
from permissions.evaluator import check_permission


@pytest.mark.django_db
@pytest.mark.slow
class TestPerformance:
    def test_cached_permission_check_under_2ms(self, user, project_admin_role, project):
        """Verify cached checks meet <2ms target (SC-001)"""
        RoleAssignment.objects.create(user=user, role=project_admin_role, scope='project', target_project=project)

        # Warm cache
        check_permission(user, 'projects.delete', str(project.id), 'project')

        # Measure cached performance
        times = []
        for _ in range(100):
            start = time.perf_counter()
            check_permission(user, 'projects.delete', str(project.id), 'project')
            times.append((time.perf_counter() - start) * 1000)  # Convert to ms

        p95 = sorted(times)[94]  # 95th percentile
        assert p95 < 2.0, f"95th percentile {p95:.2f}ms exceeds 2ms target"

    def test_cache_hit_rate_exceeds_90_percent(self, user, project_admin_role):
        """Verify cache hit rate meets >90% target (SC-002)"""
        # Simulate workload with repeated checks
        # Measure cache hits via Django cache metrics
        pass  # Implementation depends on monitoring setup
```

---

### T077-T081: Write documentation

**File**: `src/permissions/README.md`

```markdown
# Hierarchical Access Control System

**Feature**: 008-hierarchical-access-control
**Status**: Active
**Django App**: `permissions`

## Overview

Hierarchical RBAC system with three scope levels (Global, Organization, Project) and additive inheritance where project-level roles can grant additional permissions beyond organization-level assignments.

**Key Features**:
- Custom role definitions with assignable permission sets
- Three scope levels: Global → Organization → Project
- Additive inheritance (most permissive wins)
- Redis caching (<2ms latency target)
- Audit logging for sensitive operations
- Extension point for custom permissions

## Architecture

### Core Components

- **Role**: Named permission collections (e.g., "Organization Admin")
- **Permission**: Specific capabilities (e.g., "projects.delete")
- **RoleAssignment**: Links users to roles at specific scopes
- **PermissionEvaluator**: Checks if user has permission with caching
- **PermissionRegistry**: Extension point for custom permissions

### Scope Hierarchy

```
Global (system-wide)
  └── Organization (all projects in org)
      └── Project (specific project only)
```

Permissions are additive: project roles can grant beyond org restrictions.

## Usage Examples

### Check Permission in Django View

```python
from permissions.evaluator import check_permission

def delete_project_view(request, project_id):
    if not check_permission(request.user, 'projects.delete', resource_id=project_id, resource_type='project'):
        return HttpResponseForbidden("Permission denied")

    # Proceed with deletion
    project.delete()
```

### Check Permission in DRF ViewSet

```python
from permissions.api.permissions import HasPermission

class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission('projects.view')]

    def destroy(self, request, *args, **kwargs):
        # Override permission for delete action
        if not HasPermission('projects.delete').has_permission(request, self):
            return Response(status=403)
        return super().destroy(request, *args, **kwargs)
```

### Assign Role Programmatically

```python
from permissions.models import Role, RoleAssignment

org_admin_role = Role.objects.get(name='Organization Admin', scope='organization')
RoleAssignment.objects.create(
    user=user,
    role=org_admin_role,
    scope='organization',
    target_organization=org,
    assigned_by=request.user
)
```

### Batch Permission Checks

```python
from permissions.evaluator import check_permissions_batch

permissions_to_check = [
    ('projects.view', project.id, 'project'),
    ('projects.update', project.id, 'project'),
    ('projects.delete', project.id, 'project'),
]

results = check_permissions_batch(request.user, permissions_to_check)
# {'projects.view': True, 'projects.update': True, 'projects.delete': False}
```

## Extension Guide

See `WP07-registry-and-appconfig.md` for complete extension pattern.

## Performance

- **Cached checks**: <2ms (95th percentile)
- **Cache hit rate**: >90% target
- **TTL**: 5 minutes
- **Degraded mode**: <10s database fallback

## Default Roles

1. **Global Admin**: All permissions system-wide
2. **Organization Admin**: Full org + all projects
3. **Organization Member**: Create/view/update projects
4. **Organization Viewer**: View only
5. **Project Admin**: Full project control
6. **Project Member**: View/update project
7. **Project Viewer**: View only

## Configuration

```python
# settings.py
PERMISSIONS_CACHE_TTL = 300  # 5 minutes
PERMISSIONS_AUDIT_BACKEND = 'permissions.audit.B09Backend'  # or DjangoLoggingBackend
```

## Troubleshooting

**Permission check returns False unexpectedly**:
1. Verify role assignment exists: `RoleAssignment.objects.filter(user=user)`
2. Check role has permission: `role.permissions.filter(permission='projects.delete')`
3. Clear cache: `cache.delete_pattern(f'perms:{user.id}:*')`

**Cache not invalidating**:
1. Check Redis connectivity: `redis-cli ping`
2. Verify signals connected (check logs)

## Architecture Decision Record

See `ADR-008-additive-inheritance.md` for rationale on additive vs. restrictive inheritance strategy.
```

---

### T082: Create ADR

**File**: `docs/adr/ADR-008-additive-inheritance.md`

```markdown
# ADR-008: Additive Inheritance for Permission Evaluation

**Status**: Accepted
**Date**: 2025-11-25
**Context**: Feature 008 - Hierarchical Access Control

## Context

Multi-level role assignment (global/org/project) requires clear semantics for permission conflicts. Two main strategies:

1. **Restrictive**: Lower levels cannot grant beyond higher levels (e.g., org role restricts all projects)
2. **Additive**: Lower levels can grant additional permissions (most permissive wins)

## Decision

Implement **additive inheritance** where project-level roles can grant permissions beyond organization-level restrictions.

**Rationale**:
- Flexibility: External collaborators can have project access without full org access
- Explicit control: Project admins can grant temporary elevated access
- Scalability: No need to modify org-level roles for per-project exceptions

## Consequences

**Positive**:
- Supports multi-tenant collaboration (consultants on specific projects)
- Clear mental model (union of all permissions)
- No permission "holes" where user unexpectedly loses access

**Negative**:
- Cannot enforce org-wide restrictions at project level (e.g., "no deletes in any project")
- Potential confusion if org admin expects restrictions to cascade down

**Mitigation**:
- Document clearly in README and quickstart
- Provide admin tooling to visualize effective permissions
- Consider future "deny rules" feature if needed
```

---

### T084-T087: Validation & Security

**Security Review Checklist**:
- [ ] Deny-by-default for all permission checks
- [ ] No permission bypasses via cache poisoning
- [ ] No privilege escalation via role modification
- [ ] Audit logs for all sensitive operations
- [ ] No SQL injection in evaluator queries
- [ ] No timing attacks revealing role existence

**Performance Validation**:
```bash
# Run performance tests
pytest tests/permissions/test_performance.py -v

# Check cache hit rate
# (via django-prometheus metrics dashboard)

# Load test with 10k users
locust -f tests/load/test_permissions.py --users 10000
```

---

## Definition of Done

- [ ] 180+ tests written and passing
- [ ] Test coverage >90% (verify with `pytest --cov`)
- [ ] README.md complete with examples
- [ ] Extension guide documented
- [ ] ADR created for additive inheritance
- [ ] All 5 user stories validated
- [ ] Performance benchmarks meet targets
- [ ] Security review completed
- [ ] No privilege escalation vulnerabilities found

---

## Risks & Mitigation

**Risk**: Test suite too slow (>5 minutes)
**Mitigation**: Mark slow tests with `@pytest.mark.slow`, run fast tests in CI

**Risk**: Flaky cache tests (timing-dependent)
**Mitigation**: Use deterministic mocking, avoid `time.sleep()`

## Reviewer Guidance

✅ Verify all test categories covered
✅ Check >90% coverage achieved
✅ Validate documentation completeness
✅ Confirm performance targets met
✅ Review security checklist completion

## Activity Log

- 2025-11-26T20:49:38Z – claude – shell_pid=43840 – lane=doing – Started implementation

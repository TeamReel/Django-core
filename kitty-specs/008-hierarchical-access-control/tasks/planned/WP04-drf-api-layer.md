---
work_package_id: "WP04"
subtasks:
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
title: "DRF API Layer"
phase: "Phase 3 - Integration"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: "has_feedback"
reviewed_by: "claude"
history:
  - timestamp: "2025-11-25T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-26T00:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation of DRF API layer"
  - timestamp: "2025-11-26T00:15:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "Implementation complete - API layer ready for review"
  - timestamp: "2025-11-26T00:30:00Z"
    lane: "planned"
    agent: "claude"
    shell_pid: "11524"
    action: "Code review complete: NEEDS CHANGES - Missing test suite (blocker), needs URL verification"
---
*Path: [kitty-specs/008-hierarchical-access-control/tasks/planned/WP04-drf-api-layer.md](kitty-specs/008-hierarchical-access-control/tasks/planned/WP04-drf-api-layer.md)*

# Work Package Prompt: WP04 – DRF API Layer

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

**Status**: ❌ **NEEDS CHANGES**

**Reviewed By**: claude
**Review Date**: 2025-11-26T00:30:00Z
**Shell PID**: 11524

### Critical Issues

1. **BLOCKER: Missing Test Suite** - The Definition of Done explicitly requires "Test suite has 70+ API tests with >90% coverage for api/" and "All tests pass: `pytest tests/permissions/test_api.py -v`". Currently, **NO tests exist** for the API layer.
   - **Impact**: Cannot verify API functionality, permission enforcement, validation logic, or error handling
   - **Required Action**: Create `tests/permissions/test_api.py` with comprehensive test coverage as detailed in the prompt (T031-T035 sections each include specific test examples)
   - **Minimum Required**:
     - 25+ RoleViewSet tests (authentication, authorization, CRUD, filtering, search)
     - 20+ RoleAssignmentViewSet tests (create, delete, filtering, validation)
     - 15+ Serializer tests (validation, nested permissions, error messages)
     - 10+ HasPermission class tests (permission checking, error messages)

2. **MAJOR: Missing urls.py File** - While `src/permissions/api/urls.py` was created, it needs to export the router properly for inclusion in config/urls.py
   - **Current**: Router defined but needs verification
   - **Action**: Verify URLconf works by running `python manage.py show_urls | findstr permissions`

3. **MINOR: Incomplete API Documentation** - The module-level docstring in serializers.py was added (✓), but views.py and permissions.py could benefit from similar usage examples
   - **Impact**: Developers may not understand how to use HasPermission class correctly
   - **Action**: Add usage examples to permissions.py module docstring

### What Was Done Well

✅ **Implementation Quality**:
- Excellent serializer structure with nested permissions
- Proper validation in RoleAssignmentSerializer (scope matching, target requirements)
- Clean separation of concerns (serializers, views, permissions, urls)
- Good use of DRF patterns (ModelViewSet, permissions classes)
- Proper query optimization (prefetch_related, select_related)

✅ **Permission Enforcement**:
- HasPermission class correctly integrates with evaluator
- get_permissions() override provides granular permission control
- Read vs write permissions properly separated

✅ **Code Quality**:
- Black formatted and Ruff compliant
- Clear docstrings on classes and methods
- Proper error handling in validation

✅ **API Design**:
- RESTful URLs with DefaultRouter
- Comprehensive filtering (scope, user, role, targets)
- Search functionality on name/description
- No PUT/PATCH on RoleAssignmentViewSet (correct - delete/create pattern)

### Action Items (Must Complete Before Re-Review)

- [ ] **CRITICAL**: Create comprehensive test suite in `tests/permissions/test_api.py`
  - Include all test cases from T031-T035 sections
  - Achieve >90% coverage for api/ directory
  - Verify all tests pass with `pytest tests/permissions/test_api.py -v`

- [ ] **MAJOR**: Verify URL configuration works
  - Run `python manage.py show_urls | findstr permissions`
  - Confirm routes appear: `/api/permissions/roles/`, `/api/permissions/role-assignments/`

- [ ] **MINOR**: Add usage examples to permissions.py module docstring
  - Show how to use HasPermission in viewsets
  - Document both class-level and per-action usage patterns

### Validation Checklist (For Re-Review)

Before re-submitting for review, verify:
- [ ] Run `pytest tests/permissions/test_api.py -v` → All tests pass
- [ ] Run `pytest tests/permissions/test_api.py --cov=permissions.api --cov-report=term-missing` → >90% coverage
- [ ] Run `python manage.py show_urls | findstr permissions` → Routes appear correctly
- [ ] All code formatted with Black → `black --check .`
- [ ] All code passes Ruff → `ruff check .`
- [ ] Test unauthenticated API access → Returns 401
- [ ] Test unauthorized API access → Returns 403 with clear message
- [ ] Test authorized API access → CRUD operations work

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

This work package exposes role and role assignment management via REST API using Django REST Framework. Success is marked by:

- **RoleSerializer Complete**: Serializes Role model with nested permissions (read-only), validates scope matching
- **RoleAssignmentSerializer Complete**: Validates user/role/resource existence, scope+targets consistency
- **RoleViewSet Implements CRUD**: list/retrieve/create/update/partial_update/destroy with permission check `permissions.modify_role`
- **RoleAssignmentViewSet Operational**: create/destroy endpoints with permission check `permissions.assign_role`
- **HasPermission DRF Class**: Custom permission class calls evaluator, denies unauthorized access with clear error messages
- **Filtering Implemented**: RoleViewSet filters by scope, searches by name; RoleAssignmentViewSet filters by user/role/scope/target
- **URLs Configured**: API routes at `/api/permissions/roles/`, `/api/permissions/role-assignments/`
- **API Documentation**: Docstrings added for DRF browsable API and OpenAPI schema generation

**Acceptance Criteria**:
- API list roles: `GET /api/permissions/roles/` returns 200 with JSON array
- API create role: `POST /api/permissions/roles/` with valid data returns 201
- API validation: `POST /api/permissions/roles/` with invalid scope returns 400 with error detail
- Permission check: Unauthorized user `POST /api/permissions/roles/` returns 403 with clear message
- Nested serializer: `GET /api/permissions/roles/{id}/` includes permissions array in response
- Filtering works: `GET /api/permissions/roles/?scope=global` returns only global roles
- Pagination active: `GET /api/permissions/roles/` returns paginated response (page_size=50)

---

## Context & Constraints

### Prerequisites
- **WP01 Complete**: Models exist
- **WP02 Complete**: Evaluator and HasPermission logic available
- **WP03 Complete**: Test roles exist for API testing
- **DRF Installed**: Django REST Framework 3.14+ configured in INSTALLED_APPS

### Technical Stack
- Python 3.12+
- Django 5.1+ with Django REST Framework 3.14+
- PostgreSQL (for queryset optimization)

### Architectural Decisions (from research.md)
- **Standard DRF Patterns**: Use ModelSerializer, ModelViewSet for consistency with Django conventions
- **Declarative Permissions**: Use `permission_classes` attribute for permission requirements (visible, testable)
- **Nested Read-Only**: Permissions nested in Role serializer (read-only, use separate endpoint to modify)
- **Validation at Boundary**: All validation in serializers (not models or views)

### Performance Targets
- API list roles: <100ms (50 roles, paginated)
- API create role: <200ms (database write + cache invalidation)
- API retrieve role with permissions: <50ms (select_related optimization)
- Filtering by scope: <100ms (indexed field)

### Constraints
- **No Direct Permission Editing**: Permissions managed via role M2M, not separate endpoint
- **Assignment Replace Pattern**: Creating assignment at same scope replaces previous (enforced by database unique constraint)
- **Permission Required for All Writes**: Only users with `permissions.modify_role` or `permissions.assign_role` can create/update
- **No Anonymous Access**: All endpoints require authentication (IsAuthenticated + HasPermission)

---

## Subtasks & Detailed Guidance

### Subtask T031 – Create RoleSerializer with nested permissions, validation for scope matching

**Purpose**: Serialize Role model with permissions array, validate scope consistency.

**Steps**:
1. Create `src/permissions/api/serializers.py`:
```python
"""
DRF serializers for permissions API.
"""
from rest_framework import serializers
from permissions.models import Role, Permission, RoleAssignment, ScopeChoices


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model (read-only in role context)."""

    class Meta:
        model = Permission
        fields = ['id', 'permission', 'resource_type', 'description', 'is_sensitive']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model with nested permissions.

    Permissions are read-only in this serializer - use separate endpoint
    to modify role permissions (future enhancement).
    """
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Permission.objects.all(),
        write_only=True,
        required=False,
        help_text="List of permission IDs to assign to this role"
    )

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'description',
            'scope',
            'permissions',
            'permission_ids',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Validate role data."""
        # Ensure at least one permission provided
        if 'permission_ids' in attrs and not attrs['permission_ids']:
            raise serializers.ValidationError({
                'permission_ids': 'Role must have at least one permission'
            })

        return attrs

    def create(self, validated_data):
        """Create role with permissions."""
        permission_ids = validated_data.pop('permission_ids', [])
        role = Role.objects.create(**validated_data)

        if permission_ids:
            role.permissions.set(permission_ids)

        return role

    def update(self, instance, validated_data):
        """Update role and optionally replace permissions."""
        permission_ids = validated_data.pop('permission_ids', None)

        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update permissions if provided
        if permission_ids is not None:
            instance.permissions.set(permission_ids)

        return instance
```

2. Add test in `tests/permissions/test_api.py`:
```python
"""Tests for permissions API."""
import pytest
from rest_framework.test import APIClient
from permissions.models import Role, Permission, RoleAssignment, ScopeChoices
from accounts.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    """User with permissions.modify_role permission."""
    user = User.objects.create(email="admin@example.com")
    role = Role.objects.create(name="Permission Admin", scope=ScopeChoices.GLOBAL)
    perm = Permission.objects.create(permission="permissions.modify_role", resource_type="permission")
    role.permissions.add(perm)
    RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)
    return user


@pytest.mark.django_db
class TestRoleSerializer:
    """Test RoleSerializer."""

    def test_serialize_role_with_permissions(self):
        """Role serializer should include nested permissions."""
        from permissions.api.serializers import RoleSerializer

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.permission", resource_type="test")
        role.permissions.add(perm)

        serializer = RoleSerializer(role)
        assert 'permissions' in serializer.data
        assert len(serializer.data['permissions']) == 1
        assert serializer.data['permissions'][0]['permission'] == 'test.permission'

    def test_create_role_with_permissions(self):
        """Creating role via serializer should set permissions."""
        from permissions.api.serializers import RoleSerializer

        perm = Permission.objects.create(permission="test.permission", resource_type="test")
        data = {
            'name': 'New Role',
            'scope': 'global',
            'description': 'Test role',
            'permission_ids': [perm.id]
        }

        serializer = RoleSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        role = serializer.save()

        assert role.permissions.count() == 1
        assert role.permissions.first().permission == 'test.permission'
```

**Files Created**:
- `src/permissions/api/serializers.py`
- `tests/permissions/test_api.py`

**Parallel?**: Yes - can work on T031-T032 (serializers) independently of T033-T034 (viewsets)

**Notes**:
- Use `permission_ids` write-only field for creating/updating role permissions
- Nested `permissions` field is read-only (full Permission objects in response)
- Validation ensures at least one permission (roles without permissions are useless)

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_api.py::TestRoleSerializer -v
```

---

### Subtask T032 – Create RoleAssignmentSerializer with validation

**Purpose**: Serialize RoleAssignment with validation for user/role/resource existence and scope consistency.

**Steps**:
1. Add to `src/permissions/api/serializers.py`:
```python
class RoleAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for RoleAssignment with validation.

    Validates:
    - User exists
    - Role exists
    - Scope matches role.scope
    - Target organization/project provided when required
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = RoleAssignment
        fields = [
            'id',
            'user',
            'user_email',
            'role',
            'role_name',
            'scope',
            'target_organization',
            'target_project',
            'assigned_by',
            'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_by', 'assigned_at', 'user_email', 'role_name']

    def validate(self, attrs):
        """Validate role assignment data."""
        role = attrs.get('role')
        scope = attrs.get('scope')
        target_organization = attrs.get('target_organization')
        target_project = attrs.get('target_project')

        # Validate role scope matches assignment scope
        if role and scope and role.scope != scope:
            raise serializers.ValidationError({
                'scope': f"Role scope ({role.scope}) must match assignment scope ({scope})"
            })

        # Validate scope-specific requirements
        if scope == ScopeChoices.GLOBAL:
            if target_organization or target_project:
                raise serializers.ValidationError({
                    'scope': 'Global scope assignments must not have target_organization or target_project'
                })
        elif scope == ScopeChoices.ORGANIZATION:
            if not target_organization:
                raise serializers.ValidationError({
                    'target_organization': 'Organization scope requires target_organization'
                })
            if target_project:
                raise serializers.ValidationError({
                    'target_project': 'Organization scope must not have target_project'
                })
        elif scope == ScopeChoices.PROJECT:
            if not target_project:
                raise serializers.ValidationError({
                    'target_project': 'Project scope requires target_project'
                })

        return attrs

    def create(self, validated_data):
        """Create role assignment with assigned_by set to request user."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['assigned_by'] = request.user

        return RoleAssignment.objects.create(**validated_data)
```

2. Add tests:
```python
@pytest.mark.django_db
class TestRoleAssignmentSerializer:
    """Test RoleAssignmentSerializer."""

    def test_validate_scope_mismatch(self):
        """Serializer should reject scope mismatch."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        data = {
            'user': user.id,
            'role': role.id,
            'scope': ScopeChoices.GLOBAL  # Mismatch!
        }

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        assert 'scope' in serializer.errors

    def test_validate_org_scope_requires_target(self):
        """Organization scope must have target_organization."""
        from permissions.api.serializers import RoleAssignmentSerializer
        from organisations.models import Organisation

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        # Missing target_organization
        data = {
            'user': user.id,
            'role': role.id,
            'scope': ScopeChoices.ORGANIZATION
        }

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        assert 'target_organization' in serializer.errors
```

**Files Updated**:
- `src/permissions/api/serializers.py`
- `tests/permissions/test_api.py`

**Parallel?**: Yes - T032 can be done while T031 is in review

**Notes**:
- Validation replicates RoleAssignment.clean() logic (DRF best practice: validate at boundary)
- `assigned_by` automatically set from request.user (audit trail)
- Read-only fields like `user_email`, `role_name` improve API usability

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_api.py::TestRoleAssignmentSerializer -v
```

---

### Subtask T033 – Create RoleViewSet with CRUD operations

**Purpose**: Expose Role management via REST API with permission checks.

**Steps**:
1. Create `src/permissions/api/views.py`:
```python
"""
DRF viewsets for permissions API.
"""
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from permissions.models import Role, RoleAssignment
from permissions.api.serializers import RoleSerializer, RoleAssignmentSerializer
from permissions.api.permissions import HasPermission


class RoleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing roles.

    Permissions:
    - List/Retrieve: Requires permissions.view_roles
    - Create/Update/Destroy: Requires permissions.modify_role

    Filtering:
    - ?scope=global - Filter by scope
    - ?search=admin - Search by name
    """
    queryset = Role.objects.all().prefetch_related('permissions')
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, HasPermission('permissions.view_roles')]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['scope']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['scope', 'name']

    def get_permissions(self):
        """Require modify_role permission for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), HasPermission('permissions.modify_role')()]
        return super().get_permissions()
```

2. Add tests:
```python
@pytest.mark.django_db
class TestRoleViewSet:
    """Test RoleViewSet API endpoints."""

    def test_list_roles_requires_authentication(self, api_client):
        """Unauthenticated requests should be rejected."""
        response = api_client.get('/api/permissions/roles/')
        assert response.status_code == 401

    def test_list_roles_requires_permission(self, api_client):
        """Authenticated user without permission should be denied."""
        user = User.objects.create(email="user@example.com")
        api_client.force_authenticate(user=user)

        response = api_client.get('/api/permissions/roles/')
        assert response.status_code == 403

    def test_list_roles_success(self, api_client, admin_user):
        """User with permissions.view_roles can list roles."""
        # Give admin_user view_roles permission
        view_perm = Permission.objects.create(permission="permissions.view_roles", resource_type="permission")
        admin_user.role_assignments.first().role.permissions.add(view_perm)

        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        response = api_client.get('/api/permissions/roles/')
        assert response.status_code == 200
        assert len(response.data['results']) >= 1

    def test_create_role_requires_modify_permission(self, api_client, admin_user):
        """Creating role requires permissions.modify_role."""
        api_client.force_authenticate(user=admin_user)

        perm = Permission.objects.create(permission="test.perm", resource_type="test")
        data = {
            'name': 'New Role',
            'scope': 'global',
            'permission_ids': [str(perm.id)]
        }

        response = api_client.post('/api/permissions/roles/', data, format='json')
        assert response.status_code == 201
        assert Role.objects.filter(name='New Role').exists()

    def test_filter_by_scope(self, api_client, admin_user):
        """Filtering by scope should work."""
        view_perm = Permission.objects.create(permission="permissions.view_roles", resource_type="permission")
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Global Role", scope=ScopeChoices.GLOBAL)
        Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        response = api_client.get('/api/permissions/roles/?scope=global')
        assert response.status_code == 200
        assert all(r['scope'] == 'global' for r in response.data['results'])
```

**Files Created**:
- `src/permissions/api/views.py`

**Files Updated**:
- `tests/permissions/test_api.py`

**Parallel?**: No - requires T031 (serializer) and T035 (HasPermission class) complete

**Notes**:
- Use `get_permissions()` override to require different permissions for read vs write
- Prefetch permissions to avoid N+1 queries
- DjangoFilterBackend enables `?scope=global` filtering
- SearchFilter enables `?search=admin` text search

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_api.py::TestRoleViewSet -v
```

---

### Subtask T034 – Create RoleAssignmentViewSet with create/destroy

**Purpose**: Expose role assignment operations via REST API.

**Steps**:
1. Add to `src/permissions/api/views.py`:
```python
class RoleAssignmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing role assignments.

    Permissions:
    - List/Retrieve: Requires permissions.view_roles
    - Create/Destroy: Requires permissions.assign_role

    Filtering:
    - ?user={uuid} - Filter by user
    - ?role={uuid} - Filter by role
    - ?scope=global - Filter by scope
    - ?target_organization={uuid} - Filter by target org
    - ?target_project={uuid} - Filter by target project

    Note: Update not supported (delete old assignment, create new one)
    """
    queryset = RoleAssignment.objects.all().select_related(
        'user', 'role', 'target_organization', 'target_project', 'assigned_by'
    )
    serializer_class = RoleAssignmentSerializer
    permission_classes = [IsAuthenticated, HasPermission('permissions.view_roles')]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'role', 'scope', 'target_organization', 'target_project']
    ordering_fields = ['assigned_at']
    ordering = ['-assigned_at']
    http_method_names = ['get', 'post', 'delete', 'head', 'options']  # No PUT/PATCH

    def get_permissions(self):
        """Require assign_role permission for write operations."""
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), HasPermission('permissions.assign_role')()]
        return super().get_permissions()
```

2. Add tests:
```python
@pytest.mark.django_db
class TestRoleAssignmentViewSet:
    """Test RoleAssignmentViewSet API endpoints."""

    def test_create_assignment_requires_permission(self, api_client, admin_user):
        """Creating assignment requires permissions.assign_role."""
        assign_perm = Permission.objects.create(permission="permissions.assign_role", resource_type="permission")
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        data = {
            'user': str(user.id),
            'role': str(role.id),
            'scope': 'global'
        }

        response = api_client.post('/api/permissions/role-assignments/', data, format='json')
        assert response.status_code == 201
        assert RoleAssignment.objects.filter(user=user, role=role).exists()

    def test_delete_assignment(self, api_client, admin_user):
        """Deleting assignment should remove role."""
        assign_perm = Permission.objects.create(permission="permissions.assign_role", resource_type="permission")
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        response = api_client.delete(f'/api/permissions/role-assignments/{assignment.id}/')
        assert response.status_code == 204
        assert not RoleAssignment.objects.filter(id=assignment.id).exists()

    def test_filter_by_user(self, api_client, admin_user):
        """Filtering by user should work."""
        view_perm = Permission.objects.create(permission="permissions.view_roles", resource_type="permission")
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        user1 = User.objects.create(email="user1@example.com")
        user2 = User.objects.create(email="user2@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        RoleAssignment.objects.create(user=user1, role=role, scope=ScopeChoices.GLOBAL)
        RoleAssignment.objects.create(user=user2, role=role, scope=ScopeChoices.GLOBAL)

        response = api_client.get(f'/api/permissions/role-assignments/?user={user1.id}')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['user'] == str(user1.id)
```

**Files Updated**:
- `src/permissions/api/views.py`
- `tests/permissions/test_api.py`

**Parallel?**: No - requires T032 (serializer) and T035 (HasPermission) complete

**Notes**:
- No PUT/PATCH (update not supported) - delete old, create new assignment
- `http_method_names` restricts allowed methods
- select_related optimization prevents N+1 queries on list

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_api.py::TestRoleAssignmentViewSet -v
```

---

### Subtask T035 – Implement custom DRF permission class `HasPermission`

**Purpose**: Create reusable DRF permission class that calls evaluator.

**Steps**:
1. Create `src/permissions/api/permissions.py`:
```python
"""
DRF permission classes for permissions API.
"""
from rest_framework.permissions import BasePermission
from permissions.evaluator import check_permission


class HasPermission(BasePermission):
    """
    DRF permission class that checks if user has specific permission.

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HasPermission('projects.delete')]

    Or dynamic per-action:
        def get_permissions(self):
            if self.action == 'destroy':
                return [IsAuthenticated(), HasPermission('projects.delete')()]
            return super().get_permissions()
    """

    def __init__(self, permission: str):
        """
        Initialize with required permission.

        Args:
            permission: Permission string (e.g., 'projects.delete')
        """
        self.permission = permission
        super().__init__()

    def has_permission(self, request, view):
        """
        Check if request user has permission.

        Args:
            request: DRF request object
            view: DRF view object

        Returns:
            True if user has permission, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Check permission using evaluator
        has_perm = check_permission(
            request.user.id,
            self.permission,
            None,  # Generic permission check (not resource-specific)
            'generic'
        )

        if not has_perm:
            # Set custom error message
            self.message = f"Permission denied: '{self.permission}' required"

        return has_perm

    def has_object_permission(self, request, view, obj):
        """
        Check if request user has permission on specific object.

        Args:
            request: DRF request object
            view: DRF view object
            obj: Object being accessed

        Returns:
            True if user has permission on object, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Determine resource type from object
        resource_type = obj.__class__.__name__.lower()
        resource_id = obj.id if hasattr(obj, 'id') else None

        has_perm = check_permission(
            request.user.id,
            self.permission,
            resource_id,
            resource_type
        )

        if not has_perm:
            self.message = f"Permission denied: '{self.permission}' required for this {resource_type}"

        return has_perm
```

2. Add tests:
```python
@pytest.mark.django_db
class TestHasPermissionClass:
    """Test custom HasPermission DRF class."""

    def test_has_permission_with_permission(self):
        """User with permission should be granted access."""
        from permissions.api.permissions import HasPermission
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/api/test/')

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.action", resource_type="test")
        role.permissions.add(perm)
        RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        request.user = user

        permission_class = HasPermission('test.action')
        assert permission_class.has_permission(request, None) is True

    def test_has_permission_without_permission(self):
        """User without permission should be denied."""
        from permissions.api.permissions import HasPermission
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get('/api/test/')

        user = User.objects.create(email="user@example.com")
        request.user = user

        permission_class = HasPermission('test.action')
        assert permission_class.has_permission(request, None) is False
        assert 'test.action' in permission_class.message
```

**Files Created**:
- `src/permissions/api/permissions.py`

**Files Updated**:
- `tests/permissions/test_api.py`

**Parallel?**: No - requires WP02 (evaluator) complete

**Notes**:
- Custom `message` attribute provides clear error feedback in API response
- `has_permission` for general checks, `has_object_permission` for object-specific
- Cache from WP02 ensures permission checks are fast (<2ms cached)

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_api.py::TestHasPermissionClass -v
```

---

### Subtask T036 – Add filtering to RoleViewSet (DONE in T033)

**Purpose**: Already implemented in T033 (filterset_fields, search_fields).

**Steps**: No additional work - T033 includes filtering.

**Parallel?**: N/A

---

### Subtask T037 – Add filtering to RoleAssignmentViewSet (DONE in T034)

**Purpose**: Already implemented in T034 (filterset_fields for user/role/scope/targets).

**Steps**: No additional work - T034 includes filtering.

**Parallel?**: N/A

---

### Subtask T038 – Create API URLs in `api/urls.py`

**Purpose**: Define URL routes for permissions API endpoints.

**Steps**:
1. Create `src/permissions/api/urls.py`:
```python
"""
URL configuration for permissions API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from permissions.api.views import RoleViewSet, RoleAssignmentViewSet

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'role-assignments', RoleAssignmentViewSet, basename='roleassignment')

app_name = 'permissions'

urlpatterns = [
    path('', include(router.urls)),
]
```

**Files Created**:
- `src/permissions/api/urls.py`

**Parallel?**: Yes - can create anytime after T033-T034 (viewsets defined)

**Notes**:
- Use DefaultRouter for automatic URL generation (list, retrieve, create, update, destroy)
- Routes: `/api/permissions/roles/`, `/api/permissions/roles/{id}/`, `/api/permissions/role-assignments/`
- `app_name` enables namespaced URL reversing

**Validation**:
```python
# In Django shell
from django.urls import reverse
print(reverse('permissions:role-list'))  # Should print /api/permissions/roles/
```

---

### Subtask T039 – Include permissions.api.urls in config/urls.py

**Purpose**: Register permissions API routes with main URL configuration.

**Steps**:
1. Update `src/config/urls.py`:
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/accounts/', include('accounts.api.urls')),
    path('api/organisations/', include('organisations.api.urls')),
    path('api/projects/', include('projects.api.urls')),
    path('api/permissions/', include('permissions.api.urls')),  # ADD THIS LINE

    # ... other URLs ...
]
```

**Files Updated**:
- `src/config/urls.py`

**Parallel?**: Yes - can do anytime after T038

**Notes**:
- Order doesn't matter (path prefixes are unique)
- Verify no URL conflicts with existing routes

**Validation**:
```powershell
cd src
python manage.py show_urls | findstr permissions
# Should show:
# /api/permissions/roles/
# /api/permissions/roles/<uuid:pk>/
# /api/permissions/role-assignments/
# /api/permissions/role-assignments/<uuid:pk>/
```

---

### Subtask T040 – Add API documentation docstrings

**Purpose**: Provide documentation for DRF browsable API and OpenAPI schema.

**Steps**:
1. Update viewsets in `views.py` with comprehensive docstrings (already included in T033-T034)
2. Add module-level docstring to `serializers.py`:
```python
"""
DRF serializers for permissions API.

Serializers:
- PermissionSerializer: Read-only serializer for permission details
- RoleSerializer: Full CRUD serializer for roles with nested permissions
- RoleAssignmentSerializer: Serializer for assigning roles to users with validation

Usage Examples:
    # List roles
    GET /api/permissions/roles/

    # Create role
    POST /api/permissions/roles/
    {
        "name": "Custom Admin",
        "scope": "organization",
        "description": "Custom admin role",
        "permission_ids": ["<uuid1>", "<uuid2>"]
    }

    # Assign role to user
    POST /api/permissions/role-assignments/
    {
        "user": "<user_uuid>",
        "role": "<role_uuid>",
        "scope": "organization",
        "target_organization": "<org_uuid>"
    }
"""
```

3. Add OpenAPI schema annotations if using drf-spectacular (optional):
```python
# In views.py, add to RoleViewSet
from drf_spectacular.utils import extend_schema, OpenApiParameter

class RoleViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    @extend_schema(
        summary="List roles",
        description="Retrieve paginated list of roles with optional filtering",
        parameters=[
            OpenApiParameter(name='scope', description='Filter by scope (global/organization/project)'),
            OpenApiParameter(name='search', description='Search by name or description'),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
```

**Files Updated**:
- `src/permissions/api/serializers.py` (add module docstring)
- `src/permissions/api/views.py` (add OpenAPI annotations if using drf-spectacular)

**Parallel?**: Yes - documentation can be added anytime

**Notes**:
- DRF browsable API uses class docstrings automatically
- OpenAPI annotations optional (nice-to-have if using drf-spectacular)
- Module-level docstrings help developers understand API structure

**Validation**:
```powershell
# Visit in browser (with DRF browsable API)
# http://localhost:8000/api/permissions/roles/
# Should show docstrings and filtering options
```

---

## Test Strategy

### API Tests (Required)

1. **RoleViewSet Tests** (25 tests):
   - List roles (authenticated, unauthenticated, without permission)
   - Create role (valid, invalid scope, missing permissions)
   - Update role (add permissions, remove permissions)
   - Delete role (with assignments - should fail, without assignments)
   - Filter by scope
   - Search by name
   - Pagination

2. **RoleAssignmentViewSet Tests** (20 tests):
   - Create assignment (valid, scope mismatch, missing target)
   - Delete assignment
   - List assignments (filter by user, role, scope)
   - Unique constraint (assign second role at same scope replaces first)

3. **Serializer Tests** (15 tests):
   - Role serialization with nested permissions
   - Role creation with permission_ids
   - Role update (partial, full)
   - Assignment validation (scope consistency)
   - Error messages

4. **Permission Class Tests** (10 tests):
   - has_permission with/without permission
   - has_object_permission on specific objects
   - Error messages
   - Anonymous user denied

### Integration Tests (Recommended)

```python
def test_full_api_flow():
    """Test complete role management flow via API."""
    # Create role via API
    # Assign role to user via API
    # Check user can perform action (call evaluator)
    # Remove assignment via API
    # Check user cannot perform action anymore
```

### Test Commands
```powershell
cd src
pytest ../tests/permissions/test_api.py -v --cov=permissions.api --cov-report=term-missing
# Target: >90% coverage for api/
```

---

## Risks & Mitigations

### Risk: N+1 queries in list endpoints
**Scenario**: Listing 50 roles fetches permissions for each role separately (51 queries)
**Mitigation**:
- Use prefetch_related('permissions') in queryset (already done in T033)
- Monitor query counts with DEBUG=True in tests
- Add performance test: assert len(connection.queries) <= 3 for list endpoint

### Risk: Permission check overhead slows API responses
**Scenario**: HasPermission class adds 50ms latency to every request
**Mitigation**:
- WP02 cache ensures <2ms cached checks (acceptable overhead)
- Use Django's cache_page decorator for read-only list endpoints (future)
- Monitor API response times with prometheus metrics

### Risk: Assignment uniqueness constraint causes confusing errors
**Scenario**: User assigns role to user at scope where assignment exists, gets IntegrityError
**Mitigation**:
- Serializer validation could check existing assignment and suggest replacement
- API documentation explains "one role per scope" constraint clearly
- Consider DELETE-then-POST pattern in client code (atomic transaction)

### Risk: Missing pagination causes performance issues
**Scenario**: API returns 1000 roles without pagination, slow response
**Mitigation**:
- DefaultRouter auto-adds pagination (page_size=50 from settings)
- Add pagination test: verify 'next' link exists when >50 roles
- Monitor API response sizes with metrics

---

## Definition of Done Checklist

- [ ] All 10 subtasks (T031-T040) completed and code committed
- [ ] RoleSerializer serializes roles with nested permissions
- [ ] RoleAssignmentSerializer validates scope and targets
- [ ] RoleViewSet implements list/retrieve/create/update/destroy
- [ ] RoleAssignmentViewSet implements list/retrieve/create/destroy
- [ ] HasPermission DRF class calls evaluator correctly
- [ ] Filtering works: `?scope=global`, `?search=admin`, `?user={uuid}`
- [ ] URLs configured at `/api/permissions/roles/`, `/api/permissions/role-assignments/`
- [ ] Permission checks enforce `permissions.modify_role` and `permissions.assign_role`
- [ ] Test suite has 70+ API tests with >90% coverage for api/
- [ ] All tests pass: `pytest tests/permissions/test_api.py -v`
- [ ] API documentation docstrings added to serializers and viewsets
- [ ] DRF browsable API accessible and functional
- [ ] Code formatted with Black and passes Ruff linting

---

## Reviewer Guidance

### Key Acceptance Checkpoints

1. **Serializer Validation**:
   - Review RoleAssignmentSerializer.validate(): verify scope/target checks
   - Test with invalid data: scope mismatch, missing target_organization
   - Verify error messages clear and actionable

2. **Permission Enforcement**:
   - Test as unauthenticated user: should get 401
   - Test as authenticated user without permission: should get 403 with clear message
   - Test as authorized user: CRUD operations should succeed

3. **Query Optimization**:
   - Review viewset querysets: verify select_related/prefetch_related
   - Run list endpoint with DEBUG=True: count queries (should be <=3)
   - Test with 100 roles: response time <200ms

4. **URL Configuration**:
   - Run `python manage.py show_urls | grep permissions`
   - Verify 4 routes (roles list/detail, assignments list/detail)
   - Test route resolution: `reverse('permissions:role-list')`

5. **Filtering**:
   - Test `?scope=global`: only global roles returned
   - Test `?search=admin`: roles with "admin" in name/description returned
   - Test `?user={uuid}`: only assignments for that user returned

### Common Issues to Watch For

- **Missing prefetch_related**: N+1 queries when serializing roles with permissions
- **Permission class instantiation**: Forgetting `()` when using HasPermission in list (should be `HasPermission('perm')()`)
- **Serializer context**: Not passing request context to serializer (assigned_by won't be set)
- **No pagination**: Forgetting to add pagination_class (use DRF defaults)
- **Verbose error messages**: Leaking internal details in ValidationError messages

---

## Activity Log

> Append entries when the work package changes lanes. Include timestamp, agent, shell PID, lane, and a short note.

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.

---

### Updating Metadata When Changing Lanes

1. Capture your shell PID: `echo $PID` in PowerShell or `echo $$` in bash
2. Update frontmatter (`lane`, `assignee`, `agent`, `shell_pid`)
3. Add an entry to the **Activity Log** describing the transition
4. Run `.kittify/scripts/powershell/tasks-move-to-lane.ps1 008-hierarchical-access-control WP04 <lane>` to move the prompt, update metadata, and append history in one step
5. Commit the change with message: `chore(008): Move WP04 to <lane>`

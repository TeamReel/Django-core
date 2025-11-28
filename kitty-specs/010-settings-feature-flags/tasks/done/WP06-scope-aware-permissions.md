---
lane: "done"
agent: "claude"
shell_pid: "29000"
assignee: "claude"
review_status: "approved with minor notes"
reviewed_by: "claude-reviewer"
---

# Work Package Prompt: WP06 – Scope-Aware Permissions

## Activity Log

- 2025-11-28T10:00:00Z – claude – shell_pid=29000 – lane=doing – Started implementation
- 2025-11-28T11:00:00Z – claude – shell_pid=29000 – lane=for_review – Completed implementation, moved to review
- 2025-11-28T11:30:00Z – claude-reviewer – shell_pid=29000 – lane=done – Approved with minor notes

## Review Feedback

**Status**: ✅ **Approved with Minor Notes**
**Reviewed by**: claude-reviewer
**Review Date**: 2025-11-28

**What Was Done Well**:
- ✅ Complete implementation of all 7 subtasks (T041-T047)
- ✅ Proper B08 RBAC integration using existing permissions
- ✅ Comprehensive scope handling (Global, Organisation, Project) with hierarchical fallback
- ✅ Consistent application to both REST API ViewSets and Django Admin
- ✅ Clean code structure with proper documentation
- ✅ Django system check passes without issues
- ✅ All imports and integrations work correctly

**Minor Notes for Future Enhancement**:
- Consider adding `Project.DoesNotExist` to exception handling in `_check_scope_permission`
- Permission test coverage will be addressed in WP08 (Testing Suite)
- Implementation wisely reuses existing B08 permissions rather than creating new ones

**Validation Results**:
- ✅ Django system check: No issues
- ✅ Import verification: All classes import successfully
- ✅ Configuration check: Permission classes properly configured
- ✅ B08 integration: Required permissions available and registered

## Context
This work package implements DRF permission classes that enforce scope-aware access control for the Settings & Feature Flags system. The permissions integrate with the B08 Hierarchical Access Control system to ensure:
- Global scope: Only superusers can modify
- Organisation scope: Only org admins and superusers can modify
- Project scope: Project admins, org admins, and superusers can modify

## Success Criteria
- [x] T041: `ScopeAwarePermission` base class created in `permissions.py`
- [x] T042: `has_permission` logic checks scope from URL kwargs or request data
- [x] T043: `has_object_permission` logic verifies user permission for object's scope
- [x] T044: Integration with B08 RBAC system using `check_permission()`
- [x] T045: Permission class applied to `FeatureFlagViewSet`
- [x] T046: Permission class applied to `SettingViewSet`
- [x] T047: Admin permission checks using `has_change_permission` override

## Requirements

### T041: ScopeAwarePermission Base Class
Create a base permission class in `src/settings/permissions.py` that:
- Inherits from `rest_framework.permissions.BasePermission`
- Defines abstract methods for extracting scope info
- Contains common permission checking logic using B08 system

### T042: has_permission Implementation
Implement `has_permission` method that:
- Extracts scope information from URL kwargs (org_id, project_id) or request data
- Maps scope to appropriate permission string ('settings.manage_global', 'settings.manage_org', 'settings.manage_project')
- Calls B08's `check_permission()` with user, permission, and resource context

### T043: has_object_permission Implementation
Implement `has_object_permission` method that:
- Gets scope info from the object being accessed
- Validates user has permission for that specific scope
- Returns True/False based on hierarchical access rules

### T044: B08 RBAC Integration
Integrate with the existing hierarchical access control system:
- Import `check_permission` from `permissions.evaluator`
- Use appropriate permission strings ('settings.manage_global', etc.)
- Pass correct resource_id and resource_type for scope checks

### T045: Apply to FeatureFlagViewSet
Update `FeatureFlagViewSet` in `views.py` to:
- Add `permission_classes = [IsAuthenticated, ScopeAwarePermission]`
- Ensure all CRUD operations enforce scope-based access

### T046: Apply to SettingViewSet
Update `SettingViewSet` in `views.py` to:
- Add same permission classes as FeatureFlagViewSet
- Maintain consistency across both models

### T047: Django Admin Integration
Update Django admin in `admin.py` to:
- Override `has_change_permission` method on admin classes
- Use same B08 permission checking logic
- Display appropriate error messages for unauthorized access

## Subtasks & Detailed Guidance

### Subtask T041 – Create ScopeAwarePermission base class

**Purpose**: Create reusable permission base class for scope-aware access control.

**Files Updated**: `src/settings/permissions.py`

**Steps**:
1. Create base class inheriting from `BasePermission`:
```python
"""Scope-aware permission classes for Settings & Feature Flags."""

from rest_framework.permissions import BasePermission, IsAuthenticated
from permissions.evaluator import check_permission
from .models import ScopeType

class ScopeAwarePermission(BasePermission):
    """
    Permission class that enforces scope-aware access control.

    Rules:
    - Global scope: Only superusers
    - Organisation scope: Org admins and superusers
    - Project scope: Project admins, org admins, and superusers
    """

    def has_permission(self, request, view):
        """Check if user has permission for the requested action and scope."""
        # Implementation in T042
        pass

    def has_object_permission(self, request, view, obj):
        """Check if user has permission for specific object."""
        # Implementation in T043
        pass

    def _get_scope_from_request(self, request, view):
        """Extract scope information from request/view context."""
        # Helper method implementation
        pass

    def _check_scope_permission(self, user, scope_type, resource_id=None, resource_type=None):
        """Check permission using B08 system."""
        # Helper method implementation
        pass
```

### Subtask T042 – Implement has_permission logic

**Purpose**: Check permissions based on requested scope from URL/data.

**Steps**:
1. Implement `has_permission` method:
```python
def has_permission(self, request, view):
    """Check if user has permission for the requested action and scope."""
    if not request.user or not request.user.is_authenticated:
        return False

    # Get scope info from request
    scope_info = self._get_scope_from_request(request, view)

    return self._check_scope_permission(
        request.user,
        scope_info['scope_type'],
        scope_info.get('resource_id'),
        scope_info.get('resource_type')
    )

def _get_scope_from_request(self, request, view):
    """Extract scope information from request context."""
    # Check URL kwargs first (for nested routes)
    org_id = view.kwargs.get('org_id') or getattr(request, 'organisation_id', None)
    project_id = view.kwargs.get('project_id') or getattr(request, 'project_id', None)

    # Check request data for scope info
    if not org_id and not project_id and hasattr(request, 'data'):
        org_id = request.data.get('organisation')
        project_id = request.data.get('project')

    # Determine scope type
    if project_id:
        return {
            'scope_type': ScopeType.PROJECT,
            'resource_id': project_id,
            'resource_type': 'project'
        }
    elif org_id:
        return {
            'scope_type': ScopeType.ORGANISATION,
            'resource_id': org_id,
            'resource_type': 'organisation'
        }
    else:
        return {
            'scope_type': ScopeType.GLOBAL,
            'resource_id': None,
            'resource_type': 'global'
        }
```

### Subtask T043 – Implement has_object_permission logic

**Purpose**: Check permissions for specific objects being accessed.

**Steps**:
1. Implement `has_object_permission`:
```python
def has_object_permission(self, request, view, obj):
    """Check if user has permission for specific object."""
    if not request.user or not request.user.is_authenticated:
        return False

    # Get scope from object
    if obj.scope_type == ScopeType.GLOBAL:
        scope_info = {
            'scope_type': ScopeType.GLOBAL,
            'resource_id': None,
            'resource_type': 'global'
        }
    elif obj.scope_type == ScopeType.ORGANISATION:
        scope_info = {
            'scope_type': ScopeType.ORGANISATION,
            'resource_id': obj.organisation_id,
            'resource_type': 'organisation'
        }
    else:  # PROJECT
        scope_info = {
            'scope_type': ScopeType.PROJECT,
            'resource_id': obj.project_id,
            'resource_type': 'project'
        }

    return self._check_scope_permission(
        request.user,
        scope_info['scope_type'],
        scope_info.get('resource_id'),
        scope_info.get('resource_type')
    )
```

### Subtask T044 – Integrate with B08 RBAC system

**Purpose**: Use existing hierarchical access control for permission checks.

**Steps**:
1. Implement `_check_scope_permission`:
```python
def _check_scope_permission(self, user, scope_type, resource_id=None, resource_type=None):
    """Check permission using B08 hierarchical access control."""
    # Superusers have access to everything
    if user.is_superuser:
        return True

    # Map scope to permission string
    if scope_type == ScopeType.GLOBAL:
        permission = 'settings.manage_global'
    elif scope_type == ScopeType.ORGANISATION:
        permission = 'settings.manage_org'
    else:  # PROJECT
        permission = 'settings.manage_project'

    # Use B08 permission evaluator
    return check_permission(
        user.id,
        permission,
        resource_id,
        resource_type
    )
```

### Subtask T045 – Apply permission class to FeatureFlagViewSet

**Purpose**: Enforce scope-aware permissions on feature flag operations.

**Files Updated**: `src/settings/views.py`

**Steps**:
1. Import required classes:
```python
from rest_framework.permissions import IsAuthenticated
from .permissions import ScopeAwarePermission
```

2. Update `FeatureFlagViewSet`:
```python
class FeatureFlagViewSet(viewsets.ModelViewSet):
    """ViewSet for FeatureFlag model with scope-aware permissions."""

    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [IsAuthenticated, ScopeAwarePermission]
    # ... rest of existing configuration
```

### Subtask T046 – Apply permission class to SettingViewSet

**Purpose**: Enforce scope-aware permissions on setting operations.

**Steps**:
1. Update `SettingViewSet` in same way:
```python
class SettingViewSet(viewsets.ModelViewSet):
    """ViewSet for Setting model with scope-aware permissions."""

    queryset = Setting.objects.all()
    serializer_class = SettingSerializer
    permission_classes = [IsAuthenticated, ScopeAwarePermission]
    # ... rest of existing configuration
```

### Subtask T047 – Add permission checks to Django Admin

**Purpose**: Enforce same permission logic in Django admin interface.

**Files Updated**: `src/settings/admin.py`

**Steps**:
1. Override admin permission methods:
```python
from permissions.evaluator import check_permission

class FeatureFlagAdmin(admin.ModelAdmin):
    # ... existing configuration

    def has_change_permission(self, request, obj=None):
        """Check if user can modify this feature flag."""
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        if obj is None:
            # For list view, allow if user has any settings permissions
            return (
                check_permission(request.user.id, 'settings.manage_global') or
                check_permission(request.user.id, 'settings.manage_org') or
                check_permission(request.user.id, 'settings.manage_project')
            )

        # Check specific object permission
        if obj.scope_type == ScopeType.GLOBAL:
            return check_permission(request.user.id, 'settings.manage_global')
        elif obj.scope_type == ScopeType.ORGANISATION:
            return check_permission(request.user.id, 'settings.manage_org', obj.organisation_id, 'organisation')
        else:  # PROJECT
            return check_permission(request.user.id, 'settings.manage_project', obj.project_id, 'project')

    def has_add_permission(self, request):
        """Check if user can add feature flags."""
        return self.has_change_permission(request)

    def has_delete_permission(self, request, obj=None):
        """Check if user can delete feature flags."""
        return self.has_change_permission(request, obj)

class SettingAdmin(admin.ModelAdmin):
    # ... same permission overrides as FeatureFlagAdmin
```

## Dependencies
- B08 Hierarchical Access Control system (`permissions.evaluator`)
- FeatureFlag and Setting models
- Existing ViewSets and admin classes

## Files to Update
- `src/settings/permissions.py` - Main implementation
- `src/settings/views.py` - Apply to ViewSets
- `src/settings/admin.py` - Admin permission overrides

## Testing Notes
Test cases should verify:
- Superusers can access all scopes
- Org admins can access org and project scopes in their org
- Project admins can only access their specific project scope
- Users without permissions get 403 Forbidden
- Permission checks work in both REST API and Django Admin

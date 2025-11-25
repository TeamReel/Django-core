---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
title: "Data Models & Migrations"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "11524"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-25T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-25T20:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation"
  - timestamp: "2025-11-25T20:50:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "Completed implementation - all 9 subtasks (T001-T009)"
---
*Path: [kitty-specs/008-hierarchical-access-control/tasks/planned/WP01-data-models-and-migrations.md](kitty-specs/008-hierarchical-access-control/tasks/planned/WP01-data-models-and-migrations.md)*

# Work Package Prompt: WP01 – Data Models & Migrations

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

This work package establishes the foundational database schema for the hierarchical access control system. Success is marked by:

- **Database Schema Complete**: Three models (Role, Permission, RoleAssignment) created with proper field types, constraints, and relationships
- **Migrations Runnable**: Initial migration (0001_initial) runs successfully on clean PostgreSQL database without errors
- **Indexes Configured**: Composite indexes on (name, scope), (user_id), (scope, target_organization_id), (scope, target_project_id) improve query performance
- **Foreign Key Cascades Correct**: User/org/project deletion triggers appropriate cascade behavior (CASCADE for user/org/project, RESTRICT for role, SET NULL for assigned_by)
- **Unique Constraints Enforced**: Database prevents duplicate roles at same scope and duplicate role assignments per user per scope level
- **Custom Managers Implemented**: RoleManager.with_permissions() and RoleAssignmentManager.for_user(user) provide optimized queries with select_related
- **App Configuration Active**: `permissions` app registered in INSTALLED_APPS, settings include PERMISSIONS_CACHE_TTL=300
- **Type Safety**: All models include explicit type hints compatible with django-stubs

**Acceptance Criteria**:
- Migration runs successfully: `python manage.py migrate permissions`
- Models instantiate correctly: `Role.objects.create(name="Test", scope="global")`
- Unique constraints reject duplicates: Second `Role.objects.create(name="Test", scope="global")` raises IntegrityError
- Cascade deletes work: Deleting organization removes related RoleAssignments
- Custom managers optimize queries: `RoleAssignment.objects.for_user(user)` uses select_related on role, targets

---

## Context & Constraints

### Prerequisites
- **B05-core-accounts-authentication**: User model must exist at `accounts.User` with UUID primary key
- **B06-organisation-management-multi**: Organisation model must exist at `organisations.Organisation`, Redis configured
- **B07-projects-workspaces-management**: Project model must exist with foreign key to Organisation

### Technical Stack
- Python 3.12+
- Django 5.1+ (ORM with full type hint support)
- PostgreSQL 14+ (supports composite indexes, UUID fields, foreign key constraints)
- django-stubs for type checking

### Architectural Decisions (from research.md)
- **UUID Primary Keys**: All models use UUID for distributed system compatibility and security (no sequential ID enumeration)
- **One Role Per Scope**: Unique constraint on (user, scope, target_organization, target_project) enforces single role per user per scope level
- **Additive Inheritance**: Project-level roles grant additional permissions beyond organization-level (evaluation logic in WP02, but schema supports this via scope enum)
- **Deny-by-Default**: Schema design assumes missing role assignment = no permissions (enforced in evaluation layer)

### Performance Targets
- Migration runtime: <30 seconds on clean database
- Role.objects.get(name="Admin", scope="global"): <5ms (unique index on name+scope)
- RoleAssignment.objects.for_user(user): <10ms with select_related optimization (typically 1-3 assignments per user)

### Constraints
- **No Cyclic Dependencies**: This is foundational layer - no imports from other permission modules
- **Django Standards**: Follow Django conventions for model names (singular), Meta options, manager methods
- **Postgres-Specific**: Use Postgres-native features (UUID extension, composite indexes) - no SQLite compatibility required
- **Immutable PKs**: UUID primary keys are immutable - never update, only create/delete

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create `src/permissions/` Django app structure with `py.typed` marker

**Purpose**: Initialize Django app skeleton with proper structure for type checking and code organization.

**Steps**:
1. Navigate to `src/` directory
2. Run `django-admin startapp permissions` to create app skeleton
3. Remove unnecessary files: `tests.py`, `views.py` (we'll use custom test structure)
4. Create `py.typed` marker file (empty file) in `src/permissions/` to indicate package supports type hints
5. Create subdirectories:
   - `src/permissions/api/` (for DRF serializers, viewsets, permissions - will be used in WP04)
   - `src/permissions/management/commands/` (for management commands - will be used in WP03)
6. Add `__init__.py` files in all subdirectories
7. Create placeholder `src/permissions/README.md` with title "Hierarchical Access Control System"

**Files to Create**:
- `src/permissions/__init__.py`
- `src/permissions/py.typed` (empty file)
- `src/permissions/models.py` (will be populated in T002-T004)
- `src/permissions/admin.py` (placeholder for WP06)
- `src/permissions/apps.py` (will be configured in T008)
- `src/permissions/api/__init__.py`
- `src/permissions/management/__init__.py`
- `src/permissions/management/commands/__init__.py`
- `src/permissions/README.md`

**Parallel?**: No - foundational, must complete first

**Notes**:
- Do NOT create migrations directory yet - Django will auto-create on first `makemigrations`
- `py.typed` marker is required for mypy to type-check this package
- Use UTF-8 encoding for all files

**Validation**:
```powershell
# Verify structure
Test-Path src/permissions/py.typed  # Should return True
Test-Path src/permissions/api/__init__.py  # Should return True
Test-Path src/permissions/management/commands/__init__.py  # Should return True
```

---

### Subtask T002 – Define Role model with UUID PK, name, scope enum, M2M permissions, unique constraint (name, scope)

**Purpose**: Create Role model representing named permission collections assignable at different scope levels.

**Steps**:
1. Open `src/permissions/models.py`
2. Add imports:
```python
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models.manager import RelatedManager
```

3. Define ScopeChoices enum:
```python
class ScopeChoices(models.TextChoices):
    GLOBAL = 'global', _('Global')
    ORGANIZATION = 'organization', _('Organization')
    PROJECT = 'project', _('Project')
```

4. Define Role model:
```python
class Role(models.Model):
    """
    Represents a named collection of permissions assignable at different scope levels.

    Examples:
    - Global Admin (scope=global): Full system access
    - Organization Admin (scope=organization): Full access to specific organization
    - Project Member (scope=project): Contributor access to specific project
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this role")
    )

    name = models.CharField(
        max_length=100,
        help_text=_("Display name for this role (e.g., 'Organization Admin')")
    )

    description = models.TextField(
        blank=True,
        help_text=_("Human-readable explanation of role purpose and permissions")
    )

    scope = models.CharField(
        max_length=20,
        choices=ScopeChoices.choices,
        help_text=_("Scope level where this role can be assigned")
    )

    permissions = models.ManyToManyField(
        'Permission',
        related_name='roles',
        blank=True,
        help_text=_("Permissions granted by this role")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'permissions_role'
        unique_together = [('name', 'scope')]
        indexes = [
            models.Index(fields=['name', 'scope'], name='role_name_scope_idx'),
            models.Index(fields=['scope'], name='role_scope_idx'),
        ]
        verbose_name = _('Role')
        verbose_name_plural = _('Roles')
        ordering = ['scope', 'name']

    def __str__(self) -> str:
        return f"{self.name} ({self.get_scope_display()})"

    if TYPE_CHECKING:
        permissions: RelatedManager['Permission']
```

5. Add type hints at bottom of file:
```python
# Type hints for reverse relations
if TYPE_CHECKING:
    Role.objects: 'RoleManager'
```

**Files to Update**:
- `src/permissions/models.py`

**Parallel?**: No - must complete before T005 (migration generation)

**Notes**:
- `unique_together` on (name, scope) prevents duplicate "Admin" roles across scopes
- `ManyToManyField` creates implicit `permissions_role_permissions` join table
- `get_scope_display()` is Django magic method for TextChoices - returns human-readable label
- `TYPE_CHECKING` block provides type hints without runtime import (avoids circular dependency)

**Validation**:
```python
# In Django shell (python manage.py shell)
from permissions.models import Role, ScopeChoices

# Should not raise errors
role = Role(name="Test", scope=ScopeChoices.GLOBAL)
print(role.get_scope_display())  # Should print "Global"
```

---

### Subtask T003 – Define Permission model with UUID PK, permission string (regex validated), resource_type, is_sensitive flag

**Purpose**: Create Permission model representing specific capabilities on resource types.

**Steps**:
1. Open `src/permissions/models.py` (continue from T002)
2. Add core.ValidationError import:
```python
from django.core.exceptions import ValidationError
import re
```

3. Define Permission model before Role model:
```python
class Permission(models.Model):
    """
    Represents a specific capability on a resource type.

    Permission strings follow format: {resource_type}.{action}
    Examples: projects.create, projects.delete, org.invite_users
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this permission")
    )

    permission = models.CharField(
        max_length=100,
        unique=True,
        help_text=_("Permission string (format: resource.action, e.g., 'projects.delete')")
    )

    resource_type = models.CharField(
        max_length=50,
        help_text=_("Resource category (e.g., 'project', 'organisation', 'account')")
    )

    description = models.TextField(
        blank=True,
        help_text=_("Human-readable explanation of what this permission allows")
    )

    is_sensitive = models.BooleanField(
        default=False,
        help_text=_("Whether this permission triggers audit logging (e.g., delete, invite)")
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permissions_permission'
        indexes = [
            models.Index(fields=['permission'], name='perm_string_idx'),
            models.Index(fields=['resource_type'], name='perm_resource_idx'),
            models.Index(fields=['is_sensitive'], name='perm_sensitive_idx'),
        ]
        verbose_name = _('Permission')
        verbose_name_plural = _('Permissions')
        ordering = ['resource_type', 'permission']

    def __str__(self) -> str:
        return self.permission

    def clean(self) -> None:
        """Validate permission string format: {resource}.{action}"""
        super().clean()
        if not re.match(r'^[a-z_]+\.[a-z_]+$', self.permission):
            raise ValidationError({
                'permission': _("Permission must match format 'resource.action' (lowercase letters and underscores only)")
            })
```

**Files to Update**:
- `src/permissions/models.py` (add Permission model before Role model)

**Parallel?**: No - must complete before T002 (Role references Permission via M2M)

**Notes**:
- Regex `^[a-z_]+\.[a-z_]+$` enforces lowercase, underscores, single dot (e.g., "projects.delete")
- `clean()` method validates format - called automatically by Django ModelForm and admin
- `is_sensitive` flag will be used by evaluator in WP02 to trigger audit logging
- Unique constraint on `permission` string prevents duplicates like "projects.create"

**Validation**:
```python
# In Django shell
from permissions.models import Permission

# Valid permission
perm = Permission(permission="projects.delete", resource_type="project")
perm.full_clean()  # Should not raise

# Invalid permission (uppercase)
bad_perm = Permission(permission="Projects.Delete", resource_type="project")
try:
    bad_perm.full_clean()
except ValidationError as e:
    print(e)  # Should mention format requirement
```

---

### Subtask T004 – Define RoleAssignment model with UUID PK, user FK, role FK, scope enum, targets, unique constraint (user, scope, targets)

**Purpose**: Create RoleAssignment model linking users to roles at specific scopes (global/org/project).

**Steps**:
1. Open `src/permissions/models.py` (continue from T003)
2. Define RoleAssignment model after Role:
```python
class RoleAssignment(models.Model):
    """
    Links users to roles at specific scope levels.

    Scope determines which target fields are required:
    - global: No target fields (user has role system-wide)
    - organization: target_organization required, target_project must be NULL
    - project: target_project required, target_organization derived from project.organisation

    Unique constraint enforces one role per user per scope level.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for this role assignment")
    )

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='role_assignments',
        help_text=_("User receiving this role")
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.RESTRICT,
        related_name='assignments',
        help_text=_("Role being assigned to user")
    )

    scope = models.CharField(
        max_length=20,
        choices=ScopeChoices.choices,
        help_text=_("Scope level of this assignment (global/organization/project)")
    )

    target_organization = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='role_assignments',
        help_text=_("Target organization (required if scope=organization)")
    )

    target_project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='role_assignments',
        help_text=_("Target project (required if scope=project)")
    )

    assigned_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='role_assignments_made',
        help_text=_("User who created this assignment (audit trail)")
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text=_("When this assignment was created")
    )

    class Meta:
        db_table = 'permissions_roleassignment'
        unique_together = [('user', 'scope', 'target_organization', 'target_project')]
        indexes = [
            models.Index(fields=['user'], name='roleassign_user_idx'),
            models.Index(fields=['scope', 'target_organization'], name='roleassign_scope_org_idx'),
            models.Index(fields=['scope', 'target_project'], name='roleassign_scope_proj_idx'),
            models.Index(fields=['assigned_at'], name='roleassign_date_idx'),
        ]
        verbose_name = _('Role Assignment')
        verbose_name_plural = _('Role Assignments')
        ordering = ['-assigned_at']

    def __str__(self) -> str:
        if self.scope == ScopeChoices.GLOBAL:
            return f"{self.user} -> {self.role} (Global)"
        elif self.scope == ScopeChoices.ORGANIZATION:
            return f"{self.user} -> {self.role} @ {self.target_organization}"
        else:  # PROJECT
            return f"{self.user} -> {self.role} @ {self.target_project}"

    def clean(self) -> None:
        """Validate scope and target consistency"""
        super().clean()

        # Check role.scope matches assignment scope
        if self.role_id and self.role.scope != self.scope:
            raise ValidationError({
                'role': _(f"Role scope ({self.role.scope}) must match assignment scope ({self.scope})")
            })

        # Validate target fields based on scope
        if self.scope == ScopeChoices.GLOBAL:
            if self.target_organization or self.target_project:
                raise ValidationError({
                    'scope': _("Global scope assignments must not have target_organization or target_project")
                })
        elif self.scope == ScopeChoices.ORGANIZATION:
            if not self.target_organization:
                raise ValidationError({
                    'target_organization': _("Organization scope requires target_organization")
                })
            if self.target_project:
                raise ValidationError({
                    'target_project': _("Organization scope must not have target_project")
                })
        elif self.scope == ScopeChoices.PROJECT:
            if not self.target_project:
                raise ValidationError({
                    'target_project': _("Project scope requires target_project")
                })
```

**Files to Update**:
- `src/permissions/models.py` (add RoleAssignment model after Role)

**Parallel?**: No - must complete before T005 (migration generation)

**Notes**:
- `unique_together` on (user, scope, target_organization, target_project) enforces one role per user per scope
- Assigning new role at same scope replaces previous (database handles atomically via unique constraint)
- `on_delete=CASCADE` for user/org/project: deleting parent removes role assignments
- `on_delete=RESTRICT` for role: prevents deleting role with active assignments (require cleanup first)
- `on_delete=SET_NULL` for assigned_by: preserves assignment history if assigner account deleted
- `clean()` validates scope/target consistency - called by admin and serializers

**Validation**:
```python
# In Django shell
from permissions.models import RoleAssignment, Role, ScopeChoices
from accounts.models import User
from organisations.models import Organisation

user = User.objects.first()
org = Organisation.objects.first()
role = Role.objects.create(name="Test Admin", scope=ScopeChoices.ORGANIZATION)

# Valid org-scoped assignment
assignment = RoleAssignment(
    user=user,
    role=role,
    scope=ScopeChoices.ORGANIZATION,
    target_organization=org
)
assignment.full_clean()  # Should not raise

# Invalid: scope mismatch
bad_assignment = RoleAssignment(
    user=user,
    role=role,  # scope=organization
    scope=ScopeChoices.GLOBAL  # Mismatch!
)
try:
    bad_assignment.full_clean()
except ValidationError as e:
    print(e)  # Should mention scope mismatch
```

---

### Subtask T005 – Create migration 0001_initial with indexes

**Purpose**: Generate initial migration file with all models, indexes, and constraints.

**Steps**:
1. Ensure all models from T002-T004 are saved in `src/permissions/models.py`
2. Run makemigrations:
```powershell
cd src
python manage.py makemigrations permissions
```
3. Review generated migration file at `src/permissions/migrations/0001_initial.py`
4. Verify migration includes:
   - CreateModel operations for Permission, Role, RoleAssignment
   - AddIndex operations for all indexes defined in Meta.indexes
   - AddConstraint operations for unique_together constraints
   - Foreign key relationships with correct on_delete behavior
5. Add migration docstring at top:
```python
# Generated by Django X.X on 2025-11-25
"""
Initial schema for hierarchical access control system.

Models:
- Permission: Specific capabilities (e.g., projects.delete)
- Role: Named permission collections (e.g., Organization Admin)
- RoleAssignment: User-to-role links at specific scopes (global/org/project)

Indexes optimize queries:
- role_name_scope_idx: Fast role lookup by name+scope
- roleassign_user_idx: Fast "get roles for user" queries
- roleassign_scope_org_idx, roleassign_scope_proj_idx: Fast scope-filtered queries
"""
```

**Files Created**:
- `src/permissions/migrations/__init__.py` (auto-generated)
- `src/permissions/migrations/0001_initial.py` (auto-generated, add docstring)

**Parallel?**: No - must complete T002-T004 first, blocks T007 (cascade testing)

**Notes**:
- Django auto-generates migration - do NOT manually write migration code unless necessary
- Migration should be ~200-300 lines (3 models + indexes + constraints)
- Do NOT run `migrate` yet - that happens in validation step

**Validation**:
```powershell
# Check migration exists
Test-Path src/permissions/migrations/0001_initial.py  # Should return True

# Dry-run migration (show SQL without executing)
python manage.py sqlmigrate permissions 0001

# Run migration for real
python manage.py migrate permissions

# Verify tables created
python manage.py dbshell
# In PostgreSQL shell:
\dt permissions_*
# Should show: permissions_permission, permissions_role, permissions_role_permissions, permissions_roleassignment
\q
```

---

### Subtask T006 – Create custom managers: RoleManager.with_permissions(), RoleAssignmentManager.for_user(user) with select_related optimization

**Purpose**: Provide optimized query methods to reduce N+1 queries when fetching roles and assignments.

**Steps**:
1. Create `src/permissions/managers.py`:
```python
"""Custom managers for optimized permission system queries."""
from django.db import models
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models import QuerySet
    from accounts.models import User
    from .models import Role, RoleAssignment


class RoleManager(models.Manager['Role']):
    """Custom manager for Role model with query optimizations."""

    def with_permissions(self) -> 'QuerySet[Role]':
        """
        Prefetch related permissions to avoid N+1 queries.

        Usage:
            roles = Role.objects.with_permissions().filter(scope='organization')
            for role in roles:
                print(role.permissions.all())  # No additional query
        """
        return self.prefetch_related('permissions')


class RoleAssignmentManager(models.Manager['RoleAssignment']):
    """Custom manager for RoleAssignment model with query optimizations."""

    def for_user(self, user: 'User') -> 'QuerySet[RoleAssignment]':
        """
        Get all role assignments for a user with related objects prefetched.

        Args:
            user: User instance to get assignments for

        Returns:
            QuerySet of RoleAssignments with role, target_organization,
            target_project, and role.permissions prefetched

        Usage:
            assignments = RoleAssignment.objects.for_user(request.user)
            for assignment in assignments:
                print(assignment.role.name)  # No additional query
                print(assignment.role.permissions.all())  # No additional query
        """
        return (
            self.filter(user=user)
            .select_related(
                'role',
                'target_organization',
                'target_project',
            )
            .prefetch_related('role__permissions')
        )

    def for_scope(self, scope: str, target_id: str | None = None) -> 'QuerySet[RoleAssignment]':
        """
        Get role assignments for a specific scope, optionally filtered by target.

        Args:
            scope: One of 'global', 'organization', 'project'
            target_id: UUID of target organization or project (required for non-global scopes)

        Returns:
            QuerySet of RoleAssignments with optimized joins
        """
        qs = self.select_related('role', 'user').prefetch_related('role__permissions')

        if scope == 'global':
            return qs.filter(scope='global')
        elif scope == 'organization' and target_id:
            return qs.filter(scope='organization', target_organization_id=target_id)
        elif scope == 'project' and target_id:
            return qs.filter(scope='project', target_project_id=target_id)
        else:
            return qs.none()
```

2. Update `src/permissions/models.py` to use custom managers:
```python
# At top after imports
from .managers import RoleManager, RoleAssignmentManager

# In Role model, add:
class Role(models.Model):
    # ... existing fields ...

    objects = RoleManager()

    # ... rest of model ...

# In RoleAssignment model, add:
class RoleAssignment(models.Model):
    # ... existing fields ...

    objects = RoleAssignmentManager()

    # ... rest of model ...
```

**Files Created**:
- `src/permissions/managers.py`

**Files Updated**:
- `src/permissions/models.py` (add manager assignments)

**Parallel?**: Yes - can work on this while T005 migration is being reviewed

**Notes**:
- `select_related` for ForeignKey (1-to-1 or many-to-1): fetches related objects in single JOIN query
- `prefetch_related` for ManyToManyField: fetches related objects in separate query, joins in Python
- `for_user(user)` is primary optimization - used heavily in permission evaluation (WP02)
- Type hints in managers improve IDE autocomplete and type checking

**Validation**:
```python
# In Django shell (after running migrations and creating test data)
from permissions.models import Role, RoleAssignment, ScopeChoices
from accounts.models import User

# Test RoleManager.with_permissions()
from django.db import connection
from django.test.utils import override_settings

with override_settings(DEBUG=True):
    connection.queries_log.clear()
    roles = Role.objects.with_permissions().filter(scope=ScopeChoices.GLOBAL)
    for role in roles:
        print(role.permissions.all())  # Should not trigger additional queries
    print(f"Query count: {len(connection.queries)}")  # Should be 2 (role query + prefetch)

# Test RoleAssignmentManager.for_user()
user = User.objects.first()
with override_settings(DEBUG=True):
    connection.queries_log.clear()
    assignments = RoleAssignment.objects.for_user(user)
    for assignment in assignments:
        print(assignment.role.name)
        print(assignment.target_organization)
        print(assignment.role.permissions.all())
    print(f"Query count: {len(connection.queries)}")  # Should be 2-3 (assignment + role/targets + permissions)
```

---

### Subtask T007 – Configure foreign key cascades: user/org/project CASCADE, role RESTRICT, assigned_by SET NULL

**Purpose**: Validate foreign key on_delete behavior matches requirements from data-model.md.

**Steps**:
1. Review `src/permissions/models.py` RoleAssignment model foreign keys
2. Verify on_delete configurations:
   - `user`: `on_delete=models.CASCADE` (if user deleted, remove all their role assignments)
   - `role`: `on_delete=models.RESTRICT` (prevent deleting role with active assignments)
   - `target_organization`: `on_delete=models.CASCADE` (if org deleted, remove org-scoped assignments)
   - `target_project`: `on_delete=models.CASCADE` (if project deleted, remove project-scoped assignments)
   - `assigned_by`: `on_delete=models.SET_NULL` (preserve assignment even if assigner account deleted)
3. If any mismatches found, update model and create migration:
```powershell
python manage.py makemigrations permissions --name update_cascade_rules
python manage.py migrate permissions
```

4. Write test in `tests/permissions/test_models.py` (create file if needed):
```python
"""Test foreign key cascade behavior."""
import pytest
from django.db import IntegrityError
from permissions.models import Role, RoleAssignment, ScopeChoices
from accounts.models import User
from organisations.models import Organisation


@pytest.mark.django_db
class TestForeignKeyCascades:
    """Test that foreign key on_delete behavior works correctly."""

    def test_user_delete_cascades_assignments(self):
        """Deleting user should remove all their role assignments."""
        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.GLOBAL
        )

        user.delete()

        assert not RoleAssignment.objects.filter(id=assignment.id).exists()

    def test_role_delete_restricted_with_assignments(self):
        """Deleting role with active assignments should raise IntegrityError."""
        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.GLOBAL
        )

        with pytest.raises(IntegrityError):
            role.delete()

    def test_organisation_delete_cascades_assignments(self):
        """Deleting organisation should remove org-scoped assignments."""
        user = User.objects.create(email="test@example.com")
        org = Organisation.objects.create(name="Test Org")
        role = Role.objects.create(name="Org Admin", scope=ScopeChoices.ORGANIZATION)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org
        )

        org.delete()

        assert not RoleAssignment.objects.filter(id=assignment.id).exists()

    def test_assigned_by_delete_sets_null(self):
        """Deleting assigner should preserve assignment but null assigned_by."""
        user = User.objects.create(email="test@example.com")
        assigner = User.objects.create(email="assigner@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.GLOBAL,
            assigned_by=assigner
        )

        assigner.delete()
        assignment.refresh_from_db()

        assert assignment.assigned_by is None
        assert RoleAssignment.objects.filter(id=assignment.id).exists()
```

**Files Created**:
- `tests/permissions/__init__.py`
- `tests/permissions/test_models.py`

**Files Updated**:
- `src/permissions/models.py` (if cascade rules need correction)

**Parallel?**: No - requires T004-T005 complete (models and migration must exist)

**Notes**:
- CASCADE: Deletes dependent records (assignment deleted when parent deleted)
- RESTRICT: Prevents deletion if dependent records exist (role with assignments can't be deleted)
- SET_NULL: Nullifies foreign key but preserves record (assignment preserved, assigned_by nulled)
- Test must use `@pytest.mark.django_db` to allow database access

**Validation**:
```powershell
# Run cascade tests
cd src
pytest ../tests/permissions/test_models.py::TestForeignKeyCascades -v

# All 4 tests should pass:
# - test_user_delete_cascades_assignments
# - test_role_delete_restricted_with_assignments
# - test_organisation_delete_cascades_assignments
# - test_assigned_by_delete_sets_null
```

---

### Subtask T008 – Add `permissions` app to `INSTALLED_APPS` in config/settings/base.py

**Purpose**: Register permissions app with Django so models are discovered and migrations run.

**Steps**:
1. Open `src/config/settings/base.py`
2. Locate `INSTALLED_APPS` list
3. Add `'permissions.apps.PermissionsConfig'` to INSTALLED_APPS after existing core apps (accounts, organisations, projects):
```python
INSTALLED_APPS = [
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'django_prometheus',
    # ... other third-party apps ...

    # Core apps (in dependency order)
    'accounts.apps.AccountsConfig',
    'organisations.apps.OrganisationsConfig',
    'projects.apps.ProjectsConfig',
    'permissions.apps.PermissionsConfig',  # ADD THIS LINE

    # Other apps
    # ...
]
```

4. Verify PermissionsConfig exists in `src/permissions/apps.py`:
```python
from django.apps import AppConfig


class PermissionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'permissions'
    verbose_name = 'Hierarchical Access Control'

    def ready(self):
        """
        Import signal handlers and initialize registry.

        Note: Registry initialization will be implemented in WP07.
        Signal handlers will be implemented in WP02.
        """
        pass  # Placeholder for future initialization
```

**Files Updated**:
- `src/config/settings/base.py` (add to INSTALLED_APPS)
- `src/permissions/apps.py` (update AppConfig if needed)

**Parallel?**: Yes - can do this anytime after T001 (app structure created)

**Notes**:
- Order matters: permissions depends on accounts, organisations, projects (list after them)
- Use full path `permissions.apps.PermissionsConfig` (not just `'permissions'`) for explicit app config
- `ready()` hook will be used in WP07 to register base permissions - leave empty for now

**Validation**:
```powershell
# Verify app is registered
python manage.py check permissions

# Should output: "System check identified no issues (0 silenced)."

# Verify models are discoverable
python manage.py shell
>>> from permissions.models import Role, Permission, RoleAssignment
>>> print("Models imported successfully")
>>> exit()
```

---

### Subtask T009 – Configure `PERMISSIONS_CACHE_TTL = 300` in settings (5-minute TTL)

**Purpose**: Configure cache TTL setting for permission evaluation caching (used in WP02).

**Steps**:
1. Open `src/config/settings/base.py`
2. Add permissions configuration section after existing app configs:
```python
# ==============================================================================
# PERMISSIONS CONFIGURATION
# ==============================================================================

# Permission evaluation cache time-to-live (seconds)
# Determines how long permission checks are cached in Redis
# Shorter TTL = more database queries but fresher results
# Longer TTL = fewer queries but potential stale permissions
PERMISSIONS_CACHE_TTL = 300  # 5 minutes

# Cache key prefix for permission evaluations
PERMISSIONS_CACHE_PREFIX = 'perms'

# Whether to fall back to database evaluation if Redis unavailable
PERMISSIONS_CACHE_FALLBACK = True
```

3. Verify Redis cache backend is configured (should exist from B06):
```python
# In CACHES configuration (should already exist)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_core',
    }
}
```

4. For local development, add override in `src/config/settings/local.py`:
```python
# Shorter TTL for development (faster cache invalidation for testing)
PERMISSIONS_CACHE_TTL = 60  # 1 minute in dev
```

**Files Updated**:
- `src/config/settings/base.py` (add PERMISSIONS_* settings)
- `src/config/settings/local.py` (add dev override)

**Parallel?**: Yes - can do this anytime, doesn't depend on other tasks

**Notes**:
- TTL of 300 seconds (5 minutes) balances freshness vs. performance
- Cache will be implemented in WP02 - these settings prepare for that
- `PERMISSIONS_CACHE_FALLBACK = True` enables graceful degradation if Redis down
- Redis cache backend should already be configured by B06 (organisation management)

**Validation**:
```powershell
# Verify settings load without errors
python manage.py check

# Verify settings are accessible
python manage.py shell
>>> from django.conf import settings
>>> print(f"Cache TTL: {settings.PERMISSIONS_CACHE_TTL}")  # Should print 300 (or 60 in local)
>>> print(f"Cache prefix: {settings.PERMISSIONS_CACHE_PREFIX}")  # Should print "perms"
>>> exit()
```

---

## Test Strategy

### Unit Tests (Required)
Create comprehensive test suite in `tests/permissions/test_models.py`:

1. **Model Instantiation Tests** (5 tests):
   - `test_permission_creation`: Create Permission with valid format
   - `test_permission_invalid_format`: Verify regex validation rejects "Projects.Delete"
   - `test_role_creation`: Create Role with scope and permissions
   - `test_roleassignment_creation`: Create RoleAssignment with valid scope/targets
   - `test_unique_constraints`: Verify duplicate (name, scope) raises IntegrityError

2. **Scope Validation Tests** (6 tests):
   - `test_global_scope_no_targets`: Global assignment rejects target_organization
   - `test_org_scope_requires_target`: Organization assignment requires target_organization
   - `test_project_scope_requires_target`: Project assignment requires target_project
   - `test_scope_mismatch`: Role scope must match assignment scope
   - `test_org_scope_rejects_project`: Organization assignment rejects target_project
   - `test_one_role_per_scope`: Assigning second role at same scope replaces first

3. **Foreign Key Cascade Tests** (4 tests - from T007):
   - `test_user_delete_cascades_assignments`
   - `test_role_delete_restricted_with_assignments`
   - `test_organisation_delete_cascades_assignments`
   - `test_assigned_by_delete_sets_null`

4. **Manager Optimization Tests** (3 tests):
   - `test_role_with_permissions_no_n_plus_1`: Verify prefetch_related works
   - `test_roleassignment_for_user_no_n_plus_1`: Verify select_related works
   - `test_for_scope_filters_correctly`: Verify scope filtering works

### Integration Tests (Recommended)
Create `tests/permissions/test_integration.py`:

1. **End-to-End Assignment Flow** (2 tests):
   - `test_assign_org_role_to_user`: Create user, org, role, assignment - verify all relationships
   - `test_replace_project_role`: Assign role to user at project scope, then assign different role - verify replacement

### Test Commands
```powershell
# Run all permission model tests
cd src
pytest ../tests/permissions/test_models.py -v

# Run with coverage
pytest ../tests/permissions/ --cov=permissions.models --cov-report=term-missing

# Target should be >90% coverage for models.py
```

---

## Risks & Mitigations

### Risk: Unique constraint conflicts with existing data
**Scenario**: Migration fails if database already has conflicting role assignments
**Mitigation**:
- WP01 is foundational - runs on clean database (no existing permissions data)
- If running on existing database, add data migration to deduplicate before adding constraint
- Document rollback procedure: drop permissions tables, revert migration

### Risk: Foreign key cascade deletes too much data
**Scenario**: Accidentally deleting organization removes all role assignments (intended) but surprises users
**Mitigation**:
- Document cascade behavior clearly in models.py docstrings
- Add Django admin confirmation prompts for org/project deletion (future WP06)
- Consider soft-delete pattern for organizations/projects (future enhancement)

### Risk: Migration takes too long on large databases
**Scenario**: Adding indexes to large tables (millions of rows) causes downtime
**Mitigation**:
- WP01 runs on empty tables (no data yet) - indexes are fast
- For production deployments on existing data, use `CREATE INDEX CONCURRENTLY` (Postgres-specific)
- Test migration on staging database with realistic data volume first

### Risk: Type hint errors with django-stubs
**Scenario**: Custom managers don't type-check correctly, causing mypy errors
**Mitigation**:
- Use TYPE_CHECKING blocks to avoid runtime import cycles
- Add `# type: ignore` comments only when necessary (document why)
- Test with `mypy src/permissions/` before marking WP complete

### Risk: N+1 queries despite custom managers
**Scenario**: Developers forget to use `.with_permissions()` or `.for_user()` methods
**Mitigation**:
- Document manager methods prominently in docstrings and README
- Add performance tests that fail if N+1 queries detected
- Use `django-debug-toolbar` in dev to spot N+1 queries (future WP08)

---

## Definition of Done Checklist

- [ ] All 9 subtasks (T001-T009) completed and code committed
- [ ] Migration `0001_initial.py` runs successfully on clean PostgreSQL database
- [ ] All three models (Permission, Role, RoleAssignment) instantiate without errors
- [ ] Unique constraints prevent duplicates (tested with IntegrityError assertions)
- [ ] Foreign key cascades work correctly (4 cascade tests pass)
- [ ] Custom managers optimize queries (N+1 tests show <3 queries for typical use cases)
- [ ] Settings include `PERMISSIONS_CACHE_TTL = 300` and related config
- [ ] `permissions` app listed in `INSTALLED_APPS` after dependencies
- [ ] `python manage.py check permissions` reports no issues
- [ ] Test suite in `tests/permissions/test_models.py` has 18+ tests with >90% coverage
- [ ] Type hints added to all models and managers (mypy passes)
- [ ] Docstrings added to all models, fields, and manager methods
- [ ] README.md created with brief overview (detailed docs in WP08)
- [ ] Code formatted with Black and passes Ruff linting
- [ ] All tests pass: `pytest tests/permissions/ -v`

---

## Reviewer Guidance

### Key Acceptance Checkpoints

1. **Schema Correctness**:
   - Review migration `0001_initial.py`: verify 3 models, correct indexes, unique constraints
   - Check foreign keys: CASCADE for user/org/project, RESTRICT for role, SET_NULL for assigned_by
   - Verify unique_together on (user, scope, target_organization, target_project)

2. **Model Validation Logic**:
   - Review `Permission.clean()`: regex validation for permission string format
   - Review `RoleAssignment.clean()`: scope/target consistency checks
   - Test with invalid data: uppercase permissions, scope mismatches, missing targets

3. **Query Optimization**:
   - Review custom managers: `RoleManager.with_permissions()`, `RoleAssignmentManager.for_user()`
   - Check for `select_related()` on ForeignKeys, `prefetch_related()` on M2M
   - Run N+1 tests: verify query count is <3 for typical operations

4. **Type Safety**:
   - Run `mypy src/permissions/` and verify no errors
   - Check TYPE_CHECKING blocks used correctly (no runtime import cycles)
   - Verify RelatedManager type hints on M2M fields

5. **Test Coverage**:
   - Run `pytest tests/permissions/ --cov=permissions.models --cov-report=html`
   - Open `htmlcov/index.html` and verify >90% coverage for models.py
   - Verify all edge cases tested: scope validation, cascade deletes, unique constraints

6. **Configuration**:
   - Verify `INSTALLED_APPS` includes `'permissions.apps.PermissionsConfig'` after dependencies
   - Verify `PERMISSIONS_CACHE_TTL = 300` in base settings
   - Check local.py has dev override (shorter TTL for testing)

### Common Issues to Watch For

- **Missing indexes**: Ensure all indexes from Meta.indexes are in migration
- **Incorrect cascade behavior**: Test deletes manually to verify CASCADE/RESTRICT/SET_NULL
- **Scope validation gaps**: Test all invalid scope/target combinations
- **Manager method typos**: Verify method names match documentation (with_permissions, for_user)
- **Type hint errors**: Run mypy and fix any complaints before approval
- **Missing docstrings**: All public methods should have docstrings with usage examples

---

## Activity Log

> Append entries when the work package changes lanes. Include timestamp, agent, shell PID, lane, and a short note.

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.

---

### Updating Metadata When Changing Lanes

1. Capture your shell PID: `echo $PID` in PowerShell or `echo $$` in bash
2. Update frontmatter (`lane`, `assignee`, `agent`, `shell_pid`)
3. Add an entry to the **Activity Log** describing the transition
4. Run `.kittify/scripts/powershell/tasks-move-to-lane.ps1 008-hierarchical-access-control WP01 <lane>` to move the prompt, update metadata, and append history in one step
5. Commit the change with message: `chore(008): Move WP01 to <lane>`

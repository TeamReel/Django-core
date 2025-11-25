---
work_package_id: "WP03"
subtasks:
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
title: "Default Roles & Permissions"
phase: "Phase 2 - Core Implementation"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "11524"
review_status: "feedback_addressed"
reviewed_by: "claude"
history:
  - timestamp: "2025-11-25T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-25T22:35:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started WP03 implementation"
  - timestamp: "2025-11-25T23:00:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "Completed implementation, moved to for_review"
  - timestamp: "2025-11-25T23:15:00Z"
    lane: "planned"
    agent: "claude"
    shell_pid: "11524"
    action: "Code review complete: Missing test suite (blocker), needs Unicode fix, documentation updates"
  - timestamp: "2025-11-25T23:20:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Acknowledged review feedback - addressing test suite, Unicode fix, documentation"
  - timestamp: "2025-11-25T23:30:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "All review feedback addressed - 19 tests created (100% coverage), Unicode fixed, documentation added"
---
*Path: [kitty-specs/008-hierarchical-access-control/tasks/planned/WP03-default-roles-and-permissions.md](kitty-specs/008-hierarchical-access-control/tasks/planned/WP03-default-roles-and-permissions.md)*

# Work Package Prompt: WP03 – Default Roles & Permissions

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

**Status**: ❌ **Needs Changes**

**Reviewed By**: claude
**Review Date**: 2025-11-25T23:15:00Z
**Shell PID**: 11524

### Critical Issues

1. **BLOCKER: Missing Test Suite** - The Definition of Done explicitly requires "Test suite has 13+ tests with 100% coverage for seed commands" and "All tests pass: `pytest tests/permissions/test_seed_command.py -v`". Currently, **NO tests exist** for the seed commands.
   - **Impact**: Cannot verify idempotency, permission correctness, role mappings, or force flag behavior
   - **Required Action**: Create `tests/permissions/test_seed_command.py` with comprehensive test coverage

2. **MAJOR: Missing Sensitive Permissions** - The spec requires marking **5+ sensitive permissions** specifically including `permissions.create_role`, `permissions.modify_role`, `permissions.delete_role`, `permissions.assign_role`. However, the implementation has **11 sensitive permissions** (which is good), but we need to verify the count includes ALL required ones.
   - **Verification needed**: Confirm all 5 required permissions.* are marked sensitive
   - **Current count**: 11 total (exceeds requirement ✓)

3. **MINOR: Inconsistent Permission Count** - The spec mentions "17 base permissions" but with the wildcard `*` permission, we actually create **18 permissions** (17 base + 1 wildcard). This should be clarified in documentation.
   - **Impact**: Minor documentation discrepancy
   - **Action**: Update success message to clarify "17 base permissions + 1 wildcard"

4. **MINOR: Unicode in warm_permission_cache.py** - Line 59 uses `✓` checkmark character which will cause `UnicodeEncodeError` on Windows consoles (same issue we fixed in seed_default_roles.py).
   - **Impact**: Windows compatibility issue
   - **Action**: Replace `✓` with "OK" or similar ASCII character

### What Was Done Well

✅ **Implementation Quality**:
- Excellent use of `transaction.atomic()` for database consistency
- Proper idempotency with `get_or_create` pattern
- Clear, informative output messages with Django style formatting
- Correct permission mappings for all 7 roles
- Global Admin wildcard `*` permission correctly implemented
- Organization Admin correctly gets all org.* and project.* permissions
- `--force` flag implementation allows development reset

✅ **Code Quality**:
- Well-documented docstrings
- Clean separation between permissions and roles creation
- Proper use of select_related/prefetch_related in warm_permission_cache
- Black formatted and Ruff compliant

✅ **Manual Testing**:
- Successfully created 17 base permissions
- Successfully created 7 roles with correct mappings
- Idempotency verified (ran twice, no errors)
- All 11 sensitive permissions correctly marked

### Action Items (Must Complete Before Re-Review)

- [X] **CRITICAL**: Create comprehensive test suite at `tests/permissions/test_seed_command.py`:
  - [X] Test idempotency (run seed twice, verify counts)
  - [X] Test force flag (modify role, run with --force, verify restored)
  - [X] Test permission creation (verify 17 base + 1 wildcard)
  - [X] Test role creation (verify 7 roles with correct scopes)
  - [X] Test permission mappings (each role has expected permissions)
  - [X] Test sensitive flags (11 permissions marked)
  - [X] Test Global Admin wildcard
  - [X] Test warm_permission_cache command
  - [X] Test warm_permission_cache with no global assignments
  - [X] Minimum 13 tests total with 100% coverage → **19 tests created, 100% coverage achieved**

- [X] **MAJOR**: Fix Unicode character in `warm_permission_cache.py` line 59:
  - Replace `✓` with "OK" for Windows compatibility → **DONE**

- [X] **MINOR**: Update success messages to clarify permission count:
  - Distinguish between "17 base permissions" and total count including wildcard → **DONE**

- [X] **DOCUMENTATION**: Add brief comment in seed_permissions() explaining why some permissions are marked sensitive (helps future maintainers) → **DONE**

### Validation Checklist (For Re-Review)

Before re-submitting for review, verify:
- [X] Run `pytest tests/permissions/test_seed_command.py -v` → All tests pass **✓ 19 passed**
- [X] Run `pytest tests/permissions/test_seed_command.py --cov=permissions.management.commands --cov-report=term-missing` → 100% coverage **✓ 100% achieved**
- [X] Run `python manage.py seed_default_roles` twice → No errors, same counts **✓ Verified**
- [X] Run `python manage.py seed_default_roles --force` → Roles updated successfully **✓ Verified**
- [X] Run `python manage.py warm_permission_cache` → No Unicode errors on Windows **✓ Verified**
- [X] All code formatted with Black → `black --check .` **✓ Passed**
- [X] All code passes Ruff → `ruff check .` **✓ Passed**

---

## Objectives & Success Criteria

This work package seeds the permission system with 7 sensible starter roles, 17 base permissions, and a cache warming command. Success is marked by:

- **17 Base Permissions Registered**: 6 org.* permissions, 6 projects.* permissions, 5 permissions.* permissions created in database
- **7 Starter Roles Created**: Global Admin, Org Admin/Member/Viewer, Project Admin/Member/Viewer with correct permission mappings
- **Sensitive Permissions Marked**: `projects.delete`, `org.remove_users`, `org.delete`, `permissions.assign_role`, `permissions.modify_role` flagged as `is_sensitive=True`
- **Wildcard Permission Works**: Global Admin role has `*` permission granting all access
- **Idempotent Seeding**: `seed_default_roles` command can run multiple times without errors (uses get_or_create)
- **Cache Warming Command**: `warm_permission_cache` pre-warms global roles and superuser assignments on startup
- **Permission Mappings Correct**: Each role has expected permissions per spec.md (e.g., Org Admin has `org.*` + `projects.*`)

**Acceptance Criteria**:
- Command succeeds: `python manage.py seed_default_roles`
- 17 Permission objects exist: `Permission.objects.count() == 17`
- 7 Role objects exist: `Role.objects.count() == 7`
- Global Admin has wildcard: `Role.objects.get(name='Global Admin').permissions.filter(permission='*').exists()`
- Sensitive permissions marked: `Permission.objects.filter(is_sensitive=True).count() >= 5`
- Re-running seed command doesn't raise IntegrityError (idempotent)
- Cache warming succeeds: `python manage.py warm_permission_cache`

---

## Context & Constraints

### Prerequisites
- **WP01 Complete**: Models exist and migrations run successfully
- **WP02 Complete**: Evaluator and cache functions available (for warm_permission_cache)
- **PostgreSQL Database**: Access to run migrations and seed data

### Technical Stack
- Python 3.12+
- Django 5.1+ (management commands, get_or_create pattern)
- PostgreSQL (bulk_create for performance)

### Architectural Decisions (from data-model.md)
- **Pre-Defined Roles**: Provide starter roles for immediate use (not just empty permission system)
- **Resource-Type Organization**: Permissions organized by resource (org, projects, permissions)
- **Wildcard Permission**: `*` permission grants all access (global superuser pattern)
- **Sensitive Flag**: Database boolean flag triggers audit logging (configurable at runtime)

### Performance Targets
- Seeding 17 permissions + 7 roles + M2M links: <5 seconds
- Cache warming (global roles): <10 seconds for 100 global assignments
- Idempotent seeding (re-run): <1 second (skips existing records)

### Constraints
- **Idempotency Required**: Command safe to run multiple times (production deployments)
- **No Hardcoded IDs**: Use get_or_create with natural keys (name + scope)
- **Migration-Based**: Permissions registered via data migration (persistent, version controlled)
- **Future Extension**: Downstream apps can register additional permissions via registry (WP07)

---

## Subtasks & Detailed Guidance

### Subtask T020 – Create management command `seed_default_roles.py`

**Purpose**: Provide Django command to populate 7 starter roles with permission mappings.

**Steps**:
1. Create `src/permissions/management/commands/seed_default_roles.py`:
```python
"""
Management command to seed default roles and permissions.

Usage:
    python manage.py seed_default_roles
    python manage.py seed_default_roles --force  # Recreate all roles
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from permissions.models import Role, Permission, ScopeChoices


class Command(BaseCommand):
    help = 'Seed default roles and permissions for hierarchical access control'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreate roles even if they exist (WARNING: removes existing role assignments)'
        )

    def handle(self, *args, **options):
        force = options['force']

        self.stdout.write("Seeding default permissions and roles...")

        with transaction.atomic():
            # Step 1: Create base permissions (will be implemented in T028)
            permissions_created = self.seed_permissions()

            # Step 2: Create 7 default roles (T021-T027)
            roles_created = self.seed_roles(force)

        self.stdout.write(self.style.SUCCESS(
            f"✓ Seeding complete: {permissions_created} permissions, {roles_created} roles"
        ))

    def seed_permissions(self):
        """Seed base permissions (implemented in T028)."""
        # Placeholder - will be filled in T028
        return 0

    def seed_roles(self, force=False):
        """Seed default roles (implemented in T021-T027)."""
        # Placeholder - will be filled in T021-T027
        return 0
```

2. Test command exists:
```powershell
cd src
python manage.py seed_default_roles --help
# Should show command help with --force option
```

**Files Created**:
- `src/permissions/management/commands/seed_default_roles.py`

**Parallel?**: Yes - can create command structure while T021-T028 implement details

**Notes**:
- Use `transaction.atomic()` to rollback all changes if error occurs
- `--force` flag useful for development (reset to clean state)
- Command is idempotent by default (safe to run multiple times)

**Validation**:
```powershell
cd src
python manage.py seed_default_roles --help
# Should display help text with --force option
```

---

### Subtask T021 – Define permission mappings for Global Admin: all permissions (`*`)

**Purpose**: Create global superuser role with wildcard permission.

**Steps**:
1. Update `seed_default_roles.py` `seed_roles` method:
```python
def seed_roles(self, force=False):
    """Seed 7 default roles with permission mappings."""
    roles_created = 0

    # === Global Admin Role ===
    wildcard_perm, _ = Permission.objects.get_or_create(
        permission='*',
        defaults={
            'resource_type': 'all',
            'description': 'Wildcard permission granting all access',
            'is_sensitive': True
        }
    )

    if force:
        Role.objects.filter(name='Global Admin', scope=ScopeChoices.GLOBAL).delete()

    global_admin, created = Role.objects.get_or_create(
        name='Global Admin',
        scope=ScopeChoices.GLOBAL,
        defaults={
            'description': 'System-wide administrator with full access to all resources'
        }
    )

    if created or force:
        global_admin.permissions.set([wildcard_perm])
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Global Admin (scope=global)")

    return roles_created
```

2. Add test in `tests/permissions/test_seed_command.py`:
```python
"""Tests for seed_default_roles command."""
import pytest
from django.core.management import call_command
from permissions.models import Role, Permission, ScopeChoices


@pytest.mark.django_db
class TestSeedCommand:
    """Test default role seeding."""

    def test_global_admin_has_wildcard(self):
        """Global Admin role should have wildcard permission."""
        call_command('seed_default_roles')

        global_admin = Role.objects.get(name='Global Admin', scope=ScopeChoices.GLOBAL)
        assert global_admin.permissions.filter(permission='*').exists()

    def test_seed_is_idempotent(self):
        """Running seed twice should not create duplicates."""
        call_command('seed_default_roles')
        role_count_1 = Role.objects.count()
        perm_count_1 = Permission.objects.count()

        call_command('seed_default_roles')
        role_count_2 = Role.objects.count()
        perm_count_2 = Permission.objects.count()

        assert role_count_1 == role_count_2
        assert perm_count_1 == perm_count_2
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`

**Files Created**:
- `tests/permissions/test_seed_command.py`

**Parallel?**: No - must complete T020 (command structure) first

**Notes**:
- Wildcard `*` is special permission (matches any permission string in evaluator)
- Marked as sensitive (global admin actions should be audited)
- Use `get_or_create` for idempotency (won't raise on duplicate)

**Validation**:
```powershell
cd src
python manage.py seed_default_roles
pytest ../tests/permissions/test_seed_command.py::TestSeedCommand::test_global_admin_has_wildcard -v
```

---

### Subtask T022 – Define permission mappings for Organization Admin: `org.*` + `projects.*`

**Purpose**: Create organization admin role with full organization and project permissions.

**Steps**:
1. Update `seed_roles` method in `seed_default_roles.py`:
```python
    # === Organization Admin Role ===
    org_permissions = Permission.objects.filter(permission__startswith='org.') | \
                      Permission.objects.filter(permission__startswith='projects.')

    if force:
        Role.objects.filter(name='Organization Admin', scope=ScopeChoices.ORGANIZATION).delete()

    org_admin, created = Role.objects.get_or_create(
        name='Organization Admin',
        scope=ScopeChoices.ORGANIZATION,
        defaults={
            'description': 'Full administrative access to organization and all its projects'
        }
    )

    if created or force:
        org_admin.permissions.set(org_permissions)
        roles_created += 1
        self.stdout.write(
            f"  ✓ Created role: Organization Admin (scope=organization, "
            f"{org_permissions.count()} permissions)"
        )
```

2. Add test:
```python
def test_org_admin_has_org_and_project_permissions():
    """Organization Admin should have all org.* and projects.* permissions."""
    call_command('seed_default_roles')

    org_admin = Role.objects.get(name='Organization Admin', scope=ScopeChoices.ORGANIZATION)

    # Should have org permissions
    assert org_admin.permissions.filter(permission__startswith='org.').exists()

    # Should have project permissions
    assert org_admin.permissions.filter(permission__startswith='projects.').exists()

    # Should NOT have permissions.* permissions (not org-level concern)
    assert not org_admin.permissions.filter(permission__startswith='permissions.').exists()
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`
- `tests/permissions/test_seed_command.py`

**Parallel?**: Yes - can work on T022-T027 in parallel (all follow same pattern)

**Notes**:
- Use QuerySet OR (`|`) to combine org.* and projects.* permissions
- Organization Admin can manage all projects within their org (not just specific projects)
- Scope=ORGANIZATION means role only applies when assigned to specific organization

**Validation**:
```powershell
cd src
pytest ../tests/permissions/test_seed_command.py::TestSeedCommand::test_org_admin_has_org_and_project_permissions -v
```

---

### Subtask T023 – Define permission mappings for Organization Member

**Purpose**: Create organization member role with view members, create/view/update projects.

**Steps**:
1. Update `seed_roles` method:
```python
    # === Organization Member Role ===
    org_member_perms = Permission.objects.filter(
        permission__in=[
            'org.view_members',
            'projects.create',
            'projects.view',
            'projects.update'
        ]
    )

    if force:
        Role.objects.filter(name='Organization Member', scope=ScopeChoices.ORGANIZATION).delete()

    org_member, created = Role.objects.get_or_create(
        name='Organization Member',
        scope=ScopeChoices.ORGANIZATION,
        defaults={
            'description': 'Regular organization member with project creation rights'
        }
    )

    if created or force:
        org_member.permissions.set(org_member_perms)
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Organization Member (scope=organization)")
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`

**Parallel?**: Yes

**Notes**:
- Members can create new projects but not delete them
- Members can update projects but not archive/delete
- Members can view other members but not invite/remove

---

### Subtask T024 – Define permission mappings for Organization Viewer

**Purpose**: Create read-only organization role.

**Steps**:
1. Update `seed_roles` method:
```python
    # === Organization Viewer Role ===
    org_viewer_perms = Permission.objects.filter(
        permission__in=[
            'org.view_members',
            'projects.view'
        ]
    )

    if force:
        Role.objects.filter(name='Organization Viewer', scope=ScopeChoices.ORGANIZATION).delete()

    org_viewer, created = Role.objects.get_or_create(
        name='Organization Viewer',
        scope=ScopeChoices.ORGANIZATION,
        defaults={
            'description': 'Read-only access to organization and projects'
        }
    )

    if created or force:
        org_viewer.permissions.set(org_viewer_perms)
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Organization Viewer (scope=organization)")
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`

**Parallel?**: Yes

**Notes**:
- Viewers cannot create, update, or delete anything
- Useful for stakeholders, auditors, external reviewers

---

### Subtask T025 – Define permission mappings for Project Admin: `projects.*`

**Purpose**: Create project admin role with full project control.

**Steps**:
1. Update `seed_roles` method:
```python
    # === Project Admin Role ===
    project_admin_perms = Permission.objects.filter(permission__startswith='projects.')

    if force:
        Role.objects.filter(name='Project Admin', scope=ScopeChoices.PROJECT).delete()

    project_admin, created = Role.objects.get_or_create(
        name='Project Admin',
        scope=ScopeChoices.PROJECT,
        defaults={
            'description': 'Full administrative access to specific project'
        }
    )

    if created or force:
        project_admin.permissions.set(project_admin_perms)
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Project Admin (scope=project)")
```

2. Add test:
```python
def test_project_admin_has_all_project_permissions():
    """Project Admin should have all projects.* permissions."""
    call_command('seed_default_roles')

    project_admin = Role.objects.get(name='Project Admin', scope=ScopeChoices.PROJECT)

    # Should have all project permissions
    assert project_admin.permissions.filter(permission='projects.view').exists()
    assert project_admin.permissions.filter(permission='projects.update').exists()
    assert project_admin.permissions.filter(permission='projects.delete').exists()
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`
- `tests/permissions/test_seed_command.py`

**Parallel?**: Yes

**Notes**:
- Project Admin can delete project (sensitive operation, will be audited)
- Scope=PROJECT means role only applies to specific project assignment

---

### Subtask T026 – Define permission mappings for Project Member

**Purpose**: Create project member role with view and update permissions.

**Steps**:
1. Update `seed_roles` method:
```python
    # === Project Member Role ===
    project_member_perms = Permission.objects.filter(
        permission__in=['projects.view', 'projects.update']
    )

    if force:
        Role.objects.filter(name='Project Member', scope=ScopeChoices.PROJECT).delete()

    project_member, created = Role.objects.get_or_create(
        name='Project Member',
        scope=ScopeChoices.PROJECT,
        defaults={
            'description': 'Active project contributor with edit access'
        }
    )

    if created or force:
        project_member.permissions.set(project_member_perms)
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Project Member (scope=project)")
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`

**Parallel?**: Yes

**Notes**:
- Members can update project details but not delete
- Most common role for active contributors

---

### Subtask T027 – Define permission mappings for Project Viewer

**Purpose**: Create read-only project role.

**Steps**:
1. Update `seed_roles` method:
```python
    # === Project Viewer Role ===
    project_viewer_perms = Permission.objects.filter(permission='projects.view')

    if force:
        Role.objects.filter(name='Project Viewer', scope=ScopeChoices.PROJECT).delete()

    project_viewer, created = Role.objects.get_or_create(
        name='Project Viewer',
        scope=ScopeChoices.PROJECT,
        defaults={
            'description': 'Read-only access to specific project'
        }
    )

    if created or force:
        project_viewer.permissions.set(project_viewer_perms)
        roles_created += 1
        self.stdout.write(f"  ✓ Created role: Project Viewer (scope=project)")

    return roles_created  # End of seed_roles method
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`

**Parallel?**: Yes

**Notes**:
- Viewers cannot modify project in any way
- Useful for stakeholders, clients, external reviewers

---

### Subtask T028 – Register base permissions in migration: 17 permissions

**Purpose**: Create 17 base permissions organized by resource type.

**Steps**:
1. Update `seed_permissions` method in `seed_default_roles.py`:
```python
def seed_permissions(self):
    """Seed base permissions for org, projects, and permissions resources."""
    permissions_data = [
        # Organisation Permissions (6)
        ('org.invite_users', 'organisation', 'Invite new users to organization', True),
        ('org.remove_users', 'organisation', 'Remove users from organization', True),
        ('org.manage_settings', 'organisation', 'Modify organization settings', False),
        ('org.view_members', 'organisation', 'View organization members', False),
        ('org.assign_roles', 'organisation', 'Assign roles to organization members', True),
        ('org.delete', 'organisation', 'Delete organization', True),

        # Project Permissions (6)
        ('projects.create', 'project', 'Create new projects', False),
        ('projects.view', 'project', 'View project details', False),
        ('projects.update', 'project', 'Modify project settings', False),
        ('projects.delete', 'project', 'Delete projects', True),
        ('projects.archive', 'project', 'Archive projects', False),
        ('projects.assign_roles', 'project', 'Assign roles to project members', True),

        # Permission Management Permissions (5)
        ('permissions.create_role', 'permission', 'Create new roles', True),
        ('permissions.modify_role', 'permission', 'Modify existing roles', True),
        ('permissions.delete_role', 'permission', 'Delete roles', True),
        ('permissions.assign_role', 'permission', 'Assign roles to users', True),
        ('permissions.view_roles', 'permission', 'View roles and permissions', False),
    ]

    permissions_created = 0
    for perm_string, resource_type, description, is_sensitive in permissions_data:
        perm, created = Permission.objects.get_or_create(
            permission=perm_string,
            defaults={
                'resource_type': resource_type,
                'description': description,
                'is_sensitive': is_sensitive
            }
        )
        if created:
            permissions_created += 1
            sensitive_marker = '🔒' if is_sensitive else '  '
            self.stdout.write(f"  {sensitive_marker} Created permission: {perm_string}")

    return permissions_created
```

2. Add test:
```python
def test_seventeen_base_permissions_created():
    """Seed command should create 17 base permissions."""
    call_command('seed_default_roles')

    # Count by resource type
    org_perms = Permission.objects.filter(resource_type='organisation').count()
    project_perms = Permission.objects.filter(resource_type='project').count()
    perm_perms = Permission.objects.filter(resource_type='permission').count()

    assert org_perms == 6
    assert project_perms == 6
    assert perm_perms == 5
    assert Permission.objects.count() >= 17  # May have wildcard too
```

**Files Updated**:
- `src/permissions/management/commands/seed_default_roles.py`
- `tests/permissions/test_seed_command.py`

**Parallel?**: No - must complete before T021-T027 (roles reference permissions)

**Notes**:
- Permissions organized by resource type for clarity
- 🔒 emoji marks sensitive permissions in output (visual aid)
- Use tuple format for clean data definition

**Validation**:
```powershell
cd src
python manage.py seed_default_roles
pytest ../tests/permissions/test_seed_command.py::TestSeedCommand::test_seventeen_base_permissions_created -v
```

---

### Subtask T029 – Mark sensitive permissions

**Purpose**: Already implemented in T028 (is_sensitive parameter in permissions_data).

**Steps**: No additional work - T028 includes `is_sensitive` flag for each permission.

**Validation**:
```python
# In Django shell
from permissions.models import Permission

sensitive = Permission.objects.filter(is_sensitive=True)
for perm in sensitive:
    print(f"🔒 {perm.permission}")
# Should print: org.invite_users, org.remove_users, org.delete, projects.delete,
#               projects.assign_roles, permissions.* (all 5)
```

**Parallel?**: N/A (merged into T028)

---

### Subtask T030 – Create management command `warm_permission_cache.py`

**Purpose**: Pre-warm Redis cache with global roles and superuser assignments on startup.

**Steps**:
1. Create `src/permissions/management/commands/warm_permission_cache.py`:
```python
"""
Management command to pre-warm permission cache with global roles.

Usage:
    python manage.py warm_permission_cache

Typically run on application startup or via cron/systemd timer.
"""
from django.core.management.base import BaseCommand
from permissions.models import RoleAssignment, ScopeChoices
from permissions.evaluator import check_permission
from permissions.cache import set_cached_evaluation


class Command(BaseCommand):
    help = 'Pre-warm permission cache with global roles and common permissions'

    def handle(self, *args, **options):
        self.stdout.write("Warming permission cache...")

        # Get all global-scoped role assignments
        global_assignments = (
            RoleAssignment.objects
            .filter(scope=ScopeChoices.GLOBAL)
            .select_related('role')
            .prefetch_related('role__permissions')
        )

        if not global_assignments.exists():
            self.stdout.write(self.style.WARNING("No global role assignments found"))
            return

        # Common permissions to pre-cache
        common_permissions = [
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.delete',
            'org.view_members',
            'org.invite_users',
        ]

        cache_count = 0
        for assignment in global_assignments:
            for permission in common_permissions:
                # Evaluate and cache
                result = check_permission(
                    assignment.user_id,
                    permission,
                    None,
                    'generic'
                )
                cache_count += 1

            user_email = assignment.user.email if hasattr(assignment, 'user') else assignment.user_id
            self.stdout.write(f"  ✓ Warmed cache for user: {user_email} ({len(common_permissions)} permissions)")

        self.stdout.write(self.style.SUCCESS(
            f"✓ Cache warming complete: {cache_count} evaluations cached"
        ))
```

2. Add test:
```python
def test_warm_cache_command():
    """Cache warming command should pre-populate Redis."""
    from django.core.management import call_command
    from permissions.cache import get_cached_evaluation
    from accounts.models import User

    # Create global admin user
    user = User.objects.create(email="admin@example.com")
    call_command('seed_default_roles')
    global_admin = Role.objects.get(name='Global Admin', scope=ScopeChoices.GLOBAL)
    RoleAssignment.objects.create(user=user, role=global_admin, scope=ScopeChoices.GLOBAL)

    # Warm cache
    call_command('warm_permission_cache')

    # Check that common permissions are cached
    cached = get_cached_evaluation(user.id, 'projects.view', 'generic', None)
    assert cached is True  # Global admin has wildcard
```

**Files Created**:
- `src/permissions/management/commands/warm_permission_cache.py`

**Files Updated**:
- `tests/permissions/test_seed_command.py` (add test_warm_cache_command)

**Parallel?**: No - requires WP02 (evaluator, cache functions) complete

**Notes**:
- Only warms global roles (most common, predictable)
- Pre-caches 6 common permissions per global user
- Run on application startup (systemd `ExecStartPost` or supervisor `startretries`)
- Optional optimization (system works without it, just slower on first requests)

**Validation**:
```powershell
cd src
python manage.py warm_permission_cache
# Should output: "Warmed cache for user: admin@example.com (6 permissions)"

pytest ../tests/permissions/test_seed_command.py::test_warm_cache_command -v
```

---

## Test Strategy

### Unit Tests (Required)

1. **Seed Command Tests** (`test_seed_command.py` - 10 tests):
   - 17 base permissions created
   - 7 roles created with correct scopes
   - Global Admin has wildcard permission
   - Org Admin has org.* + projects.* permissions
   - Project roles have correct permission subsets
   - Sensitive permissions marked correctly
   - Idempotent seeding (re-run doesn't duplicate)
   - Force flag recreates roles
   - Command output includes success messages

2. **Cache Warming Tests** (3 tests):
   - Warm cache command succeeds
   - Global roles are cached after warming
   - Command handles empty database gracefully

### Integration Tests (Recommended)

1. **End-to-End Seeding Flow**:
```python
def test_seed_then_assign_then_check():
    """Full flow: seed → assign role → check permission."""
    call_command('seed_default_roles')

    user = User.objects.create(email="test@example.com")
    org = Organisation.objects.create(name="Test Org")
    org_admin = Role.objects.get(name='Organization Admin', scope=ScopeChoices.ORGANIZATION)

    RoleAssignment.objects.create(
        user=user,
        role=org_admin,
        scope=ScopeChoices.ORGANIZATION,
        target_organization=org
    )

    # User should have org permissions
    from permissions.evaluator import check_permission
    assert check_permission(user.id, 'org.invite_users', org.id, 'organisation') is True
```

### Test Commands
```powershell
# Run all seed tests
cd src
pytest ../tests/permissions/test_seed_command.py -v

# Test seeding in clean database
python manage.py migrate
python manage.py seed_default_roles
python manage.py shell
>>> from permissions.models import Role, Permission
>>> Role.objects.count()  # Should be 7
>>> Permission.objects.count()  # Should be 17 (or 18 with wildcard)
```

---

## Risks & Mitigations

### Risk: Permission naming conflicts with downstream apps
**Scenario**: Downstream app tries to register `projects.create` (already exists)
**Mitigation**:
- Document reserved namespaces (org, projects, permissions) in README
- Registry raises ImproperlyConfigured on duplicate (fail fast)
- Downstream apps should use their app name as prefix (e.g., `reports.generate`)

### Risk: Roles modified after deployment, unexpected behavior
**Scenario**: Admin removes permission from Organization Admin, existing users lose access
**Mitigation**:
- Acceptable per spec (roles are mutable, cache invalidation handles this)
- Audit role modifications (audit logging in WP05)
- Document role modification impact in admin UI (future WP06)
- Consider "protected" flag on starter roles (prevent deletion, not modification)

### Risk: Seeding fails on existing database with conflicting data
**Scenario**: Database already has Role named "Global Admin" with different scope
**Mitigation**:
- Use get_or_create with natural key (name + scope)
- If conflict detected, log warning and skip (don't crash)
- `--force` flag allows recreating roles (use cautiously in production)

### Risk: Cache warming takes too long, delays startup
**Scenario**: 1000 global users, warming takes 2 minutes
**Mitigation**:
- Warm only global roles (bounded, typically <10 users)
- Run asynchronously after startup (non-blocking)
- Skip warming in development (use only in production)
- Monitor warming time with metrics (alert if >30 seconds)

---

## Definition of Done Checklist

- [ ] All 11 subtasks (T020-T030) completed and code committed
- [ ] Management command `seed_default_roles` created and executable
- [ ] 17 base permissions created with correct resource_type and is_sensitive flags
- [ ] 7 starter roles created with correct scopes and permission mappings
- [ ] Global Admin has wildcard `*` permission
- [ ] Sensitive permissions marked: org.invite_users, org.remove_users, org.delete, projects.delete, projects.assign_roles, permissions.* (5+ total)
- [ ] Idempotent seeding: re-running command doesn't raise errors
- [ ] `--force` flag recreates roles when needed
- [ ] Management command `warm_permission_cache` created
- [ ] Cache warming pre-caches global roles and common permissions
- [ ] Test suite has 13+ tests with 100% coverage for seed commands
- [ ] All tests pass: `pytest tests/permissions/test_seed_command.py -v`
- [ ] Command output clear and informative (uses Django's stdout.write with style)
- [ ] Code formatted with Black and passes Ruff linting

---

## Reviewer Guidance

### Key Acceptance Checkpoints

1. **Permission Data Correctness**:
   - Review `permissions_data` in seed_permissions: verify 17 permissions (6 org, 6 projects, 5 permissions)
   - Check is_sensitive flags: at least 5 sensitive (org.invite_users, org.remove_users, org.delete, projects.delete, projects.assign_roles)
   - Verify permission string format: all lowercase, single dot (e.g., `projects.delete`)

2. **Role Mappings Accuracy**:
   - Review each role's permission set: compare to spec.md requirements
   - Verify Global Admin has wildcard `*` permission
   - Verify Organization Admin has all org.* + projects.* permissions
   - Verify Organization Member has subset: org.view_members + projects.{create, view, update}
   - Verify Project Admin has all projects.* permissions

3. **Idempotency**:
   - Test: run `python manage.py seed_default_roles` twice
   - Verify no IntegrityError raised
   - Verify Role.objects.count() same both times

4. **Force Flag**:
   - Test: modify a role in database (remove permission)
   - Run `python manage.py seed_default_roles --force`
   - Verify role restored to default state

5. **Cache Warming**:
   - Test: create global admin user, run `warm_permission_cache`
   - Check Redis: verify keys exist (perms:{user_id}:projects.view:generic:none)
   - Verify command handles empty database (no global roles) gracefully

### Common Issues to Watch For

- **Missing permissions**: Forgetting to add permission to permissions_data
- **Wrong scope**: Creating Organization Admin with scope=global (should be organization)
- **Hardcoded IDs**: Using `Role.objects.create(id='abc123')` instead of get_or_create
- **No transaction**: Not wrapping seed in transaction.atomic() (partial failure leaves inconsistent state)
- **Verbose output**: Using print() instead of self.stdout.write() (breaks management command conventions)

---

## Activity Log

> Append entries when the work package changes lanes. Include timestamp, agent, shell PID, lane, and a short note.

- 2025-11-25T00:00:00Z – system – lane=planned – Prompt created.

---

### Updating Metadata When Changing Lanes

1. Capture your shell PID: `echo $PID` in PowerShell or `echo $$` in bash
2. Update frontmatter (`lane`, `assignee`, `agent`, `shell_pid`)
3. Add an entry to the **Activity Log** describing the transition
4. Run `.kittify/scripts/powershell/tasks-move-to-lane.ps1 008-hierarchical-access-control WP03 <lane>` to move the prompt, update metadata, and append history in one step
5. Commit the change with message: `chore(008): Move WP03 to <lane>`

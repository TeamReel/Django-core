---
work_package_id: "WP02"
subtasks:
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
title: "Django Groups & Permissions Setup"
phase: "Phase 0 - Infrastructure"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-23T22:25:59Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – Django Groups & Permissions Setup

## Objectives & Success Criteria

**Goal**: Create three-tier role system using Django Groups (superadmin/admin/user), assign appropriate permissions, and implement automatic role assignment for new users.

**Success Criteria**:
- [ ] Three groups created via data migration: superadmin, admin, user
- [ ] Admin group has user management permissions (add_user, change_user, view_user)
- [ ] User model has role helper properties (is_superadmin, is_admin, is_regular_user)
- [ ] Post-save signal automatically assigns 'user' group to new users
- [ ] DRF permission classes created (IsSuperadmin, IsAdmin, IsAdminOrReadOnly)

## Context & Constraints

**Prerequisites**: WP01 complete (User model exists)

**Key Decisions** (from `research.md`):
- Use Django's built-in Groups system (no custom Role model)
- Three-tier hierarchy: superadmin (is_superuser=True) > admin (group member) > user (default group)
- Permissions at model-level (no object-level permissions)

**References**:
- **Data Model**: `data-model.md` - Group entity definition
- **Spec**: `spec.md` - FR-015 to FR-020 (Role & Permission System)

## Subtasks & Detailed Guidance

### T010 – Create data migration for groups

**Steps**:
1. Run: `python manage.py makemigrations accounts --empty -n create_groups`
2. Edit migration file:
```python
from django.db import migrations

def create_default_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Permission = apps.get_model('auth', 'Permission')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    # Get User content type
    user_ct = ContentType.objects.get(app_label='accounts', model='user')

    # Create groups
    superadmin_group, _ = Group.objects.get_or_create(name='superadmin')
    admin_group, _ = Group.objects.get_or_create(name='admin')
    user_group, _ = Group.objects.get_or_create(name='user')

    # Assign permissions to admin group
    add_perm = Permission.objects.get(codename='add_user', content_type=user_ct)
    change_perm = Permission.objects.get(codename='change_user', content_type=user_ct)
    view_perm = Permission.objects.get(codename='view_user', content_type=user_ct)

    admin_group.permissions.add(add_perm, change_perm, view_perm)

def reverse_create_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=['superadmin', 'admin', 'user']).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
        ('contenttypes', '__latest__'),
    ]
    operations = [
        migrations.RunPython(create_default_groups, reverse_create_groups),
    ]
```
3. Run: `python manage.py migrate`

**Files**: `src/accounts/migrations/0002_create_groups.py`

---

### T012 – Add role helper properties to User model

**Steps**:
Add to `src/accounts/models.py` User class (already exist from WP01, verify they work):
```python
@property
def is_superadmin(self) -> bool:
    return self.is_superuser

@property
def is_admin(self) -> bool:
    return self.groups.filter(name='admin').exists()

@property
def is_regular_user(self) -> bool:
    return self.groups.filter(name='user').exists() and not self.is_admin and not self.is_superadmin
```

**Files**: `src/accounts/models.py` (verify/update)

---

### T013 – Create post-save signal for auto role assignment

**Steps**:
1. Edit `src/accounts/signals.py`:
```python
from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User

@receiver(post_save, sender=User)
def assign_default_group(sender, instance, created, **kwargs):
    """Automatically assign 'user' group to newly created users."""
    if created and not instance.is_superuser:
        user_group, _ = Group.objects.get_or_create(name='user')
        instance.groups.add(user_group)
```

**Files**: `src/accounts/signals.py`

---

### T014 – Register signal in apps.py

**Steps**:
Edit `src/accounts/apps.py`:
```python
from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        import accounts.signals  # noqa: F401
```

**Files**: `src/accounts/apps.py`

---

### T015 [P] – Create DRF permission classes

**Steps**:
Create `src/accounts/permissions.py`:
```python
from rest_framework import permissions

class IsSuperadmin(permissions.BasePermission):
    """Permission class for superadmin-only access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class IsAdmin(permissions.BasePermission):
    """Permission class for admin or superadmin access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_superuser or request.user.groups.filter(name='admin').exists()
        )

class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow admins to modify, but allow authenticated users to read."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and (
            request.user.is_superuser or request.user.groups.filter(name='admin').exists()
        )
```

**Files**: `src/accounts/permissions.py` (CREATE)

---

## Test Strategy

**Manual Verification**:
```python
python manage.py shell
from accounts.models import User
from django.contrib.auth.models import Group

# Create user and verify auto-assignment
user = User.objects.create_user(email='test@example.com', password='Test123!@#')
print(user.groups.all())  # Should show 'user' group
print(user.is_regular_user)  # Should be True
print(user.is_admin)  # Should be False

# Check groups exist
print(Group.objects.filter(name__in=['superadmin', 'admin', 'user']).count())  # Should be 3
```

## Definition of Done

- [ ] Groups migration runs successfully
- [ ] Three groups exist in database
- [ ] Admin group has correct permissions
- [ ] Role properties work correctly
- [ ] Signal auto-assigns 'user' group
- [ ] Permission classes created
- [ ] Signal registered in apps.py

**Dependencies**: WP01
**Estimated Effort**: 2-3 hours

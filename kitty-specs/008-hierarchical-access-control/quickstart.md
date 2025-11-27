# Quickstart: Hierarchical Access Control System
*Path: kitty-specs/008-hierarchical-access-control/quickstart.md*

**Feature**: 008-hierarchical-access-control
**Date**: 2025-11-25

## Prerequisites

- Python 3.12+
- Django 5.1+ installed and configured
- PostgreSQL database running
- Redis server running (for caching)
- Existing Django apps: `accounts`, `organisations`, `projects`

## Installation

### 1. Add to INSTALLED_APPS

```python
# src/config/settings/base.py
INSTALLED_APPS = [
    # ... existing apps
    'permissions',  # NEW: Add hierarchical access control
]
```

### 2. Configure Redis Cache

```python
# src/config/settings/base.py (if not already configured from B06)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_core',
        'TIMEOUT': 300,  # 5 minutes default TTL
    }
}

# Permission-specific settings
PERMISSIONS_CACHE_TTL = 300  # 5 minutes
PERMISSIONS_AUDIT_BACKEND = 'permissions.audit.DjangoLoggingBackend'  # or B09Backend when available
```

### 3. Run Migrations

```bash
cd src
python manage.py migrate permissions
```

This creates the `permissions_role`, `permissions_permission`, and `permissions_roleassignment` tables and seeds 7 default roles.

### 4. Warm Permission Cache (Optional)

```bash
python manage.py warm_permission_cache
```

Pre-warms global roles and superuser assignments for faster first-request performance.

---

## Basic Usage

### Check Permissions in Django Views

```python
from django.http import JsonResponse
from django.views import View
from permissions.evaluator import check_permission

class DeleteProjectView(View):
    def delete(self, request, project_id):
        # Check if user has permission
        if not check_permission(request.user, 'projects.delete', resource_id=project_id, resource_type='project'):
            return JsonResponse({'error': 'Permission denied'}, status=403)

        # Proceed with deletion
        project = Project.objects.get(id=project_id)
        project.delete()
        return JsonResponse({'success': True})
```

### Check Permissions in DRF ViewSets

```python
from rest_framework import viewsets
from permissions.api.permissions import HasPermission

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [HasPermission('projects.view')]

    def get_permissions(self):
        """Override permissions per action"""
        if self.action == 'destroy':
            return [HasPermission('projects.delete')()]
        elif self.action in ['update', 'partial_update']:
            return [HasPermission('projects.update')()]
        return super().get_permissions()
```

### Assign Roles Programmatically

```python
from permissions.models import Role, RoleAssignment
from accounts.models import User
from organisations.models import Organisation

# Get user and organization
user = User.objects.get(email='alice@example.com')
org = Organisation.objects.get(slug='acme-corp')

# Get role
org_admin_role = Role.objects.get(name='Organization Admin', scope='organization')

# Assign role at organization scope
assignment = RoleAssignment.objects.create(
    user=user,
    role=org_admin_role,
    scope='organization',
    target_organization=org,
    assigned_by=request.user  # Current user assigning the role
)
# Note: If user already has a role at this scope+org, it will be replaced automatically (unique constraint)
```

### Check Multiple Permissions (Batch)

```python
from permissions.evaluator import check_permissions_batch

# Check multiple permissions in one call
permissions_to_check = [
    ('projects.view', project.id, 'project'),
    ('projects.update', project.id, 'project'),
    ('projects.delete', project.id, 'project'),
]

results = check_permissions_batch(request.user, permissions_to_check)
# Returns: {'projects.view': True, 'projects.update': True, 'projects.delete': False}
```

---

## Extending with Custom Permissions

### Register Custom Permissions

```python
# In your custom Django app: reports/apps.py
from django.apps import AppConfig
from permissions.registry import permission_registry

class ReportsConfig(AppConfig):
    name = 'reports'

    def ready(self):
        # Register custom permissions
        permission_registry.register(
            'reports.generate',
            resource_type='report',
            description='Generate new reports',
            is_sensitive=False
        )
        permission_registry.register(
            'reports.delete',
            resource_type='report',
            description='Delete existing reports',
            is_sensitive=True  # Mark as sensitive for audit logging
        )
```

### Create Custom Roles

```python
from permissions.models import Role, Permission

# Create custom role
analyst_role = Role.objects.create(
    name='Data Analyst',
    scope='organization',
    description='Can view and generate reports'
)

# Assign permissions to role
view_perm = Permission.objects.get(permission='reports.view')
generate_perm = Permission.objects.get(permission='reports.generate')
analyst_role.permissions.add(view_perm, generate_perm)
```

---

## Admin Interface Usage

### Manage Roles

1. Navigate to Django admin: `/admin/permissions/role/`
2. Create new role: Set name, scope, description
3. Assign permissions: Select permissions from available list (ManyToMany widget)
4. Save role

### Assign Roles to Users

1. Navigate to: `/admin/permissions/roleassignment/`
2. Create new assignment:
   - Select user
   - Select role
   - Set scope (global/organization/project)
   - Select target organization or project (if applicable)
3. Save assignment
4. System automatically invalidates cache for that user

### Mark Permissions as Sensitive

1. Navigate to: `/admin/permissions/permission/`
2. Find permission (e.g., `projects.delete`)
3. Check "Is sensitive" checkbox
4. Save
5. All future checks for this permission will emit audit logs

---

## API Endpoints

### List Roles

```http
GET /api/permissions/roles/
Authorization: Token <your-token>
```

Response:
```json
[
    {
        "id": "role-123",
        "name": "Organization Admin",
        "scope": "organization",
        "description": "Full administrative access to organization",
        "permissions": ["org.invite_users", "org.manage_settings", "projects.create"]
    }
]
```

### Assign Role

```http
POST /api/permissions/role-assignments/
Authorization: Token <your-token>
Content-Type: application/json

{
    "user_id": "user-456",
    "role_id": "role-123",
    "scope": "organization",
    "target_organization_id": "org-789"
}
```

Response (201 Created):
```json
{
    "id": "assignment-001",
    "user_id": "user-456",
    "role_id": "role-123",
    "scope": "organization",
    "target_organization_id": "org-789",
    "assigned_by_id": "user-111",
    "assigned_at": "2025-11-25T10:30:00Z"
}
```

### Remove Role Assignment

```http
DELETE /api/permissions/role-assignments/<assignment-id>/
Authorization: Token <your-token>
```

Response (204 No Content)

---

## Testing

### Run Tests

```bash
# Run all permission tests
pytest tests/permissions/

# Run specific test file
pytest tests/permissions/test_evaluator.py

# Run with coverage
pytest tests/permissions/ --cov=src/permissions --cov-report=html
```

### Test Permission Evaluation

```python
# In your test file
import pytest
from permissions.models import Role, RoleAssignment, Permission
from permissions.evaluator import check_permission

@pytest.mark.django_db
def test_project_admin_can_delete_project(user, project, project_admin_role):
    # Assign Project Admin role
    RoleAssignment.objects.create(
        user=user,
        role=project_admin_role,
        scope='project',
        target_project=project,
        assigned_by=user
    )

    # Check permission
    assert check_permission(user, 'projects.delete', resource_id=project.id, resource_type='project')
```

---

## Performance Monitoring

### Check Cache Hit Rate

```python
from django.core.cache import cache
from django_prometheus.models import ExportModelOperationsMixin

# Cache stats available via Prometheus metrics
# Metric: django_cache_get_hits_total
# Metric: django_cache_get_misses_total
# Target: >90% hit rate
```

### Monitor Permission Check Latency

```python
# Latency tracked via django-prometheus
# Metric: permissions_check_duration_seconds
# Target: p95 < 0.002s (2ms)
```

---

## Troubleshooting

### Permission Check Always Returns False

**Symptoms**: User should have permission but check returns False

**Diagnosis**:
1. Check role assignment exists:
   ```python
   RoleAssignment.objects.filter(user=user)
   ```
2. Check role has required permission:
   ```python
   role.permissions.filter(permission='projects.delete').exists()
   ```
3. Check scope is correct (global/org/project)
4. Clear cache manually:
   ```python
   from django.core.cache import cache
   cache.delete_pattern('perms:user-123:*')
   ```

### Cache Not Invalidating

**Symptoms**: Role removed but user still has access for >5 minutes

**Diagnosis**:
1. Check Redis is running: `redis-cli ping` (should return PONG)
2. Check Django signals are firing:
   ```python
   # In permissions/signals.py, add logging
   logger.info(f"Invalidating cache for user {instance.user_id}")
   ```
3. Check cache TTL setting: `PERMISSIONS_CACHE_TTL` in settings

### N+1 Query Problem

**Symptoms**: Permission checks cause many database queries

**Diagnosis**:
1. Enable Django Debug Toolbar
2. Check for missing `select_related` or `prefetch_related`
3. Ensure indexes exist:
   ```sql
   \d permissions_roleassignment  -- PostgreSQL
   ```
4. Use batch permission checks instead of individual checks in loops

---

## Best Practices

### 1. Use Batch Checks in Loops

❌ Bad:
```python
for project in projects:
    if check_permission(user, 'projects.view', resource_id=project.id, resource_type='project'):
        # ... N separate permission checks
```

✅ Good:
```python
checks = [(f'projects.view', p.id, 'project') for p in projects]
results = check_permissions_batch(user, checks)
for project in projects:
    if results[f'projects.view_{project.id}']:
        # ... 1 batch check
```

### 2. Cache Permission Results in Request

```python
# Store in request object to avoid duplicate checks
def check_cached(request, permission, resource_id=None, resource_type=None):
    cache_key = f'perm_{permission}_{resource_id}'
    if not hasattr(request, '_perm_cache'):
        request._perm_cache = {}

    if cache_key not in request._perm_cache:
        request._perm_cache[cache_key] = check_permission(
            request.user, permission, resource_id, resource_type
        )
    return request._perm_cache[cache_key]
```

### 3. Limit Role Assignments

Keep role assignments minimal (1 global + 1 org + 1 project per user maximum). More assignments = slower evaluation and higher cache memory usage.

### 4. Mark Sensitive Permissions Explicitly

Only mark truly sensitive operations (delete, assign_role) as sensitive to avoid audit log volume explosion.

### 5. Pre-warm Cache on Deployment

Add to deployment script:
```bash
python manage.py warm_permission_cache
```

Reduces first-request latency after deployment.

---

## Migration from Django's Built-in Permissions

If migrating from Django's `auth.Permission` system:

1. **Map existing permissions** to new format:
   - Django: `app_label.permission_codename` (e.g., `projects.add_project`)
   - New system: `resource.action` (e.g., `projects.create`)

2. **Migrate user permissions to roles**:
   ```python
   from django.contrib.auth.models import Permission as DjangoPermission
   from permissions.models import Role, RoleAssignment

   for user in User.objects.all():
       if user.has_perm('projects.add_project'):
           # Assign Project Member role
           role = Role.objects.get(name='Project Member', scope='organization')
           RoleAssignment.objects.create(user=user, role=role, scope='organization', ...)
   ```

3. **Update permission checks** in code:
   - Replace `user.has_perm('projects.add_project')`
   - With `check_permission(user, 'projects.create', ...)`

4. **Remove Django permission checks** from `ModelAdmin.has_*_permission()` methods

---

## Next Steps

- Review [data-model.md](data-model.md) for detailed entity relationships
- Review [research.md](research.md) for architecture decisions
- Implement custom permissions for your Django apps
- Configure audit logging when B09 is available
- Set up monitoring dashboards for cache hit rate and latency

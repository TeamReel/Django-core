# Permissions Module

Hierarchical role-based access control (RBAC) for Django Core-App.

## Overview

The `permissions` module implements a hierarchical RBAC system with three scope levels: global, organization, and project. Permissions flow down the hierarchy, enabling flexible access control patterns.

**App location**: `src/permissions/`
**Feature spec**: `kitty-specs/008-hierarchical-access-control/`
**ADR**: [ADR-002: Role-Based Access Control](../architecture/adr/index.md#security--authentication)

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'permissions.apps.PermissionsConfig',
    ...
]

# Cache for permission checks
CACHES = {
    'permissions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/3',
        'TIMEOUT': 300,  # 5 minutes
    }
}
```

## Models

### Permission

Individual capability definition.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `permission` | CharField | String format: `resource.action` |
| `resource_type` | CharField | Resource category |
| `description` | TextField | Human-readable explanation |
| `is_sensitive` | BooleanField | Triggers audit logging |

**Format**: `{resource_type}.{action}` (e.g., `projects.delete`, `org.invite_users`)

### Role

Named collection of permissions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `name` | CharField | Display name |
| `description` | TextField | Role explanation |
| `scope` | CharField | global/organization/project |
| `permissions` | ManyToMany | Permissions granted |

**Scopes**:
- `global` - System-wide access
- `organization` - Organization-level access
- `project` - Project-level access

### RoleAssignment

Links users to roles at specific scopes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `user` | ForeignKey | User receiving role |
| `role` | ForeignKey | Role being assigned |
| `scope` | CharField | Assignment scope |
| `target_organization` | ForeignKey | For org scope |
| `target_project` | ForeignKey | For project scope |
| `assigned_by` | ForeignKey | Who assigned |
| `assigned_at` | DateTimeField | Assignment time |

**Constraints**: One role per user per scope level.

## API Endpoints

### Permissions

```http
# List all permissions
GET /api/v1/permissions/

# Get permission details
GET /api/v1/permissions/{id}/
```

### Roles

```http
# List roles (filtered by scope)
GET /api/v1/roles/?scope=organization

# Create role
POST /api/v1/roles/
{
  "name": "Project Admin",
  "scope": "project",
  "permissions": ["uuid1", "uuid2"]
}

# Update role
PATCH /api/v1/roles/{id}/
```

### Role Assignments

```http
# List user's assignments
GET /api/v1/users/{id}/roles/

# Assign role
POST /api/v1/users/{id}/roles/
{
  "role_id": "uuid",
  "scope": "organization",
  "target_organization_id": "uuid"
}

# Revoke role
DELETE /api/v1/role-assignments/{id}/
```

## Permission Hierarchy

```
Global Role
    ├── Applies to all organizations
    │
    └── Organization Role
            ├── Applies to all projects in org
            │
            └── Project Role
                    └── Applies to specific project
```

### Inheritance

Permissions flow downward:
- Global admin can access all organizations
- Org admin can access all projects in that org
- Project member can only access that project

## Usage Examples

### Creating Permissions

```python
from permissions.models import Permission

# Create a permission
perm = Permission.objects.create(
    permission='projects.delete',
    resource_type='project',
    description='Can delete projects',
    is_sensitive=True,  # Triggers audit
)
```

### Creating Roles

```python
from permissions.models import Role, ScopeChoices

# Create organization admin role
role = Role.objects.create(
    name='Organization Admin',
    scope=ScopeChoices.ORGANIZATION,
    description='Full access to organization resources',
)
role.permissions.add(perm1, perm2, perm3)
```

### Assigning Roles

```python
from permissions.models import RoleAssignment, ScopeChoices

# Assign role to user for specific org
assignment = RoleAssignment.objects.create(
    user=user,
    role=role,
    scope=ScopeChoices.ORGANIZATION,
    target_organization=org,
    assigned_by=admin_user,
)
```

### Checking Permissions

```python
from permissions.evaluator import PermissionEvaluator

evaluator = PermissionEvaluator()

# Check if user can delete project
can_delete = evaluator.check_permission(
    user=request.user,
    permission='projects.delete',
    resource=project,
)

# Check with explicit scope
can_invite = evaluator.check_permission(
    user=request.user,
    permission='org.invite_users',
    organization=org,
)
```

### Permission Decorator

```python
from permissions.decorators import require_permission

@require_permission('projects.edit')
def edit_project(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    # Permission already checked
    ...
```

### DRF Permission Class

```python
from permissions.api.permissions import HasPermission

class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'projects.view'
```

## Permission Evaluator

The evaluator handles hierarchical permission checks:

```python
class PermissionEvaluator:
    def check_permission(self, user, permission, resource=None,
                         organization=None, project=None):
        """
        Check permission with hierarchy:
        1. Check cache
        2. Check superuser
        3. Check global role
        4. Check organization role
        5. Check project role
        """
```

### Caching

```python
# Cache key format
cache_key = f"perm:{user_id}:{permission}:{scope}:{target_id}"

# Cache invalidation on role change
def invalidate_user_permissions(user_id):
    cache = caches['permissions']
    cache.delete_pattern(f"perm:{user_id}:*")
```

## Audit Integration

Role assignments automatically log to audit system:

```python
# Events logged:
# - role.assigned: New role assignment
# - role.revoked: Role removal

# Revoke with reason
assignment.delete(
    revoked_by=admin_user,
    reason="Project completed"
)
```

## Built-in Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| System Admin | Global | All permissions |
| Org Admin | Organization | Org and project management |
| Org Member | Organization | Read-only org access |
| Project Admin | Project | Full project access |
| Project Member | Project | Contribute to project |
| Project Viewer | Project | Read-only project access |

## Related Features

- [Accounts](./accounts.md) - User authentication
- [Organisations](./organisations.md) - Organization scoping
- [Projects](./projects.md) - Project scoping
- [Audit](./audit.md) - Permission audit logging
- [Security Model](../architecture/security-model.md) - Overall security

# B08: Hierarchical Access Control System

Role-based access control with three scope levels (Global, Organization, Project) and additive inheritance.

## Overview

B08 provides centralized permission evaluation with audit logging integration. All permission checks must go through the `evaluate_permission()` function to ensure consistent ACL enforcement and comprehensive audit trails.

### Key Components

- **Permission Model**: Stores permission codes (e.g., `organization.view`, `project.edit`)
- **Role Model**: Groups permissions into reusable roles
- **RoleAssignment Model**: Links users to roles with scope (GLOBAL, ORGANIZATION, PROJECT)
- **Centralized Evaluator**: `evaluate_permission()` function in `permissions/audit.py`

## Quick Start

### Centralized Permission Evaluator (Recommended)

**All permission checks MUST go through `evaluate_permission()`** for audit logging and security:

```python
from permissions.audit import evaluate_permission
from rest_framework.exceptions import PermissionDenied

# In your view or service function
def my_view_logic(request, organization_id):
    # Check permission before accessing sensitive data
    granted = evaluate_permission(
        user=request.user,
        permission='organization.view_balance',
        context={'scope': 'ORGANIZATION', 'organization_id': organization_id}
    )

    if not granted:
        # Permission denied - automatically logged to B09 audit
        raise PermissionDenied({
            'error': 'forbidden',
            'permission': 'organization.view_balance',
            'detail': 'You do not have permission to view this organization\'s balance'
        })

    # Permission granted - proceed with business logic
    organization = Organization.objects.get(id=organization_id)
    balance = organization.get_balance()
    return balance
```

**Parameters**:
- `user`: Django User instance (from `request.user`)
- `permission`: Permission code string (e.g., `"organization.view_balance"`)
- `context`: Dict with `{scope, organization_id?, project_id?, request_id?}`

**Return Value**:
- `True` if permission granted
- `False` if permission denied
- **Side Effect**: Emits B09 audit event (or logs to Django if B09 unavailable)

### DRF Permission Classes (Preferred for API Views)

For Django REST Framework views, use permission classes that internally call `evaluate_permission()`:

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = 'organization.view_balance'  # Custom attribute

    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, pk=organization_id)

        # Permission already checked by HasOrganizationPermission
        # (calls evaluate_permission() internally with audit logging)
        balance = organization.get_balance()

        return Response({'balance': balance})
```

**Available Permission Classes**:
- `HasOrganizationPermission`: Checks org-scoped permission
- `HasProjectPermission`: Checks project-scoped permission
- `HasGlobalPermission`: Checks global-scoped permission

### Low-Level Permission Checks (Legacy - Use evaluate_permission() Instead)

**Note**: Direct calls to `check_permission()` do NOT emit audit events. Use `evaluate_permission()` for production code.

```python
from permissions.evaluator import check_permission

# Check if user has permission (any scope)
has_access = check_permission(
    user_id=user.id,
    permission="projects.view"
)

# Check permission on specific project
can_delete = check_permission(
    user_id=user.id,
    permission="projects.delete",
    target_id=project.id,
    target_type="project"
)

# Check permission within organization scope
can_create = check_permission(
    user_id=user.id,
    permission="projects.create",
    target_id=org.id,
    target_type="organization"
)
```

### Batch Permission Checks

```python
from permissions.evaluator import check_permissions_batch

# Check multiple permissions at once (efficient with caching)
results = check_permissions_batch(
    user_id=user.id,
    permissions=["projects.view", "projects.update", "projects.delete"],
    target_id=project.id,
    target_type="project"
)
# Returns: {"projects.view": True, "projects.update": True, "projects.delete": False}
```

### Role Assignments

```python
from permissions.models import Role, RoleAssignment
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username="alice")

# Get or create a role
admin_role = Role.objects.get(name="Admin", scope=Role.GLOBAL)

# Assign role at global scope
RoleAssignment.objects.create(
    user=user,
    role=admin_role,
    scope=RoleAssignment.GLOBAL,
    assigned_by=current_user
)

# Assign role at organization scope
RoleAssignment.objects.create(
    user=user,
    role=org_admin_role,
    scope=RoleAssignment.ORGANIZATION,
    target_organization=org,
    assigned_by=current_user
)

# Assign role at project scope
RoleAssignment.objects.create(
    user=user,
    role=contributor_role,
    scope=RoleAssignment.PROJECT,
    target_project=project,
    assigned_by=current_user
)
```

## Architecture

### Three-Level Scope Hierarchy

The permissions system uses a hierarchical scope model:

```
Global (System-wide)
  └── Organization (Tenant/Company)
        └── Project (Workspace/Team)
```

**Scope Levels**:
- **Global**: System-wide permissions (e.g., create organizations, system administration)
- **Organization**: Tenant-level permissions (e.g., manage organization members, billing)
- **Project**: Workspace permissions (e.g., create tasks, manage project settings)

### Additive Inheritance

Permissions are **additive (union-based)** across scopes:

- **Global permissions** apply everywhere
- **Organization permissions** apply within that organization and all its projects
- **Project permissions** apply only within that specific project

**Example**: If a user has:
- `projects.view` at the **global** level → Can view all projects across all organizations
- `projects.update` at the **organization** level → Can update all projects in that organization
- `projects.delete` at the **project** level → Can delete only that specific project

**Key Principle**: A user's effective permissions are the **union** of all their role assignments across all scopes. This allows flexible delegation where project leads can grant additional permissions that org admins might not have assigned.

### Permission Evaluation Logic

```python
# Pseudocode for permission evaluation
def check_permission(user_id, permission, target_id, target_type):
    # 1. Check global assignments
    if has_global_assignment(user_id, permission):
        return True

    # 2. Check organization assignments (if target is org or project)
    if target_type in ["organization", "project"]:
        org_id = get_organization_id(target_id, target_type)
        if has_org_assignment(user_id, permission, org_id):
            return True

    # 3. Check project assignments (if target is project)
    if target_type == "project":
        if has_project_assignment(user_id, permission, target_id):
            return True

    # 4. Deny by default (fail-closed)
    return False
```

### Caching Strategy

The system uses **Redis caching** for performance:

- **Cache key format**: `perm:{user_id}:{permission}:{target_type}:{target_id}`
- **TTL**: Configurable (default 300 seconds)
- **Invalidation**: Automatic on role assignment changes via Django signals

**Cache warming** (optional):
```bash
python manage.py warm_permission_cache
```

### Audit Logging

All permission checks and role changes are logged:

```python
# Automatic audit trails for:
# - Permission checks (success/failure)
# - Role assignments/removals
# - Permission grants/revocations

# Audit data includes:
# - Timestamp, user, action, resource
# - IP address, user agent
# - Success/failure status
# - Additional context (target IDs, permissions)
```

## Configuration

### Settings

```python
# settings.py

# Permission caching (requires Redis)
PERMISSIONS_CACHE_ENABLED = True  # Default: True
PERMISSIONS_CACHE_TTL = 300  # Seconds (default: 5 minutes)

# Audit logging backends
PERMISSIONS_AUDIT_BACKENDS = [
    "permissions.audit.backends.DatabaseBackend",  # Default
    "permissions.audit.backends.LoggingBackend",  # Optional
]

# Rate limiting (requires Redis)
PERMISSIONS_RATE_LIMIT = "100/hour"  # Default: 100 checks per hour per user
```

### Seed Default Roles

The system includes pre-configured roles:

```bash
# Create default roles (Global Admin, Org Admin, Org Member, Project Admin, etc.)
python manage.py seed_default_roles
```

**Default Roles**:
- **Global Admin** (global scope): Full system access
- **Org Admin** (organization scope): Manage organization and projects
- **Org Member** (organization scope): View organization, basic project access
- **Project Admin** (project scope): Full project management
- **Project Contributor** (project scope): Edit project content
- **Project Viewer** (project scope): Read-only project access

## Extension Guide

### Registering Custom Permissions

Downstream apps can extend the permissions system by registering custom permissions in their AppConfig's `ready()` method.

#### Permission Naming Convention

Permissions must follow the format: `resource_type.action`
- Use lowercase letters and underscores only
- Pattern: `^[a-z_]+\.[a-z_]+$`
- Examples: `documents.create`, `reports.export`, `billing.manage`

#### Basic Example

```python
from django.apps import AppConfig

class MyAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "myapp"

    def ready(self) -> None:
        """Register custom permissions when the app starts."""
        from permissions.registry import permission_registry

        # Register custom permissions
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="Create new documents",
            is_sensitive=False
        )

        permission_registry.register(
            permission="documents.delete",
            resource_type="documents",
            description="Delete documents",
            is_sensitive=True  # Sensitive action
        )

        permission_registry.register(
            permission="reports.export",
            resource_type="reports",
            description="Export reports to external formats",
            is_sensitive=True
        )
```

#### Complete Usage Pattern

1. **Define your AppConfig** with the `ready()` method
2. **Import the global registry** from `permissions.registry`
3. **Register each permission** with descriptive metadata
4. **Mark sensitive permissions** (deletion, financial operations, PII access)

#### Best Practices

- **Call registry in ready()**: Ensures permissions are registered when Django starts
- **Use descriptive names**: Choose clear resource types and actions
- **Mark sensitive permissions**: Set `is_sensitive=True` for audit-worthy actions
- **Group related permissions**: Use consistent resource_type prefixes
- **Document your permissions**: Provide clear descriptions for each permission

#### Validation & Error Handling

The registry validates all registrations:
- **Format validation**: Raises `ImproperlyConfigured` if format is invalid
- **Duplicate detection**: Raises `ImproperlyConfigured` if permission already registered
- **Thread safety**: All operations are protected by locks

```python
# Invalid format - raises ImproperlyConfigured
permission_registry.register(
    permission="INVALID.FORMAT",  # Must be lowercase
    resource_type="invalid",
    description="Invalid permission"
)

# Duplicate - raises ImproperlyConfigured
permission_registry.register(
    permission="documents.create",  # Already registered above
    resource_type="documents",
    description="Duplicate permission"
)
```

#### Querying Registered Permissions

```python
from permissions.registry import permission_registry

# Check if a permission is registered
if permission_registry.is_registered("documents.create"):
    print("Permission exists")

# Get permission metadata
perm = permission_registry.get("documents.create")
print(perm["description"])  # "Create new documents"
print(perm["is_sensitive"])  # False
print(perm["registered_by"])  # "myapp.apps"

# Get all permissions for a resource type
docs_perms = permission_registry.get_by_resource_type("documents")
# Returns: ["documents.create", "documents.delete"]

# Get all registered permissions
all_perms = permission_registry.all()
# Returns: List of all permission strings
```

## Troubleshooting

### Permission Checks Always Return False

**Symptoms**: `check_permission()` always returns `False` even for assigned roles.

**Possible Causes**:
1. **No role assignments**: User has roles but no active `RoleAssignment` records
   ```python
   from permissions.models import RoleAssignment
   # Check user's assignments
   assignments = RoleAssignment.objects.filter(user_id=user.id)
   print(list(assignments))  # Should show role assignments
   ```

2. **Scope mismatch**: Permission exists at wrong scope level
   ```python
   # ❌ Wrong: Checking project permission without target
   check_permission(user_id, "projects.delete")  # Returns False

   # ✅ Correct: Include target for scoped permissions
   check_permission(user_id, "projects.delete", project.id, "project")
   ```

3. **Role doesn't have permission**: Role exists but permission not granted
   ```python
   role = Role.objects.get(name="Contributor", scope=Role.PROJECT)
   print(role.permissions.filter(permission="projects.delete").exists())  # False
   ```

**Solutions**:
- Use `seed_default_roles` to ensure base roles exist
- Check `RoleAssignment` records for the user
- Verify role has the required permission in `role.permissions`
- Check scope hierarchy (global > org > project)

### Cache Not Working / Stale Results

**Symptoms**: Permission changes not reflected immediately, or cache keys not found.

**Possible Causes**:
1. **Redis not configured**: Cache requires Redis backend
   ```python
   # settings.py - Ensure Redis cache is configured
   CACHES = {
       "default": {
           "BACKEND": "django_redis.cache.RedisCache",
           "LOCATION": "redis://127.0.0.1:6379/1",
           ...
       }
   }
   ```

2. **Cache disabled**: `PERMISSIONS_CACHE_ENABLED = False` in settings
   ```python
   # settings.py
   PERMISSIONS_CACHE_ENABLED = True  # Must be True for caching
   ```

3. **Signal handlers not connected**: App not ready when signals registered
   ```python
   # Ensure PermissionsConfig.ready() is called
   # Check INSTALLED_APPS includes 'permissions'
   ```

**Solutions**:
- Install and configure Redis: `pip install django-redis`
- Set `PERMISSIONS_CACHE_ENABLED = True` in settings
- Manually invalidate cache: `from permissions.cache import invalidate_user_permissions; invalidate_user_permissions(user.id)`
- Clear all cache: `python manage.py shell -c "from django.core.cache import cache; cache.clear()"`

### Permission Format Validation Errors

**Symptoms**: `ValidationError` or `ImproperlyConfigured` when registering permissions.

**Error Messages**:
```
ImproperlyConfigured: Invalid permission format: 'PROJECTS.DELETE'
Permission must match pattern: ^[a-z_]+\.[a-z_]+$
```

**Possible Causes**:
1. **Uppercase letters**: Permissions must be lowercase
2. **Invalid characters**: Only `[a-z_]` and one `.` allowed
3. **Wrong delimiter**: Must use exactly one `.` separator

**Solutions**:
```python
# ❌ Wrong formats
"PROJECTS.DELETE"     # Uppercase not allowed
"projects-delete"     # Hyphens not allowed
"projects.delete.all" # Multiple dots not allowed
"projects delete"     # Spaces not allowed

# ✅ Correct formats
"projects.delete"
"project_templates.create"
"billing_reports.export"
```

### Role Assignment Scope Validation Errors

**Symptoms**: `ValidationError` when creating `RoleAssignment`.

**Error Messages**:
```
ValidationError: Organization scope requires target_organization to be set.
ValidationError: Role scope 'project' does not match assignment scope 'organization'.
```

**Possible Causes**:
1. **Missing target for scoped assignment**: Org/project scope requires target
2. **Role scope mismatch**: Role scope must match assignment scope
3. **Wrong target field**: Using `target_project` for org scope

**Solutions**:
```python
# ❌ Wrong: Missing target for org scope
RoleAssignment.objects.create(
    user=user,
    role=org_admin_role,  # Role.scope = ORGANIZATION
    scope=RoleAssignment.ORGANIZATION,
    # Missing: target_organization=org
)

# ✅ Correct: Include target
RoleAssignment.objects.create(
    user=user,
    role=org_admin_role,
    scope=RoleAssignment.ORGANIZATION,
    target_organization=org,  # Required for org scope
    assigned_by=current_user
)

# ❌ Wrong: Role scope doesn't match assignment scope
project_role = Role.objects.get(scope=Role.PROJECT)
RoleAssignment.objects.create(
    role=project_role,  # PROJECT scope
    scope=RoleAssignment.ORGANIZATION,  # ORGANIZATION scope - MISMATCH!
)

# ✅ Correct: Match role scope to assignment scope
RoleAssignment.objects.create(
    role=project_role,  # PROJECT scope
    scope=RoleAssignment.PROJECT,  # PROJECT scope - MATCH
    target_project=project
)
```

### Audit Logs Not Recording

**Symptoms**: No audit entries in database or logs.

**Possible Causes**:
1. **Audit backends not configured**: Default backend disabled
2. **Database backend table missing**: Migrations not run
3. **Logging backend not configured**: Logger not set up

**Solutions**:
```python
# settings.py - Ensure audit backends configured
PERMISSIONS_AUDIT_BACKENDS = [
    "permissions.audit.backends.DatabaseBackend",  # Saves to DB
    "permissions.audit.backends.LoggingBackend",   # Saves to logs
]

# Run migrations for database backend
python manage.py migrate permissions

# Check audit entries
from permissions.audit import get_audit_entries
entries = get_audit_entries(user_id=user.id, limit=10)
```

### Performance Issues / Slow Permission Checks

**Symptoms**: Permission checks taking >100ms, API responses slow.

**Possible Causes**:
1. **Cache disabled or not working**: Every check hits database
2. **Redis connection issues**: Network latency or connection failures
3. **Too many role assignments**: User has hundreds of roles
4. **N+1 queries**: Checking permissions in loops without batch checks

**Solutions**:
- **Enable caching**: Set `PERMISSIONS_CACHE_ENABLED = True` and configure Redis
- **Use batch checks**: Replace loops with `check_permissions_batch()`
  ```python
  # ❌ Slow: N queries for N permissions
  for perm in ["projects.view", "projects.update", "projects.delete"]:
      if check_permission(user.id, perm, project.id, "project"):
          allowed.append(perm)

  # ✅ Fast: 1 query (or 1 cache hit) for N permissions
  results = check_permissions_batch(
      user.id,
      ["projects.view", "projects.update", "projects.delete"],
      project.id,
      "project"
  )
  ```
- **Warm cache**: Run `python manage.py warm_permission_cache` periodically
- **Optimize role structure**: Avoid assigning hundreds of roles to single users
- **Use select_related/prefetch_related**: When querying roles manually

### Development Without Redis

**Symptoms**: Want to develop locally without Redis infrastructure.

**Solution**: Disable caching for local development
```python
# settings/local.py
PERMISSIONS_CACHE_ENABLED = False  # Disables Redis requirement
```

**Trade-offs**:
- ✅ No Redis dependency for local dev
- ✅ All tests still pass (cache gracefully degrades)
- ❌ Permission checks slower (hits database every time)
- ❌ Can't test cache warming or batch performance

---

## Audit Logging Integration

The permissions system automatically logs all permission checks and role changes to the audit system (B09).

### Logged Events

#### permission.checked

**Logged by**: `check_permission()` function in `permissions/evaluator.py`

**When**: Every permission check (allowed or denied)

**Metadata**:
- `permission` (str): Permission name (e.g., 'projects.create')
- `result` (str): 'allowed' or 'denied'
- `resource_type` (str): Type of resource checked ('project', 'organisation', 'generic')
- `resource_id` (str, optional): UUID of resource checked

**Example**:
```python
from permissions.evaluator import check_permission

# Check permission
check_permission(
    user.id,
    'projects.create',
    resource_id=org.id,
    resource_type='organisation'
)

# Audit event automatically created:
# {
#   "event_type": "permission.checked",
#   "user": User(email="user@example.com"),
#   "organization": Organisation(name="Acme Corp"),
#   "project": None,
#   "metadata": {
#     "permission": "projects.create",
#     "result": "allowed",  # or "denied"
#     "resource_type": "organisation",
#     "resource_id": "uuid-here"
#   }
# }
```

#### role.assigned

**Logged by**: `RoleAssignment.save()` method (on creation only)

**When**: New role assignment created

**Metadata**:
- `role_name` (str): Name of role assigned (e.g., 'Admin')
- `role_id` (str): UUID of role
- `target_user_id` (str): UUID of user receiving role
- `target_user_email` (str): Email of user receiving role
- `scope` (str): Assignment scope ('global', 'organization', 'project')

**Example**:
```python
from permissions.models import RoleAssignment

# Assign role
RoleAssignment.objects.create(
    role=admin_role,
    user=target_user,
    scope='organization',
    target_organization=org,
    assigned_by=current_admin
)

# Audit event automatically created:
# {
#   "event_type": "role.assigned",
#   "user": User(current_admin),  # Who assigned the role
#   "organization": Organisation(org),
#   "project": None,
#   "metadata": {
#     "role_name": "Admin",
#     "role_id": "uuid-here",
#     "target_user_id": "uuid-here",
#     "target_user_email": "user@example.com",
#     "scope": "organization"
#   }
# }
```

**Note**: Updates to existing role assignments (re-saving) do NOT log duplicate events.

#### role.revoked

**Logged by**: `RoleAssignment.delete()` method

**When**: Role assignment deleted

**Metadata**:
- `role_name` (str): Name of role revoked
- `role_id` (str): UUID of role
- `target_user_id` (str): UUID of user losing role
- `target_user_email` (str): Email of user losing role
- `reason` (str): Reason for revocation (default: 'Not specified')

**Example**:
```python
# Revoke role with reason
assignment = RoleAssignment.objects.get(...)
assignment.delete(
    revoked_by=admin_user,
    reason='User left organization'
)

# Audit event automatically created:
# {
#   "event_type": "role.revoked",
#   "user": User(admin_user),  # Who revoked the role
#   "organization": Organisation(org),
#   "project": None,
#   "metadata": {
#     "role_name": "Admin",
#     "role_id": "uuid-here",
#     "target_user_id": "uuid-here",
#     "target_user_email": "user@example.com",
#     "reason": "User left organization"
#   }
# }
```

### Graceful Degradation

Audit logging failures **never break** permission checks or role operations:

- If audit system is unavailable (not installed or import fails), B08 operations proceed normally
- If audit event recording fails (database error, validation error), exception is caught and logged as warning
- Permission checks and role changes are never blocked by audit failures

**Example**: Running without audit system installed
```python
# Audit system not installed - no problem!
check_permission(user.id, 'projects.create')  # ✅ Works
RoleAssignment.objects.create(...)  # ✅ Works

# Warnings logged for ops team, but functionality unaffected
```

### Querying Audit Events

See permission check history in Django admin:

1. Navigate to **Audit** → **Audit Events**
2. Filter by event type: `permission.checked`, `role.assigned`, `role.revoked`
3. Search by user email, organization name, or permission string
4. View metadata JSON for full context

**Programmatic queries**:
```python
from audit.models import AuditEvent

# Get all permission checks for user
events = AuditEvent.objects.filter(
    user=user,
    event_type='permission.checked'
).order_by('-created_at')

# Get all denied permissions
denied = AuditEvent.objects.filter(
    event_type='permission.checked',
    metadata__result='denied'
)

# Get recent role changes
role_changes = AuditEvent.objects.filter(
    event_type__in=['role.assigned', 'role.revoked']
).order_by('-created_at')[:100]
```

### Testing

See `tests/audit/test_b08_integration.py` for comprehensive integration test examples.

**Run B08 integration tests**:
```bash
pytest tests/audit/test_b08_integration.py -v
```

**Test coverage**:
- Permission check logging (allowed/denied)
- Role assignment logging (create only, not updates)
- Role revocation logging (with/without reason)
- Graceful degradation (audit unavailable, failures handled)

---
work_package_id: "WP07"
subtasks:
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
title: "Registry & AppConfig"
phase: "Phase 6 - Extensibility"
lane: "for_review"
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

# Work Package Prompt: WP07 – Registry & AppConfig

## Objectives & Success Criteria

**Primary Goal**: Provide stable extension point for downstream apps to register custom permissions via AppConfig.ready() hook, enabling modular permission definitions without core code changes.

**Success Criteria**:
1. PermissionsConfig with ready() hook initializes registry
2. Permission registry validates format and prevents duplicates
3. Base permissions registered in ready() hook
4. Downstream apps can register custom permissions
5. Documentation shows extension pattern
6. Registry thread-safe for concurrent registration

---

## Context & Constraints

**Dependencies**:
- WP02 (registry.py must exist)
- Django AppConfig lifecycle

**Technical Requirements**:
- Thread-safe registration (multiple apps may register concurrently)
- Format validation: `^[a-z_]+\.[a-z_]+$`
- Duplicate detection
- Clear error messages

**Constitutional Alignment**:
- Principle II (Modularity): Stable extension point for downstream apps
- Principle XI (Documentation): Clear extension guide

---

## Detailed Implementation Guidance

### T057-T059: Create AppConfig with ready() hook

**File**: `src/permissions/apps.py`

**Implementation**:
```python
from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured


class PermissionsConfig(AppConfig):
    """Configuration for hierarchical access control app"""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'permissions'
    verbose_name = 'Hierarchical Access Control'

    def ready(self) -> None:
        """
        Initialize permission registry when app is ready.

        Called once during Django startup. Registers base permissions
        for accounts, organisations, projects, and permissions resources.
        """
        from .registry import permission_registry

        # Import signals to connect handlers
        from . import signals  # noqa: F401

        # Register base permissions
        self._register_base_permissions()

    def _register_base_permissions(self) -> None:
        """Register core permissions for existing Django apps"""
        from .registry import permission_registry

        # Organization permissions (B06)
        permission_registry.register('org.invite_users', 'organisation', is_sensitive=False)
        permission_registry.register('org.remove_users', 'organisation', is_sensitive=True)
        permission_registry.register('org.manage_settings', 'organisation', is_sensitive=False)
        permission_registry.register('org.view_members', 'organisation', is_sensitive=False)
        permission_registry.register('org.assign_roles', 'organisation', is_sensitive=True)
        permission_registry.register('org.delete', 'organisation', is_sensitive=True)

        # Project permissions (B07)
        permission_registry.register('projects.create', 'project', is_sensitive=False)
        permission_registry.register('projects.view', 'project', is_sensitive=False)
        permission_registry.register('projects.update', 'project', is_sensitive=False)
        permission_registry.register('projects.delete', 'project', is_sensitive=True)
        permission_registry.register('projects.archive', 'project', is_sensitive=False)
        permission_registry.register('projects.assign_roles', 'project', is_sensitive=True)

        # Permission management (self)
        permission_registry.register('permissions.create_role', 'role', is_sensitive=False)
        permission_registry.register('permissions.modify_role', 'role', is_sensitive=True)
        permission_registry.register('permissions.delete_role', 'role', is_sensitive=True)
        permission_registry.register('permissions.assign_role', 'role_assignment', is_sensitive=True)
        permission_registry.register('permissions.view_roles', 'role', is_sensitive=False)
```

**Update** `src/permissions/__init__.py`:
```python
default_app_config = 'permissions.apps.PermissionsConfig'
```

---

### T060-T062: Add registry validation

**File**: `src/permissions/registry.py` (update existing)

**Implementation**:
```python
import re
import threading
from typing import Set, Dict
from django.core.exceptions import ImproperlyConfigured
import logging

logger = logging.getLogger(__name__)


class PermissionRegistry:
    """
    Thread-safe registry for custom permissions.

    Downstream Django apps can register permissions in AppConfig.ready():

    Example:
        from permissions.registry import permission_registry

        class ReportsConfig(AppConfig):
            def ready(self):
                permission_registry.register('reports.generate', 'report')
                permission_registry.register('reports.delete', 'report', is_sensitive=True)
    """

    def __init__(self):
        self._permissions: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def register(
        self,
        permission: str,
        resource_type: str,
        is_sensitive: bool = False,
        description: str = ""
    ) -> None:
        """
        Register a custom permission.

        Args:
            permission: Permission string in format 'resource.action' (e.g., 'reports.generate')
            resource_type: Resource category (e.g., 'report')
            is_sensitive: Whether this permission triggers audit logging
            description: Human-readable explanation (optional)

        Raises:
            ImproperlyConfigured: If permission format invalid or already registered
        """
        with self._lock:
            # Validate format
            if not self._validate_format(permission):
                raise ImproperlyConfigured(
                    f"Permission '{permission}' must match format 'resource.action' "
                    f"(lowercase letters and underscores only, single dot)"
                )

            # Check for duplicates
            if permission in self._permissions:
                raise ImproperlyConfigured(
                    f"Permission '{permission}' already registered by {self._permissions[permission]['app']}"
                )

            # Register permission
            import inspect
            caller_frame = inspect.currentframe().f_back.f_back
            caller_module = caller_frame.f_globals.get('__name__', 'unknown')

            self._permissions[permission] = {
                'resource_type': resource_type,
                'is_sensitive': is_sensitive,
                'description': description,
                'app': caller_module,
            }

            logger.info(f"Registered permission: {permission} (from {caller_module})")

    def _validate_format(self, permission: str) -> bool:
        """Validate permission string format"""
        pattern = r'^[a-z_]+\.[a-z_]+$'
        return bool(re.match(pattern, permission))

    def get_all(self) -> Dict[str, Dict]:
        """Get all registered permissions"""
        with self._lock:
            return self._permissions.copy()

    def is_registered(self, permission: str) -> bool:
        """Check if permission is registered"""
        with self._lock:
            return permission in self._permissions

    def get_by_resource_type(self, resource_type: str) -> Set[str]:
        """Get all permissions for a resource type"""
        with self._lock:
            return {
                perm for perm, data in self._permissions.items()
                if data['resource_type'] == resource_type
            }


# Global singleton instance
permission_registry = PermissionRegistry()
```

**Key Features**:
- Thread-safe with `threading.Lock`
- Format validation with regex
- Duplicate detection with clear error
- Tracks which app registered each permission
- Logging for debugging

---

### T061: Document registry usage

**File**: `src/permissions/README.md` (add Extension Guide section)

**Content**:
```markdown
## Extension Guide: Registering Custom Permissions

Downstream Django apps can register custom permissions for new resource types.

### Step 1: Register permissions in AppConfig.ready()

```python
# In your_app/apps.py
from django.apps import AppConfig

class YourAppConfig(AppConfig):
    name = 'your_app'

    def ready(self):
        """Register custom permissions when app loads"""
        from permissions.registry import permission_registry

        # Register permissions for your resources
        permission_registry.register(
            permission='reports.generate',
            resource_type='report',
            is_sensitive=False,
            description='Generate new reports'
        )
        permission_registry.register(
            permission='reports.delete',
            resource_type='report',
            is_sensitive=True,  # Triggers audit logging
            description='Delete existing reports'
        )
```

### Step 2: Create roles with custom permissions

```python
from permissions.models import Role, Permission

# Get registered permission
perm = Permission.objects.get(permission='reports.generate')

# Create custom role
analyst_role = Role.objects.create(
    name='Data Analyst',
    scope='organization'
)
analyst_role.permissions.add(perm)
```

### Step 3: Check custom permissions

```python
from permissions.evaluator import check_permission

if check_permission(user, 'reports.generate', resource_id=report.id, resource_type='report'):
    # User can generate reports
    pass
```

### Permission Naming Conventions

- Format: `{resource_type}.{action}`
- Use lowercase letters and underscores only
- Examples: `reports.generate`, `dashboards.create`, `exports.download`
- Mark sensitive operations: `reports.delete`, `dashboards.share_external`
```

---

## Test Strategy

```python
def test_registry_validates_format():
    """Verify registry rejects invalid formats"""
    from permissions.registry import permission_registry
    from django.core.exceptions import ImproperlyConfigured

    with pytest.raises(ImproperlyConfigured):
        permission_registry.register('InvalidFormat', 'test')


def test_registry_prevents_duplicates():
    """Verify duplicate registration raises error"""
    permission_registry.register('test.action', 'test')

    with pytest.raises(ImproperlyConfigured):
        permission_registry.register('test.action', 'test')


def test_downstream_app_can_register():
    """Verify downstream app can register permissions"""
    permission_registry.register('reports.generate', 'report')

    assert permission_registry.is_registered('reports.generate')
```

---

## Definition of Done

- [ ] PermissionsConfig created with ready() hook
- [ ] Base permissions registered in ready()
- [ ] Registry validates format with regex
- [ ] Registry prevents duplicates with clear error
- [ ] Registry thread-safe with lock
- [ ] README documents extension pattern with examples
- [ ] Tests verify format validation and duplicate prevention

---

## Risks & Mitigation

**Risk**: Import order issues (registry called before apps ready)
**Mitigation**: Use AppConfig.ready() hook, never module-level registration

**Risk**: Permission name collisions across apps
**Mitigation**: Enforce resource_type prefix convention in docs

## Reviewer Guidance

✅ Verify ready() hook only called once during startup
✅ Check thread safety (lock around shared state)
✅ Confirm clear error messages for validation failures
✅ Validate documentation shows complete example

## Activity Log

- 2025-11-26T20:32:57Z – claude – shell_pid=43840 – lane=doing – Started implementation of Registry & AppConfig
- 2025-11-26T20:45:32Z – claude – shell_pid=43840 – lane=for_review – Moved to for_review

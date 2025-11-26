# Hierarchical Access Control System

Role-based access control with three scope levels (Global, Organization, Project) and additive inheritance.

## Quick Start

(To be completed in WP08)

## Architecture

(To be completed in WP08)

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

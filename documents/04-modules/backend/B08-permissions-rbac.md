# B08: Permissions & RBAC

## 1. Purpose & Responsibility
The **Permissions** module provides hierarchical Role-Based Access Control (RBAC) with scope-aware permissions.

**Responsibilities:**
*   **Permission Registry:** Defines what actions exist (e.g., `projects.delete`).
*   **Role System:** Groups permissions into roles (Admin, Editor, Viewer).
*   **Role Assignments:** Links users to roles at different scopes (Global, Org, Project).
*   **Evaluation:** Checks "Can User X do Action Y on Resource Z?".

## 2. Domain-Agnostic Rationale
Hardcoding `if user.is_admin: ...` doesn't scale. This module provides:
*   **Fine-grained control:** "User can edit Project A but not Project B."
*   **Inheritance:** Org Admins automatically get access to all projects.
*   **Audit trail:** Who granted which permissions when.

## 3. Key Concepts & Data Model

### 3.1 Permission (`src/permissions/models.py`)
A specific capability.
*   **`permission`**: String format `{resource}.{action}` (e.g., `projects.delete`).
*   **`resource_type`**: Category (e.g., `project`, `organisation`).
*   **`is_sensitive`**: If true, triggers audit logging.

### 3.2 Role
A named set of permissions.
*   **`name`**: Display name (e.g., "Project Admin").
*   **`permissions`**: ManyToMany with Permission.
*   **`scope`**: Where this role applies (Global, Org, Project).

### 3.3 RoleAssignment
Links a User to a Role at a specific scope.
*   **`user`**: Who gets the role.
*   **`role`**: What role.
*   **`scope`**: At what level (Global, Org-specific, Project-specific).
*   **`target_organisation` / `target_project`**: The specific tenant/workspace.

## 4. Public Interfaces (API)

### Permission Evaluator (`src/permissions/evaluator.py`)
Python API:
```python
from permissions.evaluator import check_permission
check_permission(user, 'projects.delete', project=my_project)
```

### Decorators
```python
from permissions.decorators import require_permission

@require_permission('projects.delete')
def delete_project(request, project_id):
    ...
```

## 5. Integrations & Dependencies
*   **Accounts (B05)**: Links to User.
*   **Organisations (B06)**: Org-scoped roles.
*   **Projects (B07)**: Project-scoped roles.
*   **Audit (B09)**: Logs sensitive permission changes.

## 6. Status & Phase History
*   **Phase:** 2 (Identity & Multi-Tenancy)
*   **Status:** ✅ Complete
*   **Source Code:** `src/permissions/`

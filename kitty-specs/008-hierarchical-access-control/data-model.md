# Data Model: Hierarchical Access Control System
*Path: kitty-specs/008-hierarchical-access-control/data-model.md*

**Feature**: 008-hierarchical-access-control
**Date**: 2025-11-25
**Status**: Complete

## Entity Relationship Diagram

```
┌─────────────────┐
│     User        │ (from B05: accounts.User)
│  (existing)     │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────────────────┐
│    RoleAssignment           │
│ ─────────────────────────── │
│ id: UUID (PK)               │
│ user_id: FK(User)           │
│ role_id: FK(Role)           │
│ scope: Enum[global/org/proj]│
│ target_organization_id: FK? │
│ target_project_id: FK?      │
│ assigned_by_id: FK(User)    │
│ assigned_at: DateTime       │
│ ─────────────────────────── │
│ UNIQUE(user, scope,         │
│        target_org,          │
│        target_proj)         │
└────────┬────────────────────┘
         │ N
         │
         │ 1
┌────────▼────────────┐
│       Role          │
│ ─────────────────── │
│ id: UUID (PK)       │
│ name: Str(100)      │
│ description: Text   │
│ scope: Enum         │
│ created_at: DateTime│
│ updated_at: DateTime│
│ ─────────────────── │
│ UNIQUE(name, scope) │
└────────┬────────────┘
         │ M
         │
         │ N
┌────────▼────────────┐
│    Permission       │
│ ─────────────────── │
│ id: UUID (PK)       │
│ permission: Str(100)│
│ resource_type: Str  │
│ description: Text   │
│ is_sensitive: Bool  │
│ created_at: DateTime│
│ ─────────────────── │
│ UNIQUE(permission)  │
└─────────────────────┘

┌──────────────────────┐
│   Organisation       │ (from B06)
│    (existing)        │
└──────────┬───────────┘
           │ 1
           │
           │ N (optional)
           └──> RoleAssignment.target_organization_id

┌──────────────────────┐
│      Project         │ (from B07)
│    (existing)        │
└──────────┬───────────┘
           │ 1
           │
           │ N (optional)
           └──> RoleAssignment.target_project_id
```

## Entities

### Role

Represents a named collection of permissions that can be assigned to users at different scopes.

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `name` (String, 100 chars, required): Display name (e.g., "Organization Admin", "Project Viewer")
- `description` (Text, optional): Human-readable explanation of role purpose
- `scope` (Enum: global/organization/project, required): Scope level where this role can be assigned
- `created_at` (DateTime, auto): Timestamp when role was created
- `updated_at` (DateTime, auto): Timestamp when role permissions were last modified

**Relationships**:
- Many-to-Many with **Permission** (through implicit Role_Permissions join table)
- One-to-Many with **RoleAssignment** (one role can be assigned to many users)

**Validation Rules**:
- `name` + `scope` must be unique (prevents "Admin" role collision across scopes)
- `name` must not be empty or whitespace-only
- `scope` must be one of: `global`, `organization`, `project`
- Role must have at least one permission (enforced at application layer, not database)
- Cyclic role dependencies forbidden (if role inheritance added in future)

**State Transitions**:
- **Created**: Role defined with name, scope, initial permission set
- **Modified**: Permission set changed (triggers cache invalidation for all users with this role)
- **Deleted**: Role removed (soft delete recommended - mark as inactive, prevent new assignments)

**Indexes**:
- Primary key (id) - clustered index
- Unique index on (name, scope)
- Index on created_at for audit queries

---

### Permission

Represents a specific capability on a resource type (e.g., "projects.delete", "org.invite_users").

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `permission` (String, 100 chars, required, unique): Permission string (format: `{resource}.{action}`)
- `resource_type` (String, 50 chars, required): Resource category (e.g., "project", "organisation", "account")
- `description` (Text, optional): Human-readable explanation
- `is_sensitive` (Boolean, default=False): Whether this permission triggers audit logging
- `created_at` (DateTime, auto): Timestamp when permission was registered

**Relationships**:
- Many-to-Many with **Role** (through implicit Role_Permissions join table)

**Validation Rules**:
- `permission` must match format `^[a-z_]+\.[a-z_]+$` (lowercase letters, underscores, single dot)
- `permission` must be unique (case-sensitive)
- `resource_type` must not be empty
- `is_sensitive` defaults to False (opt-in audit logging)

**State Transitions**:
- **Registered**: Permission added to registry (either via migration or AppConfig.ready())
- **Marked Sensitive**: `is_sensitive` flag updated via admin interface
- **Deprecated**: Permission marked as deprecated (not deleted - maintains referential integrity)

**Indexes**:
- Primary key (id) - clustered index
- Unique index on permission (string)
- Index on resource_type for filtering by resource
- Index on is_sensitive for audit query optimization

---

### RoleAssignment

Links users to roles at specific scopes (global, organization, or project).

**Attributes**:
- `id` (UUID, PK): Unique identifier
- `user_id` (FK to User, required): User receiving the role
- `role_id` (FK to Role, required): Role being assigned
- `scope` (Enum: global/organization/project, required): Scope level of this assignment
- `target_organization_id` (FK to Organisation, nullable): Target org (required if scope=organization)
- `target_project_id` (FK to Project, nullable): Target project (required if scope=project)
- `assigned_by_id` (FK to User, required): User who created this assignment (audit trail)
- `assigned_at` (DateTime, auto): Timestamp when assignment was created

**Relationships**:
- Many-to-One with **User** (user_id): User receiving role
- Many-to-One with **Role** (role_id): Role being assigned
- Many-to-One with **Organisation** (target_organization_id, optional): Target organization
- Many-to-One with **Project** (target_project_id, optional): Target project
- Many-to-One with **User** (assigned_by_id): User who assigned the role

**Validation Rules**:
- Exactly one of (global scope, target_organization_id, target_project_id) must be set:
  - If `scope=global`: both target_organization_id and target_project_id must be NULL
  - If `scope=organization`: target_organization_id must be set, target_project_id must be NULL
  - If `scope=project`: target_project_id must be set, target_organization_id derived from project.organisation
- `role.scope` must match `scope` (can't assign org-level role at project scope)
- User must exist and not be deleted
- `assigned_by` must have `permissions.assign_role` permission

**State Transitions**:
- **Created**: Role assigned to user at specified scope
- **Replaced**: New role assigned at same scope (unique constraint automatically replaces previous)
- **Deleted**: Role assignment removed (user loses permissions, triggers cache invalidation)

**Unique Constraint**:
- **(user_id, scope, target_organization_id, target_project_id)**: Enforces "one role per user per scope level"
- Ensures assigning new role at same scope replaces previous assignment atomically

**Foreign Key Cascades**:
- `user_id`: ON DELETE CASCADE (if user deleted, remove all their role assignments)
- `role_id`: ON DELETE RESTRICT (prevent deleting role with active assignments, require cleanup first)
- `target_organization_id`: ON DELETE CASCADE (if org deleted, remove org-scoped assignments)
- `target_project_id`: ON DELETE CASCADE (if project deleted, remove project-scoped assignments)
- `assigned_by_id`: ON DELETE SET NULL (preserve assignment even if assigner account deleted)

**Indexes**:
- Primary key (id) - clustered index
- Unique index on (user_id, scope, target_organization_id, target_project_id)
- Index on user_id for "get all roles for user" queries
- Index on (target_organization_id, scope) for "get all org-level assignments"
- Index on (target_project_id, scope) for "get all project-level assignments"
- Index on assigned_at for audit queries

---

## Implicit Join Tables

### Role_Permissions

Django ManyToManyField creates implicit join table linking roles to permissions.

**Attributes**:
- `id` (Auto PK): Unique identifier
- `role_id` (FK to Role, required): Role containing permission
- `permission_id` (FK to Permission, required): Permission granted by role

**Indexes**:
- Unique index on (role_id, permission_id)
- Index on role_id for "get permissions for role" queries
- Index on permission_id for "get roles with permission" queries

---

## Data Lifecycle & Integrity

### Role Lifecycle

1. **Creation**:
   - System admin defines role with name, scope, initial permissions
   - Seed script creates 7 default roles on first migration: `Global Admin`, `Organization Admin`, `Organization Member`, `Organization Viewer`, `Project Admin`, `Project Member`, `Project Viewer`

2. **Modification**:
   - Admin adds/removes permissions from role via Django admin
   - Signal triggers cache invalidation for all users with this role
   - Audit log records modification (who, when, what changed)

3. **Deletion** (soft delete recommended):
   - Mark role as `inactive=True` instead of deleting
   - Prevent new assignments to inactive roles
   - Existing assignments remain (preserve audit trail)
   - Hard delete only after ensuring no assignments exist (`ON DELETE RESTRICT` constraint)

### Permission Lifecycle

1. **Registration**:
   - System permissions registered via migration (e.g., `projects.create`, `projects.delete`)
   - Custom permissions registered via AppConfig.ready() hook in downstream apps
   - Registry prevents duplicate registrations

2. **Sensitivity Configuration**:
   - Admin updates `is_sensitive` flag via Django admin
   - Change takes effect immediately (no caching of sensitivity flag)

3. **Deprecation**:
   - Mark permission as deprecated (add `deprecated=True` field in future)
   - Log warnings when deprecated permission is checked
   - Remove from new role definitions but preserve in existing roles

### RoleAssignment Lifecycle

1. **Creation**:
   - User with `permissions.assign_role` permission creates assignment
   - Validation checks user exists, role exists, scope is valid
   - Unique constraint replaces any previous assignment at same scope
   - Audit log records who assigned, when, and what role

2. **Automatic Replacement**:
   - If user already has role at scope (e.g., "Project Viewer" on project X)
   - Assigning new role at same scope (e.g., "Project Admin" on project X)
   - Database unique constraint replaces old assignment with new atomically

3. **Cascade Deletion**:
   - If organization deleted → all org-scoped assignments for that org deleted
   - If project deleted → all project-scoped assignments for that project deleted
   - If user deleted → all role assignments for that user deleted

4. **Manual Removal**:
   - User with `permissions.assign_role` permission deletes assignment
   - Signal triggers cache invalidation for affected user
   - Audit log records who removed, when

---

## Query Patterns

### Permission Evaluation Query

**Use Case**: Check if user has "projects.delete" permission on specific project

**Optimized Query**:
```sql
SELECT ra.id
FROM permissions_roleassignment ra
JOIN permissions_role r ON ra.role_id = r.id
JOIN permissions_role_permissions rp ON r.id = rp.role_id
JOIN permissions_permission p ON rp.permission_id = p.id
WHERE ra.user_id = ?
  AND p.permission = 'projects.delete'
  AND (
    -- Global role
    (ra.scope = 'global') OR
    -- Organization role for project's org
    (ra.scope = 'organization' AND ra.target_organization_id = ?) OR
    -- Project role for specific project
    (ra.scope = 'project' AND ra.target_project_id = ?)
  )
LIMIT 1;  -- Short-circuit: only need to know if ANY role grants permission
```

**Indexes Used**:
- RoleAssignment: (user_id) index for user filtering
- RoleAssignment: (scope, target_organization_id) or (scope, target_project_id) for scope filtering
- Role_Permissions: (role_id) index for join
- Permission: (permission) unique index for filtering

**Performance**: <50ms uncached (with indexes), <2ms cached

---

### Get All Roles for User

**Use Case**: Display user's roles in admin interface

**Optimized Query**:
```sql
SELECT ra.id, ra.scope, r.name as role_name,
       o.name as org_name, p.name as project_name
FROM permissions_roleassignment ra
JOIN permissions_role r ON ra.role_id = r.id
LEFT JOIN organisations_organisation o ON ra.target_organization_id = o.id
LEFT JOIN projects_project p ON ra.target_project_id = p.id
WHERE ra.user_id = ?
ORDER BY ra.scope, ra.assigned_at DESC;
```

**Indexes Used**:
- RoleAssignment: (user_id) index
- Foreign key indexes on role_id, target_organization_id, target_project_id

**Performance**: <10ms (typically 1-3 assignments per user)

---

### Get All Users with Specific Role at Organization

**Use Case**: Admin wants to list all "Organization Admin" users for an organization

**Optimized Query**:
```sql
SELECT u.id, u.email, ra.assigned_at
FROM permissions_roleassignment ra
JOIN accounts_user u ON ra.user_id = u.id
JOIN permissions_role r ON ra.role_id = r.id
WHERE ra.target_organization_id = ?
  AND ra.scope = 'organization'
  AND r.name = 'Organization Admin'
ORDER BY u.email;
```

**Indexes Used**:
- RoleAssignment: (target_organization_id, scope) composite index
- Role: (name) index

**Performance**: <20ms (assuming <1000 users per org)

---

## Data Integrity Constraints

### Database-Level Constraints

1. **Unique Constraints**:
   - `Role`: (name, scope) - prevents duplicate role names within same scope
   - `Permission`: (permission) - prevents duplicate permission strings
   - `RoleAssignment`: (user_id, scope, target_organization_id, target_project_id) - one role per user per scope

2. **Foreign Key Constraints**:
   - All FK relationships defined with appropriate ON DELETE behavior (CASCADE, RESTRICT, or SET NULL)
   - Prevents orphaned references

3. **Check Constraints** (application-level, enforced in Django model clean()):
   - RoleAssignment scope validation (if scope=global, targets must be NULL)
   - Role.scope must match RoleAssignment.scope when assigning

### Application-Level Validations

1. **Permission Format**:
   - Regex: `^[a-z_]+\.[a-z_]+$`
   - Validated in `Permission.clean()` method

2. **Role Permissions Non-Empty**:
   - Role must have at least one permission
   - Validated before saving role

3. **Assignment Authorization**:
   - User assigning role must have `permissions.assign_role` permission
   - Validated in RoleAssignmentSerializer

4. **Role Scope Matching**:
   - Role.scope must match RoleAssignment.scope
   - Validated in RoleAssignment.clean()

---

## Default Roles & Permissions

### Pre-Seeded Roles (created by migration)

1. **Global Admin** (scope=global):
   - Permissions: ALL permissions (superuser equivalent)
   - Use case: Platform administrators

2. **Organization Admin** (scope=organization):
   - Permissions: `org.invite_users`, `org.manage_settings`, `org.view_members`, `org.assign_roles`, `projects.create`, `projects.view`, `projects.update`, `projects.delete`, `projects.archive`
   - Use case: Organization owners and administrators

3. **Organization Member** (scope=organization):
   - Permissions: `org.view_members`, `projects.create`, `projects.view`, `projects.update`
   - Use case: Regular organization members with project creation rights

4. **Organization Viewer** (scope=organization):
   - Permissions: `org.view_members`, `projects.view`
   - Use case: Read-only organization access

5. **Project Admin** (scope=project):
   - Permissions: `projects.view`, `projects.update`, `projects.delete`, `projects.archive`, `projects.assign_roles`
   - Use case: Project owners and leads

6. **Project Member** (scope=project):
   - Permissions: `projects.view`, `projects.update`
   - Use case: Active project contributors

7. **Project Viewer** (scope=project):
   - Permissions: `projects.view`
   - Use case: Read-only project access (stakeholders, auditors)

### Pre-Registered Permissions (by resource type)

**Organisation Permissions**:
- `org.invite_users` (sensitive)
- `org.remove_users` (sensitive)
- `org.manage_settings`
- `org.view_members`
- `org.assign_roles` (sensitive)
- `org.delete` (sensitive)

**Project Permissions**:
- `projects.create`
- `projects.view`
- `projects.update`
- `projects.delete` (sensitive)
- `projects.archive`
- `projects.assign_roles` (sensitive)

**Permission Management Permissions**:
- `permissions.create_role` (sensitive)
- `permissions.modify_role` (sensitive)
- `permissions.delete_role` (sensitive)
- `permissions.assign_role` (sensitive)
- `permissions.view_roles`

---

## Cache Data Structure

### Redis Keys

**Permission Evaluation Cache**:
- Key pattern: `perms:{user_id}:{permission}:{resource_type}:{resource_id}`
- Value: JSON `{"decision": true|false, "roles": [role_ids], "evaluated_at": timestamp}`
- TTL: 300 seconds (5 minutes)
- Example: `perms:123e4567:projects.delete:project:proj-456abc` → `{"decision": true, "roles": ["role-001"], "evaluated_at": "2025-11-25T10:30:00Z"}`

**Role Assignments Cache**:
- Key pattern: `role_assigns:{user_id}`
- Value: JSON array of RoleAssignment objects
- TTL: 300 seconds
- Invalidated on any role assignment change for that user

**Role Permissions Cache**:
- Key pattern: `role_perms:{role_id}`
- Value: JSON array of permission strings
- TTL: 300 seconds
- Invalidated when role permissions modified

### Cache Invalidation Triggers

1. **RoleAssignment created/deleted**: Invalidate `role_assigns:{user_id}` and all `perms:{user_id}:*`
2. **Role permissions modified**: Invalidate `role_perms:{role_id}` and all `perms:*` for users with that role
3. **Permission sensitivity changed**: No cache invalidation needed (not cached)
4. **User deleted**: Invalidate `role_assigns:{user_id}` and all `perms:{user_id}:*`
5. **Organisation/Project deleted**: CASCADE deletes role assignments, triggers invalidation via signals

---

## Migration Strategy

### Initial Migration (0001_initial.py)

1. Create Permission model
2. Create Role model
3. Create Role_Permissions join table (ManyToManyField)
4. Create RoleAssignment model with foreign keys and unique constraints
5. Create indexes on all foreign keys and unique constraints
6. Seed default permissions (org.*, projects.*, permissions.*)
7. Seed 7 default roles with permission mappings
8. Create superuser role assignment for all existing users with is_superuser=True

### Data Migration Considerations

- Backwards compatible: New app, no changes to existing models
- Forward migration: No data dependencies (fresh tables)
- Rollback: Drop tables, no side effects on existing data
- Performance: Seeding ~30 permissions + 7 roles + assignments takes <1 second

---

## Scalability Considerations

### Storage Growth

**Assumptions**:
- 10,000 users
- 30 permissions (core + custom)
- 15 roles (7 default + 8 custom)
- 3 role assignments per user (global + org + project)

**Storage Estimates**:
- Permission: 30 rows × ~200 bytes = 6 KB
- Role: 15 rows × ~300 bytes = 4.5 KB
- Role_Permissions: 15 roles × 5 perms avg = 75 rows × ~50 bytes = 3.75 KB
- RoleAssignment: 30,000 rows × ~150 bytes = 4.5 MB
- **Total**: ~4.5 MB for 10k users (scales linearly)

### Query Performance

**Bottlenecks**:
- Permission evaluation query with 3-way scope check (global/org/project)
- Listing all users with specific role at organization (N users)

**Mitigations**:
- Indexes on (user_id), (scope, target_organization_id), (scope, target_project_id)
- Redis caching reduces database load by 90% (cache hit rate target)
- Pagination for admin queries listing many users

### Concurrent Modifications

**Race Conditions**:
- Two simultaneous role assignments for same user at same scope
- Role permission modification while permission evaluation in progress

**Mitigations**:
- Database unique constraint handles concurrent assignments atomically (one wins, other gets error)
- Cache invalidation uses Redis transactions (MULTI/EXEC) to avoid partial updates
- TTL ensures stale cache expires within 5 minutes even if invalidation fails

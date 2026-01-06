# ADR-002: Role-Based Access Control Architecture

**Status**: Accepted
**Date**: 2025-11-24
**Decision Makers**: Core Development Team
**Related**: Feature 005 (Core Accounts & Authentication)

## Context

Django Core-App requires a flexible role-based access control (RBAC) system that supports multi-tenant applications. The system must provide clear role boundaries, prevent privilege escalation, and support both platform-level and tenant-level administration.

## Decision

We will implement a three-tier RBAC system using Django's built-in Groups and permissions framework:

### Role Hierarchy

1. **Superadmin** (Platform Administrator)
   - **Implementation**: `User.is_superuser = True`
   - **Scope**: Platform-wide access across all tenants
   - **Capabilities**: All permissions, full Django Admin access, user management across all tenants

2. **Admin** (Tenant Administrator)
   - **Implementation**: Member of 'admin' Django Group
   - **Scope**: Single tenant (future: FK to tenant in multi-tenant setup)
   - **Capabilities**: User management within tenant, cannot assign admin/superadmin roles

3. **User** (Regular User)
   - **Implementation**: Member of 'user' Django Group
   - **Scope**: Self-service only
   - **Capabilities**: Profile management, password reset, standard application features

### Implementation Strategy

**Group Management**:
- Groups created during initial migrations (`0002_create_groups.py`)
- Users automatically assigned to 'user' group on registration (via post_save signal)
- Role changes managed through explicit group assignment by admins

**Permission Enforcement**:
- Custom DRF permission class: `IsAdmin` (checks `is_superuser` or 'admin' group membership)
- View decorators: `@admin_required` for Django template views
- Middleware: Checks `is_active` status on every request
- Database-level: No direct permissions (all through groups and is_superuser)

**Privilege Escalation Prevention**:
- Users cannot modify their own role
- Admins cannot assign admin or superadmin roles
- Users cannot deactivate themselves
- Admins cannot deactivate other admins or superadmins
- Superadmins cannot demote themselves (requires another superadmin)

### API Authorization Matrix

| Endpoint | Superadmin | Admin | User | Anonymous |
|----------|------------|-------|------|-----------|
| POST /auth/register | ✓ | ✓ | ✓ | ✓ |
| POST /auth/login | ✓ | ✓ | ✓ | ✓ |
| POST /auth/logout | ✓ | ✓ | ✓ | ✗ |
| GET /admin/users | ✓ | ✓ | ✗ | ✗ |
| GET /admin/users/{id} | ✓ | ✓ | ✗ | ✗ |
| PATCH /admin/users/{id}/activate | ✓ | ✓ (users only) | ✗ | ✗ |
| PATCH /admin/users/{id}/deactivate | ✓ | ✓ (users only) | ✗ | ✗ |
| PATCH /admin/users/{id}/role | ✓ (all roles) | ✓ (user only) | ✗ | ✗ |

### Code Example

```python
# Permission class usage
from accounts.permissions import IsAdmin

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_user_list(request):
    """List users - accessible by superadmins and admins."""
    users = User.objects.all()
    return Response(serializer.data)

# View decorator usage
from accounts.decorators import admin_required

@admin_required
def admin_dashboard(request):
    """Admin dashboard - accessible by superadmins and admins."""
    return render(request, 'admin/dashboard.html')

# Model property usage
if request.user.is_superadmin:
    # Platform-level operations
    pass
elif request.user.is_admin:
    # Tenant-level operations
    pass
elif request.user.is_regular_user:
    # Self-service operations
    pass
```

## Consequences

### Positive

- **Clear Role Boundaries**: Three distinct roles with well-defined permissions
- **Django-Native**: Leverages Django's built-in Groups and permissions system
- **Multi-Tenant Ready**: Architecture supports future tenant scoping
- **Testable**: 100% test coverage for permission classes (12 tests)
- **Privilege Escalation Protection**: Multiple safeguards prevent unauthorized role changes
- **Flexible**: Can add custom permissions to groups as needed
- **Performant**: Group membership checked via database query (cacheable)

### Negative

- **Group Management Overhead**: Groups must be created during migrations
- **No Fine-Grained Permissions**: Binary roles (not per-object or per-action permissions)
- **Role Assignment Complexity**: Requires explicit group management code
- **Limited Role Hierarchy**: Only three roles (cannot add intermediate roles easily)

### Trade-offs

- **Simplicity vs. Flexibility**: Chose simple three-tier system over complex permission matrix
- **Security vs. Usability**: Strict privilege escalation prevention may frustrate users needing quick role changes
- **Performance vs. Flexibility**: Group membership checked on every request (vs. caching complex permission rules)

## Alternatives Considered

### 1. Django Permissions Only
**Description**: Use Django's built-in object-level permissions without groups.

**Rejected Because**:
- Too granular for initial implementation (hundreds of permissions to manage)
- Harder to explain to users ("you have permission X but not Y")
- More complex permission checks in views (multiple permissions per view)
- Difficult to visualize user capabilities

### 2. Custom RBAC System
**Description**: Implement custom Role model with many-to-many permissions table.

**Rejected Because**:
- Reinvents Django's Groups system (code duplication)
- Adds database complexity (more tables, migrations)
- Harder to integrate with Django Admin
- More testing burden (custom permission checking logic)

### 3. Attribute-Based Access Control (ABAC)
**Description**: Permissions based on user attributes (department, location, etc.) instead of roles.

**Rejected Because**:
- Too complex for initial implementation
- Requires sophisticated policy engine
- Harder to debug ("why can't I access X?")
- Overkill for three-tier role system

### 4. Hierarchical RBAC (Role Inheritance)
**Description**: Roles inherit permissions from parent roles (Admin inherits User permissions).

**Rejected Because**:
- Django Groups don't support inheritance natively
- Would require custom implementation (complexity)
- Three-tier system has clear boundaries (no inheritance needed)
- Can be added later if needed

## Related Decisions

- **ADR-001**: Password Validation Strategy (authentication before authorization)
- **Feature 003**: Security Baseline (session security, brute-force protection)
- **Future**: Multi-tenant architecture (tenant-scoped admin role)

## Migration Path

**Current State** (Feature 005):
- Single-tenant application with three global roles
- Groups created during migrations
- Permission classes check group membership

**Future State** (Multi-Tenant):
- Add `Tenant` model with FK from User
- Admin role scoped to single tenant (FK from GroupMembership to Tenant)
- Superadmin remains platform-wide
- Permission checks include tenant boundary validation

**Migration Strategy**:
- No breaking changes required (groups remain)
- Add tenant_id to group membership (new table)
- Update permission classes to check tenant boundary
- Existing tests remain valid (single-tenant case)

## Implementation

- **Specification**: `kitty-specs/005-core-accounts-authentication/spec.md` (SC-005, SC-006)
- **Code**:
  - `src/accounts/models.py` (User model with role properties)
  - `src/accounts/permissions.py` (IsAdmin permission class)
  - `src/accounts/decorators.py` (admin_required decorator)
  - `src/accounts/migrations/0002_create_groups.py` (Group creation)
- **Tests**:
  - `tests/accounts/test_permissions.py` (12 tests, 100% coverage)
  - `tests/accounts/test_integration.py` (security constraint tests)
- **API Contracts**:
  - `kitty-specs/005-core-accounts-authentication/contracts/admin.yaml`

## Acceptance Criteria

- [x] Three-tier role system implemented (superadmin, admin, user)
- [x] Groups created during migrations
- [x] IsAdmin permission class with is_active check
- [x] Role properties on User model (is_superadmin, is_admin, is_regular_user)
- [x] Privilege escalation prevention (self-role-change, role hierarchy)
- [x] Admin cannot modify superadmin accounts
- [x] User cannot deactivate self through API
- [x] 100% test coverage for permission classes
- [x] Integration tests for security constraints
- [x] Documentation in README.md

## Security Considerations

**Privilege Escalation Vectors** (mitigated):
- ✓ Self-role-change: User cannot change own role
- ✓ Admin role assignment: Admin cannot assign admin/superadmin roles
- ✓ Self-deactivation: User cannot deactivate own account
- ✓ Cross-role deactivation: Admin cannot deactivate superadmins or other admins
- ✓ Inactive users: is_active check in permission classes

**Remaining Risks**:
- Database-level role changes (requires direct DB access - mitigated by DB security)
- Session hijacking (mitigated by Feature 003 session security)
- Social engineering (mitigated by audit logging - future feature)

## Performance Impact

**Database Queries**:
- Group membership: 1 query per request (cacheable with select_related)
- Permission check: In-memory after initial query
- User retrieval: Includes groups in queryset (prefetch_related)

**Optimization Strategies**:
- Cache group membership in session (future)
- Use select_related('groups') in user querysets
- Database index on groups_user_set (Django default)

## Review and Approval

**Proposed**: 2025-11-20
**Reviewed**: 2025-11-22
**Approved**: 2025-11-24
**Approved By**: Core Development Team

## References

- Django Groups and Permissions: https://docs.djangoproject.com/en/5.1/topics/auth/default/#groups
- Django REST Framework Permissions: https://www.django-rest-framework.org/api-guide/permissions/
- NIST RBAC Model: https://csrc.nist.gov/projects/role-based-access-control
- OWASP Access Control Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html

# ADR-008: Additive (Union-Based) Permission Inheritance

## Status

**Accepted** - 2024-11-27

## Context

The hierarchical access control system uses a three-level scope hierarchy (Global → Organization → Project). When a user has role assignments at multiple scope levels, we need to define how permissions combine across these scopes.

### The Decision Problem

Consider this scenario:
- User Alice has `projects.view` permission at the **Organization** level
- User Alice has `projects.delete` permission at the **Project** level

When Alice attempts to delete the project, should the system:

1. **Additive (Union) Approach**: Grant `projects.delete` because she has it at **any** scope level
2. **Restrictive (Intersection) Approach**: Deny `projects.delete` because she doesn't have it at **all** scope levels
3. **Hierarchical Override**: Only allow permissions from the most specific scope (Project)

This choice affects:
- **Delegation patterns**: Can project admins grant permissions that organization admins haven't assigned?
- **User expectations**: How intuitive is the permission model for administrators?
- **Security model**: Principle of least privilege vs. flexible access control
- **Implementation complexity**: Query patterns, caching, and performance

### Key Requirements

1. **Hierarchical scoping**: Global permissions should work everywhere, organization permissions in all projects within that org, project permissions only in that project
2. **Flexible delegation**: Project-level administrators should be able to grant additional permissions without requiring organization-level approval
3. **Predictable behavior**: Users and administrators should easily understand which permissions apply
4. **Performance**: Permission checks should be fast (cacheable, minimal database queries)
5. **Security**: Fail-closed by default, audit all access decisions

## Decision

We will use an **additive (union-based) permission inheritance model**:

- A user's effective permissions at any level are the **union** of all their role assignments across all relevant scopes
- Permissions granted at broader scopes (Global, Organization) automatically apply to narrower scopes (Project)
- Permissions granted at narrower scopes do not require permissions at broader scopes

### Formal Definition

```python
def effective_permissions(user, target):
    """
    User has permission P on target T if P exists in ANY of:
    - Global role assignments
    - Organization role assignments (if T is in that organization)
    - Project role assignments (if T is that project)
    """
    permissions = set()

    # Union permissions from all scopes
    permissions |= get_global_permissions(user)
    permissions |= get_organization_permissions(user, target.organization)
    permissions |= get_project_permissions(user, target.project)

    return permissions
```

### Permission Check Algorithm

```python
def check_permission(user_id, permission, target_id=None, target_type=None):
    # 1. Check global assignments (always applies)
    if has_permission_at_scope(user_id, permission, scope=GLOBAL):
        return True

    # 2. Check organization assignments (if target is org or project)
    if target_type in [ORGANIZATION, PROJECT]:
        org_id = get_organization_id(target_id, target_type)
        if has_permission_at_scope(user_id, permission, scope=ORGANIZATION, org_id=org_id):
            return True

    # 3. Check project assignments (if target is project)
    if target_type == PROJECT:
        if has_permission_at_scope(user_id, permission, scope=PROJECT, project_id=target_id):
            return True

    # 4. Deny by default (fail-closed)
    return False
```

## Rationale

### Why Additive (Union) Over Alternatives

#### Alternative 1: Restrictive (Intersection) Approach

**How it works**: User must have permission at ALL relevant scope levels.

**Example**: To delete a project, user needs:
- `projects.delete` at Global AND
- `projects.delete` at Organization AND
- `projects.delete` at Project

**Rejected because**:
- ❌ **Overly restrictive**: Creates permission "deadlocks" where no one can act
- ❌ **Poor delegation**: Project admins can't grant permissions without org admin approval
- ❌ **Violates least surprise**: Users expect permissions to "add up", not "narrow down"
- ❌ **Implementation complexity**: Difficult to cache (must check all levels every time)

#### Alternative 2: Hierarchical Override (Most Specific Wins)

**How it works**: Only the most specific scope level applies.

**Example**: If user has both org-level and project-level roles, only project-level permissions apply within that project.

**Rejected because**:
- ❌ **Counterintuitive**: Global admins lose access when given project-specific roles
- ❌ **Fragile**: Adding a single project role could accidentally remove broader permissions
- ❌ **Complex delegation**: Requires copying all permissions at each level
- ❌ **Caching complexity**: Cache invalidation becomes scope-dependent

### Why Additive is Better

✅ **Principle of least surprise**: Permissions "add up" as you assign more roles
✅ **Flexible delegation**: Project admins can grant additional permissions independently
✅ **Matches common RBAC patterns**: Aligns with AWS IAM, Kubernetes RBAC, GitHub permissions
✅ **Simple caching**: Union of permission sets is easy to cache and invalidate
✅ **Supports temporary elevation**: Easy to grant temporary project access without changing org roles
✅ **Fail-closed**: Still denies by default, only grants when explicitly assigned

### Real-World Scenario

**Scenario**: University course management system

**Actors**:
- **Dean** (Global Admin): Should manage all departments and courses
- **Department Chair** (Org Admin): Should manage all courses in their department
- **Course Instructor** (Project Admin): Should manage their specific course

**With Additive Inheritance**:
- Dean assigns Department Chair → `courses.create` (org scope)
- Department Chair assigns Instructor → `courses.delete` (project scope)
- Instructor can now **create** (inherited from org) AND **delete** (granted at project)
- Department Chair can still **create** courses (doesn't need project-level permission)
- Dean can still **create** courses (global permissions work everywhere)

**Result**: ✅ Flexible, intuitive, works as expected

**With Restrictive Inheritance**:
- Instructor has `courses.delete` at project level
- But lacks `courses.delete` at org level → **DENIED**
- Department Chair must explicitly grant all permissions at all levels
- Creates bureaucratic overhead and permission management complexity

**Result**: ❌ Overly restrictive, poor user experience

## Consequences

### Positive

1. **Intuitive for users**: Permissions accumulate naturally as you assign more roles
2. **Flexible delegation**: Project leads can grant additional permissions without higher approval
3. **Supports temporary access**: Easy to grant time-limited project access without changing org roles
4. **Simple implementation**: Union operation is straightforward to implement and test
5. **Efficient caching**: Cache key includes scope hierarchy, easy to invalidate
6. **Matches industry patterns**: Similar to AWS IAM, Google Cloud IAM, Kubernetes RBAC

### Negative

1. **Cannot enforce restrictions from higher scopes**: Organization admins cannot "block" permissions granted at project level
2. **Potential for permission creep**: Users accumulate permissions over time without expiration
3. **Audit complexity**: Must track permissions across multiple scopes to understand effective access
4. **No hierarchical constraints**: Cannot enforce "only org admins can grant project access"

### Mitigations

1. **Audit logging**: Comprehensive audit trail tracks all permission grants and checks
2. **Regular reviews**: Implement periodic permission reviews (future feature)
3. **Sensitive permission flagging**: Mark high-risk permissions for extra scrutiny
4. **Clear documentation**: Explain additive model in user documentation
5. **Scope visualization**: API endpoints show effective permissions across all scopes

## Implementation Notes

### Database Queries

```python
# Efficient query pattern for permission checks
RoleAssignment.objects.filter(
    Q(user_id=user_id) &
    (
        # Global assignments
        Q(scope=RoleAssignment.GLOBAL) |
        # Organization assignments (if org context)
        (Q(scope=RoleAssignment.ORGANIZATION) & Q(target_organization_id=org_id)) |
        # Project assignments (if project context)
        (Q(scope=RoleAssignment.PROJECT) & Q(target_project_id=project_id))
    )
).select_related('role').prefetch_related('role__permissions')
```

### Caching Strategy

```python
# Cache key includes all scope levels
cache_key = f"perm:{user_id}:{permission}:{target_type}:{target_id}"

# Invalidate on role assignment changes (via Django signals)
# - User role assigned → Invalidate user's permission cache
# - Role permissions changed → Invalidate all users with that role
# - Organization/project deleted → Invalidate scope-specific cache
```

### Testing Strategy

```python
# Test cases ensure additive behavior
def test_additive_inheritance():
    # Global permission applies everywhere
    assign_role(user, global_admin_role, scope=GLOBAL)
    assert check_permission(user.id, "projects.delete", project.id, "project")

    # Organization permission applies to projects
    assign_role(user, org_admin_role, scope=ORGANIZATION, org=org)
    assert check_permission(user.id, "projects.update", project.id, "project")

    # Project permission adds to organization permissions
    assign_role(user, contributor_role, scope=PROJECT, project=project)
    effective_perms = get_effective_permissions(user, project)
    assert effective_perms == union(global_perms, org_perms, project_perms)
```

## Alternatives Considered

### 1. Restrictive (Intersection) Model

**Description**: User must have permission at ALL relevant scope levels.

**Pros**:
- More restrictive security model
- Enforces hierarchical approval

**Cons**:
- Overly complex for users
- Prevents flexible delegation
- Creates permission deadlocks
- Poor user experience

**Decision**: Rejected due to poor usability and inflexibility.

### 2. Hierarchical Override Model

**Description**: Most specific scope overrides broader scopes.

**Pros**:
- Clear precedence rules
- No permission accumulation

**Cons**:
- Counterintuitive (global admins lose access)
- Fragile (adding role removes permissions)
- Requires permission copying at each level
- Complex cache invalidation

**Decision**: Rejected due to counterintuitive behavior.

### 3. Explicit Inheritance Rules

**Description**: Define per-permission inheritance policies (additive vs. restrictive).

**Pros**:
- Maximum flexibility
- Can handle edge cases

**Cons**:
- Extremely complex to implement
- Impossible to explain to users
- Performance nightmare (per-permission logic)
- Hard to audit and debug

**Decision**: Rejected due to excessive complexity.

### 4. Hybrid Model (Additive with Deny Rules)

**Description**: Additive inheritance with explicit "deny" rules that override grants.

**Pros**:
- Additive by default
- Allows restriction from higher scopes
- Matches AWS IAM deny model

**Cons**:
- Significantly more complex
- Hard to reason about (allow vs. deny precedence)
- Requires additional data model (DenyRule model)
- Defer to future version if needed

**Decision**: Deferred for v1, revisit if strong use case emerges.

## References

- [AWS IAM Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html) - Union-based with explicit deny
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/) - Additive permission model
- [GitHub Repository Permissions](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/repository-roles-for-an-organization) - Hierarchical additive model
- [Google Cloud IAM](https://cloud.google.com/iam/docs/overview) - Union of all granted permissions

## Related Decisions

- **ADR-007**: Three-Level Scope Hierarchy (Global, Organization, Project)
- **ADR-009** (Future): Time-Bound Role Assignments
- **ADR-010** (Future): Explicit Deny Rules (if needed)

## Changelog

- **2024-11-27**: Initial decision - Additive (union-based) inheritance accepted

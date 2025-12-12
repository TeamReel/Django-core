# B17 Routing Service ACL Audit Report

**Date**: 2025-12-12
**Auditor**: claude (shell_pid=26336)
**Feature**: WP04 - B17 Routing Service Refactor
**Status**: Complete

---

## Executive Summary

Audited B17 contextual notifications routing service for direct database queries that bypass ACL enforcement. Found **2 high-risk instances** in view files that directly query `OrganisationUser.objects` without permission checks. No direct queries on `Organisation.objects` or `Project.objects` were found.

**Key Findings**:
- ✅ `routing_service.py`: No direct Organization/Project queries
- 🔴 `routing_logs_views.py`: 1 high-risk query on OrganisationUser
- 🔴 `preference_views.py`: 1 high-risk query on OrganisationUser
- ✅ Other services: No ACL bypass risks identified

**Recommendation**: Refactor views to use B06 organization service layer functions.

---

## HIGH RISK Findings

### 1. Routing Logs ViewSet - Organization Admin Check

**File**: `src/contextual_notifications/views/routing_logs_views.py`
**Lines**: 72-74
**Risk Level**: 🔴 HIGH

**Current Code**:
```python
admin_org_ids = OrganisationUser.objects.filter(
    user=user, role__in=["admin", "owner"]
).values_list("organisation_id", flat=True)
```

**Risk Analysis**:
- **Bypass Potential**: Directly queries `OrganisationUser` model without ACL enforcement
- **Data Exposure**: Could leak organization membership and role information
- **Context**: Used in `get_queryset()` to filter routing decision logs by organization
- **Attack Vector**: User could manipulate request to see organizations they don't belong to

**Recommended Replacement**:
```python
from organisations.services import get_user_organizations

# Service function internally enforces ACL
admin_orgs = get_user_organizations(
    user=user,
    permission="organization.view_routing_logs",
    role_filter=["admin", "owner"]
)
admin_org_ids = [org.id for org in admin_orgs]
```

**Action Required**: Replace direct query with B06 service layer call

---

### 2. Notification Preferences ViewSet - Organization Users Query

**File**: `src/contextual_notifications/views/preference_views.py`
**Lines**: 55-58
**Risk Level**: 🔴 HIGH

**Current Code**:
```python
org_user_ids = OrganisationUser.objects.filter(
    organisation__organisationuser__user=user,
    organisation__organisationuser__role__in=["admin", "owner"],
).values_list("user_id", flat=True)
```

**Risk Analysis**:
- **Bypass Potential**: Complex query accessing organization relationships without ACL
- **Data Exposure**: Could expose user lists across organization boundaries
- **Context**: Used in `get_queryset()` to allow admins to view team preferences
- **Attack Vector**: User could query preferences for users in unauthorized organizations

**Recommended Replacement**:
```python
from organisations.services import get_organization_users

# Service function internally enforces ACL
org_users = get_organization_users(
    organization_id=user.organization.id,  # or iterate over user's orgs
    requesting_user=user,
    permission="organization.view_members"
)
org_user_ids = [u.id for u in org_users]
```

**Action Required**: Replace direct query with B06 service layer call

---

## LOW RISK Findings

### 3. Routing Service - Role Assignment Queries

**File**: `src/contextual_notifications/services/routing_service.py`
**Lines**: 143-178 (multiple queries)
**Risk Level**: ✅ LOW (Internal Logic)

**Current Code**:
```python
# Query Role by name
role = Role.objects.get(name=rule.target_role)

# Query RoleAssignment for users
role_assignments = RoleAssignment.objects.filter(role=role)

# Apply scope filtering
if rule.scope == RoutingRule.SCOPE_PROJECT and project_id:
    role_assignments = role_assignments.filter(
        scope=RoleAssignment.PROJECT, target_project_id=project_id
    )
```

**Risk Analysis**:
- **Bypass Potential**: Low - queries are internal routing logic, not user-facing
- **Data Exposure**: Minimal - operates on already-scoped data (rules filtered by event context)
- **Context**: Used to resolve notification recipients from routing rules
- **Note**: While low risk, should still use service layer for consistency

**Recommended Replacement**:
```python
from permissions.services import get_role_assignments

# Use B08 service layer (if exists)
role_assignments = get_role_assignments(
    role_name=rule.target_role,
    scope=rule.scope,
    organization_id=org_id,
    project_id=project_id
)
```

**Action Required**: Consider refactoring for consistency (not critical)

---

## ZERO RISK Findings

### ✅ No Direct Organization/Project Queries

**Search Results**:
```bash
# Searched for:
grep -r "Organisation\.objects" src/contextual_notifications/
grep -r "Organization\.objects" src/contextual_notifications/
grep -r "Project\.objects" src/contextual_notifications/

# Result: No matches found
```

**Conclusion**: B17 routing service does not directly query `Organisation` or `Project` models, which is good. The ACL bypass risk is limited to `OrganisationUser` queries in view files.

---

## Risk Summary Table

| File | Line | Query Target | Risk | Action |
|------|------|--------------|------|--------|
| `routing_logs_views.py` | 72-74 | `OrganisationUser.objects` | 🔴 HIGH | Replace with B06 service |
| `preference_views.py` | 55-58 | `OrganisationUser.objects` | 🔴 HIGH | Replace with B06 service |
| `routing_service.py` | 143-178 | `Role.objects`, `RoleAssignment.objects` | ✅ LOW | Consider B08 service (optional) |
| Other files | N/A | N/A | ✅ NONE | No action required |

**Total High Risk**: 2
**Total Medium Risk**: 0
**Total Low Risk**: 1

---

## Refactor Roadmap

### Phase 1: Address High-Risk Views (T021)
1. ✅ Create/verify B06 service functions:
   - `get_user_organizations(user, permission, role_filter=None)`
   - `get_organization_users(organization_id, requesting_user, permission)`

2. ✅ Refactor `routing_logs_views.py`:
   - Replace `OrganisationUser.objects` query with `get_user_organizations()`
   - Add permission check: `"organization.view_routing_logs"`
   - Ensure service function calls `evaluate_permission()` internally

3. ✅ Refactor `preference_views.py`:
   - Replace `OrganisationUser.objects` query with `get_organization_users()`
   - Add permission check: `"organization.view_members"`
   - Handle multi-org admin scenario (iterate over user's organizations)

### Phase 2: Optional - Refactor Internal Routing Logic (T022)
1. Consider creating B08 service function:
   - `get_role_assignments(role_name, scope, organization_id=None, project_id=None)`
   - Would centralize role assignment queries for routing

2. Update `routing_service.py` to use service function (non-critical)

### Phase 3: Testing (T024, T025)
1. Write integration tests for refactored views
2. Write security tests for bypass attempts
3. Verify audit events logged for all permission checks

---

## Dependencies

**Required Service Functions** (must exist or be created):

From `organisations.services`:
- `get_user_organizations(user, permission=None, role_filter=None) -> QuerySet[Organisation]`
- `get_organization_users(organization_id, requesting_user, permission) -> QuerySet[User]`

Optional from `permissions.services`:
- `get_role_assignments(role_name, scope, organization_id=None, project_id=None) -> QuerySet[RoleAssignment]`

**Required Permissions** (must exist in B08 fixtures):
- `organization.view_routing_logs` - For routing decision log access
- `organization.view_members` - For viewing organization user preferences

---

## Testing Strategy

**Integration Tests** (per T024):
```python
def test_routing_logs_viewset_enforces_acl():
    """Admin can view routing logs for their org only"""
    user = create_user_with_permission("organization.view_routing_logs")
    org = user.organizations.first()

    response = client.get("/api/contextual-notifications/routing-logs/")

    # Should only see events for authorized org
    assert all(log["organization_id"] == org.id for log in response.data["results"])
```

**Security Tests** (per T025):
```python
def test_cannot_view_routing_logs_for_unauthorized_org():
    """User cannot access routing logs from other organizations"""
    user_a = create_user_in_organization("Org A")
    org_b_event = create_routing_log_event(organization=org_b)

    response = client.get(f"/api/contextual-notifications/routing-logs/{org_b_event.id}/")

    assert response.status_code == 403
    # Verify audit event logged
```

---

## Sign-off

**Audit Completed**: ✅ 2025-12-12
**Auditor**: claude (shell_pid=26336)
**Next Steps**: Proceed with T021 (Refactor to use B06 service layer)

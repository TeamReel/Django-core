---
work_package_id: WP04
title: API Enforcement - B17 Routing Service Refactor
lane: "for_review"
subtasks:
  - T020
  - T021
  - T022
  - T023
  - T024
  - T025
agent: "claude"
shell_pid: "26336"
history:
  - date: 2025-12-12
    action: created
    by: spec-kitty-tasks
---

# WP04: API Enforcement - B17 Routing Service Refactor

## Objective

Refactor B17 routing service to eliminate direct database queries on Organization and Project models, replacing them with calls to B06/B07 service layer functions that enforce ACL checks internally.

## Context

**User Story**: Story 2 (Backend Developer: Apply ACL Checks Consistently - P1)

**Why This Matters**:
- B17 notification routing currently bypasses ACL by directly querying `Organization.objects` and `Project.objects`
- Service layer functions (B06/B07) are the designated enforcement points for ACL
- Ensures consistent permission enforcement across all access paths

**Success Criteria**:
- SC-001: 100% of tenant-scoped endpoints enforce ACL checks
- SC-007: Zero direct database queries in B17 (all via service layer)

**Dependencies**: WP01 (requires centralized evaluator), may require updates to B06/B07 service layer

---

## Subtasks

### T020: Audit B17 for Direct Database Queries

**What to Do**:
1. Search B17 codebase for direct ORM queries:
```bash
grep -r "Organization.objects" src/routing/
grep -r "Project.objects" src/routing/
grep -r "\.filter(" src/routing/
grep -r "\.get(" src/routing/
```

2. Document all findings in audit report:
```
File: src/routing/service.py
Line 45: Organization.objects.filter(id__in=org_ids)
Line 78: Project.objects.get(id=project_id)
Line 102: User.objects.filter(organization_memberships__organization_id=org_id)
```

3. Categorize queries by risk:
   - **High Risk**: Queries that expose cross-tenant data (e.g., filtering without tenant scope)
   - **Medium Risk**: Queries that may bypass ACL (e.g., direct gets without permission check)
   - **Low Risk**: Internal queries within already-authorized context

**Acceptance Criteria**:
- Complete list of all direct ORM queries in B17
- Risk categorization for each query
- Recommended replacement service function for each query

---

### T021: Refactor to Use B06 Organization Service Layer

**What to Do**:
1. Import B06 service functions:
```python
from organizations.services import (
    get_organization_members,
    get_user_organizations,
    check_organization_access,
)
```

2. Replace direct Organization queries:

**Before**:
```python
def route_organization_notification(org_id):
    org = Organization.objects.get(id=org_id)  # ❌ Direct query
    members = org.members.all()  # ❌ No ACL check
    return [m.user for m in members]
```

**After**:
```python
def route_organization_notification(org_id, request_user):
    # B06 service function internally calls evaluate_permission()
    members = get_organization_members(
        organization_id=org_id,
        requesting_user=request_user
    )
    return [m.user for m in members]
```

3. Replace all Organization queries identified in T020 audit

**Acceptance Criteria**:
- All `Organization.objects` calls removed from B17
- Replaced with B06 service function calls
- Service functions pass `requesting_user` parameter for ACL enforcement
- Existing routing logic preserved (functional equivalence)

---

### T022: Refactor to Use B07 Project Service Layer

**What to Do**:
1. Import B07 service functions:
```python
from projects.services import (
    get_project_members,
    get_user_projects,
    check_project_access,
)
```

2. Replace direct Project queries:

**Before**:
```python
def route_project_notification(project_id):
    project = Project.objects.get(id=project_id)  # ❌ Direct query
    members = project.members.all()  # ❌ No ACL check
    return [m.user for m in members]
```

**After**:
```python
def route_project_notification(project_id, request_user):
    # B07 service function internally calls evaluate_permission()
    members = get_project_members(
        project_id=project_id,
        requesting_user=request_user
    )
    return [m.user for m in members]
```

3. Replace all Project queries identified in T020 audit

**Acceptance Criteria**:
- All `Project.objects` calls removed from B17
- Replaced with B07 service function calls
- Service functions enforce ACL internally
- Routing logic functionally equivalent

---

### T023: Verify B06/B07 Service Functions Enforce ACL Internally

**What to Do**:
1. Review B06 service function implementations:
```python
# Check that B06 services call evaluate_permission()
def get_organization_members(organization_id, requesting_user):
    # ✅ Expected: calls evaluate_permission() before returning data
    if not evaluate_permission(
        user=requesting_user,
        permission="organization.view_members",
        context={"organization_id": organization_id}
    ):
        raise PermissionDenied("Cannot view organization members")

    return OrganizationMembership.objects.filter(organization_id=organization_id)
```

2. If service functions missing or lack ACL, add them:
```python
# Example: Add missing service function to B06
def get_organization_members(organization_id, requesting_user):
    """Get organization members with ACL enforcement"""
    from permissions.audit import evaluate_permission

    if not evaluate_permission(
        user=requesting_user,
        permission="organization.view_members",
        context={"scope": "ORGANIZATION", "organization_id": organization_id}
    ):
        raise PermissionDenied({
            "error": "forbidden",
            "permission": "organization.view_members",
            "detail": "You do not have permission to view members of this organization"
        })

    return OrganizationMembership.objects.filter(
        organization_id=organization_id
    ).select_related("user")
```

3. Verify all service functions used in T021/T022 have ACL enforcement

**Acceptance Criteria**:
- All B06/B07 service functions call `evaluate_permission()`
- Service functions raise `PermissionDenied` when ACL fails
- Permission codes exist in fixtures (e.g., `organization.view_members`, `project.view_members`)
- Code review confirms ACL enforcement at service layer

---

### T024: Write Integration Tests for B17 Routing

**What to Do**:
1. Create `tests/integration/test_b17_routing.py`

2. Write test cases:

**Organization Routing - Allowed**:
```python
def test_route_organization_notification_allowed(self):
    """User with permission can trigger org notification routing"""
    user = self.create_user_with_permission("organization.view_members")
    org = user.organizations.first()

    # Trigger routing (e.g., via notification creation)
    recipients = route_organization_notification(org.id, request_user=user)

    self.assertGreater(len(recipients), 0)
    # Verify B09 audit event for permission check
    audit_event = AuditEvent.objects.filter(
        event_type="permission.granted",
        permission="organization.view_members"
    ).latest("timestamp")
    self.assertEqual(audit_event.user_id, user.id)
```

**Organization Routing - Denied**:
```python
def test_route_organization_notification_denied(self):
    """User without permission cannot trigger org routing"""
    user = self.create_user_without_permission()
    org = self.create_organization()  # User not member

    with self.assertRaises(PermissionDenied):
        route_organization_notification(org.id, request_user=user)

    # Verify denial logged to B09
    audit_event = AuditEvent.objects.filter(
        event_type="permission.denied",
        user_id=user.id
    ).latest("timestamp")
    self.assertIsNotNone(audit_event)
```

**Project Routing - Allowed/Denied**:
```python
# Similar tests for project notification routing
```

**Acceptance Criteria**:
- 4+ integration tests pass (org allowed/denied, project allowed/denied)
- Tests verify routing functions call service layer (not direct queries)
- Tests verify B09 audit events created

---

### T025: Write Security Tests for B17 (Unauthorized Project/Org Access)

**What to Do**:
1. Create `tests/security/test_b17_bypass.py`

2. Write bypass scenarios:

**Cross-Organization Routing Attempt**:
```python
def test_cannot_route_notification_to_unauthorized_org(self):
    """User cannot trigger routing for organization they don't belong to"""
    user_a = self.create_user_in_organization("Org A")
    org_b = Organization.objects.create(name="Org B")

    with self.assertRaises(PermissionDenied):
        route_organization_notification(org_b.id, request_user=user_a)

    # Verify no recipients returned (routing blocked)
    # Verify audit event captured bypass attempt
```

**Project Routing Without Organization Access**:
```python
def test_cannot_route_project_notification_without_org_access(self):
    """User cannot route to project if not in parent organization"""
    user = self.create_user()
    org = self.create_organization()
    project = self.create_project(organization=org)

    with self.assertRaises(PermissionDenied):
        route_project_notification(project.id, request_user=user)
```

**Direct Query Attempt (Residual Check)**:
```python
def test_no_direct_organization_queries_in_routing(self):
    """Verify B17 does not use direct Organization.objects queries"""
    import inspect
    from routing import service

    source = inspect.getsource(service)

    # Fail if direct queries found
    self.assertNotIn("Organization.objects", source)
    self.assertNotIn("Project.objects", source)
```

**Acceptance Criteria**:
- 3+ security tests pass (cross-org, project-without-org, residual check)
- All bypass attempts raise `PermissionDenied`
- Source code audit confirms no direct queries remain

---

## Definition of Done

- [ ] Audit report documenting all B17 direct queries complete
- [ ] All `Organization.objects` calls replaced with B06 service functions
- [ ] All `Project.objects` calls replaced with B07 service functions
- [ ] B06/B07 service functions verified to call `evaluate_permission()`
- [ ] 4+ integration tests pass (routing allowed/denied scenarios)
- [ ] 3+ security tests pass (bypass attempts blocked)
- [ ] Source code contains zero direct `Organization.objects` or `Project.objects` queries in B17
- [ ] Routing logic functionally equivalent (no regressions)
- [ ] Code reviewed and approved

---

## Risks & Mitigations

**Risk**: B06/B07 service layer may not exist or lacks required functions
**Mitigation**: Add missing service functions in T023, coordinate with B06/B07 owners

**Risk**: N+1 query performance regression from service layer calls
**Mitigation**: Use `select_related()` and `prefetch_related()` in service functions, monitor latency

**Risk**: Existing routing logic breaks during refactoring
**Mitigation**: Write integration tests BEFORE refactoring, ensure tests pass after each change

**Risk**: Service functions may have different return types than ORM queries
**Mitigation**: Careful type checking, update routing code to match service function signatures

---

## Reviewer Guidance

**What to Verify**:
1. Search B17 codebase for residual direct queries: `grep -r "\.objects\." src/routing/`
2. Verify all queries replaced with service function calls
3. Check service functions include `requesting_user` parameter
4. Review B06/B07 service function implementations (confirm `evaluate_permission()` calls)
5. Verify integration tests pass
6. Check security test for source code audit (T025)

**Test Validation**:
- Run: `pytest tests/integration/test_b17_routing.py tests/security/test_b17_bypass.py -v`
- Run full B17 test suite to check for regressions

**Manual Validation**:
1. Trigger notification routing for organization (e.g., POST `/api/notifications/`)
2. Verify routing calls B06 service function (check logs or debugger)
3. Verify B09 audit event created for permission check
4. Attempt to route notification for unauthorized organization → Expect `PermissionDenied`

---

## Next Work Package

After WP04 complete, proceed with **WP05 (Settings ACL Enforcement)** or move to **WP06 (403 Standardization)** if WP02-WP05 done.

## Activity Log

- 2025-12-12T13:47:53Z – claude – shell_pid=26336 – lane=doing – Started WP04 implementation - B17 routing refactor
- 2025-12-12T14:15:00Z – claude – shell_pid=26336 – lane=doing – Completed all 6 subtasks (T020-T025)
- 2025-12-12T14:05:34Z – claude – shell_pid=26336 – lane=for_review – Completed WP04 - All 6 subtasks done, tests passing

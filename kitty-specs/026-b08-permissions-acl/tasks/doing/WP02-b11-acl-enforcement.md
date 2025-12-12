---
work_package_id: WP02
title: API Enforcement - B11 Transactions/Credits
lane: "doing"
subtasks:
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
agent: "claude-implementer"
shell_pid: "26336"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
history:
  - date: 2025-12-12
    action: created
    by: spec-kitty-tasks
---

## Review Feedback

**Status**: ⚠️ **Needs Minor Fix**

**Key Issues**:
1. **Dead code bug in `HasProjectPermission.has_object_permission()`** - This method references `self.permission` which doesn't exist in `HasProjectPermission` or `HasOrganizationPermission` classes (only exists in `HasPermission`). Since the balance views use `APIView` and not viewsets, this method is never called, but it's still a code quality issue.

**What Was Done Well**:
- ✅ **Excellent permission class design**: `HasOrganizationPermission` and `HasProjectPermission` properly integrate with `evaluate_permission()` from WP01
- ✅ **Views correctly updated**: Both balance views now enforce ACL with proper `permission_classes` and `required_permission` attributes
- ✅ **Comprehensive test coverage**: 6 integration tests + 9 security tests, all verifying B09 audit events
- ✅ **Security-focused**: Tests explicitly attempt bypass scenarios (cross-org, cross-project, anonymous, etc.)
- ✅ **Permission codes added**: Both `organization.view_balance` and `project.view_balance` added to seed command
- ✅ **Clean code**: Views use service layer functions, proper error handling, good docstrings

**Action Items** (must complete before re-review):
- [ ] **Remove `has_object_permission` method** from both `HasOrganizationPermission` and `HasProjectPermission` classes - This method is unused for `APIView`-based views and contains a bug (`self.permission` doesn't exist). If object-level permissions are needed in the future, they can be added properly when needed.

**Why This Matters**:
The bug doesn't affect current functionality (the method is never called), but leaving it creates technical debt and could cause runtime errors if someone tries to use these permission classes with viewsets in the future.

**References**:
- File: `src/permissions/api/permissions.py`, lines ~257-306 (end of HasProjectPermission class)
- The `has_object_permission` method should only exist in `HasPermission` class (which has `self.permission` from `__init__`)


# WP02: API Enforcement - B11 Transactions/Credits

## Objective

Close ACL bypasses in B11 transaction/credit API endpoints by replacing `AllowAny` permission classes with proper org/project-scoped permission checks, preventing unauthorized users from viewing balance data.

## Context

**User Story**: Story 2 (Backend Developer: Apply ACL Checks Consistently - P1)

**Why This Matters**:
- B11 balance endpoints currently allow ANY authenticated user to view ANY organization's balance
- This is a critical security vulnerability exposing financial data
- Closes highest-priority ACL bypass per security audit

**Success Criteria**:
- SC-001: 100% of tenant-scoped endpoints enforce ACL checks
- SC-006: Security tests confirm zero bypasses

**Dependencies**: WP01 (requires centralized evaluator + DRF permission classes)

---

## Subtasks

### T009: Replace `AllowAny` with `HasOrganizationPermission` in `OrganizationBalanceView`

**What to Do**:
1. Open `src/transactions/api/views.py`
2. Locate `OrganizationBalanceView` class
3. Replace:
```python
class OrganizationBalanceView(APIView):
    permission_classes = [AllowAny]  # ❌ SECURITY ISSUE

    def get(self, request, organization_id):
        org = Organization.objects.get(id=organization_id)
        balance = org.get_balance()
        return Response({"balance": balance})
```

With:
```python
from permissions.api.permissions import HasOrganizationPermission

class OrganizationBalanceView(APIView):
    permission_classes = [HasOrganizationPermission]
    required_permission = "organization.view_balance"

    def get(self, request, organization_id):
        # Permission check automatically enforced by DRF + HasOrganizationPermission
        org = Organization.objects.get(id=organization_id)
        balance = org.get_balance()
        return Response({"balance": balance})
```

4. Verify `HasOrganizationPermission` class calls `evaluate_permission()` (from WP01)

**Acceptance Criteria**:
- `permission_classes` changed from `[AllowAny]` to `[HasOrganizationPermission]`
- `required_permission` attribute added
- Existing functionality preserved (balance calculation logic unchanged)
- View rejects unauthorized requests with 403

---

### T010: Replace `AllowAny` with `HasProjectPermission` in `ProjectBalanceView`

**What to Do**:
1. In same file (`src/transactions/api/views.py`), locate `ProjectBalanceView`
2. Replace:
```python
class ProjectBalanceView(APIView):
    permission_classes = [AllowAny]  # ❌ SECURITY ISSUE

    def get(self, request, project_id):
        project = Project.objects.get(id=project_id)
        balance = project.get_balance()
        return Response({"balance": balance})
```

With:
```python
from permissions.api.permissions import HasProjectPermission

class ProjectBalanceView(APIView):
    permission_classes = [HasProjectPermission]
    required_permission = "project.view_balance"

    def get(self, request, project_id):
        # Permission check automatically enforced by DRF + HasProjectPermission
        project = Project.objects.get(id=project_id)
        balance = project.get_balance()
        return Response({"balance": balance})
```

**Acceptance Criteria**:
- `permission_classes` changed to `[HasProjectPermission]`
- `required_permission` attribute added
- View rejects unauthorized requests with 403

**Parallelization**: Can run in parallel with T009 (editing different sections of same file)

---

### T011: Add `organization.view_balance` Permission Code to Fixtures

**What to Do**:
1. Open `src/permissions/fixtures/permissions.json` (or equivalent fixtures file)
2. Add new permission entry:
```json
{
  "model": "permissions.permission",
  "pk": "organization.view_balance",
  "fields": {
    "code": "organization.view_balance",
    "name": "View Organization Balance",
    "description": "Allows user to view organization transaction balance",
    "scope": "ORGANIZATION",
    "resource_type": "organization",
    "action": "view_balance"
  }
}
```

3. Run fixtures to populate database:
```bash
python manage.py loaddata permissions
```

**Acceptance Criteria**:
- Permission code exists in fixtures
- Database updated with new permission
- Permission queryable via `Permission.objects.get(code="organization.view_balance")`

---

### T012: Add `project.view_balance` Permission Code to Fixtures

**What to Do**:
1. In same fixtures file, add:
```json
{
  "model": "permissions.permission",
  "pk": "project.view_balance",
  "fields": {
    "code": "project.view_balance",
    "name": "View Project Balance",
    "description": "Allows user to view project transaction balance",
    "scope": "PROJECT",
    "resource_type": "project",
    "action": "view_balance"
  }
}
```

2. Reload fixtures

**Acceptance Criteria**:
- Permission code exists in fixtures
- Database updated
- Permission queryable

**Parallelization**: Can run simultaneously with T011 (different JSON entries)

---

### T013: Write Integration Tests (Allowed/Denied Scenarios)

**What to Do**:
1. Create `tests/integration/test_b11_acl.py`

2. Write test cases:

**Organization Balance - Allowed**:
```python
def test_organization_balance_view_allowed(self):
    """User with organization.view_balance permission can view balance"""
    user = self.create_user_with_permission("organization.view_balance")
    org = self.create_organization(owner=user)

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/organizations/{org.id}/balance/")

    self.assertEqual(response.status_code, 200)
    self.assertIn("balance", response.data)
    # Verify B09 audit event created (from WP01)
    audit_event = AuditEvent.objects.filter(
        event_type="permission.granted",
        permission="organization.view_balance"
    ).latest("timestamp")
    self.assertEqual(audit_event.user_id, user.id)
```

**Organization Balance - Denied**:
```python
def test_organization_balance_view_denied(self):
    """User without permission cannot view balance"""
    user = self.create_user_without_permission()
    org = self.create_organization()  # Not owned by user

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/organizations/{org.id}/balance/")

    self.assertEqual(response.status_code, 403)
    # Verify B09 audit event created with "denied" outcome
    audit_event = AuditEvent.objects.filter(
        event_type="permission.denied",
        permission="organization.view_balance"
    ).latest("timestamp")
    self.assertEqual(audit_event.user_id, user.id)
```

**Project Balance - Allowed/Denied**:
```python
def test_project_balance_view_allowed(self):
    """User with project.view_balance permission can view balance"""
    # Similar to org test above

def test_project_balance_view_denied(self):
    """User without permission cannot view project balance"""
    # Similar to org test above
```

**Acceptance Criteria**:
- 4 integration tests pass (org allowed/denied, project allowed/denied)
- Tests verify API response status codes (200 or 403)
- Tests verify B09 audit events created with correct outcome
- Tests use realistic permission assignments (via roles, not direct permission grants)

---

### T014: Write Security Tests (Bypass Attempts)

**What to Do**:
1. Create `tests/security/test_b11_bypass.py`

2. Write bypass attempt scenarios:

**Cross-Organization Balance Access**:
```python
def test_cannot_view_other_organization_balance(self):
    """User cannot view balance of organization they don't belong to"""
    user_org_a = self.create_user_in_organization("Org A")
    org_b = self.create_organization(name="Org B")

    self.client.force_authenticate(user=user_org_a)
    response = self.client.get(f"/api/organizations/{org_b.id}/balance/")

    self.assertEqual(response.status_code, 403)
    # Verify audit event captured bypass attempt
    audit_event = AuditEvent.objects.filter(
        event_type="permission.denied",
        user_id=user_org_a.id,
        organization_id=org_b.id
    ).latest("timestamp")
    self.assertIsNotNone(audit_event)
```

**Anonymous User Access**:
```python
def test_anonymous_user_cannot_view_balance(self):
    """Unauthenticated user cannot view any balance"""
    org = self.create_organization()

    response = self.client.get(f"/api/organizations/{org.id}/balance/")

    self.assertEqual(response.status_code, 401)  # Unauthenticated, not 403
```

**Project Balance Without Organization Access**:
```python
def test_cannot_view_project_balance_without_org_access(self):
    """User cannot view project balance if they lack org membership"""
    user = self.create_user()
    org = self.create_organization()
    project = self.create_project(organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/projects/{project.id}/balance/")

    self.assertEqual(response.status_code, 403)
```

**Acceptance Criteria**:
- 3+ security tests pass (cross-org, anonymous, project-without-org)
- Tests explicitly attempt to bypass ACL
- All bypass attempts result in 403 (or 401 for unauthenticated)
- Audit events capture all bypass attempts

---

## Definition of Done

- [ ] `OrganizationBalanceView` uses `HasOrganizationPermission` class
- [ ] `ProjectBalanceView` uses `HasProjectPermission` class
- [ ] Both views have `required_permission` attributes
- [ ] Permission codes `organization.view_balance` and `project.view_balance` in fixtures
- [ ] 4 integration tests pass (allowed/denied for org + project)
- [ ] 3+ security tests pass (bypass attempts all blocked)
- [ ] All tests verify B09 audit events created
- [ ] No regressions in existing B11 tests
- [ ] Code reviewed and approved

---

## Risks & Mitigations

**Risk**: Breaking existing API consumers (clients expecting AllowAny)
**Mitigation**: Coordinate with frontend team, add migration guide to docs, monitor 403 error rates in observability

**Risk**: Permission fixture conflicts with existing data
**Mitigation**: Check for duplicate permission codes before running fixtures, use migrations if needed

**Risk**: Performance impact from permission checks on high-traffic endpoints
**Mitigation**: Leverage Redis cache from WP01 (5-minute TTL), monitor latency via django-prometheus

---

## Reviewer Guidance

**What to Verify**:
1. No `AllowAny` permission classes remain in `src/transactions/api/views.py`
2. Both views have `permission_classes` and `required_permission` attributes
3. Permission codes exist in fixtures and match view attributes exactly
4. Integration tests cover both success (200) and denial (403) cases
5. Security tests explicitly attempt bypass scenarios (cross-org, anonymous, etc.)
6. Audit events captured for both allowed and denied scenarios

**Test Validation**:
- Run: `pytest tests/integration/test_b11_acl.py tests/security/test_b11_bypass.py -v`
- Verify all tests pass
- Run with `--cov` to ensure new code paths covered

**Manual Validation**:
1. Start dev server with user A in Org A
2. Attempt to access `/api/organizations/{org_b_id}/balance/` → Expect 403
3. Verify AuditEvent created with `event_type="permission.denied"`
4. Access own org balance → Expect 200 + audit event with `event_type="permission.granted"`

---

## Next Work Package

After WP02 complete, proceed with **WP03 (B16 ACL Enforcement)**, **WP04 (B17 Routing Refactor)**, or **WP05 (Settings ACL Enforcement)** in parallel (all follow same pattern).

## Activity Log

- 2025-12-12T12:50:59Z – claude-implementer – shell_pid=26336 – lane=doing – Started WP02 implementation - B11 ACL Enforcement
- 2025-12-12T12:59:10Z – claude-implementer – shell_pid=26336 – lane=for_review – Completed WP02: B11 ACL enforcement with org/project balance permissions, integration tests, and security tests
- 2025-12-12T13:05:00Z – claude-reviewer – shell_pid=26336 – lane=planned – Code review complete: Minor fix needed - remove unused has_object_permission methods from HasOrganizationPermission and HasProjectPermission classes (dead code with bug)
- 2025-12-12T13:03:56Z – claude-reviewer – shell_pid=26336 – lane=planned – Code review complete: Minor fix needed - remove unused has_object_permission methods
- 2025-12-12T13:07:40Z – claude-implementer – shell_pid=26336 – lane=doing – Addressing review feedback: Removing has_object_permission methods

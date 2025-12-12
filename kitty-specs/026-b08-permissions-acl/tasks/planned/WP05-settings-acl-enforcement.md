---
work_package_id: WP05
title: API Enforcement - Settings APIs
lane: planned
subtasks:
  - T026
  - T027
  - T028
  - T029
  - T030
history:
  - date: 2025-12-12
    action: created
    by: spec-kitty-tasks
---

# WP05: API Enforcement - Settings APIs

## Objective

Add ACL checks to settings API views (GET/PUT `/api/settings/{key}/`) to enforce organization and project-scoped permission checks, preventing unauthorized users from viewing or modifying settings.

## Context

**User Story**: Story 2 (Backend Developer: Apply ACL Checks Consistently - P1)

**Why This Matters**:
- Settings APIs control critical configuration for organizations/projects (e.g., notification preferences, feature flags)
- Lack of ACL enforcement allows unauthorized configuration changes
- Settings leakage can expose sensitive organizational data

**Success Criteria**:
- SC-001: 100% of tenant-scoped endpoints enforce ACL checks
- SC-006: Security tests confirm zero bypasses

**Dependencies**: WP01 (requires centralized evaluator + DRF permission classes)

---

## Subtasks

### T026: Add ACL Checks to Settings API Views (GET `/api/settings/{key}/`)

**What to Do**:
1. Open `src/settings/api/views.py` (or equivalent settings module)
2. Locate settings GET view (e.g., `SettingsRetrieveView` or `SettingsViewSet.retrieve()`)
3. Add permission class:
```python
from permissions.api.permissions import HasOrganizationPermission, HasProjectPermission

class SettingsRetrieveView(APIView):
    permission_classes = [HasOrganizationPermission]  # ✅ NEW (or HasProjectPermission based on scope)
    required_permission = "settings.view"  # ✅ NEW

    def get(self, request, key):
        # Determine scope from request (org_id or project_id in URL or query params)
        org_id = request.query_params.get("organization_id")
        project_id = request.query_params.get("project_id")

        # Permission already checked by DRF + permission class
        # Fetch setting scoped to org or project
        if org_id:
            setting = Setting.objects.get(key=key, organization_id=org_id)
        elif project_id:
            setting = Setting.objects.get(key=key, project_id=project_id)
        else:
            # Global setting (requires GLOBAL scope permission)
            if not evaluate_permission(
                user=request.user,
                permission="settings.view",
                context={"scope": "GLOBAL"}
            ):
                raise PermissionDenied({"error": "forbidden", "permission": "settings.view"})
            setting = Setting.objects.get(key=key, organization_id=None, project_id=None)

        return Response({"key": setting.key, "value": setting.value})
```

4. Handle multi-scope scenarios (global, org, project)

**Acceptance Criteria**:
- GET endpoint enforces `settings.view` permission
- Scoped correctly (org/project/global)
- Returns 403 for unauthorized access
- Returns 200 with setting value for authorized users

---

### T027: Add ACL Checks to Settings API Views (PUT `/api/settings/{key}/`)

**What to Do**:
1. In same file, locate settings PUT view (e.g., `SettingsUpdateView` or `SettingsViewSet.update()`)
2. Add permission class:
```python
class SettingsUpdateView(APIView):
    permission_classes = [HasOrganizationPermission]  # Or HasProjectPermission
    required_permission = "settings.edit"  # ✅ NEW (different permission for write)

    def put(self, request, key):
        org_id = request.query_params.get("organization_id")
        project_id = request.query_params.get("project_id")

        # Permission already checked by DRF + permission class
        if org_id:
            setting = Setting.objects.get(key=key, organization_id=org_id)
        elif project_id:
            setting = Setting.objects.get(key=key, project_id=project_id)
        else:
            # Global setting (requires GLOBAL scope permission)
            if not evaluate_permission(
                user=request.user,
                permission="settings.edit",
                context={"scope": "GLOBAL"}
            ):
                raise PermissionDenied({"error": "forbidden", "permission": "settings.edit"})
            setting = Setting.objects.get(key=key, organization_id=None, project_id=None)

        setting.value = request.data.get("value")
        setting.save()

        return Response({"key": setting.key, "value": setting.value})
```

**Acceptance Criteria**:
- PUT endpoint enforces `settings.edit` permission
- Scoped correctly (org/project/global)
- Returns 403 for unauthorized edit attempts
- Returns 200 with updated setting for authorized users

---

### T028: Add Permission Codes `settings.view` and `settings.edit` to B08 Fixtures

**What to Do**:
1. Open `src/permissions/fixtures/permissions.json`
2. Add two permission entries:
```json
{
  "model": "permissions.permission",
  "pk": "settings.view",
  "fields": {
    "code": "settings.view",
    "name": "View Settings",
    "description": "Allows user to view organization/project settings",
    "scope": "ORGANIZATION",
    "resource_type": "setting",
    "action": "view"
  }
},
{
  "model": "permissions.permission",
  "pk": "settings.edit",
  "fields": {
    "code": "settings.edit",
    "name": "Edit Settings",
    "description": "Allows user to modify organization/project settings",
    "scope": "ORGANIZATION",
    "resource_type": "setting",
    "action": "edit"
  }
}
```

3. Run fixtures:
```bash
python manage.py loaddata permissions
```

**Acceptance Criteria**:
- Both permission codes exist in fixtures
- Database updated
- Permissions queryable

---

### T029: Write Integration Tests for Settings APIs (Org/Project Scoped Scenarios)

**What to Do**:
1. Create `tests/integration/test_settings_acl.py`

2. Write test cases:

**Organization Settings - View Allowed**:
```python
def test_view_organization_setting_allowed(self):
    """User with settings.view permission can view org settings"""
    user = self.create_user_with_permission("settings.view")
    org = user.organizations.first()
    setting = Setting.objects.create(key="notification_enabled", value="true", organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/settings/{setting.key}/?organization_id={org.id}")

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["value"], "true")
```

**Organization Settings - View Denied**:
```python
def test_view_organization_setting_denied(self):
    """User without permission cannot view org settings"""
    user = self.create_user_without_permission()
    org = self.create_organization()
    setting = Setting.objects.create(key="notification_enabled", value="true", organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/settings/{setting.key}/?organization_id={org.id}")

    self.assertEqual(response.status_code, 403)
```

**Organization Settings - Edit Allowed**:
```python
def test_edit_organization_setting_allowed(self):
    """User with settings.edit permission can modify org settings"""
    user = self.create_user_with_permission("settings.edit")
    org = user.organizations.first()
    setting = Setting.objects.create(key="notification_enabled", value="true", organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.put(
        f"/api/settings/{setting.key}/?organization_id={org.id}",
        {"value": "false"}
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["value"], "false")
    setting.refresh_from_db()
    self.assertEqual(setting.value, "false")
```

**Organization Settings - Edit Denied**:
```python
def test_edit_organization_setting_denied(self):
    """User without permission cannot modify org settings"""
    user = self.create_user_with_permission("settings.view")  # View only, no edit
    org = user.organizations.first()
    setting = Setting.objects.create(key="notification_enabled", value="true", organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.put(
        f"/api/settings/{setting.key}/?organization_id={org.id}",
        {"value": "false"}
    )

    self.assertEqual(response.status_code, 403)
    setting.refresh_from_db()
    self.assertEqual(setting.value, "true")  # Unchanged
```

**Project Settings - View/Edit Allowed/Denied**:
```python
# Similar tests for project-scoped settings
```

**Global Settings - Requires GLOBAL Scope**:
```python
def test_view_global_setting_requires_global_permission(self):
    """Viewing global settings requires GLOBAL scope permission"""
    user = self.create_user_with_permission("settings.view", scope="ORGANIZATION")  # Org-scoped only
    setting = Setting.objects.create(key="platform_mode", value="production")  # No org/project

    self.client.force_authenticate(user=user)
    response = self.client.get(f"/api/settings/{setting.key}/")

    self.assertEqual(response.status_code, 403)  # Org-scoped permission insufficient
```

**Acceptance Criteria**:
- 8+ integration tests pass (org view/edit allowed/denied, project view/edit, global scope)
- Tests verify scope enforcement (org, project, global)
- Tests verify B09 audit events created

---

### T030: Write Security Tests for Settings APIs (Cross-Scope Access Attempts)

**What to Do**:
1. Create `tests/security/test_settings_bypass.py`

2. Write bypass scenarios:

**Cross-Organization Settings Access**:
```python
def test_cannot_view_other_organization_settings(self):
    """User cannot view settings from organization they don't belong to"""
    user_a = self.create_user_in_organization("Org A")
    org_b = Organization.objects.create(name="Org B")
    setting_b = Setting.objects.create(key="api_key", value="secret", organization=org_b)

    self.client.force_authenticate(user=user_a)
    response = self.client.get(f"/api/settings/{setting_b.key}/?organization_id={org_b.id}")

    self.assertEqual(response.status_code, 403)
```

**Cross-Organization Settings Modification**:
```python
def test_cannot_edit_other_organization_settings(self):
    """User cannot modify settings from organization they don't belong to"""
    user_a = self.create_user_in_organization("Org A")
    org_b = Organization.objects.create(name="Org B")
    setting_b = Setting.objects.create(key="api_key", value="secret", organization=org_b)

    self.client.force_authenticate(user=user_a)
    response = self.client.put(
        f"/api/settings/{setting_b.key}/?organization_id={org_b.id}",
        {"value": "hacked"}
    )

    self.assertEqual(response.status_code, 403)
    setting_b.refresh_from_db()
    self.assertEqual(setting_b.value, "secret")  # Unchanged
```

**Privilege Escalation - View-Only User Attempts Edit**:
```python
def test_view_only_user_cannot_edit_settings(self):
    """User with settings.view cannot escalate to settings.edit"""
    user = self.create_user_with_permission("settings.view")  # View only
    org = user.organizations.first()
    setting = Setting.objects.create(key="api_key", value="secret", organization=org)

    self.client.force_authenticate(user=user)
    response = self.client.put(
        f"/api/settings/{setting.key}/?organization_id={org.id}",
        {"value": "hacked"}
    )

    self.assertEqual(response.status_code, 403)
    setting.refresh_from_db()
    self.assertEqual(setting.value, "secret")
```

**Global Settings Escalation**:
```python
def test_org_admin_cannot_edit_global_settings(self):
    """Org admin cannot edit global platform settings"""
    user = self.create_user_with_permission("settings.edit", scope="ORGANIZATION")
    setting = Setting.objects.create(key="platform_mode", value="production")

    self.client.force_authenticate(user=user)
    response = self.client.put(
        f"/api/settings/{setting.key}/",
        {"value": "development"}
    )

    self.assertEqual(response.status_code, 403)
    setting.refresh_from_db()
    self.assertEqual(setting.value, "production")
```

**Acceptance Criteria**:
- 4+ security tests pass (cross-org view/edit, privilege escalation, global escalation)
- All bypass attempts result in 403
- Settings remain unchanged after failed edit attempts
- Audit events capture all bypass attempts

---

## Definition of Done

- [ ] GET `/api/settings/{key}/` enforces `settings.view` permission
- [ ] PUT `/api/settings/{key}/` enforces `settings.edit` permission
- [ ] Permission codes `settings.view` and `settings.edit` in fixtures
- [ ] Scope enforcement works (org/project/global)
- [ ] 8+ integration tests pass (view/edit allowed/denied, all scopes)
- [ ] 4+ security tests pass (cross-org, privilege escalation, global escalation)
- [ ] B09 audit events logged for all permission checks
- [ ] Code reviewed and approved

---

## Risks & Mitigations

**Risk**: Settings model may not have organization_id/project_id fields (flat structure)
**Mitigation**: Add foreign keys if needed, or use metadata field for scope, consult B10 settings module design

**Risk**: Global settings accessible to all authenticated users (too permissive)
**Mitigation**: Explicit GLOBAL scope permission check, restrict to platform admins only

**Risk**: Settings API may use custom authentication (not DRF)
**Mitigation**: Adapt implementation to settings module architecture, ensure evaluator still called

---

## Reviewer Guidance

**What to Verify**:
1. Both GET and PUT endpoints have `permission_classes` and `required_permission` attributes
2. Scope determination logic correct (org/project/global based on request params)
3. Global settings explicitly check GLOBAL scope permission
4. Integration tests cover all three scopes (org, project, global)
5. Security tests verify cross-org access blocked and privilege escalation prevented
6. Audit events logged for all permission checks

**Test Validation**:
- Run: `pytest tests/integration/test_settings_acl.py tests/security/test_settings_bypass.py -v`
- Check for any failures indicating bypasses or scope leaks

**Manual Validation**:
1. Create setting in Org A: `api_key=secret`
2. Authenticate as user in Org B
3. GET `/api/settings/api_key/?organization_id={org_a_id}` → Expect 403
4. PUT `/api/settings/api_key/?organization_id={org_a_id}` with new value → Expect 403, value unchanged
5. Verify audit events logged for both attempts

---

## Next Work Package

After WP05 complete, proceed to **WP06 (403 Standardization)** to implement structured error responses and permissions endpoint.

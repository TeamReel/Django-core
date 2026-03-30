# Manual Test: B33 Brand Identity Manager

**Module:** #042 B33 — Brand Identity Manager
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `042-brand-identity-manager` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the brand identity system:
1. Creates and manages BrandProfiles for organisations and projects
2. Stores and retrieves DesignTokens (colors, fonts, spacing)
3. Handles BrandAssets linked to B22 File storage
4. Implements merge inheritance (project inherits org tokens, can override)
5. Enforces XOR constraint (profile linked to org OR project, not both)

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate branding`
- [ ] Test user with staff permissions created
- [ ] At least one Organisation created
- [ ] At least one Project created under that organisation
- [ ] B22 File storage configured (for asset uploads)

---

## Test Scenarios

### 1. BrandProfile CRUD

#### 1.1 Create Organisation Brand Profile
- [ ] POST `/api/branding/profiles/`
  ```json
  {
    "organisation": "{org_uuid}",
    "name": "Test Org Brand"
  }
  ```
- [ ] Verify 201 response with profile ID
- [ ] Verify `project` is null (XOR constraint)

#### 1.2 Create Project Brand Profile
- [ ] POST `/api/branding/profiles/`
  ```json
  {
    "project": "{project_uuid}",
    "name": "Test Project Brand"
  }
  ```
- [ ] Verify 201 response
- [ ] Verify `organisation` is null

#### 1.3 XOR Constraint Violation
- [ ] POST `/api/branding/profiles/` with BOTH org and project set
- [ ] Verify 400 error with clear message about XOR constraint

#### 1.4 List Profiles
- [ ] GET `/api/branding/profiles/`
- [ ] Verify both org and project profiles appear
- [ ] Check `is_active` defaults to True

---

### 2. DesignToken Management

#### 2.1 Create Tokens on Org Brand
- [ ] POST `/api/branding/profiles/{org_profile_id}/tokens/`
  ```json
  {
    "key": "primary_color",
    "value": "#D2122E",
    "type": "color",
    "description": "Main brand color"
  }
  ```
- [ ] Verify 201 response
- [ ] Repeat for: `secondary_color`, `font_heading`, `spacing_base`

#### 2.2 Create Override Token on Project Brand
- [ ] POST `/api/branding/profiles/{project_profile_id}/tokens/`
  ```json
  {
    "key": "primary_color",
    "value": "#1E40AF",
    "type": "color",
    "description": "Project override"
  }
  ```
- [ ] Verify project has its own primary_color value

#### 2.3 Unique Key Constraint
- [ ] POST duplicate key on same profile
- [ ] Verify 400 error (unique constraint violation)

---

### 3. Token Resolution (Merge Inheritance)

#### 3.1 Resolve Project Tokens (Merged)
- [ ] GET `/api/branding/tokens/resolve/?project={project_uuid}`
- [ ] Verify response structure:
  ```json
  {
    "project": "uuid",
    "organisation": "uuid",
    "tokens": {
      "primary_color": "#1E40AF",  // Project override
      "secondary_color": "#FBBF24", // Inherited from org
      "font_heading": "Inter"       // Inherited from org
    },
    "source": "merged",
    "project_brand_id": "uuid",
    "org_brand_id": "uuid"
  }
  ```
- [ ] Confirm project tokens override org tokens
- [ ] Confirm org tokens are inherited when not overridden

#### 3.2 Resolve with Assets
- [ ] GET `/api/branding/tokens/resolve/?project={uuid}&include_assets=true`
- [ ] Verify assets array is included in response

#### 3.3 Resolve for Org-Only
- [ ] GET `/api/branding/tokens/resolve/?organisation={org_uuid}`
- [ ] Verify only org tokens returned (no merge needed)

---

### 4. BrandAsset Management

#### 4.1 Upload Logo Asset
- [ ] First upload file via B22: POST `/api/v1/files/upload/`
- [ ] Then link as asset: POST `/api/branding/profiles/{id}/assets/`
  ```json
  {
    "file": "{file_uuid}",
    "asset_type": "logo",
    "alt_text": "Company Logo"
  }
  ```
- [ ] Verify 201 response

#### 4.2 One Asset Per Type Constraint
- [ ] POST another `logo` asset to same profile
- [ ] Verify 400 error (one asset per type per profile)

#### 4.3 List Assets
- [ ] GET `/api/branding/profiles/{id}/assets/`
- [ ] Verify logo asset appears with file reference

---

### 5. Permission Checks

#### 5.1 Org Admin Access
- [ ] Login as org admin
- [ ] Verify can create/edit org brand profile
- [ ] Verify can create/edit project brand profiles in org

#### 5.2 Project Member Access
- [ ] Login as project member (not org admin)
- [ ] Verify can view resolved tokens
- [ ] Verify cannot edit org brand profile
- [ ] Verify can edit project brand if project admin

#### 5.3 Anonymous Access
- [ ] Attempt GET without auth
- [ ] Verify 401 Unauthorized

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Profile CRUD | Create, read, update, delete work correctly |
| XOR Constraint | Cannot link profile to both org AND project |
| Token Creation | Tokens stored with correct type and value |
| Merge Inheritance | Project inherits org, overrides where set |
| Asset Linking | Files from B22 linkable as brand assets |
| Permissions | Proper access control per role |

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________

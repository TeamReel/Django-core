# Frontend Permission Fix - Coach Role Read-Only Access

## Problem
When logged in as `tuchel@bayern.de` (Coach role, member of Bundesliga), the UI was incorrectly showing:
- "New Project" button on Projects list page
- "Edit" and "Delete" action buttons on project rows
- Edit/Delete buttons on project detail pages

The issue: The frontend was only checking `org.user_role === 'admin'` in an ad-hoc manner, scattered across multiple pages. The Coach role (stored in RoleAssignment table) was not being properly mapped to read-only permissions. The membership role is `'member'`, but the UI assumed all members should see write actions.

## Solution

### 1. Centralized Permission Helper (`src/utils/permissions.ts`)

Created a single source of truth for permission checks:

```typescript
export function canPerformAction(
  action: Action,
  resource: Resource,
  context: PermissionContext
): boolean
```

**Permission Model**:
- **Super Admin**: Can do anything (global `isSuperAdmin` flag)
- **Org Admin** (`user_role === 'admin'`): Can create/edit/delete within their organization
- **Org Member** (`user_role === 'member'` or any other role): **Read-only** access
  - This includes roles like "Coach" which are stored in RoleAssignment but don't grant org-level write permissions

**Helper Functions**:
- `canCreateProject()` - Check project creation
- `canEditProject()` - Check project editing
- `canDeleteProject()` - Check project deletion
- `canEditOrganisation()` - Check org editing
- `canDeleteOrganisation()` - Check org deletion
- `canInviteMembers()` - Check member invitation
- `canManageMembers()` - Check member management

### 2. Updated Pages

**ProjectsPage** ([src/pages/identity/ProjectsPage.tsx](examples/demo-shell/src/pages/identity/ProjectsPage.tsx)):
- Hide "New Project" button if `!canCreateProject()`
- Hide "Edit" button if `!canEditProject()`
- Hide "Delete" button if `!canDeleteProject()`

**ProjectDetailPage** ([src/pages/projects/ProjectDetailPage.tsx](examples/demo-shell/src/pages/projects/ProjectDetailPage.tsx)):
- Hide "Edit Project" button if `!canEditProject()`
- Hide "Delete Project" button if `!canDeleteProject()`

**OrganisationDetailPage** ([src/pages/identity/OrganisationDetailPage.tsx](examples/demo-shell/src/pages/identity/OrganisationDetailPage.tsx)):
- Hide "Edit" org button if `!canEditOrganisation()`
- Hide "Delete" org button if `!canDeleteOrganisation()`
- Hide "Add Member" form if `!canInviteMembers()`
- Hide member action buttons if `!canManageMembers()`
- Hide project Edit/Delete buttons if user lacks permissions

### 3. Role Mapping Clarification

**Backend Role Structure**:
- **Membership**: Defines org-level role (`admin` or `member`)
- **RoleAssignment**: Defines granular roles like `Coach`, scoped to projects/orgs

**Frontend Permission Logic**:
- Only checks `user_role` from Membership (via organisations context)
- `user_role === 'admin'` → write access
- `user_role === 'member'` (or undefined/other) → read-only
- Coach role (from RoleAssignment) is NOT used for org-level write permissions

### 4. Tests

Created `src/utils/permissions.test.ts` with comprehensive test coverage:
- Super admin permissions (all actions allowed)
- Org admin permissions (write actions allowed)
- Org member permissions (only read allowed, no write)
- No role / no org context (all actions denied)

## Acceptance Criteria ✅

When logged in as `tuchel@bayern.de` (Coach / Org Member in Bundesliga):
- ✅ Projects list page: Only "View" button visible, no "New Project", "Edit", or "Delete"
- ✅ Project detail page: Only "Back" and "View Organisation" visible, no "Edit" or "Delete"
- ✅ Organisation detail page: No "Edit" or "Delete" org buttons, no member management
- ✅ All write actions return 403 from backend (unchanged, already enforced)

## Testing Instructions

1. **Backend verification** (already confirmed):
   ```bash
   python check_tuchel.py
   ```
   Output: Tuchel is `member` in Bundesliga, has `Coach` role in Bayern München project

2. **Frontend verification**:
   - Login as `tuchel@bayern.de` / `password`
   - Navigate to Bundesliga → Projects
   - Verify no "New Project" button in header
   - Verify project rows show only "View" (no Edit/Delete)
   - Click into a project detail
   - Verify only "Back to Projects" and "View Organisation" visible
   - No Edit or Delete buttons

3. **Unit tests**:
   ```bash
   cd examples/demo-shell
   pnpm test permissions
   ```

4. **Admin comparison**:
   - Login as admin (e.g., `admin@example.com`)
   - Verify they CAN see New Project, Edit, Delete everywhere

## Files Changed

- ✅ `examples/demo-shell/src/utils/permissions.ts` (new)
- ✅ `examples/demo-shell/src/utils/permissions.test.ts` (new)
- ✅ `examples/demo-shell/src/pages/identity/ProjectsPage.tsx` (updated)
- ✅ `examples/demo-shell/src/pages/projects/ProjectDetailPage.tsx` (updated)
- ✅ `examples/demo-shell/src/pages/identity/OrganisationDetailPage.tsx` (updated)

## Architecture Notes

**Why not use RoleAssignment roles (e.g. Coach) directly?**
- RoleAssignment is project-scoped and contains granular permissions
- Org-level write permissions (create projects, manage org) should only be granted to org admins
- Coach role grants project-specific permissions (view project details, etc.), not org-level write access
- Frontend uses the simpler Membership.role (`user_role` in API response) for org-level UI gating
- Backend enforces granular permissions via B08's permission system

**Why centralized helper vs scattered checks?**
- Single source of truth prevents inconsistency
- Easier to test and maintain
- Future permission changes only require updating one file
- Type-safe and reusable across all pages

**Frontend vs Backend enforcement:**
- Frontend: Hides UI elements users shouldn't interact with (better UX)
- Backend: Enforces all mutations with 403 errors (security boundary)
- Both layers are necessary: UI for UX, API for security

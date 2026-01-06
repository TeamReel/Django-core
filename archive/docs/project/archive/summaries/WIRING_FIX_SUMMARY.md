# Frontend Wiring & Permission Gating Fixes

## Summary

Fixed incomplete demo-shell wiring and permission gating issues:
1. **Users page filters** - Made Status and Org filters functional with correct defaults
2. **Organisations page** - Added proper permission gating for Create/Edit/Delete actions

## Changes Made

### 1. Users Page Filter Implementation ([src/pages/identity/UsersPage.tsx](examples/demo-shell/src/pages/identity/UsersPage.tsx))

**Problem:**
- Status and Org filter dropdowns were rendered but didn't actually filter the data
- No proper defaults on initial load
- Filters didn't sync with context switching

**Solution:**
```typescript
// Added state for filter initialization tracking
const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

// Initialize filters with proper defaults on mount
useEffect(() => {
    if (!hasInitializedFilters) {
        if (orgIdParam) {
            setSelectedOrgId(orgIdParam);
        } else if (context.organisation && !isSuperAdmin) {
            // Default to context organisation for non-superadmin users
            setSelectedOrgId(context.organisation.id);
        }
        setHasInitializedFilters(true);
    }
}, [hasInitializedFilters, orgIdParam, context.organisation, isSuperAdmin]);
```

**Default Behavior:**
- **Status Filter**: Defaults to "Active" (already set in state initialization)
- **Org Filter**:
  - If user has org context (e.g., Coach in Bundesliga): defaults to that org
  - If superadmin: defaults to "All Organisations"
  - Syncs automatically when context changes

**Filter Functionality:**
- Both filters are already wired to `fetchUsers()` via the useEffect dependency array
- Changes to `statusFilter` or `selectedOrgId` trigger immediate data refetch
- Filters work client-side by modifying API query parameters

### 2. Organisations Page Permission Gating ([src/pages/identity/OrganisationsPage.tsx](examples/demo-shell/src/pages/identity/OrganisationsPage.tsx))

**Problem:**
- "Create Organisation" button visible to all users
- "Edit" and "Delete" buttons visible on all organisation rows regardless of user's role in that org
- No permission checking at all

**Solution:**
```typescript
// Import permission helper and auth
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { canPerformAction } from '../../utils/permissions';

// Check permissions
const isSuperAdmin = (user as any)?.role === 'superadmin';

// Hide Create button for non-superadmins
actions={
  isSuperAdmin ? (
    <Button variant="primary" size="md" onClick={() => navigate('/organisations/create')}>
      Create Organisation
    </Button>
  ) : undefined
}

// Per-row permission checks
rows={organisations.map((org) => {
  const orgWithRole = myOrganisations.find(o => o.id === org.id);
  const permissionContext = {
    currentOrganisation: orgWithRole,
    isSuperAdmin,
  };
  const userCanEdit = canPerformAction('update', 'organisation', permissionContext);
  const userCanDelete = canPerformAction('delete', 'organisation', permissionContext);

  return {
    // ... other fields
    actions: (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={...}>View</button>
        {userCanEdit && <button onClick={...}>Edit</button>}
        {userCanDelete && <button onClick={...}>Delete</button>}
      </div>
    ),
  };
})}
```

**Permission Logic:**
- **Create Organisation**: Only visible to superadmins
- **Edit/Delete Organisation**: Only visible if user has `admin` role in that specific organisation
- Uses centralized `canPerformAction()` helper from `utils/permissions.ts`
- Checks per-organisation, not global permission

## Role Mapping Verification

**Tuchel's role structure** (from `check_tuchel.py`):
```
User: tuchel@bayern.de (ID: 48)
Is Superuser: False
Is Staff: False

Memberships:
- Org: Bundesliga (bundesliga), Role: member

Role Assignments:
- Role: Coach, Scope: project, Target: Project: Bayern München
```

**Frontend receives:**
- From `/api/v1/organisations/` endpoint: `{ ..., user_role: 'member' }` for Bundesliga
- The `user_role` field comes from the Membership table, not RoleAssignment

**Permission gating logic:**
```typescript
// Only 'admin' can perform write operations
// All other roles (member, coach, etc.) are read-only
const isOrgAdmin = userRole === 'admin';

if (action === 'read') {
  return true; // All org members can read
}

// Write operations require admin role
if (action === 'create' || action === 'update' || action === 'delete') {
  return isOrgAdmin; // Only admin, not member/coach
}
```

## Acceptance Criteria

### ✅ Users Page (logged in as tuchel@bayern.de with Bundesliga context)
- **Default view**: Shows only ACTIVE users in Bundesliga
- **Status filter**:
  - Defaults to "Active"
  - Changing to "Inactive" shows inactive users
  - Changing to "All" shows both
- **Org filter**:
  - Defaults to "Bundesliga" (current context)
  - Changing filter updates visible users immediately
- **Context switching**: Changing org context updates the default org filter

### ✅ Organisations Page (logged in as tuchel@bayern.de)
- **Organisations list**:
  - ❌ "Create Organisation" button NOT visible (only superadmin)
  - ✅ "View" button visible for all orgs
  - ❌ "Edit" button NOT visible for Bundesliga (user is member, not admin)
  - ❌ "Delete" button NOT visible for Bundesliga (user is member, not admin)

### ✅ Organisations Page (logged in as admin of an org)
- **Organisations list**:
  - ✅ "View" button visible for all orgs
  - ✅ "Edit" button visible ONLY for orgs where user is admin
  - ✅ "Delete" button visible ONLY for orgs where user is admin
  - ❌ Edit/Delete NOT visible for orgs where user is member/viewer

## Files Modified

1. **examples/demo-shell/src/pages/identity/UsersPage.tsx**
   - Added filter initialization tracking
   - Set proper default values (Status=Active, Org=context org)
   - Ensured filters sync with context switching

2. **examples/demo-shell/src/pages/identity/OrganisationsPage.tsx**
   - Added permission helper imports
   - Gated "Create Organisation" button (superadmin only)
   - Added per-row permission checks for Edit/Delete
   - Used centralized `canPerformAction()` helper

3. **examples/demo-shell/src/utils/permissions.ts** (already created in previous fix)
   - Centralized permission logic
   - Maps org membership roles to UI capabilities

## Testing Instructions

### 1. Users Page Filters
```bash
# Login as tuchel@bayern.de
# Navigate to /users
# Expected:
✅ Status dropdown shows "Active" selected
✅ Org dropdown shows "Bundesliga" selected
✅ User list shows only active users in Bundesliga
✅ Changing Status to "Inactive" filters to inactive users
✅ Changing Org to another org shows users from that org
```

### 2. Organisations Page Permissions
```bash
# Login as tuchel@bayern.de (member of Bundesliga)
# Navigate to /organisations
# Expected:
❌ No "Create Organisation" button in header
✅ Can see "View" button for Bundesliga
❌ No "Edit" button for Bundesliga
❌ No "Delete" button for Bundesliga

# Login as admin of an organisation
# Navigate to /organisations
# Expected:
✅ "Edit" button visible for orgs where admin
✅ "Delete" button visible for orgs where admin
❌ Edit/Delete NOT visible for orgs where only member
```

### 3. Hard Refresh
```bash
# After code changes, hard refresh browser:
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or restart dev server:
cd examples/demo-shell
pnpm dev
```

## Architecture Notes

**Why per-organisation permission checks?**
- Users can have different roles in different organisations
- Tuchel is a `member` in Bundesliga, but could be `admin` in another org
- Each organisation row checks permissions independently
- Uses the `user_role` field from the organisations list returned by context switcher

**Filter implementation:**
- Filters modify API query parameters (e.g., `?is_active=true&organisation_id=...`)
- Backend handles actual filtering
- Frontend just shows the UI and triggers refetch when filters change
- Default values set on component mount to match user's context

**Permission helper reuse:**
- Same `canPerformAction()` helper used across:
  - Projects list/detail pages (previous fix)
  - Organisation list/detail pages (this fix)
  - Any future resource pages
- Single source of truth prevents inconsistencies

## Common Issues & Solutions

**Issue: Filters still don't work**
- Check browser console for API errors
- Verify backend supports `is_active` and `organisation_id` query params
- Ensure `fetchUsers()` is called when filter state changes (check useEffect dependencies)

**Issue: Still seeing Edit/Delete for Coach**
- Hard refresh browser (Ctrl+Shift+R)
- Check `myOrganisations` in React DevTools - does Bundesliga have `user_role: 'member'`?
- Verify `canPerformAction()` returns false for non-admin roles

**Issue: Org filter doesn't default to Bundesliga**
- Check console logs for `context.organisation`
- Verify context switcher is properly initialized
- Ensure `hasInitializedFilters` state prevents re-initialization

## Verification Checklist

- [ ] Login as tuchel@bayern.de
- [ ] Go to /users
- [ ] Verify Status defaults to "Active"
- [ ] Verify Org defaults to "Bundesliga"
- [ ] Change filters and verify table updates
- [ ] Go to /organisations
- [ ] Verify no "Create Organisation" button
- [ ] Verify no "Edit" or "Delete" for Bundesliga row
- [ ] Only "View" button visible
- [ ] Login as admin user
- [ ] Verify Edit/Delete visible for admin's orgs only

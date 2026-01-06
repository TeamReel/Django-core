# Quick Verification Checklist

## Before Testing
1. Ensure backend is running: `cd src; python manage.py runserver`
2. Ensure frontend is running: `cd examples/demo-shell; pnpm dev`
3. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R) to clear cache

## Test as Coach (tuchel@bayern.de)

### Projects List Page
Navigate to: Bundesliga → Projects

**Expected Behavior:**
- ✅ "Back to Organisation" button visible
- ❌ "New Project" button NOT visible
- ✅ Project rows show "View" button
- ❌ Project rows do NOT show "Edit" button
- ❌ Project rows do NOT show "Delete" button

**Screenshot location:** See attached browser screenshot

### Project Detail Page
Click into any project (e.g., "Bayern München")

**Expected Behavior:**
- ✅ "Back to Projects" button visible
- ✅ "View Organisation" button visible
- ❌ "Edit Project" button NOT visible
- ❌ "Delete Project" button NOT visible
- ✅ Project details (name, slug, ID) are visible

### Organisation Detail Page
Navigate to: Bundesliga (organisation detail)

**Expected Behavior:**
- ✅ "Back" button visible
- ✅ "View All Users" button visible
- ❌ "Edit" (org) button NOT visible
- ❌ "Delete" (org) button NOT visible
- ❌ "Add Member" form NOT visible
- ✅ Members table shows member list
- ❌ Member rows do NOT show "Edit" or "Delete"
- ✅ Recent projects table visible
- ✅ Project rows show "View" button
- ❌ Project rows do NOT show "Edit" or "Delete"

## Test as Admin (for comparison)

Login as admin user (e.g., `admin@example.com`)

### Projects List Page
Navigate to any organisation's projects

**Expected Behavior:**
- ✅ "New Project" button IS visible
- ✅ Project rows show "View", "Edit", AND "Delete"

### Organisation Detail Page
**Expected Behavior:**
- ✅ "Edit" and "Delete" org buttons ARE visible
- ✅ "Add Member" form IS visible
- ✅ Member rows show "Edit" and "Delete"
- ✅ Project rows show "View", "Edit", AND "Delete"

## Automated Tests

```bash
cd examples/demo-shell
pnpm test permissions
```

Expected: All tests pass

## Common Issues

### Issue: Still seeing Edit/Delete buttons as Coach
**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear cookies and localStorage
3. Log out and log back in
4. Check that frontend dev server has restarted

### Issue: Tests failing
**Solution:**
1. Run `pnpm install` in examples/demo-shell
2. Check for TypeScript errors: `pnpm exec tsc --noEmit`
3. Check vitest config exists

### Issue: Backend returns 403 for View operations
**Problem:** Backend permissions not set correctly
**Solution:** Run permission setup script (if exists) or check RoleAssignment in admin

## Rollback Instructions (if needed)

If the changes cause issues:

```bash
git checkout HEAD -- examples/demo-shell/src/pages/identity/ProjectsPage.tsx
git checkout HEAD -- examples/demo-shell/src/pages/projects/ProjectDetailPage.tsx
git checkout HEAD -- examples/demo-shell/src/pages/identity/OrganisationDetailPage.tsx
rm examples/demo-shell/src/utils/permissions.ts
rm examples/demo-shell/src/utils/permissions.test.ts
```

Then restart frontend dev server.

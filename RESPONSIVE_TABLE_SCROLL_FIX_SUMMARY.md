# Responsive Design Fix Summary - Table Scrolling

## Observed Issues
- At 1024px (tablet landscape), data tables in **Organisations**, **Projects**, **Users**, and **Audit Log** pages were clipped on the right side.
- Although `overflowX: 'auto'` was added to the wrapper, the tables lacked a `minWidth` constraint, causing them to either squash columns unreadably or overflow without triggering the scrollbar properly in some contexts.

## Changes Implemented

### 1. Enforced Minimum Width
- Added `minWidth: '1000px'` to the `Table` component (or `<table>` element) in the following files:
  - `src/pages/identity/OrganisationsPage.tsx`
  - `src/pages/identity/ProjectsPage.tsx`
  - `src/pages/identity/UsersPage.tsx`
  - `src/pages/config/AuditLogPage.tsx`

### 2. Scroll Container
- Maintained the `div` wrapper with `overflowX: 'auto'` around each table.
- This combination ensures that if the viewport is narrower than 1000px (e.g., 1024px with padding), the table will maintain its width and the wrapper will provide a horizontal scrollbar.

## Verification Steps
1. **Tablet View (1024px)**:
   - Navigate to **Organisations**, **Projects**, **Users**, or **Audit Log**.
   - Resize browser to 1024px.
   - Verify that a horizontal scrollbar appears at the bottom of the table.
   - Scroll right to verify that the "Actions" column and other right-aligned content are fully accessible.
   - Verify that columns are not squashed.

2. **Mobile View (<768px)**:
   - Resize browser to mobile width.
   - Verify that the horizontal scrollbar is still present and functional.

3. **Desktop View (>1200px)**:
   - Resize browser to a large width.
   - Verify that the scrollbar disappears when the viewport is wide enough to fit the table (if > 1000px + padding).

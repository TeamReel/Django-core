# Responsive Design Fix Summary - Desktop 1920px

## Observed Issues
- At 1920px (large desktop), the data tables were "left oriented" (not stretching to fill the screen).
- This was a regression caused by the previous fix for tablet scrolling.
- The `Table` component in the design system shim was overwriting the default `width: '100%'` style with the passed `minWidth: '1000px'` style, instead of merging them.

## Changes Implemented

### 1. Style Merging in `Table` Component (`src/shims/design-system.tsx`)
- Updated the `Table` component to properly destructure the `style` prop.
- Merged the default styles (`width: '100%'`, etc.) with the passed `style` prop.
- **Result**: The table now has both `width: '100%'` AND `minWidth: '1000px'`.

## Verification Steps
1. **Desktop View (1920px)**:
   - Resize browser to 1920px.
   - Navigate to **Organisations**, **Projects**, **Users**, or **Audit Log**.
   - Verify that the table stretches to the full width of the container.
   - Verify that it is no longer "left oriented" (stuck at 1000px width).

2. **Tablet View (1024px)**:
   - Resize browser to 1024px.
   - Verify that the horizontal scrollbar still appears (because `minWidth: 1000px` is still applied).

3. **Mobile View (<768px)**:
   - Verify that horizontal scrolling still works.

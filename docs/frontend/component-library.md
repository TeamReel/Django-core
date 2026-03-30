# Component Library — UI Primitives

> Last updated: 2026-03-12

## Overview

TeamReel provides **15 UI primitive components** in `demo/src/components/ui/`. These are the building blocks for all pages. They are:

- Framework-agnostic in design (no business logic)
- Styled via CSS Modules + design tokens
- Exported from a single barrel file (`components/ui/index.ts`)
- Composable — combine primitives to build complex UIs

## Primitive Catalog

### Layout Primitives

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **Stack** | Vertical/horizontal flex container with consistent gap | `direction`, `gap`, `align` |
| **Row** | Horizontal flex row (shorthand for Stack direction=row) | `gap`, `align`, `justify` |
| **Section** | Semantic section with optional heading and padding | `title`, `description`, `children` |
| **SplitView** | Master-detail split layout | `left`, `right`, `ratio` |
| **ResponsiveGrid** | Auto-responsive grid with configurable min column width | `minWidth`, `gap` |

### Data Display

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **Card** | Surface container with shadow and border | `variant`, `padding`, `onClick` |
| **Badge** | Status/category label | `variant` (success, warning, error, info, neutral), `size` |
| **Avatar** | User/team profile image with fallback initials | `src`, `name`, `size` |
| **DataTable** | Sortable, configurable table with column definitions | `columns`, `data`, `onSort`, `onRowClick` |
| **ProgressBar** | Visual progress indicator | `value`, `max`, `variant` |

### Navigation & Actions

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **PageHeader** | Page title bar with breadcrumbs and actions | `title`, `breadcrumbs`, `actions` |
| **IconButton** | Icon-only clickable button with tooltip | `icon`, `label`, `onClick`, `variant` |

### Feedback & Overlay

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **Modal** | Overlay dialog with backdrop | `isOpen`, `onClose`, `title`, `size` |
| **ConfirmDialog** | Destructive action confirmation | `message`, `onConfirm`, `onCancel`, `variant` |
| **Toast** | Temporary notification message | `message`, `type` (success, error, info), `duration` |

## Usage Pattern

```tsx
import { Card, Badge, Stack, PageHeader } from '@/components/ui';

function MyPage() {
  return (
    <>
      <PageHeader title="Activities" breadcrumbs={[...]} />
      <Stack gap={16}>
        <Card>
          <Badge variant="success">Active</Badge>
          <p>Content here</p>
        </Card>
      </Stack>
    </>
  );
}
```

## Styling Rules for Primitives

1. **Self-contained** — Each primitive has its own `.module.css`
2. **Token-driven** — All visual properties use design tokens
3. **Variant-based** — Visual variants via props, not className overrides
4. **Composable** — Primitives accept `className` for layout positioning but **not** for visual override

```css
/* ✅ DataTable.module.css — uses tokens */
.headerCell {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--app-muted-text);
  border-bottom: 1px solid var(--app-border);
}
```

## Shared Application Components

Beyond the 15 UI primitives, larger shared components live in `demo/src/components/`:

| Component | Purpose |
|-----------|---------|
| **AppShell** | Root layout wrapper (sidebar + main content area) |
| **Sidebar** | Dual-panel navigation (Panel A + Panel B) |
| **TopNavbar** | Top bar with search, org switcher, user menu |
| **MobileBottomNav** | Fixed bottom navigation on mobile |
| **SearchBar** | Global search with keyboard shortcuts |
| **QuickActions** | Quick content creation actions (integrated in MobileBottomNav) |
| **MobileFilterSheet** | Bottom sheet for filter selection on mobile |
| **SwipeableCard** | Touch-enabled card with swipe actions |
| **OfflineBanner** | Connection status indicator |

These are business-aware (they know about the data model) but use the UI primitives internally.

## Adding a New Primitive

### Checklist

1. Create `ComponentName.tsx` + `ComponentName.module.css` in `components/ui/`
2. Style with design tokens only — no hardcoded colors/sizes
3. Support theme switching (use semantic tokens for colors)
4. 44px minimum touch target for interactive elements
5. Include ARIA attributes where needed
6. Export from `components/ui/index.ts`
7. Update this document

### Naming Convention

- PascalCase for component file and export name
- `.root` class for outermost element in the CSS module
- Descriptive variant names: `variant="success"` not `variant="green"`

### When to Create a New Primitive vs. Module

| Create primitive when… | Use CSS Module when… |
|----------------------|---------------------|
| Used in 3+ places across different pages | Unique to one page/feature |
| Pure presentational (no business logic) | Contains data fetching or routing |
| Has clear API (props define behavior) | Tightly coupled to specific data shape |
| Could be in a design system library | Implementation detail of larger component |

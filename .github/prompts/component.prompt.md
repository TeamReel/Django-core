---
mode: agent
description: "Scaffold a new React component following TeamReel conventions"
tools:
  - semantic_search
  - grep_search
  - read_file
  - create_file
  - run_in_terminal
---

# Component Scaffold Agent — TeamReel

You create new React components that perfectly match TeamReel conventions.

## What You Generate

For every new component, create:

1. **`ComponentName.tsx`** — The component file
2. **`ComponentName.module.css`** — Co-located CSS Module

## Component Template

```tsx
import { type FC } from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Define all props with types
}

export const ComponentName: FC<ComponentNameProps> = ({ ...props }) => {
  return (
    <div className={styles.root}>
      {/* Component content */}
    </div>
  );
};
```

## CSS Module Template

```css
.root {
  /* Use design tokens */
  padding: var(--space-4);
  background: var(--app-surface);
  border-radius: var(--radius-md);
}

/* Focus indicator */
.root:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .root {
    animation: none;
    transition: none;
  }
}
```

## Rules

### Placement
- **Page component** → `demo/src/pages/<section>/`
- **Shared UI** → `demo/src/components/ui/` (add to barrel export in `index.ts`)
- **Domain component** → `demo/src/components/<domain>/`
- **Dashboard card** → `demo/src/components/dashboard/`

### Must Include
- TypeScript interfaces for all props (no `any`)
- Design tokens for all colors, spacing, radius, shadows, motion
- `:focus-visible` styles for interactive elements
- `@media (prefers-reduced-motion: reduce)` if animations exist
- Mobile-first CSS (base = mobile)
- `aria-label` on icon-only buttons
- `onKeyDown` (Enter/Space) on clickable non-button elements
- `React.lazy` + `Suspense` for heavy child components (sheets, modals)

### Must NOT Include
- Inline styles for static values
- Hardcoded colors, spacing, or radius
- `any` types
- Files over 500 lines
- `max-width` media queries for mobile base styles

## Before Creating

1. **Check existing components** — search for similar patterns to reuse
2. **Check UI primitives** — use Card, Badge, Stack, etc. from `@/components/ui`
3. **Check the page structure** — understand where this fits in the app hierarchy

## After Creating

1. Run `npx tsc --noEmit` to verify types
2. Run `npx vite build` to verify build
3. Check `get_errors` on the new files

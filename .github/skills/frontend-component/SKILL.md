---
name: frontend-component
description: "Scaffold a new React component following TeamReel conventions — generates TSX, CSS Module, barrel export, and optional test file"
argument-hint: "Component name and location (e.g. 'MemberCard in components/members')"
---

# Frontend Component Scaffolding

Create production-ready React components matching all TeamReel conventions.

## Step 1: Determine Location

| Type | Path | Barrel Export |
|------|------|--------------|
| Shared UI primitive | `demo/src/components/ui/` | Add to `index.ts` |
| Domain-specific | `demo/src/components/<domain>/` | None needed |
| Dashboard card | `demo/src/components/dashboard/` | None needed |
| Full page | `demo/src/pages/<section>/` | None needed |

## Step 2: Generate Files

### `ComponentName.tsx`
```tsx
import { type FC } from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  /** Describe each prop */
  title: string;
  className?: string;
}

export const ComponentName: FC<ComponentNameProps> = ({ title, className }) => {
  return (
    <div className={`${styles.root} ${className ?? ''}`}>
      <h2 className={styles.heading}>{title}</h2>
    </div>
  );
};
```

### `ComponentName.module.css`
```css
.root {
  padding: var(--space-4);
  background: var(--app-surface);
  border-radius: var(--radius-md);
  color: var(--app-text);
}

.heading {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-2);
}

/* Interactive elements must have focus-visible */
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

## Step 3: Required Checklist

- [ ] TypeScript interfaces for all props — no `any`
- [ ] TSX ≤ 500 lines, CSS Module ≤ ~150 lines
- [ ] Design tokens for ALL colors, spacing, radius, shadows, durations
- [ ] Mobile-first CSS (base = phone, add breakpoints up)
- [ ] `:focus-visible` on interactive elements
- [ ] `@media (prefers-reduced-motion: reduce)` if animations exist
- [ ] Touch targets ≥ 44×44px on interactive elements
- [ ] `aria-label` on icon-only buttons
- [ ] `onKeyDown` (Enter + Space) on clickable non-button elements
- [ ] `React.lazy` + `Suspense` if heavy (e.g., bottom sheets, modals)
- [ ] If shared UI → add to barrel export in `components/ui/index.ts`

## Step 4: Verify

```bash
cd demo
npx tsc --noEmit  # no type errors
npx vite build    # build succeeds
```

## Token Quick Reference

| Category | Tokens |
|----------|--------|
| Surface | `--app-bg`, `--app-surface`, `--app-surface-2`, `--app-border` |
| Text | `--app-text`, `--app-text-secondary`, `--app-text-muted` |
| Brand | `--app-primary`, `--app-primary-hover`, `--app-primary-text` |
| Space | `--space-1` through `--space-12` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Motion | `--duration-fast`, `--duration-normal`, `--ease-default` |
| Focus | `--app-focus-ring` |

# Code Conventions & Quality Gates

> Last updated: 2026-03-12

## Purpose

These conventions prevent the accumulation of design debt. They are the rules that keep the codebase consistent as the team and feature set grow.

## Golden Rules

1. **No new inline styles for static properties** — use tokens, utilities, or CSS Modules
2. **No hardcoded colors** — always reference `var(--token-name)`
3. **No files over 500 lines** — split into smaller components
4. **Every component gets a CSS Module** — co-located `.module.css` file
5. **Mobile-first CSS** — base styles = mobile, breakpoints add complexity

---

## File Organization

### Component structure

```
pages/
  activities/
    ActivityDetailPage.tsx           # Page component
    ActivityDetailPage.module.css    # Scoped styles
    ActivitySidebar.tsx              # Sub-component
    ActivitySidebar.module.css       # Sub-component styles

components/
  ui/
    Card.tsx                         # UI primitive
    Card.module.css                  # Primitive styles
```

### Rules

| Rule | Limit | Action when exceeded |
|------|-------|---------------------|
| TSX file length | **500 lines max** | Extract sub-components |
| CSS Module length | **150 lines guidance** | Consider splitting component |
| Inline styles | **Only dynamic values** | Refactor to utility/module |
| Global CSS files | **500 lines max each** | Split by concern |

### Naming

- **Components**: PascalCase (`ActivityDetailPage.tsx`)
- **CSS Modules**: Match component name (`ActivityDetailPage.module.css`)
- **CSS classes**: camelCase in modules (`.headerRow`, `.statusBadge`)
- **Utility classes**: kebab-case (`.flex-row`, `.gap-8`, `.text-muted`)
- **Tokens**: kebab-case with category prefix (`--color-primary-400`, `--space-4`)

---

## Styling Decision Tree

```
Need styling?
  │
  ├─ Is it layout (flex, grid, gap, margin, padding)?
  │   └─ YES → Use utility class
  │
  ├─ Is the value dynamic (from JS state, API, or user input)?
  │   └─ YES → Use inline style
  │
  ├─ Is it a standard text style (size, weight, color)?
  │   └─ YES → Use utility class
  │
  └─ Is it component-specific (borders, shadows, hover, pseudo-elements)?
      └─ YES → Use CSS Module with design tokens
```

## TypeScript Conventions

### Strict mode

`tsconfig.json` has `strict: true`. No `any` types.

### API response types

```tsx
// ✅ Define interfaces for API responses
interface Activity {
  id: string;
  name: string;
  type: 'match' | 'training' | 'event';
  date: string;
}

// ❌ Never use any
const data: any = await fetch('/api/activities');
```

### Import pattern

```tsx
// Barrel imports for UI primitives
import { Card, Badge, Stack } from '@/components/ui';

// Direct imports for page-level components
import { ActivitySidebar } from './ActivitySidebar';

// CSS Module import
import styles from './ActivityDetailPage.module.css';
```

---

## Design Token Usage

### In CSS Modules

```css
/* ✅ Always reference tokens */
.card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--app-surface);
  color: var(--app-text);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-default);
}

/* ❌ Never hardcode values */
.card {
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
  color: #1C355E;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
```

### Allowed hardcoded values

Some values are intentionally not tokenized:

| Value | Why allowed |
|-------|------------|
| `0` | Zero is universal |
| `1px` | Hairline borders |
| `100%`, `100vh`, `100vw` | Full dimensions |
| `auto` | Auto sizing |
| `50%` (for centering) | Transform centering |
| Negative values for offsets | Position adjustments |

---

## Accessibility Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Color contrast | WCAG 2.1 AA (4.5:1 normal, 3:1 large) | Use token palette (pre-tested) |
| Touch targets | WCAG 2.5.8 (44×44px min) | `.touch-target` utility class |
| Focus indicators | WCAG 2.4.7 | `:focus-visible` styles in `base.css` |
| Keyboard navigation | WCAG 2.1.1 | TabIndex, Enter/Space handlers |
| Screen reader labels | WCAG 1.1.1 | `aria-label` on icon-only buttons |
| Motion reduction | WCAG 2.3.3 | `prefers-reduced-motion` media query |

```css
/* Already in base.css */
:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}
```

---

## Performance Budget

| Metric | Target | Tool |
|--------|--------|------|
| Build size (JS) | < 500KB gzipped | `vite build` output |
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| CSS files per page | ≤ 10 (modules + global) | Bundle analyzer |
| Image lazy loading | All below-fold images | `loading="lazy"` |

---

## Review Checklist

Before merging any frontend PR:

- [ ] No new inline styles for static values
- [ ] All colors reference tokens (not hex/rgb)
- [ ] No TSX files exceed 500 lines
- [ ] New components have co-located `.module.css`
- [ ] Interactive elements have 44px+ touch targets
- [ ] Tested in light and dark themes
- [ ] Tested at mobile (375px) and desktop (1280px) widths
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vite build` succeeds
- [ ] No `any` types introduced

---

## Current Metrics (2026-03-12)

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| CSS Modules | 276 | 30+ | ✅ Exceeded |
| Inline styles | ~220 (all dynamic) | < 300 | ✅ Met |
| Design tokens | 140 primitive + 99 semantic | — | ✅ Complete |
| Utility classes | ~249 | — | ✅ Complete |
| UI primitives | 15 | 15 | ✅ Met |
| TSX files > 500 lines | 0 | 0 | ✅ Met |
| TSX files > 400 lines | 2 | < 5 | ✅ Met |
| CSS files > 500 lines | 8 | 0 | ⚠️ Known debt |
| Global CSS files > 500 lines | 1 (utility.css: 688) | 0 | ⚠️ Known debt |
| `any` types | ~257 | 0 | ⚠️ Known debt |
| Test files | 187 | — | ✅ |
| Test suites passing | 408/408 | 100% | ✅ |
| Tests passing | 892/892 | 100% | ✅ |

> Volledige refactoring-analyse: [refactoring-status.md](refactoring-status.md)

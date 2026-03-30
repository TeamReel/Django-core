---
applyTo: "demo/src/**"
---

# Frontend Development — TeamReel

## Domain Context
For UX flows, component library, and design system docs → read `docs/ai-context-index.md`

## Stack
React 18 + TypeScript 5.6 (strict) + Vite. No CSS-in-JS, no Tailwind. Pure CSS Modules + design tokens.

## File Rules
- TSX files: max 500 lines → extract sub-components
- CSS Modules: max ~150 lines guidance
- Components: PascalCase, co-located `.module.css`
- CSS classes: camelCase in modules (`.headerRow`, `.statusBadge`)
- No `any` types. Define interfaces for all API responses.
- **No emoji characters in UI text.** Use design tokens, CSS indicators, or Unicode text symbols (`✓`, `✗`, `✕`, `←`, `→`) instead of emoji (🎬, ⚽, 📋, etc.).

## Styling Decision Tree
1. **Layout** (flex, grid, gap, margin, padding) → utility class
2. **Dynamic value** (JS state, API, user input) → inline style (only valid use)
3. **Text style** (size, weight, color) → utility class
4. **Component-specific** (borders, shadows, hover, pseudo) → CSS Module with design tokens

## Design Token Usage
```css
/* ✅ Always */
.card {
  padding: var(--space-4);
  background: var(--app-surface);
  color: var(--app-text);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--duration-normal) var(--ease-default);
}
/* ❌ Never hardcode colors/spacing */
```

**Allowed hardcoded values:** `0`, `1px`, `100%`, `100vh`, `auto`, `50%` (centering), negative offsets.

## Token Reference (key tokens)
- **Surfaces:** `--app-bg`, `--app-surface`, `--app-surface-2`, `--app-border`
- **Text:** `--app-text`, `--app-muted-text`, `--app-link`
- **Status:** `--app-success`, `--app-warning`, `--app-error`, `--app-danger`
- **Interactive:** `--app-primary`, `--app-focus-ring`
- **Spacing:** `--space-{1..12}` (4px–48px)
- **Motion:** `--duration-fast` (100ms), `--duration-normal` (200ms), `--duration-slow` (300ms)
- **Radius:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`

## Import Patterns
```tsx
import { Card, Badge, Stack } from '@/components/ui';   // barrel for primitives
import { ActivitySidebar } from './ActivitySidebar';     // direct for local
import styles from './ActivityDetailPage.module.css';    // CSS module
```

## UI Primitives (15 components in `components/ui/`)
Stack, Row, Section, SplitView, ResponsiveGrid, Card, Badge, Avatar, DataTable, ProgressBar, PageHeader, IconButton, Modal, ConfirmDialog, Toast

## Accessibility (WCAG 2.1 AA)
- Touch targets: min 44×44px (`min-height: 44px; min-width: 44px;`)
- Focus indicators: `:focus-visible { outline: 2px solid var(--app-focus-ring); outline-offset: 2px; }`
- Keyboard: `onKeyDown` for Enter/Space on clickable non-button elements
- Screen readers: `aria-label` on icon-only buttons, `role` on custom widgets
- Motion: `@media (prefers-reduced-motion: reduce)` disables transitions

## Mobile-First CSS
- Base styles = mobile (< 640px)
- Breakpoints add complexity: `sm` ≥640, `md` ≥768, `lg` ≥1024, `xl` ≥1280
- Never use `max-width` queries (except specific mobile overrides)
- Safe areas: `env(safe-area-inset-*)` for iOS

## Theme Support
- Light/dark via `data-theme` attribute on root
- Always use semantic tokens (`--app-*`), never primitive tokens for theme-sensitive properties
- Test both themes before committing

## Sheets Pattern (Dashboard)
Interactive cards open `BottomSheet` (mobile) / inline panels. Use `React.lazy` + `Suspense` for sheet components. Cards use `role="button"`, `tabIndex={0}`, `aria-haspopup="dialog"`.

## Documentation
- Architecture: `docs/architecture/overview.md`
- Component lib: `docs/frontend/component-library.md`
- CSS architecture: `docs/frontend/css-architecture.md`
- Code conventions: `docs/frontend/code-conventions.md`
- Mobile patterns: `docs/frontend/mobile-patterns.md`
- Theming: `docs/frontend/theming.md`
- UX flows: `docs/frontend/ux-flows.md`

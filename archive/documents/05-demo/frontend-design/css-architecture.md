# CSS Architecture

> Last updated: 2026-03-12

## Overview

TeamReel uses a **layered CSS architecture** with design tokens at the foundation, utility classes for rapid layout, and CSS Modules for component-scoped styles. No CSS-in-JS. No Tailwind. Pure CSS with modern features.

```
┌─────────────────────────────────────┐
│  CSS Modules (*.module.css)         │  Component-scoped styles
├─────────────────────────────────────┤
│  Utility Classes (utility.css)      │  Layout + typography shorthands
├─────────────────────────────────────┤
│  Theme Layer (theme.css)            │  Semantic tokens (light/dark)
├─────────────────────────────────────┤
│  Design Tokens (tokens.css)         │  Primitive color/spacing/type scales
├─────────────────────────────────────┤
│  Base & Reset (base.css)            │  Normalize + global defaults
└─────────────────────────────────────┘
```

## File Structure

All global CSS lives in `demo/src/styles/`:

| File | Purpose | Lines |
|------|---------|-------|
| `tokens.css` | Primitive design tokens (colors, spacing, type, motion) | ~205 |
| `theme.css` | Semantic tokens per theme (light/dark) | ~133 |
| `base.css` | CSS reset, global element styles, focus-visible | ~354 |
| `utility.css` | Atomic utility classes | ~688 |
| `layouts.css` | Page-level layout grids (dashboard, detail, gallery) | ~400 |
| `responsive.css` | Media queries for sidebar, nav, modals | ~394 |
| `design-system-interactive.css` | Micro-interactions, loading animations | ~141 |

Import chain — `src/index.css` loads the core globals, `main.tsx` adds utility separately:

```css
/* src/index.css */
@layer base, layouts, utilities;

@import './styles/tokens.css';
@import './styles/theme.css';
@import './styles/base.css';
@import './styles/responsive.css';
@import './styles/layouts.css';
```

```tsx
// src/main.tsx — utility loaded separately for layer ordering
import './index.css';
import './styles/utility.css';
```

> `design-system-interactive.css` is loaded on-demand by `DesignSystemPage.tsx` only.

---

## Design Tokens (`tokens.css`)

### Token Naming Convention

```
--{category}-{scale}
```

- **Colors:** `--color-{palette}-{50-900}` — 50=lightest, 900=darkest
- **Spacing:** `--space-{step}` — corresponding to px values
- **Typography:** `--text-{size}`, `--font-{weight}`, `--leading-{density}`
- **Radius:** `--radius-{size}`
- **Motion:** `--duration-{speed}`, `--ease-{curve}`
- **Shadows:** `--shadow-{depth}`

### Color Palette (140 tokens)

Nine color scales — six full 10-step scales (50–900), three partial accent scales:

| Palette | CSS prefix | Brand anchor | Hex | Steps |
|---------|-----------|-------------|-----|-------|
| **Primary** (Ocean Teal) | `--color-primary-` | 400 | `#3B8EA5` | 50–900 |
| **Neutral** (Navy → Ice) | `--color-neutral-` | 800 / 50 | `#1C355E` / `#EDF6FF` | 50–900 |
| **Green** (Success) | `--color-green-` | 500 | `#06D6A0` | 50–900 |
| **Red** (Error) | `--color-red-` | 400 | `#E63946` | 50–900 |
| **Amber** (Warning) | `--color-amber-` | 300 | `#FFD166` | 50–900 |
| **Blue** (Info) | `--color-blue-` | 500 | `#3b82f6` | 50–900 |
| **Indigo** (AI accent) | `--color-indigo-` | 500 | `#6366f1` | 300–500 |
| **Violet** (AI gradient) | `--color-violet-` | 500 | `#8b5cf6` | 400–500 |
| **Orange** (Alert) | `--color-orange-` | 500 | `#f97316` | 400–500 |

### Spacing Scale

4px base unit, non-linear progression:

| Token | Value |
|-------|-------|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

### Typography Scale

| Token | Size | Use case |
|-------|------|----------|
| `--text-2xs` | 10px | Badges, captions |
| `--text-xs` | 11px | Helper text |
| `--text-sm` | 12px | Secondary labels |
| `--text-md` | 13px | Table cells, metadata |
| `--text-base` | 14px | Body text (default) |
| `--text-lg` | 16px | Subheadings |
| `--text-xl` | 18px | Section titles |
| `--text-2xl` | 20px | Page subtitles |
| `--text-3xl` | 24px | Page titles |

Font families: system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', …`).

Weights: `--font-normal` (400), `--font-medium` (500), `--font-semibold` (600), `--font-bold` (700), `--font-extrabold` (800).

### Border Radius

| Token | Value | Use case |
|-------|-------|----------|
| `--radius-sm` | 4px | Badges, tags |
| `--radius-md` | 8px | Cards, buttons |
| `--radius-lg` | 12px | Modals, panels |
| `--radius-full` | 9999px | Avatars, pills |

### Motion

| Duration | Value | Use case |
|----------|-------|----------|
| `--duration-fast` | 100ms | Hover states |
| `--duration-normal` | 200ms | Transitions |
| `--duration-slow` | 300ms | Panel slides |
| `--duration-slower` | 500ms | Page transitions |

Easing: `--ease-default`, `--ease-in`, `--ease-out`, `--ease-in-out`.

---

## Utility Classes (`utility.css`)

~249 atomic classes organized by category. Use for layout scaffolding and quick styling. **Not** for component-specific styles.

### When to use utilities vs CSS Modules

| Scenario | Use |
|----------|-----|
| Flex/grid layout, gap, margin, padding | Utility class |
| Font size, weight, alignment | Utility class |
| Component-specific visual design | CSS Module |
| Hover states, pseudo-elements | CSS Module |
| Complex responsive layout | CSS Module |
| Dynamic values (runtime) | Inline style |

### Key utility categories

**Layout:**
```html
<div class="flex-row gap-8 flex-between">    <!-- Row with 8px gap, space-between -->
<div class="flex-col gap-4">                 <!-- Column with 4px gap -->
<div class="grid grid-cols-3 gap-12">        <!-- 3-column grid, 12px gap -->
```

**Spacing:**
```html
<div class="p-16 mt-8 mb-4">                <!-- 16px padding, 8px top margin, 4px bottom margin -->
<div class="px-12 py-8">                    <!-- 12px horizontal, 8px vertical padding -->
```

**Typography:**
```html
<span class="fs-12 fw-600 text-muted">      <!-- 12px, semibold, muted color -->
<h2 class="fs-20 fw-700">                   <!-- 20px, bold -->
```

**Responsive helpers:**
```html
<div class="hide-mobile">Desktop only</div>
<div class="show-mobile-only">Mobile only</div>
<div class="p-responsive gap-responsive">    <!-- Scales with viewport -->
```

**Container queries:**
```html
<div class="cq-gallery">                    <!-- Container context for gallery grid -->
<div class="cq-dashboard">                  <!-- Container context for dashboard layout -->
```

---

## CSS Modules

**276 modules** across the codebase. Every component and page gets its own `*.module.css`.

### Naming Convention

```
ComponentName.module.css     →  imported as `styles`
ComponentName.tsx            →  uses className={styles.root}
```

### Rules

1. **One module per component** — co-located with the `.tsx` file
2. **Use `.root` for the outermost element** — consistent entry point
3. **Reference tokens, not hardcoded values:**
   ```css
   /* ✅ Good */
   .root { border-radius: var(--radius-md); }

   /* ❌ Bad */
   .root { border-radius: 8px; }
   ```
4. **Compose with utility classes for layout:**
   ```tsx
   <div className={`${styles.root} flex-col gap-8 p-16`}>
   ```
5. **No `!important`** unless overriding a third-party library
6. **Keep modules focused** — if a module exceeds ~150 lines, consider splitting the component.

> ⚠️ **Known debt:** 8 CSS files currently exceed 500 lines (largest: `CreateWizard.module.css` at 1442). These are tracked for future splitting. See [refactoring-status.md](refactoring-status.md#known-debt).

### Module Distribution

| Area | Count | Notes |
|------|-------|-------|
| `components/` | ~87 | Shared UI components (Sidebar, TopNavbar, SearchBar, wizards, etc.) |
| `pages/` | ~187 | Page-specific styles |
| other (layouts, styles) | ~2 | Layout shells |

---

## Breakpoints & Responsive Strategy

Mobile-first approach. Base styles target mobile, breakpoints add complexity.

| Name | Breakpoint | Target |
|------|-----------|--------|
| (base) | `< 640px` | Phone portrait |
| **sm** | `640px` | Phone landscape / small tablet |
| **md** | `768px` | Tablet portrait |
| **lg** | `1024px` | Tablet landscape / desktop |
| **xl** | `1280px` | Desktop |
| **2xl** | `1536px` | Wide desktop |

### Media query patterns

```css
/* Mobile-first: base is mobile, add complexity upward */
.sidebar { display: none; }

@media (min-width: 1024px) {
  .sidebar { display: flex; }
}

/* Touch-specific */
@media (hover: none) and (pointer: coarse) {
  .button { min-height: 44px; }
}
```

### Container Queries

Component-level responsive behavior, independent of viewport:

```css
.gallery { container: gallery / inline-size; }

@container gallery (max-width: 480px) { ... }  /* 2-col */
@container gallery (max-width: 260px) { ... }  /* 1-col */
```

Active container query contexts: `gallery`, `stats`, `dashboard`, `card-grid`.

---

## Inline Styles — When Allowed

Only **~220 inline styles** remain (from 2535+). All are legitimate dynamic cases:

| Pattern | Example | Why inline? |
|---------|---------|------------|
| Runtime-computed dimensions | `style={{ width: `${percent}%` }}` | Value from JS state |
| Data-driven colors | `style={{ backgroundColor: team.color }}` | From API/database |
| Gesture transforms | `style={{ transform: `translateX(${x}px)` }}` | Touch/animation state |
| Conditional visibility | `style={{ opacity: isLoading ? 0.5 : 1 }}` | Binary state |

**Never use inline styles for:**
- Static layout (use utility classes)
- Static colors (use tokens or utility classes)
- Component-specific design (use CSS Modules)
- Responsive behavior (use media/container queries)

---

## Adding New Tokens

1. Add the primitive token to `tokens.css` following the naming convention
2. If it needs theme awareness, add semantic mapping in `theme.css`
3. Update this document
4. Reference via `var(--token-name)` in CSS Modules or utility classes

## Adding New Utility Classes

1. Check if an existing class covers the need
2. Add to the appropriate category section in `utility.css`
3. Follow the naming pattern of existing classes
4. Update this document

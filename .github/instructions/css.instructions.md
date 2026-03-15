---
applyTo: "**/*.css"
---

# CSS Architecture — TeamReel

## Layered System
```
CSS Modules (*.module.css)   → Component-scoped
Utility Classes (utility.css) → Layout + typography
Theme Layer (theme.css)       → Semantic tokens (light/dark)
Design Tokens (tokens.css)    → Primitives (color/spacing/type/motion)
Base & Reset (base.css)       → Normalize + defaults
```

## Token System

### Spacing (`--space-{n}`)
`--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-6` (24px), `--space-8` (32px), `--space-10` (40px), `--space-12` (48px)

### Motion
- `--duration-fast`: 100ms (micro-interactions)
- `--duration-normal`: 200ms (standard transitions)
- `--duration-slow`: 300ms (complex animations)
- `--ease-default`: standard easing curve

### Radius
`--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), `--radius-full` (50%/9999px)

### Shadows
`--shadow-sm`, `--shadow-md`, `--shadow-lg` (automatically darken in dark mode)

### Semantic Colors (theme-aware)
| Token | Usage |
|-------|-------|
| `--app-bg` | Page background |
| `--app-surface` | Card/panel background |
| `--app-surface-2` | Nested surfaces (tabs, wells) |
| `--app-text` | Primary text |
| `--app-muted-text` | Secondary text |
| `--app-border` | Dividers, outlines |
| `--app-link` | Links, clickable text |
| `--app-primary` | Primary actions |
| `--app-focus-ring` | Focus indicators |
| `--app-success` | Success states |
| `--app-warning` | Warnings |
| `--app-error` | Error states |
| `--app-danger` | Destructive actions |

## CSS Module Rules
- Class names: camelCase (`.headerRow`, `.statusBadge`)
- Always reference tokens for colors, spacing, radius, shadows, motion
- Never hardcode hex colors or pixel spacing values

## Required Patterns

### Focus-visible (all interactive elements)
```css
.card:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}
```

### Reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
    transition: none;
  }
}
```

### Mobile-first breakpoints
```css
/* Base = mobile */
.grid { grid-template-columns: 1fr; }

/* Desktop enhancement */
@media (min-width: 1024px) {
  .grid { grid-template-columns: 2fr 1fr; }
}
```

### Touch targets
```css
.button { min-height: 44px; min-width: 44px; }
```

## Brand Colors Reference
| Name | Hex | Role |
|------|-----|------|
| Ocean Teal | `#3B8EA5` | Primary brand, CTAs |
| Deep Navy | `#1C355E` | Dark backgrounds |
| Midnight Navy | `#0A192F` | Darkest (dark mode) |
| Coral Red | `#E63946` | Errors, destructive |
| Amber | `#FFD166` | Warnings, highlights |
| Emerald | `#06D6A0` | Success, completion |
| Sky Blue | `#3b82f6` | Info, links (dark mode) |
| Ice White | `#EDF6FF` | Light backgrounds |

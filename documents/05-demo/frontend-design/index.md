# Frontend Design System

> Last updated: 2026-03-04

## Purpose

This documentation defines TeamReel's frontend design system — the tokens, components, patterns, and conventions that ensure visual consistency and prevent design debt across the web application.

**Stack:** React 18 + TypeScript + Vite · CSS Modules + Design Tokens · No CSS-in-JS

---

## Documentation Map

| Document | What it covers |
|----------|---------------|
| [CSS Architecture](css-architecture.md) | Token system, utility classes, CSS Modules, file structure, breakpoints |
| [Theming & Brand Identity](theming.md) | Light/dark themes, semantic tokens, brand color palette |
| [Component Library](component-library.md) | 15 UI primitives catalog, usage patterns, when to create new ones |
| [Mobile-First Patterns](mobile-patterns.md) | Breakpoints, touch targets, safe areas, gestures, responsive layouts |
| [Code Conventions & Quality Gates](code-conventions.md) | Rules, review checklist, performance budget, current metrics |

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                        Pages (TSX)                          │
│  Import UI primitives + CSS Modules + utility classes       │
├──────────────┬──────────────┬───────────────────────────────┤
│  UI Prims    │  Shared      │  Page-specific                │
│  (15)        │  Components  │  Components                   │
├──────────────┴──────────────┴───────────────────────────────┤
│                   CSS Modules (179)                          │
│  Component-scoped styles, token-driven                      │
├─────────────────────────────────────────────────────────────┤
│  Utility Classes (~230)     │  Layouts + Responsive         │
│  Atomic layout/type helpers │  Grid patterns, media queries │
├─────────────────────────────┴───────────────────────────────┤
│  Theme Layer — Semantic tokens (light/dark)                 │
├─────────────────────────────────────────────────────────────┤
│  Design Tokens — 110 primitive tokens (color/space/type)    │
├─────────────────────────────────────────────────────────────┤
│  Base & Reset — Normalize, focus, global defaults           │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

1. **Tokens, not magic numbers** — Every color, spacing value, radius, and shadow references a design token. Hardcoded values are banned.

2. **CSS Modules for components** — Every component has a co-located `.module.css` file. No global class collisions. No CSS-in-JS runtime cost.

3. **Utility classes for layout** — Flex, grid, gap, padding, margin, font size/weight are handled by atomic utility classes. Keeps TSX readable.

4. **Mobile-first, always** — Base CSS = phone. Breakpoints progressively enhance for tablet and desktop.

5. **Theme-aware by default** — Use semantic tokens (`--app-bg`, `--app-text`) so components work in both light and dark mode without changes.

6. **Small files** — No TSX file > 500 lines. No CSS file > 500 lines. Extract, split, compose.

## Quick Reference

### Adding a new page

1. Create `PageName.tsx` + `PageName.module.css` in `pages/{feature}/`
2. Import UI primitives from `@/components/ui`
3. Use utility classes for layout: `flex-col gap-8 p-16`
4. Use `.module.css` for component-specific visuals
5. Reference design tokens: `var(--space-4)`, `var(--app-surface)`
6. Test at 375px (mobile) and 1280px (desktop)
7. Test in light and dark themes

### Adding a new component

1. Create in `components/` (shared) or co-located with page (specific)
2. Always create a `.module.css` — even for simple components
3. If used in 3+ places with no business logic → promote to `components/ui/`
4. See [Component Library](component-library.md) for full checklist

### Styling decision

```
Layout?      → Utility class (.flex-row, .gap-8, .p-16)
Dynamic?     → Inline style (style={{ width: `${x}%` }})
Text style?  → Utility class (.fs-14, .fw-600, .text-muted)
Everything else → CSS Module with tokens
```

---

## Current Health (2026-03-04)

| Metric | Value | Status |
|--------|-------|--------|
| Design tokens | 110 primitive + semantic | ✅ |
| CSS Modules | 179 | ✅ |
| Utility classes | ~230 | ✅ |
| UI primitives | 15 | ✅ |
| Inline styles | 417 (all dynamic) | ✅ |
| Files > 500 lines | 0 | ✅ |
| Themes | Light + Dark | ✅ |
| Touch targets (44px) | Enforced | ✅ |

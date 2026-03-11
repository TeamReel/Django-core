# S1 — Component Inline Styles

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** 94 inline `style={{...}}` in `components/` → CSS Modules

---

## Doel

Inline styles in shared components verplaatsen naar CSS Modules of design tokens.

## Current State

- 94 `style={{...}}` in `components/` directory
- 261 CSS Module files bestaan al — pattern is gevestigd
- Mix van inline + modules is inconsistent

## Aanpak

### Categorieën van inline styles

| Type | Aanpak |
|------|--------|
| Layout (flex, grid, gap) | → CSS Module class |
| Spacing (margin, padding) | → CSS Module met design token vars |
| Colors (background, color) | → CSS Module met `var(--token)` |
| Dynamic values (width %, transform) | → CSS variable: `style={{ '--progress': pct }}` + `.bar { width: var(--progress) }` |
| One-off overrides | → Acceptabel als `style={{ marginTop: 'var(--space-2)' }}` |

### Prioriteit
1. **Meest hergebruikte components eerst** (Avatar, Card, Badge, Button wrappers)
2. **Complex layout components** (Sidebar, TopNavbar, TileGrid)
3. **One-off styles** mogen blijven als ze dynamic zijn

### Stappen
1. Per component: identificeer alle `style={{...}}`
2. Maak/extend `.module.css` file
3. Vervang inline door className
4. Dynamic values → CSS custom properties

## Verificatie

- [ ] < 10 `style={{...}}` in `components/` (alleen dynamic values)
- [ ] Visueel geen regressies (check in browser)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green

# P2 — Memo Heavy Components

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** 0 `React.memo` → 10+ memoized heavy components

---

## Doel

Dure componenten memoizen om onnodige re-renders te voorkomen.

## Current State

- 0 `React.memo` usages
- 457 `useMemo` + 416 `useCallback` (data-level memoization is goed)
- Maar component-level memoization ontbreekt volledig
- Potentieel: parent state changes triggeren re-render van zware children

## Kandidaten

### Tier 1 — Altijd zichtbaar, duur om te renderen

| Component | Reden | Impact |
|-----------|-------|--------|
| `Sidebar` | Altijd mounted, veel children | Hoog |
| `TopNavbar` | Altijd mounted, breadcrumbs recalc | Hoog |
| `MobileBottomNav` | Altijd mounted op mobile | Hoog |

### Tier 2 — Complexe render, vaak re-rendered

| Component | Reden | Impact |
|-----------|-------|--------|
| `DataTable` / Table components | Veel rows, sorting | Hoog |
| `BrandProfileCard` | Zware media rendering | Medium |
| `MediaAssetCard` | Image + metadata | Medium |
| `ContentCard` | Media + text + actions | Medium |

### Tier 3 — List items

| Component | Reden | Impact |
|-----------|-------|--------|
| List item components in directory | Per-item re-render bij filter | Medium |
| Dashboard cards | Re-render bij tab switch | Laag |

## Aanpak

```tsx
// Before
export function DataTable({ data, columns, onSort }: DataTableProps) { ... }

// After
export const DataTable = React.memo(function DataTable({ data, columns, onSort }: DataTableProps) { ... });
```

### Regels
- Alleen memoize components met **stable props** (geen inline objects/functions)
- Gebruik `React.memo` met custom comparator als props complex zijn
- Combineer met `useCallback` in parent voor event handlers

## Verificatie

- [ ] 10+ components wrapped in `React.memo`
- [ ] React DevTools Profiler: minder re-renders op pagina navigatie
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green

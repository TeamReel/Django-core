# R2 — Dependency Cleanup

**Status:** 🔲 Todo
**Effort:** 30 min
**Scope:** Verwijder ongebruikte dependencies, corrigeer plaatsing

---

## Doel

Clean up `demo/package.json`: verwijder 4 ongebruikte packages, verplaats 1 package naar correcte sectie.

## Current State

| Package | Locatie | Imports gevonden | Actie |
|---------|---------|:----------------:|-------|
| `react-select` | dependencies | **0** | **Verwijderen** |
| `chart.js` | dependencies | **0** | **Verwijderen** |
| `react-chartjs-2` | dependencies | **0** | **Verwijderen** |
| `@vanilla-extract/css` | devDependencies | **0** | **Verwijderen** |
| `@vanilla-extract/vite-plugin` | devDependencies | **0** | **Verwijderen** |
| `react-window` | devDependencies | **1** (`VirtualizedList.tsx`) | **Move → dependencies** |
| `recharts` | dependencies | **1** (`CachePerformancePage.tsx`) | ✅ Correct |

## Acties

1. `pnpm remove react-select chart.js react-chartjs-2`
2. `pnpm remove -D @vanilla-extract/css @vanilla-extract/vite-plugin`
3. `pnpm remove -D react-window && pnpm add react-window`
4. Verifieer: `npx tsc --noEmit` + `npx vitest run`

## Verificatie

- [ ] `react-select` niet meer in package.json
- [ ] `chart.js` + `react-chartjs-2` niet meer in package.json
- [ ] `@vanilla-extract/*` niet meer in package.json
- [ ] `react-window` in `dependencies` (niet devDependencies)
- [ ] `pnpm install` succesvol
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

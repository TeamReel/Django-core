# R2 — Dependency Cleanup

**Status:** ✅ Done
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

- [x] `react-select` niet meer in package.json
- [x] `chart.js` + `react-chartjs-2` niet meer in package.json
- [x] `@vanilla-extract/*` behouden (nodig voor design-system package)
- [x] `react-window` in `dependencies` (niet devDependencies)
- [x] CreditsChart + ObservabilityCharts gemigreerd van chart.js → recharts
- [x] `pnpm install` succesvol
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (187 files, 892 tests)
- [x] Gecommit + gepusht

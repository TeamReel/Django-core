# Phase 19 — App.tsx Routing Extraction

**Track:** B (Page Decomposition)
**Status:** ✅ Done

## Wat

App.tsx routing configuratie geëxtraheerd naar lazy-loaded route modules. App.tsx nu een dunne shell.

## Metrics

| Metric | Voor | Na | Reductie |
|--------|------|----|----------|
| Regels | 1597 | 103 | **-94%** |

## Verificatie

- [x] `npx tsc --noEmit` — pass
- [x] `npx vite build` — pass
- [x] Gecommit + pushed naar `main`

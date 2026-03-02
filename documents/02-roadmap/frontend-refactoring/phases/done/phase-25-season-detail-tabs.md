# Phase 25 — ProjectSeasonDetailPage.tsx (tabs)

**Track:** B (Page Decomposition)
**Status:** ✅ Done
**Bestand:** `demo/src/pages/periods/ProjectSeasonDetailPage.tsx`
**Huidige regels:** 407 (was 1531)

## Doel

Resterende inline tabs extraheren naar eigen bestanden.

## Aanpak

1. Identificeer welke tabs nog inline in het hoofdbestand zitten
2. Extract elke tab naar eigen component in `seasons/tabs/` of `seasons/detail/`
3. Extract shared tab state naar hook als nodig
4. Thin JSX shell met tab router

## Checklist

- [x] Inline tabs geïdentificeerd (tabs were already extracted — bulk was state/effects/logic)
- [x] useSeasonDetailPageData hook geëxtraheerd (1155 regels)
- [x] SeasonDetailModals component geëxtraheerd (227 regels)
- [x] Bestand < 500 regels (407)
- [x] `npx tsc --noEmit` — pass
- [x] `npx vite build` — pass
- [x] Gecommit + pushed naar `main`

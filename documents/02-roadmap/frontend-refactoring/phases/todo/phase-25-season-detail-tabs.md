# Phase 25 — ProjectSeasonDetailPage.tsx (tabs)

**Track:** B (Page Decomposition)
**Status:** 📋 Planned
**Bestand:** `demo/src/pages/seasons/ProjectSeasonDetailPage.tsx`
**Huidige regels:** 1530

## Doel

Resterende inline tabs extraheren naar eigen bestanden.

## Aanpak

1. Identificeer welke tabs nog inline in het hoofdbestand zitten
2. Extract elke tab naar eigen component in `seasons/tabs/` of `seasons/detail/`
3. Extract shared tab state naar hook als nodig
4. Thin JSX shell met tab router

## Checklist

- [ ] Inline tabs geïdentificeerd
- [ ] Tab components geëxtraheerd
- [ ] Shared state hook (indien nodig)
- [ ] Bestand < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`

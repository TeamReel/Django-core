# Phase 31 — ContentLibraryPage.tsx

**Track:** B (Page Decomposition)
**Status:** 📋 Planned
**Bestand:** `demo/src/pages/content/ContentLibraryPage.tsx`
**Huidige regels:** 1440

## Doel

Filter panel, content cards en batch actions extraheren.

## Aanpak

1. Extract filter panel naar `ContentLibraryFilters.tsx`
2. Extract content card component
3. Extract batch action handlers
4. Extract data fetching hook

## Checklist

- [ ] Filter panel geëxtraheerd
- [ ] Content card component geëxtraheerd
- [ ] Batch actions geëxtraheerd
- [ ] Data hook geëxtraheerd
- [ ] Bestand < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`

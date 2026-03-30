# Phase 26 — MatchCreateModal.tsx

**Track:** B (Page Decomposition)
**Status:** 📋 Planned
**Bestand:** `demo/src/pages/seasons/MatchCreateModal.tsx` (of vergelijkbaar pad)
**Huidige regels:** 1510

## Doel

Wizard steps, validation en API calls extraheren.

## Aanpak

1. Extract types naar `matchCreateTypes.ts`
2. Extract validation logic naar `useMatchCreateValidation.ts`
3. Extract wizard steps naar aparte step components
4. Extract API call logic naar `useMatchCreateApi.ts`
5. Modal shell met step router

## Checklist

- [ ] Types geëxtraheerd
- [ ] Validation hook geëxtraheerd
- [ ] Wizard step components geëxtraheerd
- [ ] API hook geëxtraheerd
- [ ] Bestand < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`

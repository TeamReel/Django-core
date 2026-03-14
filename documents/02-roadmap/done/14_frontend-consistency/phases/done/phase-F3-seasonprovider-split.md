# F3 — SeasonProvider Split

**Status:** ✅ Done
**Track:** F — File Splitting
**Effort:** 1.5 uur
**Dependencies:** Geen
**Afgerond:** 2026-06-18

---

## Doel

Split `SeasonProvider.tsx` (445 regels) naar context wrapper + data hook.

## Aanpak

Gekozen voor de aanpak uit de phase doc: extract alle data fetching, state, brand profiles, permissions en navigatie helpers naar een `useSeasonData` hook. De provider wordt een thin context wrapper.

## Wat Gedaan

### `useSeasonData.ts` (nieuw)
Bevat alle logica van de provider:
- Route params verwerking
- Core state (org, project, club, season, competitions, loading, error)
- Hoofd data fetch effect (6 stappen: org + project + club, root periods, season resolve, season detail, URL canonicalization, competitions)
- Brand profiles (`clubBrand`, `teamBrand`, `batchBrandKits`, `brandLogoUrl`, `brandSponsorUrl`)
- Permissions (`orgForPermissions`, `permissionContext`, `userCanEditProject`, `userCanDeleteProject`)
- Navigatie helpers (`seasonsBasePath`, `projectDetailPath`, `seasonPathKey`, `memberDetailHref`)
- Context value assembly (`useMemo`)

Returns: compleet `SeasonContextValue` object.

### `SeasonProvider.tsx` (refactored)
Van 445 → **57 regels**. Puur context boilerplate:
- `createContext`
- `useSeasonContext` hook (throws wanneer buiten provider)
- `SeasonProvider` component (roept `useSeasonData()` aan, wraps in Context.Provider)
- Re-exports voor backwards compatibility

## Verificatie

- ✅ SeasonProvider.tsx: 57 regels (< 300 ✅)
- ✅ useSeasonData.ts: ~280 regels (< 300 ✅)
- ✅ Geen TypeScript errors in beide bestanden
- ✅ Alle bestaande exports/imports werken ongewijzigd
- ✅ `useSeasonData` is nu apart testbaar

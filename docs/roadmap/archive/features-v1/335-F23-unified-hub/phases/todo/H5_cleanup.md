# H5 — Cleanup deprecated pagina's

> **Effort:** ~6 uur | **Impact:** Minder code, minder onderhoud

## Context

Na H0-H4 zijn `ClubDetailPage` en `TeamDetailPage` niet meer bereikbaar via routes. In deze fase verwijderen we de dode code.

## To do

- [ ] Verifieer dat geen enkele route meer naar de oude pagina's wijst:
  - `grep -r "ClubDetailPage\|TeamDetailPage" demo/src/` — alleen imports in legacy/test
  - Controleer `appRouteGroups.tsx` en `appLazyImports.ts`
- [ ] Verwijder componenten:
  - `TeamOrganisationDetailPage.tsx` + `.module.css`
  - `ClubOrganisationDetailPage.tsx` + `.module.css`
  - `TeamOverviewTab/` (volledig vervangen door hub overview)
  - `TeamSelectieTab.tsx` (vervangen door `HubSelectieTab`)
  - `TeamPageHeader.tsx` (niet meer gebruikt)
- [ ] Verwijder of consolideer hooks:
  - `useClubOrgDetailData/` → controleer of `HubClubTab` hier nog van afhangt
  - Als `HubClubTab` eigen `useHubClubOverview` hook heeft → verwijder `useClubOrgDetailData`
- [ ] Update imports:
  - `appLazyImports.ts`: verwijder `TeamDetailPage`, `ClubDetailPage` imports
  - Verwijder `appRedirects.tsx` entries die naar oude pagina's wijzen
- [ ] Tree shaking validatie:
  - `npx vite build` → controleer dat bundle size kleiner is
  - Geen dead code warnings

## Done criteria

- [ ] Geen referenties naar `TeamOrganisationDetailPage` of `ClubOrganisationDetailPage` in codebase
- [ ] `npx tsc --noEmit` en `npx vite build` slagen
- [ ] Bundle size verlaagd (oude pagina's + CSS verwijderd)
- [ ] Alle E2E tests groen

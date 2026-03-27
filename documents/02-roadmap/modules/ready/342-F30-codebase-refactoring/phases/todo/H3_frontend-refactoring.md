# H3 — Frontend Refactoring

> **Effort:** ~6 uur | **Impact:** Schonere code, betere type safety, kleinere bestanden

## To do

### Orphaned code verwijderen
- [ ] Verwijder `demo/src/components/dashboard/HeroBanner.tsx` + `HeroBanner.module.css`
- [ ] Update barrel export `demo/src/components/dashboard/index.ts` — verwijder `HeroBanner` export
- [ ] Zoek naar andere orphaned componenten (geëxporteerd maar nergens geïmporteerd)

### `any` type eliminatie (top bestanden)
- [ ] `demo/src/pages/content/useContentLibraryData.ts` — 8 instances, extract typed helpers
- [ ] `demo/src/components/dashboard/ContentOverviewCard.tsx` — 6 instances, type item exhaustion
- [ ] `demo/src/providers/useSeasonData.ts` — 4 instances, permission context casting
- [ ] `demo/src/components/dashboard/useMatchSheet.ts` — 3 instances, metadata access
- [ ] Scan overige bestanden en fix de makkelijke `as any` casts

### Mega CSS bestanden splitsen
- [ ] `CreateWizard.module.css` (1453 LOC) → split per wizard-stap (WizardStep1.module.css, etc.)
- [ ] `TopNavbar.module.css` (873 LOC) → split per sectie (NavbarDesktop.module.css, NavbarMobile.module.css, NavbarModals.module.css)
- [ ] `ApprovalsPage.module.css` (794 LOC) → split per sub-component

### Grote hooks opsplitsen
- [ ] `useTopNavbarData.tsx` (503 LOC) → split in useNavbarNotifications, useNavbarCreateMenu, useNavbarSearch
- [ ] `useCreditsData.ts` (497 LOC) → split business logic in aparte utilities
- [ ] `useUsersData.ts` (491 LOC) → split filtering/sorting in aparte helpers

### Type consolidatie
- [ ] Inventariseer verspreide type-definities
- [ ] Verplaats gedeelde API response types naar `demo/src/types/api/`
- [ ] Voeg ontbrekende types toe voor veelgebruikte objecten (Match, MatchRecord, Activity)

## Done criteria

- [ ] Geen orphaned TSX/CSS bestanden
- [ ] `as any` count in productie-code gedaald van ~80 naar <30
- [ ] Geen CSS-bestanden >800 LOC (exclusief tokens.css en utility.css)
- [ ] Geen hooks >400 LOC
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt

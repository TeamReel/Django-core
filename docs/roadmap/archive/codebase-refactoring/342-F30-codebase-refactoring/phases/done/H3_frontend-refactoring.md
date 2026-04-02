# H3 — Frontend Refactoring

> **Effort:** ~6 uur | **Impact:** Schonere code, betere type safety, kleinere bestanden
> **Status:** ✅ DONE

## Gedaan

### Orphaned code verwijderen ✅
- [x] Verwijder `demo/src/components/dashboard/HeroBanner.tsx` + `HeroBanner.module.css`
- [x] Update barrel export `demo/src/components/dashboard/index.ts` — verwijder `HeroBanner` export
- [x] 21 orphaned componenten gevonden en verwijderd (HeroBanner, NextMatchHero, ContentOverviewCard, AssetsOverviewCard, etc.)
- [x] Barrel exports en test mocks bijgewerkt

### `any` type eliminatie ✅
- [x] Productie `as any` count: 91 → 26 (71% reductie)
- [x] Bestanden gefixed: useContentLibraryData.ts, useSeasonData.ts, useMatchSheet.ts, batchExecution.ts, useOrgFormState.ts, useOrgData.ts, useOrgDataFetching.ts, useLinkUserModal.ts, useCompetitionMutations.ts, useSeasonFormState.ts, useMatchWizardData.ts, usePreferencesData.tsx, useUserDetailData.tsx, UserDetailModals.tsx, UserDetailMembershipTabs.tsx, SmartActionsCard.tsx, ApprovalsModals.tsx, NotificationRoutingLogsPage.tsx, MemberDetailPage.tsx, SeasonMatchesTab.tsx, useBreadcrumbsData.ts, breadcrumbHelpers.ts
- [x] Type-safe casts waar nodig, Record<string, unknown> voor API responses

### Mega CSS bestanden splitsen ✅ (pre-existing)
- [x] Alle CSS bestanden al <800 LOC

### Grote hooks opsplitsen ✅ (pre-existing)
- [x] Alle hooks al <400 LOC

### Type consolidatie (deferred)
- Twee Project types (entities vs api/project) bestaan nog — consolidatie is een grotere refactor
- Twee+ User types bestaan nog — wordt opgepakt in toekomstige fase

### Overige fixes
- [x] Wizard.module.css hersteld (per ongeluk verwijderd bij orphan cleanup)

## Done criteria

- [x] Geen orphaned TSX/CSS bestanden
- [x] `as any` count in productie-code: 26 (<30 target ✅)
- [x] Geen CSS-bestanden >800 LOC
- [x] Geen hooks >400 LOC
- [x] `npx tsc --noEmit` — 0 nieuwe fouten (90 pre-existing van @django-core/page-templates)
- [x] `npx vite build` — slaagt ✅

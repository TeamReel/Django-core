# Q016 — TypeScript `any` types verwijderen uit productie-code

| | |
|---|---|
| Status | � DOING |
| Bron | Code Review / Codebase Audit |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Er staan ~37 `any` type-annotaties in productie TypeScript-bestanden (niet test-bestanden). Dit ondermijnt type-safety en kan runtime-fouten veroorzaken die de compiler niet vangt.

## Bestanden (.tsx — 16 hits)
- `UsersPage.tsx` (5×)
- `OrgModals.tsx` (2×)
- `MatchLineupField.tsx`, `HubWedstrijdenTab.tsx`, `PermissionsPage.tsx`, `ProjectsTable.tsx`, `UsersTable.tsx` (elk 1×)
- `CompetitionLegacyMatchCreateModal.tsx`, `MemberDetailPanel.tsx`, `ProjectCompetitionDetailPage.tsx`, `ProjectSeasonMemberDetailPage.tsx` (elk 1×)

## Bestanden (.ts — 21 hits)
- `useClubOrgHierarchy.ts` (3×), `useOrgDataFetching.ts` (3×), `useUserDetailApi.ts` (3×)
- `useThenVsNowData.ts` (2×)
- `sidebarPanelBWork.types.ts`, `useMatchDataFetching.ts`, `orgDataHelpers.ts`, `useTeamMatches.ts`, `contentGenerationApi.ts`, `usePeriodCreateData.ts`, `effects.ts`, `useSeasonBulkActions.ts`, `useSeasonCrudActions.ts`, `fetchers.ts`, `lazyWithRetry.ts` (elk 1×)

## Checklist
- [x] Vervang `any` door correcte interfaces/types
- [x] Begin met `UsersPage.tsx` (5 hits) en `useClubOrgHierarchy.ts` (3 hits)
- [x] Definieer missende API response interfaces
- [x] `npx tsc --noEmit` blijft schoon
- [x] Verify

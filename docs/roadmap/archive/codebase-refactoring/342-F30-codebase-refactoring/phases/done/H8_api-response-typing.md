# H8 — API Response Typing

> **Effort:** ~4 uur | **Impact:** Betere autocomplete, foutdetectie bij API wijzigingen

## Context

Frontend audit (maart 2026) toont **33 expliciete `any` annotaties** en **25 `as any` casts** in productie-code. Het grootste deel komt van ongetypte API calls (`api.get<any>`, `api.list<any>`, `api.post<any>`).

### Categorieën

| Categorie | Aantal | Aanpak |
|-----------|--------|--------|
| `api.get<any>` / `api.list<any>` / `api.post<any>` | 18 | Response interfaces definiëren |
| `as any` op callback/event handlers | 7 | Juiste function signatures |
| `as any` op metadata access | 5 | Typed metadata interfaces |
| `(data as any).results` unwrap pattern | 3 | Generieke unwrap utility |
| Overig (`= any`, `: any` in state) | 12 | Per geval fixen |

### Top-offender bestanden

| Bestand | `any` count | Type |
|---------|-------------|------|
| `api/credits.ts` | 4 | `api.get<any>` / `api.list<any>` |
| `hooks/useAssetGeneration.ts` | 3 | `api.get<any>` / `api.post<any>` |
| `hooks/useWorkflows.ts` | 3 | `api.get<any>` |
| `pages/config/useAppBackgroundsData.ts` | 3 | `api.get<any>` + `: any` |
| `pages/identity/directory/useClubsData.ts` | 2 | `(prev: any)` in setState |
| `utils/apiFetch.ts` | 4 | `<T = any>` generics |
| `pages/identity/UserDetailIdentityTab.tsx` | 1 | `const user = _user as any` (hele component untyped!) |

## To do

### Stap 1: API response interfaces (~2 uur)
- [ ] `api/credits.ts` — Definieer `BalancePolicy`, `EffectivePolicy` interfaces
- [ ] `hooks/useAssetGeneration.ts` — Definieer `AssetGenerationResponse`, `AssetSaveResponse`
- [ ] `hooks/useWorkflows.ts` — Definieer `WorkflowTemplate`, `WorkflowInstance`, `WorkflowHistory`
- [ ] `pages/config/useAppBackgroundsData.ts` — Definieer `AppBackground`, `SportOption`
- [ ] `pages/periods/useSeasonCrudActions.ts` — Type membership creation response
- [ ] `pages/periods/useSeasonBulkActions.ts` — Type activity creation response
- [ ] `pages/periods/useCompetitionDetailData/fetchers.ts` — Type media items response
- [ ] `pages/periods/ThenVsNowModal/useThenVsNowData.ts` — Type app backgrounds
- [ ] `utils/teamreelTransactions.ts` — Type transaction response
- [ ] `hooks/useClosestMatch.ts` — Type participation list response
- [ ] `pages/config/OrganisationAuditPage.tsx` — Type audit log response
- [ ] `pages/identity/PeriodCreateModal/usePeriodCreateData.ts` — Type period list

### Stap 2: State + handler typing (~1,5 uur)
- [ ] `pages/identity/directory/useClubsData.ts` — Type `setClubs` state updater
- [ ] `pages/identity/OrgModals.tsx` — Type `setMembers` state updater
- [ ] `pages/identity/UserDetailIdentityTab.tsx` — Verwijder `const user = _user as any`, type correct
- [ ] `hooks/useSports.ts` — Fix `refetch: reload as any`
- [ ] `pages/NotificationsPage.tsx` — Fix `onRefresh={reload as any}`
- [ ] `pages/identity/directory/UsersList.tsx` — Fix `onSave={handleSaveUser as any}`
- [ ] `pages/identity/directory/TeamsList.tsx` — Fix `project={d.editProject as any}`
- [ ] `pages/identity/directory/ClubsList.tsx` — Fix `project={d.editProject as any}`

### Stap 3: Metadata + unwrap patterns (~0,5 uur)
- [ ] `hooks/useClosestMatch.ts` — Type `metadata.lineup`
- [ ] `components/BatchGenerationModal/useBatchGeneration.ts` — Type `metadata.teamreel_assets`
- [ ] `components/BatchGenerationModal/BatchConfigureStep.tsx` — Type `metadata.teamreel_assets`
- [ ] `utils/activeContext.ts` — Type `(raw as any)?.data` unwrap
- [ ] `utils/featureFlagsApi.ts` — Type feature flags response
- [ ] `hooks/useGenerationJobs.ts` — Type generation jobs response

### Stap 4: Generics verbeteren (~0 uur — optioneel)
- [ ] `utils/apiFetch.ts` — `<T = any>` → `<T = unknown>` (breaking change audit nodig)
- [ ] `types/season.ts` — `unwrapListResults<T = any>` → `<T = unknown>`

## Done criteria

- [ ] 0 `api.get<any>` / `api.list<any>` / `api.post<any>` calls in productie-code
- [ ] 0 `as any` op callback props en event handlers
- [ ] `as any` count in productie ≤ 10 (van huidige 25)
- [ ] Explicit `: any` count in productie ≤ 5 (van huidige 33)
- [ ] `npx tsc --noEmit` + `npx vite build` slagen

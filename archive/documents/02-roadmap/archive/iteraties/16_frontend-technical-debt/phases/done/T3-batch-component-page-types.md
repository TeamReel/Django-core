# T3 — Batch, Component & Page Types

**Track:** T — Type Safety
**Status:** ✅ Done
**Geschatte effort:** 3 uur

---

## Doel

Batch-processing, component en page-level `<any>` params typen.

## Scope

| Bestand | `<any>` hits | Actie |
|---------|------------:|-------|
| `pages/activities/LegacyMatchRedirectPage.tsx` | 9 → 0 | `MatchResponse`, `PeriodResponse`, `OrgResponse`, `ProjectResponse` |
| `components/BatchGenerationModal/batchExecution.ts` | 6 → 0 | `ProcessVariantsResponse`, `MemberDetailResponse`, `GenerateResponse`, `GenerateStatusResponse`, `SaveAssetResponse`, `MemberPatchResponse` |
| `hooks/useDirectoryFilters.ts` | 1 → 0 | `OrganisationOption` (reused existing) |

**Totaal:** -16 `<any>` hits (5 minder dan geschat — `useDirectoryFilters` was al deels getyped)

## Wijzigingen

### Nieuwe types
- `MatchResponse`, `PeriodResponse`, `OrgResponse`, `ProjectResponse` (local in `LegacyMatchRedirectPage.tsx`)
- `ProcessVariantsResponse`, `MemberDetailResponse`, `GenerateResponse`, `GenerateStatusResponse`, `SaveAssetResponse`, `MemberPatchResponse` (local in `batchExecution.ts`)

### Hergebruikte types
- `OrganisationOption` (from `directoryFilterTypes.ts`) voor `fetchAllPages` in `useDirectoryFilters.ts`

## Acceptatiecriteria

- [x] 0 `<any>` in de 3 genoemde bestanden
- [x] Typed response interfaces gedocumenteerd
- [x] `tsc --noEmit` passeert (alleen 2 pre-existing errors)
- [x] Geen regressies

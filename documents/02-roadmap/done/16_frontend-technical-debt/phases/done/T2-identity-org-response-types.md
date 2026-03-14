# T2 — Identity & Org Response Types

**Track:** T — Type Safety
**Status:** ✅ Done
**Geschatte effort:** 3 uur

---

## Doel

Identity- en organisation-gerelateerde hooks typen.

## Scope

| Bestand | `<any>` hits | Actie |
|---------|------------:|-------|
| `pages/identity/useClubOrgHierarchy.ts` | 6 → 0 | `Project`, `Period`, `Record<string, unknown>` |
| `pages/periods/useSeasonDataFetching.ts` | 6 → 0 | `MemberRecord`, `MatchRecord`, `BrandingProfileRecord`, `ProjectRecord` |
| `pages/identity/useSeasonSquadAddMemberData.ts` | 5 → 0 | `ProjectOption`, `RawUserRecord`, `MembershipRecord` |
| `pages/identity/orgModalHandlers.ts` | 5 → 0 | `Project`, `Period`, `ActivityRecord` |

**Totaal:** -22 `<any>` hits + 1 `any[]` + 1 `(p: any)` = **-24 any-uses**

## Wijzigingen

### Nieuwe types
- `BrandingProfileRecord` (local in `useSeasonDataFetching.ts`)
- `ProjectRecord` (local in `useSeasonDataFetching.ts`)
- `MembershipRecord` (local in `useSeasonSquadAddMemberData.ts`)
- `ActivityRecord` (local in `orgModalHandlers.ts`)

### Type-uitbreidingen
- `Project` in `clubOrgDetailHelpers.ts`: + `parent_id`, `parent_project_id`, `parent_project`, `parent`
- `Period` in `clubOrgDetailHelpers.ts`: + `activities_count`

## Acceptatiecriteria

- [x] 0 `<any>` in de 4 genoemde bestanden
- [x] Types consistent met bestaande entity interfaces
- [x] `tsc --noEmit` passeert (alleen 2 pre-existing errors)
- [x] Geen regressies

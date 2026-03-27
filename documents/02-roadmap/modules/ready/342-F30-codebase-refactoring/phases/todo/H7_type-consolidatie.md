# H7 — Type Consolidatie (User + Project)

> **Effort:** ~5 uur | **Impact:** Voorkomt runtime bugs, verbetert developer experience

## Context

Frontend audit (maart 2026) toont **meerdere conflicterende type-definities** voor de twee kernentiteiten:

### Project — 5 definities

| Locatie | `id` type | Velden | Gebruik |
|---------|-----------|--------|---------|
| `types/entities.ts` | `string` | Breed, alle parent-varianten | Org/identity pagina's |
| `types/api/project.ts` | `number` | Strikt, met counts | API response types |
| `pages/projects/ProjectListPage.tsx` | inline | Minimaal | Lokaal |
| `pages/activities/ProjectHierarchySeasonRedirectPage.tsx` | inline | Minimaal | Lokaal |
| `pages/activities/match-detail/types.ts` | inline | Minimaal | Lokaal |

**Kernprobleem:** `entities.Project.id` is `string`, `api/project.Project.id` is `number`. Dit veroorzaakt subtiele bugs bij vergelijkingen (`===` faalt als types mixen).

### User — 5 definities

| Locatie | Gebruik |
|---------|---------|
| `types/entities.ts` | Basis user entity |
| `types/api/user.ts` | API response types |
| `pages/identity/AssignUserToOrgModal.tsx` | Inline |
| `pages/identity/linkUserModalTypes.ts` | Eigen User type |
| `pages/identity/UserDetailModals.tsx` | `ModalUser = any` workaround |

### Ongebruikte types

3 exports in `types/entities.ts` worden nergens geïmporteerd:
- `Permission`
- `Role`
- `RoleAssignment`

## To do

### Stap 1: Project type unificatie (~2,5 uur)
- [ ] Definieer één canonical `Project` interface in `types/api/project.ts` met `id: string | number`
- [ ] Voeg ontbrekende velden toe uit `entities.ts` (parent varianten, current_user_access)
- [ ] Migreer alle `entities.Project` imports → `@/types/api/project`
- [ ] Verwijder `Project` export uit `types/entities.ts`
- [ ] Verwijder 3 inline `Project` definities in pagina's
- [ ] Fix alle TSC errors die ontstaan door de migratie
- [ ] Voeg `membership_id?: string` toe (gebruikt in UserDetail, maar niet in type)

### Stap 2: User type unificatie (~2 uur)
- [ ] Definieer één canonical `User` interface in `types/api/user.ts`
- [ ] Voeg ontbrekende velden toe uit `entities.ts` en inline definities
- [ ] Migreer alle `entities.User` imports → `@/types/api/user`
- [ ] Verwijder inline `User` definities in modals/pagina's
- [ ] Verwijder `ModalUser = any` workaround in `UserDetailModals.tsx`
- [ ] Fix alle TSC errors

### Stap 3: Cleanup (~0,5 uur)
- [ ] Verwijder ongebruikte exports: `Permission`, `Role`, `RoleAssignment`
- [ ] Controleer of `types/entities.ts` leeg kan worden (alles gemigreerd naar `types/api/`)
- [ ] `npx tsc --noEmit` — 0 nieuwe errors
- [ ] `npx vite build` slaagt

## Done criteria

- [ ] Exact 1 `Project` interface in de codebase (in `types/api/project.ts`)
- [ ] Exact 1 `User` interface in de codebase (in `types/api/user.ts`)
- [ ] 0 inline type definities voor User/Project in pagina-bestanden
- [ ] 0 `ModalUser = any` workarounds
- [ ] 0 ongebruikte type exports in `types/entities.ts`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen

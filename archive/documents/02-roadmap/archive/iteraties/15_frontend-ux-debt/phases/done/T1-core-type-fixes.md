# T1 — Core Type Fixes

**Status:** ✅ Done
**Effort:** ~1 uur
**Bestanden:** 4 files, 14 `any` → proper types

## Wat is gedaan

Eliminatie van `any` types in core type-definities en shared types die door meerdere pagina's worden geïmporteerd.

## Gewijzigde bestanden

### `demo/src/pages/activities/matchDetailTypes.ts`
- **6 `any` → typed:** `user: User | null`, `org: SeasonOrganisation | null`, `project: Project | null`, `club: Project | null`, `season: Period | null`, `lineupSquad: Record<string, Record<string, unknown>[]>`
- Toegevoegd: `import type { User } from '@django-core/auth-ui'` en `import type { SeasonOrganisation } from '../../types/season'`

### `demo/src/pages/identity/userDetailTypes.ts`
- **3 `any` → typed:** `user: Record<string, unknown> | null`, `setUser: (u: Record<string, unknown> | null) => void`, `handleSaveUser: (updatedUser: Record<string, unknown>) => Promise<void>`
- `Record<string, unknown>` gekozen omdat user shape dynamisch is (komt overeen met `useState<Record<string, unknown> | null>` in useUserDetailApi)

### `demo/src/types/api/project.ts`
- **2 `any` → typed:** `parent` en `parent_project` → `number | string | { id: number | string; name?: string } | null`
- Union type dekt zowel ID-only als nested object responses van de API

### `demo/src/types/season.ts`
- **3 `any` → typed:** `organisation?: { id: string | number; name?: string; slug?: string } | null`, `metadata?: Record<string, unknown>`, `unwrapListResults<T = unknown>(raw: unknown)`

## Verificatie

- 0 TypeScript errors in alle 4 bestanden
- 0 cascading errors in consumer directories (activities, identity, types)

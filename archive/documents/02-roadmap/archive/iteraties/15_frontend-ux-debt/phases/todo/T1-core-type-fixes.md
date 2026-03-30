# T1 — Core Type Fixes

**Track:** T — Type Safety
**Effort:** 2 uur
**Status:** 🔲 Todo

## Probleem

Core type files bevatten structural `any` types die type safety ondermijnen.

## Target Files

- `types/matchDetailTypes.ts`
- `types/userDetailTypes.ts`
- `types/project.ts`
- `types/season.ts`

## Oplossing

Replace `any` → specifieke types op basis van runtime usage.

## Acceptatiecriteria

- [ ] 0 `any` in target files
- [ ] Downstream consumers compileren zonder errors
- [ ] 0 TypeScript errors

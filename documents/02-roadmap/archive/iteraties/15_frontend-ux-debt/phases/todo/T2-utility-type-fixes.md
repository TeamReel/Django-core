# T2 — Utility Type Fixes

**Track:** T — Type Safety
**Effort:** 1 uur
**Status:** 🔲 Todo

## Probleem

Utility/helper type files bevatten structural `any` types.

## Target Files

- `types/apiEnvelope.ts`
- `utils/orgDataHelpers.ts`
- `types/creditsTypes.ts`

## Oplossing

Replace `any` → specifieke types op basis van API response shapes en runtime usage.

## Acceptatiecriteria

- [ ] 0 `any` in target files
- [ ] Downstream consumers compileren zonder errors
- [ ] 0 TypeScript errors

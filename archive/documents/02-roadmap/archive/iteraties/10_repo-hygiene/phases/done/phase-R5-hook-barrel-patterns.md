# R5 — Hook Barrel & Module Patterns

**Status:** 🔲 Todo
**Effort:** 1 uur
**Scope:** Fix incomplete barrel export, consolideer module patterns

---

## Doel

De `hooks/index.ts` barrel exporteert slechts 3 van ~35+ hooks. Daarnaast is er een fragiel patroon bij `useCompetitionsData` (zowel `.ts` shim als `/folder`). Dit verbeteren voor consistentie en developer experience.

## Current State

### hooks/index.ts barrel

```typescript
// Exporteert alleen:
export { useQueryParams } from './useQueryParams';
export { usePolling } from './usePolling';
export { useApiBase } from './useApiBase';
// + lazy default export met dezelfde 3
```

**Ontbrekend:** ~32 hooks die niet via barrel te importeren zijn.

### useCompetitionsData dual pattern

| Path | Type | Probleem |
|------|------|----------|
| `hooks/useCompetitionsData.ts` | Re-export shim | Forwardt naar folder |
| `hooks/useCompetitionsData/index.ts` | Actual implementation | Bulk of logic |

Dit werkt maar is fragiel — als de shim verwijderd wordt of de folder hernoemd, breken imports.

## Acties

1. **Inventariseer** alle hooks in `demo/src/hooks/`
2. **Keuze:** Of barrel volledig vullen óf barrel verwijderen (direct imports zijn ook prima)
3. **Aanbeveling:** Verwijder de barrel + default lazy export (anti-pattern voor hooks). Direct imports zijn duidelijker en tree-shakeable.
4. **useCompetitionsData:** Kies één patroon — of alles in .ts file, of alles in /folder met index.ts. Verwijder de shim.
5. Verifieer: `npx tsc --noEmit` + `npx vitest run`

## Verificatie

- [ ] Geen inconsistente barrel exports
- [ ] useCompetitionsData heeft één duidelijk pad
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

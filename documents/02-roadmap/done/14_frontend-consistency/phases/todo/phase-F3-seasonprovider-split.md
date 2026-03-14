# F3 — SeasonProvider Split

**Status:** 🔲 Todo
**Track:** F — File Splitting
**Effort:** 1.5 uur
**Dependencies:** Geen

---

## Doel

Split `SeasonProvider.tsx` (396 regels) naar context + data hook.

## Huidige Staat

```
demo/src/providers/SeasonProvider.tsx — 396 regels
├── SeasonContext
├── Data fetching logic
├── Cache management
├── Active season selection
└── Provider component
```

Het probleem: data fetching logic zit gemixed met context boilerplate.

## Target

```
demo/src/providers/
├── SeasonProvider.tsx — Context + Provider (~100 regels)
├── useSeasonData.ts — Data fetching + cache (~200 regels)
└── seasonProviderHelpers.ts — (exists, helper functions)
```

## Voordelen

- **Testbaar:** Data hook kan apart getest worden
- **Herbruikbaar:** Data hook kan buiten provider gebruikt worden
- **Leesbaar:** Provider focust op context, hook focust op data

## Acties

1. [ ] Identificeer welke logica puur data fetching is
2. [ ] Extract naar `useSeasonData.ts`
3. [ ] Laat SeasonProvider de hook gebruiken
4. [ ] Behoud exports voor backwards compatibility
5. [ ] Update tests indien nodig

## Verificatie

- [ ] Beide files <300 regels
- [ ] Context werkt identiek
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

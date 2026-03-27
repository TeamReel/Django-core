# T4 — Test Mock Types

**Status:** 🔲 Todo
**Track:** T — Type Safety
**Effort:** 1 uur
**Dependencies:** Geen

---

## Doel

Fix `as any[]` casts in test files met proper mock types.

## Probleembestanden

### derived.test.ts

```tsx
// 15+ occurrences
const mockData = [...] as any[];
```

## Patroon

In tests wordt vaak `as any[]` gebruikt om mock data te casten. Dit verbergt type fouten.

### SLECHT

```tsx
const mockMatches = [{ id: '1' }] as any[];
```

### GOED

```tsx
import type { Match } from '@/types';

const mockMatches: Partial<Match>[] = [{ id: '1' }];
// of
const mockMatches = [{ id: '1' }] satisfies Partial<Match>[];
```

## Acties

1. [ ] Identificeer alle `as any[]` in test files
2. [ ] Bepaal correct type voor elke mock
3. [ ] Gebruik `Partial<T>[]` of `satisfies` voor type-safe mocks
4. [ ] Creëer test helpers/factories waar nuttig: `createMockMatch()`

## Verificatie

- [ ] Geen `as any[]` in test files
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

# T4 — Test Mock Types

**Status:** ✅ Done
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

1. [x] Identificeer alle `as any[]` in test files
2. [x] Bepaal correct type voor elke mock
3. [x] Gebruik `Partial<T>[]` of `satisfies` voor type-safe mocks
4. [x] Creëer test helpers/factories waar nuttig: `createMockMatch()`

## Verificatie

- [x] Geen `as any[]` in test files
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green
- [x] Gecommit + gepusht

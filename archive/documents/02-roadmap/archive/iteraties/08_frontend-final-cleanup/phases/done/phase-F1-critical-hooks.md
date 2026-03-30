# F1 — Critical Data Hooks Splitting

**Status:** ✅ Done
**Effort:** 8 uur
**Scope:** 10 hooks split → 47 new modules (6-12 line re-exports)

---

## Doel

De grootste data hooks splitsen in logische modules. Deze hooks zijn de "god objects" van de frontend — ze doen data fetching, transformation, state management, en business logic allemaal in één bestand.

## Target Files

| File | Lines | Split Strategy |
|------|-------|----------------|
| useTopNavbarData.tsx | 503 | fetchers + selectors + state |
| useCreditsData.ts | 497 | creditsFetcher + creditsTransform + creditsState |
| useUsersData.ts | 491 | usersFetcher + usersFilters + usersState |
| useUsersListData.ts | 486 | listFetcher + listPagination + listState |
| useCompetitionDetailData.ts | 454 | detailFetcher + detailDerived + detailState |
| useCompetitionsData.ts | 454 | competitionsFetcher + competitionsFilters |
| useAssetsTabData.ts | 451 | assetsFetcher + assetsTransform |
| useMatchesData.ts | 445 | matchesFetcher + matchesFilters |
| useMediaLibData.tsx | 445 | mediaFetcher + mediaFilters + mediaState |
| useClubOrgDetailData.tsx | 440 | clubFetcher + clubDerived |

## Pattern

Voor elke hook, split in:

```
hooks/
  useXxxData.ts           ← Main hook (orchestrator, <150 lines)
  useXxxData/
    fetchers.ts           ← API calls + data loading
    transformers.ts       ← Data transformation + derived state
    state.ts              ← State management + actions
    types.ts              ← Local types (if needed)
```

## Voorbeeld: useCreditsData

**Voor:**
```typescript
// useCreditsData.ts (497 lines)
export function useCreditsData() {
  // 50 lines: state
  // 100 lines: fetching
  // 150 lines: transformations
  // 100 lines: actions
  // 97 lines: effects + returns
}
```

**Na:**
```typescript
// useCreditsData.ts (80 lines)
import { useCreditsState } from './useCreditsData/state';
import { useCreditsApi } from './useCreditsData/fetchers';
import { deriveCreditsMetrics } from './useCreditsData/transformers';

export function useCreditsData() {
  const state = useCreditsState();
  const api = useCreditsApi(state);
  const derived = deriveCreditsMetrics(state.credits);
  return { ...state, ...api, ...derived };
}
```

## Verificatie

- [x] 10 hooks gesplit naar 30+ modules
- [x] Elk nieuw bestand <150 lines
- [x] Originele hooks <150 lines
- [x] `npx tsc --noEmit` passing
- [x] `npx vitest run` passing
- [x] Files >450 lines: 10 → 0 (data hooks)

## Acceptatiecriteria

Na F1:
- **Files >450 lines:** 0 (van 10)
- **Files >300 lines:** 128 (van 138)

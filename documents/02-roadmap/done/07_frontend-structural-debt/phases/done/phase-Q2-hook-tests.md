# Q2 — Hook Tests

**Status:** ✅ Done
**Effort:** 6 uur
**Scope:** 15 hook test files added (116 total tests, from 30)
**Vereist:** Q1

---

## Doel

Shared hooks zijn het hart van de applicatie — ze worden overal gebruikt. Een bug in een hook raakt alle pages die hem gebruiken. Minimaal de top 15 hooks moeten getest zijn.

## Test targets (prioriteit)

| Hook | Regels | Reden |
|------|--------|-------|
| `useCompetitionsData` | 491 | Complex data fetching + caching |
| `useSeasonsData` | 382 | Veel state + pagination |
| `useVideoJobs` | 359 | Polling + state machine |
| `useWorkflows` | 350 | Complex state transitions |
| `useNotifications` | 284 | Real-time + localStorage |
| `useBrandAssets` | 260 | File upload + processing |
| `useSearch` | 248 | Debounce + pagination |
| `useDirectoryFilters` | 449 | Complex filter logic |
| `useBrandProfile` | 419 | Multi-step updates |
| `useAppSelection` | 391 | URL sync + persistence |
| `useMatchesData` | 446 | Pagination + sorting |
| `useGenerationJobs` | 203 | Polling + status tracking |
| `useAssetGeneration` | 456 | Multi-step generation flow |
| `useCreditBalance` | 88 | Simple but critical |
| `useActivities` | 88 | Simple but widely used |

## Test pattern per hook

```typescript
describe('useCompetitionsData', () => {
  it('fetches competitions on mount', async () => { ... });
  it('handles pagination correctly', async () => { ... });
  it('returns error state on API failure', async () => { ... });
  it('refetches on projectId change', async () => { ... });
  it('deduplicates concurrent requests', async () => { ... });
});
```

## Verificatie

- [x] 15+ hook test files
- [x] Alle tests passing (`npx vitest run`)
- [x] Edge cases getest (error, empty, loading)
- [x] Coverage >80% voor geteste hooks

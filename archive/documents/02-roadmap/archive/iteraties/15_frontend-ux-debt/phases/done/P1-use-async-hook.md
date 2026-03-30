# P1 — useAsync Hook

**Status:** ✅ Done
**Effort:** 2 uur

## Scope
Generieke `useAsync<T>` hook creëren en adopteren in de eerste 5 pages die het useState-triple + useEffect fetch pattern gebruiken.

## Hook: `demo/src/hooks/useAsync.ts`

```ts
useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList)
→ { data: T | null, setData, loading: boolean, error: string | null, reload: () => void }
```

**Features:**
- AbortSignal support voor cleanup bij unmount/dep change
- `reload()` via token-based re-trigger
- `setData` voor optimistic updates
- Gebruikt `getErrorMessage` uit bestaande error helpers
- Ref-based fn stability

## Adoptie — 5 Pages

| # | Page | Vervangen |
|---|------|-----------|
| 1 | OrganisationListPage.tsx | useState triple + useEffect → `useAsync(() => organisationsApi.list())` |
| 2 | HealthCheckPage.tsx | useState triple + useEffect → `useAsync(async (signal) => apiFetch(..., { signal }))` |
| 3 | ConstitutionPage.tsx | useState triple + useEffect → `useAsync(async (signal) => apiFetch('/api/constitution/rules/', { signal }))` |
| 4 | DocsNotificationsPage.tsx | useState triple + useEffect + fetchNotifications → `useAsync` met `setData` voor optimistic toggle + `reload()` voor markAllAsRead |
| 5 | ProjectListPage.tsx | 2× useState/useEffect → 2× `useAsync` (orgName + projects), dep op orgId |

## Result
- 1 nieuwe hook + 5 pages gewijzigd, 0 TypeScript errors
- ~80 regels boilerplate per page verwijderd
- Consistent loading/error/data pattern in alle 5 pages

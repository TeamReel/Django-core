# D5 — Dashboard Request Deduplicatie

> **Status:** ✅ Afgerond (commit `ce44e1a8`)
> **Geschatte effort:** 4-6 uur
> **Geschatte omvang:** ~400 regels migratie
> **Bron:** [optimalisatie-analyse.md — §1](../../../05-demo/plans/optimalisatie-analyse.md)

## Doel

Alle dashboard hooks migreren naar TanStack Query met shared query keys. Dashboard API calls 23 → ~10 via automatische deduplicatie. Route-overgang instant uit cache met background refresh.

## Probleem — Dashboard API blast

Bij dashboard mount vuren **23 API calls** simultaan, waarvan 13 duplicaten:

| Endpoint | Calls | Uniek nodig | Duplicaten |
|----------|------:|:-----------:|:----------:|
| `/generative/requests/` (completed) | **5×** | 1 | 4 |
| `/organisations/{slug}/projects/{slug}/members/` | **4×** | 1 | 3 |
| `/activities/` (diverse filters) | **3×** | 2 | 1 |
| `/organisations/{slug}/` | **2×** | 1 | 1 |
| `/credits/balance-policies/` | **2×** | 1 | 1 |
| Overige (uniek) | 7 | 7 | 0 |
| **Totaal** | **23** | **~10** | **~13** |

## Taken

### 1. Migreer dashboard card hooks

Elke card die nu een eigen `useEffect` + `useState` fetch doet → `useQuery` met shared query keys.

| Card | Huidige fetch | Migratie naar |
|------|--------------|---------------|
| **ContentBreakdownCard** | `useEffect` → `/generative/requests/` | `useQuery(queryKeys.generative.requests({ status: 'completed' }))` |
| **ContentOverviewCard** | `useEffect` → `/generative/requests/` + `/media/items/` | Twee `useQuery` calls, dedup automatisch |
| **MemberContentProgressCard** | `useEffect` → `/members/` + `/generative/requests/` | Twee `useQuery` calls |
| **AssetsOverviewCard** | `useEffect` → `/branding/assets/` + `/members/` + `/generative/requests/` | Drie `useQuery` calls, members shared key |
| **SmartActionsCard** | `useEffect` → `/members/` + `/generative/requests/` | Twee `useQuery` calls |
| **SquadReadinessCard** | `useEffect` → `/members/` count | `useQuery(queryKeys.members.byProject(projectId))` |

### 2. Shared data hooks

Sommige data wordt door 4+ cards gebruikt. Maak dedicated hooks:

```typescript
// demo/src/hooks/useProjectMembers.ts
export function useProjectMembers(projectSlug?: string) {
  return useQuery({
    queryKey: queryKeys.members.byProject(projectSlug ?? ''),
    queryFn: () => api.list('/members/', { params: { project: projectSlug } }),
    enabled: !!projectSlug,
  });
}

// demo/src/hooks/useGenerativeRequests.ts
export function useGenerativeRequests(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.generative.requests(filters),
    queryFn: () => api.list('/generative/requests/', { params: filters }),
  });
}
```

Cards importeren dezelfde hooks → React Query deduplicat automatisch.

### 3. staleTime tuning per data type

| Data type | staleTime | Reden |
|-----------|----------:|-------|
| Match (real-time) | 2 min | Score updates, lineup saves |
| Members (semi-static) | 10 min | Zelden wijzigt binnen sessie |
| Generative requests | 1 min | Status kan snel veranderen |
| Templates | 30 min | Vrijwel statisch |
| Credits balance | 5 min | Wijzigt na generatie |
| Branding assets | 15 min | Zelden wijzigt |

### 4. Invalidation na mutaties

```typescript
// Na lineup save:
queryClient.invalidateQueries({ queryKey: queryKeys.activities.match(matchId) });

// Na content generatie:
queryClient.invalidateQueries({ queryKey: queryKeys.generative.requests() });
queryClient.invalidateQueries({ queryKey: queryKeys.media.byActivity(matchId) });

// Na member toevoegen:
queryClient.invalidateQueries({ queryKey: queryKeys.members.byProject(projectId) });
```

### 5. Navigatie-cache (instant back)

Dashboard → Match → Dashboard: data instant uit cache, background refetch.
Geen loading spinner bij terugnavigatie.

## Verwachte impact

| Metric | Huidig | Na D5 |
|--------|-------:|------:|
| Dashboard API calls | 23 | ~10 |
| Duplicate requests | 13 | 0 |
| Dashboard → Match → Dashboard | 23 calls opnieuw | 0 calls (cache hit) |
| Perceived load time | ~1.5s | ~0.3s (cache) |

## Gewijzigde bestanden (verwacht)

| Bestand | Wijziging |
|---------|-----------|
| `demo/src/hooks/useProjectMembers.ts` | **Nieuw** — shared React Query hook |
| `demo/src/hooks/useGenerativeRequests.ts` | **Nieuw** — shared React Query hook |
| `demo/src/components/dashboard/ContentBreakdownCard.tsx` | Migreer naar `useQuery` |
| `demo/src/components/dashboard/ContentOverviewCard.tsx` | Migreer naar `useQuery` |
| `demo/src/components/dashboard/MemberContentProgressCard.tsx` | Migreer naar `useQuery` |
| `demo/src/components/dashboard/AssetsOverviewCard.tsx` | Migreer naar `useQuery` |
| `demo/src/components/dashboard/SmartActionsCard.tsx` | Migreer naar `useQuery` |
| `demo/src/components/dashboard/DashboardSummaries.tsx` | Migreer summary cards naar `useQuery` |

## Acceptatiecriteria

- [x] Alle dashboard cards gebruiken `useQuery` i.p.v. `useEffect` + `useState`
- [x] Dashboard API calls ≤ 12 (gemeten via browser DevTools Network tab)
- [x] 0 duplicate requests op dashboard mount
- [x] `staleTime` per data type geconfigureerd
- [x] Navigatie dashboard → pagina → dashboard: instant uit cache
- [x] Mutaties (save/generate) invalidaten relevante queries
- [x] TypeScript clean, Vite build succesvol
- [x] Geen regressies in card data weergave

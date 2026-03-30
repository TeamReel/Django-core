# D4 — TanStack Query Introductie

> **Status:** ✅ Voltooid
> **Geschatte effort:** 4-6 uur
> **Geschatte omvang:** ~200 regels nieuw + ~300 regels migratie
> **Bron:** [optimalisatie-analyse.md — §1](../../../05-demo/plans/optimalisatie-analyse.md)

## Doel

`@tanstack/react-query` v5 introduceren als data fetching layer. Automatische caching, request deduplicatie, en stale-while-revalidate — de basis voor alle D5/D6 optimalisaties.

## Probleem

| Metric | Huidig | Na D4 |
|--------|-------:|------:|
| Caching library | Geen | TanStack Query v5 |
| Request deduplicatie | Geen | Automatisch via query keys |
| Cache invalidatie | Handmatig (geen) | `staleTime` + `gcTime` |
| Background refresh | Geen | `refetchOnWindowFocus` |
| Loading state management | Handmatig `useState` | `isLoading` / `isFetching` |

## Taken

### 1. Installatie + configuratie

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

### 2. QueryClientProvider setup

```typescript
// demo/src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — data is "fresh"
      gcTime: 10 * 60 * 1000,         // 10 min — garbage collect
      refetchOnWindowFocus: true,      // achtergrond-refresh
      retry: 1,                         // 1 retry bij failure
      refetchOnMount: 'always',        // altijd refetch bij mount (maar cache tonen)
    },
  },
});
```

Wrap in `AppShell.tsx` of `main.tsx` (boven `RouterProvider`).

### 3. Query key conventie

```typescript
// demo/src/utils/queryKeys.ts
export const queryKeys = {
  // Activities
  activities: {
    all: ['activities'] as const,
    match: (matchId: string) => ['activities', 'match', matchId] as const,
    closest: (projectId: string) => ['activities', 'closest', projectId] as const,
  },
  // Members
  members: {
    all: ['members'] as const,
    byProject: (projectId: string) => ['members', 'project', projectId] as const,
  },
  // Generative requests
  generative: {
    all: ['generative'] as const,
    requests: (filters?: Record<string, string>) => ['generative', 'requests', filters] as const,
  },
  // Media
  media: {
    all: ['media'] as const,
    byActivity: (activityId: string) => ['media', 'activity', activityId] as const,
  },
  // Credits
  credits: {
    balance: (orgSlug?: string) => ['credits', 'balance', orgSlug] as const,
  },
  // Content templates
  templates: {
    all: ['templates'] as const,
    active: () => ['templates', 'active'] as const,
    flags: (orgId?: string) => ['templates', 'flags', orgId] as const,
  },
  // Branding
  branding: {
    assets: (projectId?: string) => ['branding', 'assets', projectId] as const,
  },
} as const;
```

### 4. Eerste hook migratie: `useClosestMatch`

Migreer `ActiveMatchCard` interne fetch naar een `useQuery`:

```typescript
// Voorbeeld pattern:
const { data: match, isLoading } = useQuery({
  queryKey: queryKeys.activities.closest(projectId),
  queryFn: () => fetchClosestMatch(projectId),
  staleTime: 2 * 60 * 1000, // 2 min for real-time match data
});
```

### 5. React Query Devtools

Alleen in development mode — floating panel voor cache inspectie:

```typescript
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
```

## Wat NIET in D4

- ❌ Alle dashboard hooks migreren (dat is D5)
- ❌ Waterfall eliminatie (dat is D6)
- ❌ `useLineupSheet` / `useContentSheet` migreren naar React Query

D4 is puur **infrastructuur + proof of concept** met 1-2 hooks.

## Gewijzigde bestanden (verwacht)

| Bestand | Wijziging |
|---------|-----------|
| `demo/package.json` | `@tanstack/react-query` + devtools dependency |
| `demo/src/providers/QueryProvider.tsx` | **Nieuw** — QueryClient + Provider |
| `demo/src/utils/queryKeys.ts` | **Nieuw** — query key factory |
| `demo/src/main.tsx` of `AppShell.tsx` | Wrap met `QueryClientProvider` |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | Migreer fetch naar `useQuery` |

## Acceptatiecriteria

- [x] `@tanstack/react-query` v5 geïnstalleerd
- [x] `QueryClientProvider` wraps de hele app
- [x] Query key conventie gedocumenteerd in `queryKeys.ts`
- [x] Minimaal 1 dashboard hook gemigreerd (ActiveMatchCard)
- [x] React Query Devtools beschikbaar in development
- [x] `staleTime` + `gcTime` defaults geconfigureerd
- [x] Bestaande functionaliteit ongewijzigd (geen regressies)
- [x] TypeScript clean, Vite build succesvol

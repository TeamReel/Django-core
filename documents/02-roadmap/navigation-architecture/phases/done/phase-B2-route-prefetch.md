# B2 — Route Prefetch & Preload

**Status:** 🔲 Todo
**Track:** B — Bundle & Performance
**Effort:** 3 uur
**Dependencies:** R4 (createBrowserRouter), B1 (barrel splits)

---

## Doel

Voorlaad chunks voor waarschijnlijke volgende navigatie-stappen. Een gebruiker op de Season-pagina gaat waarschijnlijk naar een Match → preload dat chunk.

## Huidige Staat

- Lazy loading via `lazyWithRetry()` → chunk wordt geladen **op het moment van navigatie**
- Gebruiker ziet `<Suspense fallback={<SkeletonDashboard />}>` tijdens laden
- Geen prefetch of preload strategie

## Target

- **<100ms perceived navigation** voor voorspelbare flows
- Chunks van waarschijnlijke volgende pagina worden **background-loaded** zodra de huidige pagina geladen is

## Aanpak

### Met createBrowserRouter (na R4)

React Router Data Router biedt native prefetch:

```tsx
<Link to={routes.match(...)} prefetch="intent">
  Match bekijken
</Link>
```

`prefetch="intent"` = chunk laden zodra gebruiker muisover doet (desktop) of touch start (mobile).

### Zonder createBrowserRouter (huidige router)

Handmatige prefetch via Vite dynamic import:

```tsx
// Preload een chunk in de background
function usePreloadRoute(importFn: () => Promise<unknown>) {
  useEffect(() => {
    const timer = setTimeout(() => importFn(), 2000); // na 2s idle
    return () => clearTimeout(timer);
  }, []);
}

// Gebruik op SeasonDetailPage:
usePreloadRoute(() => import('./pages/activities/MatchDetailWrapper'));
```

### Voorspelbare flows

| Huidige pagina | Waarschijnlijk volgende | Preload |
|---------------|------------------------|---------|
| Dashboard | Directory, Season | Medium priority |
| Team detail | Season detail | Hoog priority |
| Season detail | Match detail, Member detail | Hoog priority |
| Competition | Match detail | Hoog priority |
| Directory | Org/Club/Team detail | Medium priority |
| AI Studio | Approvals | Laag priority |

## Scope

### 1. Creëer `usePreloadRoutes()` hook

```tsx
function usePreloadRoutes(routes: Array<() => Promise<unknown>>, delay = 2000) {
  useEffect(() => {
    const timer = setTimeout(() => {
      routes.forEach(r => r().catch(() => {})); // background, silent fail
    }, delay);
    return () => clearTimeout(timer);
  }, []);
}
```

### 2. Voeg preloads toe aan key pages

- `SeasonDetailPage` → preload MatchDetailPage
- `TeamDetailPage` → preload SeasonDetailPage
- `DashboardPage` → preload DirectoryPage

### 3. Na R4: migreer naar `<Link prefetch="intent">`

Als createBrowserRouter beschikbaar is, vervang handmatige preloads door native React Router prefetch.

## Acties

1. [ ] Creëer `demo/src/hooks/usePreloadRoutes.ts`
2. [ ] Voeg preloads toe aan Season, Team, Dashboard pages
3. [ ] Meet: Lighthouse navigatie-timing voor/na
4. [ ] Na R4: migreer naar `prefetch="intent"` op Links

## Verificatie

- [ ] MatchDetail chunk is al geladen wanneer gebruiker klikt vanuit Season
- [ ] Geen zichtbare Skeleton flash voor voorspelbare navigatie
- [ ] Geen performance regressie (preloads pas na idle)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

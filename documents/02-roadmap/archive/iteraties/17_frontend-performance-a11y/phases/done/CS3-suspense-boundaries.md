# CS3 — Nested Suspense Boundaries

**Status:** ✅ Compleet
**Prioriteit:** 🔴 Hoog
**Geschatte effort:** 2-3 uur
**Afhankelijk van:** CS2

---

## Doel

Voeg granulaire Suspense boundaries toe per route-groep, zodat gebruikers een contextspecifieke loading state zien in plaats van een full-page skeleton.

## Huidige staat

- 1 globale Suspense in `AppShell.tsx` met `SkeletonDashboard` fallback
- Alle 99+ routes delen dezelfde loading state
- Geen progressive loading: navigatie naar admin toont altijd dashboard skeleton

## Taken

### 1. Maak route-groep specifieke loading skeletons

Nieuwe componenten in `components/loading/`:
```
components/loading/
├─ SkeletonIdentity.tsx     — Skeleton voor org/club/team pages
├─ SkeletonTable.tsx        — Skeleton voor list/table pages (config, users)
├─ SkeletonDetail.tsx       — Skeleton voor detail pages met tabs
├─ SkeletonStudio.tsx       — Skeleton voor gallery/media grid
└─ SkeletonAdmin.tsx        — Skeleton voor admin/config pages
```

### 2. Wrap route groepen met Suspense in `appRouteGroups.tsx`

```tsx
// Voorbeeld voor identity routes:
function getIdentityRoutes(): RouteObject[] {
  return [
    {
      element: (
        <Suspense fallback={<SkeletonIdentity />}>
          <Outlet />
        </Suspense>
      ),
      children: [
        // ... alle identity routes
      ],
    },
  ];
}
```

Herhaal voor:
- `getAdminRoutes()` → `<SkeletonAdmin />`
- Content routes in `router.tsx` → `<SkeletonStudio />`
- Work/list routes → `<SkeletonTable />`

### 3. Houd globale Suspense als top-level fallback

De AppShell Suspense blijft bestaan als catch-all, maar wordt zelden geactiveerd omdat nested boundaries eerder triggeren.

### 4. Test elke route-groep
- Clear browser cache
- Navigeer naar identity → SkeletonIdentity verschijnt kort
- Navigeer naar config → SkeletonAdmin verschijnt kort
- Navigeer naar studio → SkeletonStudio verschijnt kort

## Acceptatiecriteria

- [x] Minstens 5 Suspense boundaries (was: 1) — **6 boundaries**: AppShell (global) + 5 route-level (work-list, studio, hierarchy, identity, admin)
- [x] Elk route-groep toont passende loading skeleton — SkeletonTablePage voor list/admin, SkeletonDetailPage voor identity/hierarchy, SkeletonGrid voor studio
- [x] Geen visuele regressie — build succesvol, bestaande skeletons hergebruikt
- [x] Skeleton componenten gebruiken CSS Modules (geen inline styles) — bestaande SkeletonComposites met Skeleton.module.css
- [x] Globale Suspense in AppShell blijft als fallback — ongewijzigd

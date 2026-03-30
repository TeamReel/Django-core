# R4 — createBrowserRouter Migration

**Status:** 🔲 Todo
**Track:** R — Route Architecture
**Effort:** 8 uur
**Dependencies:** R1, R2, R3 (route-structuur moet al simpeler zijn)

---

## Doel

Migreer van `<Routes>/<Route>` (Component Router) naar `createBrowserRouter` (Data Router API). Dit is de officiële React Router v6.4+ aanbeveling en de standaard voor nieuwe projecten.

## Waarom

| Feature | Component Router (nu) | Data Router (target) |
|---------|----------------------|---------------------|
| **Route loaders** | ❌ Data laden in useEffect | ✅ Data laden vóór render → geen loading flash |
| **Error boundaries** | ❌ Manueel per route | ✅ `errorElement` per route automatisch |
| **Pending UI** | ❌ | ✅ `useNavigation().state === 'loading'` |
| **Nested layouts** | ⚠️ Mogelijk maar verbose | ✅ Ingebouwd via `children` |
| **Typed route params** | ❌ `useParams<{}>()` handmatig | ✅ Via route config |
| **Link prefetch** | ❌ | ✅ `<Link prefetch="intent">` |
| **Action handlers** | ❌ | ✅ Forms & mutations via `action` |

## Huidige Staat (Component Router)

```tsx
// App.tsx — flat <Routes> met 100+ routes
<Routes>
  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
  {getHierarchyRoutes()}
  {getIdentityRoutes()}
  {getAdminRoutes()}
</Routes>
```

## Target (Data Router)

```tsx
// router.ts — centraal, declaratief
const router = createBrowserRouter([
  // Public
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected (MainLayout)
  {
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },

      // Hierarchy — geneste layouts
      {
        path: ':orgId',
        element: <OrgContextLayout />,
        children: [
          { index: true, element: <OrganisationDetailPage /> },
          { path: 'clubs', element: <OrgClubsPage /> },
          { path: 'teams', element: <OrgTeamsPage /> },
          {
            path: ':clubId/:projectId',
            element: <TeamLayout />,
            children: [
              { index: true, element: <TeamDetailPage /> },
              {
                path: ':seasonId',
                element: <SeasonDetailPage />,
                children: [
                  {
                    path: ':competitionId/:matchId',
                    element: <MatchDetailPage />,
                  },
                ],
              },
            ],
          },
        ],
      },

      // Admin
      ...adminRoutes,
      // Config
      ...configRoutes,
    ],
  },
]);

// App.tsx
function App() {
  return <RouterProvider router={router} />;
}
```

## Scope

### Fase 1: Router definitie

1. Creëer `demo/src/router.ts` met `createBrowserRouter`
2. Migreer alle routes uit `App.tsx`, `appRouteGroups.tsx`
3. Nest de hiërarchie-routes als `children`
4. Vervang `<Routes>` in `App.tsx` door `<RouterProvider>`

### Fase 2: Error boundaries

1. Creëer generiek `<RouteErrorBoundary>` component
2. Voeg `errorElement` toe aan route groups (hierarchy, identity, admin)

### Fase 3: Layout nesting

1. Creëer `OrgContextLayout` — zet org-context, render `<Outlet />`
2. Creëer `TeamLayout` — zet team-context, render `<Outlet />`
3. Hiërarchie-pagina's hoeven geen eigen context meer te laden

### Fase 4: Eerste loaders (optioneel in deze fase)

1. Voeg `loader` toe aan SeasonDetailPage (pre-fetch season data)
2. Voeg `loader` toe aan MatchDetailPage (pre-fetch match data)
3. Gebruik `useLoaderData()` in pages

## Migratie Strategie

**Incrementeel:** React Router ondersteunt een "bridge" aanpak:

```tsx
// Stap 1: Wrap bestaande routes
const router = createBrowserRouter(
  createRoutesFromElements(
    // Bestaande <Route> elementen werken ongewijzigd!
    <Route element={<MainLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* ... alle bestaande routes ... */}
    </Route>
  )
);
```

Dit maakt het mogelijk om geleidelijk te migreren: eerst de router-definitie verplaatsen, dan per route groep nesten en loaders toevoegen.

## Risico's

| Risico | Mitigatie |
|--------|----------|
| Breaking change voor alle routes | `createRoutesFromElements` bridge |
| Context providers (Auth, Theme) moeten buiten router | Verplaats naar `router.tsx` root |
| Lazy loading moet anders | `lazy: () => import(...)` per route |
| Tests mocken `useNavigate` | Verplaats naar `createMemoryRouter` in tests |

## Acties

1. [ ] Creëer `demo/src/router.ts` met `createRoutesFromElements` bridge
2. [ ] Vervang `<BrowserRouter>` + `<Routes>` door `<RouterProvider>`
3. [ ] Verifieer alle bestaande tests nog werken
4. [ ] Migreer hiërarchie-routes naar geneste `children` structuur
5. [ ] Creëer `RouteErrorBoundary` component
6. [ ] Voeg `errorElement` toe aan route groups
7. [ ] Creëer `OrgContextLayout` en `TeamLayout`
8. [ ] Optioneel: eerste `loader` op SeasonDetailPage

## Verificatie

- [ ] `<RouterProvider>` vervangt `<BrowserRouter>` + `<Routes>`
- [ ] Hiërarchie-routes genest (niet meer plat)
- [ ] Error boundaries per route group actief
- [ ] Alle bestaande URL patterns werken identiek
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht

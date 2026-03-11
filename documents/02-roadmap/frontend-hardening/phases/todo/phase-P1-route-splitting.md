# P1 — Route Splitting

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** 7 lazy routes → 30+ (alle page-level routes)

---

## Doel

Alle page-level routes lazy-loaden voor snellere initial bundle.

## Current State

- 7 `React.lazy()` routes
- ~30+ page components direct geïmporteerd in router
- Initial bundle bevat alle pages (onnodig groot)

## Aanpak

### Stappen
1. Identificeer alle route-level imports in de router config
2. Vervang directe imports door `React.lazy(() => import('./pages/...'))`:
   ```tsx
   // Before
   import DashboardPage from './pages/DashboardPage';

   // After
   const DashboardPage = lazy(() => import('./pages/DashboardPage'));
   ```
3. Wrap lazy routes in `<Suspense fallback={<PageSkeleton />}>`
4. Groepeer gerelateerde routes in dezelfde chunk (named chunks):
   ```tsx
   const SeasonDetail = lazy(() => import(/* webpackChunkName: "periods" */ './pages/periods/ProjectSeasonDetailPage'));
   ```

### Uitgezonderd van lazy loading
- `LoginPage` — altijd nodig
- `NotFoundPage` — altijd nodig
- `AppShell` / Layout — altijd nodig

### Chunks strategie
| Chunk | Pages |
|-------|-------|
| `identity` | Directory, Users, Projects, Clubs, Teams, Orgs, Permissions, Profile |
| `periods` | Seasons, SeasonDetail, SeasonSquad, Competitions |
| `content` | ContentLibrary, ContentTemplates, MediaLibrary, AIStudio, VideoQueue |
| `config` | Preferences, FeatureFlags, Billing, Credits, Memberships, AuditLog |
| `work` | Clubs, Teams, Seasons, Matches, Competitions, Federations |
| `core` | Dashboard, Settings, Search, Notifications, Approvals |

## Verificatie

- [ ] 30+ routes lazy-loaded
- [ ] `<Suspense>` fallback op alle lazy routes
- [ ] Initial bundle size significant kleiner (meten met `npx vite-bundle-visualizer`)
- [ ] Navigatie werkt vlot (geen merkbare loading delay)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green

# CS4 — Route Preloading & Prefetch

**Status:** ✅ Compleet
**Prioriteit:** 🔴 Hoog
**Geschatte effort:** 2 uur
**Afhankelijk van:** CS2 (chunks moeten bestaan)

---

## Doel

Preload de chunks van waarschijnlijke volgende bestemmingen op idle-momenten, zodat navigatie instant aanvoelt ondanks code splitting.

## Huidige staat

- `usePreloadRoutes` hook bestaat maar wordt enkel in `DashboardPage` gebruikt
- Sidebar en MobileBottomNav doen geen preloading
- Na CS2 worden chunks pas geladen bij navigatie → perceptuele vertraging

## Taken

### 1. Uitbreid `usePreloadRoutes` met hover/focus triggers

Naast het preloaden op mount (DashboardPage), voeg preloading toe bij:
- **Sidebar item hover** (desktop) — `onMouseEnter` op NavLink
- **Sidebar item focus** (keyboard) — `onFocus` op NavLink
- **MobileBottomNav tab** — preload bij tab visibility change

### 2. Voeg preloading toe aan Sidebar

```tsx
// In Sidebar.tsx — bij de NavLink items:
<NavLink
  to={item.path}
  onMouseEnter={() => preloadRoute(item.path)}
  onFocus={() => preloadRoute(item.path)}
>
```

Met een `preloadRoute` helper die de juiste lazy import triggert:
```ts
const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('./pages/DashboardPage'),
  '/directory': () => import('./pages/identity/DirectoryPage'),
  '/studio': () => import('./pages/studio/StudioPage'),
  // ... etc
};

export function preloadRoute(path: string) {
  const importFn = routeImportMap[path];
  if (importFn) importFn();
}
```

### 3. Viewport-based preloading voor MobileBottomNav

Op mobile, preload de chunks voor de 4 vaste tabs zodra de app idle is:
```tsx
// In MobileBottomNav — na mount:
useEffect(() => {
  requestIdleCallback(() => {
    import('./pages/DashboardPage');
    import('./pages/studio/StudioPage');
    import('./pages/identity/ProfilePage');
  });
}, []);
```

### 4. Voeg `<link rel="modulepreload">` hints toe voor kritieke chunks

In `index.html` of via Vite plugin:
```html
<link rel="modulepreload" href="/assets/chunk-core-[hash].js" />
```

### 5. Breid DashboardPage preloads uit

Huidige preloads: DirectoryPage, SeasonDetailPage, MatchDetailWrapper.
Toevoegen: StudioPage, ApprovalsPage (frequente bestemmingen vanuit dashboard).

## Acceptatiecriteria

- [x] Sidebar hover triggert chunk preload (DevTools Network tab) — `onMouseEnter` + `onFocus` op alle NavLinks via `preloadRoute()`
- [x] MobileBottomNav preloadt 4 tabs op idle — `/dashboard`, `/studio`, `/profile`, `/approvals` via `requestIdleCallback`
- [x] DashboardPage preloadt top 5 bestemmingen — DirectoryPage, SeasonDetailPage, MatchDetailWrapper, AIStudioPage, ApprovalsPage
- [x] Geen dubbele downloads (browser cache) — `preloaded` Set in preloadRoute.ts voorkomt dubbele calls
- [x] Perceptuele navigatietijd < 200ms voor vooraf geladen routes

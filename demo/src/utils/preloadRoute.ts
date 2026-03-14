/**
 * preloadRoute — Imperatively trigger chunk preload for a route path
 *
 * Maps known route paths to their dynamic import() calls.
 * Used by Sidebar (hover/focus) and MobileBottomNav (idle) to
 * eagerly fetch chunks before navigation occurs.
 *
 * Each import is fired at most once (browser module cache handles dedup).
 *
 * @example
 * <NavLink onMouseEnter={() => preloadRoute('/studio')} to="/studio">
 */

const preloaded = new Set<string>();

/**
 * Route path → dynamic import mapping.
 * Only includes top-level routes that correspond to separate chunks.
 */
const routeImportMap: Record<string, () => Promise<unknown>> = {
  // Core nav
  '/directory':     () => import('../pages/identity/DirectoryPage'),
  '/search':        () => import('../pages/SearchPage'),

  // Studio / Content
  '/studio':        () => import('../pages/aistudio/AIStudioPage'),
  '/approvals':     () => import('../pages/ApprovalsPage'),
  '/content':       () => import('../pages/ContentPage'),
  '/medialib':      () => import('../pages/medialib'),

  // Profile / Settings
  '/profile':       () => import('../pages/ProfileHubPage'),
  '/preferences':   () => import('../pages/config/PreferencesPage'),
  '/credits':       () => import('../pages/config/CreditsPage'),
  '/settings':      () => import('../pages/SettingsLandingPage'),

  // Work hierarchy lists
  '/federations':   () => import('../pages/work/FederationsPage'),
  '/clubs':         () => import('../pages/work/ClubsPage'),
  '/teams':         () => import('../pages/work/TeamsPage'),
  '/seasons':       () => import('../pages/work/SeasonsPage'),
  '/competitions':  () => import('../pages/work/CompetitionsPage'),
  '/matches':       () => import('../pages/work/MatchesPage'),

  // Admin / Config
  '/audit':               () => import('../pages/config/AuditLogPage'),
  '/flags':               () => import('../pages/config/FeatureFlagsPage'),
  '/content-templates':   () => import('../pages/config/ContentTemplatesPage'),
  '/workflow-templates':  () => import('../pages/config/WorkflowTemplatesPage'),
  '/permissions':         () => import('../pages/identity/PermissionsPage'),
  '/users':               () => import('../pages/identity/UsersPage'),

  // Platform
  '/health':        () => import('../pages/platform/HealthCheckPage'),
  '/observability': () => import('../pages/platform/ObservabilityPage'),

  // Docs
  '/docs':          () => import('../pages/docs/DocsPage'),
  '/notifications': () => import('../pages/NotificationsPage'),
};

/**
 * Preload the chunk for a given route path.
 * Safe to call multiple times — each path is loaded at most once.
 */
export function preloadRoute(path: string): void {
  // Normalize: strip query params, match base path
  const basePath = path.split('?')[0];

  if (preloaded.has(basePath)) return;

  const importFn = routeImportMap[basePath];
  if (importFn) {
    preloaded.add(basePath);
    importFn().catch(() => {
      // Remove from set on failure so retry is possible
      preloaded.delete(basePath);
    });
  }
}

/**
 * Preload chunks for multiple routes at once.
 * Intended for idle-time batch preloading.
 */
export function preloadRoutes(paths: string[]): void {
  paths.forEach(preloadRoute);
}

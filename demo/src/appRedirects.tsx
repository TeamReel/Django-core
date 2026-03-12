import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { routes } from './routes';

// =============================================================================
// Redirect components for legacy / back-compat URL patterns.
// Extracted from App.tsx — each maps an old URL to a canonical one.
// All URL construction uses routes.ts helpers.
// =============================================================================

// ─── Generic hierarchy resolver (R3) ─────────────────────────────────────────

/**
 * Pure function: transforms any legacy/back-compat hierarchy URL to canonical.
 *
 * Handles:
 * - Team project-paths: /projects/:clubId/teams/:projectId → /:clubId/:projectId
 * - Explicit /seasons/ segments: strip (canonical uses positional)
 * - Explicit /competitions/ segments: strip
 * - Explicit /matches/ mid-path segments: strip
 * - Trailing /seasons → ?tab=seasons
 * - Trailing /squad → ?tab=squad (season) or ?tab=users (competition)
 * - Trailing /matches → ?tab=matches
 * - Trailing /hierarchy → ?tab=hierarchy
 * - 5-segment vanity paths (competition depth) → season?tab=competitions
 */
export function resolveHierarchyRedirect(pathname: string): { path: string; tab?: string } {
  let path = pathname;
  let tab: string | undefined;

  // 1. Handle trailing segments that become tab params
  if (path.endsWith('/squad')) {
    path = path.slice(0, -6);
    tab = 'squad'; // refined below based on depth
  } else if (path.endsWith('/matches')) {
    path = path.slice(0, -8);
    tab = 'matches';
  } else if (path.endsWith('/seasons')) {
    path = path.slice(0, -8);
    tab = 'seasons';
  } else if (path.endsWith('/hierarchy')) {
    path = path.slice(0, -10);
    tab = 'hierarchy';
  }

  // 2. Reshape team project-paths: /projects/:clubId/teams/:projectId → /:clubId/:projectId
  path = path.replace(/\/projects\/([^/]+)\/teams\/([^/]+)/, '/$1/$2');

  // 3. Strip explicit narrative segments (canonical URLs use positional segments)
  path = path.replace(/\/seasons\//, '/');
  path = path.replace(/\/competitions\//, '/');
  path = path.replace(/\/matches\//, '/');

  // 4. For vanity paths (no /projects/), 5 segments = competition → season?tab=competitions
  if (!tab && !path.includes('/projects/')) {
    const segmentCount = path.split('/').filter(Boolean).length;
    if (segmentCount === 5) {
      tab = 'competitions';
      path = path.replace(/\/[^/]+$/, ''); // strip competitionId
    }
  }

  // 5. Refine squad tab based on entity depth
  //    4 segments (season-level) → squad, 5+ segments (competition-level) → users
  if (tab === 'squad') {
    const segmentCount = path.split('/').filter(Boolean).length;
    tab = segmentCount >= 5 ? 'users' : 'squad';
  }

  return { path, tab };
}

/**
 * Universal redirect for legacy hierarchy URLs.
 * Uses `resolveHierarchyRedirect` to transform the current pathname
 * to its canonical form, adding tab params where needed.
 */
export function HierarchyRedirect() {
  const location = useLocation();
  const { path, tab } = resolveHierarchyRedirect(location.pathname);

  // Merge tab param into existing search params
  let search = location.search;
  if (tab) {
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tab);
    search = `?${sp.toString()}`;
  }

  return <Navigate to={`${path}${search}${location.hash}`} replace />;
}

export function LegacyDirectoryRedirect({ tab }: { tab: string }) {
  const location = useLocation();
  const nextSearchParams = new URLSearchParams(location.search);
  nextSearchParams.set('tab', tab);
  const nextSearch = nextSearchParams.toString();
  return <Navigate to={`/directory${nextSearch ? `?${nextSearch}` : ''}`} replace />;
}

// ─── DEPRECATED: Individual redirect components (consolidated in R3) ────────
// ClubDetailRedirect and TeamDetailRedirect are still referenced by routes
// until their routes are migrated to HierarchyRedirect. Keep minimal versions.

export function ClubDetailRedirect() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  return <Navigate to={`${routes.club({ orgId: orgSlugOrId, clubId: projectSlugOrId })}${location.search || ''}`} replace />;
}

export function TeamDetailRedirect() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  return (
    <Navigate
      to={`${routes.team({ orgId: orgSlugOrId, clubId: clubSlugOrId, projectId: projectSlugOrId })}${location.search || ''}`}
      replace
    />
  );
}

/**
 * Catch-all redirect: strips the `/organisations` prefix and preserves the rest.
 * Used as `<Route path="/organisations/*" element={<StripOrganisationsPrefix />} />`
 * so that legacy `/organisations/…` URLs redirect to their canonical `/ …` equivalents.
 */
export function StripOrganisationsPrefix() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/organisations/, '') || '/';
  return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
}

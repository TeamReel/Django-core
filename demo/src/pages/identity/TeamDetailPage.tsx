import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import TeamOrganisationDetailPage from './TeamOrganisationDetailPage';
import { organisationsApi, projectsApi } from '@/api';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { isSeasonPeriod } from '../../providers/seasonProviderHelpers';
import { periodPathKey } from '../../utils/periodPath';

type Project = {
  id: string;
  slug?: string;
};

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;

  // numeric IDs
  if (/^\d+$/.test(v)) return true;

  // UUIDs (common when slugs are not available)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;

  return false;
};

export default function TeamDetailPage() {
  const { orgId, clubId, projectId } = useParams<{ orgId: string; clubId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(clubId || '').trim();
  const teamSlugOrId = String(projectId || '').trim();

  // Preload likely next destination: Season detail
  usePreloadRoutes([
    () => import('./SeasonDetailPage'),
  ]);

  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);

  const [resolvedClubSlug, setResolvedClubSlug] = useState<string>('');
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (!shouldResolveClub) return;
        if (!clubSlugOrId) return;

        // Try organisation-scoped endpoint first.
        if (orgSlugOrId) {
          try {
            const project = await organisationsApi.getProject(orgSlugOrId, clubSlugOrId);
            const slug = String(project?.slug || '').trim();
            if (slug) {
              setResolvedClubSlug(slug);
              return;
            }
          } catch { /* fall through */ }
        }

        // Fallback: global project endpoint.
        try {
          const project = await projectsApi.get(clubSlugOrId);
          const slug = String(project?.slug || '').trim();
          if (slug) setResolvedClubSlug(slug);
        } catch { /* ignore */ }
      } finally {
        setResolved(true);
      }
    };

    run();
  }, [clubSlugOrId, orgSlugOrId, shouldResolveClub]);

  // If we need to resolve the club slug, avoid rendering the detail page until we know whether to redirect.
  if (shouldResolveClub && !resolved) return null;

  const canonicalClub = resolvedClubSlug || clubSlugOrId;
  const shouldRedirect = Boolean(
    orgSlugOrId && canonicalClub && teamSlugOrId && resolvedClubSlug && resolvedClubSlug !== clubSlugOrId
  );

  if (shouldRedirect) {
    return (
      <Navigate
        to={`/${orgSlugOrId}/${canonicalClub}/${teamSlugOrId}${location.search || ''}`}
        replace
      />
    );
  }

  // Auto-redirect to season Hub when the team has seasons
  return (
    <TeamSeasonRedirect
      orgSlug={orgSlugOrId}
      clubSlug={canonicalClub}
      teamSlug={teamSlugOrId}
    />
  );
}

// ── Season auto-redirect ─────────────────────────────────────────────────────
// Fetches the team's seasons. If found, redirects to the Hub at the
// active season route. Otherwise, renders TeamOrganisationDetailPage.

function TeamSeasonRedirect({
  orgSlug,
  clubSlug,
  teamSlug,
}: {
  orgSlug: string;
  clubSlug: string;
  teamSlug: string;
}) {
  const location = useLocation();
  const [seasonRedirect, setSeasonRedirect] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // 1. Resolve the team project to get its UUID
        // Use the teams endpoint to avoid ambiguous slug issues (e.g. multiple
        // clubs having a "heren-5" team) — the club context disambiguates.
        const team = await organisationsApi.getTeam(orgSlug, clubSlug, teamSlug);
        const teamId = String(team?.id || '').trim();
        if (!teamId || cancelled) { setChecked(true); return; }

        // 2. Fetch root periods (seasons) for this team
        const apiV1 = getApiV1BaseUrl();
        const periodsUrl = `${apiV1}/periods/?project_id=${encodeURIComponent(teamId)}&parent_id=null&page_size=50`;
        const periods = await fetchAllPages<Record<string, unknown>>(
          periodsUrl,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:root:${teamId}` },
        );

        const seasons = periods.filter(isSeasonPeriod);
        if (!cancelled && seasons.length > 0) {
          // Pick the most recently created season (last = newest)
          const active = seasons[0];
          const slug = periodPathKey(active as { name?: string; slug?: string; id?: string | number })
            || String((active as { id?: string }).id || '');
          if (slug) {
            setSeasonRedirect(`/${orgSlug}/${clubSlug}/${teamSlug}/${encodeURIComponent(slug)}${location.search || ''}`);
          }
        }
      } catch {
        // If season check fails, just stay on team page
      }
      if (!cancelled) setChecked(true);
    };

    run();
    return () => { cancelled = true; };
  }, [orgSlug, clubSlug, teamSlug, location.search]);

  if (seasonRedirect) return <Navigate to={seasonRedirect} replace />;
  if (!checked) return null; // brief blank while checking
  return <TeamOrganisationDetailPage />;
}

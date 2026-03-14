import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import TeamOrganisationDetailPage from './TeamOrganisationDetailPage';
import { organisationsApi, projectsApi } from '@/api';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';

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

  // Wrapper so Club vs Team detail can diverge safely over time.
  return <TeamOrganisationDetailPage />;
}

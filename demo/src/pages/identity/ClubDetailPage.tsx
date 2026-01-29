import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../../utils/apiBase';

import ClubOrganisationDetailPage from './ClubOrganisationDetailPage';

type Project = {
  id: string;
  slug?: string;
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;

  // numeric IDs
  if (/^\d+$/.test(v)) return true;

  // UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;

  return false;
};

export default function ClubDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const location = useLocation();
  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

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
          const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
            { credentials: 'include' }
          );
          if (res.ok) {
            const project = unwrapEnvelope<Project>(await res.json().catch(() => null));
            const slug = String(project?.slug || '').trim();
            if (slug) {
              setResolvedClubSlug(slug);
              return;
            }
          }
        }

        // Fallback: global project endpoint.
        const res2 = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubSlugOrId)}/`, {
          credentials: 'include',
        });
        if (res2.ok) {
          const project = unwrapEnvelope<Project>(await res2.json().catch(() => null));
          const slug = String(project?.slug || '').trim();
          if (slug) setResolvedClubSlug(slug);
        }
      } finally {
        setResolved(true);
      }
    };

    run();
  }, [apiBaseUrl, clubSlugOrId, orgSlugOrId, shouldResolveClub]);

  if (shouldResolveClub && !resolved) return null;

  if (orgSlugOrId && resolvedClubSlug && resolvedClubSlug !== clubSlugOrId) {
    return <Navigate to={`/${orgSlugOrId}/${resolvedClubSlug}${location.search || ''}`} replace />;
  }

  // Organisation-style club view (mirrors federation page layout).
  return <ClubOrganisationDetailPage />;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { organisationsApi, projectsApi } from '@/api';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { useAppSelection } from '../../hooks/useAppSelection';

import ClubOrganisationDetailPage from './ClubOrganisationDetailPage';

type Project = {
  id: string;
  slug?: string;
};

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;

  // numeric IDs
  if (/^\d+$/.test(v)) return true;

  // UUIDs
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;

  return false;
};

/** Club tab names — mapped to the hub's "club" tab on redirect. */
const CLUB_TABS = new Set([
  'teams', 'members', 'hierarchy', 'media', 'identity',
  'settings', 'assets', 'kits', 'balance', 'transactions', 'workflow',
]);

export default function ClubDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);
  const [resolvedClubSlug, setResolvedClubSlug] = useState<string>('');
  const [resolved, setResolved] = useState(false);

  // Hub redirect: detect if user has an active team in this club.
  const { myClubSlugOrId, myTeamSlugOrId, mySeasonSlugOrId } = useAppSelection();

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

  if (shouldResolveClub && !resolved) return null;

  // Club not found after ID resolution → redirect to org clubs list
  if (shouldResolveClub && resolved && !resolvedClubSlug) {
    return <Navigate to={`/${orgSlugOrId}?tab=clubs`} replace />;
  }

  if (orgSlugOrId && resolvedClubSlug && resolvedClubSlug !== clubSlugOrId) {
    return <Navigate to={`/${orgSlugOrId}/${resolvedClubSlug}${location.search || ''}`} replace />;
  }

  // ── Hub redirect: user has a team in this club → redirect to hub ──
  const effectiveClubSlug = resolvedClubSlug || clubSlugOrId;
  if (myClubSlugOrId && myTeamSlugOrId && myClubSlugOrId === effectiveClubSlug) {
    const basePath = `/${orgSlugOrId}/${effectiveClubSlug}/${myTeamSlugOrId}`;
    if (mySeasonSlugOrId) {
      // Map club-specific tab params to hub's "club" tab
      const params = new URLSearchParams(location.search || '');
      const oldTab = params.get('tab');
      const search = oldTab && CLUB_TABS.has(oldTab) ? '?tab=club' : '';
      return <Navigate to={`${basePath}/${mySeasonSlugOrId}${search}`} replace />;
    }
    return <Navigate to={basePath} replace />;
  }

  // Club-only admin or viewing another club → full club management page.
  return <ClubOrganisationDetailPage />;
}

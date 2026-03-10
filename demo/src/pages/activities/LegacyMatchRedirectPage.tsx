import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { SkeletonDetailPage } from '../../components/Skeleton';
import { api } from '@/api';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';

const getEnvelopeData = <T,>(raw: any): T => raw as T;

const looksLikeIdentifier = (value: string) => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (looksLikeUuid(v)) return true;
  return false;
};

export default function LegacyMatchRedirectPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState<'loading' | 'redirected' | 'fallback'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const id = String(matchId || '').trim();
      if (!id) {
        setStatus('fallback');
        return;
      }

      try {
        setStatus('loading');
        setError(null);

        // 1) Fetch match
        const matchRes = await api.get<any>(`/activities/${encodeURIComponent(id)}/`);
        const match = getEnvelopeData<any>(matchRes);
        const matchKeyOrId = String(match?.slug || match?.id || id).trim();

        // 2) Fetch competition (match.period)
        const competitionId = String(match?.period?.id || match?.period_id || '').trim();
        if (!competitionId) {
          setStatus('fallback');
          return;
        }

        const competitionData = await api.get<any>(`/periods/${encodeURIComponent(competitionId)}/`);
        const competition = getEnvelopeData<any>(competitionData);
        const competitionKeyOrId = String(periodPathKey(competition) || competitionId).trim();

        const seasonUuid = String(competition?.parent_period?.id || competition?.parent_period_id || '').trim();
        if (!seasonUuid) {
          setStatus('fallback');
          return;
        }

        const seasonData = await api.get<any>(`/periods/${encodeURIComponent(seasonUuid)}/`).catch(() => null);
        const season = seasonData ? getEnvelopeData<any>(seasonData) : null;
        const seasonKeyOrId = (season && periodPathKey(season)) || seasonUuid;

        // 3) Determine org
        const orgCandidates = [
          String(competition?.organisation?.slug || '').trim(),
          String(match?.organisation?.slug || '').trim(),
          String(match?.project?.organisation?.slug || '').trim(),
          String(competition?.organisation?.id || '').trim(),
          String(match?.organisation?.id || '').trim(),
          String(match?.project?.organisation?.id || '').trim(),
        ].filter(Boolean);
        const orgSlugOrId =
          orgCandidates.find((v) => v && !looksLikeUuid(v)) ||
          orgCandidates[0] ||
          '';

        if (!orgSlugOrId) {
          setStatus('fallback');
          return;
        }

        // Prefer a stable canonical slug in the URL (e.g. /knvb/...), even when upstream data only has UUIDs.
        let orgKeyOrId = orgSlugOrId;
        if (looksLikeUuid(orgSlugOrId)) {
          try {
            const org = await api.get<any>(`/organisations/${encodeURIComponent(orgSlugOrId)}/`);
            const resolved = String(org?.slug || org?.id || orgSlugOrId).trim();
            if (resolved) orgKeyOrId = resolved;
          } catch {
            // ignore
          }
        }

        // 4) Determine project/team + optional club (parent project)
        const teamSlugOrId = String(match?.project?.slug || match?.project?.id || '').trim();
        if (!teamSlugOrId) {
          setStatus('fallback');
          return;
        }

        let clubSlugOrId: string | null = null;

        // Best case: parent project is already embedded on the match payload.
        const embeddedParent = match?.project?.parent_project || match?.project?.parent;
        if (embeddedParent) {
          clubSlugOrId = String(embeddedParent.slug || embeddedParent.id || '').trim() || null;
        }

        // If we only have an ID for the parent, try to resolve a slug.
        const embeddedParentId = !clubSlugOrId
          ? String(
              match?.project?.parent_project_id ||
                match?.project?.parent_id ||
                match?.project?.parent_project ||
                match?.project?.parent ||
                ''
            ).trim()
          : '';
        if (!clubSlugOrId && embeddedParentId) {
          try {
            // Prefer org-scoped endpoint; global /projects/:id might not resolve numeric IDs.
            try {
              const club = await api.get<any>(
                `/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(embeddedParentId)}/`,
              );
              clubSlugOrId = String(club?.slug || club?.id || embeddedParentId).trim() || null;
            } catch {
              try {
                const club = await api.get<any>(`/projects/${encodeURIComponent(embeddedParentId)}/`);
                clubSlugOrId = String(club?.slug || club?.id || embeddedParentId).trim() || null;
              } catch {
                clubSlugOrId = embeddedParentId;
              }
            }
          } catch {
            clubSlugOrId = embeddedParentId;
          }
        }

        try {
          // First try org-scoped project endpoint, then fall back to global project endpoint.
          let project: any | null = null;
          try {
            project = await api.get<any>(
              `/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(teamSlugOrId)}/`,
            );
          } catch {
            try {
              project = await api.get<any>(`/projects/${encodeURIComponent(teamSlugOrId)}/`);
            } catch {
              // ignore
            }
          }

          if (!clubSlugOrId) {
            const parent = project?.parent_project || project?.parent;
            const parentId = String(project?.parent_project_id || project?.parent_id || '').trim();

            if (parent) {
              clubSlugOrId = String(parent.slug || parent.id || '').trim() || null;
            } else if (parentId) {
              try {
                const club = await api.get<any>(`/projects/${encodeURIComponent(parentId)}/`);
                clubSlugOrId = String(club?.slug || club?.id || parentId).trim() || null;
              } catch {
                clubSlugOrId = parentId;
              }
            }
          }
        } catch {
          // ignore
        }

        // Final guard: if we have a club id, try to upgrade it to a slug.
        if (clubSlugOrId && looksLikeIdentifier(clubSlugOrId)) {
          try {
            try {
              const club = await api.get<any>(
                `/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
              );
              const resolved = String(club?.slug || '').trim();
              if (resolved) clubSlugOrId = resolved;
            } catch {
              try {
                const club = await api.get<any>(`/projects/${encodeURIComponent(clubSlugOrId)}/`);
                const resolved = String(club?.slug || '').trim();
                if (resolved) clubSlugOrId = resolved;
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        }

        const teamBasePath = clubSlugOrId
          ? `/${orgKeyOrId}/${clubSlugOrId}/${teamSlugOrId}`
          : `/${orgKeyOrId}/projects/${teamSlugOrId}/seasons`;

        const target = clubSlugOrId
          ? `${teamBasePath}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}`
          : `${teamBasePath}/${seasonKeyOrId}/competitions/${competitionKeyOrId}/matches/${matchKeyOrId}`;

        // If somehow already at target, avoid loops.
        if (location.pathname === target) {
          setStatus('redirected');
          return;
        }

        navigate(target, { replace: true, state: location.state });
        setStatus('redirected');
      } catch (e) {
        logger.error('Failed to redirect', e);
        setError(e instanceof Error ? e.message : 'Failed to redirect');
        setStatus('fallback');
      }
    };

    run();
  }, [location.pathname, matchId, navigate]);

  if (status === 'loading') {
    return (
      <div className="p-6">
        <PageContent>
          <SkeletonDetailPage tabCount={3} />
        </PageContent>
      </div>
    );
  }

  if (status === 'fallback') {
    // Avoid rendering a separate legacy match page; keep a single match-detail UX.
    return (
      <>
        {error ? (
          <div className="p-6">
            <PageContent>
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </PageContent>
          </div>
        ) : (
          <div className="p-6">
            <PageContent>
              <Alert variant="info">
                This match can’t be resolved into the TeamReel hierarchy route.
              </Alert>
              <Button variant="secondary" onClick={() => navigate('/directory?tab=matches')} className="mt-4">
                Back to Matches
              </Button>
            </PageContent>
          </div>
        )}
      </>
    );
  }

  return null;
}

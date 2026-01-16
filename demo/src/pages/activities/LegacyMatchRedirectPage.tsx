import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '@django-core/design-system';
import { PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { periodPathKey } from '../../utils/periodPath';

const getEnvelopeData = <T,>(raw: any): T => (raw?.data ?? raw) as T;

export default function LegacyMatchRedirectPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
        const matchRes = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(id)}/`, {
          credentials: 'include',
        });
        if (!matchRes.ok) throw new Error(matchRes.status === 404 ? 'Match not found' : 'Failed to load match');
        const match = getEnvelopeData<any>(await matchRes.json());
        const matchKeyOrId = String(match?.slug || match?.id || id).trim();

        // 2) Fetch competition (match.period)
        const competitionId = String(match?.period?.id || match?.period_id || '').trim();
        if (!competitionId) {
          setStatus('fallback');
          return;
        }

        const competitionRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionId)}/`, {
          credentials: 'include',
        });
        if (!competitionRes.ok) {
          setStatus('fallback');
          return;
        }
        const competition = getEnvelopeData<any>(await competitionRes.json());
        const competitionKeyOrId = String(periodPathKey(competition) || competitionId).trim();

        const seasonUuid = String(competition?.parent_period?.id || competition?.parent_period_id || '').trim();
        if (!seasonUuid) {
          setStatus('fallback');
          return;
        }

        const seasonRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(seasonUuid)}/`, {
          credentials: 'include',
        });
        const season = seasonRes.ok ? getEnvelopeData<any>(await seasonRes.json()) : null;
        const seasonKeyOrId = (season && periodPathKey(season)) || seasonUuid;

        // 3) Determine org
        const orgSlugOrId =
          String(competition?.organisation?.slug || competition?.organisation?.id || '').trim() ||
          String(match?.organisation?.slug || match?.organisation?.id || '').trim();

        if (!orgSlugOrId) {
          setStatus('fallback');
          return;
        }

        // Prefer a stable canonical slug in the URL (e.g. /knvb/...), even when upstream data only has UUIDs.
        let orgKeyOrId = orgSlugOrId;
        try {
          const orgRes = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, {
            credentials: 'include',
          });
          if (orgRes.ok) {
            const org = getEnvelopeData<any>(await orgRes.json());
            orgKeyOrId = String(org?.slug || org?.id || orgSlugOrId).trim() || orgSlugOrId;
          }
        } catch {
          // ignore
        }

        // 4) Determine project/team + optional club (parent project)
        const teamSlugOrId = String(match?.project?.slug || match?.project?.id || '').trim();
        if (!teamSlugOrId) {
          setStatus('fallback');
          return;
        }

        let clubSlugOrId: string | null = null;
        try {
          // First try org-scoped project endpoint, then fall back to global project endpoint.
          const projectRes = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(teamSlugOrId)}/`,
            { credentials: 'include' }
          );
          let project: any | null = null;
          if (projectRes.ok) {
            project = getEnvelopeData<any>(await projectRes.json());
          } else {
            const projectResFallback = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamSlugOrId)}/`, {
              credentials: 'include',
            });
            if (projectResFallback.ok) {
              project = getEnvelopeData<any>(await projectResFallback.json());
            }
          }

          const parent = project?.parent_project;
          clubSlugOrId = parent ? String(parent.slug || parent.id || '').trim() : null;
        } catch {
          // ignore
        }

        const seasonsBasePath = clubSlugOrId
          ? `/${orgKeyOrId}/${clubSlugOrId}/${teamSlugOrId}/seasons`
          : `/${orgKeyOrId}/projects/${teamSlugOrId}/seasons`;

        const target = clubSlugOrId
          ? `${seasonsBasePath}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}`
          : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${competitionId}/matches/${matchKeyOrId}`;

        // If somehow already at target, avoid loops.
        if (location.pathname === target) {
          setStatus('redirected');
          return;
        }

        navigate(target, { replace: true });
        setStatus('redirected');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to redirect');
        setStatus('fallback');
      }
    };

    run();
  }, [apiBaseUrl, location.pathname, matchId, navigate]);

  if (status === 'loading') {
    return (
      <AppShell>
        <PageContent>
          <LoadingState message="Redirecting to match…" />
        </PageContent>
      </AppShell>
    );
  }

  if (status === 'fallback') {
    // Avoid rendering a separate legacy match page; keep a single match-detail UX.
    return (
      <>
        {error ? (
          <AppShell>
            <PageContent>
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </PageContent>
          </AppShell>
        ) : (
          <AppShell>
            <PageContent>
              <Alert variant="info">
                This match can’t be resolved into the TeamReel hierarchy route.
              </Alert>
              <Button variant="secondary" onClick={() => navigate('/directory?tab=matches')} className="mt-4">
                Back to Matches
              </Button>
            </PageContent>
          </AppShell>
        )}
      </>
    );
  }

  return null;
}

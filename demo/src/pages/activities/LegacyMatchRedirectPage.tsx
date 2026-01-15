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

        // 4) Determine project/team + optional club (parent project)
        const teamSlugOrId = String(match?.project?.slug || match?.project?.id || '').trim();
        if (!teamSlugOrId) {
          setStatus('fallback');
          return;
        }

        let clubSlugOrId: string | null = null;
        try {
          const projectRes = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(teamSlugOrId)}/`,
            { credentials: 'include' }
          );
          if (projectRes.ok) {
            const project = getEnvelopeData<any>(await projectRes.json());
            const parent = project?.parent_project;
            clubSlugOrId = parent ? String(parent.slug || parent.id || '').trim() : null;
          }
        } catch {
          // ignore
        }

        const seasonsBasePath = clubSlugOrId
          ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons`
          : `/organisations/${orgSlugOrId}/projects/${teamSlugOrId}/seasons`;

        const target = `${seasonsBasePath}/${seasonKeyOrId}/competitions/${competitionId}/matches/${id}`;

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

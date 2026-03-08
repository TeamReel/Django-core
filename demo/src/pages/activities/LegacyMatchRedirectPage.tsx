import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button } from '@django-core/design-system';
import { PageContent } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { SkeletonDetailPage } from '../../components/Skeleton';
import { getApiBaseUrl } from '../../utils/apiBase';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';

const getEnvelopeData = <T,>(raw: any): T => (raw?.data ?? raw) as T;

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

  const apiBaseUrl = getApiBaseUrl();

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
            const orgRes = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/`, {
              credentials: 'include',
            });
            if (orgRes.ok) {
              const org = getEnvelopeData<any>(await orgRes.json());
              const resolved = String(org?.slug || org?.id || orgSlugOrId).trim();
              if (resolved) orgKeyOrId = resolved;
            }
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
            const clubRes = await fetch(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(embeddedParentId)}/`,
              { credentials: 'include' }
            );
            if (clubRes.ok) {
              const club = getEnvelopeData<any>(await clubRes.json());
              clubSlugOrId = String(club?.slug || club?.id || embeddedParentId).trim() || null;
            } else {
              const clubResFallback = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(embeddedParentId)}/`, {
                credentials: 'include',
              });
              if (clubResFallback.ok) {
                const club = getEnvelopeData<any>(await clubResFallback.json());
                clubSlugOrId = String(club?.slug || club?.id || embeddedParentId).trim() || null;
              } else {
                clubSlugOrId = embeddedParentId;
              }
            }
          } catch {
            clubSlugOrId = embeddedParentId;
          }
        }

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

          if (!clubSlugOrId) {
            const parent = project?.parent_project || project?.parent;
            const parentId = String(project?.parent_project_id || project?.parent_id || '').trim();

            if (parent) {
              clubSlugOrId = String(parent.slug || parent.id || '').trim() || null;
            } else if (parentId) {
              try {
                const clubRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(parentId)}/`, {
                  credentials: 'include',
                });
                if (clubRes.ok) {
                  const club = getEnvelopeData<any>(await clubRes.json());
                  clubSlugOrId = String(club?.slug || club?.id || parentId).trim() || null;
                } else {
                  clubSlugOrId = parentId;
                }
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
            const clubRes = await fetch(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgKeyOrId)}/projects/${encodeURIComponent(clubSlugOrId)}/`,
              { credentials: 'include' }
            );
            if (clubRes.ok) {
              const club = getEnvelopeData<any>(await clubRes.json());
              const resolved = String(club?.slug || '').trim();
              if (resolved) clubSlugOrId = resolved;
            } else {
              const clubResFallback = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(clubSlugOrId)}/`, {
                credentials: 'include',
              });
              if (clubResFallback.ok) {
                const club = getEnvelopeData<any>(await clubResFallback.json());
                const resolved = String(club?.slug || '').trim();
                if (resolved) clubSlugOrId = resolved;
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
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to redirect');
        setStatus('fallback');
      }
    };

    run();
  }, [apiBaseUrl, location.pathname, matchId, navigate]);

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

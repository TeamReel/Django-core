import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import ProjectCompetitionDetailPage from '../periods/ProjectCompetitionDetailPage';

type Project = {
  id: string;
  slug?: string;
  parent?: { id: string; slug?: string } | null;
  parent_id?: string | null;
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

export default function ProjectHierarchyCompetitionRedirectPage() {
  const { orgId, projectId, seasonId, competitionId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
  }>();

  const location = useLocation();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();

  const [clubSlugOrId, setClubSlugOrId] = useState<string>('');
  const [resolved, setResolved] = useState(false);

  const fallbackToEmbedded = useMemo(() => {
    return `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}${location.search || ''}`;
  }, [competitionKeyOrId, location.search, orgSlugOrId, projectSlugOrId, seasonKeyOrId]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!projectSlugOrId) return;

        if (orgSlugOrId) {
          const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugOrId)}/projects/${encodeURIComponent(projectSlugOrId)}/`,
            { credentials: 'include' }
          );
          if (res.ok) {
            const project = unwrapEnvelope<Project>(await res.json().catch(() => null));
            const clubKey = String(project?.parent?.slug || project?.parent?.id || project?.parent_id || '').trim();
            if (clubKey) {
              setClubSlugOrId(clubKey);
              return;
            }
          }
        }

        const res2 = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectSlugOrId)}/`, {
          credentials: 'include',
        });
        if (res2.ok) {
          const project = unwrapEnvelope<Project>(await res2.json().catch(() => null));
          const clubKey = String(project?.parent?.slug || project?.parent?.id || project?.parent_id || '').trim();
          if (clubKey) setClubSlugOrId(clubKey);
        }
      } finally {
        setResolved(true);
      }
    };

    run();
  }, [apiBaseUrl, orgSlugOrId, projectSlugOrId]);

  if (!resolved) return null;

  if (orgSlugOrId && clubSlugOrId && projectSlugOrId && seasonKeyOrId && competitionKeyOrId) {
    return (
      <Navigate
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}${location.search || ''}`}
        replace
      />
    );
  }

  if (location.pathname === `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}`) {
    return <ProjectCompetitionDetailPage />;
  }

  return <Navigate to={fallbackToEmbedded} replace />;
}

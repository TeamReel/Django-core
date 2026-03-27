import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import ProjectCompetitionDetailPage from '../periods/ProjectCompetitionDetailPage';
import { organisationsApi, projectsApi } from '@/api';
import { unwrapEnvelope } from '../../utils/apiEnvelope';

type Project = {
  id: string;
  slug?: string;
  parent?: { id: string; slug?: string } | null;
  parent_id?: string | null;
};

export default function ProjectHierarchyCompetitionRedirectPage() {
  const { orgId, projectId, seasonId, competitionId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
  }>();

  const location = useLocation();
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
          try {
            const project = await organisationsApi.getProject(orgSlugOrId, projectSlugOrId) as unknown as Project;
            const clubKey = String(project?.parent?.slug || project?.parent?.id || project?.parent_id || '').trim();
            if (clubKey) {
              setClubSlugOrId(clubKey);
              return;
            }
          } catch { /* fall through */ }
        }

        try {
          const project = await projectsApi.get(projectSlugOrId) as unknown as Project;
          const clubKey = String(project?.parent?.slug || project?.parent?.id || project?.parent_id || '').trim();
          if (clubKey) setClubSlugOrId(clubKey);
        } catch { /* ignore */ }
      } finally {
        setResolved(true);
      }
    };

    run();
  }, [orgSlugOrId, projectSlugOrId]);

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

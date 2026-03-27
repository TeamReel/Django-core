import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { organisationsApi, projectsApi } from '@/api';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import SeasonDetailPage from '../identity/SeasonDetailPage';

type Project = {
  id: string;
  slug?: string;
  parent?: { id: string; slug?: string } | null;
  parent_id?: string | null;
};

export default function ProjectHierarchySeasonRedirectPage() {
  const { orgId, projectId, seasonId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
  }>();

  const location = useLocation();
  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();

  const [clubSlugOrId, setClubSlugOrId] = useState<string>('');
  const [resolved, setResolved] = useState(false);

  const fallbackToEmbedded = useMemo(() => {
    // Best-effort fallback that keeps the app working even if we can't infer club.
    return `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}${location.search || ''}`;
  }, [location.search, orgSlugOrId, projectSlugOrId, seasonKeyOrId]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!projectSlugOrId) return;

        // Try organisation-scoped endpoint first (works with slugs and honours org context).
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

        // Fallback: global project endpoint (often available when org endpoint fails).
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

  if (orgSlugOrId && clubSlugOrId && projectSlugOrId && seasonKeyOrId) {
    return (
      <Navigate
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}${location.search || ''}`}
        replace
      />
    );
  }

  // If we can't infer club, keep the page usable under the /projects URL.
  // (This should be rare; demo data normally has parent clubs.)
  if (location.pathname === `/${orgSlugOrId}/projects/${projectSlugOrId}/${seasonKeyOrId}`) {
    return <SeasonDetailPage />;
  }

  return <Navigate to={fallbackToEmbedded} replace />;
}

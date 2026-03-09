import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { organisationsApi } from '../../api';

type Project = {
  id: string;
  slug?: string;
  parent?: { id: string; slug?: string } | null;
  parent_id?: string | null;
};

export default function ProjectHierarchyMatchRedirectPage() {
  const { orgId, projectId, seasonId, competitionId, matchId } = useParams<{
    orgId: string;
    projectId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
  }>();

  const location = useLocation();

  const orgSlugOrId = String(orgId || '').trim();
  const projectSlugOrId = String(projectId || '').trim();
  const seasonKeyOrId = String(seasonId || '').trim();
  const competitionKeyOrId = String(competitionId || '').trim();
  const matchKeyOrId = String(matchId || '').trim();

  const [clubSlugOrId, setClubSlugOrId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fallbackToMatch = useMemo(() => {
    // Always safe; the /matches/:matchId redirect page can resolve canonical hierarchy.
    return matchKeyOrId ? `/matches/${matchKeyOrId}${location.search || ''}` : `/matches${location.search || ''}`;
  }, [location.search, matchKeyOrId]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!orgSlugOrId || !projectSlugOrId) return;

        const project = await organisationsApi.getProject(orgSlugOrId, projectSlugOrId) as unknown as Project;

        const clubKey =
          String(project?.parent?.slug || project?.parent?.id || project?.parent_id || '').trim();
        if (clubKey) setClubSlugOrId(clubKey);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orgSlugOrId, projectSlugOrId]);

  if (loading) return null;

  // If we can resolve the club, we can build the unambiguous canonical TeamReel match URL.
  if (orgSlugOrId && clubSlugOrId && projectSlugOrId && seasonKeyOrId && competitionKeyOrId && matchKeyOrId) {
    return (
      <Navigate
        to={`/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}${location.search || ''}`}
        replace
      />
    );
  }

  // Without a club segment, a 5-part vanity route would collide with existing team/competition routes.
  // Fall back to /matches/:matchId which can still redirect to the canonical hierarchy.
  return <Navigate to={fallbackToMatch} replace />;
}

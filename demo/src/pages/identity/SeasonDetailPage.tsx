import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/**
 * SeasonDetailPage — F24 redirect.
 *
 * The 4-seg URL `/:org/:club/:team/:season` is no longer the canonical hub.
 * Redirect to the 3-seg hub `/:org/:club/:team?season=<season>` so the hub
 * can resolve the season internally.
 */
export default function SeasonDetailPage() {
  const { orgId, clubId, projectId, seasonId } = useParams<{
    orgId: string;
    clubId: string;
    projectId: string;
    seasonId: string;
  }>();

  const org = encodeURIComponent(orgId || '');
  const club = encodeURIComponent(clubId || '');
  const team = encodeURIComponent(projectId || '');
  const season = encodeURIComponent(seasonId || '');

  return (
    <Navigate
      to={`/${org}/${club}/${team}${season ? `?season=${season}` : ''}`}
      replace
    />
  );
}

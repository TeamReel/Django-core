import React from 'react';
import { MyTeamHubPage } from './MyTeamHubPage';
import { SeasonProvider } from '../../providers/SeasonProvider';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';

export default function SeasonDetailPage() {
  // Preload likely next destinations: Match detail, Member detail
  usePreloadRoutes([
    () => import('../activities/MatchDetailWrapper'),
    () => import('./MemberDetailPage'),
  ]);

  return (
    <SeasonProvider>
      <MyTeamHubPage />
    </SeasonProvider>
  );
}

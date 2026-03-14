import React from 'react';
import ProjectSeasonDetailPage from '../periods/ProjectSeasonDetailPage';
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
      <ProjectSeasonDetailPage />
    </SeasonProvider>
  );
}

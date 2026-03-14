import React, { Suspense } from 'react';
import { SeasonProvider } from '../../providers/SeasonProvider';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';

const ProjectSeasonDetailPage = React.lazy(
  () => import('../periods/ProjectSeasonDetailPage'),
);

export default function SeasonDetailPage() {
  // Preload likely next destinations: Match detail, Member detail
  usePreloadRoutes([
    () => import('../activities/MatchDetailWrapper'),
    () => import('./MemberDetailPage'),
  ]);

  return (
    <SeasonProvider>
      <Suspense fallback={null}>
        <ProjectSeasonDetailPage />
      </Suspense>
    </SeasonProvider>
  );
}

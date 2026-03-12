import React from 'react';
import { SeasonProvider } from '../../providers/SeasonProvider';
import { ProjectCompetitionDetailPage } from './ProjectCompetitionDetailPage';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';

/**
 * Thin wrapper that provides the shared Season‑hierarchy context
 * to the competition detail page (and its conditionally-rendered
 * member detail sub-page).
 */
export default function CompetitionDetailWrapper() {
  // Preload likely next destination: Match detail
  usePreloadRoutes([
    () => import('../activities/MatchDetailWrapper'),
  ]);

  return (
    <SeasonProvider>
      <ProjectCompetitionDetailPage />
    </SeasonProvider>
  );
}

import React from 'react';
import { MyTeamHubPage } from './MyTeamHubPage';
import { SeasonProvider } from '../../providers/SeasonProvider';
import { usePreloadRoutes } from '../../hooks/usePreloadRoutes';

/**
 * TeamHubPage — F24 canonical 3-segment hub.
 *
 * Rendered at `/:org/:club/:team`. Season is resolved internally
 * by useSeasonData (from ?season= hint, active context, or auto-pick).
 */
export default function TeamHubPage() {
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

import React from 'react';
import { SeasonProvider } from '../../providers/SeasonProvider';
import { ProjectCompetitionDetailPage } from './ProjectCompetitionDetailPage';

/**
 * Thin wrapper that provides the shared Season‑hierarchy context
 * to the competition detail page (and its conditionally-rendered
 * member detail sub-page).
 */
export default function CompetitionDetailWrapper() {
  return (
    <SeasonProvider>
      <ProjectCompetitionDetailPage />
    </SeasonProvider>
  );
}

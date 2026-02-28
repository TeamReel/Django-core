import React from 'react';
import ProjectSeasonDetailPage from '../periods/ProjectSeasonDetailPage';
import { SeasonProvider } from '../../providers/SeasonProvider';

export default function SeasonDetailPage() {
  return (
    <SeasonProvider>
      <ProjectSeasonDetailPage />
    </SeasonProvider>
  );
}

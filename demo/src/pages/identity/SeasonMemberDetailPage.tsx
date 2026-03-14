import React, { Suspense } from 'react';
import { SeasonProvider } from '../../providers/SeasonProvider';

const ProjectSeasonMemberDetailPage = React.lazy(
  () => import('../periods/ProjectSeasonMemberDetailPage'),
);

export default function SeasonMemberDetailPage() {
  return (
    <SeasonProvider>
      <Suspense fallback={null}>
        <ProjectSeasonMemberDetailPage />
      </Suspense>
    </SeasonProvider>
  );
}

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';

import { ClubsList } from './directory/ClubsList';
import { FederationsList } from './directory/FederationsList';
import { TeamsList } from './directory/TeamsList';

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = String(new URLSearchParams(location.search).get('tab') || 'federations')
    .trim()
    .toLowerCase();

  const subtitle = tab === 'clubs' ? 'Clubs' : tab === 'teams' ? 'Teams' : 'Federations';

  return (
      <div>
        <PageHeader
          title="Directory"
          subtitle={subtitle}
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Directory', current: true },
          ]}
        />
        <PageContent>
            {tab === 'clubs' ? <ClubsList /> : tab === 'teams' ? <TeamsList /> : <FederationsList />}
        </PageContent>
      </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';

import { FederationsList } from './directory/FederationsList';

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
      <div>
        <PageHeader
          title="Directory"
          subtitle="Federations"
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Directory', current: true },
          ]}
        />
        <PageContent>
            <FederationsList />
        </PageContent>
      </div>
  );
};

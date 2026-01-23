import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '@django-core/design-system';

import { FederationsList } from './directory/FederationsList';
import { ClubsList } from './directory/ClubsList';
import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { UsersList } from './directory/UsersList';
import { MatchesList } from './directory/MatchesList';

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'federations');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(prev => {
      prev.set('tab', value);
      return prev;
    });
  };

  // Ensure active tab is synced with URL if URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  return (
      <div>
        <PageHeader
          title="Directory"
          breadcrumbs={[
            { label: 'Dashboard', onClick: () => navigate('/dashboard') },
            { label: 'Directory', current: true },
          ]}
        />
        <PageContent>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <TabList className="mb-6">
              <Tab value="federations">Federations</Tab>
              <Tab value="clubs">Clubs</Tab>
              <Tab value="teams">Teams</Tab>
              <Tab value="seasons">Seasons</Tab>
              <Tab value="competitions">Competitions</Tab>
              <Tab value="matches">Matches</Tab>
              <Tab value="users">Users</Tab>
            </TabList>

            <TabPanel value="federations">
              <FederationsList />
            </TabPanel>
            <TabPanel value="clubs">
              <ClubsList />
            </TabPanel>
            <TabPanel value="teams">
              <TeamsList />
            </TabPanel>
             <TabPanel value="seasons">
              <SeasonsList />
            </TabPanel>
            <TabPanel value="competitions">
              <CompetitionsList />
            </TabPanel>
            <TabPanel value="matches">
              <MatchesList />
            </TabPanel>
            <TabPanel value="users">
              <UsersList />
            </TabPanel>
          </Tabs>
        </PageContent>
      </div>
  );
};

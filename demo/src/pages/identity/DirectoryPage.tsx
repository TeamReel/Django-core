import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';

import { ClubsList } from './directory/ClubsList';
import { FederationsList } from './directory/FederationsList';
import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import { ContentOverview } from './directory/ContentOverview';
import { ContentList } from './directory/ContentList';

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = String(new URLSearchParams(location.search).get('tab') || 'federations')
    .trim()
    .toLowerCase();

  const allowed = new Set(['federations', 'clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'members', 'content', 'all-content']);
  const effectiveTab = allowed.has(tab) ? tab : 'federations';
  const normalizedTab = effectiveTab === 'members' ? 'users' : effectiveTab;

  const subtitleMap: Record<string, string> = {
    clubs: 'Clubs',
    teams: 'Teams',
    seasons: 'Seasons',
    competitions: 'Competitions',
    matches: 'Matches',
    users: 'Users',
    content: 'Content Overview',
    'all-content': 'All Content',
    federations: 'Federations',
  };
  const subtitle = subtitleMap[normalizedTab] ?? 'Federations';

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
            {normalizedTab === 'clubs' ? (
              <ClubsList />
            ) : normalizedTab === 'teams' ? (
              <TeamsList />
            ) : normalizedTab === 'seasons' ? (
              <SeasonsList />
            ) : normalizedTab === 'competitions' ? (
              <CompetitionsList />
            ) : normalizedTab === 'matches' ? (
              <MatchesList />
            ) : normalizedTab === 'users' ? (
              <UsersList />
            ) : normalizedTab === 'content' ? (
              <ContentOverview />
            ) : normalizedTab === 'all-content' ? (
              <ContentList />
            ) : (
              <FederationsList />
            )}
        </PageContent>
      </div>
  );
};

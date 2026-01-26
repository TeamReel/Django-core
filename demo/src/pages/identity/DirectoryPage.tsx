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

export const DirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = String(new URLSearchParams(location.search).get('tab') || 'federations')
    .trim()
    .toLowerCase();

  const allowed = new Set(['federations', 'clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'members']);
  const effectiveTab = allowed.has(tab) ? tab : 'federations';
  const normalizedTab = effectiveTab === 'members' ? 'users' : effectiveTab;

  const subtitle =
    normalizedTab === 'clubs'
      ? 'Clubs'
      : normalizedTab === 'teams'
        ? 'Teams'
        : normalizedTab === 'seasons'
          ? 'Seasons'
          : normalizedTab === 'competitions'
            ? 'Competitions'
            : normalizedTab === 'matches'
              ? 'Matches'
              : normalizedTab === 'users'
                ? 'Users'
                : 'Federations';

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
            ) : (
              <FederationsList />
            )}
        </PageContent>
      </div>
  );
};

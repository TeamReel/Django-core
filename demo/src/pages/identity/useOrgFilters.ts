/**
 * Custom hook bundling all filter / search state for the Organisation Detail page.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 */

import { useState } from 'react';
import type { OrgFilterState } from './orgDataTypes';

export function useOrgFilters(): OrgFilterState {
  /* member filters */
  const [memberSearch, setMemberSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userClubFilterId, setUserClubFilterId] = useState<string>('');
  const [userTeamFilterId, setUserTeamFilterId] = useState<string>('');
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 25;

  /* team filters */
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [teamClubFilterId, setTeamClubFilterId] = useState<string>('');

  /* club filters */
  const [clubSearch, setClubSearch] = useState('');
  const [clubStatusFilter, setClubStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  /* season filters */
  const [seasonSearch, setSeasonSearch] = useState('');
  const [seasonClubFilterId, setSeasonClubFilterId] = useState<string>('');
  const [seasonTeamFilterId, setSeasonTeamFilterId] = useState<string>('');

  /* competition filters */
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [compClubFilterId, setCompClubFilterId] = useState<string>('');
  const [compTeamFilterId, setCompTeamFilterId] = useState<string>('');
  const [compSeasonFilterId, setCompSeasonFilterId] = useState<string>('');
  const [compMatchesFilter, setCompMatchesFilter] = useState<'all' | 'with' | 'without'>('all');

  /* match filters */
  const [matchSearch, setMatchSearch] = useState('');
  const [matchClubFilterId, setMatchClubFilterId] = useState<string>('');
  const [matchTeamFilterId, setMatchTeamFilterId] = useState<string>('');
  const [matchSeasonFilterId, setMatchSeasonFilterId] = useState<string>('');
  const [matchCompFilterId, setMatchCompFilterId] = useState<string>('');

  /* hierarchy */
  const [hierarchySearch, setHierarchySearch] = useState('');

  return {
    memberSearch, setMemberSearch,
    userRoleFilter, setUserRoleFilter,
    userClubFilterId, setUserClubFilterId,
    userTeamFilterId, setUserTeamFilterId,
    usersPage, setUsersPage,
    usersPageSize,

    teamSearch, setTeamSearch,
    teamStatusFilter, setTeamStatusFilter,
    teamClubFilterId, setTeamClubFilterId,

    clubSearch, setClubSearch,
    clubStatusFilter, setClubStatusFilter,

    seasonSearch, setSeasonSearch,
    seasonClubFilterId, setSeasonClubFilterId,
    seasonTeamFilterId, setSeasonTeamFilterId,

    competitionSearch, setCompetitionSearch,
    compClubFilterId, setCompClubFilterId,
    compTeamFilterId, setCompTeamFilterId,
    compSeasonFilterId, setCompSeasonFilterId,
    compMatchesFilter, setCompMatchesFilter,

    matchSearch, setMatchSearch,
    matchClubFilterId, setMatchClubFilterId,
    matchTeamFilterId, setMatchTeamFilterId,
    matchSeasonFilterId, setMatchSeasonFilterId,
    matchCompFilterId, setMatchCompFilterId,

    hierarchySearch, setHierarchySearch,
  };
}

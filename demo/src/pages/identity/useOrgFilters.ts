/**
 * Custom hook bundling all filter / search state for the Organisation Detail page.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 * Consolidated to useReducer during S3 refactor.
 */

import { useReducer, useMemo } from 'react';
import { formReducer, makeSetter } from '@/utils/formReducer';
import type { OrgFilterState } from './orgDataTypes';

interface OrgFiltersInternal {
  memberSearch: string;
  userRoleFilter: string;
  userClubFilterId: string;
  userTeamFilterId: string;
  usersPage: number;
  teamSearch: string;
  teamStatusFilter: 'all' | 'active' | 'inactive';
  teamClubFilterId: string;
  clubSearch: string;
  clubStatusFilter: 'all' | 'active' | 'inactive';
  seasonSearch: string;
  seasonClubFilterId: string;
  seasonTeamFilterId: string;
  competitionSearch: string;
  compClubFilterId: string;
  compTeamFilterId: string;
  compSeasonFilterId: string;
  compMatchesFilter: 'all' | 'with' | 'without';
  matchSearch: string;
  matchClubFilterId: string;
  matchTeamFilterId: string;
  matchSeasonFilterId: string;
  matchCompFilterId: string;
  hierarchySearch: string;
}

const initial: OrgFiltersInternal = {
  memberSearch: '', userRoleFilter: '', userClubFilterId: '', userTeamFilterId: '',
  usersPage: 1,
  teamSearch: '', teamStatusFilter: 'all', teamClubFilterId: '',
  clubSearch: '', clubStatusFilter: 'all',
  seasonSearch: '', seasonClubFilterId: '', seasonTeamFilterId: '',
  competitionSearch: '', compClubFilterId: '', compTeamFilterId: '', compSeasonFilterId: '',
  compMatchesFilter: 'all',
  matchSearch: '', matchClubFilterId: '', matchTeamFilterId: '', matchSeasonFilterId: '',
  matchCompFilterId: '',
  hierarchySearch: '',
};

export function useOrgFilters(): OrgFilterState {
  const [s, dispatch] = useReducer(formReducer<OrgFiltersInternal>, initial);

  const setters = useMemo(() => ({
    setMemberSearch: makeSetter<OrgFiltersInternal, 'memberSearch'>(dispatch, 'memberSearch'),
    setUserRoleFilter: makeSetter<OrgFiltersInternal, 'userRoleFilter'>(dispatch, 'userRoleFilter'),
    setUserClubFilterId: makeSetter<OrgFiltersInternal, 'userClubFilterId'>(dispatch, 'userClubFilterId'),
    setUserTeamFilterId: makeSetter<OrgFiltersInternal, 'userTeamFilterId'>(dispatch, 'userTeamFilterId'),
    setUsersPage: makeSetter<OrgFiltersInternal, 'usersPage'>(dispatch, 'usersPage'),
    setTeamSearch: makeSetter<OrgFiltersInternal, 'teamSearch'>(dispatch, 'teamSearch'),
    setTeamStatusFilter: makeSetter<OrgFiltersInternal, 'teamStatusFilter'>(dispatch, 'teamStatusFilter'),
    setTeamClubFilterId: makeSetter<OrgFiltersInternal, 'teamClubFilterId'>(dispatch, 'teamClubFilterId'),
    setClubSearch: makeSetter<OrgFiltersInternal, 'clubSearch'>(dispatch, 'clubSearch'),
    setClubStatusFilter: makeSetter<OrgFiltersInternal, 'clubStatusFilter'>(dispatch, 'clubStatusFilter'),
    setSeasonSearch: makeSetter<OrgFiltersInternal, 'seasonSearch'>(dispatch, 'seasonSearch'),
    setSeasonClubFilterId: makeSetter<OrgFiltersInternal, 'seasonClubFilterId'>(dispatch, 'seasonClubFilterId'),
    setSeasonTeamFilterId: makeSetter<OrgFiltersInternal, 'seasonTeamFilterId'>(dispatch, 'seasonTeamFilterId'),
    setCompetitionSearch: makeSetter<OrgFiltersInternal, 'competitionSearch'>(dispatch, 'competitionSearch'),
    setCompClubFilterId: makeSetter<OrgFiltersInternal, 'compClubFilterId'>(dispatch, 'compClubFilterId'),
    setCompTeamFilterId: makeSetter<OrgFiltersInternal, 'compTeamFilterId'>(dispatch, 'compTeamFilterId'),
    setCompSeasonFilterId: makeSetter<OrgFiltersInternal, 'compSeasonFilterId'>(dispatch, 'compSeasonFilterId'),
    setCompMatchesFilter: makeSetter<OrgFiltersInternal, 'compMatchesFilter'>(dispatch, 'compMatchesFilter'),
    setMatchSearch: makeSetter<OrgFiltersInternal, 'matchSearch'>(dispatch, 'matchSearch'),
    setMatchClubFilterId: makeSetter<OrgFiltersInternal, 'matchClubFilterId'>(dispatch, 'matchClubFilterId'),
    setMatchTeamFilterId: makeSetter<OrgFiltersInternal, 'matchTeamFilterId'>(dispatch, 'matchTeamFilterId'),
    setMatchSeasonFilterId: makeSetter<OrgFiltersInternal, 'matchSeasonFilterId'>(dispatch, 'matchSeasonFilterId'),
    setMatchCompFilterId: makeSetter<OrgFiltersInternal, 'matchCompFilterId'>(dispatch, 'matchCompFilterId'),
    setHierarchySearch: makeSetter<OrgFiltersInternal, 'hierarchySearch'>(dispatch, 'hierarchySearch'),
  }), [dispatch]);

  return {
    memberSearch: s.memberSearch, setMemberSearch: setters.setMemberSearch,
    userRoleFilter: s.userRoleFilter, setUserRoleFilter: setters.setUserRoleFilter,
    userClubFilterId: s.userClubFilterId, setUserClubFilterId: setters.setUserClubFilterId,
    userTeamFilterId: s.userTeamFilterId, setUserTeamFilterId: setters.setUserTeamFilterId,
    usersPage: s.usersPage, setUsersPage: setters.setUsersPage,
    usersPageSize: 25,

    teamSearch: s.teamSearch, setTeamSearch: setters.setTeamSearch,
    teamStatusFilter: s.teamStatusFilter, setTeamStatusFilter: setters.setTeamStatusFilter,
    teamClubFilterId: s.teamClubFilterId, setTeamClubFilterId: setters.setTeamClubFilterId,

    clubSearch: s.clubSearch, setClubSearch: setters.setClubSearch,
    clubStatusFilter: s.clubStatusFilter, setClubStatusFilter: setters.setClubStatusFilter,

    seasonSearch: s.seasonSearch, setSeasonSearch: setters.setSeasonSearch,
    seasonClubFilterId: s.seasonClubFilterId, setSeasonClubFilterId: setters.setSeasonClubFilterId,
    seasonTeamFilterId: s.seasonTeamFilterId, setSeasonTeamFilterId: setters.setSeasonTeamFilterId,

    competitionSearch: s.competitionSearch, setCompetitionSearch: setters.setCompetitionSearch,
    compClubFilterId: s.compClubFilterId, setCompClubFilterId: setters.setCompClubFilterId,
    compTeamFilterId: s.compTeamFilterId, setCompTeamFilterId: setters.setCompTeamFilterId,
    compSeasonFilterId: s.compSeasonFilterId, setCompSeasonFilterId: setters.setCompSeasonFilterId,
    compMatchesFilter: s.compMatchesFilter, setCompMatchesFilter: setters.setCompMatchesFilter,

    matchSearch: s.matchSearch, setMatchSearch: setters.setMatchSearch,
    matchClubFilterId: s.matchClubFilterId, setMatchClubFilterId: setters.setMatchClubFilterId,
    matchTeamFilterId: s.matchTeamFilterId, setMatchTeamFilterId: setters.setMatchTeamFilterId,
    matchSeasonFilterId: s.matchSeasonFilterId, setMatchSeasonFilterId: setters.setMatchSeasonFilterId,
    matchCompFilterId: s.matchCompFilterId, setMatchCompFilterId: setters.setMatchCompFilterId,

    hierarchySearch: s.hierarchySearch, setHierarchySearch: setters.setHierarchySearch,
  };
}

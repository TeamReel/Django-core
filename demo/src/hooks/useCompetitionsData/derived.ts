/**
 * useCompetitionsData/derived.ts
 * Derived state computations for filtered and sorted competitions.
 */

import { useMemo } from 'react';
import {
  sortKey,
  getFederationName,
  getTeamName,
  getClubName,
  getSeasonName,
  isPeriodActive,
  matchesSportFilter,
} from '../../utils/directoryHelpers';
import type { Period } from '../../utils/directoryHelpers';
import type { OrganisationOption, ProjectOption } from '../../pages/work/WorkFilterBar';

interface UseDerivedCompetitionsParams {
  competitions: Period[];
  statusFilter: string;
  sportFilter: string;
  variantFilter: string;
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  seasons: Period[];
}

export function useDerivedCompetitions({
  competitions,
  statusFilter,
  sportFilter,
  variantFilter,
  organisations,
  clubs,
  teams,
  seasons,
}: UseDerivedCompetitionsParams) {
  const filteredCompetitions = useMemo(() => {
    let list = [...competitions];
    if (statusFilter === 'active') {
      list = list.filter(isPeriodActive);
    }
    if (statusFilter === 'inactive') {
      list = list.filter((c) => !isPeriodActive(c));
    }
    if (sportFilter !== 'all') {
      list = list.filter((comp) => matchesSportFilter(comp, sportFilter, organisations));
    }
    if (variantFilter !== 'all') {
      list = list.filter((comp) => comp.sport?.id === variantFilter);
    }
    return list;
  }, [competitions, statusFilter, sportFilter, variantFilter, organisations]);

  const sortedCompetitions = useMemo(() => {
    const list = [...filteredCompetitions];
    list.sort((a: Period, b: Period) => {
      const byFederation = sortKey(getFederationName(a, organisations)).localeCompare(sortKey(getFederationName(b, organisations)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a, clubs, teams)).localeCompare(sortKey(getClubName(b, clubs, teams)));
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a, teams)).localeCompare(sortKey(getTeamName(b, teams)));
      if (byTeam !== 0) return byTeam;
      const bySeason = sortKey(getSeasonName(a, seasons)).localeCompare(sortKey(getSeasonName(b, seasons)));
      if (bySeason !== 0) return bySeason;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });
    return list;
  }, [filteredCompetitions, organisations, clubs, teams, seasons]);

  return {
    filteredCompetitions,
    sortedCompetitions,
  };
}

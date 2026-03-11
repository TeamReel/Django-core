/**
 * useMatchesData/derived.ts
 * Derived state computations for filtered and sorted matches.
 */

import { useMemo } from 'react';
import {
  sortKey,
  getFederationName,
  getTeamName,
  getClubName,
  getTeamParentId,
} from '../../utils/directoryHelpers';
import type { Activity } from '../../utils/directoryHelpers';
import type { OrganisationOption, ProjectOption } from '../../pages/work/WorkFilterBar';

interface UseDerivedMatchesParams {
  matches: Activity[];
  statusFilter: string;
  sportFilter: string;
  variantFilter: string;
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  teams: ProjectOption[];
  selectedTeamId: string | null;
  selectedClubId: string | null;
}

export function useDerivedMatches({
  matches,
  statusFilter,
  sportFilter,
  variantFilter,
  organisations,
  clubs,
  teams,
  selectedTeamId,
  selectedClubId,
}: UseDerivedMatchesParams) {
  const filteredMatches = useMemo(() => {
    let list = matches;

    if (selectedTeamId) {
      list = list.filter((m) => String(m?.project?.id) === String(selectedTeamId));
    } else if (selectedClubId && teams.length > 0) {
      const clubTeamIds = new Set(
        teams
          .filter((t) => getTeamParentId(t) === String(selectedClubId))
          .map((t) => String(t.id)),
      );
      if (clubTeamIds.size > 0) {
        list = list.filter((m) => clubTeamIds.has(String(m?.project?.id)));
      }
    }

    if (statusFilter !== 'all') {
      const now = new Date();
      const isUpcoming = (m: Activity) => {
        if (!m.start_time) return false;
        const dt = new Date(m.start_time);
        return dt.getTime() >= now.getTime();
      };
      if (statusFilter === 'active') {
        list = list.filter(isUpcoming);
      } else {
        list = list.filter((m) => !isUpcoming(m));
      }
    }

    if (sportFilter !== 'all') {
      list = list.filter((match) => {
        const periodSportId = match?.period?.sport?.id;
        const periodSportCategoryId = match?.period?.sport?.parent_sport_id || periodSportId;
        if (periodSportCategoryId && String(periodSportCategoryId) === String(sportFilter)) return true;

        const nestedOrg = match?.organisation;
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.sport?.id : undefined;
        if (nestedSportId && String(nestedSportId) === String(sportFilter)) return true;

        const orgId =
          (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
          match?.organisation_id;
        const org = orgId ? organisations.find((o) => String(o.id) === String(orgId)) : undefined;
        const orgSportId = org?.sport?.id;
        return orgSportId && String(orgSportId) === String(sportFilter);
      });
    }

    if (variantFilter !== 'all') {
      list = list.filter((match) => match.period?.sport?.id === variantFilter);
    }

    return list;
  }, [matches, statusFilter, sportFilter, variantFilter, organisations, selectedTeamId, selectedClubId, teams]);

  const sortedMatches = useMemo(() => {
    const getCompetitionName = (m: Activity) => String(m?.period?.name || '');
    const getMatchName = (m: Activity) => String(m?.title || '');

    const list = [...filteredMatches];
    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a, organisations)).localeCompare(
        sortKey(getFederationName(b, organisations)),
      );
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a, clubs, teams)).localeCompare(
        sortKey(getClubName(b, clubs, teams)),
      );
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a, teams)).localeCompare(
        sortKey(getTeamName(b, teams)),
      );
      if (byTeam !== 0) return byTeam;
      const bySeason = sortKey(a?.period?.parent_period?.name || '').localeCompare(
        sortKey(b?.period?.parent_period?.name || ''),
      );
      if (bySeason !== 0) return bySeason;
      const byCompetition = sortKey(getCompetitionName(a)).localeCompare(sortKey(getCompetitionName(b)));
      if (byCompetition !== 0) return byCompetition;
      return sortKey(getMatchName(a)).localeCompare(sortKey(getMatchName(b)));
    });
    return list;
  }, [filteredMatches, organisations, clubs, teams]);

  return {
    filteredMatches,
    sortedMatches,
  };
}

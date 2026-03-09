/**
 * Data hook for the MatchesList page.
 *
 * Encapsulates: seasons/competitions-for-filter fetches, matches state + fetch,
 * filtered/sorted derivations, and progressive-loading controls.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../utils/fetchAllPages';
import { getApiBaseUrl } from '../utils/apiBase';
import {
  chunkArray,
  sortKey,
  getTeamParentId,
  getFederationName,
  getTeamName,
  getClubName,
} from '../utils/directoryHelpers';
import { getCsrfToken } from '../utils/csrf';
import type { Activity } from '../utils/directoryHelpers';
import type { useDirectoryFilters } from './useDirectoryFilters';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

type Filters = ReturnType<typeof useDirectoryFilters>;

export interface UseMatchesDataReturn {
  matches: Activity[];
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  matchesLoading: boolean;
  matchesMaxItems: number | null;
  setMatchesMaxItems: React.Dispatch<React.SetStateAction<number | null>>;
  filteredMatches: Activity[];
  sortedMatches: Activity[];
}

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useMatchesData(filters: Filters): UseMatchesDataReturn {
  const {
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    variantFilter,
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    setSeasons,
    setCompetitions,
    orgLocked,
    refreshKey,
    setError,
    getSelectedOrgIdForApi,
  } = filters;

  // ── State ─────────────────────────────────────────────────────────
  const [matches, setMatches] = useState<Activity[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesMaxItems, setMatchesMaxItems] = useState<number | null>(500);
  const loadMatchesSeqRef = useRef(0);

  // When the federation changes, reset match list + limit.
  useEffect(() => {
    setMatches([]);
    setMatchesMaxItems(500);
  }, [selectedOrgId]);

  // ── Filtered Matches ──────────────────────────────────────────────

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
        const nestedSportId = nestedOrg && typeof nestedOrg === 'object' ? (nestedOrg as any)?.sport?.id : undefined;
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

  // ── Sorted Matches ────────────────────────────────────────────────

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

  // ── Fetch Seasons (for filter) ────────────────────────────────────

  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const baseParams = new URLSearchParams();
        baseParams.set('page_size', '500');
        baseParams.set('parent_id', 'null');
        baseParams.set('type', 'season');

        if (selectedTeamId) {
          baseParams.set('project_id', selectedTeamId);
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length > 0) {
            const teamIds = clubTeams.map((t) => String(t.id));
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons(roots);
            return;
          } else {
            setSeasons([]);
            return;
          }
        } else if (selectedOrgId) {
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
            const chunks = chunkArray(teamIds, 25);
            const results = (
              await Promise.all(
                chunks.map(async (ids) => {
                  const params = new URLSearchParams(baseParams);
                  params.set('project_id__in', ids.join(','));
                  return await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                  );
                }),
              )
            ).flat();

            const roots = (Array.isArray(results) ? results : []).filter(
              (p) => p?.parent_period_id == null && !p?.parent_period,
            );
            setSeasons([...new Map(roots.map((p) => [String(p.id), p])).values()]);
            return;
          }

          baseParams.set('organisation_id', selectedOrgId);
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${baseParams.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );

        const roots = (Array.isArray(results) ? results : []).filter(
          (p) => p?.parent_period_id == null && !p?.parent_period,
        );
        setSeasons(roots);
      } catch {
        setSeasons([]);
      }
    };
    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // ── Fetch Competitions (for filter) ───────────────────────────────

  useEffect(() => {
    if (!selectedSeasonName) {
      setCompetitions([]);
      return;
    }
    const loadCompetitions = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const seasonIds = selectedSeasonIds;
        if (seasonIds.length === 0) {
          setCompetitions([]);
          return;
        }

        const teamIdsForOrg =
          selectedOrgId && !selectedClubId && !selectedTeamId
            ? teams.map((t) => String(t.id)).filter(Boolean)
            : null;

        const fetchWithTeamChunks = async (baseParams: URLSearchParams, tIds: string[]) => {
          const chunks = chunkArray(tIds, 25);
          const results = (
            await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(baseParams);
                params.set('project_id__in', ids.join(','));
                return await fetchAllPages<any>(
                  `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
                  { credentials: 'include' },
                  { ttlMs: 120_000, bypass: refreshKey > 0 },
                );
              }),
            )
          ).flat();
          return [...new Map(results.map((c) => [String(c.id), c])).values()];
        };

        const requests = seasonIds.map(async (seasonId) => {
          const params = new URLSearchParams();
          params.set('page_size', '300');
          params.set('parent_id', seasonId);
          params.set('type', 'competition');
          if (selectedTeamId) {
            params.set('project_id', String(selectedTeamId));
          } else if (selectedClubId && teams.length > 0) {
            const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
            if (clubTeams.length > 0) {
              params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
            }
          } else if (teamIdsForOrg && teamIdsForOrg.length > 0) {
            return await fetchWithTeamChunks(params, teamIdsForOrg);
          } else if (selectedOrgId) {
            const orgIdForApi = getSelectedOrgIdForApi();
            if (orgIdForApi) params.set('organisation_id', orgIdForApi);
          }

          return await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          );
        });

        const all = (await Promise.all(requests)).flat();
        const unique = [...new Map(all.map((c) => [String(c.id), c])).values()];
        setCompetitions(unique);
      } catch {
        setCompetitions([]);
      }
    };
    loadCompetitions();
  }, [selectedSeasonName, selectedSeasonIds, selectedOrgId, selectedClubId, selectedTeamId, teams]);

  // ── Fetch Matches ─────────────────────────────────────────────────

  useEffect(() => {
    const loadMatches = async () => {
      const seq = (loadMatchesSeqRef.current += 1);
      setMatchesLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      try {
        if (orgLocked && !selectedOrgId) {
          setMatches([]);
          return;
        }

        const orgIdForApi = getSelectedOrgIdForApi();

        if (selectedOrgId && !orgIdForApi) {
          setMatches([]);
          return;
        }

        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('activity_type', 'match');
        params.set('ordering', '-start_time');

        if (selectedTeamId) {
          params.set('project_id', String(selectedTeamId));
        } else if (selectedClubId && teams.length > 0) {
          const clubTeams = teams.filter((t) => getTeamParentId(t) === String(selectedClubId));
          if (clubTeams.length === 0) {
            setMatches([]);
            return;
          }
          params.set('project_id__in', clubTeams.map((t) => String(t.id)).join(','));
        }

        if (orgIdForApi) params.set('organisation_id', orgIdForApi);

        if (selectedCompetitionId) {
          params.set('period_id', selectedCompetitionId);
        } else if (selectedSeasonIds.length === 1) {
          params.set('period_id', selectedSeasonIds[0]);
          params.set('include_descendants', 'true');
        }

        const all = await fetchAllPages<Activity>(
          `${apiBaseUrl}/api/v1/activities/?${params.toString()}`,
          { credentials: 'include' },
          {
            ttlMs: 20_000,
            bypass: refreshKey > 0,
            cacheKey: `matches:${params.toString()}:max:${matchesMaxItems ?? 'all'}`,
            maxItems: matchesMaxItems ?? undefined,
          },
        );

        if (seq !== loadMatchesSeqRef.current) return;

        const guardedByOrg = orgIdForApi
          ? all.filter((m) => String(m?.organisation?.id || '') === String(orgIdForApi))
          : all;

        const guarded = (() => {
          if (!orgLocked) return guardedByOrg;
          if (teams.length === 0) return [];

          const allowedTeamIds = new Set(
            selectedTeamId
              ? [String(selectedTeamId)]
              : selectedClubId
                ? teams
                    .filter((t) => getTeamParentId(t) === String(selectedClubId))
                    .map((t) => String(t.id))
                : teams.map((t) => String(t.id)),
          );

          return guardedByOrg.filter((m) => allowedTeamIds.has(String(m?.project?.id || '')));
        })();

        if (selectedSeasonIds.length > 1 && selectedSeasonName) {
          const filtered = guarded.filter((m) => {
            const seasonName = m?.period?.parent_period?.name;
            return String(seasonName || '').trim() === selectedSeasonName;
          });
          setMatches(filtered);
        } else {
          setMatches(guarded);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load matches');
      } finally {
        if (seq === loadMatchesSeqRef.current) setMatchesLoading(false);
      }
    };

    loadMatches();
  }, [
    selectedTeamId,
    selectedClubId,
    selectedOrgId,
    selectedSeasonName,
    selectedSeasonIds,
    selectedCompetitionId,
    teams,
    refreshKey,
    matchesMaxItems,
  ]);

  return {
    matches,
    setMatches,
    matchesLoading,
    matchesMaxItems,
    setMatchesMaxItems,
    filteredMatches,
    sortedMatches,
  };
}

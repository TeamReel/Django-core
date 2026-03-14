/**
 * useMatchesData/fetchers.ts
 * Data fetching functions for seasons, competitions, and matches.
 */

import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { chunkArray, getTeamParentId } from '../../utils/directoryHelpers';
import type { Activity, Period } from '../../utils/directoryHelpers';

interface Team {
  id: string | number;
  parent_id?: unknown;
  parent?: unknown;
  parent_project_id?: unknown;
  parent_project?: unknown;
}

interface FetchSeasonsParams {
  selectedTeamId: string | null;
  selectedClubId: string | null;
  selectedOrgId: string | null;
  teams: Team[];
  refreshKey: number;
}

/**
 * Fetches seasons for the filter dropdown.
 */
export async function fetchMatchesSeasons({
  selectedTeamId,
  selectedClubId,
  selectedOrgId,
  teams,
  refreshKey,
}: FetchSeasonsParams): Promise<Period[]> {
  const apiBaseUrl = getApiV1BaseUrl();

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
            return await fetchAllPages<Period>(
              `${apiBaseUrl}/periods/?${params.toString()}`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            );
          }),
        )
      ).flat();

      const roots = (Array.isArray(results) ? results : []).filter(
        (p) => p?.parent_period_id == null && !p?.parent_period,
      );
      return roots;
    }
    return [];
  } else if (selectedOrgId) {
    if (teams.length > 0) {
      const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
      const chunks = chunkArray(teamIds, 25);
      const results = (
        await Promise.all(
          chunks.map(async (ids) => {
            const params = new URLSearchParams(baseParams);
            params.set('project_id__in', ids.join(','));
            return await fetchAllPages<Period>(
              `${apiBaseUrl}/periods/?${params.toString()}`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            );
          }),
        )
      ).flat();

      const roots = (Array.isArray(results) ? results : []).filter(
        (p) => p?.parent_period_id == null && !p?.parent_period,
      );
      return [...new Map(roots.map((p) => [String(p.id), p])).values()];
    }

    baseParams.set('organisation_id', selectedOrgId);
  }

  const results = await fetchAllPages<Period>(
    `${apiBaseUrl}/periods/?${baseParams.toString()}`,
    { credentials: 'include' },
    { ttlMs: 120_000, bypass: refreshKey > 0 },
  );

  const roots = (Array.isArray(results) ? results : []).filter(
    (p) => p?.parent_period_id == null && !p?.parent_period,
  );
  return roots;
}

interface FetchCompetitionsParams {
  selectedSeasonName: string;
  selectedSeasonIds: string[];
  selectedOrgId: string | null;
  selectedClubId: string | null;
  selectedTeamId: string | null;
  teams: Team[];
  refreshKey: number;
  getSelectedOrgIdForApi: () => string | undefined;
}

/**
 * Fetches competitions for the filter dropdown.
 */
export async function fetchMatchesCompetitions({
  selectedSeasonName,
  selectedSeasonIds,
  selectedOrgId,
  selectedClubId,
  selectedTeamId,
  teams,
  refreshKey,
  getSelectedOrgIdForApi,
}: FetchCompetitionsParams): Promise<Period[]> {
  if (!selectedSeasonName) return [];

  const apiBaseUrl = getApiV1BaseUrl();
  const seasonIds = selectedSeasonIds;
  if (seasonIds.length === 0) return [];

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
          return await fetchAllPages<Period>(
            `${apiBaseUrl}/periods/?${params.toString()}`,
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

    return await fetchAllPages<Period>(
      `${apiBaseUrl}/periods/?${params.toString()}`,
      { credentials: 'include' },
      { ttlMs: 120_000, bypass: refreshKey > 0 },
    );
  });

  const all = (await Promise.all(requests)).flat();
  return [...new Map(all.map((c) => [String(c.id), c])).values()];
}

interface FetchMatchesParams {
  selectedTeamId: string | null;
  selectedClubId: string | null;
  selectedOrgId: string | null;
  selectedSeasonName: string;
  selectedSeasonIds: string[];
  selectedCompetitionId: string | null;
  teams: Team[];
  refreshKey: number;
  matchesMaxItems: number | null;
  orgLocked: boolean;
  getSelectedOrgIdForApi: () => string | undefined;
}

/**
 * Fetches matches based on current filter state.
 */
export async function fetchMatches({
  selectedTeamId,
  selectedClubId,
  selectedOrgId,
  selectedSeasonName,
  selectedSeasonIds,
  selectedCompetitionId,
  teams,
  refreshKey,
  matchesMaxItems,
  orgLocked,
  getSelectedOrgIdForApi,
}: FetchMatchesParams): Promise<Activity[]> {
  const apiBaseUrl = getApiV1BaseUrl();

  if (orgLocked && !selectedOrgId) {
    return [];
  }

  const orgIdForApi = getSelectedOrgIdForApi();

  if (selectedOrgId && !orgIdForApi) {
    return [];
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
      return [];
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
    `${apiBaseUrl}/activities/?${params.toString()}`,
    { credentials: 'include' },
    {
      ttlMs: 20_000,
      bypass: refreshKey > 0,
      cacheKey: `matches:${params.toString()}:max:${matchesMaxItems ?? 'all'}`,
      maxItems: matchesMaxItems ?? undefined,
    },
  );

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
    return guarded.filter((m) => {
      const seasonName = m?.period?.parent_period?.name;
      return String(seasonName || '').trim() === selectedSeasonName;
    });
  }

  return guarded;
}

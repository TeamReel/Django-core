/**
 * useCompetitionsData/fetchers.ts
 * Data fetching functions for seasons and competitions.
 */

import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';
import { chunkArray, getTeamParentId } from '../../utils/directoryHelpers';
import type { Period } from '../../utils/directoryHelpers';
import type { PeriodWithMeta } from './types';

interface FetchSeasonsParams {
  selectedTeamId: string | null;
  selectedClubId: string | null;
  selectedOrgId: string | null;
  teams: Array<{ id: string | number; parent_id?: unknown; parent?: unknown; parent_project_id?: unknown; parent_project?: unknown }>;
  refreshKey: number;
  getSelectedOrgIdForApi: () => string | undefined;
}

/**
 * Fetches seasons for the filter dropdown.
 */
export async function fetchSeasons({
  selectedTeamId,
  selectedClubId,
  selectedOrgId,
  teams,
  refreshKey,
  getSelectedOrgIdForApi,
}: FetchSeasonsParams): Promise<Period[]> {
  const apiBaseUrl = getApiBaseUrl();

  const fetchSeasonsWithParams = async (params: URLSearchParams) => {
    const results = await fetchAllPages<any>(
      `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
      { credentials: 'include' },
      { ttlMs: 120_000, bypass: refreshKey > 0 },
    );
    return Array.isArray(results) ? results : [];
  };

  const baseParams = new URLSearchParams();
  baseParams.set('page_size', '500');
  baseParams.set('parent_id', 'null');
  baseParams.set('type', 'season');

  if (selectedTeamId) {
    baseParams.set('project_id', String(selectedTeamId));
  } else if (selectedClubId) {
    if (teams.length === 0) return [];

    const clubTeams = teams.filter((t) => {
      const parent =
        t.parent_id ??
        t.parent ??
        t.parent_project_id ??
        (typeof t.parent_project === 'object' && t.parent_project !== null ? (t.parent_project as { id: string }).id : t.parent_project);
      const parentId = parent == null ? '' : String(typeof parent === 'object' && parent !== null ? (parent as { id: string }).id : parent);
      return parentId && parentId === String(selectedClubId);
    });

    if (clubTeams.length === 0) return [];

    const teamIds = clubTeams.map((t) => String(t.id));
    const projectIds = [String(selectedClubId), ...teamIds].filter(Boolean);

    const typedResults = (
      await Promise.all(
        chunkArray(projectIds, 25).map(async (ids) => {
          const params = new URLSearchParams(baseParams);
          params.set('project_id__in', ids.join(','));
          return await fetchSeasonsWithParams(params);
        }),
      )
    ).flat();

    const untypedBaseParams = new URLSearchParams(baseParams);
    untypedBaseParams.delete('type');
    const untypedResults = (
      await Promise.all(
        chunkArray(projectIds, 25).map(async (ids) => {
          const params = new URLSearchParams(untypedBaseParams);
          params.set('project_id__in', ids.join(','));
          return await fetchSeasonsWithParams(params);
        }),
      )
    )
      .flat()
      .filter((p: Period) => !p?.parent_period_id && !p?.parent_period);

    const merged = [...typedResults, ...untypedResults];
    return [...new Map(merged.map((p: Period) => [String(p.id), p])).values()];
  } else if (selectedOrgId) {
    if (teams.length > 0) {
      const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
      const chunks = chunkArray(teamIds, 25);
      const results = (
        await Promise.all(
          chunks.map(async (ids) => {
            const params = new URLSearchParams(baseParams);
            params.set('project_id__in', ids.join(','));
            return await fetchSeasonsWithParams(params);
          }),
        )
      ).flat();

      const untypedBaseParams = new URLSearchParams(baseParams);
      untypedBaseParams.delete('type');
      const untypedResults = (
        await Promise.all(
          chunks.map(async (ids) => {
            const params = new URLSearchParams(untypedBaseParams);
            params.set('project_id__in', ids.join(','));
            return await fetchSeasonsWithParams(params);
          }),
        )
      )
        .flat()
        .filter((p: Period) => !p?.parent_period_id && !p?.parent_period);

      const merged = [...results, ...untypedResults];
      return [...new Map(merged.map((p: Period) => [String(p.id), p])).values()];
    }

    const orgIdForApi = getSelectedOrgIdForApi();
    if (orgIdForApi) baseParams.set('organisation_id', orgIdForApi);
  }

  const typedAll = await fetchSeasonsWithParams(baseParams);
  const untypedBaseParams = new URLSearchParams(baseParams);
  untypedBaseParams.delete('type');
  const untypedAll = (await fetchSeasonsWithParams(untypedBaseParams)).filter(
    (p: Period) => !p?.parent_period_id && !p?.parent_period,
  );

  return [...new Map([...typedAll, ...untypedAll].map((p: Period) => [String(p.id), p])).values()];
}

interface FetchCompetitionsParams {
  selectedTeamId: string | null;
  selectedClubId: string | null;
  selectedOrgId: string | null;
  selectedSeasonIds: string[];
  teams: Array<{ id: string | number; parent_id?: unknown; parent?: unknown; parent_project_id?: unknown; parent_project?: unknown }>;
  refreshKey: number;
  getSelectedOrgIdForApi: () => string | undefined;
}

/**
 * Fetches competitions based on current filter state.
 */
export async function fetchCompetitions({
  selectedTeamId,
  selectedClubId,
  selectedOrgId,
  selectedSeasonIds,
  teams,
  refreshKey,
  getSelectedOrgIdForApi,
}: FetchCompetitionsParams): Promise<Period[]> {
  const apiBaseUrl = getApiBaseUrl();

  const explicitTeamScope = selectedTeamId ? [String(selectedTeamId)] : null;

  let clubTeamIds: string[] | null = null;
  if (!selectedTeamId && selectedClubId) {
    if (teams.length === 0) return [];

    clubTeamIds = teams
      .filter((t) => {
        const parent =
          t.parent_id ??
          t.parent ??
          t.parent_project_id ??
          (typeof t.parent_project === 'object' && t.parent_project !== null ? (t.parent_project as { id: string }).id : t.parent_project);
        const parentId = parent == null ? '' : String(typeof parent === 'object' && parent !== null ? (parent as { id: string }).id : parent);
        return parentId && parentId === String(selectedClubId);
      })
      .map((t) => String(t.id));

    if (clubTeamIds.length === 0) return [];
  }

  const buildParams = (seasonId?: string) => {
    const params = new URLSearchParams();
    params.set('page_size', '500');
    params.set('type', 'competition');
    if (seasonId) params.set('parent_id', seasonId);

    if (selectedTeamId) {
      params.set('project_id', String(selectedTeamId));
    } else if (clubTeamIds && clubTeamIds.length > 0) {
      params.set('project_id__in', clubTeamIds.join(','));
    }

    if (selectedOrgId && !selectedClubId && !selectedTeamId) {
      if (teams.length > 0) {
        params.set(
          'project_id__in',
          teams
            .map((t) => String(t.id))
            .filter(Boolean)
            .join(','),
        );
      } else {
        const orgIdForApi = getSelectedOrgIdForApi();
        if (orgIdForApi) params.set('organisation_id', orgIdForApi);
      }
    }

    return params;
  };

  const teamIdsForOrg =
    selectedOrgId && !selectedClubId && !selectedTeamId
      ? teams.map((t) => String(t.id)).filter(Boolean)
      : null;

  const teamIdsGlobal =
    !selectedOrgId && !selectedClubId && !selectedTeamId && teams.length > 0
      ? teams.map((t) => String(t.id)).filter(Boolean)
      : null;

  const scopedTeamIds =
    explicitTeamScope ||
    (clubTeamIds && clubTeamIds.length > 0 ? clubTeamIds : null) ||
    (teamIdsForOrg && teamIdsForOrg.length > 0 ? teamIdsForOrg : null) ||
    (teamIdsGlobal && teamIdsGlobal.length > 0 ? teamIdsGlobal : null);

  if (selectedOrgId && !selectedClubId && !selectedTeamId && (!teamIdsForOrg || teamIdsForOrg.length === 0)) {
    return [];
  }

  const fetchWithTeamChunks = async (baseParams: URLSearchParams, tIds: string[]) => {
    const chunks = chunkArray(tIds, 25);
    const results = (
      await Promise.all(
        chunks.map(async (ids) => {
          const params = new URLSearchParams(baseParams);
          params.delete('project_id');
          params.delete('project_id__in');
          params.set('project_id__in', ids.join(','));
          return await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          );
        }),
      )
    ).flat();
    return [...new Map(results.map((c: Period) => [String(c.id), c])).values()];
  };

  const inferCompetitions = (items: PeriodWithMeta[]) =>
    (Array.isArray(items) ? items : []).filter(
      (p: PeriodWithMeta) => (p?.parent_period_id != null || p?.parent_period) && p?.metadata?.type !== 'season',
    );

  const maybeFallbackUntyped = async (baseParams: URLSearchParams, tIds: string[]) => {
    const untyped = new URLSearchParams(baseParams);
    untyped.delete('type');
    const all = await fetchWithTeamChunks(untyped, tIds);
    return inferCompetitions(all);
  };

  if (selectedSeasonIds.length > 0) {
    const requests = selectedSeasonIds.map(async (sid) => {
      const params = buildParams(sid);
      if (scopedTeamIds && scopedTeamIds.length > 0) {
        const typed = await fetchWithTeamChunks(params, scopedTeamIds);
        const fallback = await maybeFallbackUntyped(params, scopedTeamIds);
        return [...typed, ...fallback];
      }
      return await fetchAllPages<any>(
        `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
        { credentials: 'include' },
        { ttlMs: 120_000, bypass: refreshKey > 0 },
      );
    });

    const all = (await Promise.all(requests)).flat();
    return [...new Map(all.map((c: Period) => [String(c.id), c])).values()];
  }

  const params = buildParams(undefined);

  if (scopedTeamIds && scopedTeamIds.length > 0) {
    const typed = await fetchWithTeamChunks(params, scopedTeamIds);
    const fallback = await maybeFallbackUntyped(params, scopedTeamIds);
    const merged = [...typed, ...fallback];
    return [...new Map(merged.map((c: Period) => [String(c.id), c])).values()];
  }

  const results = await fetchAllPages<any>(
    `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
    { credentials: 'include' },
    { ttlMs: 120_000, bypass: refreshKey > 0 },
  );
  return Array.isArray(results) ? results : [];
}

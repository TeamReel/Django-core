/**
 * Data hook for the CompetitionsList page.
 *
 * Encapsulates: seasons-for-filter fetch, competitions state + fetch,
 * CRUD operations, and filtered/sorted derivations.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../utils/fetchAllPages';
import { getApiBaseUrl } from '../utils/apiBase';
import {
  chunkArray,
  getCsrfToken,
  sortKey,
  getFederationName,
  getTeamName,
  getClubName,
  getSeasonName,
  getTeamParentId,
  isPeriodActive,
  matchesSportFilter,
} from '../utils/directoryHelpers';
import type { Period } from '../utils/directoryHelpers';
import type { Filters, UseCompetitionsDataReturn } from './competitionsDataTypes';

// Re-export types for backward compatibility
export type { Filters, UseCompetitionsDataReturn } from './competitionsDataTypes';

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useCompetitionsData(filters: Filters): UseCompetitionsDataReturn {
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
    selectedSeasonIds,
    seasons,
    setSeasons,
    refreshKey,
    triggerRefresh,
    setError,
    getSelectedOrgIdForApi,
  } = filters;

  // ── State ─────────────────────────────────────────────────────────
  const [competitions, setCompetitions] = useState<Period[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);

  // ── Fetch Seasons (for filter dropdown) ───────────────────────────

  useEffect(() => {
    const loadSeasons = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
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
          if (teams.length === 0) {
            setSeasons([]);
            return;
          }

          const clubTeams = teams.filter((t) => {
            const parent =
              (t as any).parent_id ??
              (t as any).parent ??
              (t as any).parent_project_id ??
              (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project);
            const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
            return parentId && parentId === String(selectedClubId);
          });

          if (clubTeams.length === 0) {
            setSeasons([]);
            return;
          }

          const teamIds = clubTeams.map((t) => String((t as any).id));
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
            .filter((p: any) => !p?.parent_period_id && !p?.parent_period);

          const merged = [...typedResults, ...untypedResults];
          const unique = [...new Map(merged.map((p: any) => [String(p.id), p])).values()];
          setSeasons(unique);
          return;
        } else if (selectedOrgId) {
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String((t as any).id)).filter(Boolean);
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
              .filter((p: any) => !p?.parent_period_id && !p?.parent_period);

            const merged = [...results, ...untypedResults];
            const unique = [...new Map(merged.map((p: any) => [String(p.id), p])).values()];
            setSeasons(unique);
            return;
          }

          const orgIdForApi = getSelectedOrgIdForApi();
          if (orgIdForApi) baseParams.set('organisation_id', orgIdForApi);
        }

        const typedAll = await fetchSeasonsWithParams(baseParams);
        const untypedBaseParams = new URLSearchParams(baseParams);
        untypedBaseParams.delete('type');
        const untypedAll = (await fetchSeasonsWithParams(untypedBaseParams)).filter(
          (p: any) => !p?.parent_period_id && !p?.parent_period,
        );

        const unique = [...new Map([...typedAll, ...untypedAll].map((p: any) => [String(p.id), p])).values()];
        setSeasons(unique);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load seasons');
        setSeasons([]);
      }
    };

    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // ── Fetch Competitions ────────────────────────────────────────────

  useEffect(() => {
    const loadCompetitions = async () => {
      setCompetitionsLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      try {
        const explicitTeamScope = selectedTeamId ? [String(selectedTeamId)] : null;

        let clubTeamIds: string[] | null = null;
        if (!selectedTeamId && selectedClubId) {
          if (teams.length === 0) {
            setCompetitions([]);
            return;
          }

          clubTeamIds = teams
            .filter((t) => {
              const parent =
                (t as any).parent_id ??
                (t as any).parent ??
                (t as any).parent_project_id ??
                (typeof (t as any).parent_project === 'object' ? (t as any).parent_project?.id : (t as any).parent_project);
              const parentId = parent == null ? '' : String(typeof parent === 'object' ? parent.id : parent);
              return parentId && parentId === String(selectedClubId);
            })
            .map((t) => String((t as any).id));

          if (clubTeamIds.length === 0) {
            setCompetitions([]);
            return;
          }
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
                  .map((t) => String((t as any).id))
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
            ? teams.map((t) => String((t as any).id)).filter(Boolean)
            : null;

        const teamIdsGlobal =
          !selectedOrgId && !selectedClubId && !selectedTeamId && teams.length > 0
            ? teams.map((t) => String((t as any).id)).filter(Boolean)
            : null;

        const scopedTeamIds =
          explicitTeamScope ||
          (clubTeamIds && clubTeamIds.length > 0 ? clubTeamIds : null) ||
          (teamIdsForOrg && teamIdsForOrg.length > 0 ? teamIdsForOrg : null) ||
          (teamIdsGlobal && teamIdsGlobal.length > 0 ? teamIdsGlobal : null);

        if (selectedOrgId && !selectedClubId && !selectedTeamId && (!teamIdsForOrg || teamIdsForOrg.length === 0)) {
          setCompetitions([]);
          return;
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
          return [...new Map(results.map((c: any) => [String(c.id), c])).values()];
        };

        const inferCompetitions = (items: any[]) =>
          (Array.isArray(items) ? items : []).filter(
            (p: any) => (p?.parent_period_id != null || p?.parent_period) && p?.metadata?.type !== 'season',
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
          const unique = [...new Map(all.map((c: any) => [String(c.id), c])).values()];

          setCompetitions(unique as any);
          return;
        }

        const params = buildParams(undefined);

        if (scopedTeamIds && scopedTeamIds.length > 0) {
          const typed = await fetchWithTeamChunks(params, scopedTeamIds);
          const fallback = await maybeFallbackUntyped(params, scopedTeamIds);
          const merged = [...typed, ...fallback];
          const unique = [...new Map(merged.map((c: any) => [String(c.id), c])).values()];
          setCompetitions(unique as any);
          return;
        }

        const results = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/periods/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
        );
        setCompetitions(Array.isArray(results) ? results : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competitions');
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, [selectedTeamId, selectedClubId, selectedOrgId, selectedSeasonIds, teams, refreshKey]);

  // ── CRUD ──────────────────────────────────────────────────────────

  const savePeriodEdits = useCallback(async (periodId: string, payload: any) => {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v1/periods/${periodId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to update competition');
    }
  }, []);

  const createCompetition = useCallback(async (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
    parent_period_id?: string;
  }) => {
    const apiBaseUrl = getApiBaseUrl();

    const orgId = String(payload.organisation_id || selectedOrgId || '');
    const teamId = String(payload.project_id || selectedTeamId || '');
    const seasonId = String(payload.parent_period_id || selectedSeasonIds[0] || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');
    if (!seasonId) throw new Error('Select a season first');

    const response = await fetch(`${apiBaseUrl}/api/v1/periods/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify({
        organisation_id: orgId,
        project_id: teamId ? Number(teamId) : undefined,
        parent_period_id: seasonId || null,
        name: payload.name,
        description: payload.description,
        start_date: payload.start_date,
        end_date: payload.end_date,
        metadata: { type: 'competition' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || 'Failed to create competition');
    }

    invalidateFetchAllPagesCache();
    triggerRefresh();
  }, [selectedOrgId, selectedTeamId, selectedSeasonIds, triggerRefresh]);

  const handleDeleteCompetition = useCallback(async (orgId: string, compId: string, compName: string) => {
    if (!compId || !window.confirm(`Are you sure you want to delete competition "${compName}"?`)) {
      return;
    }
    const apiBaseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/periods/${compId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || '',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete competition');
      }
      setCompetitions((prev) => prev.filter((c) => c.id !== compId));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete competition');
    }
  }, []);

  // ── Filtered & Sorted ─────────────────────────────────────────────

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
      list = list.filter((comp) => (comp as any).sport?.id === variantFilter);
    }
    return list;
  }, [competitions, statusFilter, sportFilter, variantFilter, organisations]);

  const sortedCompetitions = useMemo(() => {
    const list = [...filteredCompetitions];
    list.sort((a: any, b: any) => {
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
    competitions,
    competitionsLoading,
    filteredCompetitions,
    sortedCompetitions,
    savePeriodEdits,
    createCompetition,
    handleDeleteCompetition,
  };
}

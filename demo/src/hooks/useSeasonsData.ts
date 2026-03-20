/**
 * Data hook for the SeasonsList page.
 *
 * Encapsulates: seasons state, fetch effect, CRUD operations,
 * and the filtered/sorted derivations.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../utils/apiFetch';
import { api, trashApi } from '@/api';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import {
  chunkArray,
  sortKey,
  getFederationName,
  getTeamName,
  getClubName,
  matchesSportFilter,
} from '../utils/directoryHelpers';
import type { Period } from '../utils/directoryHelpers';
import type { useDirectoryFilters } from './useDirectoryFilters';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
/** Broad period shape covering API responses + parent_period sub-objects */
interface PeriodLike {
  id: string;
  name?: string;
  slug?: string;
  parent_period_id?: string | null;
  parent_period?: { id?: string; name?: string; slug?: string } | null;
  type?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}
type Filters = ReturnType<typeof useDirectoryFilters>;

export interface UseSeasonsDataReturn {
  seasons: Period[];
  seasonsLoading: boolean;
  filteredSeasons: Period[];
  sortedSeasons: Period[];
  savePeriodEdits: (periodId: string, payload: Record<string, unknown>) => Promise<void>;
  createSeason: (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
  }) => Promise<void>;
  handleDeleteSeason: (orgId: string, seasonId: string | undefined, seasonName: string) => Promise<void>;
}

// ────────────────────────────────────────────
// Helpers (SeasonsList-specific)
// ────────────────────────────────────────────

const isLikelySeasonRoot = (p: PeriodLike): boolean => {
  if (!p) return false;
  const hasParent = Boolean(p?.parent_period_id ?? p?.parent_period?.id ?? p?.parent_period);
  if (hasParent) return false;
  const type = String(p?.type ?? p?.data?.type ?? p?.metadata?.type ?? '').toLowerCase();
  if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;
  return true;
};

// ────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────

export function useSeasonsData(filters: Filters): UseSeasonsDataReturn {
  const {
    organisations,
    clubs,
    teams,
    selectedOrgId,
    selectedClubId,
    selectedTeamId,
    statusFilter,
    sportFilter,
    refreshKey,
    triggerRefresh,
    setError,
    getSelectedOrgIdForApi,
  } = filters;

  const { pushToast } = useToast();
  const confirm = useConfirm();

  // ── State ─────────────────────────────────────────────────────────
  const [seasons, setSeasons] = useState<Period[]>([]);
  /** Accept PeriodLike[] from fetchers — safe at runtime because Period's extra
   *  required fields (name, slug, …) are always present in API data. */
  const setSeasonsFromApi = (items: PeriodLike[]) => setSeasons(items as Period[]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  // ── Fetch Seasons ─────────────────────────────────────────────────

  useEffect(() => {
    const loadSeasons = async () => {
      setSeasonsLoading(true);
      const apiBaseUrl = getApiV1BaseUrl();

      try {
        const fetchPeriods = async (params: URLSearchParams) => {
          const url = `${apiBaseUrl}/periods/?${params.toString()}`;
          const results = await fetchAllPages<PeriodLike>(
            url,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          );
          return Array.isArray(results) ? results : [];
        };

        const baseParams = new URLSearchParams();
        baseParams.set('page_size', '2000');
        baseParams.set('type', 'season');

        if (selectedTeamId) {
          const projectIds = [String(selectedTeamId), selectedClubId ? String(selectedClubId) : ''].filter(Boolean);
          if (projectIds.length === 1) baseParams.set('project_id', projectIds[0]);
          else baseParams.set('project_id__in', projectIds.join(','));

          const typedParams = new URLSearchParams(baseParams);
          const typed = await fetchPeriods(typedParams);

          const untypedParams = new URLSearchParams(baseParams);
          untypedParams.delete('type');
          const untyped = await fetchPeriods(untypedParams);

          const competitionsParams = new URLSearchParams();
          competitionsParams.set('project_id', String(selectedTeamId));
          competitionsParams.set('page_size', '2000');
          competitionsParams.set('type', 'competition');
          const competitions = await fetchPeriods(competitionsParams);
          const parentSeasons = (competitions || [])
            .map((c) => c?.parent_period)
            .filter((p): p is PeriodLike => Boolean(p && (p?.id || p?.slug)));

          const merged = [...typed, ...untyped, ...parentSeasons].filter((p) => isLikelySeasonRoot(p));
          const unique = [...new Map(merged.map((p) => [String(p.id), p])).values()];
          setSeasonsFromApi(unique);
          return;
        } else if (selectedClubId) {
          const clubTeams = teams.filter((t) => {
            const parent =
              t.parent_id ??
              t.parent_project_id ??
              (typeof t.parent_project === 'object' && t.parent_project !== null ? t.parent_project.id : t.parent_project) ??
              t.parent;
            const parentId = parent == null ? '' : String(parent);
            return parentId && parentId === String(selectedClubId);
          });
          if (clubTeams.length > 0) {
            const teamIds = clubTeams.map((t) => String(t.id));
            const projectIds = [String(selectedClubId), ...teamIds].filter(Boolean);
            const chunks = chunkArray(projectIds, 25);

            const typedChunks = await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(baseParams);
                params.set('project_id__in', ids.join(','));
                return await fetchPeriods(params);
              }),
            );

            const untypedBase = new URLSearchParams(baseParams);
            untypedBase.delete('type');
            const untypedChunks = await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(untypedBase);
                params.set('project_id__in', ids.join(','));
                return await fetchPeriods(params);
              }),
            );

            const merged = [...typedChunks.flat(), ...untypedChunks.flat()].filter((p) => isLikelySeasonRoot(p));
            const unique = [...new Map(merged.map((p) => [String(p.id), p])).values()];
            setSeasonsFromApi(unique);
            return;
          }
        } else if (selectedOrgId) {
          if (teams.length > 0) {
            const teamIds = teams.map((t) => String(t.id)).filter(Boolean);
            const chunks = chunkArray(teamIds, 25);
            const typedChunks = await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(baseParams);
                params.set('project_id__in', ids.join(','));
                return await fetchPeriods(params);
              }),
            );

            const untypedBase = new URLSearchParams(baseParams);
            untypedBase.delete('type');
            const untypedChunks = await Promise.all(
              chunks.map(async (ids) => {
                const params = new URLSearchParams(untypedBase);
                params.set('project_id__in', ids.join(','));
                return await fetchPeriods(params);
              }),
            );

            const merged = [...typedChunks.flat(), ...untypedChunks.flat()].filter((p) => isLikelySeasonRoot(p));
            const unique = [...new Map(merged.map((p) => [String(p.id), p])).values()];
            setSeasonsFromApi(unique);
            return;
          }

          const orgIdForApi = getSelectedOrgIdForApi();
          if (orgIdForApi) baseParams.set('organisation_id', orgIdForApi);
        }

        if (selectedClubId && teams.length === 0) {
          setSeasons([]);
          return;
        }

        const results = await fetchPeriods(baseParams);

        if (
          Array.isArray(results) &&
          results.length === 0 &&
          selectedOrgId &&
          !selectedClubId &&
          !selectedTeamId
        ) {
          const fallbackParams = new URLSearchParams(baseParams);
          fallbackParams.delete('type');

          const fallbackUrl = `${apiBaseUrl}/periods/?${fallbackParams.toString()}`;
          const fallback = await fetchAllPages<PeriodLike>(
            fallbackUrl,
            { credentials: 'include' },
            { ttlMs: 120_000, bypass: refreshKey > 0 },
          );

          const inferred = (Array.isArray(fallback) ? fallback : []).filter((p) => isLikelySeasonRoot(p));
          const unique = [...new Map(inferred.map((p) => [String(p.id), p])).values()];
          setSeasonsFromApi(unique);
          return;
        }

        const filteredSeasons = results.filter((p) => isLikelySeasonRoot(p));
        const unique = [...new Map((Array.isArray(filteredSeasons) ? filteredSeasons : []).map((p) => [String(p.id), p])).values()];
        setSeasonsFromApi(unique);
      } catch (e) {
        logger.error('useSeasonsData load error', e);
        setError(e instanceof Error ? e.message : 'Failed to load seasons');
      } finally {
        setSeasonsLoading(false);
      }
    };

    loadSeasons();
  }, [selectedTeamId, selectedClubId, selectedOrgId, teams, refreshKey]);

  // ── CRUD ──────────────────────────────────────────────────────────

  const savePeriodEdits = useCallback(async (periodId: string, payload: Record<string, unknown>) => {
    await api.patch(`/periods/${periodId}/`, payload);
  }, []);

  const createSeason = useCallback(async (payload: {
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    organisation_id?: string;
    project_id?: string;
  }) => {
    const orgId = String(payload.organisation_id || selectedOrgId || '');
    const teamId = String(payload.project_id || selectedTeamId || '');
    if (!orgId) throw new Error('Select a federation first');
    if (!teamId) throw new Error('Select a team first');

    await api.post('/periods/', {
      organisation_id: orgId,
      project_id: teamId ? Number(teamId) : undefined,
      parent_period_id: null,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      end_date: payload.end_date,
      metadata: { type: 'season' },
    });

    invalidateFetchAllPagesCache();
    triggerRefresh();
  }, [selectedOrgId, selectedTeamId, triggerRefresh]);

  const handleDeleteSeason = useCallback(async (orgId: string, seasonId: string | undefined, seasonName: string) => {
    if (!seasonId) return;
    const ok = await confirm({ title: 'Seizoen verwijderen', message: `"${seasonName}" wordt verplaatst naar de prullenbak.`, confirmLabel: 'Verwijderen', variant: 'danger' });
    if (!ok) return;
    try {
      // Optimistic update
      const deletedSeason = seasons.find((s) => s.id === seasonId);
      setSeasons((prev) => prev.filter((s) => s.id !== seasonId));

      await api.delete(`/periods/${seasonId}/`);

      // Show toast with undo action
      pushToast({
        message: `"${seasonName}" verplaatst naar prullenbak`,
        type: 'info',
        actions: [{
          label: 'Ongedaan maken',
          onClick: async () => {
            try {
              const trashItem = await trashApi.findByObjectId(seasonId);
              if (trashItem) {
                await trashApi.restore(trashItem.id);
                // Restore to list
                if (deletedSeason) {
                  setSeasons((prev) => [...prev, deletedSeason]);
                }
                pushToast({ message: `"${seasonName}" hersteld`, type: 'success' });
              }
            } catch (err) {
              logger.error('Failed to restore season', err);
              pushToast({ message: 'Herstellen mislukt', type: 'error' });
            }
          },
        }],
      });
    } catch (err) {
      logger.error('useSeasonsData delete error', err);
      pushToast({ message: 'Verwijderen mislukt', type: 'error' });
      // Revert optimistic update
      triggerRefresh();
    }
  }, [seasons, pushToast, confirm, triggerRefresh]);

  // ── Filtered & Sorted ─────────────────────────────────────────────

  const filteredSeasons = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let list = seasons;

    if (statusFilter === 'active') {
      list = list.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return today >= start && today <= end;
      });
    }
    if (statusFilter === 'inactive') {
      list = list.filter((s) => {
        const start = s.start_date || '0000-00-00';
        const end = s.end_date || '9999-99-99';
        return !(today >= start && today <= end);
      });
    }

    if (sportFilter !== 'all') {
      list = list.filter((season) => matchesSportFilter(season, sportFilter, organisations));
    }

    return list;
  }, [seasons, statusFilter, sportFilter, organisations]);

  const sortedSeasons = useMemo(() => {
    const list = [...filteredSeasons];
    list.sort((a, b) => {
      const byFederation = sortKey(getFederationName(a, organisations)).localeCompare(sortKey(getFederationName(b, organisations)));
      if (byFederation !== 0) return byFederation;
      const byClub = sortKey(getClubName(a, clubs, teams)).localeCompare(sortKey(getClubName(b, clubs, teams)));
      if (byClub !== 0) return byClub;
      const byTeam = sortKey(getTeamName(a, teams)).localeCompare(sortKey(getTeamName(b, teams)));
      if (byTeam !== 0) return byTeam;
      return sortKey(a?.name).localeCompare(sortKey(b?.name));
    });
    return list;
  }, [filteredSeasons, organisations, clubs, teams]);

  return {
    seasons,
    seasonsLoading,
    filteredSeasons,
    sortedSeasons,
    savePeriodEdits,
    createSeason,
    handleDeleteSeason,
  };
}

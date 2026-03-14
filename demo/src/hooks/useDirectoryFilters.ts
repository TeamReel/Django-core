/**
 * Shared hook that manages the filter state + option loading common to every
 * directory list page (Seasons, Competitions, Matches, etc.).
 *
 * Responsibilities:
 * - Auth/role derivation (isSuperAdmin, orgLocked, etc.)
 * - Org/Club/Team option lists loaded from API
 * - Locked-org UUID → slug resolution
 * - Cascading filter resets (org change resets club/team, club change resets team, etc.)
 * - URL search-param sync
 * - Sports categories
 */

import { useEffect, useMemo, useCallback, useReducer } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formReducer, makeSetter } from '../utils/formReducer';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useSports } from './useSports';
import { fetchAllPages } from '../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../utils/apiFetch';
import { api } from '@/api';
import { isUuid, isNumericId, buildSeasonOptions } from '../utils/directoryHelpers';
import { logger } from '@/utils/logger';
import type { Period, SeasonOption } from '../utils/directoryHelpers';
import type { Organisation } from '../types';
import type {
  OrganisationOption,
  ProjectOption,
  UseDirectoryFiltersConfig,
  DirectoryFiltersState,
} from './directoryFilterTypes';

// Re-export types for backward compatibility
export type { OrganisationOption, ProjectOption, UseDirectoryFiltersConfig, DirectoryFiltersState } from './directoryFilterTypes';

export function useDirectoryFilters(config: UseDirectoryFiltersConfig): DirectoryFiltersState {
  const {
    preselectedOrgId,
    preselectedClubId,
    preselectedTeamId,
    showSeasonFilter = false,
    showCompetitionFilter = false,
    showVariantFilter = false,
  } = config;

  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { categories, variants, getVariantsForCategory } = useSports();

  // Auth
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  // Lock flags
  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);

  // ── State ──────────────────────────────────────────────────────────

  interface DirFiltersState {
    isLoading: boolean;
    error: string | null;
    organisations: OrganisationOption[];
    clubs: ProjectOption[];
    teams: ProjectOption[];
    lockedOrgSlug: string;
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    statusFilter: string;
    sportFilter: string;
    variantFilter: string;
    selectedSeasonName: string;
    seasons: Period[];
    selectedCompetitionId: string;
    competitions: Period[];
    refreshKey: number;
  }

  const [s, dispatch] = useReducer(formReducer<DirFiltersState>, {
    isLoading: true,
    error: null,
    organisations: [],
    clubs: [],
    teams: [],
    lockedOrgSlug: '',
    selectedOrgId: preselectedOrgId ? String(preselectedOrgId) : '',
    selectedClubId: preselectedClubId ? String(preselectedClubId) : '',
    selectedTeamId: preselectedTeamId ? String(preselectedTeamId) : '',
    statusFilter: 'all',
    sportFilter: 'all',
    variantFilter: 'all',
    selectedSeasonName: '',
    seasons: [],
    selectedCompetitionId: '',
    competitions: [],
    refreshKey: 0,
  });

  const setIsLoading       = useMemo(() => makeSetter(dispatch, 'isLoading'), [dispatch]);
  const setError           = useMemo(() => makeSetter(dispatch, 'error'), [dispatch]);
  const setOrganisations   = useMemo(() => makeSetter(dispatch, 'organisations'), [dispatch]);
  const setClubs           = useMemo(() => makeSetter(dispatch, 'clubs'), [dispatch]);
  const setTeams           = useMemo(() => makeSetter(dispatch, 'teams'), [dispatch]);
  const setLockedOrgSlug   = useMemo(() => makeSetter(dispatch, 'lockedOrgSlug'), [dispatch]);
  const _setSelectedOrgId  = useMemo(() => makeSetter(dispatch, 'selectedOrgId'), [dispatch]);
  const _setSelectedClubId = useMemo(() => makeSetter(dispatch, 'selectedClubId'), [dispatch]);
  const _setSelectedTeamId = useMemo(() => makeSetter(dispatch, 'selectedTeamId'), [dispatch]);
  const setStatusFilter    = useMemo(() => makeSetter(dispatch, 'statusFilter'), [dispatch]);
  const setSportFilter     = useMemo(() => makeSetter(dispatch, 'sportFilter'), [dispatch]);
  const setVariantFilter   = useMemo(() => makeSetter(dispatch, 'variantFilter'), [dispatch]);
  const setSelectedSeasonName     = useMemo(() => makeSetter(dispatch, 'selectedSeasonName'), [dispatch]);
  const setSeasons                = useMemo(() => makeSetter(dispatch, 'seasons'), [dispatch]);
  const setSelectedCompetitionId  = useMemo(() => makeSetter(dispatch, 'selectedCompetitionId'), [dispatch]);
  const setCompetitions           = useMemo(() => makeSetter(dispatch, 'competitions'), [dispatch]);
  const setRefreshKey             = useMemo(() => makeSetter(dispatch, 'refreshKey'), [dispatch]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [setRefreshKey]);

  // ── Cascading setters ──────────────────────────────────────────────

  const setSelectedOrgId = useCallback(
    (v: string) => {
      dispatch({ type: 'patch', payload: {
        selectedOrgId: v,
        ...(!clubLocked ? { selectedClubId: '' } : {}),
        ...(!teamLocked ? { selectedTeamId: '' } : {}),
        ...(showSeasonFilter ? { selectedSeasonName: '' } : {}),
        ...(showCompetitionFilter ? { selectedCompetitionId: '' } : {}),
      }});
    },
    [clubLocked, teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const setSelectedClubId = useCallback(
    (v: string) => {
      if (clubLocked) return;
      dispatch({ type: 'patch', payload: {
        selectedClubId: v,
        ...(!teamLocked ? { selectedTeamId: '' } : {}),
        ...(showSeasonFilter ? { selectedSeasonName: '' } : {}),
        ...(showCompetitionFilter ? { selectedCompetitionId: '' } : {}),
      }});
    },
    [clubLocked, teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const setSelectedTeamId = useCallback(
    (v: string) => {
      if (teamLocked) return;
      dispatch({ type: 'patch', payload: {
        selectedTeamId: v,
        ...(showSeasonFilter ? { selectedSeasonName: '' } : {}),
        ...(showCompetitionFilter ? { selectedCompetitionId: '' } : {}),
      }});
    },
    [teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'patch', payload: {
      ...(!clubLocked ? { selectedClubId: '' } : {}),
      ...(!teamLocked ? { selectedTeamId: '' } : {}),
      statusFilter: 'all',
      sportFilter: 'all',
      ...(showVariantFilter ? { variantFilter: 'all' } : {}),
      ...(showSeasonFilter ? { selectedSeasonName: '' } : {}),
      ...(showCompetitionFilter ? { selectedCompetitionId: '' } : {}),
      ...(isSuperAdmin && !orgLocked ? { selectedOrgId: '' } : {}),
    }});
  }, [clubLocked, teamLocked, showVariantFilter, showSeasonFilter, showCompetitionFilter, isSuperAdmin, orgLocked]);

  // ── Org slug helpers ───────────────────────────────────────────────

  const getSelectedOrgSlugForApi = useCallback(() => {
    const selectedOrg = s.selectedOrgId
      ? s.organisations.find(
          (o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId),
        )
      : null;

    if (s.selectedOrgId && !selectedOrg) return '';

    if (orgLocked) {
      return selectedOrg?.slug || s.lockedOrgSlug || '';
    }

    return (
      selectedOrg?.slug ||
      (!s.selectedOrgId ? context.organisation?.slug : '') ||
      ''
    );
  }, [s.selectedOrgId, s.organisations, orgLocked, s.lockedOrgSlug, context.organisation?.slug]);

  const getSelectedOrgIdForApi = useCallback(() => {
    const selectedOrg = s.selectedOrgId
      ? s.organisations.find(
          (o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId),
        )
      : null;
    const resolved = selectedOrg ? String(selectedOrg.id ?? '') : '';
    if (resolved && isUuid(resolved)) return resolved;
    if (s.selectedOrgId && isUuid(s.selectedOrgId)) return String(s.selectedOrgId);
    return '';
  }, [s.selectedOrgId, s.organisations]);

  // Route key
  const orgKeyForRoutes = useMemo(() => {
    const selectedOrg = s.selectedOrgId
      ? s.organisations.find(
          (o) => String(o.id) === String(s.selectedOrgId) || String(o.slug) === String(s.selectedOrgId),
        )
      : null;
    const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || s.selectedOrgId;
    return String(
      orgSlugOrId ||
        context?.organisation?.slug ||
        context?.organisation?.id ||
        '',
    ).trim();
  }, [s.selectedOrgId, s.organisations, context]);

  // ── Season options (Competitions + Matches) ────────────────────────

  const seasonOptions = useMemo(
    () => (showSeasonFilter ? buildSeasonOptions(s.seasons) : []),
    [s.seasons, showSeasonFilter],
  );

  const selectedSeasonIds = useMemo(() => {
    if (!s.selectedSeasonName) return [] as string[];
    // If selectedSeasonName is an ID (from URL), match by id first.
    const byId = s.seasons.find((ss) => String(ss.id) === String(s.selectedSeasonName));
    if (byId?.name) {
      const match = seasonOptions.find((o: SeasonOption) => o.name === String(byId.name));
      return match?.ids || [String(byId.id)];
    }
    const match = seasonOptions.find((o: SeasonOption) => o.name === s.selectedSeasonName);
    return match?.ids || [];
  }, [s.selectedSeasonName, seasonOptions, s.seasons]);

  // ── Effects: init from preselected / URL ───────────────────────────

  useEffect(() => {
    if (preselectedOrgId) {
      _setSelectedOrgId(String(preselectedOrgId));
    } else if (!isSuperAdmin && context.organisation?.id) {
      _setSelectedOrgId(String(context.organisation.id));
    }
  }, [preselectedOrgId, context.organisation?.id, isSuperAdmin]);

  useEffect(() => {
    if (preselectedClubId) _setSelectedClubId(String(preselectedClubId));
  }, [preselectedClubId]);

  useEffect(() => {
    if (preselectedTeamId) _setSelectedTeamId(String(preselectedTeamId));
  }, [preselectedTeamId]);

  // URL param sync
  useEffect(() => {
    if (preselectedOrgId) {
      const clubId = searchParams.get('club_id');
      const teamId = searchParams.get('team_id');
      const seasonId = searchParams.get('season_id');
      if (!clubLocked && clubId) _setSelectedClubId(String(clubId));
      if (!teamLocked && !clubLocked && teamId) _setSelectedTeamId(String(teamId));
      if (showSeasonFilter && !clubLocked && !teamLocked && seasonId) setSelectedSeasonName(String(seasonId));
      return;
    }

    const orgId = searchParams.get('org_id');
    const clubId = searchParams.get('club_id');
    const teamId = searchParams.get('team_id');
    const seasonId = searchParams.get('season_id');

    if (orgId && isSuperAdmin) _setSelectedOrgId(String(orgId));
    if (!clubLocked && clubId) _setSelectedClubId(String(clubId));
    if (!teamLocked && !clubLocked && teamId) _setSelectedTeamId(String(teamId));
    if (showSeasonFilter && seasonId) setSelectedSeasonName(String(seasonId));
  }, [isSuperAdmin, preselectedOrgId, searchParams, clubLocked, teamLocked, showSeasonFilter]);

  // ── Locked org slug resolution ─────────────────────────────────────

  useEffect(() => {
    if (!orgLocked) {
      if (s.lockedOrgSlug) setLockedOrgSlug('');
      return;
    }

    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }

    const fromList = s.organisations.find(
      (o) => String(o.id) === String(rawLockedId),
    )?.slug;
    if (fromList) {
      setLockedOrgSlug(String(fromList));
      return;
    }

    let cancelled = false;
    const loadSlug = async () => {
      try {
        const { results: list } = await api.list<Organisation>('/organisations/', { pageSize: 250 });
        const match = list.find((o) => String(o?.id || '') === String(rawLockedId));
        const slug = String(match?.slug || '').trim();
        if (!cancelled && slug) setLockedOrgSlug(slug);
      } catch {
        // ignore
      }
    };

    void loadSlug();
    return () => {
      cancelled = true;
    };
  }, [orgLocked, preselectedOrgId, s.organisations]);

  // ── Fetch organisations ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiV1BaseUrl();
      try {
        const myOrgIds = myOrganisations.map((o) => String(o.id));

        const orgs = await fetchAllPages<OrganisationOption>(
          `${apiBaseUrl}/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: s.refreshKey > 0 },
        );

        const filteredOrgs = isSuperAdmin
          ? orgs
          : (orgs || []).filter((o) => myOrgIds.includes(String(o.id)));

        setOrganisations(
          (filteredOrgs || []).map((o) => ({
            id: String(o.id),
            name: o.name,
            slug: o.slug,
            sport: o.sport,
            sport_variants_count: o.sport_variants_count,
          })),
        );
      } catch {
        setOrganisations(
          myOrganisations.map((o) => {
            const ext = o as unknown as { id: string; name: string; slug: string; sport?: { id: string; name: string }; sport_variants_count?: number };
            return {
              id: String(ext.id),
              name: ext.name,
              slug: ext.slug,
              sport: ext.sport,
              sport_variants_count: ext.sport_variants_count,
            };
          }),
        );
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, s.refreshKey]);

  // ── Fetch clubs + teams ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiV1BaseUrl();

      try {
        const orgSlugForApi = getSelectedOrgSlugForApi();

        if (orgLocked && !orgSlugForApi) {
          setClubs([]);
          setTeams([]);
          return;
        }

        if (orgSlugForApi) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: s.refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: s.refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        } else if (!orgLocked) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/projects/?page_size=200&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: s.refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/projects/?page_size=200&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: s.refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        }
      } catch (e) {
        logger.error('Failed to load options', e);
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [context.organisation?.slug, s.organisations, s.refreshKey, s.selectedOrgId, orgLocked, s.lockedOrgSlug, getSelectedOrgSlugForApi]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    isSuperAdmin,
    user,
    orgLocked,
    clubLocked,
    teamLocked,
    organisations: s.organisations,
    clubs: s.clubs,
    teams: s.teams,
    selectedOrgId: s.selectedOrgId,
    selectedClubId: s.selectedClubId,
    selectedTeamId: s.selectedTeamId,
    statusFilter: s.statusFilter,
    sportFilter: s.sportFilter,
    variantFilter: s.variantFilter,
    selectedSeasonName: s.selectedSeasonName,
    seasonOptions,
    selectedSeasonIds,
    seasons: s.seasons,
    setSeasons,
    selectedCompetitionId: s.selectedCompetitionId,
    competitions: s.competitions,
    setCompetitions,
    setSelectedOrgId,
    setSelectedClubId,
    setSelectedTeamId,
    setStatusFilter,
    setSportFilter,
    setVariantFilter,
    setSelectedSeasonName,
    setSelectedCompetitionId,
    clearAll,
    isLoading: s.isLoading,
    error: s.error,
    setError,
    refreshKey: s.refreshKey,
    triggerRefresh,
    lockedOrgSlug: s.lockedOrgSlug,
    getSelectedOrgSlugForApi,
    getSelectedOrgIdForApi,
    orgKeyForRoutes,
    categories,
    variants,
    getVariantsForCategory,
    context,
  };
}

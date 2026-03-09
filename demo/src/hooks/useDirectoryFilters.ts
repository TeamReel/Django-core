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

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useSports } from './useSports';
import { fetchAllPages } from '../utils/fetchAllPages';
import { getApiBaseUrl } from '../utils/apiBase';
import { api } from '@/api';
import { isUuid, isNumericId, buildSeasonOptions } from '../utils/directoryHelpers';
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
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  // Lock flags
  const orgLocked = Boolean(preselectedOrgId);
  const clubLocked = Boolean(preselectedClubId);
  const teamLocked = Boolean(preselectedTeamId);

  // ── State ──────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);

  const [lockedOrgSlug, setLockedOrgSlug] = useState<string>('');

  const [selectedOrgId, _setSelectedOrgId] = useState<string>(() =>
    preselectedOrgId ? String(preselectedOrgId) : '',
  );
  const [selectedClubId, _setSelectedClubId] = useState<string>(
    preselectedClubId ? String(preselectedClubId) : '',
  );
  const [selectedTeamId, _setSelectedTeamId] = useState<string>(
    preselectedTeamId ? String(preselectedTeamId) : '',
  );

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [variantFilter, setVariantFilter] = useState<string>('all');

  // Season/competition cascade
  const [selectedSeasonName, setSelectedSeasonName] = useState<string>('');
  const [seasons, setSeasons] = useState<Period[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [competitions, setCompetitions] = useState<Period[]>([]);

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Cascading setters ──────────────────────────────────────────────

  const setSelectedOrgId = useCallback(
    (v: string) => {
      _setSelectedOrgId(v);
      if (!clubLocked) _setSelectedClubId('');
      if (!teamLocked) _setSelectedTeamId('');
      if (showSeasonFilter) setSelectedSeasonName('');
      if (showCompetitionFilter) setSelectedCompetitionId('');
    },
    [clubLocked, teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const setSelectedClubId = useCallback(
    (v: string) => {
      if (clubLocked) return;
      _setSelectedClubId(v);
      if (!teamLocked) _setSelectedTeamId('');
      if (showSeasonFilter) setSelectedSeasonName('');
      if (showCompetitionFilter) setSelectedCompetitionId('');
    },
    [clubLocked, teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const setSelectedTeamId = useCallback(
    (v: string) => {
      if (teamLocked) return;
      _setSelectedTeamId(v);
      if (showSeasonFilter) setSelectedSeasonName('');
      if (showCompetitionFilter) setSelectedCompetitionId('');
    },
    [teamLocked, showSeasonFilter, showCompetitionFilter],
  );

  const clearAll = useCallback(() => {
    if (!clubLocked) _setSelectedClubId('');
    if (!teamLocked) _setSelectedTeamId('');
    setStatusFilter('all');
    setSportFilter('all');
    if (showVariantFilter) setVariantFilter('all');
    if (showSeasonFilter) setSelectedSeasonName('');
    if (showCompetitionFilter) setSelectedCompetitionId('');
    if (isSuperAdmin && !orgLocked) _setSelectedOrgId('');
  }, [clubLocked, teamLocked, showVariantFilter, showSeasonFilter, showCompetitionFilter, isSuperAdmin, orgLocked]);

  // ── Org slug helpers ───────────────────────────────────────────────

  const getSelectedOrgSlugForApi = useCallback(() => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
        )
      : null;

    if (selectedOrgId && !selectedOrg) return '';

    if (orgLocked) {
      return selectedOrg?.slug || lockedOrgSlug || '';
    }

    return (
      selectedOrg?.slug ||
      (!selectedOrgId ? context.organisation?.slug : '') ||
      ''
    );
  }, [selectedOrgId, organisations, orgLocked, lockedOrgSlug, context.organisation?.slug]);

  const getSelectedOrgIdForApi = useCallback(() => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
        )
      : null;
    const resolved = selectedOrg ? String(selectedOrg.id ?? '') : '';
    if (resolved && isUuid(resolved)) return resolved;
    if (selectedOrgId && isUuid(selectedOrgId)) return String(selectedOrgId);
    return '';
  }, [selectedOrgId, organisations]);

  // Route key
  const orgKeyForRoutes = useMemo(() => {
    const selectedOrg = selectedOrgId
      ? organisations.find(
          (o) => String(o.id) === String(selectedOrgId) || String(o.slug) === String(selectedOrgId),
        )
      : null;
    const orgSlugOrId = selectedOrg?.slug || selectedOrg?.id || selectedOrgId;
    return String(
      orgSlugOrId ||
        (context as any)?.organisation?.slug ||
        (context as any)?.organisation?.id ||
        '',
    ).trim();
  }, [selectedOrgId, organisations, context]);

  // ── Season options (Competitions + Matches) ────────────────────────

  const seasonOptions = useMemo(
    () => (showSeasonFilter ? buildSeasonOptions(seasons) : []),
    [seasons, showSeasonFilter],
  );

  const selectedSeasonIds = useMemo(() => {
    if (!selectedSeasonName) return [] as string[];
    // If selectedSeasonName is an ID (from URL), match by id first.
    const byId = seasons.find((s) => String(s.id) === String(selectedSeasonName));
    if (byId?.name) {
      const match = seasonOptions.find((o: SeasonOption) => o.name === String(byId.name));
      return match?.ids || [String(byId.id)];
    }
    const match = seasonOptions.find((o: SeasonOption) => o.name === selectedSeasonName);
    return match?.ids || [];
  }, [selectedSeasonName, seasonOptions, seasons]);

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
      if (lockedOrgSlug) setLockedOrgSlug('');
      return;
    }

    const rawLockedId = String(preselectedOrgId || '').trim();
    if (!rawLockedId) return;

    if (!isNumericId(rawLockedId) && !isUuid(rawLockedId)) {
      setLockedOrgSlug(rawLockedId);
      return;
    }

    const fromList = organisations.find(
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
  }, [orgLocked, preselectedOrgId, organisations]);

  // ── Fetch organisations ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const myOrgIds = myOrganisations.map((o) => String(o.id));

        const orgs = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
          { credentials: 'include' },
          { ttlMs: 120_000, bypass: refreshKey > 0 },
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
          myOrganisations.map((o) => ({
            id: String(o.id),
            name: o.name,
            slug: (o as any).slug,
            sport: (o as any).sport,
            sport_variants_count: (o as any).sport_variants_count,
          })),
        );
      }
    };

    load();
  }, [isSuperAdmin, myOrganisations, refreshKey]);

  // ── Fetch clubs + teams ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const apiBaseUrl = getApiBaseUrl();

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
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&include_archived=true&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        } else if (!orgLocked) {
          const [allClubs, allTeams] = await Promise.all([
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
            fetchAllPages<ProjectOption>(
              `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
              { credentials: 'include' },
              { ttlMs: 120_000, bypass: refreshKey > 0 },
            ),
          ]);
          setClubs(allClubs);
          setTeams(allTeams);
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Failed to load options');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [context.organisation?.slug, organisations, refreshKey, selectedOrgId, orgLocked, lockedOrgSlug, getSelectedOrgSlugForApi]);

  // ── Return ─────────────────────────────────────────────────────────

  return {
    isSuperAdmin,
    user,
    orgLocked,
    clubLocked,
    teamLocked,
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
    seasonOptions,
    selectedSeasonIds,
    seasons,
    setSeasons,
    selectedCompetitionId,
    competitions,
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
    isLoading,
    error,
    setError,
    refreshKey,
    triggerRefresh,
    lockedOrgSlug,
    getSelectedOrgSlugForApi,
    getSelectedOrgIdForApi,
    orgKeyForRoutes,
    categories,
    variants,
    getVariantsForCategory,
    context,
  };
}

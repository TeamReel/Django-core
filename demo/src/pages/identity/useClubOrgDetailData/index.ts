/**
 * useClubOrgDetailData/index.ts
 * Orchestrator hook for ClubOrganisationDetailPage.
 *
 * All state, data-loading effects & computed values.
 */

import { useReducer, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/utils/apiBase';
import { formReducer, makeSetter } from '@/utils/formReducer';
import type { Organisation, Project, Period, OverviewMember } from '../clubOrgDetailHelpers';
import { useClubOrgHierarchy } from '../useClubOrgHierarchy';
import type { UseClubOrgDetailDataReturn } from './types';
import { useDerivedClubOrg } from './derived';
import { useClubOrgEffects } from './effects';
import { useClubOrgHandlers } from './handlers';

// Re-export types
export type { UseClubOrgDetailDataReturn } from './types';

export function useClubOrgDetailData(): UseClubOrgDetailDataReturn {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const apiBaseUrl = getApiBaseUrl();

  const orgSlugOrId = String(orgId || '').trim();
  const clubSlugOrId = String(projectId || '').trim();

  interface ClubOrgDetailState {
    resolvedOrgSlug: string;
    org: Organisation | null;
    club: Project | null;
    activeContext: Record<string, unknown> | null;
    activatingContext: boolean;
    isProjectEditModalOpen: boolean;
    isProjectDetailModalOpen: boolean;
    loading: boolean;
    error: string | null;
    overviewLoading: boolean;
    overviewError: string | null;
    overviewTeams: Project[];
    overviewSeasons: Period[];
    overviewMembers: OverviewMember[];
    overviewCounts: { teams: number; seasons: number; members: number } | null;
    brandLogoUrl: string | null;
    brandProfileId: string | null;
    orgClubsForSwitcher: Project[];
    orgClubsForSwitcherLoading: boolean;
  }
  const [s, dispatch] = useReducer(formReducer<ClubOrgDetailState>, {
    resolvedOrgSlug: '', org: null, club: null, activeContext: null,
    activatingContext: false, isProjectEditModalOpen: false, isProjectDetailModalOpen: false,
    loading: true, error: null,
    overviewLoading: false, overviewError: null, overviewTeams: [], overviewSeasons: [],
    overviewMembers: [], overviewCounts: null,
    brandLogoUrl: null, brandProfileId: null,
    orgClubsForSwitcher: [], orgClubsForSwitcherLoading: false,
  });

  const setResolvedOrgSlug = useMemo(() => makeSetter<ClubOrgDetailState, 'resolvedOrgSlug'>(dispatch, 'resolvedOrgSlug'), [dispatch]);
  const setOrg = useMemo(() => makeSetter<ClubOrgDetailState, 'org'>(dispatch, 'org'), [dispatch]);
  const setClub = useMemo(() => makeSetter<ClubOrgDetailState, 'club'>(dispatch, 'club'), [dispatch]);
  const setActiveContextState = useMemo(() => makeSetter<ClubOrgDetailState, 'activeContext'>(dispatch, 'activeContext'), [dispatch]);
  const setActivatingContext = useMemo(() => makeSetter<ClubOrgDetailState, 'activatingContext'>(dispatch, 'activatingContext'), [dispatch]);
  const setIsProjectEditModalOpen = useMemo(() => makeSetter<ClubOrgDetailState, 'isProjectEditModalOpen'>(dispatch, 'isProjectEditModalOpen'), [dispatch]);
  const setIsProjectDetailModalOpen = useMemo(() => makeSetter<ClubOrgDetailState, 'isProjectDetailModalOpen'>(dispatch, 'isProjectDetailModalOpen'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<ClubOrgDetailState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<ClubOrgDetailState, 'error'>(dispatch, 'error'), [dispatch]);
  const setOverviewLoading = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewLoading'>(dispatch, 'overviewLoading'), [dispatch]);
  const setOverviewError = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewError'>(dispatch, 'overviewError'), [dispatch]);
  const setOverviewTeams = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewTeams'>(dispatch, 'overviewTeams'), [dispatch]);
  const setOverviewSeasons = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewSeasons'>(dispatch, 'overviewSeasons'), [dispatch]);
  const setOverviewMembers = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewMembers'>(dispatch, 'overviewMembers'), [dispatch]);
  const setOverviewCounts = useMemo(() => makeSetter<ClubOrgDetailState, 'overviewCounts'>(dispatch, 'overviewCounts'), [dispatch]);
  const setBrandLogoUrl = useMemo(() => makeSetter<ClubOrgDetailState, 'brandLogoUrl'>(dispatch, 'brandLogoUrl'), [dispatch]);
  const setBrandProfileId = useMemo(() => makeSetter<ClubOrgDetailState, 'brandProfileId'>(dispatch, 'brandProfileId'), [dispatch]);
  const setOrgClubsForSwitcher = useMemo(() => makeSetter<ClubOrgDetailState, 'orgClubsForSwitcher'>(dispatch, 'orgClubsForSwitcher'), [dispatch]);
  const setOrgClubsForSwitcherLoading = useMemo(() => makeSetter<ClubOrgDetailState, 'orgClubsForSwitcherLoading'>(dispatch, 'orgClubsForSwitcherLoading'), [dispatch]);

  const [refreshKey, setRefreshKey] = useState(0);
  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  // ── Derived state ──
  const derived = useDerivedClubOrg({
    orgSlugOrId,
    resolvedOrgSlug: s.resolvedOrgSlug,
    org: s.org,
    club: s.club,
    clubSlugOrId,
    orgClubsForSwitcher: s.orgClubsForSwitcher,
    locationSearch: location.search,
  });

  // ── Hierarchy tab (sub-hook) ──
  const hierarchy = useClubOrgHierarchy({
    activeTabFromUrl: derived.activeTabFromUrl,
    apiBaseUrl,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
  });

  // ── Handlers ──
  const { makeTabHref, handleClubSwitch } = useClubOrgHandlers({
    org: s.org,
    orgSlugOrId,
    locationPathname: location.pathname,
    locationSearch: location.search,
    navigate,
  });

  // ── Effects ──
  useClubOrgEffects({
    orgSlugOrId,
    clubSlugOrId,
    effectiveOrgSlug: derived.effectiveOrgSlug,
    activeTabFromUrl: derived.activeTabFromUrl,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
    org: s.org,
    club: s.club,
    resolvedOrgSlug: s.resolvedOrgSlug,
    shouldResolveOrg: derived.shouldResolveOrg,
    shouldResolveClub: derived.shouldResolveClub,
    locationSearch: location.search,
    navigate,
    setActiveContextState,
    setResolvedOrgSlug,
    setOrg,
    setClub,
    setLoading,
    setError,
    setOverviewLoading,
    setOverviewError,
    setOverviewTeams,
    setOverviewSeasons,
    setOverviewMembers,
    setOverviewCounts,
    setBrandLogoUrl,
    setBrandProfileId,
    setOrgClubsForSwitcher,
    setOrgClubsForSwitcherLoading,
    refreshKey,
  });

  return {
    // Core
    org: s.org, club: s.club, loading: s.loading, error: s.error, navigate, apiBaseUrl,
    activeContext: s.activeContext, setActiveContextState, activatingContext: s.activatingContext, setActivatingContext,

    // Modals
    isProjectEditModalOpen: s.isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen: s.isProjectDetailModalOpen, setIsProjectDetailModalOpen,

    // Tabs
    activeTabFromUrl: derived.activeTabFromUrl, makeTabHref,

    // IDs / keys
    orgIdForDirectoryLists: derived.orgIdForDirectoryLists,
    orgSlugForDirectoryLists: derived.orgSlugForDirectoryLists,
    clubIdForDirectoryLists: derived.clubIdForDirectoryLists,
    orgKeyForRoutes: derived.orgKeyForRoutes,
    clubKeyForRoutes: derived.clubKeyForRoutes,
    backToOrgHref: derived.backToOrgHref,

    // Club switcher
    clubBreadcrumbOptions: derived.clubBreadcrumbOptions,
    orgClubsForSwitcherLoading: s.orgClubsForSwitcherLoading, handleClubSwitch,

    // Overview
    overviewLoading: s.overviewLoading, overviewError: s.overviewError,
    overviewTeams: s.overviewTeams, overviewSeasons: s.overviewSeasons,
    overviewMembers: s.overviewMembers, overviewCounts: s.overviewCounts,

    // Hierarchy
    ...hierarchy,

    // Brand
    brandLogoUrl: s.brandLogoUrl, brandProfileId: s.brandProfileId,

    // Refetch
    refetch,
  };
}

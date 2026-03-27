/**
 * useOrgData — thin orchestrator (composition-of-hooks pattern)
 *
 * Sub-hooks (each < 500 lines):
 *   useOrgFormState     — all useState, refs, context, permissions, breadcrumbs
 *   useOrgDerived       — useMemo, derived values, tab logic, path helpers
 *   useOrgDataFetching  — 9 async fetch functions + recomputePeriodCounts
 *   useOrgActions       — mutation handlers (invite, delete, edit, save)
 */

export type { OrgDataReturn } from './orgDataTypes';
export type { OrgModalState, OrgFilterState } from './orgDataTypes';

import { useEffect } from 'react';
import type { OrgDataReturn } from './orgDataTypes';
import { getActiveContext } from '../../utils/activeContext';
import { DEBUG_LOGS, getApiV1BaseUrl, getCsrfToken } from './orgDataHelpers';
import { organisationsApi } from '@/api';
import type { Organisation } from '../../types';
import { logger } from '@/utils/logger';
import { useOrgFormState } from './useOrgFormState';
import { useOrgDerived } from './useOrgDerived';
import { useOrgDataFetching } from './useOrgDataFetching';
import { useOrgActions } from './useOrgActions';

export function useOrgData(): OrgDataReturn {
  /* ── 1. Form state ── */
  const s = useOrgFormState();

  /* ── 2. Derived ── */
  const derived = useOrgDerived({
    location: s.location,
    org: s.org,
    resolvedOrg: s.resolvedOrg,
    currentOrgSlug: s.currentOrgSlug,
    currentOrgId: s.currentOrgId,
    orgPeriods: s.orgPeriods,
    members: s.members,
    teams: s.teams,
    clubs: s.clubs,
    allClubsForTeams: s.allClubsForTeams,
    isSuperAdmin: s.isSuperAdmin,
    userCanEditOrg: s.userCanEditOrg,
  });

  /* ── 3. Data fetching ── */
  const fetching = useOrgDataFetching({
    currentOrgSlug: s.currentOrgSlug,
    currentOrgId: s.currentOrgId,
    org: s.org,
    teams: s.teams,
    teamsLoading: s.teamsLoading,
    orgPeriods: s.orgPeriods,
    orgPeriodsLoading: s.orgPeriodsLoading,
    members: s.members,
    membersLoading: s.membersLoading,
    teamsFetchedForOrgRef: s.teamsFetchedForOrgRef,
    teamsFetchInFlightRef: s.teamsFetchInFlightRef,
    orgPeriodsFetchInFlightRef: s.orgPeriodsFetchInFlightRef,
    setFederationMatches: s.setFederationMatches,
    setFederationMatchesLoading: s.setFederationMatchesLoading,
    setScheduledMatches: s.setScheduledMatches,
    setScheduledMatchesLoading: s.setScheduledMatchesLoading,
    setRecentPlayedMatches: s.setRecentPlayedMatches,
    setRecentPlayedMatchesLoading: s.setRecentPlayedMatchesLoading,
    setClubs: s.setClubs,
    setClubsCount: s.setClubsCount,
    setClubsLoading: s.setClubsLoading,
    setTeams: s.setTeams,
    setTeamsLoading: s.setTeamsLoading,
    setAllClubsForTeams: s.setAllClubsForTeams,
    setOrgPeriods: s.setOrgPeriods,
    setOrgPeriodsLoading: s.setOrgPeriodsLoading,
    setSeasonsCount: s.setSeasonsCount,
    setCompetitionsCount: s.setCompetitionsCount,
    setMatchesCount: s.setMatchesCount,
    setTeamsCount: s.setTeamsCount,
    setTeamSeasonsCountById: s.setTeamSeasonsCountById,
    setTeamCompetitionsCountById: s.setTeamCompetitionsCountById,
    setTeamMatchesCountById: s.setTeamMatchesCountById,
    setMembers: s.setMembers,
    setMembersLoading: s.setMembersLoading,
  });

  /* ── 4. Actions ── */
  const actions = useOrgActions({
    org: s.org,
    currentOrgSlug: s.currentOrgSlug,
    currentOrgId: s.currentOrgId,
    navigate: s.navigate,
    setOrg: s.setOrg,
    setActivatingContext: s.setActivatingContext,
    setActiveContextState: s.setActiveContextState,
    setDeleteLoading: s.setDeleteLoading,
    setInviteLoading: s.setInviteLoading,
    setInviteEmail: s.setInviteEmail,
    setIsEditMode: s.setIsEditMode,
    setEditName: s.setEditName,
    setEditType: s.setEditType,
    setEditCountry: s.setEditCountry,
    setSaving: s.setSaving,
    setMembers: s.setMembers,
    setClubs: s.setClubs,
    setTeams: s.setTeams,
    setAllClubsForTeams: s.setAllClubsForTeams,
    inviteEmail: s.inviteEmail,
    inviteRole: s.inviteRole,
    editName: s.editName,
    editType: s.editType,
    editCountry: s.editCountry,
  });

  /* ── 5. Effects ── */

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) s.setActiveContextState(context);
      } catch (e) { logger.error('Failed to load active context', e); }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  // Tab-based lazy data loading
  useEffect(() => {
    if (!s.currentOrgSlug) return;
    if (derived.activeTab === 'clubs') {
      if (!s.clubsLoading && s.clubs.length === 0) void fetching.fetchClubsPage(1);
    }
    if (derived.activeTab === 'teams') {
      if (!s.teamsLoading && s.teams.length === 0) void fetching.fetchTeamsForOrg({ force: true });
    }
    if (derived.activeTab === 'hierarchy') {
      if (!s.teamsLoading && (s.teams.length === 0 || s.allClubsForTeams.length === 0)) void fetching.fetchTeamsForOrg({ force: true });
    }
    if (derived.activeTab === 'users') void fetching.fetchMembers(false);
    if (derived.activeTab === 'overview') {
      if (!s.clubsLoading && s.clubs.length === 0) void fetching.fetchClubsPage(1);
      if (!s.teamsLoading && s.teams.length === 0) void fetching.fetchTeamsForOrg({ force: false });
      if (!s.membersLoading && s.members.length === 0) void fetching.fetchMembers(false);
    }
  }, [derived.activeTab, s.currentOrgSlug]);

  // Period loading for seasons/competitions/hierarchy tabs
  useEffect(() => {
    const shouldEnsurePeriods = derived.activeTab === 'seasons' || derived.activeTab === 'competitions' || derived.activeTab === 'hierarchy';
    if (!shouldEnsurePeriods) return;
    if (s.orgPeriodsLoading) return;
    if (s.orgPeriods.length > 0) return;
    void fetching.ensureOrgPeriodsLoaded();
  }, [derived.activeTab, s.orgPeriodsLoading, s.orgPeriods.length, s.teams.length, s.currentOrgSlug]);

  // Fetch org details
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!s.currentOrgSlug) return;
      try {
        s.setLoading(true);
        s.setError(null);
        const orgData = await organisationsApi.get(s.currentOrgSlug) as unknown as Organisation;
        s.setOrg(orgData);
        const organisationIdForCounts = String(orgData.id || s.currentOrgId || '');
        if (organisationIdForCounts) fetching.fetchFederationCounts(organisationIdForCounts);
      } catch (err) {
        logger.error('Org detail fetch error', err);
        s.setError(err instanceof Error ? err.message : 'Failed to fetch organisation details');
      } finally {
        s.setLoading(false);
      }
    };
    if (s.currentOrgSlug) fetchOrgDetails();
  }, [s.currentOrgSlug, s.currentOrgId]);

  // Scheduled/recent matches + counts
  useEffect(() => {
    const orgId = String(s.org?.id || s.currentOrgId || '');
    if (orgId) {
      fetching.fetchScheduledMatches(orgId);
      fetching.fetchRecentPlayedMatches(orgId);
      if (!s.orgPeriodsLoading && s.orgPeriods.length === 0) void fetching.fetchFederationCounts(orgId);
    }
  }, [s.org?.id, s.currentOrgId]);

  // Hierarchy tab period loading
  useEffect(() => {
    if (derived.activeTab !== 'hierarchy') return;
    const orgId = String(s.org?.id || s.currentOrgId || '').trim();
    if (!orgId) return;
    if (s.orgPeriodsLoading) return;
    if (s.orgPeriods.length > 0) return;
    void fetching.fetchFederationCounts(orgId);
  }, [derived.activeTab, s.org?.id, s.currentOrgId, s.orgPeriodsLoading, s.orgPeriods.length]);

  /* ── Return ── */
  return {
    ...s.modals,
    ...s.filters,
    id: s.id,
    org: s.org,
    resolvedOrg: s.resolvedOrg,
    currentOrgSlug: s.currentOrgSlug,
    currentOrgId: s.currentOrgId,
    orgSlugOrId: derived.orgSlugOrId,
    loading: s.loading,
    error: s.error,
    navigate: s.navigate,
    location: s.location,
    activeTab: derived.activeTab,
    tabs: derived.tabs,
    visibleTabs: derived.visibleTabs,
    makeTabHref: derived.makeTabHref,
    activatingContext: s.activatingContext,
    activeContext: s.activeContextState,
    handleActivateContext: actions.handleActivateContext,
    members: s.members,
    membersLoading: s.membersLoading,
    fetchMembers: fetching.fetchMembers,
    membershipUserCounts: derived.membershipUserCounts,
    clubs: s.clubs,
    clubsCount: s.clubsCount,
    clubsPage: s.clubsPage,
    setClubsPage: s.setClubsPage,
    clubsPageSize: s.clubsPageSize,
    clubsLoading: s.clubsLoading,
    allClubsForTeams: s.allClubsForTeams,
    clubsForHierarchy: derived.clubsForHierarchy,
    teams: s.teams,
    teamsCount: s.teamsCount,
    teamsLoading: s.teamsLoading,
    orgPeriods: s.orgPeriods,
    orgPeriodsLoading: s.orgPeriodsLoading,
    seasonsCount: s.seasonsCount,
    competitionsCount: s.competitionsCount,
    matchesCount: s.matchesCount,
    teamSeasonsCountById: s.teamSeasonsCountById,
    teamCompetitionsCountById: s.teamCompetitionsCountById,
    teamMatchesCountById: s.teamMatchesCountById,
    federationMatches: s.federationMatches,
    federationMatchesLoading: s.federationMatchesLoading,
    scheduledMatches: s.scheduledMatches,
    scheduledMatchesLoading: s.scheduledMatchesLoading,
    recentPlayedMatches: s.recentPlayedMatches,
    recentPlayedMatchesLoading: s.recentPlayedMatchesLoading,
    isEditMode: s.isEditMode,
    editName: s.editName,
    setEditName: s.setEditName,
    editType: s.editType,
    setEditType: s.setEditType,
    editCountry: s.editCountry,
    setEditCountry: s.setEditCountry,
    saving: s.saving,
    handleEdit: actions.handleEdit,
    handleCancelEdit: actions.handleCancelEdit,
    handleSaveEdit: actions.handleSaveEdit,
    saveOrganisationEdits: actions.saveOrganisationEdits,
    saveProjectEdits: actions.saveProjectEdits,
    inviteEmail: s.inviteEmail,
    setInviteEmail: s.setInviteEmail,
    inviteRole: s.inviteRole,
    setInviteRole: s.setInviteRole,
    inviteLoading: s.inviteLoading,
    handleInvite: actions.handleInvite,
    deleteLoading: s.deleteLoading,
    handleDelete: actions.handleDelete,
    isSuperAdmin: s.isSuperAdmin,
    permissionContext: s.permissionContext,
    userCanEditOrg: s.userCanEditOrg,
    userCanDeleteOrg: s.userCanDeleteOrg,
    userCanInvite: s.userCanInvite,
    userCanManageMembers: s.userCanManageMembers,
    userCanEditProject: s.userCanEditProject,
    userCanDeleteProject: s.userCanDeleteProject,
    organisationOptions: s.organisationOptions,
    handleOrganisationSwitch: s.handleOrganisationSwitch,
    createModalOrganisations: derived.createModalOrganisations,
    createModalClubs: derived.createModalClubs,
    orgIdForDirectoryLists: derived.orgIdForDirectoryLists,
    getBestMatchDetailPath: derived.getBestMatchDetailPath,
    getApiV1BaseUrl,
    getCsrfToken,
    fetchClubsPage: fetching.fetchClubsPage,
    fetchTeamsForOrg: fetching.fetchTeamsForOrg,
    setOrg: s.setOrg,
    setClubs: s.setClubs,
    setTeams: s.setTeams,
    setAllClubsForTeams: s.setAllClubsForTeams,
    setClubsCount: s.setClubsCount,
    setMembers: s.setMembers,
    setOrgPeriods: s.setOrgPeriods,
    setFederationMatches: s.setFederationMatches,
    setMatchesCount: s.setMatchesCount,
    setTeamsCount: s.setTeamsCount,
    recomputePeriodCounts: fetching.recomputePeriodCounts,
    fetchFederationCounts: fetching.fetchFederationCounts,
    getRecursiveMatchesCount: derived.getRecursiveMatchesCount,
  };
}

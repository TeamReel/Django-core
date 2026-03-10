/**
 * useCompetitionDetailData — Orchestrator hook
 * Split into focused modules for maintainability.
 */
import { useCompetitionDetailState } from './state';
import { useCompetitionFetchers } from './fetchers';
import { useCompetitionDerived } from './derived';
import { useCompetitionMutations } from '../useCompetitionMutations';
import type { UseCompetitionDetailDataReturn } from './types';

export type { UseCompetitionDetailDataReturn } from './types';

export function useCompetitionDetailData(effectiveCompetitionId: string): UseCompetitionDetailDataReturn {
  const state = useCompetitionDetailState();

  const derived = useCompetitionDerived({
    location: state.location,
    providerSeasonPathKey: state.providerSeasonPathKey,
    effectiveSeasonId: state.effectiveSeasonId,
    resolvedSeasonId: state.resolvedSeasonId,
    competition: state.competition,
    effectiveCompetitionId,
    resolvedCompetitionId: state.resolvedCompetitionId,
    isTeamRoute: state.isTeamRoute,
    seasonsBasePath: state.seasonsBasePath,
    matches: state.matches,
    hierarchySearch: state.hierarchySearch,
    club: state.club,
    project: state.project,
    opponentClubNames: state.opponentClubNames,
    competitionBasePath: '', // Will be computed in derived
    navigate: state.navigate,
    setActiveContextState: state.setActiveContextState,
  });

  useCompetitionFetchers({
    effectiveCompetitionId,
    resolvedSeasonId: state.resolvedSeasonId,
    resolvedCompetitionId: state.resolvedCompetitionId,
    competition: state.competition,
    project: state.project,
    club: state.club,
    activeTab: derived.activeTab,
    competitionsForSwitcher: state.competitionsForSwitcher,
    isTeamRoute: state.isTeamRoute,
    seasonsBasePath: state.seasonsBasePath,
    seasonKeyOrId: derived.seasonKeyOrId,
    apiBaseUrl: state.apiBaseUrl,
    matches: state.matches,
    opponentClubNames: state.opponentClubNames,
    location: state.location,
    navigate: state.navigate,
    setLoading: state.setLoading,
    setError: state.setError,
    setCompetition: state.setCompetition,
    setResolvedCompetitionId: state.setResolvedCompetitionId,
    setMatches: state.setMatches,
    setMatchesLoading: state.setMatchesLoading,
    setMembers: state.setMembers,
    setMembersLoading: state.setMembersLoading,
    setMatchMediaMap: state.setMatchMediaMap,
    setMatchMediaLoading: state.setMatchMediaLoading,
    setOpponentClubNames: state.setOpponentClubNames,
  });

  const mutations = useCompetitionMutations({
    apiBaseUrl: state.apiBaseUrl,
    resolvedCompetitionId: state.resolvedCompetitionId,
    competition: state.competition,
    project: state.project,
    seasonsBasePath: state.seasonsBasePath,
    seasonKeyOrId: derived.seasonKeyOrId,
    projectSlugOrId: state.projectSlugOrId,
    activatingContext: state.activatingContext,
    setCompetition: state.setCompetition,
    setMatches: state.setMatches,
    setMembers: state.setMembers,
    setSelectedEditPeriod: state.setSelectedEditPeriod,
    setActivatingContext: state.setActivatingContext,
    setActiveContextState: state.setActiveContextState,
    setMembersLoading: state.setMembersLoading,
    navigate: state.navigate,
  });

  return {
    // Navigation
    navigate: state.navigate,
    location: state.location,
    // Season context pass-through
    isTeamRoute: state.isTeamRoute,
    isOrgRoute: state.isOrgRoute,
    orgSlugOrId: state.orgSlugOrId,
    clubSlugOrId: state.clubSlugOrId,
    projectSlugOrId: state.projectSlugOrId,
    seasonsBasePath: state.seasonsBasePath,
    isSuperAdmin: state.isSuperAdmin,
    userCanEditProject: state.userCanEditProject,
    apiBaseUrl: state.apiBaseUrl,
    // Resolved entities
    org: state.org,
    project: state.project,
    club: state.club,
    season: state.season,
    competition: state.competition,
    resolvedSeasonId: state.resolvedSeasonId,
    resolvedCompetitionId: state.resolvedCompetitionId,
    // Loading
    loading: state.loading,
    error: state.error,
    // Computed
    activeTab: derived.activeTab,
    seasonKeyOrId: derived.seasonKeyOrId,
    competitionKeyOrId: derived.competitionKeyOrId,
    competitionBasePath: derived.competitionBasePath,
    navigateToTab: derived.navigateToTab,
    competitionMatchesCount: derived.competitionMatchesCount,
    // Matches
    matches: state.matches,
    matchesLoading: state.matchesLoading,
    filteredMatches: derived.filteredMatches,
    matchDisplayTitle: derived.matchDisplayTitle,
    matchDetailPath: derived.matchDetailPath,
    matchMediaMap: state.matchMediaMap,
    matchMediaLoading: state.matchMediaLoading,
    // Members
    members: state.members,
    membersLoading: state.membersLoading,
    // Hierarchy search
    hierarchySearch: state.hierarchySearch,
    setHierarchySearch: state.setHierarchySearch,
    // Active context
    activeContext: state.activeContext,
    activatingContext: state.activatingContext,
    // Modal state
    isPeriodEditModalOpen: state.isPeriodEditModalOpen,
    setIsPeriodEditModalOpen: state.setIsPeriodEditModalOpen,
    selectedEditPeriod: state.selectedEditPeriod,
    setSelectedEditPeriod: state.setSelectedEditPeriod,
    isPeriodDetailModalOpen: state.isPeriodDetailModalOpen,
    setIsPeriodDetailModalOpen: state.setIsPeriodDetailModalOpen,
    selectedDetailPeriod: state.selectedDetailPeriod,
    setSelectedDetailPeriod: state.setSelectedDetailPeriod,
    isMatchEditModalOpen: state.isMatchEditModalOpen,
    setIsMatchEditModalOpen: state.setIsMatchEditModalOpen,
    selectedEditMatch: state.selectedEditMatch,
    setSelectedEditMatch: state.setSelectedEditMatch,
    isMatchDetailModalOpen: state.isMatchDetailModalOpen,
    setIsMatchDetailModalOpen: state.setIsMatchDetailModalOpen,
    selectedDetailMatch: state.selectedDetailMatch,
    setSelectedDetailMatch: state.setSelectedDetailMatch,
    isMatchCreateModalOpen: state.isMatchCreateModalOpen,
    setIsMatchCreateModalOpen: state.setIsMatchCreateModalOpen,
    isMembershipDetailModalOpen: state.isMembershipDetailModalOpen,
    setIsMembershipDetailModalOpen: state.setIsMembershipDetailModalOpen,
    selectedMembershipDetail: state.selectedMembershipDetail,
    setSelectedMembershipDetail: state.setSelectedMembershipDetail,
    isMembershipEditModalOpen: state.isMembershipEditModalOpen,
    setIsMembershipEditModalOpen: state.setIsMembershipEditModalOpen,
    selectedMembershipEdit: state.selectedMembershipEdit,
    setSelectedMembershipEdit: state.setSelectedMembershipEdit,
    isAddMemberOpen: state.isAddMemberOpen,
    setIsAddMemberOpen: state.setIsAddMemberOpen,
    // Mutations
    ...mutations,
    activateContext: mutations.activateCompetitionContext,
    setCompetition: state.setCompetition,
    setMatches: state.setMatches,
    setMembers: state.setMembers,
  };
}

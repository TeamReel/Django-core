/**
 * State management for useCompetitionDetailData hook
 */
import { useEffect, useReducer, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSeasonContext } from '@/providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '@/types/season';
import type { Activity } from '@/types/api/activity';
import type { PeriodEditRef, MatchRef, MemberRef } from '../useCompetitionMutations';
import { formReducer, makeSetter } from '@/utils/formReducer';

// ── State interface ──────────────────────────────────────────────────────────

interface CompetitionDetailState {
  org: Organisation | null;
  project: Project | null;
  club: Project | null;
  season: Period | null;
  resolvedSeasonId: string;
  loading: boolean;
  error: string | null;
  competition: Period | null;
  activatingContext: boolean;
  activeContext: Record<string, unknown> | null;
  resolvedCompetitionId: string;
  competitionsForSwitcher: Period[];
  matches: Activity[];
  members: MemberRef[];
  matchesLoading: boolean;
  membersLoading: boolean;
  matchMediaMap: Record<string, Record<string, unknown>[]>;
  matchMediaLoading: boolean;
  opponentClubNames: Record<string, string>;
  hierarchySearch: string;
  isPeriodEditModalOpen: boolean;
  selectedEditPeriod: PeriodEditRef | null;
  isPeriodDetailModalOpen: boolean;
  selectedDetailPeriod: Period | null;
  isMatchEditModalOpen: boolean;
  selectedEditMatch: MatchRef | null;
  isMatchDetailModalOpen: boolean;
  selectedDetailMatch: Activity | null;
  isMatchCreateModalOpen: boolean;
  isMembershipDetailModalOpen: boolean;
  selectedMembershipDetail: MemberRef | null;
  isMembershipEditModalOpen: boolean;
  selectedMembershipEdit: MemberRef | null;
  isAddMemberOpen: boolean;
}

export function useCompetitionDetailState() {
  const navigate = useNavigate();
  const location = useLocation();

  const ctx = useSeasonContext();
  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    seasonPathKey: providerSeasonPathKey,
    isSuperAdmin,
    userCanEditProject,
    apiBaseUrl,
  } = ctx;

  /* ── Reducer state ── */
  const initialState: CompetitionDetailState = {
    org: providerOrg, project: providerProject, club: providerClub,
    season: providerSeason, resolvedSeasonId: providerSeasonId,
    loading: providerLoading, error: providerError,
    competition: null, activatingContext: false, activeContext: null,
    resolvedCompetitionId: '', competitionsForSwitcher: providerCompetitions,
    matches: [], members: [], matchesLoading: false, membersLoading: false,
    matchMediaMap: {}, matchMediaLoading: false,
    opponentClubNames: {}, hierarchySearch: '',
    isPeriodEditModalOpen: false, selectedEditPeriod: null,
    isPeriodDetailModalOpen: false, selectedDetailPeriod: null,
    isMatchEditModalOpen: false, selectedEditMatch: null,
    isMatchDetailModalOpen: false, selectedDetailMatch: null,
    isMatchCreateModalOpen: false,
    isMembershipDetailModalOpen: false, selectedMembershipDetail: null,
    isMembershipEditModalOpen: false, selectedMembershipEdit: null,
    isAddMemberOpen: false,
  };

  const [s, dispatch] = useReducer(formReducer<CompetitionDetailState>, initialState);

  /* ── Backward-compatible setters ── */
  const setCompetition = useMemo(() => makeSetter<CompetitionDetailState, 'competition'>(dispatch, 'competition'), [dispatch]);
  const setActivatingContext = useMemo(() => makeSetter<CompetitionDetailState, 'activatingContext'>(dispatch, 'activatingContext'), [dispatch]);
  const setActiveContextState = useMemo(() => makeSetter<CompetitionDetailState, 'activeContext'>(dispatch, 'activeContext'), [dispatch]);
  const setResolvedCompetitionId = useMemo(() => makeSetter<CompetitionDetailState, 'resolvedCompetitionId'>(dispatch, 'resolvedCompetitionId'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<CompetitionDetailState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<CompetitionDetailState, 'error'>(dispatch, 'error'), [dispatch]);
  const setMatches = useMemo(() => makeSetter<CompetitionDetailState, 'matches'>(dispatch, 'matches'), [dispatch]);
  const setMembers = useMemo(() => makeSetter<CompetitionDetailState, 'members'>(dispatch, 'members'), [dispatch]);
  const setMatchesLoading = useMemo(() => makeSetter<CompetitionDetailState, 'matchesLoading'>(dispatch, 'matchesLoading'), [dispatch]);
  const setMembersLoading = useMemo(() => makeSetter<CompetitionDetailState, 'membersLoading'>(dispatch, 'membersLoading'), [dispatch]);
  const setMatchMediaMap = useMemo(() => makeSetter<CompetitionDetailState, 'matchMediaMap'>(dispatch, 'matchMediaMap'), [dispatch]);
  const setMatchMediaLoading = useMemo(() => makeSetter<CompetitionDetailState, 'matchMediaLoading'>(dispatch, 'matchMediaLoading'), [dispatch]);
  const setOpponentClubNames = useMemo(() => makeSetter<CompetitionDetailState, 'opponentClubNames'>(dispatch, 'opponentClubNames'), [dispatch]);
  const setHierarchySearch = useMemo(() => makeSetter<CompetitionDetailState, 'hierarchySearch'>(dispatch, 'hierarchySearch'), [dispatch]);
  const setIsPeriodEditModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isPeriodEditModalOpen'>(dispatch, 'isPeriodEditModalOpen'), [dispatch]);
  const setSelectedEditPeriod = useMemo(() => makeSetter<CompetitionDetailState, 'selectedEditPeriod'>(dispatch, 'selectedEditPeriod'), [dispatch]);
  const setIsPeriodDetailModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isPeriodDetailModalOpen'>(dispatch, 'isPeriodDetailModalOpen'), [dispatch]);
  const setSelectedDetailPeriod = useMemo(() => makeSetter<CompetitionDetailState, 'selectedDetailPeriod'>(dispatch, 'selectedDetailPeriod'), [dispatch]);
  const setIsMatchEditModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isMatchEditModalOpen'>(dispatch, 'isMatchEditModalOpen'), [dispatch]);
  const setSelectedEditMatch = useMemo(() => makeSetter<CompetitionDetailState, 'selectedEditMatch'>(dispatch, 'selectedEditMatch'), [dispatch]);
  const setIsMatchDetailModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isMatchDetailModalOpen'>(dispatch, 'isMatchDetailModalOpen'), [dispatch]);
  const setSelectedDetailMatch = useMemo(() => makeSetter<CompetitionDetailState, 'selectedDetailMatch'>(dispatch, 'selectedDetailMatch'), [dispatch]);
  const setIsMatchCreateModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isMatchCreateModalOpen'>(dispatch, 'isMatchCreateModalOpen'), [dispatch]);
  const setIsMembershipDetailModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isMembershipDetailModalOpen'>(dispatch, 'isMembershipDetailModalOpen'), [dispatch]);
  const setSelectedMembershipDetail = useMemo(() => makeSetter<CompetitionDetailState, 'selectedMembershipDetail'>(dispatch, 'selectedMembershipDetail'), [dispatch]);
  const setIsMembershipEditModalOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isMembershipEditModalOpen'>(dispatch, 'isMembershipEditModalOpen'), [dispatch]);
  const setSelectedMembershipEdit = useMemo(() => makeSetter<CompetitionDetailState, 'selectedMembershipEdit'>(dispatch, 'selectedMembershipEdit'), [dispatch]);
  const setIsAddMemberOpen = useMemo(() => makeSetter<CompetitionDetailState, 'isAddMemberOpen'>(dispatch, 'isAddMemberOpen'), [dispatch]);

  /* ── Provider sync (7 useEffects → 2) ── */
  useEffect(() => {
    dispatch({
      type: 'patch',
      payload: {
        org: providerOrg, project: providerProject, club: providerClub,
        season: providerSeason, resolvedSeasonId: providerSeasonId,
        error: providerError, competitionsForSwitcher: providerCompetitions,
      },
    });
  }, [providerOrg, providerProject, providerClub, providerSeason, providerSeasonId, providerError, providerCompetitions]);

  useEffect(() => { if (!providerLoading) setLoading(false); }, [providerLoading]);

  return {
    // Navigation
    navigate, location,
    // Context pass-through
    isTeamRoute, isOrgRoute, orgSlugOrId, clubSlugOrId, projectSlugOrId,
    seasonsBasePath, isSuperAdmin, userCanEditProject, apiBaseUrl,
    providerSeasonPathKey, effectiveSeasonId,
    // Provider state
    providerCompetitions,
    // Entities
    org: s.org, project: s.project, club: s.club, season: s.season,
    competition: s.competition, setCompetition,
    resolvedSeasonId: s.resolvedSeasonId,
    resolvedCompetitionId: s.resolvedCompetitionId, setResolvedCompetitionId,
    competitionsForSwitcher: s.competitionsForSwitcher,
    // Loading
    loading: s.loading, setLoading, error: s.error, setError,
    // Domain state
    activatingContext: s.activatingContext, setActivatingContext,
    activeContext: s.activeContext, setActiveContextState,
    matches: s.matches, setMatches,
    members: s.members, setMembers,
    matchesLoading: s.matchesLoading, setMatchesLoading,
    membersLoading: s.membersLoading, setMembersLoading,
    matchMediaMap: s.matchMediaMap, setMatchMediaMap,
    matchMediaLoading: s.matchMediaLoading, setMatchMediaLoading,
    opponentClubNames: s.opponentClubNames, setOpponentClubNames,
    hierarchySearch: s.hierarchySearch, setHierarchySearch,
    // Modals
    isPeriodEditModalOpen: s.isPeriodEditModalOpen, setIsPeriodEditModalOpen,
    selectedEditPeriod: s.selectedEditPeriod, setSelectedEditPeriod,
    isPeriodDetailModalOpen: s.isPeriodDetailModalOpen, setIsPeriodDetailModalOpen,
    selectedDetailPeriod: s.selectedDetailPeriod, setSelectedDetailPeriod,
    isMatchEditModalOpen: s.isMatchEditModalOpen, setIsMatchEditModalOpen,
    selectedEditMatch: s.selectedEditMatch, setSelectedEditMatch,
    isMatchDetailModalOpen: s.isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    selectedDetailMatch: s.selectedDetailMatch, setSelectedDetailMatch,
    isMatchCreateModalOpen: s.isMatchCreateModalOpen, setIsMatchCreateModalOpen,
    isMembershipDetailModalOpen: s.isMembershipDetailModalOpen, setIsMembershipDetailModalOpen,
    selectedMembershipDetail: s.selectedMembershipDetail, setSelectedMembershipDetail,
    isMembershipEditModalOpen: s.isMembershipEditModalOpen, setIsMembershipEditModalOpen,
    selectedMembershipEdit: s.selectedMembershipEdit, setSelectedMembershipEdit,
    isAddMemberOpen: s.isAddMemberOpen, setIsAddMemberOpen,
  };
}

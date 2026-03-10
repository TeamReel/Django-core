/**
 * State management for useCompetitionDetailData hook
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSeasonContext } from '../../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../../types/season';
import type { Activity } from '../../../types/api/activity';
import type { PeriodEditRef, MatchRef, MemberRef } from '../useCompetitionMutations';

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

  // ── Local shadow state synced from provider ────────────────────────
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { if (!providerLoading) setLoading(false); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

  // ── Domain state ───────────────────────────────────────────────────
  const [competition, setCompetition] = useState<Period | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<Record<string, unknown> | null>(null);
  const [resolvedCompetitionId, setResolvedCompetitionId] = useState<string>('');
  const [competitionsForSwitcher, setCompetitionsForSwitcher] = useState<Period[]>(providerCompetitions);
  const [matches, setMatches] = useState<Activity[]>([]);
  const [members, setMembers] = useState<MemberRef[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [matchMediaMap, setMatchMediaMap] = useState<Record<string, Record<string, unknown>[]>>({});
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});
  const [hierarchySearch, setHierarchySearch] = useState('');

  useEffect(() => { setCompetitionsForSwitcher(providerCompetitions); }, [providerCompetitions]);

  // ── Modal state ────────────────────────────────────────────────────
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<PeriodEditRef | null>(null);
  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<Period | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<MatchRef | null>(null);
  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<Activity | null>(null);
  const [isMatchCreateModalOpen, setIsMatchCreateModalOpen] = useState(false);
  const [isMembershipDetailModalOpen, setIsMembershipDetailModalOpen] = useState(false);
  const [selectedMembershipDetail, setSelectedMembershipDetail] = useState<MemberRef | null>(null);
  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembershipEdit, setSelectedMembershipEdit] = useState<MemberRef | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

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
    org, project, club, season, competition, setCompetition,
    resolvedSeasonId, resolvedCompetitionId, setResolvedCompetitionId,
    competitionsForSwitcher,
    // Loading
    loading, setLoading, error, setError,
    // Domain state
    activatingContext, setActivatingContext,
    activeContext, setActiveContextState,
    matches, setMatches,
    members, setMembers,
    matchesLoading, setMatchesLoading,
    membersLoading, setMembersLoading,
    matchMediaMap, setMatchMediaMap,
    matchMediaLoading, setMatchMediaLoading,
    opponentClubNames, setOpponentClubNames,
    hierarchySearch, setHierarchySearch,
    // Modals
    isPeriodEditModalOpen, setIsPeriodEditModalOpen,
    selectedEditPeriod, setSelectedEditPeriod,
    isPeriodDetailModalOpen, setIsPeriodDetailModalOpen,
    selectedDetailPeriod, setSelectedDetailPeriod,
    isMatchEditModalOpen, setIsMatchEditModalOpen,
    selectedEditMatch, setSelectedEditMatch,
    isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    selectedDetailMatch, setSelectedDetailMatch,
    isMatchCreateModalOpen, setIsMatchCreateModalOpen,
    isMembershipDetailModalOpen, setIsMembershipDetailModalOpen,
    selectedMembershipDetail, setSelectedMembershipDetail,
    isMembershipEditModalOpen, setIsMembershipEditModalOpen,
    selectedMembershipEdit, setSelectedMembershipEdit,
    isAddMemberOpen, setIsAddMemberOpen,
  };
}

/**
 * Types for useCompetitionDetailData hook
 */
import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction, Location } from 'react-router-dom';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../../types/season';
import type { Activity } from '../../../types/api/activity';
import type { PeriodEditRef, MatchRef, MemberRef, CreateMatchPayload } from '../useCompetitionMutations';

/** Teamreel-specific match metadata nested under activity.metadata. */
export interface MatchContext {
  opponent_club_id?: string;
  home_club_name?: string;
  away_club_name?: string;
  away_team_name?: string;
}

export interface MatchMetadata {
  teamreel?: { match_context?: MatchContext };
}

export interface UseCompetitionDetailDataReturn {
  // Navigation
  navigate: NavigateFunction;
  location: Location;
  // Season context pass-through
  isTeamRoute: boolean;
  isOrgRoute: boolean;
  orgSlugOrId: string;
  clubSlugOrId: string;
  projectSlugOrId: string;
  seasonsBasePath: string;
  isSuperAdmin: boolean;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  // Resolved entities
  org: Organisation | null;
  project: Project | null;
  club: Project | null;
  season: Period | null;
  competition: Period | null;
  resolvedSeasonId: string;
  resolvedCompetitionId: string;
  // Loading
  loading: boolean;
  error: string | null;
  // Computed
  activeTab: string;
  seasonKeyOrId: string;
  competitionKeyOrId: string;
  competitionBasePath: string;
  navigateToTab: (tabId: string) => void;
  competitionMatchesCount: number;
  // Matches
  matches: Activity[];
  matchesLoading: boolean;
  filteredMatches: Activity[];
  matchDisplayTitle: (match: Activity, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  matchMediaMap: Record<string, Record<string, unknown>[]>;
  matchMediaLoading: boolean;
  // Members
  members: MemberRef[];
  membersLoading: boolean;
  // Hierarchy search
  hierarchySearch: string;
  setHierarchySearch: Dispatch<SetStateAction<string>>;
  // Active context
  activeContext: Record<string, unknown> | null;
  activatingContext: boolean;
  // Modal state
  isPeriodEditModalOpen: boolean;
  setIsPeriodEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEditPeriod: PeriodEditRef | null;
  setSelectedEditPeriod: Dispatch<SetStateAction<PeriodEditRef | null>>;
  isPeriodDetailModalOpen: boolean;
  setIsPeriodDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedDetailPeriod: Period | null;
  setSelectedDetailPeriod: Dispatch<SetStateAction<Period | null>>;
  isMatchEditModalOpen: boolean;
  setIsMatchEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedEditMatch: MatchRef | null;
  setSelectedEditMatch: Dispatch<SetStateAction<MatchRef | null>>;
  isMatchDetailModalOpen: boolean;
  setIsMatchDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedDetailMatch: Activity | null;
  setSelectedDetailMatch: Dispatch<SetStateAction<Activity | null>>;
  isMatchCreateModalOpen: boolean;
  setIsMatchCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  isMembershipDetailModalOpen: boolean;
  setIsMembershipDetailModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedMembershipDetail: MemberRef | null;
  setSelectedMembershipDetail: Dispatch<SetStateAction<MemberRef | null>>;
  isMembershipEditModalOpen: boolean;
  setIsMembershipEditModalOpen: Dispatch<SetStateAction<boolean>>;
  selectedMembershipEdit: MemberRef | null;
  setSelectedMembershipEdit: Dispatch<SetStateAction<MemberRef | null>>;
  isAddMemberOpen: boolean;
  setIsAddMemberOpen: Dispatch<SetStateAction<boolean>>;
  // Mutations (from useCompetitionMutations)
  savePeriodEdits: (periodToEdit: PeriodEditRef, patch: Record<string, unknown>) => Promise<void>;
  saveMatchEdits: (matchToEdit: MatchRef, patch: Record<string, unknown>) => Promise<void>;
  deleteMembership: (membership: MemberRef) => Promise<void>;
  saveMembershipRole: (membership: MemberRef, role: string) => Promise<void>;
  updateFunctionalRoles: (membership: MemberRef, nextRoles: string[]) => Promise<void>;
  deleteCompetition: () => Promise<void>;
  createMatchInCompetition: (payload: CreateMatchPayload) => Promise<void>;
  activateCompetitionContext: () => Promise<void>;
  refreshMembers: () => void;
  getCsrfToken: () => string;
  activateContext: () => Promise<void>;
  setCompetition: Dispatch<SetStateAction<Period | null>>;
  setMatches: Dispatch<SetStateAction<Activity[]>>;
  setMembers: Dispatch<SetStateAction<MemberRef[]>>;
}

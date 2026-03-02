/**
 * Type definitions for useOrgData hook.
 * Extracted from useOrgData.ts during Phase 21 refactor.
 */

import type { useNavigate, useLocation } from 'react-router-dom';
import type { Organisation, User, Project } from '../../types';

/* ------------------------------------------------------------------
 *  Modal state bundle
 * ---------------------------------------------------------------- */

export interface OrgModalState {
  selectedClub: Project | null;
  setSelectedClub: (v: Project | null) => void;
  isClubModalOpen: boolean;
  setIsClubModalOpen: (v: boolean) => void;
  detailProject: Project | null;
  setDetailProject: (v: Project | null) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (v: boolean) => void;
  selectedEditProject: Project | null;
  setSelectedEditProject: (v: Project | null) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (v: boolean) => void;
  isCreateClubModalOpen: boolean;
  setIsCreateClubModalOpen: (v: boolean) => void;
  isCreateTeamModalOpen: boolean;
  setIsCreateTeamModalOpen: (v: boolean) => void;
  isAddMemberModalOpen: boolean;
  setIsAddMemberModalOpen: (v: boolean) => void;
  isCreateSeasonModalOpen: boolean;
  setIsCreateSeasonModalOpen: (v: boolean) => void;
  isCreateCompetitionModalOpen: boolean;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  isCreateMatchModalOpen: boolean;
  setIsCreateMatchModalOpen: (v: boolean) => void;
  isEditMemberRoleModalOpen: boolean;
  setIsEditMemberRoleModalOpen: (v: boolean) => void;
  editingMember: any;
  setEditingMember: (v: any) => void;
  isOrgDetailModalOpen: boolean;
  setIsOrgDetailModalOpen: (v: boolean) => void;
  isOrgEditModalOpen: boolean;
  setIsOrgEditModalOpen: (v: boolean) => void;
  detailUser: any;
  setDetailUser: (v: any) => void;
  isUserDetailModalOpen: boolean;
  setIsUserDetailModalOpen: (v: boolean) => void;
}

/* ------------------------------------------------------------------
 *  Filter / search state bundle
 * ---------------------------------------------------------------- */

export interface OrgFilterState {
  /* member filters */
  memberSearch: string;
  setMemberSearch: (v: string) => void;
  userRoleFilter: string;
  setUserRoleFilter: (v: string) => void;
  userClubFilterId: string;
  setUserClubFilterId: (v: string) => void;
  userTeamFilterId: string;
  setUserTeamFilterId: (v: string) => void;
  usersPage: number;
  setUsersPage: (v: number) => void;
  usersPageSize: number;

  /* team filters */
  teamSearch: string;
  setTeamSearch: (v: string) => void;
  teamStatusFilter: 'all' | 'active' | 'inactive';
  setTeamStatusFilter: (v: 'all' | 'active' | 'inactive') => void;
  teamClubFilterId: string;
  setTeamClubFilterId: (v: string) => void;

  /* club filters */
  clubSearch: string;
  setClubSearch: (v: string) => void;
  clubStatusFilter: 'all' | 'active' | 'inactive';
  setClubStatusFilter: (v: 'all' | 'active' | 'inactive') => void;

  /* season filters */
  seasonSearch: string;
  setSeasonSearch: (v: string) => void;
  seasonClubFilterId: string;
  setSeasonClubFilterId: (v: string) => void;
  seasonTeamFilterId: string;
  setSeasonTeamFilterId: (v: string) => void;

  /* competition filters */
  competitionSearch: string;
  setCompetitionSearch: (v: string) => void;
  compClubFilterId: string;
  setCompClubFilterId: (v: string) => void;
  compTeamFilterId: string;
  setCompTeamFilterId: (v: string) => void;
  compSeasonFilterId: string;
  setCompSeasonFilterId: (v: string) => void;
  compMatchesFilter: 'all' | 'with' | 'without';
  setCompMatchesFilter: (v: 'all' | 'with' | 'without') => void;

  /* match filters */
  matchSearch: string;
  setMatchSearch: (v: string) => void;
  matchClubFilterId: string;
  setMatchClubFilterId: (v: string) => void;
  matchTeamFilterId: string;
  setMatchTeamFilterId: (v: string) => void;
  matchSeasonFilterId: string;
  setMatchSeasonFilterId: (v: string) => void;
  matchCompFilterId: string;
  setMatchCompFilterId: (v: string) => void;

  /* hierarchy */
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;
}

/* ------------------------------------------------------------------
 *  Full return type  (composes modal + filter bundles)
 * ---------------------------------------------------------------- */

export interface OrgDataReturn extends OrgModalState, OrgFilterState {
  /* --- route / identity ----------------------------------------- */
  id: string | undefined;
  org: Organisation | null;
  resolvedOrg: any;
  currentOrgSlug: string | undefined;
  currentOrgId: string | undefined;
  orgSlugOrId: string;
  loading: boolean;
  error: string | null;

  /* --- navigation / tab ----------------------------------------- */
  navigate: ReturnType<typeof useNavigate>;
  location: ReturnType<typeof useLocation>;
  activeTab: string;
  tabs: { id: string; label: string }[];
  visibleTabs: { id: string; label: string }[];
  makeTabHref: (tabId: string) => string;

  /* --- active context ------------------------------------------- */
  activatingContext: boolean;
  activeContext: any;
  handleActivateContext: () => Promise<void>;

  /* --- members -------------------------------------------------- */
  members: User[];
  membersLoading: boolean;
  fetchMembers: (force?: boolean) => Promise<void>;
  membershipUserCounts: { clubUsersCountById: Record<string, number>; teamUsersCountById: Record<string, number> };

  /* --- clubs ---------------------------------------------------- */
  clubs: Project[];
  clubsCount: number;
  clubsPage: number;
  setClubsPage: (v: number) => void;
  clubsPageSize: number;
  clubsLoading: boolean;
  allClubsForTeams: Project[];
  clubsForHierarchy: any[];

  /* --- teams ---------------------------------------------------- */
  teams: Project[];
  teamsCount: number | null;
  teamsLoading: boolean;

  /* --- periods / counts ----------------------------------------- */
  orgPeriods: any[];
  orgPeriodsLoading: boolean;
  seasonsCount: number | null;
  competitionsCount: number | null;
  matchesCount: number | null;
  teamSeasonsCountById: Record<string, number>;
  teamCompetitionsCountById: Record<string, number>;
  teamMatchesCountById: Record<string, number>;

  /* --- federation matches --------------------------------------- */
  federationMatches: any[];
  federationMatchesLoading: boolean;
  scheduledMatches: any[];
  scheduledMatchesLoading: boolean;
  recentPlayedMatches: any[];
  recentPlayedMatchesLoading: boolean;

  /* --- inline edit ---------------------------------------------- */
  isEditMode: boolean;
  editName: string;
  setEditName: (v: string) => void;
  editType: string;
  setEditType: (v: string) => void;
  editCountry: string;
  setEditCountry: (v: string) => void;
  saving: boolean;
  handleEdit: () => void;
  handleCancelEdit: () => void;
  handleSaveEdit: () => Promise<void>;
  saveOrganisationEdits: (orgData: Partial<Organisation> & { sport_id?: string | null }) => Promise<void>;
  saveProjectEdits: (project: Project, patch: Partial<Project>) => Promise<void>;

  /* --- invite / delete ------------------------------------------ */
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: 'admin' | 'member';
  setInviteRole: (v: 'admin' | 'member') => void;
  inviteLoading: boolean;
  handleInvite: (e: React.FormEvent) => Promise<void>;
  deleteLoading: boolean;
  handleDelete: () => Promise<void>;

  /* --- permissions ---------------------------------------------- */
  isSuperAdmin: boolean;
  permissionContext: any;
  userCanEditOrg: boolean;
  userCanDeleteOrg: boolean;
  userCanInvite: boolean;
  userCanManageMembers: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;

  /* --- breadcrumb ----------------------------------------------- */
  organisationOptions: any[];
  handleOrganisationSwitch: (option: { id: string; label: string; slug?: string }) => void;

  /* --- create modal helpers ------------------------------------- */
  createModalOrganisations: any[];
  createModalClubs: any[];
  orgIdForDirectoryLists: string;

  /* --- misc functions ------------------------------------------- */
  getBestMatchDetailPath: (m: any) => string;
  getApiV1BaseUrl: () => string;
  getCsrfToken: () => string;
  fetchClubsPage: (page: number) => Promise<void>;
  fetchTeamsForOrg: (opts?: { force?: boolean }) => Promise<void>;
  setOrg: (org: Organisation | null) => void;
  setClubs: React.Dispatch<React.SetStateAction<Project[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setAllClubsForTeams: React.Dispatch<React.SetStateAction<Project[]>>;
  setClubsCount: React.Dispatch<React.SetStateAction<number>>;
  setOrgPeriods: React.Dispatch<React.SetStateAction<any[]>>;
  setMembers: React.Dispatch<React.SetStateAction<User[]>>;
  setFederationMatches: React.Dispatch<React.SetStateAction<any[]>>;
  setMatchesCount: React.Dispatch<React.SetStateAction<number | null>>;
  setTeamsCount: React.Dispatch<React.SetStateAction<number | null>>;
  recomputePeriodCounts: (allPeriods: any[]) => void;
  fetchFederationCounts: (organisationId: string) => Promise<void>;
  getRecursiveMatchesCount: (p: any) => number;
}

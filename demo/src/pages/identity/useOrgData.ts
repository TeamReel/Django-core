import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { Organisation, User, Project } from '../../types';
import {
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
  canEditProject,
  canDeleteProject,
} from '../../utils/permissions';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { periodPathKey } from '../../utils/periodPath';
import { getApiBaseUrl } from '../../utils/apiBase';
import { parseListEnvelope, isSeasonPeriod, isCompetitionPeriod } from './orgDetailUtils';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface OrgDataReturn {
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
  membershipUserCounts: { clubUsersCountById: Record<string, number>; teamUsersCountById: Record<string, number> };

  /* --- clubs ---------------------------------------------------- */
  clubs: Project[];
  clubsCount: number;
  clubsPage: number;
  setClubsPage: (v: number) => void;
  clubsPageSize: number;
  clubsLoading: boolean;
  allClubsForTeams: Project[];
  clubSearch: string;
  setClubSearch: (v: string) => void;
  clubStatusFilter: 'all' | 'active' | 'inactive';
  setClubStatusFilter: (v: 'all' | 'active' | 'inactive') => void;
  clubsForHierarchy: any[];

  /* --- teams ---------------------------------------------------- */
  teams: Project[];
  teamsCount: number | null;
  teamsLoading: boolean;
  teamSearch: string;
  setTeamSearch: (v: string) => void;
  teamStatusFilter: 'all' | 'active' | 'inactive';
  setTeamStatusFilter: (v: 'all' | 'active' | 'inactive') => void;
  teamClubFilterId: string;
  setTeamClubFilterId: (v: string) => void;

  /* --- periods / counts ----------------------------------------- */
  orgPeriods: any[];
  orgPeriodsLoading: boolean;
  seasonsCount: number | null;
  competitionsCount: number | null;
  matchesCount: number | null;
  teamSeasonsCountById: Record<string, number>;
  teamCompetitionsCountById: Record<string, number>;
  teamMatchesCountById: Record<string, number>;

  /* --- season filters ------------------------------------------- */
  seasonSearch: string;
  setSeasonSearch: (v: string) => void;
  seasonClubFilterId: string;
  setSeasonClubFilterId: (v: string) => void;
  seasonTeamFilterId: string;
  setSeasonTeamFilterId: (v: string) => void;

  /* --- competition filters -------------------------------------- */
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

  /* --- match filters -------------------------------------------- */
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

  /* --- federation matches --------------------------------------- */
  federationMatches: any[];
  federationMatchesLoading: boolean;
  scheduledMatches: any[];
  scheduledMatchesLoading: boolean;
  recentPlayedMatches: any[];
  recentPlayedMatchesLoading: boolean;

  /* --- hierarchy ------------------------------------------------ */
  hierarchySearch: string;
  setHierarchySearch: (v: string) => void;

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

  /* --- modals --------------------------------------------------- */
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

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function useOrgData(): OrgDataReturn {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();

  /* ---------- core state ---------------------------------------- */
  const [org, setOrg] = useState<Organisation | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContextState, setActiveContextState] = useState<any | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [clubs, setClubs] = useState<Project[]>([]);
  const [clubsCount, setClubsCount] = useState(0);
  const [clubsPage, setClubsPage] = useState(1);
  const clubsPageSize = 25;
  const [clubsLoading, setClubsLoading] = useState(false);

  const [teams, setTeams] = useState<Project[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [allClubsForTeams, setAllClubsForTeams] = useState<Project[]>([]);

  const teamsFetchedForOrgRef = useRef<string>('');
  const teamsFetchInFlightRef = useRef(false);
  const orgPeriodsFetchInFlightRef = useRef(false);

  const [orgPeriods, setOrgPeriods] = useState<any[]>([]);
  const [orgPeriodsLoading, setOrgPeriodsLoading] = useState(false);
  const [teamSeasonsCountById, setTeamSeasonsCountById] = useState<Record<string, number>>({});
  const [teamCompetitionsCountById, setTeamCompetitionsCountById] = useState<Record<string, number>>({});
  const [teamMatchesCountById, setTeamMatchesCountById] = useState<Record<string, number>>({});

  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);
  const [competitionsCount, setCompetitionsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [teamsCount, setTeamsCount] = useState<number | null>(null);

  /* ---------- modal state --------------------------------------- */
  const [selectedClub, setSelectedClub] = useState<Project | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateClubModalOpen, setIsCreateClubModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);

  const [isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  /* ---------- filter state -------------------------------------- */
  const [memberSearch, setMemberSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userClubFilterId, setUserClubFilterId] = useState<string>('');
  const [userTeamFilterId, setUserTeamFilterId] = useState<string>('');
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 25;

  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [teamClubFilterId, setTeamClubFilterId] = useState<string>('');

  const [clubSearch, setClubSearch] = useState('');
  const [clubStatusFilter, setClubStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [seasonSearch, setSeasonSearch] = useState('');
  const [seasonClubFilterId, setSeasonClubFilterId] = useState<string>('');
  const [seasonTeamFilterId, setSeasonTeamFilterId] = useState<string>('');

  const [competitionSearch, setCompetitionSearch] = useState('');
  const [compClubFilterId, setCompClubFilterId] = useState<string>('');
  const [compTeamFilterId, setCompTeamFilterId] = useState<string>('');
  const [compSeasonFilterId, setCompSeasonFilterId] = useState<string>('');
  const [compMatchesFilter, setCompMatchesFilter] = useState<'all' | 'with' | 'without'>('all');

  const [matchSearch, setMatchSearch] = useState('');
  const [matchClubFilterId, setMatchClubFilterId] = useState<string>('');
  const [matchTeamFilterId, setMatchTeamFilterId] = useState<string>('');
  const [matchSeasonFilterId, setMatchSeasonFilterId] = useState<string>('');
  const [matchCompFilterId, setMatchCompFilterId] = useState<string>('');

  const [federationMatches, setFederationMatches] = useState<any[]>([]);
  const [federationMatchesLoading, setFederationMatchesLoading] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<any[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);

  const [hierarchySearch, setHierarchySearch] = useState('');

  /* ---------- inline edit state --------------------------------- */
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

  /* ---------- detail/view modals -------------------------------- */
  const [isOrgDetailModalOpen, setIsOrgDetailModalOpen] = useState(false);
  const [isOrgEditModalOpen, setIsOrgEditModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  /* ----------------------------------------------------------------
   *  Derived / memos
   * -------------------------------------------------------------- */

  const periodChildrenMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of orgPeriods) {
      const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
      if (parentId) {
        const key = String(parentId);
        const arr = map.get(key) || [];
        arr.push(p);
        map.set(key, arr);
      }
    }
    return map;
  }, [orgPeriods]);

  const getRecursiveMatchesCount = (p: any): number => {
    let count = p.activities_count ?? 0;
    const children = periodChildrenMap.get(String(p.id));
    if (children) {
      for (const child of children) {
        count += getRecursiveMatchesCount(child);
      }
    }
    return count;
  };

  const resolvedOrg = organisations.find(
    (o) => o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id,
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase();
  const currentOrgId = resolvedOrg?.id;

  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
    if (!raw) return 'overview';
    const allowed = new Set([
      'overview', 'hierarchy', 'clubs', 'teams', 'seasons', 'competitions',
      'matches', 'users', 'audit', 'governance', 'operations', 'identity', 'settings',
    ]);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const createModalOrganisations = useMemo(() => {
    const orgIdStr = String(currentOrgId || org?.id || '').trim();
    const orgName = String(org?.name || resolvedOrg?.name || '').trim();
    if (!orgIdStr || !orgName) return [];
    return [{ id: orgIdStr, name: orgName, slug: currentOrgSlug }];
  }, [currentOrgId, org?.id, org?.name, resolvedOrg?.name, currentOrgSlug]);

  const createModalClubs = useMemo(() => {
    const list = allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return (list || []) as any[];
  }, [allClubsForTeams, clubs]);

  const membershipUserCounts = useMemo(() => {
    const clubUserIdsByClubId = new Map<string, Set<string>>();
    const teamUserIdsByTeamId = new Map<string, Set<string>>();

    const teamToClubId = new Map<string, string>();
    for (const t of teams as any[]) {
      const teamId = String(t?.id ?? '').trim();
      if (!teamId) continue;
      const clubId = String(t?.parent_id ?? t?.parent ?? t?.parent_project ?? t?.parent_project_id ?? '').trim();
      if (clubId) teamToClubId.set(teamId, clubId);
    }

    const getOrCreateSet = (map: Map<string, Set<string>>, key: string) => {
      const existing = map.get(key);
      if (existing) return existing;
      const next = new Set<string>();
      map.set(key, next);
      return next;
    };

    for (const item of members as any[]) {
      const u = item?.user ?? item;
      const userId = String(u?.id ?? '').trim();
      if (!userId) continue;

      const raw =
        item?.project_memberships ??
        item?.project_membership_details ??
        item?.project_memberships_details ??
        [];
      const pms = Array.isArray(raw) ? raw : [];

      for (const pm of pms) {
        if (!pm) continue;
        const pmId = String(pm?.id ?? '');
        if (pmId.startsWith('pm:')) continue;

        const teamId = String(pm?.project_id ?? pm?.project?.id ?? '').trim();
        let clubId = String(
          pm?.club_id ??
            pm?.club?.id ??
            pm?.project?.parent_id ??
            pm?.project?.parent?.id ??
            pm?.project?.parent_project_id ??
            pm?.parent_project_id ??
            (typeof pm?.parent_project === 'object' ? pm?.parent_project?.id : pm?.parent_project) ??
            pm?.parent_id ??
            (typeof pm?.parent === 'object' ? pm?.parent?.id : pm?.parent) ??
            '',
        ).trim();

        if (!clubId && teamId) {
          clubId = String(teamToClubId.get(teamId) || '').trim();
        }

        if (clubId) getOrCreateSet(clubUserIdsByClubId, clubId).add(userId);
        if (teamId) getOrCreateSet(teamUserIdsByTeamId, teamId).add(userId);
      }
    }

    const clubUsersCountById: Record<string, number> = {};
    for (const [cId, userIds] of clubUserIdsByClubId.entries()) {
      clubUsersCountById[String(cId)] = userIds.size;
    }

    const teamUsersCountById: Record<string, number> = {};
    for (const [tId, userIds] of teamUserIdsByTeamId.entries()) {
      teamUsersCountById[String(tId)] = userIds.size;
    }

    return { clubUsersCountById, teamUsersCountById };
  }, [members, teams]);

  /* ---------- permissions --------------------------------------- */
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
  const permissionContext = {
    currentOrganisation: (org || resolvedOrg) as any,
    isSuperAdmin,
  };
  const userCanEditOrg = canEditOrganisation(permissionContext);
  const userCanDeleteOrg = canDeleteOrganisation(permissionContext);
  const userCanInvite = canInviteMembers(permissionContext);
  const userCanManageMembers = canManageMembers(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  /* ---------- breadcrumbs --------------------------------------- */
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = (option: { id: string; label: string; slug?: string }) => {
    navigate(`/${option.slug || option.id}${location.search || ''}`);
  };

  /* ---------- tabs ---------------------------------------------- */
  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'hierarchy', label: 'Hierarchy' },
      { id: 'clubs', label: 'Clubs' },
      { id: 'teams', label: 'Teams' },
      { id: 'seasons', label: 'Seasons' },
      { id: 'competitions', label: 'Competitions' },
      { id: 'matches', label: 'Matches' },
      { id: 'users', label: 'Members' },
      { id: 'audit', label: 'Audit' },
      { id: 'governance', label: 'Governance' },
      { id: 'operations', label: 'Operations (Admin)' },
      { id: 'settings', label: 'Settings' },
    ],
    [],
  );

  const visibleTabs = useMemo(() => {
    return tabs.filter((t) => {
      if (t.id === 'operations') return isSuperAdmin;
      if (t.id === 'audit' || t.id === 'governance') return Boolean(isSuperAdmin || userCanEditOrg);
      return true;
    });
  }, [tabs, isSuperAdmin, userCanEditOrg]);

  const orgIdForDirectoryLists = useMemo(() => {
    return String(currentOrgId || org?.id || '').trim();
  }, [currentOrgId, org?.id]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    if (!t || t === 'overview') params.delete('tab');
    else params.set('tab', t);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  const orgSlugOrId = String(org?.slug || org?.id || currentOrgSlug || '');

  /* ---------- helpers ------------------------------------------- */
  const getApiV1BaseUrl = () => {
    const raw = getApiBaseUrl();
    return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
  };

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';

  const getBestMatchDetailPath = (m: any): string => {
    const matchSlugOrId = String((m as any)?.slug || m?.id || '').trim();
    if (!matchSlugOrId) return '/matches';

    const orgSlug = String(currentOrgSlug || '').trim();
    if (!orgSlug) return `/matches/${matchSlugOrId}`;

    const clubById = new Map<string, any>();
    for (const c of clubs as any[]) {
      if (!c) continue;
      clubById.set(String(c.id), c);
    }

    const teamById = new Map<string, any>();
    for (const t of teams as any[]) {
      if (!t) continue;
      teamById.set(String(t.id), t);
    }

    const periodById = new Map<string, any>();
    for (const p of orgPeriods as any[]) {
      if (!p) continue;
      periodById.set(String(p.id), p);
    }

    const teamId = String(m?.project?.id ?? m?.project_id ?? '').trim();
    const team = teamId ? teamById.get(teamId) : null;
    const teamSlugOrId = String(team?.slug || team?.id || teamId || '').trim();

    const rawClubId = String(
      (team?.parent_id ?? team?.parent ?? team?.parent_project ?? team?.parent_project_id) ??
        (m?.project?.parent_id ?? m?.project?.parent?.id ?? m?.project?.parent_project_id) ??
        '',
    ).trim();
    const club = rawClubId ? clubById.get(rawClubId) : null;
    const clubSlugOrId = String(club?.slug || club?.id || rawClubId || '').trim();

    const periodId = String(m?.period?.id ?? m?.period_id ?? '').trim();
    const competition = periodId ? (periodById.get(periodId) || m?.period) : m?.period;
    const competitionKeyOrId = String(
      periodPathKey(competition) || (competition as any)?.slug || (competition as any)?.id || periodId || '',
    ).trim();
    const seasonId = String(
      (competition as any)?.parent_period_id ?? (competition as any)?.parent_period?.id ?? '',
    ).trim();
    const season = seasonId ? periodById.get(seasonId) : (competition as any)?.parent_period;
    const seasonKeyOrId = String(
      periodPathKey(season) || (season as any)?.slug || (season as any)?.id || seasonId || '',
    ).trim();

    if (orgSlug && clubSlugOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId) {
      return `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchSlugOrId}`;
    }

    return `/matches/${matchSlugOrId}`;
  };

  const clubsForHierarchy = useMemo(() => {
    const list = allClubsForTeams && allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
    return Array.isArray(list) ? list : [];
  }, [allClubsForTeams, clubs]);

  /* ----------------------------------------------------------------
   *  Fetch functions
   * -------------------------------------------------------------- */

  const fetchFederationMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setFederationMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '50');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', '-start_time');

      const all = await fetchAllPages<any>(
        `${apiV1BaseUrl}/activities/?${params.toString()}`,
        { credentials: 'include' },
        { ttlMs: 30_000, cacheKey: `GET:activities:federation:matches:${organisationId}`, maxItems: 250 },
      );

      setFederationMatches(Array.isArray(all) ? all : []);
    } catch (e) {
      console.error(e);
      setFederationMatches([]);
    } finally {
      setFederationMatchesLoading(false);
    }
  };

  const fetchScheduledMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setScheduledMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '5');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', 'start_time');
      params.set('start_time__gte', new Date().toISOString());

      const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setScheduledMatches(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScheduledMatchesLoading(false);
    }
  };

  const fetchRecentPlayedMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setRecentPlayedMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      params.set('page_size', '5');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', '-start_time');
      params.set('start_time__lt', new Date().toISOString());

      const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        const { results } = parseListEnvelope(json);
        setRecentPlayedMatches(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecentPlayedMatchesLoading(false);
    }
  };

  const fetchClubsPage = async (page: number) => {
    if (!currentOrgSlug) return;
    setClubsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const url = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page=${page}&page_size=${clubsPageSize}&parent_project__isnull=true`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': String(org?.id || currentOrgId || ''),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch clubs (${res.status})`);
      const json = await res.json();
      const { results, count } = parseListEnvelope(json);

      const clubsOnly = results.filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      setClubs(clubsOnly);
      setClubsCount(count);
    } catch (e) {
      console.error(e);
      setClubs([]);
      setClubsCount(0);
    } finally {
      setClubsLoading(false);
    }
  };

  const fetchTeamsForOrg = async ({ force = false }: { force?: boolean } = {}) => {
    if (!currentOrgSlug) return;
    if (!force && teamsFetchedForOrgRef.current === currentOrgSlug && teams.length > 0) return;
    if (teamsFetchInFlightRef.current) return;
    teamsFetchInFlightRef.current = true;
    if (DEBUG_LOGS) {
      console.log('[OrganisationDetailPage] fetchTeamsForOrg starting', {
        currentOrgSlug,
        orgId: org?.id || currentOrgId,
      });
    }
    setTeamsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const clubsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;

      if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Fetching teams from', teamsUrl);

      const [clubsAll, teamsAll] = await Promise.all([
        fetchAllPages<Project>(clubsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(org?.id || currentOrgId || ''),
          },
          credentials: 'include',
        }),
        fetchAllPages<Project>(teamsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(org?.id || currentOrgId || ''),
          },
          credentials: 'include',
        }),
      ]);

      const clubsOnly = (clubsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      const teamsOnly = (teamsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return Boolean(parentId);
      });

      if (DEBUG_LOGS) {
        console.log('[OrganisationDetailPage] Teams loaded:', teamsOnly.length, 'Clubs loaded:', clubsOnly.length);
      }
      setAllClubsForTeams(clubsOnly);
      setTeams(teamsOnly);
      teamsFetchedForOrgRef.current = currentOrgSlug;
    } catch (e) {
      console.error(e);
      setTeams([]);
      setAllClubsForTeams([]);
    } finally {
      setTeamsLoading(false);
      teamsFetchInFlightRef.current = false;
    }
  };

  const recomputePeriodCounts = (allPeriods: any[]) => {
    const seasonsByProjectId: Record<string, number> = {};
    const competitionsByProjectId: Record<string, number> = {};
    const matchesByProjectId: Record<string, number> = {};

    const childrenMap = new Map<string, any[]>();
    for (const p of allPeriods || []) {
      const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
      if (!parentId) continue;
      const key = String(parentId);
      const arr = childrenMap.get(key) || [];
      arr.push(p);
      childrenMap.set(key, arr);
    }

    const getRecursiveActivitiesCount = (p: any): number => {
      let count = p?.activities_count ?? 0;
      const children = childrenMap.get(String(p?.id));
      if (children) {
        for (const child of children) {
          count += getRecursiveActivitiesCount(child);
        }
      }
      return count;
    };

    const seasons = allPeriods.filter((p: any) => {
      const isSeason = isSeasonPeriod(p);
      if (isSeason) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) {
          const key = String(projectId);
          seasonsByProjectId[key] = (seasonsByProjectId[key] || 0) + 1;
        }
      }
      return isSeason;
    });

    const competitions = allPeriods.filter((p: any) => {
      const isCompetition = isCompetitionPeriod(p);
      if (isCompetition) {
        const projectId = p.project_id ?? p.project?.id ?? null;
        if (projectId) {
          const key = String(projectId);
          competitionsByProjectId[key] = (competitionsByProjectId[key] || 0) + 1;
          matchesByProjectId[key] = (matchesByProjectId[key] || 0) + getRecursiveActivitiesCount(p);
        }
      }
      return isCompetition;
    });

    setSeasonsCount(seasons.length);
    setCompetitionsCount(competitions.length);
    setTeamSeasonsCountById(seasonsByProjectId);
    setTeamCompetitionsCountById(competitionsByProjectId);
    setTeamMatchesCountById(matchesByProjectId);
  };

  const ensureOrgPeriodsLoaded = async () => {
    if (DEBUG_LOGS) {
      console.log('[OrganisationDetailPage] ensureOrgPeriodsLoaded called', {
        teamsCount: teams.length,
        orgPeriodsCount: orgPeriods.length,
        loading: orgPeriodsLoading,
      });
    }
    if (orgPeriodsFetchInFlightRef.current) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;

    if (!teams || teams.length === 0) {
      if (!teamsLoading && currentOrgSlug) {
        void fetchTeamsForOrg({ force: true });
      }
      return;
    }

    orgPeriodsFetchInFlightRef.current = true;
    setOrgPeriodsLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    try {
      const unique = new Map<string, any>();
      const chunkSize = 6;
      const teamChunks = [];
      for (let i = 0; i < teams.length; i += chunkSize) {
        teamChunks.push(teams.slice(i, i + chunkSize));
      }

      if (DEBUG_LOGS) {
        console.log(
          `[OrganisationDetailPage] Fetching periods for ${teams.length} teams in ${teamChunks.length} chunks`,
        );
      }

      for (const chunk of teamChunks) {
        await Promise.all(
          chunk.map(async (t: any) => {
            const teamId = t?.id;
            if (!teamId) return;
            const params = new URLSearchParams();
            params.set('page_size', '250');
            params.set('project_id', String(teamId));

            try {
              const url = `${apiV1BaseUrl}/periods/?${params.toString()}`;
              const periods = await fetchAllPages<any>(url, { credentials: 'include' });
              for (const p of periods || []) {
                if (!p?.id) continue;
                unique.set(String(p.id), p);
              }
            } catch (e) {
              console.warn(`Failed to fetch periods for team ${teamId}`, e);
            }
          }),
        );
      }

      if (DEBUG_LOGS) {
        console.log('[OrganisationDetailPage] Total unique periods fetched via teams:', unique.size);
      }

      const merged = Array.from(unique.values());
      setOrgPeriods(merged);
      recomputePeriodCounts(merged);
    } catch (e) {
      console.warn('[OrganisationDetailPage] Failed to load periods via team scope', e);
    } finally {
      setOrgPeriodsLoading(false);
      orgPeriodsFetchInFlightRef.current = false;
    }
  };

  const fetchFederationCounts = async (organisationId: string) => {
    if (!organisationId) return;
    const apiV1BaseUrl = getApiV1BaseUrl();

    try {
      if (currentOrgSlug) {
        const teamsRes = await fetch(
          `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=1&parent_project__isnull=false`,
          { credentials: 'include' },
        );
        if (teamsRes.ok) {
          const json = await teamsRes.json();
          const { count } = parseListEnvelope(json);
          setTeamsCount(count);
        }
      }

      {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', organisationId);

        const allPeriods = await fetchAllPages<any>(`${apiV1BaseUrl}/periods/?${params.toString()}`, {
          credentials: 'include',
        });

        const list = Array.isArray(allPeriods) ? allPeriods : [];
        setOrgPeriods(list);
        if (list.length > 0) {
          recomputePeriodCounts(list);
        } else {
          void fetchTeamsForOrg({ force: true });
        }
      }

      {
        const params = new URLSearchParams();
        params.set('page_size', '1');
        params.set('activity_type', 'match');
        params.set('organisation_id', organisationId);
        const res = await fetch(`${apiV1BaseUrl}/activities/?${params.toString()}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const { count } = parseListEnvelope(json);
          setMatchesCount(count);
        }
      }
    } catch (e) {
      console.warn('[OrganisationDetailPage] Failed to fetch counts', e);
    }

    if (!orgPeriodsLoading && orgPeriods.length === 0) {
      void ensureOrgPeriodsLoaded();
    }
  };

  const fetchMembers = async (force = false) => {
    if (membersLoading) return;
    const haveMembershipDetails = members.some((item: any) => {
      const u = item?.user || item;
      const details =
        (item as any)?.project_membership_details ||
        (u as any)?.project_membership_details ||
        (item as any)?.project_memberships_details ||
        (u as any)?.project_memberships_details;
      return Array.isArray(details);
    });
    if (!force && members.length > 0 && haveMembershipDetails) return;
    if (!org?.id && !currentOrgId) return;

    setMembersLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(org?.id || currentOrgId);

    try {
      const params = new URLSearchParams();
      params.set('include_project_memberships', 'true');
      params.set('include_role_assignments', 'true');
      params.set('include_project_membership_details', 'true');
      params.set('page_size', '250');

      const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
      const allMembers = await fetchAllPages<any>(
        membersUrl,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': orgId,
          },
          credentials: 'include',
        },
        force ? { bypass: true } : { ttlMs: 5 * 60_000 },
      );
      console.log('[OrganisationDetailPage] Members loaded:', allMembers.length);
      setMembers(allMembers);
    } catch (e) {
      console.error('[OrganisationDetailPage] Members fetch failed:', e);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  /* ----------------------------------------------------------------
   *  Handlers
   * -------------------------------------------------------------- */

  const handleActivateContext = async () => {
    try {
      setActivatingContext(true);
      await setActiveContext('organisation', String((org as any)?.slug || (org as any)?.id || ''));
      const context = await getActiveContext();
      setActiveContextState(context);
    } finally {
      setActivatingContext(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();

      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.email?.[0] || data.detail || 'Failed to invite member');
      }

      try {
        const params = new URLSearchParams();
        params.set('include_project_memberships', 'true');
        params.set('include_role_assignments', 'true');
        params.set('include_project_membership_details', 'true');
        params.set('page_size', '250');
        const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
        const allMembers = await fetchAllPages<any>(
          membersUrl,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(org?.id || currentOrgId || ''),
            },
            credentials: 'include',
          },
          { bypass: true },
        );
        setMembers(allMembers);
      } catch {
        // ignore
      }

      setInviteEmail('');
      alert('Member added successfully');
    } catch (err) {
      console.error('Invite error:', err);
      alert(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this organisation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete organisation (${response.status})`);
      }

      navigate('/federations');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete organisation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = () => {
    setEditName(org?.name || '');
    setEditType(org?.metadata?.type || '');
    setEditCountry(org?.metadata?.country || '');
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditName('');
    setEditType('');
    setEditCountry('');
  };

  const handleSaveEdit = async () => {
    if (!org || !editName.trim()) {
      alert('Organisation name is required');
      return;
    }

    try {
      setSaving(true);
      const apiV1BaseUrl = getApiV1BaseUrl();
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          metadata: {
            ...org.metadata,
            type: editType.trim(),
            country: editCountry.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update organisation (${response.status})`);
      }

      const updatedOrg = await response.json();
      setOrg(updatedOrg);
      setIsEditMode(false);
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  const saveOrganisationEdits = async (orgData: Partial<Organisation> & { sport_id?: string | null }) => {
    if (!org) throw new Error('Missing organisation');

    const apiV1BaseUrl = getApiV1BaseUrl();
    const patch: any = { ...orgData };
    delete patch.slug;
    delete patch.sport;

    const response = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Failed to update organisation (${response.status})`);
    }

    const raw = await response.json().catch(() => null);
    const updatedOrg = (raw as any)?.data || raw;
    if (updatedOrg) setOrg(updatedOrg);

    invalidateFetchAllPagesCache();
    try {
      const refreshedRes = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (refreshedRes.ok) {
        const refreshedRaw = await refreshedRes.json().catch(() => null);
        const refreshed = (refreshedRaw as any)?.data || refreshedRaw;
        if (refreshed) setOrg(refreshed);
      }
    } catch {
      // Best-effort
    }
  };

  const saveProjectEdits = async (project: Project, patch: Partial<Project>) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const projectSlugOrId = (project as any).slug || project.id;

    const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/${projectSlugOrId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      let msg = `Failed to save (${res.status})`;
      try {
        const data = await res.json();
        msg = data?.detail || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const json = await res.json();
    const updated = (json?.data || json) as any;

    setClubs((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setTeams((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setAllClubsForTeams((prev) =>
      prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)),
    );
  };

  /* ----------------------------------------------------------------
   *  Effects
   * -------------------------------------------------------------- */

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tab-based lazy data loading
  useEffect(() => {
    if (!currentOrgSlug) return;

    if (activeTab === 'clubs') {
      if (!clubsLoading && clubs.length === 0) {
        void fetchClubsPage(1);
      }
    }

    if (activeTab === 'teams') {
      if (!teamsLoading && teams.length === 0) {
        void fetchTeamsForOrg({ force: true });
      }
    }

    if (activeTab === 'hierarchy') {
      if (!teamsLoading && (teams.length === 0 || allClubsForTeams.length === 0)) {
        void fetchTeamsForOrg({ force: true });
      }
    }

    if (activeTab === 'users') {
      void fetchMembers(false);
    }

    if (activeTab === 'overview') {
      if (!clubsLoading && clubs.length === 0) {
        void fetchClubsPage(1);
      }
      if (!teamsLoading && teams.length === 0) {
        void fetchTeamsForOrg({ force: false });
      }
      if (!membersLoading && members.length === 0) {
        void fetchMembers(false);
      }
    }
  }, [activeTab, currentOrgSlug]);

  // Period loading for seasons/competitions/hierarchy tabs
  useEffect(() => {
    const shouldEnsurePeriods = activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'hierarchy';
    if (!shouldEnsurePeriods) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void ensureOrgPeriodsLoaded();
  }, [activeTab, orgPeriodsLoading, orgPeriods.length, teams.length, currentOrgSlug]);

  // Fetch org details
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!currentOrgSlug) return;

      try {
        setLoading(true);
        setError(null);

        const apiV1BaseUrl = getApiV1BaseUrl();

        const orgResponse = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        });

        if (!orgResponse.ok) {
          throw new Error(`Failed to fetch organisation (${orgResponse.status})`);
        }

        const rawOrgData = await orgResponse.json();
        const orgData = rawOrgData.data || rawOrgData;
        if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Org data loaded', orgData);
        setOrg(orgData);

        const organisationIdForCounts = String(orgData.id || currentOrgId || '');
        if (organisationIdForCounts) {
          fetchFederationCounts(organisationIdForCounts);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisation details');
        console.error('Org detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentOrgSlug) {
      fetchOrgDetails();
    }
  }, [currentOrgSlug, currentOrgId]);

  // Scheduled/recent matches + counts
  useEffect(() => {
    const orgId = String(org?.id || currentOrgId || '');
    if (orgId) {
      fetchScheduledMatches(orgId);
      fetchRecentPlayedMatches(orgId);
      if (!orgPeriodsLoading && orgPeriods.length === 0) {
        void fetchFederationCounts(orgId);
      }
    }
  }, [org?.id, currentOrgId]);

  // Hierarchy tab period loading
  useEffect(() => {
    if (activeTab !== 'hierarchy') return;
    const orgId = String(org?.id || currentOrgId || '').trim();
    if (!orgId) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void fetchFederationCounts(orgId);
  }, [activeTab, org?.id, currentOrgId, orgPeriodsLoading, orgPeriods.length]);

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    id,
    org,
    resolvedOrg,
    currentOrgSlug,
    currentOrgId,
    orgSlugOrId,
    loading,
    error,
    navigate,
    location,
    activeTab,
    tabs,
    visibleTabs,
    makeTabHref,
    activatingContext,
    activeContext: activeContextState,
    handleActivateContext,
    members,
    membersLoading,
    fetchMembers,
    memberSearch,
    setMemberSearch,
    userRoleFilter,
    setUserRoleFilter,
    userClubFilterId,
    setUserClubFilterId,
    userTeamFilterId,
    setUserTeamFilterId,
    usersPage,
    setUsersPage,
    usersPageSize,
    membershipUserCounts,
    clubs,
    clubsCount,
    clubsPage,
    setClubsPage,
    clubsPageSize,
    clubsLoading,
    allClubsForTeams,
    clubSearch,
    setClubSearch,
    clubStatusFilter,
    setClubStatusFilter,
    clubsForHierarchy,
    teams,
    teamsCount,
    teamsLoading,
    teamSearch,
    setTeamSearch,
    teamStatusFilter,
    setTeamStatusFilter,
    teamClubFilterId,
    setTeamClubFilterId,
    orgPeriods,
    orgPeriodsLoading,
    seasonsCount,
    competitionsCount,
    matchesCount,
    teamSeasonsCountById,
    teamCompetitionsCountById,
    teamMatchesCountById,
    seasonSearch,
    setSeasonSearch,
    seasonClubFilterId,
    setSeasonClubFilterId,
    seasonTeamFilterId,
    setSeasonTeamFilterId,
    competitionSearch,
    setCompetitionSearch,
    compClubFilterId,
    setCompClubFilterId,
    compTeamFilterId,
    setCompTeamFilterId,
    compSeasonFilterId,
    setCompSeasonFilterId,
    compMatchesFilter,
    setCompMatchesFilter,
    matchSearch,
    setMatchSearch,
    matchClubFilterId,
    setMatchClubFilterId,
    matchTeamFilterId,
    setMatchTeamFilterId,
    matchSeasonFilterId,
    setMatchSeasonFilterId,
    matchCompFilterId,
    setMatchCompFilterId,
    federationMatches,
    federationMatchesLoading,
    scheduledMatches,
    scheduledMatchesLoading,
    recentPlayedMatches,
    recentPlayedMatchesLoading,
    hierarchySearch,
    setHierarchySearch,
    isEditMode,
    editName,
    setEditName,
    editType,
    setEditType,
    editCountry,
    setEditCountry,
    saving,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    saveOrganisationEdits,
    saveProjectEdits,
    selectedClub,
    setSelectedClub,
    isClubModalOpen,
    setIsClubModalOpen,
    detailProject,
    setDetailProject,
    isDetailModalOpen,
    setIsDetailModalOpen,
    selectedEditProject,
    setSelectedEditProject,
    isEditModalOpen,
    setIsEditModalOpen,
    isCreateClubModalOpen,
    setIsCreateClubModalOpen,
    isCreateTeamModalOpen,
    setIsCreateTeamModalOpen,
    isAddMemberModalOpen,
    setIsAddMemberModalOpen,
    isCreateSeasonModalOpen,
    setIsCreateSeasonModalOpen,
    isCreateCompetitionModalOpen,
    setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen,
    setIsCreateMatchModalOpen,
    isEditMemberRoleModalOpen,
    setIsEditMemberRoleModalOpen,
    editingMember,
    setEditingMember,
    isOrgDetailModalOpen,
    setIsOrgDetailModalOpen,
    isOrgEditModalOpen,
    setIsOrgEditModalOpen,
    detailUser,
    setDetailUser,
    isUserDetailModalOpen,
    setIsUserDetailModalOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteLoading,
    handleInvite,
    deleteLoading,
    handleDelete,
    isSuperAdmin,
    permissionContext,
    userCanEditOrg,
    userCanDeleteOrg,
    userCanInvite,
    userCanManageMembers,
    userCanEditProject,
    userCanDeleteProject,
    organisationOptions,
    handleOrganisationSwitch,
    createModalOrganisations,
    createModalClubs,
    orgIdForDirectoryLists,
    getBestMatchDetailPath,
    getApiV1BaseUrl,
    getCsrfToken,
    fetchClubsPage,
    fetchTeamsForOrg,
    setOrg,
    setClubs,
    setTeams,
    setAllClubsForTeams,
    setClubsCount,
    setMembers,
    setOrgPeriods,
    setFederationMatches,
    setMatchesCount,
    setTeamsCount,
    recomputePeriodCounts,
    fetchFederationCounts,
    getRecursiveMatchesCount,
  };
}

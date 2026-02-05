import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
  Input,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { Organisation, User, Project } from '../../types';
import AppShell from '../../components/AppShell';
import OrganisationDetailModal from './OrganisationDetailModal';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import ProjectEditModal from './ProjectEditModal';
import ProjectCreateModal from './ProjectCreateModal';
import PeriodCreateModal from './PeriodCreateModal';
import MatchCreateModal from './MatchCreateModal';
import InviteMemberModal from './InviteMemberModal';
import UserDetailModal from './UserDetailModal';
import {
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
  canEditProject,
  canDeleteProject,
} from '../../utils/permissions';
import { AuditLogTable } from '../../components/AuditLog/AuditLogTable';
import { PolicyList } from '../../components/Organisations/PolicyList';
import { fetchAllPages, invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { periodPathKey } from '../../utils/periodPath';
import { actionButtonStyle } from '../../utils/directoryStyles';
import { ClubsList } from './directory/ClubsList';
import { TeamsList } from './directory/TeamsList';
import { SeasonsList } from './directory/SeasonsList';
import { CompetitionsList } from './directory/CompetitionsList';
import { MatchesList } from './directory/MatchesList';
import { UsersList } from './directory/UsersList';
import { getApiBaseUrl } from '../../utils/apiBase';
import MobileTabBar from '../../components/MobileTabBar';
import ContentAvailabilityCard from '../../components/FeatureFlags/ContentAvailabilityCard';
import BrandIdentityPage from '../../components/Branding/BrandIdentityPage';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

/**
 * T007 - Organisation Detail Page
 *
 * Purpose: Display organisation summary with members, projects, and credits snippet
 * - Shows org metadata, member count, project list
 * - Links to projects and audit log
 * - Permission-aware: viewer sees read-only view
 */
export const OrganisationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
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

  const [selectedClub, setSelectedClub] = useState<Project | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateClubModalOpen, setIsCreateClubModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);

  const [isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<'admin' | 'member'>('member');
  const [editMemberRoleSaving, setEditMemberRoleSaving] = useState(false);
  const [editMemberRoleError, setEditMemberRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

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

  // Hierarchy tab (club -> team)
  const [hierarchySearch, setHierarchySearch] = useState('');

  // Inline edit state for Overview
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal state for view/edit
  const [isOrgDetailModalOpen, setIsOrgDetailModalOpen] = useState(false);
  const [isOrgEditModalOpen, setIsOrgEditModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  // Compute period hierarchy for recursive activity counts
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
    let count = (p.activities_count ?? 0);
    const children = periodChildrenMap.get(String(p.id));
    if (children) {
      for (const child of children) {
        count += getRecursiveMatchesCount(child);
      }
    }
    return count;
  };

  // Resolve slug from ID if needed
  const resolvedOrg = organisations.find(o =>
    o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase(); // Use slug for API calls
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  // Organisation detail "tabs" are driven by Panel B via `?tab=`.
  const activeTab = useMemo(() => {
    const raw = String(new URLSearchParams(location.search).get('tab') || '').trim().toLowerCase();
    if (!raw) return 'overview';
    const allowed = new Set([
      'overview',
      'hierarchy',
      'clubs',
      'teams',
      'seasons',
      'competitions',
      'matches',
      'users',
      'audit',
      'governance',
      'operations',
      'identity',
      'settings',
    ]);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  // Load active context when component mounts
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
    return () => { cancelled = true; };
  }, []);

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
        ''
    ).trim();
    const club = rawClubId ? clubById.get(rawClubId) : null;
    const clubSlugOrId = String(club?.slug || club?.id || rawClubId || '').trim();

    const periodId = String(m?.period?.id ?? m?.period_id ?? '').trim();
    const competition = periodId ? (periodById.get(periodId) || m?.period) : m?.period;
    const competitionKeyOrId = String(periodPathKey(competition) || (competition as any)?.slug || (competition as any)?.id || periodId || '').trim();
    const seasonId = String((competition as any)?.parent_period_id ?? (competition as any)?.parent_period?.id ?? '').trim();
    const season = seasonId ? periodById.get(seasonId) : (competition as any)?.parent_period;
    const seasonKeyOrId = String(periodPathKey(season) || (season as any)?.slug || (season as any)?.id || seasonId || '').trim();

    if (orgSlug && clubSlugOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId) {
      return `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchSlugOrId}`;
    }

    return `/matches/${matchSlugOrId}`;
  };

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
      const user = item?.user ?? item;
      const userId = String(user?.id ?? '').trim();
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
            ''
        ).trim();

        if (!clubId && teamId) {
          clubId = String(teamToClubId.get(teamId) || '').trim();
        }

        if (clubId) getOrCreateSet(clubUserIdsByClubId, clubId).add(userId);
        if (teamId) getOrCreateSet(teamUserIdsByTeamId, teamId).add(userId);
      }
    }

    const clubUsersCountById: Record<string, number> = {};
    for (const [clubId, userIds] of clubUserIdsByClubId.entries()) {
      clubUsersCountById[String(clubId)] = userIds.size;
    }

    const teamUsersCountById: Record<string, number> = {};
    for (const [teamId, userIds] of teamUserIdsByTeamId.entries()) {
      teamUsersCountById[String(teamId)] = userIds.size;
    }

    return { clubUsersCountById, teamUsersCountById };
  }, [members, teams]);

  // Permission checks using centralized helper
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

  // Breadcrumb context switcher setup
  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  // Custom handler to navigate to the selected organisation's detail page
  const handleOrganisationSwitch = (option: { id: string; label: string; slug?: string }) => {
    navigate(`/${option.slug || option.id}${location.search || ''}`);
  };

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'hierarchy' as const, label: 'Hierarchy' },
      { id: 'clubs' as const, label: 'Clubs' },
      { id: 'teams' as const, label: 'Teams' },
      { id: 'seasons' as const, label: 'Seasons' },
      { id: 'competitions' as const, label: 'Competitions' },
      { id: 'matches' as const, label: 'Matches' },
      { id: 'users' as const, label: 'Members' },
      { id: 'audit' as const, label: 'Audit' },
      { id: 'governance' as const, label: 'Governance' },
      { id: 'operations' as const, label: 'Operations (Admin)' },
      { id: 'settings' as const, label: 'Settings' },
    ],
    []
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

  const getApiV1BaseUrl = () => {
    const raw = getApiBaseUrl();
    return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
  };

  const getPeriodType = (p: any): string => {
    const t = p?.type ?? p?.data?.type ?? p?.metadata?.type;
    return String(t || '').toLowerCase();
  };

  const getPeriodParentId = (p: any): string => {
    const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
    return parentId ? String(parentId) : '';
  };

  const isSeasonPeriod = (p: any): boolean => {
    // TeamReel hierarchy: Season is a root Period (no parent_period).
    // Do NOT infer by name; rely on parent/type.
    const parentId = getPeriodParentId(p);
    if (parentId) return false;

    const type = getPeriodType(p);
    if (type === 'season') return true;

    // Guard against misconfigured root competitions.
    if (['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type)) return false;

    return true;
  };

  const isCompetitionPeriod = (p: any): boolean => {
    const parentId = getPeriodParentId(p);
    if (parentId) return true;

    const type = getPeriodType(p);
    // Allow explicit typing when present
    return ['competition', 'league', 'cup', 'friendly', 'tournament', 'round'].includes(type);
  };

  const compactTableStyle: React.CSSProperties = { tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' };
  const compactThStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.8rem', textAlign: 'left', borderBottom: '2px solid var(--app-border)' };
  const compactTdStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.85rem', verticalAlign: 'middle', borderBottom: '1px solid var(--app-border)' };
  const compactTextTdStyle: React.CSSProperties = {
    ...compactTdStyle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 0,
  };
  const compactActionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    flexWrap: 'wrap',
  };

  const compareText = (a: unknown, b: unknown) =>
    String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });

  const normalizeRoleName = (value: unknown) => String(value ?? '').trim().toLowerCase();
  const TEAMREEL_ROLE_RANK: Record<string, number> = {
    superadmin: 100,
    'land admin': 90,
    'club admin': 80,
    'team admin': 70,
    'team member': 60,
    supporter: 50,
    user: 10,
  };
  const TEAMREEL_ROLE_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'superadmin', label: 'Superadmin' },
    { key: 'land admin', label: 'Land Admin' },
    { key: 'club admin', label: 'Club Admin' },
    { key: 'team admin', label: 'Team Admin' },
    { key: 'team member', label: 'Team Member' },
    { key: 'supporter', label: 'Supporter' },
    { key: 'user', label: 'User' },
  ];
  const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);
  const mapMembershipToTeamreelRole = (membershipRoleRaw: unknown, hasParentProject: boolean) => {
    const membershipRole = normalizeRoleName(membershipRoleRaw);
    const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
    if (isAdminLike) return hasParentProject ? 'Team Admin' : 'Club Admin';
    return hasParentProject ? 'Team Member' : 'Supporter';
  };
  const getTeamreelRoleDisplay = (user: any, orgMembership: any, projectMemberships: any[]) => {
    const roles: string[] = [];

    const isSuper = Boolean(user?.is_superuser) || normalizeRoleName(user?.role) === 'superadmin';
    if (isSuper) return { bestKey: 'superadmin', label: 'Superadmin', title: 'Superadmin' };

    const orgMembershipRole = normalizeRoleName(orgMembership?.role);
    if (orgMembershipRole === 'admin') roles.push('Land Admin');

    for (const pm of projectMemberships || []) {
      const roleRaw = String(pm?.role ?? '').trim();
      if (!roleRaw) continue;
      const parentIdRaw = pm?.project?.parent_id ?? pm?.project?.parent?.id ?? pm?.project?.parent_project_id;
      const hasParentProject = Boolean(parentIdRaw);
      roles.push(mapMembershipToTeamreelRole(roleRaw, hasParentProject));
    }

    const uniqueByKey = new Map<string, string>();
    for (const r of roles) {
      const key = normalizeRoleName(r);
      if (!key) continue;
      if (!uniqueByKey.has(key)) uniqueByKey.set(key, r);
    }
    const unique = Array.from(uniqueByKey.values());
    if (unique.length === 0) return { bestKey: 'user', label: 'User', title: 'User' };

    const best = [...unique].sort(
      (a, b) => (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) - (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0)
    )[0];
    const title = [...unique].sort((a, b) => a.localeCompare(b)).join(', ');
    const label = unique.length === 1 ? best : `${best} +${unique.length - 1}`;
    return { bestKey: normalizeRoleName(best), label, title };
  };

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1] || '';

  const fetchFederationMatches = async (organisationId: string) => {
    if (!organisationId) return;
    setFederationMatchesLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const params = new URLSearchParams();
      // Keep this bounded; some federations can have hundreds+ of matches.
      params.set('page_size', '50');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);
      params.set('ordering', '-start_time');

      const all = await fetchAllPages<any>(
        `${apiV1BaseUrl}/activities/?${params.toString()}`,
        { credentials: 'include' },
        {
          ttlMs: 30_000,
          cacheKey: `GET:activities:federation:matches:${organisationId}`,
          maxItems: 250,
        }
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
      params.set('ordering', '-start_time'); // Newest first
      params.set('start_time__lt', new Date().toISOString()); // Only past matches

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

  const parseListEnvelope = (raw: any): { results: any[]; count: number } => {
    const envelope = raw?.data ?? raw;
    const results =
      envelope?.results ??
      envelope?.data ??
      raw?.results ??
      raw?.data ??
      raw ??
      [];

    const list = Array.isArray(results) ? results : [];
    const count =
      typeof envelope?.count === 'number'
        ? envelope.count
        : typeof raw?.count === 'number'
          ? raw.count
          : list.length;
    return { results: list, count };
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

    // Build a local parent->children map so we can compute recursive activity counts
    // without relying on state that may not have updated yet.
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
      let count = (p?.activities_count ?? 0);
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

          // Matches count derived from competition subtree activities_count.
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

    // If the backend doesn't support organisation-level period filtering, we fall back to
    // fetching periods by team. That requires teams to be loaded.
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

        // Chunk requests to avoid rate limiting and long sequential wait
        const chunkSize = 6; // Railway/Python can handle 6-10 concurrent easily
        const teamChunks = [];
        for (let i = 0; i < teams.length; i += chunkSize) {
          teamChunks.push(teams.slice(i, i + chunkSize));
        }

        if (DEBUG_LOGS) {
          console.log(
            `[OrganisationDetailPage] Fetching periods for ${teams.length} teams in ${teamChunks.length} chunks`
          );
        }

        for (const chunk of teamChunks) {
           await Promise.all(chunk.map(async (t: any) => {
              const teamId = t?.id;
              if (!teamId) return;
              const params = new URLSearchParams();
              params.set('page_size', '250');
              params.set('project_id', String(teamId));

              try {
                const url = `${apiV1BaseUrl}/periods/?${params.toString()}`;
                const periods = await fetchAllPages<any>(url, {
                    credentials: 'include',
                });
                for (const p of periods || []) {
                    if (!p?.id) continue;
                    unique.set(String(p.id), p);
                }
              } catch (e) {
                 console.warn(`Failed to fetch periods for team ${teamId}`, e);
              }
           }));
        } // Close chunk loop

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
      // Teams count (child projects)
      if (currentOrgSlug) {
        const teamsRes = await fetch(
          `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=1&parent_project__isnull=false`,
          { credentials: 'include' }
        );
        if (teamsRes.ok) {
          const json = await teamsRes.json();
          const { count } = parseListEnvelope(json);
          setTeamsCount(count);
        }
      }

      // Seasons/competitions counts – computed client-side from federation periods
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
          // Likely unsupported filter on backend; fall back to team-scoped loading.
          void fetchTeamsForOrg({ force: true });
        }
      }

      // Matches count
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

    // Fallback: if org-level period filtering isn't supported, load periods via team scope.
    if (!orgPeriodsLoading && orgPeriods.length === 0) {
      void ensureOrgPeriodsLoaded();
    }
  };

  useEffect(() => {
    const shouldEnsurePeriods = activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'hierarchy';
    if (!shouldEnsurePeriods) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void ensureOrgPeriodsLoaded();
  }, [activeTab, orgPeriodsLoading, orgPeriods.length, teams.length, currentOrgSlug]);

  const clubsForHierarchy = useMemo(() => {
    const list = (allClubsForTeams && allClubsForTeams.length > 0) ? allClubsForTeams : clubs;
    return Array.isArray(list) ? list : [];
  }, [allClubsForTeams, clubs]);

  const hierarchyGroups = useMemo(() => {
    const q = String(hierarchySearch || '').trim().toLowerCase();
    const toSlugOrId = (p: any) => String(p?.slug || p?.id || '').trim();
    const toName = (p: any) => String(p?.name || p?.title || p?.slug || p?.id || '').trim();

    const clubUsersCountById = membershipUserCounts?.clubUsersCountById || {};
    const teamUsersCountById = membershipUserCounts?.teamUsersCountById || {};

    const teamSeasons = teamSeasonsCountById || {};
    const teamCompetitions = teamCompetitionsCountById || {};
    const teamMatches = teamMatchesCountById || {};

    const teamsByClubId = new Map<string, Project[]>();
    for (const t of teams || []) {
      const parent = (t as any)?.parent_id ?? (t as any)?.parent ?? (t as any)?.parent_project_id ?? (t as any)?.parent_project?.id ?? null;
      const clubId = parent != null ? String(parent) : '';
      if (!clubId) continue;
      if (!teamsByClubId.has(clubId)) teamsByClubId.set(clubId, []);
      teamsByClubId.get(clubId)!.push(t as any);
    }

    const clubRows = (clubsForHierarchy || []).map((c) => {
      const clubId = String((c as any)?.id || '').trim();
      const clubName = toName(c) || '—';
      const clubSlugOrId = toSlugOrId(c);

      const clubTeams = (teamsByClubId.get(clubId) || []).slice();
      clubTeams.sort((a: any, b: any) => toName(a).localeCompare(toName(b), undefined, { sensitivity: 'base' }));

      const mappedTeams = clubTeams.map((t: any) => {
        const teamId = String(t?.id || '').trim();
        return {
          teamId,
          teamName: toName(t) || '—',
          teamSlugOrId: toSlugOrId(t),
          memberCount: teamId ? (teamUsersCountById[teamId] ?? 0) : 0,
          seasonsCount: teamId ? (teamSeasons[teamId] ?? 0) : 0,
          competitionsCount: teamId ? (teamCompetitions[teamId] ?? 0) : 0,
          matchesCount: teamId ? (teamMatches[teamId] ?? 0) : 0,
        };
      });

      const clubMemberCount = clubId ? (clubUsersCountById[clubId] ?? 0) : 0;
      const teamCount = mappedTeams.length;
      const clubSeasonsCount = mappedTeams.reduce((sum, t) => sum + (t.seasonsCount ?? 0), 0);
      const clubCompetitionsCount = mappedTeams.reduce((sum, t) => sum + (t.competitionsCount ?? 0), 0);
      const clubMatchesCount = mappedTeams.reduce((sum, t) => sum + (t.matchesCount ?? 0), 0);

      if (q) {
        const clubMatch = clubName.toLowerCase().includes(q);
        const teamsMatch = mappedTeams.some((t) => t.teamName.toLowerCase().includes(q));
        if (!clubMatch && !teamsMatch) return null;
        // If the query matches only some teams, filter to those teams.
        const filteredTeams = clubMatch ? mappedTeams : mappedTeams.filter((t) => t.teamName.toLowerCase().includes(q));
        return {
          clubId,
          clubName,
          clubSlugOrId,
          memberCount: clubMemberCount,
          teamCount: filteredTeams.length,
          seasonsCount: clubSeasonsCount,
          competitionsCount: clubCompetitionsCount,
          matchesCount: clubMatchesCount,
          teams: filteredTeams,
        };
      }

      return {
        clubId,
        clubName,
        clubSlugOrId,
        memberCount: clubMemberCount,
        teamCount,
        seasonsCount: clubSeasonsCount,
        competitionsCount: clubCompetitionsCount,
        matchesCount: clubMatchesCount,
        teams: mappedTeams,
      };
    }).filter(Boolean) as Array<{
      clubId: string;
      clubName: string;
      clubSlugOrId: string;
      memberCount: number;
      teamCount: number;
      seasonsCount: number;
      competitionsCount: number;
      matchesCount: number;
      teams: Array<{ teamId: string; teamName: string; teamSlugOrId: string; memberCount: number; seasonsCount: number; competitionsCount: number; matchesCount: number }>;
    }>;

    clubRows.sort((a, b) => a.clubName.localeCompare(b.clubName, undefined, { sensitivity: 'base' }));
    return clubRows;
  }, [teams, clubsForHierarchy, hierarchySearch, membershipUserCounts, teamSeasonsCountById, teamCompetitionsCountById, teamMatchesCountById]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      const apiV1BaseUrl = getApiV1BaseUrl();

      // First find user by email (in a real app this would be an invite flow)
      // For this demo, we'll assume we need the user ID.
      // Since we don't have a user search endpoint exposed for this demo,
      // we'll try to use the email directly if the backend supports it,
      // or we might need to mock this part if the backend strictly requires UUID.

      // NOTE: The backend MembershipCreateSerializer expects 'user_id' (UUID).
      // Since we can't easily look up UUIDs by email from the frontend without a search endpoint,
      // we will add a temporary helper to the backend or just ask the user for UUID in this demo.
      // For better UX, let's try to implement a simple lookup or just use the ID input for now.

      // Actually, let's change the input to ask for User ID for this technical demo
      // to avoid complexity of implementing user search right now.

      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
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

      // Refresh members (all pages)
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
          { bypass: true }
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

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
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

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
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
    delete patch.sport; // Remove nested sport object, use sport_id instead

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

    // PATCH responses are sometimes lightweight and may omit nested fields like `sport`.
    // Refetch to ensure the details card updates immediately without a full page refresh.
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
      // Best-effort; leave optimistic state if refresh fails.
    }
  };

  // Lazy load members only when Users tab is active (performance optimization)
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
        force ? { bypass: true } : { ttlMs: 5 * 60_000 }
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

  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!currentOrgSlug) return;

      try {
        setLoading(true);
        setError(null);

        const apiV1BaseUrl = getApiV1BaseUrl();

        // Fetch organisation details using slug
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
        // Handle B13 response envelope
        const orgData = rawOrgData.data || rawOrgData;
        if (DEBUG_LOGS) console.log('[OrganisationDetailPage] Org data loaded', orgData);
        setOrg(orgData);
        // NOTE: We intentionally avoid calling the context switcher here.
        // In production this triggers a call to `/api/v1/context/set/` which may not exist,
        // spamming the console with 404s without improving this page.

        // Members are now loaded lazily when Users tab is opened (performance optimization)

        // Federation-wide counts (high-over)
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

  useEffect(() => {
       const orgId = String(org?.id || currentOrgId || '');
       if (orgId) {
         fetchScheduledMatches(orgId);
         fetchRecentPlayedMatches(orgId);
         // Ensure basic stats are loaded
         if (!orgPeriodsLoading && orgPeriods.length === 0) {
             void fetchFederationCounts(orgId);
         }
       }
  }, [org?.id, currentOrgId]);

  useEffect(() => {
    if (activeTab !== 'hierarchy') return;
    const orgId = String(org?.id || currentOrgId || '').trim();
    if (!orgId) return;
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    void fetchFederationCounts(orgId);
  }, [activeTab, org?.id, currentOrgId, orgPeriodsLoading, orgPeriods.length]);

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

    // Update local lists.
    setClubs((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setTeams((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
    setAllClubsForTeams((prev) => prev.map((p: any) => (String(p.id) === String(project.id) ? { ...p, ...updated } : p)));
  };

  if (loading) {
    return (
      <div className="p-6 org-detail-page">
        <div>
          <PageHeader
            title="Organisation Details"
          />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading organisation details...
              </div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-6 org-detail-page">
        <div>
          <PageHeader
            title="Organisation Details"
          />
          <PageContent>
            <Alert variant="error" data-testid="org-detail-error">
              {error || 'Organisation not found'}
            </Alert>
            <Button variant="secondary" onClick={() => navigate('/federations')}>
              Back to Organisations
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="org-detail-page">
        <PageHeader
        title={org.name}
        subtitle="Federation overview"
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive =
                String(activeContext?.organisation?.id ?? '') === String((org as any)?.id ?? '') ||
                activeContext?.organisation?.slug === (org as any)?.slug;
              return (
                <button
                  onClick={async () => {
                    if (isActive) return;
                    try {
                      setActivatingContext(true);
                      await setActiveContext('organisation', String((org as any)?.slug || (org as any)?.id || ''));
                      const context = await getActiveContext();
                      setActiveContextState(context);
                    } finally {
                      setActivatingContext(false);
                    }
                  }}
                  disabled={activatingContext || isActive}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    backgroundColor: isActive ? '#dcfce7' : 'var(--app-surface-2)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    cursor: (activatingContext || isActive) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    opacity: (activatingContext || isActive) ? 0.8 : 1,
                  }}
                  title={isActive ? 'This federation is already your active context' : 'Set this federation as your active context'}
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            <Button variant="secondary" size="sm" onClick={() => navigate('/federations')}>
              Back
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsOrgDetailModalOpen(true)}>
              View
            </Button>
            {userCanEditOrg && (
              <Button variant="secondary" size="sm" onClick={() => setIsOrgEditModalOpen(true)}>
                Edit
              </Button>
            )}
            {userCanEditOrg && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
        }
      />

      {/* Mobile Tab Bar */}
      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'hierarchy', label: 'Hierarchy' },
          { id: 'clubs', label: 'Clubs' },
          { id: 'teams', label: 'Teams' },
          { id: 'seasons', label: 'Seasons' },
          { id: 'competitions', label: 'Competitions' },
          { id: 'matches', label: 'Matches' },
          { id: 'users', label: 'Users' },
          { id: 'identity', label: 'Identity' },
          { id: 'settings', label: 'Settings' },
        ]}
        activeTab={activeTab}
      />

      <PageContent>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                  <div className="text-sm font-semibold text-gray-900">
                    Clubs <span className="text-gray-500" style={{ fontWeight: 600 }}>({org.clubs_count || clubsCount || 0})</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('clubs'))}>
                    View all
                  </Button>
                </div>
                {clubsLoading && clubs.length === 0 ? (
                  <div className="text-sm text-gray-500">Loading clubs…</div>
                ) : clubs.length === 0 ? (
                  <div className="text-sm text-gray-500">No clubs found.</div>
                ) : (
                  <div className="space-y-2">
                    {clubs.slice(0, 6).map((c: any) => (
                      <button
                        key={String(c?.id)}
                        type="button"
                        className="app-unstyled-button text-blue-600 hover:underline"
                        onClick={() =>
                          navigate(
                            `/organisations/${encodeURIComponent(String(currentOrgSlug || id || ''))}/projects/${encodeURIComponent(String(c?.slug || c?.id || ''))}`
                          )
                        }
                        style={{ textAlign: 'left', fontWeight: 600 }}
                      >
                        {String(c?.name || 'Club')}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                  <div className="text-sm font-semibold text-gray-900">
                    Teams <span className="text-gray-500" style={{ fontWeight: 600 }}>({org.teams_count || teamsCount || 0})</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('teams'))}>
                    View all
                  </Button>
                </div>
                {teamsLoading && teams.length === 0 ? (
                  <div className="text-sm text-gray-500">Loading teams…</div>
                ) : teams.length === 0 ? (
                  <div className="text-sm text-gray-500">No teams found.</div>
                ) : (
                  <div className="space-y-2">
                    {(teams as any[]).slice(0, 6).map((t: any) => (
                      <button
                        key={String(t?.id)}
                        type="button"
                        className="app-unstyled-button text-blue-600 hover:underline"
                        onClick={() =>
                          navigate(
                            `/organisations/${encodeURIComponent(String(currentOrgSlug || id || ''))}/projects/${encodeURIComponent(String(t?.slug || t?.id || ''))}`
                          )
                        }
                        style={{ textAlign: 'left', fontWeight: 600 }}
                      >
                        {String(t?.name || 'Team')}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                  <div className="text-sm font-semibold text-gray-900">
                    Members <span className="text-gray-500" style={{ fontWeight: 600 }}>({org.member_count || members.length || 0})</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('users'))}>
                    View all
                  </Button>
                </div>
                {membersLoading && members.length === 0 ? (
                  <div className="text-sm text-gray-500">Loading members…</div>
                ) : members.length === 0 ? (
                  <div className="text-sm text-gray-500">No members found.</div>
                ) : (
                  <div className="space-y-2">
                    {(members as any[]).slice(0, 6).map((m: any) => {
                      const u = m?.user || m;
                      const label =
                        `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
                        String(u?.email || '').trim() ||
                        `User ${String(u?.id || m?.id)}`;
                      const userId = String(u?.id || m?.id || '').trim();
                      return (
                        <button
                          key={String(userId || label)}
                          type="button"
                          className="app-unstyled-button text-blue-600 hover:underline"
                          onClick={() => (userId ? navigate(`/users/${encodeURIComponent(userId)}`) : void 0)}
                          style={{ textAlign: 'left', fontWeight: 600 }}
                          disabled={!userId}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card style={{ padding: 16 }}>
                <div className="flex items-center justify-between mb-3" style={{ gap: 12 }}>
                  <div className="text-sm font-semibold text-gray-900">
                    Matches <span className="text-gray-500" style={{ fontWeight: 600 }}>({matchesCount ?? '—'})</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(makeTabHref('matches'))}>
                    View all
                  </Button>
                </div>
                {scheduledMatchesLoading && scheduledMatches.length === 0 ? (
                  <div className="text-sm text-gray-500">Loading matches…</div>
                ) : scheduledMatches.length === 0 ? (
                  <div className="text-sm text-gray-500">No upcoming matches scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {scheduledMatches.slice(0, 6).map((m: any) => (
                      <button
                        key={String(m?.id)}
                        type="button"
                        className="app-unstyled-button text-blue-600 hover:underline"
                        onClick={() => navigate(getBestMatchDetailPath(m))}
                        style={{ textAlign: 'left', fontWeight: 600 }}
                      >
                        {String(m?.title || m?.name || 'Match')}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Organisation Details Card */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Organisation Details</h3>
                {canEditOrganisation(permissionContext) && (
                  <button type="button" onClick={() => setIsOrgEditModalOpen(true)} style={actionButtonStyle('warning')}>
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500">Name</div>
                  <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Sport</div>
                  <div className="text-base text-gray-900 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {org?.sport ? (
                      <>
                        <span>{org.sport.sport_icon}</span>
                        <span>{org.sport.name}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Type</div>
                  <div className="text-base text-gray-900 mt-1">{org?.metadata?.type || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Country</div>
                  <div className="text-base text-gray-900 mt-1">{org?.metadata?.country || '—'}</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Hierarchy</div>
                <div style={{ color: 'var(--app-muted-text)', fontSize: 13 }}>
                  Clubs → teams
                </div>
              </div>
              <Input
                value={hierarchySearch}
                onChange={(e) => setHierarchySearch((e.target as any).value)}
                placeholder="Search clubs / teams…"
              />
            </div>

            {teamsLoading && hierarchyGroups.length === 0 ? (
              <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                Loading hierarchy...
              </div>
            ) : hierarchyGroups.length === 0 ? (
              <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                No clubs/teams found.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hierarchyGroups.map((club) => {
                  const orgKey = String(orgSlugOrId || currentOrgSlug || id || '').trim();
                  const clubPath = orgKey && club.clubSlugOrId ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(club.clubSlugOrId)}` : '';

                  const pillStyle: React.CSSProperties = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid var(--app-border)',
                    background: 'var(--app-surface-2)',
                    fontSize: 12,
                    color: 'var(--app-muted-text)',
                    fontWeight: 600,
                  };

                  return (
                    <div
                      key={club.clubId || club.clubSlugOrId}
                      style={{
                        border: '1px solid var(--app-border)',
                        borderRadius: 10,
                        background: 'var(--app-surface)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--app-border)',
                          background: 'var(--app-surface-2)',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          {clubPath ? (
                            <button
                              type="button"
                              className="app-unstyled-button hover:underline"
                              onClick={() => navigate(clubPath)}
                              style={{ textAlign: 'left', fontWeight: 800, fontSize: 14, color: '#60a5fa' }}
                            >
                              {club.clubName}
                            </button>
                          ) : (
                            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--app-text)' }}>{club.clubName}</div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span style={pillStyle}>Teams: {club.teamCount}</span>
                          <span style={pillStyle}>Members: {club.memberCount}</span>
                          <span style={pillStyle}>Seasons: {club.seasonsCount ?? 0}</span>
                          <span style={pillStyle}>Competitions: {club.competitionsCount ?? 0}</span>
                          <span style={pillStyle}>Matches: {club.matchesCount ?? 0}</span>
                          {clubPath ? (
                            <button type="button" className="app-action-button" onClick={() => navigate(clubPath)} style={actionButtonStyle('primary')}>
                              View Club
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px' }}>
                        {club.teams.length === 0 ? (
                          <div className="text-sm text-gray-500 py-2">No teams.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {club.teams.map((t) => {
                              const teamPath = orgKey && club.clubSlugOrId && t.teamSlugOrId
                                ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(club.clubSlugOrId)}/${encodeURIComponent(t.teamSlugOrId)}`
                                : '';
                              return (
                                <div
                                  key={t.teamId || t.teamSlugOrId}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '8px 10px',
                                    border: '1px solid var(--app-border)',
                                    borderRadius: 8,
                                    background: 'var(--app-surface)',
                                  }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    {teamPath ? (
                                      <button
                                        type="button"
                                        className="app-unstyled-button hover:underline"
                                        onClick={() => navigate(teamPath)}
                                        style={{ textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}
                                      >
                                        {t.teamName}
                                      </button>
                                    ) : (
                                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--app-text)' }}>{t.teamName}</div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span style={pillStyle}>Members: {t.memberCount}</span>
                                    <span style={pillStyle}>Seasons: {t.seasonsCount ?? 0}</span>
                                    <span style={pillStyle}>Competitions: {t.competitionsCount ?? 0}</span>
                                    <span style={pillStyle}>Matches: {t.matchesCount ?? 0}</span>
                                    {teamPath ? (
                                      <button type="button" className="app-action-button" onClick={() => navigate(teamPath)} style={actionButtonStyle('primary')}>
                                        View Team
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'audit' && (
          <Card>
            {isSuperAdmin || userCanEditOrg ? (
              <AuditLogTable organisationId={String(currentOrgId || org?.id || '')} limit={50} />
            ) : (
              <Alert variant="error">You do not have access to the audit log for this organisation.</Alert>
            )}
          </Card>
        )}

        {activeTab === 'governance' && (
          <Card>
            {isSuperAdmin || userCanEditOrg ? (
              <PolicyList organisationId={String(currentOrgId || org?.id || '')} />
            ) : (
              <Alert variant="error">You do not have access to governance policies for this organisation.</Alert>
            )}
          </Card>
        )}

        {activeTab === 'operations' && (
          <Card>
            {isSuperAdmin ? (
              <div style={{ padding: 12, color: 'var(--app-muted-text)' }}>
                Operations tooling is not wired yet for this demo.
              </div>
            ) : (
              <Alert variant="error">You do not have access to operations for this organisation.</Alert>
            )}
          </Card>
        )}

        {activeTab === 'clubs' && orgIdForDirectoryLists && (
          <ClubsList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'teams' && orgIdForDirectoryLists && (
          <TeamsList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'seasons' && orgIdForDirectoryLists && (
          <SeasonsList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'competitions' && orgIdForDirectoryLists && (
          <CompetitionsList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'matches' && orgIdForDirectoryLists && (
          <MatchesList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'users' && orgIdForDirectoryLists && (
          <UsersList preselectedOrgId={orgIdForDirectoryLists} />
        )}

        {activeTab === 'identity' && org && (
          <BrandIdentityPage
            organisationId={String(org.id)}
            organisationName={org.name}
          />
        )}

        {activeTab === 'settings' && org && (
          <ContentAvailabilityCard
            scopeType="ORGANISATION"
            organisationId={String(org.id)}
            scopeName={org.name}
          />
        )}

      </PageContent>

      <ProjectDetailModal
        opened={isClubModalOpen}
        onClose={() => setIsClubModalOpen(false)}
        project={selectedClub}
      />

      <ProjectDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={detailProject}
      />

      <ProjectEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedEditProject as any}
        onSave={(patch) => {
          if (!selectedEditProject) return Promise.resolve();
          return saveProjectEdits(selectedEditProject, patch as any);
        }}
      />

      <ProjectCreateModal
        opened={isCreateClubModalOpen}
        onClose={() => setIsCreateClubModalOpen(false)}
        title="Create Club"
        organisations={createModalOrganisations}
        requireOrganisation={createModalOrganisations.length > 0}
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        onCreate={async (projectData) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              name: projectData.name,
              description: projectData.description || '',
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create club');
          }

          // Make the UX feel instant:
          // - update local state immediately (so the club appears right away)
          // - kick off any heavier refetch work in the background
          const payload: any = await res.json().catch(() => null);
          const created: any = payload?.data?.data || payload?.data || payload;

          if (created && typeof created === 'object') {
            const createdKey = String(created?.slug || created?.id || '');
            if (createdKey) {
              setClubsPage(1);
              setClubs((prev) => {
                if (prev.some((p: any) => String(p?.slug || p?.id || '') === createdKey)) return prev;
                // Newest-first in UI; server refetch will normalize ordering if needed.
                return [created, ...prev];
              });
              setClubsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
              setAllClubsForTeams((prev) => {
                if (prev.some((p: any) => String(p?.slug || p?.id || '') === createdKey)) return prev;
                return [created, ...prev];
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchClubsPage(1);
          void fetchTeamsForOrg({ force: true });
        }}
      />

      <ProjectCreateModal
        opened={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        title="Create Team"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        requireOrganisation={createModalOrganisations.length > 0}
        requireClub
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={teamClubFilterId || ''}
        onCreate={async (projectData) => {
          const clubId = String(projectData.parent_project_id || '').trim();
          if (!clubId) throw new Error('Select a club first.');

          const apiV1BaseUrl = getApiV1BaseUrl();
          const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              name: projectData.name,
              description: projectData.description || '',
              parent_project_id: clubId,
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create team');
          }

          // Make UX feel instant: update local lists immediately, then refresh in background.
          const payload: any = await res.json().catch(() => null);
          const created: any = payload?.data?.data || payload?.data || payload;

          if (created && typeof created === 'object') {
            const createdKey = String(created?.slug || created?.id || '').trim();
            if (createdKey) {
              setTeams((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
                return [created, ...list];
              });
              setTeamsCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
            }
          }

          invalidateFetchAllPagesCache();
          void fetchTeamsForOrg({ force: true });
        }}
      />

      <InviteMemberModal
        opened={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        orgSlug={String(currentOrgSlug || '')}
        onInviteSuccess={() => {
          fetchMembers(true);
        }}
      />

      <PeriodCreateModal
        opened={isCreateSeasonModalOpen}
        onClose={() => setIsCreateSeasonModalOpen(false)}
        title="Create Season"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        requireOrganisation
        requireClub
        requireTeam
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={seasonClubFilterId || ''}
        initialTeamId={seasonTeamFilterId || ''}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
          const teamId = String(payload.project_id || '').trim();
          if (!orgId) throw new Error('Select a federation first');
          if (!teamId) throw new Error('Select a team first');

          const res = await fetch(`${apiV1BaseUrl}/periods/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              organisation_id: orgId,
              project_id: teamId ? Number(teamId) : undefined,
              parent_period_id: null,
              name: payload.name,
              description: payload.description,
              start_date: payload.start_date,
              end_date: payload.end_date,
              metadata: { type: 'season' },
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create season');
          }

          const raw: any = await res.json().catch(() => null);
          const created: any = raw?.data?.data || raw?.data || raw;
          if (created && typeof created === 'object') {
            const createdId = String(created?.id || '').trim();
            if (createdId) {
              setOrgPeriods((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
                const next = [created, ...list];
                recomputePeriodCounts(next);
                return next;
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchFederationCounts(orgId);
        }}
      />

      <PeriodCreateModal
        opened={isCreateCompetitionModalOpen}
        onClose={() => setIsCreateCompetitionModalOpen(false)}
        title="Create Competition"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        requireOrganisation
        requireClub
        requireTeam
        requireSeason
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={compClubFilterId || ''}
        initialTeamId={compTeamFilterId || ''}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const orgId = String(payload.organisation_id || currentOrgId || org?.id || '').trim();
          const teamId = String(payload.project_id || '').trim();
          const seasonId = String(payload.parent_period_id || '').trim();
          if (!orgId) throw new Error('Select a federation first');
          if (!teamId) throw new Error('Select a team first');
          if (!seasonId) throw new Error('Select a season first');

          const res = await fetch(`${apiV1BaseUrl}/periods/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              organisation_id: orgId,
              project_id: teamId ? Number(teamId) : undefined,
              parent_period_id: seasonId || null,
              name: payload.name,
              description: payload.description,
              start_date: payload.start_date,
              end_date: payload.end_date,
              metadata: { type: 'competition' },
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create competition');
          }

          const raw: any = await res.json().catch(() => null);
          const created: any = raw?.data?.data || raw?.data || raw;
          if (created && typeof created === 'object') {
            const createdId = String(created?.id || '').trim();
            if (createdId) {
              setOrgPeriods((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
                const next = [created, ...list];
                recomputePeriodCounts(next);
                return next;
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchFederationCounts(orgId);
        }}
      />

      <MatchCreateModal
        opened={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={teams as any}
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={matchClubFilterId || ''}
        initialTeamId={matchTeamFilterId || ''}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const csrfToken = getCsrfToken();

          const orgIdToRefresh = String(currentOrgId || org?.id || '').trim();
          const teamId = String(payload.project_id || '').trim();
          const competitionId = String(payload.period_id || '').trim();
          if (!teamId) throw new Error('Select a team first');
          if (!competitionId) throw new Error('Select a competition first');

          const res = await fetch(`${apiV1BaseUrl}/activities/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: payload.title,
              activity_type: 'match',
              project_id: teamId ? Number(teamId) : undefined,
              opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
              period_id: competitionId,
              start_time: payload.start_time,
              end_time: payload.end_time,
              location: payload.location,
              description: payload.description,
              metadata: {
                venue: payload.venue || 'Home',
                is_home: (payload.venue || 'Home') === 'Home',
                ...(payload as any)?.metadata,
              },
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create match');
          }

          // Make UX feel instant: insert created match locally and refresh counts in background.
          const raw: any = await res.json().catch(() => null);
          const created: any = raw?.data?.data || raw?.data || raw;
          if (created && typeof created === 'object') {
            const createdId = String(created?.id || '').trim();
            if (createdId) {
              setFederationMatches((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                return [created, ...list];
              });
              setMatchesCount((prev) => (typeof prev === 'number' ? prev + 1 : prev));
            }
          }

          invalidateFetchAllPagesCache();
          if (orgIdToRefresh) {
            void fetchFederationCounts(orgIdToRefresh);
          }
        }}
      />

      {isEditMemberRoleModalOpen && editingMember ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--app-surface)',
              padding: '24px',
              borderRadius: '8px',
              width: '520px',
              maxWidth: '95%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: 'var(--app-text)',
              border: '1px solid var(--app-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>Edit Member</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditMemberRoleModalOpen(false);
                  setEditingMember(null);
                }}
                disabled={editMemberRoleSaving}
              >
                Close
              </Button>
            </div>

            <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--app-text-muted)' }}>
              {String(editingMember?.user?.email || editingMember?.email || '')}
            </div>

            {editMemberRoleError ? (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#fee', color: '#c00' }}>
                {editMemberRoleError}
              </div>
            ) : null}

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Role</label>
              <select
                value={editingMemberRole}
                onChange={(e) => setEditingMemberRole(e.target.value as any)}
                disabled={editMemberRoleSaving}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditMemberRoleModalOpen(false);
                  setEditingMember(null);
                }}
                disabled={editMemberRoleSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editingMember?.id) return;
                  try {
                    setEditMemberRoleSaving(true);
                    setEditMemberRoleError(null);
                    const apiV1BaseUrl = getApiV1BaseUrl();
                    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                    const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/${editingMember.id}/`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken || '',
                      },
                      credentials: 'include',
                      body: JSON.stringify({ role: editingMemberRole }),
                    });

                    if (!res.ok) {
                      const detail = await res.text().catch(() => '');
                      throw new Error(detail || 'Failed to update member');
                    }

                    const updated = await res.json().catch(() => null);
                    setMembers((prev) =>
                      (prev as any[]).map((m: any) => {
                        if (String(m?.id) !== String(editingMember.id)) return m;
                        return updated && updated.id ? updated : { ...m, role: editingMemberRole };
                      })
                    );

                    setIsEditMemberRoleModalOpen(false);
                    setEditingMember(null);
                  } catch (e) {
                    setEditMemberRoleError(e instanceof Error ? e.message : 'Failed to update member');
                  } finally {
                    setEditMemberRoleSaving(false);
                  }
                }}
                loading={editMemberRoleSaving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <OrganisationDetailModal
        opened={isOrgDetailModalOpen}
        onClose={() => setIsOrgDetailModalOpen(false)}
        organisation={org as any}
      />

      <EntityEditModal
        isOpen={isOrgEditModalOpen}
        onClose={() => setIsOrgEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="organisation"
        entityId={id!}
        entityName={org?.name}
        organisationId={id}
        canEditGeneral={canEditOrganisation(permissionContext)}
        canEditBrand={canEditOrganisation(permissionContext)}
      />

      <UserDetailModal
        user={detailUser}
        opened={isUserDetailModalOpen}
        onClose={() => setIsUserDetailModalOpen(false)}
      />
      </div>
    </>
  );
};

export default OrganisationDetailPage;

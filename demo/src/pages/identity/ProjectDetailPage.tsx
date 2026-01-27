import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
  Input,
} from '@django-core/design-system';
import { MemberList } from '../projects/components/MemberList';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { Project, User, AuditEvent } from '../../types';
import AppShell from '../../components/AppShell';
import { canDeleteProject, canEditProject } from '../../utils/permissions';
import { periodPathKey } from '../../utils/periodPath';
import { fetchAllPages as fetchAllPagesCached, invalidateFetchAllPagesCache } from '../../utils/fetchAllPages';
import { setActiveContext } from '../../utils/activeContext';
import ProjectDetailModal from './ProjectDetailModal';
import ProjectCreateModal from './ProjectCreateModal';
import ProjectEditModal from './ProjectEditModal';
import PeriodCreateModal from './PeriodCreateModal';
import PeriodEditModal from './PeriodEditModal';
import MatchCreateModal from './MatchCreateModal';
import MatchEditModal from './MatchEditModal';
import InviteMemberModal from './InviteMemberModal';
import UserDetailModal from './UserDetailModal';
import UsersTable from './detail/UsersTable';
import SeasonPickerModal from './detail/SeasonPickerModal';
import TeamCreditsTab from './detail/TeamCreditsTab';
import { createTeamreelDemoTransaction } from '../../utils/teamreelTransactions';
import CreateTransactionModal, { type WalletOption } from '../../components/transactions/CreateTransactionModal';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detail/detailStyles';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

const getPagedResults = (json: any): any[] => {
  // Supports both legacy DRF shapes and this app's envelope (BaseAPIPagination).
  // - { results: [...] }
  // - { data: { results: [...] } }
  // - { data: { data: [...] } }
  // - { data: [...] }
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  if (Array.isArray(json?.data?.results)) return json.data.results;
  if (Array.isArray(json?.results)) return json.results;
  return [];
};

const getPagedNextUrl = (json: any): string | null => {
  return (
    json?.meta?.pagination?.next ||
    json?.data?.next ||
    json?.next ||
    null
  );
};

const getPagedCount = (json: any): number | null => {
  const c = json?.meta?.pagination?.count ?? json?.data?.count ?? json?.count;
  return typeof c === 'number' ? c : null;
};

const fetchAllPages = async <T,>(url: string, options: RequestInit = {}, cacheOptions?: any): Promise<T[]> => {
  // Use the shared cached implementation to avoid repeated, expensive multi-page loads.
  // Cache is in-memory (per SPA session) and not related to the backend cache module.
  return await fetchAllPagesCached<T>(url, options, { ttlMs: 5 * 60_000, maxPages: 10, ...(cacheOptions || {}) });
};

/**
 * T009 - Project Detail Page
 *
 * Purpose: Display project metadata, members, and recent audit activity
 * - Shows project summary cards (name, description, member count)
 * - Lists team members with roles
 * - Shows recent audit events filtered by project_id
 */

// Match OrganisationDetailPage (table layout, typography, action buttons)

type DetailMode = 'club' | 'team';

export const ProjectDetailPage: React.FC<{ forceMode?: DetailMode }> = ({ forceMode }) => {
  const { orgId, projectId, clubId } = useParams<{ orgId: string; projectId: string; clubId?: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { context, organisations, projects: contextProjects } = useContextSwitcher();
  const { user } = useAuth();

  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const rawTab = String(params.get('tab') || 'overview').trim().toLowerCase();
    // Back-compat: allow newer URLs to use `members` while this page still uses `people` internally.
    const tab = rawTab === 'members' ? 'people' : rawTab;
    const allowed = new Set([
      'overview',
      'hierarchy',
      'people',
      'teams',
      'seasons',
      'competitions',
      'matches',
      'balance',
      'transactions',
    ]);
    return allowed.has(tab) ? tab : 'overview';
  }, [location.search]);

  useEffect(() => {
    if (activeTab !== activeTabFromUrl) setActiveTab(activeTabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabFromUrl]);

  const [project, setProject] = useState<Project | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]); // For switcher
  const [club, setClub] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [transactionsReloadToken, setTransactionsReloadToken] = useState(0);

  // Teams under the current club (used for team breadcrumb switcher)
  const [clubTeamsForSwitcher, setClubTeamsForSwitcher] = useState<Project[]>([]);
  const [clubTeamsForSwitcherLoading, setClubTeamsForSwitcherLoading] = useState(false);

  // Fetch organisation with user_role for permissions
  const [orgWithRole, setOrgWithRole] = useState<any>(null);

  // Modal state for view/edit
  const [detailProject, setDetailProject] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  // Season assignment picker (Users tab)
  const [seasonPickerOpen, setSeasonPickerOpen] = useState(false);
  const [seasonPickerMode, setSeasonPickerMode] = useState<'assign' | 'unassign'>('assign');
  const [seasonPickerMember, setSeasonPickerMember] = useState<any | null>(null);

  // Tab Data State
  const [childProjects, setChildProjects] = useState<Project[]>([]);
  const [childProjectsLoading, setChildProjectsLoading] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [compMatchesFilter, setCompMatchesFilter] = useState<'all' | 'with' | 'without'>('all');
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [allMatchesLoading, setAllMatchesLoading] = useState(false);

  // Organisation members (Users tab; mirrors OrganisationDetailPage)
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [orgMembersLoading, setOrgMembersLoading] = useState(false);

  // Users tab filters + paging
  const [memberSearch, setMemberSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userTeamFilterId, setUserTeamFilterId] = useState<string>('');
  const [userSeasonFilterId, setUserSeasonFilterId] = useState<string>('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersLinkedPage, setUsersLinkedPage] = useState(1);
  const [usersUnlinkedPage, setUsersUnlinkedPage] = useState(1);
  const [usersPageSize] = useState(25);

  // Teams tab filters
  const [teamSearch, setTeamSearch] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Seasons tab filters
  const [seasonSearch, setSeasonSearch] = useState('');
  const [seasonTeamFilterId, setSeasonTeamFilterId] = useState<string>('');

  // Competitions tab filters
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [compTeamFilterId, setCompTeamFilterId] = useState<string>('');
  const [compSeasonFilterId, setCompSeasonFilterId] = useState<string>('');

  // Matches tab filters
  const [matchSearch, setMatchSearch] = useState('');
  const [matchTeamFilterId, setMatchTeamFilterId] = useState<string>('');
  const [matchSeasonFilterId, setMatchSeasonFilterId] = useState<string>('');
  const [matchCompetitionFilterId, setMatchCompetitionFilterId] = useState<string>('');

  // Create / Invite modals (match OrganisationDetailPage patterns)
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);

  // Edit modals (view/edit should be popups)
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<any | null>(null);
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  // Hierarchy tab filters
  const [hierarchySearch, setHierarchySearch] = useState('');

  // Edit member role (minimal port)
  const [isEditMemberRoleModalOpen, setIsEditMemberRoleModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<'admin' | 'member'>('member');
  const [editMemberRoleError, setEditMemberRoleError] = useState<string | null>(null);
  const [editMemberRoleSaving, setEditMemberRoleSaving] = useState(false);

  // Edit team membership (access role + functional roles)
  const [isEditTeamMembershipModalOpen, setIsEditTeamMembershipModalOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<any | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string>('');
  const [editingTeamMembershipId, setEditingTeamMembershipId] = useState<string>('');
  const [editingTeamAccessRole, setEditingTeamAccessRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [editingTeamFunctionalRoles, setEditingTeamFunctionalRoles] = useState<string[]>([]);
  const [editingTeamInitialFunctionalRoles, setEditingTeamInitialFunctionalRoles] = useState<string[]>([]);
  const [editTeamMembershipError, setEditTeamMembershipError] = useState<string | null>(null);
  const [editTeamMembershipSaving, setEditTeamMembershipSaving] = useState(false);

  // Period helper functions (matching OrganisationDetailPage pattern)
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

  // Dashboard Data
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<any[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);

  const childTeamsCacheRef = useRef<
    Map<
      string,
      {
        createdAt: number;
        promise: Promise<Project[]>;
      }
    >
  >(new Map());

  const membersCacheRef = useRef<
    Map<
      string,
      {
        createdAt: number;
        members: any[];
      }
    >
  >(new Map());

  const orgMembersFetchTokenRef = useRef(0);

  const getParentProjectId = (p: any): string | null => {
    const parent = p?.parent_project || p?.parent || p?.parent_project_id || p?.parent_id;
    if (!parent) return null;
    if (typeof parent === 'object') return String(parent.id || parent.slug || '');
    return String(parent);
  };

  const apiBaseUrl = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
    return raw.replace(/\/+$/, '');
  }, []);

  const getOrganisationId = (p: any): string | null => {
    const oid = p?.organisation_id || p?.organisation?.id;
    return oid ? String(oid) : null;
  };

  const ensureChildTeamsLoaded = async (projectData?: any): Promise<Project[]> => {
    const proj = projectData || project;
    if (DEBUG_LOGS) console.log(`[ensureChildTeamsLoaded] Called. proj?.id = ${proj?.id}, proj =`, proj);
    if (!proj?.id) {
      if (DEBUG_LOGS) console.log(`[ensureChildTeamsLoaded] No project.id, returning empty array`);
      return [];
    }
    // Don't use cached childProjects - always fetch fresh to avoid stale data
    // (childProjects might be set with partial data from dashboard preview)

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const url = `${apiBaseUrl}/api/v1/projects/?parent_project=${proj.id}&page_size=250`;

    const cacheKey = `${apiBaseUrl}::childTeams::${String(proj.id)}`;
    const cached = childTeamsCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < 60_000) {
      return cached.promise;
    }

    const requestPromise = (async () => {
      if (DEBUG_LOGS) {
        console.log(`[ensureChildTeamsLoaded] Fetching teams for parent project ID: ${proj.id} from ${url}`);
      }
      const results = await fetchAllPages<Project>(url, { credentials: 'include' });
      if (DEBUG_LOGS) console.log(`[ensureChildTeamsLoaded] Raw results: ${results.length} projects`);

    const parentId = String(proj.id);
    const orgId = String(
      (proj as any)?.organisation_id || (proj as any)?.organisation?.id || resolvedOrg?.id || ''
    );

      const filteredByOrg = orgId
        ? (results as any[]).filter((p: any) => String(getOrganisationId(p) || '') === orgId)
        : (results as any[]);
      if (DEBUG_LOGS) {
        console.log(`[ensureChildTeamsLoaded] After org filter (org=${orgId}): ${filteredByOrg.length} projects`);
      }

      const filteredByParent = filteredByOrg.filter((p: any) => getParentProjectId(p) === parentId);
      if (DEBUG_LOGS) {
        console.log(
          `[ensureChildTeamsLoaded] After parent filter (parent=${parentId}): ${filteredByParent.length} projects`
        );
      }
    // For displaying in Teams tab, use direct children only
    const directChildren = filteredByParent.length > 0 ? filteredByParent : [];

      setChildProjects(directChildren as Project[]);
      // Return direct children only (for members, matches, etc.)
      if (DEBUG_LOGS) {
        console.log(`[ensureChildTeamsLoaded] Returning ${directChildren.length} direct child teams`);
      }
      return directChildren as Project[];
    })();

    childTeamsCacheRef.current.set(cacheKey, { createdAt: Date.now(), promise: requestPromise });
    try {
      return await requestPromise;
    } catch (e) {
      childTeamsCacheRef.current.delete(cacheKey);
      throw e;
    }
  };

  const fetchOrgTeamsForPeriodFiltering = async (): Promise<any[]> => {
    // Mirrors OrganisationDetailPage: use org-scoped endpoint to get all teams.
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const orgSlug = String(resolvedOrg?.slug || resolvedOrg?.id || orgId || '').trim();
    if (!orgSlug) return [];

    const params = new URLSearchParams();
    params.set('page_size', '250');
    params.set('parent_project__isnull', 'false');

    const url = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?${params.toString()}`;
    const results = await fetchAllPages<any>(url, { credentials: 'include' });
    return Array.isArray(results) ? results : [];
  };

  const fetchClubTeamsForPeriodScope = async (): Promise<any[]> => {
    // Enforce hierarchy: Team = Project where parent_project = Club.
    // Do NOT fall back to org-wide teams if parent filtering fails.
    const clubIdValue = String(project?.id || '').trim();
    if (!clubIdValue) return [];

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const url = `${apiBaseUrl}/api/v1/projects/?parent_project=${encodeURIComponent(clubIdValue)}&page_size=250`;

    const results = await fetchAllPages<any>(url, { credentials: 'include' });
    const orgIdValue = String(resolvedOrg?.id || (project as any)?.organisation_id || '').trim();

    const filteredByOrg = orgIdValue
      ? (results || []).filter((p: any) => String(getOrganisationId(p) || '') === orgIdValue)
      : (results || []);

    const filteredByParent = (filteredByOrg || []).filter((p: any) => getParentProjectId(p) === clubIdValue);
    return filteredByParent;
  };

  const getDescendantTeamIdsUnderClub = (teams: any[], clubProjectId: string): Set<string> => {
    const clubIdValue = String(clubProjectId);
    const parentById = new Map<string, string | null>();
    for (const t of teams || []) {
      const tid = String(t?.id || '');
      if (!tid) continue;
      parentById.set(tid, getParentProjectId(t));
    }

    const isUnderClub = (teamId: string): boolean => {
      let current: string | null = String(teamId);
      // Protect against cycles / bad data
      for (let i = 0; i < 50; i++) {
        const parent = parentById.get(current);
        if (!parent) return false;
        if (String(parent) === clubIdValue) return true;
        current = String(parent);
      }
      return false;
    };

    const out = new Set<string>();
    for (const t of teams || []) {
      const tid = String(t?.id || '');
      if (!tid) continue;
      if (isUnderClub(tid)) out.add(tid);
    }
    return out;
  };

  const filterActivitiesToClubTeams = (activities: any[], teamIdsUnderClub: Set<string>): any[] => {
    if (!teamIdsUnderClub.size) return [];
    return (activities || []).filter((a: any) => {
      const pid = String(a?.project_id ?? a?.project?.id ?? '');
      return pid && teamIdsUnderClub.has(pid);
    });
  };

  const fetchOrgPeriodsForFiltering = async (opts?: {
    parentId?: string;
    type?: string;
    pageSize?: number;
  }): Promise<any[]> => {
    // Mirrors OrganisationDetailPage: fetch all periods for the organisation.
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const orgIdValue = String(
      resolvedOrg?.id ||
        (project as any)?.organisation?.id ||
        (project as any)?.organisation_id ||
        ''
    ).trim();
    if (!orgIdValue) return [];

    const params = new URLSearchParams();
    params.set('page_size', String(opts?.pageSize ?? 250));
    params.set('organisation_id', orgIdValue);
    if (typeof opts?.parentId === 'string' && opts.parentId.length > 0) {
      params.set('parent_id', opts.parentId);
    }
    if (typeof opts?.type === 'string' && opts.type.length > 0) {
      params.set('type', opts.type);
    }

    const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
    const results = await fetchAllPages<any>(url, { credentials: 'include' });
    return Array.isArray(results) ? results : [];
  };

  const mergeUniqueById = <T extends { id: any }>(items: T[]): T[] => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
      const key = String((item as any)?.id ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  };

  const sortByStartTimeDesc = (items: any[]): any[] => {
    return [...items].sort((a, b) => {
      const ta = a?.start_time ? new Date(a.start_time).getTime() : 0;
      const tb = b?.start_time ? new Date(b.start_time).getTime() : 0;
      return tb - ta;
    });
  };

  // Resolve org and project slugs
  const projectOrg = (project as any)?.organisation || null;
  const resolvedOrg = (orgId
    ? organisations.find(o => o.slug.toLowerCase() === orgId?.toLowerCase() || o.id === orgId)
    : context.organisation) || context.organisation || projectOrg;

  const targetId = projectId || id;

  // Try to find project in context first (if loaded), otherwise use targetId as slug
  const resolvedProject = (targetId
    ? contextProjects.find(p => (p as any).slug?.toLowerCase() === targetId?.toLowerCase() || p.id === targetId)
    : context.project) || context.project;

  const currentProjectSlug = (resolvedProject as any)?.slug || targetId?.toLowerCase(); // Use slug for API calls

  const isTeamRoute = forceMode === 'team' ? true : forceMode === 'club' ? false : Boolean(clubId);
  const clubSlugOrId = clubId || '';

  const orgSlugOrId = resolvedOrg?.slug || resolvedOrg?.id;

  const currentOrgSlug = String(resolvedOrg?.slug || orgId || orgSlugOrId || '').trim();
  const currentClubId = String((clubId ? club?.id : project?.id) || '').trim();
  const currentClubSlugOrId = String((clubId ? (club as any)?.slug || club?.id : (project as any)?.slug || project?.id) || '').trim();

  const getApiV1BaseUrl = () => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
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

    const teamSlugOrId = String(m?.project?.slug || m?.project?.id || m?.project_id || '').trim() || String((project as any)?.slug || project?.id || '').trim();

    const periodId = String(m?.period?.id ?? m?.period_id ?? '').trim();
    const competition = periodId ? (competitions as any[]).find((c: any) => String(c?.id) === periodId) : null;
    const compSeasonId = String(competition?.parent_period_id ?? competition?.parent_period?.id ?? '').trim();
    const season = compSeasonId ? (seasons as any[]).find((s: any) => String((s as any)?.id) === compSeasonId) : null;

    const seasonSlugOrId = String((season as any)?.slug || (season as any)?.id || compSeasonId || '').trim();
    const compSlugOrId = String((competition as any)?.slug || (competition as any)?.id || periodId || '').trim();

    if (currentOrgSlug && currentClubSlugOrId && teamSlugOrId && seasonSlugOrId && compSlugOrId) {
      return `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${compSlugOrId}/${matchSlugOrId}`;
    }

    return `/matches/${matchSlugOrId}`;
  };

  const createModalOrganisations = useMemo(() => {
    const o = resolvedOrg?.id ? [{ id: String(resolvedOrg.id), name: resolvedOrg.name, slug: (resolvedOrg as any).slug }] : [];
    return o as any[];
  }, [resolvedOrg?.id, resolvedOrg?.name, (resolvedOrg as any)?.slug]);

  const createModalClubs = useMemo(() => {
    const c = !clubId && project?.id ? [project] : club?.id ? [club] : [];
    return c as any[];
  }, [clubId, project, club]);

  const clubsListPath = orgSlugOrId ? `/clubs?org_id=${encodeURIComponent(String(orgSlugOrId))}` : '/clubs';

  // Check superadmin status - match the logic in useFeatureFlag
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) ||
                       Boolean((user as any)?.is_staff) ||
                       userRole === 'superadmin' ||
                       userRole === 'super admin';

  // Use orgWithRole (fetched with user_role) if available, otherwise fallback to project.organisation or resolvedOrg
  const orgForPermissions = orgWithRole || (project as any)?.organisation || resolvedOrg;

  // Debug: Log permission context
  if (DEBUG_LOGS) {
    console.log('[ProjectDetailPage] Permission Debug:', {
      isSuperAdmin,
      orgForPermissions: orgForPermissions,
      user_role: (orgForPermissions as any)?.user_role,
      orgWithRole: orgWithRole,
      projectOrgFromData: (project as any)?.organisation,
      resolvedOrg: resolvedOrg,
    });
  }

  const permissionContext = {
    currentOrganisation: orgForPermissions as any,
    isSuperAdmin,
  };
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  const userCanManageMembers = userCanEditProject;

  const fetchOrgMembers = async (force = false) => {
    if (orgMembersLoading) return;
    const fetchToken = ++orgMembersFetchTokenRef.current;
    const haveMembershipDetails = orgMembers.some((item: any) => {
      const u = item?.user || item;
      const details =
        (item as any)?.project_membership_details ||
        (u as any)?.project_membership_details ||
        (item as any)?.project_memberships_details ||
        (u as any)?.project_memberships_details;
      return Array.isArray(details);
    });
    if (!force && orgMembers.length > 0 && haveMembershipDetails) return;
    if (!currentOrgSlug) return;

    // Detail pages should avoid loading the full organisation roster whenever possible.
    // - Team pages: load only members for this team.
    // - Club pages: load only members for this club + its teams.
    const teamIdForMembers = (isTeamRoute || isLikelyTeam) ? String(project?.id || '').trim() : '';
    const clubIdForMembers = !teamIdForMembers && !isLikelyTeam ? String(currentClubId || '').trim() : '';

    setOrgMembersLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();

      if (teamIdForMembers) {
        const params = new URLSearchParams();
        params.set('page_size', '500');
        const url = `${apiV1BaseUrl}/projects/${encodeURIComponent(teamIdForMembers)}/members/?${params.toString()}`;
        const memberships = await fetchAllPages<any>(
          url,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(resolvedOrg?.id || (project as any)?.organisation_id || ''),
            },
            credentials: 'include',
          },
          force ? { bypass: true } : undefined
        );

        // If the fast-path endpoint returns nothing (often due to permission or endpoint issues),
        // fall back to the organisation members endpoint below.
        if (!Array.isArray(memberships) || memberships.length === 0) {
          // do not early-return; let the broader org roster load handle this case
        } else {
          const inferredClubId = String((club as any)?.id || currentClubId || '').trim();
          const byOrgMembershipId = new Map<string, any>();
          for (const pm of memberships || []) {
            const orgMembershipId = String(pm?.organisation_membership_id || '').trim();
            const userObj = pm?.user;
            const userId = String(userObj?.id || '').trim();
            const key = orgMembershipId || (userId ? `user:${userId}` : String(pm?.id || ''));
            if (!key) continue;

            const existing = byOrgMembershipId.get(key);
            const normalizedPm = {
              ...pm,
              project_id: teamIdForMembers,
              club_id: inferredClubId || undefined,
              project: {
                id: String((project as any)?.id || teamIdForMembers),
                slug: String((project as any)?.slug || ''),
                name: String((project as any)?.name || ''),
              },
              // Normalise to the shapes expected by the rest of this page
              period_id: pm?.period_id ?? pm?.period ?? null,
            };

            if (!existing) {
              byOrgMembershipId.set(key, {
                id: orgMembershipId || key,
                user: userObj,
                // Keep org membership role unknown in this fast path.
                project_memberships: [normalizedPm],
                project_membership_details: [normalizedPm],
              });
            } else {
              existing.project_memberships = [...(existing.project_memberships || []), normalizedPm];
              existing.project_membership_details = [...(existing.project_membership_details || []), normalizedPm];
            }
          }

          setOrgMembers(Array.from(byOrgMembershipId.values()));
          return;
        }
      }

      if (clubIdForMembers) {
        const byOrgMembershipId = new Map<string, any>();
        const clubProject = project;

        const mergeMembership = (pm: any, projectInfo: any) => {
          const orgMembershipId = String(pm?.organisation_membership_id || '').trim();
          const userObj = pm?.user;
          const userId = String(userObj?.id || '').trim();
          const key = orgMembershipId || (userId ? `user:${userId}` : String(pm?.id || ''));
          if (!key) return;

          const existing = byOrgMembershipId.get(key);
          const normalizedPm = {
            ...pm,
            project_id: String(projectInfo?.id || pm?.project_id || pm?.project?.id || '').trim(),
            club_id: clubIdForMembers,
            project: {
              id: String(projectInfo?.id || ''),
              slug: String(projectInfo?.slug || ''),
              name: String(projectInfo?.name || ''),
            },
            period_id: pm?.period_id ?? pm?.period ?? null,
          };

          if (!existing) {
            byOrgMembershipId.set(key, {
              id: orgMembershipId || key,
              user: userObj,
              project_memberships: [normalizedPm],
              project_membership_details: [normalizedPm],
            });
          } else {
            existing.project_memberships = [...(existing.project_memberships || []), normalizedPm];
            existing.project_membership_details = [...(existing.project_membership_details || []), normalizedPm];
          }
        };

        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': String(resolvedOrg?.id || (project as any)?.organisation_id || ''),
        };

        const params = new URLSearchParams();
        params.set('page_size', '500');

        const clubMembersUrl = `${apiV1BaseUrl}/projects/${encodeURIComponent(String(clubIdForMembers))}/members/?${params.toString()}`;

        // Progressive: show club direct members first.
        const clubFirstPage = await fetchAllPages<any>(
          clubMembersUrl,
          { headers, credentials: 'include' },
          { ...(force ? { bypass: true } : undefined), maxPages: 1 }
        );
        for (const pm of clubFirstPage || []) {
          mergeMembership(pm, clubProject);
        }

        // If the club itself has no direct project memberships (common), eagerly merge the first page
        // of each child team roster so the Users tab isn't empty while background fetch continues.
        try {
          const teams = await ensureChildTeamsLoaded(clubProject);
          const teamList = Array.isArray(teams) ? teams : [];
          for (const t of teamList) {
            const teamId = String((t as any)?.id || '').trim();
            if (!teamId) continue;
            const teamMembersUrl = `${apiV1BaseUrl}/projects/${encodeURIComponent(teamId)}/members/?${params.toString()}`;
            const teamFirstPage = await fetchAllPages<any>(
              teamMembersUrl,
              { headers, credentials: 'include' },
              { ...(force ? { bypass: true } : undefined), maxPages: 1 }
            );
            for (const pm of teamFirstPage || []) mergeMembership(pm, t);
          }
        } catch (e) {
          console.warn('[ProjectDetailPage] Club team roster first-page fetch failed:', e);
        }

        if (orgMembersFetchTokenRef.current === fetchToken) {
          const merged = Array.from(byOrgMembershipId.values());
          if (merged.length > 0) {
            setOrgMembers(merged);
          } else {
            // Final fallback: load org members (full roster) so club pages never render empty.
            // This uses the same includes as the org-members branch below.
            const membersParams = new URLSearchParams();
            membersParams.set('include_project_memberships', 'true');
            membersParams.set('include_role_assignments', 'true');
            membersParams.set('include_project_membership_details', 'true');
            membersParams.set('page_size', '500');

            const membersUrl = `${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/members/?${membersParams.toString()}`;

            const firstPage = await fetchAllPages<any>(
              membersUrl,
              { headers, credentials: 'include' },
              { ...(force ? { bypass: true } : undefined), maxPages: 1 }
            );
            setOrgMembers(Array.isArray(firstPage) ? firstPage : []);
          }
        }

        // Background: fetch all team members and merge.
        void (async () => {
          try {
            const teams = await ensureChildTeamsLoaded(clubProject);
            const teamList = Array.isArray(teams) ? teams : [];

            // Ensure club direct members are complete (cached first page will be reused).
            const clubAll = await fetchAllPages<any>(
              clubMembersUrl,
              { headers, credentials: 'include' },
              force ? { bypass: true } : undefined
            );
            for (const pm of clubAll || []) mergeMembership(pm, clubProject);
            if (orgMembersFetchTokenRef.current === fetchToken) {
              setOrgMembers(Array.from(byOrgMembershipId.values()));
            }

            for (const t of teamList) {
              const teamId = String((t as any)?.id || '').trim();
              if (!teamId) continue;
              const teamMembersUrl = `${apiV1BaseUrl}/projects/${encodeURIComponent(teamId)}/members/?${params.toString()}`;
              const teamMembers = await fetchAllPages<any>(
                teamMembersUrl,
                { headers, credentials: 'include' },
                force ? { bypass: true } : undefined
              );
              for (const pm of teamMembers || []) mergeMembership(pm, t);
              if (orgMembersFetchTokenRef.current === fetchToken) {
                setOrgMembers(Array.from(byOrgMembershipId.values()));
              }
            }
          } catch (e) {
            console.warn('[ProjectDetailPage] Background club members fetch failed:', e);
          }
        })();

        return;
      }

      const params = new URLSearchParams();
      params.set('include_project_memberships', 'true');
      params.set('include_role_assignments', 'true');
      params.set('include_project_membership_details', 'true');
      // Bigger pages reduce perceived latency (fewer roundtrips).
      params.set('page_size', '500');

      const membersUrl = `${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/members/?${params.toString()}`;

      // Progressive load: show the first page ASAP, then fill in remaining pages.
      const firstPage = await fetchAllPages<any>(
        membersUrl,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(resolvedOrg?.id || (project as any)?.organisation_id || ''),
          },
          credentials: 'include',
        },
        { ...(force ? { bypass: true } : undefined), maxPages: 1 }
      );

      if (orgMembersFetchTokenRef.current === fetchToken) {
        setOrgMembers(firstPage);
      }

      // Background: fetch the complete roster (uses cached first page).
      void (async () => {
        try {
          const allMembers = await fetchAllPages<any>(
            membersUrl,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Organisation-ID': String(resolvedOrg?.id || (project as any)?.organisation_id || ''),
              },
              credentials: 'include',
            },
            force ? { bypass: true } : undefined
          );
          if (orgMembersFetchTokenRef.current === fetchToken) {
            setOrgMembers(allMembers);
          }
        } catch (e) {
          // keep first page
          console.warn('[ProjectDetailPage] Background org members fetch failed:', e);
        }
      })();
    } catch (e) {
      console.error('[ProjectDetailPage] Org members fetch failed:', e);
      setOrgMembers([]);
    } finally {
      setOrgMembersLoading(false);
    }
  };

  const saveMemberRole = async () => {
    if (!editingMember) return;
    const membershipId = String(editingMember?.id || '').trim();
    if (!membershipId) return;

    setEditMemberRoleError(null);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const res = await fetch(`${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/members/${membershipId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ role: editingMemberRole }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to update role');
      }

      setOrgMembers((prev) => prev.map((m: any) => (String(m.id) === String(membershipId) ? { ...m, role: editingMemberRole } : m)));
      setIsEditMemberRoleModalOpen(false);
      setEditingMember(null);
    } catch (e) {
      setEditMemberRoleError(e instanceof Error ? e.message : 'Failed to update role');
    }
  };

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

  const getFunctionalRolesFromPm = (pm: any): string[] => {
    const direct = (pm as any)?.functional_roles ?? (pm as any)?.functionalRoles;
    if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);
    const meta = (pm as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  const openTeamMembershipModal = (args: { item: any; teamId: string }) => {
    const { item, teamId } = args;
    const tid = String(teamId || '').trim();
    if (!tid) return;

    const u = item?.user || item;
    const pms =
      (item as any)?.project_memberships ||
      (u as any)?.project_memberships ||
      (item as any)?.project_membership_details ||
      (u as any)?.project_membership_details ||
      [];
    const list = Array.isArray(pms) ? pms : [];

    const matchesTeam = (pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '').trim() === tid;
    const isBaseMembership = (pm: any) => !String(pm?.period_id ?? pm?.period ?? '').trim();
    const basePm = list.find((pm: any) => matchesTeam(pm) && isBaseMembership(pm));
    const anyPm = list.find((pm: any) => matchesTeam(pm));
    const pm = basePm || anyPm;

    const pmId = String(pm?.id ?? '').trim();
    const roleRaw = String(pm?.role ?? '').trim().toLowerCase();
    const access: 'viewer' | 'editor' | 'admin' = roleRaw === 'admin' ? 'admin' : roleRaw === 'editor' ? 'editor' : 'viewer';
    const fr = getFunctionalRolesFromPm(pm);

    setEditingTeamMember(item);
    setEditingTeamId(tid);
    setEditingTeamMembershipId(pmId);
    setEditingTeamAccessRole(access);
    setEditingTeamFunctionalRoles(fr);
    setEditingTeamInitialFunctionalRoles(fr);
    setEditTeamMembershipError(null);
    setIsEditTeamMembershipModalOpen(true);
  };

  const saveTeamMembership = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const tid = String(editingTeamId || '').trim();
    if (!tid) throw new Error('Team missing');
    if (!editingTeamMembershipId) throw new Error('User has no membership for this team');

    // 1) Update access role
    const roleRes = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(tid)}/members/${encodeURIComponent(String(editingTeamMembershipId))}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({ role: editingTeamAccessRole }),
      }
    );
    if (!roleRes.ok) {
      const text = await roleRes.text().catch(() => '');
      throw new Error(text || 'Failed to update access role');
    }

    // 2) Update functional roles (diff)
    const u = (editingTeamMember as any)?.user || editingTeamMember;
    const userId = Number(u?.id);
    if (!userId) throw new Error('User id missing');

    const prev = new Set((editingTeamInitialFunctionalRoles || []).map((r) => String(r || '').trim()).filter(Boolean));
    const next = new Set((editingTeamFunctionalRoles || []).map((r) => String(r || '').trim()).filter(Boolean));
    const toAdd = Array.from(next).filter((r) => !prev.has(r));
    const toRemove = Array.from(prev).filter((r) => !next.has(r));

    if (toAdd.length) {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(tid)}/functional-roles/assign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken() || '',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: userId, roles: toAdd }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to assign functional roles');
      }
    }
    if (toRemove.length) {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(tid)}/functional-roles/unassign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken() || '',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: userId, roles: toRemove }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Failed to unassign functional roles');
      }
    }

    setEditingTeamInitialFunctionalRoles(Array.from(next.values()).sort((a, b) => a.localeCompare(b)));
    await fetchOrgMembers(true);
  };

  const saveProjectEdits = async (projectToEdit: any, patch: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const projectSlugOrId = String(projectToEdit?.slug || projectToEdit?.id || '').trim();
    if (!projectSlugOrId) throw new Error('Missing project id');

    const endpoint = currentOrgSlug
      ? `${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/projects/${encodeURIComponent(projectSlugOrId)}/`
      : `${apiV1BaseUrl}/projects/${encodeURIComponent(projectSlugOrId)}/`;

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save project');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...projectToEdit, ...patch };

    setProject((prev) => (prev && String(prev.id) === String(updated.id) ? { ...(prev as any), ...(updated as any) } : prev));
    setChildProjects((prev) => prev.map((p: any) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)));
  };

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const periodId = String(periodToEdit?.id || '').trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await fetch(`${apiV1BaseUrl}/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save period');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...periodToEdit, ...patch };

    setSeasons((prev) => prev.map((p: any) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)));
    setCompetitions((prev) => prev.map((p: any) => (String(p.id) === String(updated.id) ? { ...p, ...updated } : p)));
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const apiV1BaseUrl = getApiV1BaseUrl();
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const res = await fetch(`${apiV1BaseUrl}/activities/${encodeURIComponent(matchId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken() || '',
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save match');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };

    setAllMatches((prev) => prev.map((m: any) => (String(m.id) === String(updated.id) ? { ...m, ...updated } : m)));
  };

  if (DEBUG_LOGS) {
    console.log('[ProjectDetailPage] Permission Results:', {
      userCanEditProject,
      userCanDeleteProject,
    });
  }

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const orgSlug = String(resolvedOrg?.slug || resolvedOrg?.id || '').trim();
      const projectSlugOrId = String((project as any)?.slug || project.id);
      const endpoint = orgSlug
        ? `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/${encodeURIComponent(projectSlugOrId)}/`
        : `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectSlugOrId)}/`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project (${response.status})`);
      }

      navigate(clubsListPath);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete project');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Prefer canonical org slug in the URL when the user arrived via an ID-based link.
  useEffect(() => {
    if (!orgId) return;
    if (context.isLoading) return;
    if (!resolvedOrg?.slug || !resolvedOrg?.id) return;

    const orgIdLooksLikeId = String(orgId) === String(resolvedOrg.id);
    const orgIdAlreadySlug = String(orgId).toLowerCase() === String(resolvedOrg.slug).toLowerCase();
    if (!orgIdLooksLikeId || orgIdAlreadySlug) return;

    const targetOrg = resolvedOrg.slug;

    // Keep the rest of the path identical, only swap the org segment.
    if (clubId) {
      navigate(`/organisations/${targetOrg}/projects/${clubId}/teams/${projectId}`, { replace: true });
    } else {
      navigate(`/organisations/${targetOrg}/projects/${projectId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, resolvedOrg?.id, resolvedOrg?.slug, clubId, projectId, context.isLoading]);

  // Breadcrumb context switcher setup
  const {
    organisationOptions,
    projectOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: orgProjects.map(p => ({ id: String(p.id), name: p.name, slug: p.slug || '', organisation_id: String(p.organisation_id) })),
    users: [],
    context: {
      currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : (project?.organisation_id ? String(project.organisation_id) : undefined),
      currentProjectId: resolvedProject?.id ? String(resolvedProject.id) : (project?.id ? String(project.id) : undefined),
    },
    basePath: '',
  });

  // Custom handlers for navigation
  const handleProjectSwitch = (option: BreadcrumbSwitcherOption) => {
    navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${option.slug || option.id}`);
  };


  // Fetch projects for the current organisation (for switcher dropdown)
  useEffect(() => {
    const fetchOrgProjects = async () => {
      const orgId = resolvedOrg?.id || (project as any)?.organisation?.id || (project as any)?.organisation_id;
      if (!orgId) return;

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const orgSlug =
          resolvedOrg?.slug ||
          (project as any)?.organisation?.slug ||
          organisations.find(o => o.id === orgId)?.slug ||
          (typeof orgId === 'string' ? orgId : undefined);
        if (!orgSlug) return;

        const response = await fetch(
          // For the club detail context switcher we only want clubs (root projects), not teams.
          `${apiBaseUrl}/api/v1/organisations/${orgSlug}/projects/?page_size=250&parent_project__isnull=true`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (response.ok) {
          const rawData = await response.json();
          // Handle B13 envelope: {data: {results: [...]}} or direct {results: [...]}
          const data = rawData.data || rawData;
          const results = data.results || data.data?.results || [];

          // Map API response to match expected format (organisation_id snake_case)
          const mapped = results.map((p: any) => ({
            ...p,
            organisation_id: p.organisation?.id || p.organisation_id || orgId
          }));
          setOrgProjects(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch org projects for switcher:', err);
      }
    };

    fetchOrgProjects();
  }, [resolvedOrg?.id, resolvedOrg?.slug, project?.organisation_id, organisations]);

  // Reset tab state when project changes (via context switcher)
  useEffect(() => {
    // Reset to overview tab
    setActiveTab('overview');

    // Clear all tab data
    setChildProjects([]);
    setSeasons([]);
    setCompetitions([]);
    setAllMatches([]);
    setMembers([]);

    // Reset loading states
    setChildProjectsLoading(false);
    setSeasonsLoading(false);
    setCompetitionsLoading(false);
    setAllMatchesLoading(false);
  }, [currentProjectSlug, clubSlugOrId]); // Trigger when project or club changes

  useEffect(() => {
    const fetchProjectDetails = async () => {
      // Wait for context to load before attempting fetch if we have a potential slug
      if (context.isLoading) return;

      if (!currentProjectSlug) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch project details
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const looksLikeIdentifier = (value: string) => {
          const v = String(value || '').trim();
          if (!v) return false;
          if (/^\d+$/.test(v)) return true;
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) return true;
          return false;
        };

        // Use nested route if we have org context, otherwise top-level
        let endpoint = resolvedOrg
          ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/`
          : `${apiBaseUrl}/api/v1/projects/${currentProjectSlug}/`;

        // Team slugs are only unique within a club. When we're on a team route
        // and the URL provides the club segment, resolve via the club-scoped endpoint.
        if (
          resolvedOrg &&
          isTeamRoute &&
          clubSlugOrId &&
          currentProjectSlug &&
          !looksLikeIdentifier(currentProjectSlug)
        ) {
          endpoint = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(
            resolvedOrg.slug
          )}/projects/${encodeURIComponent(clubSlugOrId)}/teams/${encodeURIComponent(
            currentProjectSlug
          )}/`;
        }

        const projectResponse = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (!projectResponse.ok) {
          throw new Error(`Failed to fetch project (${projectResponse.status})`);
        }

        const rawProjectData = await projectResponse.json();
        // Handle B13 response envelope
        const projectData = rawProjectData.data || rawProjectData;
        setProject(projectData);

        const projectIdForApi = String((projectData as any)?.id || '');

        // If a team is accessed via the legacy URL (/organisations/:org/projects/:team),
        // try to redirect to the nested team URL with club in between.
        if (!isTeamRoute) {
          const parent =
            (projectData as any)?.parent_project ||
            (projectData as any)?.parent ||
            (projectData as any)?.parent_id ||
            (projectData as any)?.parent_project_id ||
            null;

          const parentName = (projectData as any)?.parent_name || null;

          let inferredClubSlugOrId: string | null = null;
          if (parent && typeof parent === 'object') {
            inferredClubSlugOrId = String((parent as any).slug || (parent as any).id || '');
          } else if (parent) {
            inferredClubSlugOrId = String(parent);
          }

          if (inferredClubSlugOrId && orgSlugOrId) {
            navigate(
              `/organisations/${orgSlugOrId}/projects/${encodeURIComponent(inferredClubSlugOrId)}/teams/${encodeURIComponent(
                String((projectData as any).slug || (projectData as any).id)
              )}`,
              { replace: true }
            );
            return;
          }

          // Best-effort: if we only have parent_name, we cannot safely map to a slug.
          // In that case we keep rendering, but breadcrumbs will still point users to Clubs.
          if (parentName) {
            // no-op
          }
        }

        if (isTeamRoute && clubSlugOrId) {
          try {
            const clubRes = await fetch(
              `${apiBaseUrl}/api/v1/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${clubSlugOrId}/`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
              }
            );
            if (clubRes.ok) {
              const rawClub = await clubRes.json();
              const clubData = rawClub.data || rawClub;
              setClub(clubData);
            }
          } catch {
            // ignore
          }
        }

        // Fetch project members
        // IMPORTANT: The working API shape elsewhere in the demo uses numeric project IDs.
        // Slug-based /projects/:slug/members/ can 500.
        try {
          if (!projectIdForApi) {
            setMembers([]);
          } else {
            const membersCacheKey = `members:${String(projectIdForApi)}:${isTeamRoute ? 'team' : 'club'}`;
            const cachedMembers = membersCacheRef.current.get(membersCacheKey);
            if (cachedMembers && Date.now() - cachedMembers.createdAt < 60_000) {
              setMembers(cachedMembers.members);
            } else {
            const membersByIdEndpoint = `${apiBaseUrl}/api/v1/projects/${projectIdForApi}/members/`;
            const membersByIdResponse = await fetch(membersByIdEndpoint, {
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
              },
              credentials: 'include',
            });

            if (membersByIdResponse.ok) {
              const membersData = await membersByIdResponse.json();
              const membersList = getPagedResults(membersData);
              const normalized = Array.isArray(membersList) ? membersList : [];

              // For clubs: always fetch team members to show complete roster
              // (club may have direct memberships for admins, but teams have players)
              if (!isTeamRoute) {
                const teams = await ensureChildTeamsLoaded(projectData);
                const teamIds = Array.from(teams.map((t: any) => String(t.id)));

                if (DEBUG_LOGS) {
                  console.log(`[ProjectDetailPage] Fetching members for ${teamIds.length} teams:`, teamIds);
                }

                // Fetch members per team to avoid pagination issues
                // (org-wide fetch with page_size=250 only returns subset of members)
                const allMembersMap = new Map<string, any>();

                // Include club's direct members first (usually admins/staff)
                for (const member of normalized) {
                  const userId = member.user?.id || member.id;
                  if (userId) {
                    // Ensure project_id is set for club direct members
                    const memberWithProject = {
                      ...member,
                      project_id: member.project_id || projectIdForApi,
                    };
                    allMembersMap.set(String(userId), memberWithProject);
                  }
                }

                // Then fetch members from all child teams
                for (const teamId of teamIds) {
                  const teamMembersEndpoint = `${apiBaseUrl}/api/v1/projects/${teamId}/members/`;
                  try {
                    // Use fetchAllPages to get all members, not just first page (20 results)
                    const teamMembersList = await fetchAllPages<any>(teamMembersEndpoint, {
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                      },
                      credentials: 'include',
                    });
                    if (DEBUG_LOGS) {
                      console.log(`[ProjectDetailPage] Team ${teamId} returned ${teamMembersList.length} members`);
                    }

                    // Add to map to deduplicate (users can be in multiple teams)
                    for (const member of teamMembersList) {
                      const userId = member.user?.id || member.id;
                      if (userId && !allMembersMap.has(String(userId))) {
                        // Ensure project_id is explicitly set to the team ID
                        const memberWithProject = {
                          ...member,
                          project_id: member.project_id || teamId,
                        };
                        allMembersMap.set(String(userId), memberWithProject);
                      }
                    }
                  } catch (err) {
                    console.warn(`[ProjectDetailPage] Failed to fetch members for team ${teamId}:`, err);
                  }
                }

                const clubMembers = Array.from(allMembersMap.values());
                setMembers(clubMembers);
                membersCacheRef.current.set(membersCacheKey, { createdAt: Date.now(), members: clubMembers });
                if (DEBUG_LOGS) {
                  console.log(
                    `[ProjectDetailPage] Club members loaded: ${clubMembers.length} unique members (${normalized.length} direct + ${clubMembers.length - normalized.length} from teams)`
                  );
                }
              } else {
                setMembers(normalized);
                membersCacheRef.current.set(membersCacheKey, { createdAt: Date.now(), members: normalized });
              }
            } else {
              console.error(
                `[ProjectDetailPage] Project members endpoint failed with status ${membersByIdResponse.status} for ${membersByIdEndpoint}`
              );

              // Fallback: For clubs, fetch members per team instead of org-wide filtering
              if (!isTeamRoute) {
                const teams = await ensureChildTeamsLoaded(projectData);
                const teamIds = Array.from(teams.map((t: any) => String(t.id)));

                const allMembersMap = new Map<string, any>();

                for (const teamId of teamIds) {
                  const teamMembersEndpoint = `${apiBaseUrl}/api/v1/projects/${teamId}/members/`;
                  try {
                    // Use fetchAllPages to get all members, not just first page
                    const teamMembersList = await fetchAllPages<any>(teamMembersEndpoint, {
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                      },
                      credentials: 'include',
                    });

                    for (const member of teamMembersList) {
                      const userId = member.user?.id || member.id;
                      if (userId && !allMembersMap.has(String(userId))) {
                        // Ensure project_id is explicitly set to the team ID
                        const memberWithProject = {
                          ...member,
                          project_id: member.project_id || teamId,
                        };
                        allMembersMap.set(String(userId), memberWithProject);
                      }
                    }
                  } catch (err) {
                    console.warn(`[ProjectDetailPage] Fallback: Failed to fetch members for team ${teamId}:`, err);
                  }
                }

                const clubMembers = Array.from(allMembersMap.values());
                setMembers(clubMembers);
                membersCacheRef.current.set(membersCacheKey, { createdAt: Date.now(), members: clubMembers });
                if (DEBUG_LOGS) {
                  console.log(
                    `[ProjectDetailPage] Fallback: Loaded ${clubMembers.length} unique club members from ${teamIds.length} teams`
                  );
                }
              } else {
                setMembers([]);
                membersCacheRef.current.set(membersCacheKey, { createdAt: Date.now(), members: [] });
              }
            }
            }
          }
        } catch (membersErr) {
          console.error('[ProjectDetailPage] Members fetch error:', membersErr);
          setMembers([]);
        }

        // Fetch recent audit events for this project
        // Backend route is /api/v1/activity/ (AuditEventViewSet) and filtering uses `project=<project_id>`.
        const projectIdForAudit = String(resolvedProject?.id ?? project?.id ?? '');
        if (projectIdForAudit) {
          const eventsResponse = await fetch(
            `${apiBaseUrl}/api/v1/activity/?project=${encodeURIComponent(projectIdForAudit)}&limit=10`,
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
              },
              credentials: 'include',
            }
          );

          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            setRecentEvents(eventsData.data?.results || eventsData.results || []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project details');
        console.error('Project detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [
    currentProjectSlug,
    resolvedOrg?.id,
    resolvedOrg?.slug,
    context.isLoading,
    isTeamRoute,
    clubSlugOrId,
    orgSlugOrId,
    resolvedProject?.id,
  ]);

  // Fetch organisation with user_role for permissions
  useEffect(() => {
    const fetchOrgWithUserRole = async () => {
      if (!project) return;

      // If project.organisation already has user_role, use it
      if ((project as any)?.organisation?.user_role) {
        setOrgWithRole((project as any).organisation);
        return;
      }

      // Otherwise fetch the organisation explicitly
      const orgIdOrSlug = (project as any)?.organisation_id || (project as any)?.organisation?.id || resolvedOrg?.id || resolvedOrg?.slug;
      if (!orgIdOrSlug) return;

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const orgSlug = resolvedOrg?.slug || orgIdOrSlug;
        const orgResponse = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (orgResponse.ok) {
          const rawOrgData = await orgResponse.json();
          const orgData = rawOrgData.data || rawOrgData;
          setOrgWithRole(orgData);
          if (DEBUG_LOGS) console.log('[ProjectDetailPage] Org with user_role fetched:', orgData);
        }
      } catch (err) {
        console.error('[ProjectDetailPage] Failed to fetch org with user_role:', err);
      }
    };

    fetchOrgWithUserRole();
  }, [project?.id, resolvedOrg?.id, resolvedOrg?.slug]);

  // Fetch Tab Data Handlers
  const fetchChildTeams = async () => {
     if (!project?.id) return;
     setChildProjectsLoading(true);
     const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
     try {
       // Fetch children of this project
       const url = `${apiBaseUrl}/api/v1/projects/?parent_project=${project.id}&page_size=250`;
       const results = await fetchAllPages<Project>(url, { credentials: 'include' });

       const parentId = String(project.id);
       const orgId = String((project as any)?.organisation_id || (project as any)?.organisation?.id || resolvedOrg?.id || '');

       // Server-side parent_project filtering appears unreliable in production.
       // We defensively filter by organisation + actual parent id.
       const filteredByOrg = orgId
         ? (results as any[]).filter((p: any) => String(getOrganisationId(p) || '') === orgId)
         : (results as any[]);

       const filteredByParent = filteredByOrg.filter((p: any) => getParentProjectId(p) === parentId);
       // IMPORTANT: If a club has no teams, we must show an empty list.
       // Falling back to org-wide teams here causes confusing UX.
       setChildProjects(filteredByParent as Project[]);
     } catch (e) {
       console.error('Failed to fetch child teams', e);
       setChildProjects([]);
     } finally {
       setChildProjectsLoading(false);
     }
  };

  const fetchClubTeamsForSwitcher = async () => {
    if (!isTeamRoute) return;
    const clubIdForTeams = (club as any)?.id;
    if (!clubIdForTeams) return;

    setClubTeamsForSwitcherLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const url = `${apiBaseUrl}/api/v1/projects/?parent_project=${clubIdForTeams}&page_size=250`;
      const results = await fetchAllPages<Project>(url, { credentials: 'include' });

      const parentId = String(clubIdForTeams);
      const orgId = String((club as any)?.organisation_id || (club as any)?.organisation?.id || resolvedOrg?.id || '');

      const filteredByOrg = orgId
        ? (results as any[]).filter((p: any) => String(getOrganisationId(p) || '') === orgId)
        : (results as any[]);
      const filteredByParent = filteredByOrg.filter((p: any) => getParentProjectId(p) === parentId);
      setClubTeamsForSwitcher(filteredByParent as Project[]);
    } catch (e) {
      console.error('Failed to fetch club teams for switcher', e);
      setClubTeamsForSwitcher([]);
    } finally {
      setClubTeamsForSwitcherLoading(false);
    }
  };

  useEffect(() => {
    if (!isTeamRoute) return;
    if (!club?.id) return;
    fetchClubTeamsForSwitcher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeamRoute, club?.id]);

  const fetchSeasons = async () => {
    if (!project?.id) return;
    setSeasonsLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      if (isLikelyTeam) {
        // Teams: fetch root season periods server-side (fast + annotated counts)
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('type', 'season');
        params.set('parent_id', 'null');
        params.set('page_size', '500');

        const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
        const results = await fetchAllPagesCached<any>(
          url,
          { credentials: 'include' },
          { ttlMs: 60_000, cacheKey: `periods:team:seasons:${project.id}` }
        );

        const uniqueSeasons = Array.from(new Map((results || []).map((s: any) => [String(s.id), s])).values());
        setSeasons(uniqueSeasons);
      } else {
        // Clubs: fetch seasons scoped to the teams under this club (avoid org-wide periods scan)
        const clubIdValue = String(project.id);
        const teams = await fetchClubTeamsForPeriodScope();
        const teamIds = new Set(
          (teams || []).map((t: any) => String(t?.id || '')).filter(Boolean)
        );

        if (teamIds.size === 0) {
          console.log('[fetchSeasons] Club view: No teams found, returning empty');
          setSeasons([]);
          return;
        }

        const allTeamIds = Array.from(teamIds);
        const chunkSize = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < allTeamIds.length; i += chunkSize) {
          chunks.push(allTeamIds.slice(i, i + chunkSize));
        }

        const chunkResults = await Promise.all(
          chunks.map((chunk, idx) => {
            const params = new URLSearchParams();
            params.set('project_id__in', chunk.join(','));
            params.set('type', 'season');
            params.set('parent_id', 'null');
            params.set('page_size', '500');
            const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
            return fetchAllPagesCached<any>(
              url,
              { credentials: 'include' },
              { ttlMs: 60_000, cacheKey: `periods:club:seasons:${clubIdValue}:${idx}` }
            );
          })
        );

        const merged = mergeUniqueById(chunkResults.flat());
        setSeasons(merged);
      }
    } catch (e) {
      console.error('Failed to fetch seasons', e);
    } finally {
      setSeasonsLoading(false);
    }
  };

  const fetchCompetitions = async () => {
    if (!project?.id) return;
    setCompetitionsLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      if (isLikelyTeam) {
        // Teams: fetch competitions by fetching direct children of each season
        const teamId = String(project.id);
        const seasonsToUse = (seasons || []).filter(isSeasonPeriod);

        const ensureSeasons = async (): Promise<any[]> => {
          if (seasonsToUse.length) return seasonsToUse as any[];
          const params = new URLSearchParams();
          params.set('project_id', teamId);
          params.set('type', 'season');
          params.set('parent_id', 'null');
          params.set('page_size', '500');
          const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
          return await fetchAllPagesCached<any>(
            url,
            { credentials: 'include' },
            { ttlMs: 60_000, cacheKey: `periods:team:seasons:${teamId}` }
          );
        };

        const seasonsList = await ensureSeasons();
        const seasonIds = (seasonsList || []).map((s: any) => String(s?.id || '')).filter(Boolean);
        if (!seasonIds.length) {
          setCompetitions([]);
          return;
        }

        const competitionsChunks = await Promise.all(
          seasonIds.map((seasonId: string) => {
            const url = `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(seasonId)}&page_size=500`;
            return fetchAllPagesCached<any>(
              url,
              { credentials: 'include' },
              { ttlMs: 60_000, cacheKey: `periods:children:${seasonId}` }
            );
          })
        );

        const merged = mergeUniqueById(competitionsChunks.flat()).filter(isCompetitionPeriod);
        setCompetitions(merged);
      } else {
        // Clubs: fetch competitions scoped to direct teams under this club.
        // Using direct children is more reliable than org-wide ancestry scans (parent may serialize as slug).
        const teams = await fetchClubTeamsForPeriodScope();
        const teamIdsUnderClub = new Set(
          (teams || []).map((t: any) => String(t?.id || '')).filter(Boolean)
        );
        if (!teamIdsUnderClub.size) {
          setCompetitions([]);
          return;
        }

        const allTeamIds = Array.from(teamIdsUnderClub);
        const chunkSize = 50;
        const chunks: string[][] = [];
        for (let i = 0; i < allTeamIds.length; i += chunkSize) {
          chunks.push(allTeamIds.slice(i, i + chunkSize));
        }

        const chunkResults = await Promise.all(
          chunks.map((chunk, idx) => {
            const params = new URLSearchParams();
            params.set('project_id__in', chunk.join(','));
            params.set('page_size', '500');
            const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
            return fetchAllPagesCached<any>(
              url,
              { credentials: 'include' },
              { ttlMs: 60_000, cacheKey: `periods:club:periods:${project.id}:${idx}` }
            );
          })
        );

        const merged = mergeUniqueById(chunkResults.flat()).filter(isCompetitionPeriod);
        setCompetitions(merged);
      }
    } catch (e) {
      console.error('Failed to fetch competitions', e);
    } finally {
      setCompetitionsLoading(false);
    }
  };

  const fetchAllMatches = async () => {
    if (!project?.id) return;
    setAllMatchesLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      if (isLikelyTeam) {
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('activity_type', 'match');
        params.set('page_size', '250');
        params.set('ordering', '-start_time');

        const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
        const results = await fetchAllPagesCached<any>(
          url,
          { credentials: 'include' },
          { ttlMs: 30_000, cacheKey: `activities:matches:${project.id}`, maxItems: 250 }
        );
        setAllMatches(Array.isArray(results) ? results : []);
      } else {
        // Clubs: fetch matches for all teams under this club
        // Note: We fetch per-team to ensure we get ALL matches, not just org-wide top N
        const teams = await fetchOrgTeamsForPeriodFiltering();
        const teamIdsUnderClub = getDescendantTeamIdsUnderClub(teams, String(project.id));
        if (!teamIdsUnderClub.size) {
          setAllMatches([]);
          return;
        }

        // Fetch matches for each team and combine (bounded concurrency)
        const allTeamIds = Array.from(teamIdsUnderClub);
        const concurrency = 6;
        const allTeamMatches: any[] = [];
        for (let i = 0; i < allTeamIds.length; i += concurrency) {
          const slice = allTeamIds.slice(i, i + concurrency);
          const batch = await Promise.all(
            slice.map(async (teamId) => {
              const params = new URLSearchParams();
              params.set('project_id', teamId);
              params.set('activity_type', 'match');
              params.set('page_size', '250');
              const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
              return await fetchAllPagesCached<any>(
                url,
                { credentials: 'include' },
                { ttlMs: 30_000, cacheKey: `activities:matches:${teamId}`, maxItems: 250 }
              );
            })
          );
          for (const teamMatches of batch) {
            allTeamMatches.push(...(teamMatches || []));
          }
        }

        const sorted = sortByStartTimeDesc(mergeUniqueById(allTeamMatches));
        setAllMatches(sorted);
      }
    } catch (e) {
      console.error('Failed to fetch matches', e);
    } finally {
      setAllMatchesLoading(false);
    }
  };

  // Calculate isLikelyTeam before using it in effects
  const hasParentClub = Boolean(
    (project as any)?.parent_project ||
      (project as any)?.parent ||
      (project as any)?.parent_id ||
      (project as any)?.parent_project_id
  );
  const isLikelyTeam = isTeamRoute || hasParentClub;
  const creditsScope: DetailMode = forceMode || (isLikelyTeam ? 'team' : 'club');
  const canCreateTransaction = Boolean((user as any)?.id) && Boolean(project?.id);

  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);

  const [clubTeamBalances, setClubTeamBalances] = useState<Record<string, any>>({});
  const [clubTeamBalancesLoading, setClubTeamBalancesLoading] = useState(false);
  const [clubTeamBalancesError, setClubTeamBalancesError] = useState<string | null>(null);

  const fetchClubTeamBalances = async () => {
    if (isLikelyTeam) return;
    if (!Array.isArray(childProjects) || childProjects.length === 0) {
      setClubTeamBalances({});
      return;
    }

    setClubTeamBalancesLoading(true);
    setClubTeamBalancesError(null);
    try {
      const results = await Promise.all(
        (childProjects || []).map(async (t: any) => {
          const id = String(t?.id || '').trim();
          if (!id) return null;
          const res = await fetch(`${apiBaseUrl}/api/v1/credits/projects/${encodeURIComponent(id)}/`, { credentials: 'include' });
          const raw = await res.json().catch(() => null);
          const data = (raw?.data || raw) as any;
          return { id, data };
        })
      );

      const map: Record<string, any> = {};
      (results || []).forEach((r: any) => {
        if (!r?.id) return;
        map[String(r.id)] = r.data;
      });
      setClubTeamBalances(map);
    } catch (e: any) {
      setClubTeamBalances({});
      setClubTeamBalancesError(e?.message || 'Failed to load team balances');
    } finally {
      setClubTeamBalancesLoading(false);
    }
  };

  const clubWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      const label = isLikelyTeam ? 'This team wallet' : 'This club wallet';
      opts.push({ kind: 'project', label, projectId: String(project.id) });
    }
    if (!isLikelyTeam) {
      (childProjects || []).forEach((t: any) => {
        if (!t?.id) return;
        opts.push({ kind: 'project', label: `Team wallet: ${t?.name || t?.title || t?.slug || t?.id}`, projectId: String(t.id) });
      });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id, childProjects, isLikelyTeam]);

  // Trigger data fetch on tab change
  useEffect(() => {
    if (DEBUG_LOGS) {
      console.log('[useEffect] activeTab:', activeTab, 'project:', project?.id, 'isLikelyTeam:', isLikelyTeam);
      console.log('[useEffect] seasons.length:', seasons.length, 'seasonsLoading:', seasonsLoading);
    }
    if (!project) return;
    if (activeTab === 'hierarchy') {
      // Load data needed for hierarchy view
      if (isLikelyTeam) {
        // Team view: seasons, competitions, matches
        if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
        if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
        if (allMatches.length === 0 && !allMatchesLoading) fetchAllMatches();
      } else {
        // Club view: teams, seasons
        if (childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
        if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
        if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
        if (allMatches.length === 0 && !allMatchesLoading) fetchAllMatches();
      }
    } else if (activeTab === 'teams') {
      if (childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      // Also load seasons for count calculation in Teams tab
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
    } else if (activeTab === 'seasons') {
      if (!isLikelyTeam && childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
      if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
    } else if (activeTab === 'competitions') {
      if (!isLikelyTeam && childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
      if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
      // Needed for Participants counts per competition.
      if (allMatches.length === 0 && !allMatchesLoading) fetchAllMatches();
    } else if (activeTab === 'matches') {
      if (!isLikelyTeam && childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
      if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
      if (allMatches.length === 0 && !allMatchesLoading) fetchAllMatches();
    } else if (activeTab === 'people') {
      if (!isLikelyTeam) {
        if (childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      }
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
      fetchOrgMembers(false);
    } else if (activeTab === 'balance' || activeTab === 'transactions') {
      if (!isLikelyTeam) {
        if (childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
      }
    }
  }, [activeTab, project?.id, isLikelyTeam]);

  useEffect(() => {
    if (activeTab !== 'balance') return;
    if (isLikelyTeam) return;
    if (childProjectsLoading) return;
    if ((childProjects || []).length === 0) return;
    fetchClubTeamBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isLikelyTeam, childProjectsLoading, childProjects.length, transactionsReloadToken]);


  // Fetch Dashboard Data (Matches, Stats)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!project?.id) return;

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const projectId = String(project.id);

      // 1. Scheduled Matches
      try {
        setScheduledMatchesLoading(true);
        if (isLikelyTeam) {
          const params = new URLSearchParams();
          params.set('activity_type', 'match');
          params.set('project_id', projectId);
          params.set('start_time__gte', new Date().toISOString());
          params.set('ordering', 'start_time');
          params.set('page_size', '5');

          const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            const results = getPagedResults(json);
            setScheduledMatches(results);
          }
        } else {
          const orgIdValue = String(resolvedOrg?.id || (project as any)?.organisation_id || '').trim();
          if (!orgIdValue) {
            setScheduledMatches([]);
          } else {
            const teams = await fetchOrgTeamsForPeriodFiltering();
            const teamIdsUnderClub = getDescendantTeamIdsUnderClub(teams, String(project.id));

            const params = new URLSearchParams();
            params.set('activity_type', 'match');
            params.set('organisation_id', orgIdValue);
            params.set('start_time__gte', new Date().toISOString());
            params.set('ordering', 'start_time');
            // Fetch a bit more than we display so filtering doesn't starve results.
            params.set('page_size', '50');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
            if (res.ok) {
              const json = await res.json();
              const results = getPagedResults(json);
              const filtered = filterActivitiesToClubTeams(results, teamIdsUnderClub);
              const sorted = [...filtered].sort((a, b) => {
                const ta = a?.start_time ? new Date(a.start_time).getTime() : 0;
                const tb = b?.start_time ? new Date(b.start_time).getTime() : 0;
                return ta - tb;
              });
              setScheduledMatches(mergeUniqueById(sorted).slice(0, 5));
            } else {
              setScheduledMatches([]);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch scheduled matches', e);
      } finally {
        setScheduledMatchesLoading(false);
      }

      // 2. Recent Played Matches
      try {
        setRecentPlayedMatchesLoading(true);
        if (isLikelyTeam) {
          const params = new URLSearchParams();
          params.set('activity_type', 'match');
          params.set('project_id', projectId);
          params.set('start_time__lt', new Date().toISOString());
          params.set('ordering', '-start_time');
          params.set('page_size', '10');

          const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            const results = getPagedResults(json);
            setRecentPlayedMatches(results);
          }
        } else {
          const orgIdValue = String(resolvedOrg?.id || (project as any)?.organisation_id || '').trim();
          if (!orgIdValue) {
            setRecentPlayedMatches([]);
          } else {
            const teams = await fetchOrgTeamsForPeriodFiltering();
            const teamIdsUnderClub = getDescendantTeamIdsUnderClub(teams, String(project.id));

            const params = new URLSearchParams();
            params.set('activity_type', 'match');
            params.set('organisation_id', orgIdValue);
            params.set('start_time__lt', new Date().toISOString());
            params.set('ordering', '-start_time');
            params.set('page_size', '100');

            const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
            if (res.ok) {
              const json = await res.json();
              const results = getPagedResults(json);
              const filtered = filterActivitiesToClubTeams(results, teamIdsUnderClub);
              const sorted = sortByStartTimeDesc(mergeUniqueById(filtered));
              setRecentPlayedMatches(sorted.slice(0, 10));
            } else {
              setRecentPlayedMatches([]);
            }
          }
        }
      } catch (e) {
         console.warn('Failed to fetch recent matches', e);
      } finally {
         setRecentPlayedMatchesLoading(false);
      }

      // 3. Matches Count
      try {
        if (isLikelyTeam) {
          const params = new URLSearchParams();
          params.set('activity_type', 'match');
          params.set('project_id', projectId);
          params.set('page_size', '1');
          const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            const count = getPagedCount(json);
            setMatchesCount(count ?? 0);
          }
        } else {
          // Clubs aggregate matches across teams; we don't have a cheap count endpoint for that.
          setMatchesCount(null);
        }
      } catch (e) {
         // ignore
      }
    };

    fetchDashboardData();
  }, [project?.id]);

  if (loading || context.isLoading) {
    return (
      <div className="p-6">
        <div>
          <PageHeader
            title="Project Details"
            breadcrumbs={[
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
              ...(isTeamRoute
                ? [
                    {
                      label: clubSlugOrId || 'Club',
                      onClick: () => navigate(`/${orgSlugOrId}/${clubSlugOrId}`),
                    },
                    { label: projectId || 'Team', current: true },
                  ]
                : [{ label: 'Details', current: true }]),
            ]}
          />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading project details...
              </div>
            </Card>
          </PageContent>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <div>
          <PageHeader
            title="Project Details"
            breadcrumbs={[
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
              ...(isTeamRoute
                ? [
                    {
                      label: clubSlugOrId || 'Club',
                      onClick: () => navigate(`/${orgSlugOrId}/${clubSlugOrId}`),
                    },
                    { label: projectId || 'Team', current: true },
                  ]
                : [{ label: 'Details', current: true }]),
            ]}
          />
          <PageContent>
            <Alert variant="error" data-testid="project-detail-error">
              {error || 'Project not found'}
            </Alert>
            <Button variant="secondary" onClick={() => navigate(clubsListPath)}>
              Back to Clubs
            </Button>
          </PageContent>
        </div>
      </div>
    );
  }

  // Ensure current project is in options for the switcher
  const effectiveProjectOptions = [...projectOptions];
  if (project && !effectiveProjectOptions.find(p => String(p.id) === String(project.id))) {
    effectiveProjectOptions.push({
      id: String(project.id),
      label: project.name,
      slug: project.slug || String(project.id)
    });
  }

  const teamBreadcrumbOptions: BreadcrumbSwitcherOption[] = (() => {
    if (!isTeamRoute) return [];

    const base = (clubTeamsForSwitcher || []).map((t: any) => ({
      id: String(t.id),
      label: String(t.name || t.slug || t.id),
      slug: String(t.slug || t.id),
    }));

    // Ensure current team is present even before list loads
    if (project && !base.some((t) => String(t.id) === String(project.id))) {
      base.push({
        id: String(project.id),
        label: String(project.name || project.slug || project.id),
        slug: String(project.slug || project.id),
      });
    }

    // Stable-ish order: keep API order, but fall back to alpha if empty
    return base;
  })();

  const handleTeamSwitch = (option: BreadcrumbSwitcherOption) => {
    navigate(`/${orgSlugOrId}/${clubSlugOrId}/${option.slug || option.id}`);
  };

  const teamOrProjectDetailPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}`
    : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`;

  const seasonsPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}?tab=seasons`
    : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/seasons`;



  const backPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}`
    : clubsListPath;


  return (
    <>
      <div>
        <PageHeader
        title={project.name}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
          ...(isTeamRoute
            ? [
                {
                   label: club?.name || 'Club',
                   onClick: () => navigate(`/${orgSlugOrId}/${clubSlugOrId}`)
                },
                {
                  label: (
                    <BreadcrumbContextSwitcher
                      currentId={String(project.id)}
                      options={teamBreadcrumbOptions}
                      onSelect={handleTeamSwitch}
                      hasDropdown={!clubTeamsForSwitcherLoading && teamBreadcrumbOptions.length > 1}
                      type="project"
                    />
                  ),
                  current: true,
                }
              ]
            : [
                {
                  label: (
                    <BreadcrumbContextSwitcher
                      currentId={String(project.id)}
                      options={effectiveProjectOptions}
                      onSelect={handleProjectSwitch}
                      hasDropdown={effectiveProjectOptions.length > 1}
                      type="project"
                    />
                  ),
                  current: true,
                },
              ]
          )
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  setActivatingContext(true);
                  await setActiveContext(isTeamRoute ? 'team' : 'club', String(project.id));
                } finally {
                  setActivatingContext(false);
                }
              }}
              disabled={activatingContext}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: activatingContext ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                opacity: activatingContext ? 0.6 : 1,
              }}
              title="Set this as your active context"
            >
              Make active
            </button>
            <button
              type="button"
              onClick={() => navigate(backPath)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={() => {
                setDetailProject(project);
                setIsDetailModalOpen(true);
              }}
              style={{ ...actionButtonStyle('primary'), padding: '6px 12px', fontWeight: 500 }}
            >
              View
            </button>
            {userCanEditProject && (
              <button
                type="button"
                className="app-action-button"
                onClick={() => {
                  setSelectedEditProject(project);
                  setIsProjectEditModalOpen(true);
                }}
                style={{ ...actionButtonStyle('warning'), padding: '6px 12px', fontWeight: 500 }}
              >
                Edit
              </button>
            )}
            {userCanDeleteProject && (
              <button
                type="button"
                className="app-action-button"
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  ...actionButtonStyle('danger'),
                  padding: '6px 12px',
                  fontWeight: 500,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}

            <button
              type="button"
              className="app-action-button"
              disabled={!canCreateTransaction}
              onClick={async () => {
                setIsCreateTxnModalOpen(true);
              }}
              style={{ ...actionButtonStyle('primary'), padding: '6px 12px', fontWeight: 500, opacity: canCreateTransaction ? 1 : 0.6 }}
            >
              Create transaction
            </button>
          </div>
        }
      />

      <CreateTransactionModal
        isOpen={isCreateTxnModalOpen}
        onClose={() => setIsCreateTxnModalOpen(false)}
        onCreated={() => {
          setTransactionsReloadToken((n) => n + 1);
        }}
        title={isLikelyTeam ? 'Create team transaction' : 'Create club/team transaction'}
        scope={creditsScope}
        organizationId={String(resolvedOrg?.id || (project as any)?.organisation_id || orgId || '').trim()}
        defaultProjectId={project?.id != null ? String(project.id) : null}
        seasonId={null}
        periodId={null}
        activityId={null}
        currentUserId={Number((user as any)?.id)}
        chargedUserId={null}
        walletOptions={clubWalletOptions}
      />

      <PageContent>
        {project.current_user_access?.source === 'emergency_override' && (
          <Alert variant="warning" className="mb-6">
            <div className="flex flex-col gap-2">
              <span className="font-bold">Admin Override Active</span>
              <span>
                You are viewing this private project via emergency admin override.
                All actions are being logged to the{' '}
                <Link to={`/audit?project_id=${project.id}`} className="underline hover:text-blue-800">
                  audit log
                </Link>.
              </span>
            </div>
          </Alert>
        )}


            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <Card style={{ padding: '16px' }}>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <div className="text-lg font-bold mt-1">
                     <Badge variant={project.is_active ? 'success' : 'warning'}>
                       {project.is_active ? 'Active' : 'Inactive'}
                     </Badge>
                  </div>
               </Card>
               <Card style={{ padding: '16px' }}>
                  <div className="text-sm font-medium text-gray-500">Members</div>
                  <div className="text-2xl font-bold mt-1">{members.length}</div>
               </Card>
               <Card style={{ padding: '16px' }}>
                  <div className="text-sm font-medium text-gray-500">Matches</div>
                  <div className="text-2xl font-bold mt-1">{matchesCount ?? '—'}</div>
               </Card>
               <Card style={{ padding: '16px' }}>
                  <div className="text-sm font-medium text-gray-500">Created</div>
                  <div className="text-sm font-semibold mt-1">{new Date(project.created_at || '').toLocaleDateString()}</div>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recent Results & Hierarchy (2/3) */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold">Recent Results</h3>
                     <Button variant="secondary" size="sm" onClick={() => navigate('matches')}>View All Matches</Button>
                  </div>
                  {recentPlayedMatchesLoading ? (
                      <div className="text-sm text-gray-500 py-4 text-center">Loading recent matches...</div>
                  ) : recentPlayedMatches.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4 text-center">No recent matches played.</div>
                  ) : (
                      <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                          <thead>
                            <tr>
                              <th style={compactThStyle}>Match</th>
                              <th style={compactThStyle}>Date</th>
                              <th style={compactThStyle}>Result</th>
                              <th style={compactThStyle}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentPlayedMatches.map((m: any) => (
                              <tr key={m.id}>
                                <td style={compactTextTdStyle}>
                                  <div className="font-medium">{m.title || m.name || 'Match'}</div>
                                  <div className="text-xs text-gray-500">{m.period?.name || '-'}</div>
                                </td>
                                <td style={compactTextTdStyle}>
                                  {m.start_time ? new Date(m.start_time).toLocaleDateString() : '-'}
                                </td>
                                <td style={compactTextTdStyle}>
                                  <Badge variant="default">Finished</Badge>
                                </td>
                                <td style={compactTdStyle}>
                                  <button
                                    type="button"
                                    className="app-unstyled-button text-xs text-blue-600 hover:underline"
                                    onClick={() => {
                                      setDetailProject(m);
                                      setIsDetailModalOpen(true);
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                  )}
                </Card>



                {project.description && (
                  <Card>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-700">{project.description}</p>
                  </Card>
                )}
              </div>

              {/* Right Column: Scheduled & Quick Actions (1/3) */}
              <div className="space-y-6">
                 <Card>
                    <h3 className="text-lg font-semibold mb-3">Scheduled Matches</h3>
                    {scheduledMatchesLoading ? (
                      <div className="text-sm text-gray-500 py-2">Loading...</div>
                    ) : scheduledMatches.length === 0 ? (
                      <div className="text-sm text-gray-500 py-2">No upcoming matches scheduled.</div>
                    ) : (
                      <div className="space-y-3">
                         {scheduledMatches.map((m: any) => (
                           <div key={m.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                              <div className="font-medium text-sm text-gray-900">{m.title || m.name || 'Match'}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {m.start_time ? new Date(m.start_time).toLocaleString(undefined, {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                }) : 'TBA'}
                              </div>
                              <button
                                type="button"
                                className="app-unstyled-button text-xs text-blue-600 mt-1 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                onClick={() => navigate(getBestMatchDetailPath(m))}
                              >
                                View Details →
                              </button>
                           </div>
                         ))}
                      </div>
                    )}
                 </Card>

                 <Card>
                    <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => {
                          setSelectedEditProject(project);
                          setIsProjectEditModalOpen(true);
                        }}
                      >
                        Edit Project Settings
                      </Button>
                    </div>
                 </Card>
              </div>
            </div>






      </PageContent>

      <ProjectDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={detailProject}
      />

      <ProjectEditModal
        opened={isProjectEditModalOpen}
        onClose={() => {
          setIsProjectEditModalOpen(false);
          setSelectedEditProject(null);
        }}
        project={selectedEditProject}
        onSave={async (projectData) => {
          if (!selectedEditProject) return;
          await saveProjectEdits(selectedEditProject, projectData);
        }}
      />

      <PeriodEditModal
        opened={isPeriodEditModalOpen}
        onClose={() => {
          setIsPeriodEditModalOpen(false);
          setSelectedEditPeriod(null);
        }}
        period={selectedEditPeriod}
        onSave={async (payload) => {
          if (!selectedEditPeriod) return;
          await savePeriodEdits(selectedEditPeriod, payload);
        }}
      />

      <MatchEditModal
        opened={isMatchEditModalOpen}
        onClose={() => {
          setIsMatchEditModalOpen(false);
          setSelectedEditMatch(null);
        }}
        match={selectedEditMatch}
        onSave={async (payload) => {
          if (!selectedEditMatch) return;
          await saveMatchEdits(selectedEditMatch, payload);
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
        initialClubId={currentClubId || ''}
        onCreate={async (projectData) => {
          const clubIdValue = String(projectData.parent_project_id || currentClubId || '').trim();
          if (!clubIdValue) throw new Error('Select a club first.');

          const apiV1BaseUrl = getApiV1BaseUrl();
          const res = await fetch(`${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/projects/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              name: projectData.name,
              description: projectData.description || '',
              parent_project_id: clubIdValue,
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create team');
          }

          const payload: any = await res.json().catch(() => null);
          const created: any = payload?.data?.data || payload?.data || payload;
          if (created && typeof created === 'object') {
            const createdKey = String(created?.slug || created?.id || '').trim();
            if (createdKey) {
              setChildProjects((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.slug || p?.id || '').trim() === createdKey)) return list;
                return [created, ...list];
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchChildTeams();
        }}
      />

      <InviteMemberModal
        opened={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        orgSlug={String(currentOrgSlug || '')}
        onInviteSuccess={() => {
          fetchOrgMembers(true);
        }}
      />

      <UserDetailModal
        opened={isUserDetailModalOpen}
        onClose={() => setIsUserDetailModalOpen(false)}
        user={detailUser}
      />

      <PeriodCreateModal
        opened={isCreateSeasonModalOpen}
        onClose={() => setIsCreateSeasonModalOpen(false)}
        title="Create Season"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={(isLikelyTeam ? [project] : childProjects) as any}
        requireOrganisation
        requireClub
        requireTeam
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={currentClubId || ''}
        initialTeamId={seasonTeamFilterId || (isLikelyTeam ? String(project?.id || '') : '')}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const orgIdValue = String(payload.organisation_id || resolvedOrg?.id || '').trim();
          const teamIdValue = String(payload.project_id || '').trim();
          if (!orgIdValue) throw new Error('Select a federation first');
          if (!teamIdValue) throw new Error('Select a team first');

          const res = await fetch(`${apiV1BaseUrl}/periods/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              organisation_id: orgIdValue,
              project_id: teamIdValue ? Number(teamIdValue) : undefined,
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
              setSeasons((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
                return [created, ...list];
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchSeasons();
          void fetchCompetitions();
        }}
      />

      <PeriodCreateModal
        opened={isCreateCompetitionModalOpen}
        onClose={() => setIsCreateCompetitionModalOpen(false)}
        title="Create Competition"
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={(isLikelyTeam ? [project] : childProjects) as any}
        requireOrganisation
        requireClub
        requireTeam
        requireSeason
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={currentClubId || ''}
        initialTeamId={compTeamFilterId || (isLikelyTeam ? String(project?.id || '') : '')}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const orgIdValue = String(payload.organisation_id || resolvedOrg?.id || '').trim();
          const teamIdValue = String(payload.project_id || '').trim();
          const seasonIdValue = String(payload.parent_period_id || '').trim();
          if (!orgIdValue) throw new Error('Select a federation first');
          if (!teamIdValue) throw new Error('Select a team first');
          if (!seasonIdValue) throw new Error('Select a season first');

          const res = await fetch(`${apiV1BaseUrl}/periods/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              organisation_id: orgIdValue,
              project_id: teamIdValue ? Number(teamIdValue) : undefined,
              parent_period_id: seasonIdValue || null,
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
              setCompetitions((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((p: any) => String(p?.id || '').trim() === createdId)) return list;
                return [created, ...list];
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchCompetitions();
        }}
      />

      <MatchCreateModal
        opened={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        organisations={createModalOrganisations}
        clubs={createModalClubs}
        teams={(isLikelyTeam ? [project] : childProjects) as any}
        initialOrganisationId={createModalOrganisations[0]?.id || ''}
        initialClubId={currentClubId || ''}
        initialTeamId={matchTeamFilterId || (isLikelyTeam ? String(project?.id || '') : '')}
        onCreate={async (payload) => {
          const apiV1BaseUrl = getApiV1BaseUrl();
          const teamIdValue = String(payload.project_id || '').trim();
          const competitionIdValue = String(payload.period_id || '').trim();
          if (!teamIdValue) throw new Error('Select a team first');
          if (!competitionIdValue) throw new Error('Select a competition first');

          const res = await fetch(`${apiV1BaseUrl}/activities/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCsrfToken() || '',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: payload.title,
              activity_type: 'match',
              project_id: teamIdValue ? Number(teamIdValue) : undefined,
              opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
              period_id: competitionIdValue,
              start_time: payload.start_time,
              end_time: payload.end_time,
              location: payload.location,
              description: payload.description,
              metadata: {
                venue: payload.venue || 'Home',
                is_home: (payload.venue || 'Home') === 'Home',
              },
            }),
          });

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw new Error(detail || 'Failed to create match');
          }

          const raw: any = await res.json().catch(() => null);
          const created: any = raw?.data?.data || raw?.data || raw;
          if (created && typeof created === 'object') {
            const createdId = String(created?.id || '').trim();
            if (createdId) {
              setAllMatches((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((m: any) => String(m?.id || '').trim() === createdId)) return list;
                return [created, ...list];
              });
            }
          }

          invalidateFetchAllPagesCache();
          void fetchAllMatches();
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
                  try {
                    setEditMemberRoleSaving(true);
                    await saveMemberRole();
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

      {isEditTeamMembershipModalOpen && editingTeamMember ? (
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
              width: '640px',
              maxWidth: '95%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: 'var(--app-text)',
              border: '1px solid var(--app-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0 }}>Edit Team Member</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditTeamMembershipModalOpen(false);
                  setEditingTeamMember(null);
                  setEditingTeamId('');
                  setEditingTeamMembershipId('');
                }}
                disabled={editTeamMembershipSaving}
              >
                Close
              </Button>
            </div>

            <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--app-text-muted)' }}>
              {String((editingTeamMember as any)?.user?.email || (editingTeamMember as any)?.email || '')}
            </div>

            {editTeamMembershipError ? (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#fee', color: '#c00' }}>
                {editTeamMembershipError}
              </div>
            ) : null}

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Access role</label>
              <select
                value={editingTeamAccessRole}
                onChange={(e) => setEditingTeamAccessRole(e.target.value as any)}
                disabled={editTeamMembershipSaving}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
              {!editingTeamMembershipId ? (
                <div style={{ marginTop: '6px', color: 'var(--app-muted-text)', fontSize: '12px' }}>
                  User has no direct membership for this team.
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Functional roles</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '8px 12px',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                }}
              >
                {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
                  const checked = (editingTeamFunctionalRoles || []).includes(opt.value);
                  return (
                    <label key={opt.value} style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={editTeamMembershipSaving}
                        onChange={(e) => {
                          const nextChecked = e.currentTarget.checked;
                          setEditingTeamFunctionalRoles((prev) => {
                            const normalized = (Array.isArray(prev) ? prev : []).map((r) => String(r || '').trim()).filter(Boolean);
                            const set = new Set(normalized);
                            if (nextChecked) set.add(opt.value);
                            else set.delete(opt.value);
                            return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                          });
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditTeamMembershipModalOpen(false);
                  setEditingTeamMember(null);
                  setEditingTeamId('');
                  setEditingTeamMembershipId('');
                }}
                disabled={editTeamMembershipSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setEditTeamMembershipSaving(true);
                    setEditTeamMembershipError(null);
                    await saveTeamMembership();
                    setIsEditTeamMembershipModalOpen(false);
                    setEditingTeamMember(null);
                    setEditingTeamId('');
                    setEditingTeamMembershipId('');
                  } catch (e) {
                    setEditTeamMembershipError(e instanceof Error ? e.message : 'Failed to save');
                  } finally {
                    setEditTeamMembershipSaving(false);
                  }
                }}
                loading={editTeamMembershipSaving}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
};

export default ProjectDetailPage;

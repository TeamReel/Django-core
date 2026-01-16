import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { fetchAllPages as fetchAllPagesCached } from '../../utils/fetchAllPages';
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
  const { context, organisations, projects: contextProjects } = useContextSwitcher();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
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
    // A season must be a root period (no parent)
    const parentId = getPeriodParentId(p);
    if (parentId) return false;

    // Check if explicitly typed as season
    const type = getPeriodType(p);
    if (type === 'season') return true;

    // Fallback for older/legacy seeders that didn't set metadata.type.
    // Treat a root period named like "Season ..." / "Seizoen ..." as a season.
    const name = String(p?.name || '').toLowerCase();
    if (name.startsWith('season') || name.startsWith('seizoen')) return true;

    // Some seeders store season info under metadata fields.
    const seasonKey = p?.data?.season ?? p?.metadata?.season;
    if (seasonKey) return true;

    return false;
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

    // Detail pages should not load the full organisation roster when we're in a team context.
    // Team pages: load only members for this team.
    // Club pages: keep the full org roster (needed to see all users).
    const teamIdForMembers = (isTeamRoute || isLikelyTeam) ? String(project?.id || '').trim() : '';

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

        // Use nested route if we have org context, otherwise top-level
        const endpoint = resolvedOrg
          ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/`
          : `${apiBaseUrl}/api/v1/projects/${currentProjectSlug}/`;

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
       const finalResults = filteredByParent.length > 0 ? filteredByParent : filteredByOrg;
       setChildProjects(finalResults as Project[]);
     } catch (e) {
       console.error('Failed to fetch child teams', e);
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
      const finalResults = filteredByParent.length > 0 ? filteredByParent : filteredByOrg;
      setClubTeamsForSwitcher(finalResults as Project[]);
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
        // Clubs: fetch periods only for teams under this club and filter to competitions
        const teams = await fetchOrgTeamsForPeriodFiltering();
        const teamIdsUnderClub = getDescendantTeamIdsUnderClub(teams, String(project.id));
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
      <AppShell>
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
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell>
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
      </AppShell>
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

  // Tab order: hierarchy first (teams → seasons → competitions → matches), then users/people, then audit.
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    ...(!isLikelyTeam ? [{ id: 'teams', label: 'Teams' }] : []),
    { id: 'seasons', label: 'Seasons' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'people', label: 'Users' },
    { id: 'balance', label: 'Balance' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'audit', label: 'Audit' },
  ];

  const backPath = isTeamRoute
    ? `/${orgSlugOrId}/${clubSlugOrId}`
    : clubsListPath;


  return (
    <AppShell>
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
          setActiveTab('transactions');
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

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--app-border)', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                borderRadius: '6px 6px 0 0',
                border: '1px solid var(--app-border)',
                borderBottom: activeTab === tab.id ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                backgroundColor: activeTab === tab.id ? 'var(--app-surface)' : 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

          {activeTab === 'balance' && project?.id && (
            isLikelyTeam ? (
              <TeamCreditsTab
                view="balance"
                projectId={String(project.id)}
                projectName={project.name}
                organisationId={String(resolvedOrg?.id || (project as any)?.organisation_id || orgId || '')}
                reloadToken={transactionsReloadToken}
                walletLabel="Team"
              />
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                <TeamCreditsTab
                  view="balance"
                  projectId={String(project.id)}
                  projectName={project.name}
                  organisationId={String(resolvedOrg?.id || (project as any)?.organisation_id || orgId || '')}
                  reloadToken={transactionsReloadToken}
                  walletLabel="Club"
                />

                <Card style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>Team balances</div>
                      <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
                        Balances per team under this club.
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        fetchClubTeamBalances();
                      }}
                    >
                      Refresh
                    </Button>
                  </div>

                  {clubTeamBalancesError ? (
                    <Alert variant="info" style={{ marginTop: '12px' }}>
                      {clubTeamBalancesError}
                    </Alert>
                  ) : null}

                  {childProjectsLoading || clubTeamBalancesLoading ? (
                    <div style={{ padding: '12px', opacity: 0.7, textAlign: 'center' }}>Loading teams…</div>
                  ) : (childProjects || []).length === 0 ? (
                    <div style={{ padding: '12px', opacity: 0.7, textAlign: 'center' }}>No teams found under this club.</div>
                  ) : (
                    <div style={{ marginTop: '12px', overflowX: 'auto' }}>
                      <Table style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>Team</th>
                            <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(childProjects || []).slice(0, 50).map((t: any) => (
                            <tr key={String(t?.id || '')}>
                              <td style={{ padding: '8px 10px', fontSize: '13px' }}>{t?.name || t?.title || t?.slug || t?.id}</td>
                              <td style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {String(clubTeamBalances?.[String(t?.id || '')]?.current_balance ?? '—')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>
            )
          )}

          {activeTab === 'transactions' && project?.id && (
            isLikelyTeam ? (
              <TeamCreditsTab
                view="transactions"
                projectId={String(project.id)}
                projectName={project.name}
                organisationId={String(resolvedOrg?.id || (project as any)?.organisation_id || orgId || '')}
                reloadToken={transactionsReloadToken}
              />
            ) : (
              <TransactionsPanel
                title="Club transactions (all teams)"
                description="Shows transactions across this club and all teams under it."
                filters={{
                  organization_id: String(resolvedOrg?.id || (project as any)?.organisation_id || orgId || ''),
                  project_id__in: [String(project.id), ...(childProjects || []).map((t: any) => String(t?.id || '')).filter(Boolean)].join(','),
                }}
                reloadToken={transactionsReloadToken}
              />
            )
          )}

          {activeTab === 'overview' && (
            <>
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
                     <Button variant="secondary" size="sm" onClick={() => setActiveTab('matches')}>View All Matches</Button>
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

                 {/* Hierarchy Card (Teams or Seasons) */}
                 <Card>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold">{!isLikelyTeam ? 'Teams' : 'Seasons'}</h3>
                       <Button
                         variant="secondary"
                         size="sm"
                         onClick={() => setActiveTab(!isLikelyTeam ? 'teams' : 'seasons')}
                       >
                         Manage { !isLikelyTeam ? 'Teams' : 'Seasons' }
                       </Button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                     <div className="text-sm text-gray-600 mb-2">
                        {!isLikelyTeam
                           ? `Manage the teams that belong to ${project.name}`
                           : `Manage seasons and competitions for ${project.name}`
                        }
                     </div>
                  </div>
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
                      <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('people')}>
                        Manage Members
                      </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          style={{ width: '100%', justifyContent: 'flex-start' }}
                          onClick={() => setActiveTab(!isLikelyTeam ? 'teams' : 'seasons')}
                        >
                          { !isLikelyTeam ? 'Manage Teams' : 'Manage Seasons' }
                        </Button>
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
            </>
          )}

          {/* Hierarchy Tab */}
          {activeTab === 'hierarchy' && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input
                    value={hierarchySearch}
                    onChange={(e) => setHierarchySearch(e.target.value)}
                    placeholder={isLikelyTeam ? 'Filter seasons/competitions' : 'Filter teams'}
                    style={{ width: '240px' }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => setHierarchySearch('')}>
                    Clear
                  </Button>
                </div>

                {!isLikelyTeam ? (
                  <button
                    type="button"
                    className="app-action-button"
                    onClick={() => setIsCreateTeamModalOpen(true)}
                    style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: 500 }}
                  >
                    Add Team
                  </button>
                ) : null}
              </div>

              {isLikelyTeam ? (
                // Team View: Competitions/Matches grouped by Season
                <>
                  <h3 className="text-lg font-semibold mb-4">Hierarchy: Competitions & Matches (grouped by season)</h3>
                  {seasonsLoading || competitionsLoading ? (
                    <Alert variant="info">Loading hierarchy data...</Alert>
                  ) : seasons.length === 0 ? (
                    <Alert variant="info">No seasons found for this team.</Alert>
                  ) : (
                    (() => {
                      // Group competitions by season
                      const compsBySeason = new Map<string, any[]>();
                      for (const comp of competitions) {
                        const parentId = String(comp.parent_period_id || comp.parent_period?.id || '');
                        if (!parentId) continue;
                        const arr = compsBySeason.get(parentId) || [];
                        arr.push(comp);
                        compsBySeason.set(parentId, arr);
                      }

                      // Calculate match counts
                      const matchesByComp = new Map<string, number>();
                      for (const match of allMatches) {
                        const compId = String(match.period_id || match.period?.id || '');
                        matchesByComp.set(compId, (matchesByComp.get(compId) || 0) + 1);
                      }

                      const normalized = hierarchySearch.trim().toLowerCase();
                      const filteredSeasons = !normalized
                        ? seasons
                        : seasons.filter((s: any) => {
                            const seasonName = String(s?.name || '').toLowerCase();
                            if (seasonName.includes(normalized)) return true;
                            const seasonId = String(s?.id || '');
                            const comps = compsBySeason.get(seasonId) || [];
                            return comps.some((c: any) => String(c?.name || '').toLowerCase().includes(normalized));
                          });

                      const sortedSeasons = [...filteredSeasons].sort((a: any, b: any) =>
                        String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                      );

                      return sortedSeasons.map((season: any) => {
                        const seasonId = String(season.id);
                        const seasonComps = [...(compsBySeason.get(seasonId) || [])].sort((a: any, b: any) =>
                          String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                        );
                        const totalMatches = seasonComps.reduce((sum, comp) => {
                          return sum + (matchesByComp.get(String(comp.id)) || 0);
                        }, 0);

                        return (
                          <div key={seasonId} style={{ marginBottom: '2rem' }}>
                            <div
                              style={{
                                backgroundColor: 'var(--app-surface-2)',
                                padding: '12px 16px',
                                borderRadius: '4px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}
                            >
                              <h4 style={{ margin: 0, flex: 1, fontSize: '16px', fontWeight: 600 }}>
                                {season.name || `Season ${seasonId}`}
                              </h4>
                              <Badge variant="default">{seasonComps.length} Competitions</Badge>
                              <Badge variant="default">{totalMatches} Matches</Badge>
                              <Badge variant="default">{members.length} Players</Badge>
                            </div>

                            {seasonComps.length === 0 ? (
                              <div style={{ paddingLeft: '16px', color: 'var(--app-muted-text)', fontSize: '14px' }}>
                                No competitions in this season
                              </div>
                            ) : (
                              <Table style={{ ...compactTableStyle, marginLeft: '16px' }}>
                                <thead>
                                  <tr>
                                    <th style={compactThStyle}>Competition</th>
                                    <th style={compactThStyle}>Matches</th>
                                    <th style={compactThStyle}>Status</th>
                                    <th style={compactThStyle} className="text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {seasonComps.map((comp: any) => {
                                    const compMatchCount = matchesByComp.get(String(comp.id)) || 0;
                                    return (
                                      <tr key={comp.id}>
                                        <td style={compactTextTdStyle}>
                                          <Link
                                            to={`/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}/${periodPathKey(season) || season.slug || season.id}/${comp.slug || comp.id}`}
                                            className="font-medium text-blue-600 hover:underline"
                                          >
                                            {comp.name}
                                          </Link>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <Badge variant="default">{compMatchCount}</Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <Badge variant={comp.is_active ? 'success' : 'warning'}>
                                            {comp.is_active ? 'Active' : 'Inactive'}
                                          </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <div style={compactActionsStyle}>
                                            <button
                                              type="button"
                                              className="app-action-button"
                                              onClick={() => {
                                                setDetailProject(comp);
                                                setIsDetailModalOpen(true);
                                              }}
                                              style={actionButtonStyle('primary')}
                                            >
                                              View
                                            </button>
                                            {userCanEditProject && (
                                              <button
                                                type="button"
                                                className="app-action-button"
                                                onClick={() => {
                                                  setSelectedEditPeriod(comp);
                                                  setIsPeriodEditModalOpen(true);
                                                }}
                                                style={actionButtonStyle('warning')}
                                              >
                                                Edit
                                              </button>
                                            )}
                                            {userCanDeleteProject && (
                                              <button
                                                type="button"
                                                className="app-action-button"
                                                onClick={async () => {
                                                  if (!window.confirm(`Are you sure you want to delete competition ${comp.name}?`)) return;
                                                  try {
                                                    const apiV1BaseUrl = getApiV1BaseUrl();
                                                    const res = await fetch(`${apiV1BaseUrl}/periods/${comp.id}/`, {
                                                      method: 'DELETE',
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                        'X-CSRFToken': getCsrfToken() || '',
                                                      },
                                                      credentials: 'include',
                                                    });
                                                    if (res.ok) {
                                                      setCompetitions((prev) => prev.filter((p: any) => String(p.id) !== String(comp.id)));
                                                    } else {
                                                      alert('Error deleting competition');
                                                    }
                                                  } catch (e) {
                                                    console.error(e);
                                                    alert('Error deleting competition');
                                                  }
                                                }}
                                                style={actionButtonStyle('danger')}
                                              >
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </>
              ) : (
                // Club View: Seasons grouped by Team
                <>
                  <h3 className="text-lg font-semibold mb-4">Hierarchy: Seasons (grouped by team)</h3>
                  {childProjectsLoading || seasonsLoading ? (
                    <Alert variant="info">Loading hierarchy data...</Alert>
                  ) : childProjects.length === 0 ? (
                    <Alert variant="info">No teams found in this club.</Alert>
                  ) : (
                    (() => {
                      // Group seasons by team
                      const seasonsByTeam = new Map<string, any[]>();
                      for (const season of seasons) {
                        const teamId = String(season.project_id || season.project?.id || '');
                        if (!teamId) continue;
                        const arr = seasonsByTeam.get(teamId) || [];
                        arr.push(season);
                        seasonsByTeam.set(teamId, arr);
                      }

                      // Group competitions by season
                      const compsBySeason = new Map<string, any[]>();
                      for (const comp of competitions) {
                        const parentId = String(comp.parent_period_id || comp.parent_period?.id || '');
                        if (!parentId) continue;
                        const arr = compsBySeason.get(parentId) || [];
                        arr.push(comp);
                        compsBySeason.set(parentId, arr);
                      }

                      // Calculate match counts by competition
                      const matchesByComp = new Map<string, number>();
                      for (const match of allMatches) {
                        const compId = String(match.period_id || match.period?.id || '');
                        matchesByComp.set(compId, (matchesByComp.get(compId) || 0) + 1);
                      }

                      const normalized = hierarchySearch.trim().toLowerCase();
                      const filteredTeams = !normalized
                        ? childProjects
                        : childProjects.filter((t: any) => String(t?.name || '').toLowerCase().includes(normalized));

                      const sortedTeams = [...filteredTeams].sort((a: any, b: any) =>
                        String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                      );

                      return sortedTeams.map((team: any) => {
                        const teamId = String(team.id);
                        const teamSeasons = [...(seasonsByTeam.get(teamId) || [])].sort((a: any, b: any) =>
                          String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                        );

                        return (
                          <div key={teamId} style={{ marginBottom: '2rem' }}>
                            <div
                              style={{
                                backgroundColor: 'var(--app-surface-2)',
                                padding: '12px 16px',
                                borderRadius: '4px',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                              }}
                            >
                              <h4 style={{ margin: 0, flex: 1, fontSize: '16px', fontWeight: 600 }}>
                                <Link
                                  to={`/${orgSlugOrId}/${project.slug || project.id}/${team.slug || team.id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {team.name}
                                </Link>
                              </h4>
                              <Badge variant="default">{teamSeasons.length} Seasons</Badge>
                              <Badge variant="default">{team.member_count || 0} Players</Badge>
                            </div>

                            {teamSeasons.length === 0 ? (
                              <div style={{ paddingLeft: '16px', color: 'var(--app-muted-text)', fontSize: '14px' }}>
                                No seasons for this team
                              </div>
                            ) : (
                              <Table style={{ ...compactTableStyle, marginLeft: '16px' }}>
                                <thead>
                                  <tr>
                                    <th style={compactThStyle}>Season</th>
                                    <th style={compactThStyle}>Competitions</th>
                                    <th style={compactThStyle}>Matches</th>
                                    <th style={compactThStyle}>Status</th>
                                    <th style={compactThStyle} className="text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamSeasons.map((season: any) => {
                                    const seasonId = String(season.id);
                                    const seasonComps = compsBySeason.get(seasonId) || [];
                                    const totalMatches = seasonComps.reduce((sum, comp) => {
                                      return sum + (matchesByComp.get(String(comp.id)) || 0);
                                    }, 0);

                                    return (
                                      <tr key={season.id}>
                                        <td style={compactTextTdStyle}>
                                          <Link
                                            to={`/${orgSlugOrId}/${project.slug || project.id}/${team.slug || team.id}/${periodPathKey(season) || season.slug || season.id}`}
                                            className="font-medium text-blue-600 hover:underline"
                                          >
                                            {season.name}
                                          </Link>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <Badge variant="default">{seasonComps.length}</Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <Badge variant="default">{totalMatches}</Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <Badge variant={season.is_active !== false ? 'success' : 'warning'}>
                                            {season.is_active !== false ? 'Active' : 'Inactive'}
                                          </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button
                                              type="button"
                                              className="app-action-button"
                                              onClick={() => {
                                                setDetailProject(season);
                                                setIsDetailModalOpen(true);
                                              }}
                                              style={actionButtonStyle('primary')}
                                            >
                                              View
                                            </button>
                                            {userCanEditProject && (
                                              <button
                                                type="button"
                                                className="app-action-button"
                                                onClick={() => {
                                                  setSelectedEditPeriod(season);
                                                  setIsPeriodEditModalOpen(true);
                                                }}
                                                style={actionButtonStyle('warning')}
                                              >
                                                Edit
                                              </button>
                                            )}
                                            {userCanDeleteProject && (
                                              <button
                                                type="button"
                                                className="app-action-button"
                                                onClick={async () => {
                                                  if (
                                                    !window.confirm(`Are you sure you want to delete season ${season.name}?`)
                                                  )
                                                    return;
                                                  try {
                                                    const apiBaseUrl =
                                                      import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                                    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${season.id}/`, {
                                                      method: 'DELETE',
                                                      credentials: 'include',
                                                    });
                                                    if (res.ok) {
                                                      setSeasons(seasons.filter((s: any) => s.id !== season.id));
                                                    }
                                                  } catch (err) {
                                                    console.error('Failed to delete season', err);
                                                  }
                                                }}
                                                style={actionButtonStyle('danger')}
                                              >
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </Table>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </>
              )}
            </Card>
          )}

          {activeTab === 'people' && (
            <Card className="mb-6">
              {(() => {
                // Team detail is already scoped to a single team; keep the same UI but remove redundant team filter.
                const effectiveUserTeamFilterId = isTeamRoute ? String(project.id) : userTeamFilterId;

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <h3 className="text-lg font-semibold" style={{ marginRight: '8px' }}>Users</h3>
                        <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search users" style={{ width: '240px' }} />
                        {!isTeamRoute && (
                          <select
                            value={userTeamFilterId}
                            onChange={(e) => {
                              setUserTeamFilterId(e.target.value);
                              setUserSeasonFilterId('');
                              setUsersPage(1);
                              setUsersLinkedPage(1);
                              setUsersUnlinkedPage(1);
                            }}
                            style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                          >
                            <option value="">Team: All</option>
                            {(childProjects as any[]).map((t: any) => (
                              <option key={t.id} value={String(t.id)}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <select
                          value={userSeasonFilterId}
                          onChange={(e) => {
                            setUserSeasonFilterId(e.target.value);
                            setUsersPage(1);
                            setUsersLinkedPage(1);
                            setUsersUnlinkedPage(1);
                          }}
                          style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                        >
                          <option value="">Season: All</option>
                          {effectiveUserTeamFilterId && <option value="__unassigned__">Season: Unassigned</option>}
                          {(seasons as any[])
                            .filter((p: any) => isSeasonPeriod(p))
                            .filter((p: any) => {
                              if (!effectiveUserTeamFilterId) return true;
                              const teamId = String(p.project_id ?? p.project?.id ?? '');
                              return teamId === String(effectiveUserTeamFilterId);
                            })
                            .map((p: any) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        <select
                          value={userRoleFilter}
                          onChange={(e) => {
                            setUserRoleFilter(e.target.value);
                            setUsersPage(1);
                            setUsersLinkedPage(1);
                            setUsersUnlinkedPage(1);
                          }}
                          style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                        >
                          <option value="">Role: All</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setMemberSearch('');
                            setUserRoleFilter('');
                            if (!isTeamRoute) setUserTeamFilterId('');
                            setUserSeasonFilterId('');
                            setUsersPage(1);
                            setUsersLinkedPage(1);
                            setUsersUnlinkedPage(1);
                          }}
                        >
                          Clear
                        </Button>
                        <button
                          onClick={() => setIsInviteMemberModalOpen(true)}
                          style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: '500' }}
                        >
                          Add User
                        </button>
                      </div>
                    </div>

                    {orgMembersLoading ? (
                      <Alert variant="info">Loading members...</Alert>
                    ) : (
                      <>
                        {(() => {
                          const normalizedQuery = memberSearch.trim().toLowerCase();

                        // Include all org-visible users (direct org memberships + project members + role assignments).
                        // This ensures team pages still show users even when they only exist via project memberships.
                        const orgOnlyMembers = orgMembers;

                        const seasonTeamById = new Map<string, string>();
                        for (const p of seasons as any[]) {
                          if (!isSeasonPeriod(p)) continue;
                          const teamId = String(p.project_id ?? p.project?.id ?? '');
                          if (teamId) seasonTeamById.set(String(p.id), teamId);
                        }

                        // Club detail must show the full organisation roster by default.
                        // Team detail is already scoped in fetchOrgMembers (fast path), so we don't need
                        // an extra implicit club filter here.
                        const effectiveClubId = '';
                        const effectiveTeamId =
                          effectiveUserTeamFilterId ||
                          (userSeasonFilterId && String(userSeasonFilterId) !== '__unassigned__'
                            ? seasonTeamById.get(String(userSeasonFilterId)) || ''
                            : '');

                        const getMemberProjectMemberships = (item: any): any[] => {
                          const u = item?.user || item;
                          const list =
                            (item as any)?.project_memberships ||
                            (u as any)?.project_memberships ||
                            (item as any)?.project_membership_details ||
                            (u as any)?.project_membership_details ||
                            [];
                          return Array.isArray(list) ? list : [];
                        };

                        const getPmTeamId = (pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '');
                        const getPmClubId = (pm: any) => {
                          const raw =
                            pm?.club_id ??
                            pm?.club?.id ??
                            pm?.project?.parent_id ??
                            pm?.project?.parent?.id ??
                            pm?.project?.parent_project_id ??
                            '';

                          const clubIdValue = String(raw || '').trim();
                          if (clubIdValue) return clubIdValue;

                          // When we load members via /projects/:id/members (fast path), the API payload
                          // may not include club linkage. If we're on a team route, treat memberships for
                          // the current team as belonging to the current club.
                          if (isTeamRoute && currentClubId) {
                            const teamIdValue = getPmTeamId(pm);
                            if (teamIdValue && teamIdValue === String(effectiveTeamId || effectiveUserTeamFilterId || (project as any)?.id || '')) {
                              return String(currentClubId);
                            }
                          }

                          return '';
                        };

                        const baseMembers = orgOnlyMembers.filter((item: any) => {
                          const u = item.user || item;
                          const role = item.role || 'member';

                          // Role filter
                          if (userRoleFilter && role !== userRoleFilter) return false;

                          // Search filter
                          const haystack = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                          if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;

                          const pms = getMemberProjectMemberships(item);
                          if (effectiveClubId) {
                            const ok = pms.some((pm: any) => getPmClubId(pm) === String(effectiveClubId));
                            if (!ok) return false;
                          }
                          if (effectiveTeamId) {
                            const ok = pms.some((pm: any) => getPmTeamId(pm) === String(effectiveTeamId));
                            if (!ok) return false;
                          }

                          return true;
                        });

                        const isUnassignedSeasonFilter = String(userSeasonFilterId || '') === '__unassigned__';
                        const isSpecificSeasonFilter = Boolean(userSeasonFilterId) && !isUnassignedSeasonFilter;

                        const getPmPeriodId = (pm: any) => String(pm?.period_id ?? pm?.period ?? '').trim();

                        const normalizeAccessRole = (raw: any): 'viewer' | 'editor' | 'admin' => {
                          const role = String(raw || '').trim().toLowerCase();
                          if (role === 'admin') return 'admin';
                          if (role === 'editor') return 'editor';
                          if (role === 'viewer') return 'viewer';

                          // Legacy / sports roles occasionally leak into membership.role in demo data
                          if (['coach', 'trainer'].includes(role)) return 'editor';
                          if (['manager', 'owner'].includes(role)) return 'admin';
                          // player/member/guest/etc -> safe default
                          return 'viewer';
                        };

                        const getTeamAccessRoleForMember = (item: any, teamId: string): 'viewer' | 'editor' | 'admin' => {
                          const pms = getMemberProjectMemberships(item);
                          const base = pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(teamId) && !String(pm?.period_id ?? pm?.period ?? '').trim());
                          const anyTeam = pms.find((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '') === String(teamId));
                          return normalizeAccessRole(base?.role ?? anyTeam?.role ?? 'viewer');
                        };

                        const getSeasonMembershipIdForMember = (item: any, teamId: string, seasonId: string): string => {
                          const pms = getMemberProjectMemberships(item);
                          const pm = pms.find((pm: any) => {
                            const pid = String(pm?.project_id ?? pm?.project?.id ?? '');
                            const sid = String(pm?.period_id ?? pm?.period ?? '').trim();
                            return pid === String(teamId) && sid === String(seasonId);
                          });
                          return String(pm?.id ?? '').trim();
                        };

                        const seasonsForEffectiveTeam = (() => {
                          if (!effectiveTeamId) return (seasons as any[]).filter(isSeasonPeriod);
                          return (seasons as any[])
                            .filter(isSeasonPeriod)
                            .filter((s: any) => String(s?.project_id ?? s?.project?.id ?? '') === String(effectiveTeamId));
                        })();

                        const handleSeasonPickerConfirm = async (seasonId: string) => {
                          if (!effectiveTeamId) throw new Error('Team missing');
                          const item = seasonPickerMember;
                          if (!item) throw new Error('Member missing');

                          const u = item?.user || item;
                          const userId = Number(u?.id);
                          if (!userId) throw new Error('User id missing');

                          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

                          if (seasonPickerMode === 'assign') {
                            const role = getTeamAccessRoleForMember(item, String(effectiveTeamId));
                            const res = await fetch(
                              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(effectiveTeamId))}/members/`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRFToken': getCsrfToken() || '',
                                },
                                credentials: 'include',
                                body: JSON.stringify({
                                  user_id: userId,
                                  role,
                                  period_id: String(seasonId),
                                }),
                              }
                            );
                            if (!res.ok) {
                              const text = await res.text().catch(() => '');
                              if (!/already|exists|duplicate/i.test(text)) {
                                throw new Error(text || 'Failed to assign user to season');
                              }
                            }
                          } else {
                            const pmId = getSeasonMembershipIdForMember(item, String(effectiveTeamId), String(seasonId));
                            if (!pmId) throw new Error('No season membership found for this user');
                            const res = await fetch(
                              `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(effectiveTeamId))}/members/${encodeURIComponent(String(pmId))}/`,
                              {
                                method: 'DELETE',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-CSRFToken': getCsrfToken() || '',
                                },
                                credentials: 'include',
                              }
                            );
                            if (!res.ok) {
                              const text = await res.text().catch(() => '');
                              throw new Error(text || 'Failed to unassign user from season');
                            }
                          }

                          await fetchOrgMembers(true);
                        };
                        const hasTeamMembershipForSeason = (item: any, seasonId: string) => {
                          const pms = getMemberProjectMemberships(item);
                          return pms.some((pm: any) => {
                            if (getPmTeamId(pm) !== String(effectiveTeamId)) return false;
                            return getPmPeriodId(pm) === String(seasonId);
                          });
                        };

                        const hasTeamMembershipWithoutSeason = (item: any) => {
                          const pms = getMemberProjectMemberships(item);
                          return pms.some((pm: any) => {
                            if (getPmTeamId(pm) !== String(effectiveTeamId)) return false;
                            return !getPmPeriodId(pm);
                          });
                        };

                        const filteredMembers = (() => {
                          if (!userSeasonFilterId) return baseMembers;
                          if (!effectiveTeamId) return baseMembers;

                          if (isUnassignedSeasonFilter) {
                            return baseMembers.filter((item: any) => hasTeamMembershipWithoutSeason(item));
                          }

                          // For a specific season: we render two groups below.
                          return baseMembers;
                        })();

                        if (filteredMembers.length === 0) return <Alert variant="info">No users match your search.</Alert>;

                        const handleRemoveMembership = async (membershipId: string, _email?: string) => {
                          const apiV1BaseUrl = getApiV1BaseUrl();
                          const res = await fetch(
                            `${apiV1BaseUrl}/organisations/${encodeURIComponent(currentOrgSlug)}/members/${membershipId}/`,
                            {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCsrfToken() || '',
                              },
                              credentials: 'include',
                            }
                          );
                          if (!res.ok) {
                            throw new Error('Failed to remove user');
                          }
                          setOrgMembers((prev) => prev.filter((m: any) => String(m.id) !== String(membershipId)));
                        };

                        const renderPagedUsersTable = (
                          items: any[],
                          page: number,
                          setPage: (n: number) => void,
                          label?: string,
                        ) => {
                          const totalPages = Math.max(1, Math.ceil(items.length / usersPageSize));
                          const safePage = Math.min(page, totalPages);
                          const start = (safePage - 1) * usersPageSize;
                          const pageItems = items.slice(start, start + usersPageSize);

                          const teamById = new Map<string, any>();
                          for (const t of childProjects as any[]) teamById.set(String(t.id), t);
                          // Ensure we can resolve the current team in team-detail mode
                          if (isTeamRoute && project) teamById.set(String(project.id), project);

                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                                  {label ? `${label} · ` : ''}Page {safePage} of {totalPages} ({items.length} users)
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}>
                                    Previous
                                  </Button>
                                  <Button variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>
                                    Next
                                  </Button>
                                </div>
                              </div>
                              <UsersTable
                                isTeamRoute={isTeamRoute}
                                pageItems={pageItems}
                                currentOrgSlug={String(currentOrgSlug || '')}
                                currentClubSlugOrId={String(currentClubSlugOrId || '')}
                                currentClubId={String(currentClubId || '')}
                                currentProjectId={String(project?.id || '')}
                                teamById={teamById}
                                userCanManageMembers={Boolean(userCanManageMembers)}
                                seasonId={isSpecificSeasonFilter ? String(userSeasonFilterId) : ''}
                                onOpenAssignSeason={(item: any) => {
                                  setSeasonPickerMode('assign');
                                  setSeasonPickerMember(item);
                                  setSeasonPickerOpen(true);
                                }}
                                onOpenUnassignSeason={(item: any) => {
                                  setSeasonPickerMode('unassign');
                                  setSeasonPickerMember(item);
                                  setSeasonPickerOpen(true);
                                }}
                                onViewUser={(userObj) => {
                                  setDetailUser(userObj);
                                  setIsUserDetailModalOpen(true);
                                }}
                                onViewMembership={() => {
                                  // View is handled via onViewUser (modal).
                                }}
                                onEditMembership={(item) => {
                                  setEditingMember(item);
                                  setEditingMemberRole((item?.role || 'member') as any);
                                  setEditMemberRoleError(null);
                                  setIsEditMemberRoleModalOpen(true);
                                }}
                                onRemoveMembership={handleRemoveMembership as any}
                              />
                            </>
                          );
                        };

                        if (isSpecificSeasonFilter && effectiveTeamId) {
                          const seasonId = String(userSeasonFilterId);
                          const linked = baseMembers.filter((item: any) => hasTeamMembershipForSeason(item, seasonId));
                          const unlinked = baseMembers.filter((item: any) => !hasTeamMembershipForSeason(item, seasonId));

                          return (
                            <>
                              <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ margin: '8px 0' }}>Linked to selected season</h4>
                                {linked.length === 0 ? (
                                  <Alert variant="info">No users are linked to this season.</Alert>
                                ) : (
                                  renderPagedUsersTable(linked, usersLinkedPage, setUsersLinkedPage)
                                )}
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <h4 style={{ margin: '8px 0' }}>Not linked to selected season</h4>
                                {unlinked.length === 0 ? (
                                  <Alert variant="info">Everyone is linked to this season.</Alert>
                                ) : (
                                  renderPagedUsersTable(unlinked, usersUnlinkedPage, setUsersUnlinkedPage)
                                )}
                              </div>

                              <SeasonPickerModal
                                open={seasonPickerOpen}
                                mode={seasonPickerMode}
                                seasons={seasonsForEffectiveTeam}
                                member={seasonPickerMember}
                                projectId={String(effectiveTeamId || '')}
                                onClose={() => {
                                  setSeasonPickerOpen(false);
                                  setSeasonPickerMember(null);
                                }}
                                onConfirm={handleSeasonPickerConfirm}
                              />
                            </>
                          );
                        }

                        const totalPages = Math.max(1, Math.ceil(filteredMembers.length / usersPageSize));
                        const safePage = Math.min(usersPage, totalPages);
                        const start = (safePage - 1) * usersPageSize;
                        const pageItems = filteredMembers.slice(start, start + usersPageSize);

                        const teamById = new Map<string, any>();
                        for (const t of childProjects as any[]) teamById.set(String(t.id), t);
                        // Ensure we can resolve the current team in team-detail mode
                        if (isTeamRoute && project) teamById.set(String(project.id), project);

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                                Page {safePage} of {totalPages} ({filteredMembers.length} users)
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
                                  Previous
                                </Button>
                                <Button variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))}>
                                  Next
                                </Button>
                              </div>
                            </div>
                            <UsersTable
                              isTeamRoute={isTeamRoute}
                              pageItems={pageItems}
                              currentOrgSlug={String(currentOrgSlug || '')}
                              currentClubSlugOrId={String(currentClubSlugOrId || '')}
                              currentClubId={String(currentClubId || '')}
                              currentProjectId={String(project?.id || '')}
                              teamById={teamById}
                              userCanManageMembers={Boolean(userCanManageMembers)}
                              seasonId={isSpecificSeasonFilter ? String(userSeasonFilterId) : ''}
                              onOpenAssignSeason={(item: any) => {
                                setSeasonPickerMode('assign');
                                setSeasonPickerMember(item);
                                setSeasonPickerOpen(true);
                              }}
                              onOpenUnassignSeason={(item: any) => {
                                setSeasonPickerMode('unassign');
                                setSeasonPickerMember(item);
                                setSeasonPickerOpen(true);
                              }}
                              onViewUser={(userObj) => {
                                setDetailUser(userObj);
                                setIsUserDetailModalOpen(true);
                              }}
                              onViewMembership={() => {
                                // View is handled via onViewUser (modal).
                              }}
                              onEditMembership={(item) => {
                                setEditingMember(item);
                                setEditingMemberRole((item?.role || 'member') as any);
                                setEditMemberRoleError(null);
                                setIsEditMemberRoleModalOpen(true);
                              }}
                              onRemoveMembership={handleRemoveMembership as any}
                            />

                            <SeasonPickerModal
                              open={seasonPickerOpen}
                              mode={seasonPickerMode}
                              seasons={seasonsForEffectiveTeam}
                              member={seasonPickerMember}
                              projectId={String(effectiveTeamId || '')}
                              onClose={() => {
                                setSeasonPickerOpen(false);
                                setSeasonPickerMember(null);
                              }}
                              onConfirm={handleSeasonPickerConfirm}
                            />
                          </>
                        );
                      })()}
                      </>
                    )}
                  </>
                );
              })()}
            </Card>
          )}

            {activeTab === 'teams' && !isLikelyTeam && (
              <Card className="mb-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 className="text-lg font-semibold" style={{ marginRight: '8px' }}>Teams</h3>
                    <Input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Search teams" style={{ width: '240px' }} />
                    <select
                      value={teamStatusFilter}
                      onChange={(e) => setTeamStatusFilter(e.target.value as any)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'var(--app-surface)',
                      }}
                    >
                      <option value="all">Status: All</option>
                      <option value="active">Status: Active</option>
                      <option value="inactive">Status: Inactive</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setTeamSearch('');
                        setTeamStatusFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                    <button
                      onClick={() => setIsCreateTeamModalOpen(true)}
                      style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: '500' }}
                    >
                      Add Team
                    </button>
                  </div>
                </div>

                {childProjectsLoading ? (
                  <Alert variant="info">Loading teams…</Alert>
                ) : childProjects.length === 0 ? (
                  <Alert variant="info">No teams found in this club.</Alert>
                ) : (
                  (() => {
                    const teamMatchesCount: Record<string, number> = {};
                    for (const m of allMatches as any[]) {
                      const teamId = String(m?.project_id ?? m?.project?.id ?? '').trim();
                      if (!teamId) continue;
                      teamMatchesCount[teamId] = (teamMatchesCount[teamId] || 0) + 1;
                    }

                    const teamSeasonsCountById: Record<string, number> = {};
                    for (const s of seasons as any[]) {
                      if (!isSeasonPeriod(s)) continue;
                      const teamId = String(s?.project_id ?? s?.project?.id ?? '').trim();
                      if (!teamId) continue;
                      teamSeasonsCountById[teamId] = (teamSeasonsCountById[teamId] || 0) + 1;
                    }

                    const teamCompetitionsCountById: Record<string, number> = {};
                    for (const c of competitions as any[]) {
                      if (!isCompetitionPeriod(c)) continue;
                      const teamId = String(c?.project_id ?? c?.project?.id ?? '').trim();
                      if (!teamId) continue;
                      teamCompetitionsCountById[teamId] = (teamCompetitionsCountById[teamId] || 0) + 1;
                    }

                    const normalized = teamSearch.trim().toLowerCase();
                    const filteredTeams = (childProjects as any[]).filter((t: any) => {
                      const isActive = t.is_active !== false;
                      if (teamStatusFilter === 'active' && !isActive) return false;
                      if (teamStatusFilter === 'inactive' && isActive) return false;
                      if (!normalized) return true;
                      return String(t.name || '').toLowerCase().includes(normalized);
                    });

                    const sortedTeams = [...filteredTeams].sort((a: any, b: any) =>
                      String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' })
                    );

                    if (filteredTeams.length === 0) {
                      return <Alert variant="info">No teams match your search.</Alert>;
                    }

                    const clubSlugOrId = project.slug || project.id;

                    return (
                      <Card>
                        <div className="overflow-x-auto">
                          <Table style={compactTableStyle}>
                            <colgroup>
                              <col style={{ width: '180px' }} />
                              <col style={{ width: '95px' }} />
                              <col style={{ width: '120px' }} />
                              <col style={{ width: '95px' }} />
                              <col style={{ width: '90px' }} />
                              <col style={{ width: '120px' }} />
                              <col style={{ width: '330px' }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th style={compactThStyle}>Team</th>
                                <th style={compactThStyle}>Seasons</th>
                                <th style={compactThStyle}>Competitions</th>
                                <th style={compactThStyle}>Matches</th>
                                <th style={compactThStyle}>Users</th>
                                <th style={compactThStyle}>Status</th>
                                <th style={compactThStyle}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedTeams.map((team: any) => {
                                const teamSlugOrId = team.slug || team.id;
                                const teamIdKey = String(team.id);
                                const seasonsCount = teamSeasonsCountById[teamIdKey] ?? 0;
                                const competitionsCount = teamCompetitionsCountById[teamIdKey] ?? 0;
                                const matchesCount = teamMatchesCount[teamIdKey] ?? 0;
                                const usersCount = team.member_count ?? 0;

                                return (
                                  <tr key={team.id}>
                                    <td style={compactTextTdStyle}>
                                      <Link
                                        to={`/${orgSlugOrId}/${clubSlugOrId}/${teamSlugOrId}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {team.name}
                                      </Link>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{seasonsCount}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{competitionsCount}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{matchesCount}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant="default">{usersCount}</Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <Badge variant={team.is_active ? 'success' : 'warning'}>
                                        {team.is_active ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </td>
                                    <td style={compactTdStyle}>
                                      <div style={compactActionsStyle}>
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => {
                                            setDetailProject(team);
                                            setIsDetailModalOpen(true);
                                          }}
                                          style={actionButtonStyle('primary')}
                                        >
                                          View
                                        </button>
                                        {userCanEditProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={() => {
                                              setSelectedEditProject(team);
                                              setIsProjectEditModalOpen(true);
                                            }}
                                            style={actionButtonStyle('warning')}
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {userCanDeleteProject && (
                                          <button
                                            type="button"
                                            className="app-action-button"
                                            onClick={async () => {
                                              if (!window.confirm(`Are you sure you want to delete project ${team.name}?`)) return;
                                              try {
                                                const apiV1BaseUrl = getApiV1BaseUrl();
                                                const res = await fetch(
                                                  `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/${team.slug || team.id}/`,
                                                  {
                                                    method: 'DELETE',
                                                    headers: {
                                                      'Content-Type': 'application/json',
                                                      'X-CSRFToken': getCsrfToken() || '',
                                                    },
                                                    credentials: 'include',
                                                  }
                                                );
                                                if (res.ok) {
                                                  setChildProjects((prev) => prev.filter((p) => String(p.id) !== String(team.id)));
                                                } else {
                                                  alert('Error deleting team');
                                                }
                                              } catch (e) {
                                                console.error(e);
                                                alert('Error deleting team');
                                              }
                                            }}
                                            style={actionButtonStyle('danger')}
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </div>
                      </Card>
                    );
                  })()
                )}
              </Card>
            )}

            {activeTab === 'seasons' && (
              <Card className="mb-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 className="text-lg font-semibold" style={{ marginRight: '8px' }}>Seasons</h3>
                    <Input value={seasonSearch} onChange={(e) => setSeasonSearch(e.target.value)} placeholder="Search seasons" style={{ width: '240px' }} />
                    <select
                      value={seasonTeamFilterId}
                      onChange={(e) => setSeasonTeamFilterId(e.target.value)}
                      disabled={isLikelyTeam}
                      style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)', opacity: isLikelyTeam ? 0.85 : 1 }}
                    >
                      <option value="">Team: All</option>
                      {(isLikelyTeam ? [project] : (childProjects as any[]))
                        .filter(Boolean)
                        .map((t: any) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSeasonSearch('');
                        setSeasonTeamFilterId('');
                      }}
                    >
                      Clear
                    </Button>
                    <button
                      type="button"
                      className="app-action-button"
                      onClick={() => setIsCreateSeasonModalOpen(true)}
                      style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: '500' }}
                    >
                      Add Season
                    </button>
                  </div>
                </div>

                {seasonsLoading ? (
                  <Alert variant="info">Loading seasons…</Alert>
                ) : (() => {
                  const normalized = seasonSearch.trim().toLowerCase();

                  const teamById = new Map<string, any>();
                  for (const t of (isLikelyTeam ? [project] : (childProjects as any[])) as any[]) {
                    if (!t) continue;
                    teamById.set(String((t as any).id), t);
                  }

                  const filteredSeasons = (seasons as any[])
                    .filter((p: any) => isSeasonPeriod(p))
                    .filter((s: any) => {
                      const teamId = String(s?.project_id ?? s?.project?.id ?? '').trim();
                      if (seasonTeamFilterId && teamId !== String(seasonTeamFilterId)) return false;
                      if (!normalized) return true;
                      return String(s?.name || '').toLowerCase().includes(normalized);
                    });

                  const getSeasonTeamName = (s: any) => {
                    const teamId = String(s?.project_id ?? s?.project?.id ?? '').trim();
                    const team = teamId ? teamById.get(teamId) : null;
                    return String(team?.name || teamId || '');
                  };

                  const sortedSeasons = [...filteredSeasons].sort((a: any, b: any) => {
                    if (!isLikelyTeam) {
                      const teamCmp = getSeasonTeamName(a).localeCompare(getSeasonTeamName(b), undefined, { sensitivity: 'base' });
                      if (teamCmp !== 0) return teamCmp;
                    }
                    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
                  });

                  if (filteredSeasons.length === 0) {
                    return <Alert variant="info">No seasons found for this club (or current filters).</Alert>;
                  }

                  const competitionsBySeasonId: Record<string, number> = {};
                  for (const c of competitions as any[]) {
                    const parentId = String(c?.parent_period_id ?? c?.parent_period?.id ?? '').trim();
                    if (!parentId) continue;
                    competitionsBySeasonId[parentId] = (competitionsBySeasonId[parentId] || 0) + 1;
                  }

                  const matchCountByCompetitionId: Record<string, number> = {};
                  for (const c of competitions as any[]) {
                    const compId = String(c?.id || '').trim();
                    if (!compId) continue;
                    const annotated = Number(c?.matches_count ?? c?.children_matches_count);
                    if (Number.isFinite(annotated) && annotated >= 0) {
                      matchCountByCompetitionId[compId] = annotated;
                    }
                  }

                  return (
                    <Card>
                      <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                          <colgroup>
                            {!isLikelyTeam && <col style={{ width: '180px' }} />}
                            <col style={{ width: '180px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '95px' }} />
                            <col style={{ width: '330px' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              {!isLikelyTeam && <th style={compactThStyle}>Team</th>}
                              <th style={compactThStyle}>Season</th>
                              <th style={compactThStyle}>Competitions</th>
                              <th style={compactThStyle}>Matches</th>
                              <th style={compactThStyle}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedSeasons.map((season: any) => {
                              const seasonId = String(season.id);
                              const seasonSlugOrId = periodPathKey(season) || season.slug || season.id;
                              const teamId = String(season?.project_id ?? season?.project?.id ?? (isLikelyTeam ? (project as any)?.id : '')).trim();
                              const team = teamId ? teamById.get(teamId) : null;
                              const teamSlugOrId = team?.slug || team?.id || teamId;
                              const competitionsCount = competitionsBySeasonId[seasonId] || 0;

                              const annotatedSeasonMatches = Number(season?.children_matches_count ?? season?.matches_count);
                              const compsForSeason = (competitions as any[]).filter((c: any) => String(c?.parent_period_id ?? c?.parent_period?.id ?? '') === seasonId);
                              const computedMatchesCount = compsForSeason.reduce((sum: number, c: any) => sum + (matchCountByCompetitionId[String(c.id)] || 0), 0);
                              const matchesCount = Number.isFinite(annotatedSeasonMatches) && annotatedSeasonMatches >= 0
                                ? annotatedSeasonMatches
                                : computedMatchesCount;

                              const openHref = currentClubSlugOrId && teamSlugOrId
                                ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}`
                                : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}`;

                              return (
                                <tr key={seasonId}>
                                  {!isLikelyTeam && (
                                    <td style={compactTextTdStyle}>
                                      {teamSlugOrId ? (
                                        <Link
                                          to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {team?.name || teamId || '—'}
                                        </Link>
                                      ) : (team?.name || teamId || '—')}
                                    </td>
                                  )}
                                  <td style={compactTextTdStyle}>
                                    <Link to={openHref} className="text-blue-600 hover:underline">
                                      {season.name}
                                    </Link>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{competitionsCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{matchesCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <div style={compactActionsStyle}>
                                      <button
                                        type="button"
                                        className="app-action-button"
                                        onClick={() => {
                                          setDetailProject({ id: season.id, slug: season.slug, name: season.name, project_type: 'period' } as any);
                                          setIsDetailModalOpen(true);
                                        }}
                                        style={actionButtonStyle('primary')}
                                      >
                                        View
                                      </button>
                                      {userCanEditProject && (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => {
                                            setSelectedEditPeriod(season);
                                            setIsPeriodEditModalOpen(true);
                                          }}
                                          style={actionButtonStyle('warning')}
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {userCanDeleteProject && (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to delete season ${season.name}?`)) return;
                                            try {
                                              const apiV1BaseUrl = getApiV1BaseUrl();
                                              const res = await fetch(`${apiV1BaseUrl}/periods/${season.id}/`, {
                                                method: 'DELETE',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'X-CSRFToken': getCsrfToken() || '',
                                                },
                                                credentials: 'include',
                                              });
                                              if (res.ok) {
                                                setSeasons((prev) => prev.filter((p: any) => String(p.id) !== String(season.id)));
                                              } else {
                                                alert('Error deleting season');
                                              }
                                            } catch (e) {
                                              console.error(e);
                                              alert('Error deleting season');
                                            }
                                          }}
                                          style={actionButtonStyle('danger')}
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  );
                })()}
              </Card>
            )}

            {activeTab === 'competitions' && (
              <Card className="mb-6">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 className="text-lg font-semibold" style={{ marginRight: '8px' }}>Competitions</h3>
                    <Input value={competitionSearch} onChange={(e) => setCompetitionSearch(e.target.value)} placeholder="Search competitions" style={{ width: '240px' }} />
                    <select
                      value={compTeamFilterId}
                      onChange={(e) => {
                        setCompTeamFilterId(e.target.value);
                        setCompSeasonFilterId('');
                      }}
                      disabled={isLikelyTeam}
                      style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)', opacity: isLikelyTeam ? 0.85 : 1 }}
                    >
                      <option value="">Team: All</option>
                      {(isLikelyTeam ? [project] : (childProjects as any[]))
                        .filter(Boolean)
                        .map((t: any) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={compSeasonFilterId}
                      onChange={(e) => setCompSeasonFilterId(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                    >
                      <option value="">Season: All</option>
                      {Array.from(
                        new Set(
                          (seasons as any[])
                            .filter((p: any) => isSeasonPeriod(p))
                            .filter((s: any) => {
                              const teamId = String(s.project_id ?? s.project?.id ?? '').trim();
                              if (compTeamFilterId && teamId !== String(compTeamFilterId)) return false;
                              return true;
                            })
                            .map((s: any) => JSON.stringify({ id: String(s.id), name: s.name }))
                        )
                      ).map((jsonStr) => {
                        const s = JSON.parse(jsonStr);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={compMatchesFilter}
                      onChange={(e) => setCompMatchesFilter(e.target.value as any)}
                      style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                    >
                      <option value="all">Matches: All</option>
                      <option value="with">With Matches</option>
                      <option value="without">Without Matches</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCompetitionSearch('');
                        setCompTeamFilterId('');
                        setCompSeasonFilterId('');
                        setCompMatchesFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                    <button
                      type="button"
                      className="app-action-button"
                      onClick={() => setIsCreateCompetitionModalOpen(true)}
                      style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '140px', fontWeight: '500' }}
                    >
                      Add Competition
                    </button>
                  </div>
                </div>

                {competitionsLoading ? (
                  <Alert variant="info">Loading competitions…</Alert>
                ) : (() => {
                  const normalized = competitionSearch.trim().toLowerCase();

                  const teamById = new Map<string, any>();
                  for (const t of (isLikelyTeam ? [project] : (childProjects as any[])) as any[]) {
                    if (!t) continue;
                    teamById.set(String((t as any).id), t);
                  }

                  const seasonById = new Map<string, any>();
                  for (const s of seasons as any[]) {
                    if (!isSeasonPeriod(s)) continue;
                    seasonById.set(String(s.id), s);
                  }

                  const getMatchParticipationsCount = (m: any): number => {
                    const raw = (m as any)?.participations_count ?? (m as any)?.participants_count;
                    const n = Number(raw);
                    if (Number.isFinite(n) && n >= 0) return n;
                    const list = (m as any)?.participations ?? (m as any)?.participants;
                    return Array.isArray(list) ? list.length : 0;
                  };

                  // Aggregate participant counts per competition (best-effort).
                  const allCompetitionIds = new Set(
                    (competitions as any[])
                      .filter((p: any) => isCompetitionPeriod(p))
                      .map((p: any) => String(p?.id ?? '').trim())
                      .filter(Boolean)
                  );

                  const participantsByCompetitionId: Record<string, number> = {};
                  for (const m of allMatches as any[]) {
                    const count = getMatchParticipationsCount(m);
                    if (!count) continue;

                    const periodObj = (m as any)?.period;
                    const directId = String(periodObj?.id ?? (m as any)?.period_id ?? '').trim();
                    if (!directId) continue;

                    const parent1 = String(periodObj?.parent_period_id ?? periodObj?.parent_period?.id ?? '').trim();
                    const parentObj = periodObj?.parent_period ?? periodObj?.parent;
                    const parent2 = String(parentObj?.parent_period_id ?? parentObj?.parent_period?.id ?? '').trim();

                    const bucketId =
                      (directId && allCompetitionIds.has(directId) && directId) ||
                      (parent1 && allCompetitionIds.has(parent1) && parent1) ||
                      (parent2 && allCompetitionIds.has(parent2) && parent2) ||
                      directId;

                    participantsByCompetitionId[bucketId] = (participantsByCompetitionId[bucketId] || 0) + count;
                  }

                  const matchCountByCompetitionId: Record<string, number> = {};
                  for (const c of competitions as any[]) {
                    const compId = String(c?.id || '').trim();
                    if (!compId) continue;
                    const annotated = Number(c?.matches_count ?? c?.children_matches_count);
                    if (Number.isFinite(annotated) && annotated >= 0) {
                      matchCountByCompetitionId[compId] = annotated;
                    }
                  }

                  const filteredCompetitions = (competitions as any[])
                    .filter((p: any) => isCompetitionPeriod(p))
                    .filter((comp: any) => {
                      const teamId = String(comp.project_id ?? comp.project?.id ?? '').trim();
                      if (compTeamFilterId && teamId !== String(compTeamFilterId)) return false;

                      const seasonId = String(comp.parent_period_id ?? comp.parent_period?.id ?? '').trim();
                      if (compSeasonFilterId && seasonId !== String(compSeasonFilterId)) return false;

                      const matchesCount = matchCountByCompetitionId[String(comp.id)] || 0;
                      if (compMatchesFilter === 'with' && matchesCount === 0) return false;
                      if (compMatchesFilter === 'without' && matchesCount > 0) return false;

                      if (!normalized) return true;
                      return String(comp.name || '').toLowerCase().includes(normalized);
                    });

                  const getCompetitionTeamName = (comp: any) => {
                    const teamId = String(comp.project_id ?? comp.project?.id ?? '').trim();
                    const team = teamId ? teamById.get(teamId) : null;
                    return String(team?.name || teamId || '');
                  };

                  const getCompetitionSeasonName = (comp: any) => {
                    const seasonId = String(comp.parent_period_id ?? comp.parent_period?.id ?? '').trim();
                    const season = seasonId ? seasonById.get(seasonId) : null;
                    return String(season?.name || comp.parent_period?.name || seasonId || '');
                  };

                  const sortedCompetitions = [...filteredCompetitions].sort((a: any, b: any) => {
                    if (!isLikelyTeam) {
                      const teamCmp = getCompetitionTeamName(a).localeCompare(getCompetitionTeamName(b), undefined, { sensitivity: 'base' });
                      if (teamCmp !== 0) return teamCmp;
                    }
                    const seasonCmp = getCompetitionSeasonName(a).localeCompare(getCompetitionSeasonName(b), undefined, { sensitivity: 'base' });
                    if (seasonCmp !== 0) return seasonCmp;
                    return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
                  });

                  if (filteredCompetitions.length === 0) {
                    return <Alert variant="info">No competitions found for this club (or current filters).</Alert>;
                  }

                  return (
                    <Card>
                      <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                          <colgroup>
                            {!isLikelyTeam && <col style={{ width: '180px' }} />}
                            <col style={{ width: '180px' }} />
                            <col style={{ width: '200px' }} />
                            <col style={{ width: '95px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '330px' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              {!isLikelyTeam && <th style={compactThStyle}>Team</th>}
                              <th style={compactThStyle}>Season</th>
                              <th style={compactThStyle}>Competition</th>
                              <th style={compactThStyle}>Matches</th>
                              <th style={compactThStyle}>Participants</th>
                              <th style={compactThStyle}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedCompetitions.map((comp: any) => {
                              const teamId = String(comp.project_id ?? comp.project?.id ?? '').trim();
                              const team = teamId ? teamById.get(teamId) : null;
                              const teamSlugOrId = team?.slug || team?.id || teamId;

                              const seasonId = String(comp.parent_period_id ?? comp.parent_period?.id ?? '').trim();
                              const season = seasonId ? seasonById.get(seasonId) : null;
                              const seasonSlugOrId = season?.slug || season?.id || seasonId;

                              const openHref = currentClubSlugOrId && teamSlugOrId && seasonSlugOrId
                                ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${comp.slug || comp.id}`
                                : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${comp.slug || comp.id}`;

                              const matchesCount = matchCountByCompetitionId[String(comp.id)] || 0;
                              const participantsCount =
                                Number(comp?.participants_count ?? comp?.participations_count) ||
                                (participantsByCompetitionId[String(comp.id)] || 0);

                              return (
                                <tr key={comp.id}>
                                  {!isLikelyTeam && (
                                    <td style={compactTextTdStyle}>
                                      {teamSlugOrId ? (
                                        <Link
                                          to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {team?.name || teamId || '—'}
                                        </Link>
                                      ) : (team?.name || teamId || '—')}
                                    </td>
                                  )}
                                  <td style={compactTextTdStyle}>
                                    {seasonSlugOrId && teamSlugOrId ? (
                                      <Link
                                          to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {season?.name || comp.parent_period?.name || seasonId || '—'}
                                      </Link>
                                    ) : (season?.name || comp.parent_period?.name || seasonId || '—')}
                                  </td>
                                  <td style={compactTextTdStyle}>
                                    <Link to={openHref} className="text-blue-600 hover:underline">
                                      {comp.name}
                                    </Link>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{matchesCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{participantsCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <div style={compactActionsStyle}>
                                      <button
                                        type="button"
                                        className="app-action-button"
                                        onClick={() => {
                                          setDetailProject({ id: comp.id, slug: comp.slug, name: comp.name, project_type: 'period' } as any);
                                          setIsDetailModalOpen(true);
                                        }}
                                        style={actionButtonStyle('primary')}
                                      >
                                        View
                                      </button>
                                      {userCanEditProject && (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={() => {
                                            setSelectedEditPeriod(comp);
                                            setIsPeriodEditModalOpen(true);
                                          }}
                                          style={actionButtonStyle('warning')}
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {userCanDeleteProject && (
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to delete competition ${comp.name}?`)) return;
                                            try {
                                              const apiV1BaseUrl = getApiV1BaseUrl();
                                              const res = await fetch(`${apiV1BaseUrl}/periods/${comp.id}/`, {
                                                method: 'DELETE',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'X-CSRFToken': getCsrfToken() || '',
                                                },
                                                credentials: 'include',
                                              });
                                              if (res.ok) {
                                                setCompetitions((prev) => prev.filter((p: any) => String(p.id) !== String(comp.id)));
                                              } else {
                                                alert('Error deleting competition');
                                              }
                                            } catch (e) {
                                              console.error(e);
                                              alert('Error deleting competition');
                                            }
                                          }}
                                          style={actionButtonStyle('danger')}
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    </Card>
                  );
                })()}
              </Card>
            )}

          {activeTab === 'matches' && (
            <Card className="mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 className="text-lg font-semibold" style={{ marginRight: '8px' }}>Matches</h3>
                  <Input value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="Search matches" style={{ width: '240px' }} />
                  <select
                    value={matchTeamFilterId}
                    onChange={(e) => {
                      setMatchTeamFilterId(e.target.value);
                      setMatchSeasonFilterId('');
                      setMatchCompetitionFilterId('');
                    }}
                    disabled={isLikelyTeam}
                    style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)', opacity: isLikelyTeam ? 0.85 : 1 }}
                  >
                    <option value="">Team: All</option>
                    {(isLikelyTeam ? [project] : (childProjects as any[]))
                      .filter(Boolean)
                      .map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={matchSeasonFilterId}
                    onChange={(e) => {
                      setMatchSeasonFilterId(e.target.value);
                      setMatchCompetitionFilterId('');
                    }}
                    style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                  >
                    <option value="">Season: All</option>
                    {Array.from(
                      new Set(
                        (seasons as any[])
                          .filter((p: any) => isSeasonPeriod(p))
                          .filter((s: any) => {
                            const teamId = String(s.project_id ?? s.project?.id ?? '').trim();
                            if (matchTeamFilterId && teamId !== String(matchTeamFilterId)) return false;
                            return true;
                          })
                          .map((s: any) => JSON.stringify({ id: String(s.id), name: s.name }))
                      )
                    ).map((jsonStr) => {
                      const s = JSON.parse(jsonStr);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={matchCompetitionFilterId}
                    onChange={(e) => setMatchCompetitionFilterId(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid var(--app-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--app-surface)' }}
                  >
                    <option value="">Competition: All</option>
                    {Array.from(
                      new Set(
                        (competitions as any[])
                          .filter((p: any) => isCompetitionPeriod(p))
                          .filter((c: any) => {
                            const teamId = String(c.project_id ?? c.project?.id ?? '').trim();
                            if (matchTeamFilterId && teamId !== String(matchTeamFilterId)) return false;
                            const seasonId = String(c.parent_period_id ?? c.parent_period?.id ?? '').trim();
                            if (matchSeasonFilterId && seasonId !== String(matchSeasonFilterId)) return false;
                            return true;
                          })
                          .map((c: any) => JSON.stringify({ id: String(c.id), name: c.name }))
                      )
                    ).map((jsonStr) => {
                      const c = JSON.parse(jsonStr);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setMatchSearch('');
                      setMatchTeamFilterId('');
                      setMatchSeasonFilterId('');
                      setMatchCompetitionFilterId('');
                    }}
                  >
                    Clear
                  </Button>
                  <button
                    type="button"
                    className="app-action-button"
                    onClick={() => setIsCreateMatchModalOpen(true)}
                    style={{ ...actionButtonStyle('primary'), padding: '8px 16px', fontSize: '14px', minWidth: '120px', fontWeight: '500' }}
                  >
                    Add Match
                  </button>
                </div>
              </div>

              {allMatchesLoading ? (
                <Alert variant="info">Loading matches…</Alert>
              ) : (() => {
                const teamById = new Map<string, any>();
                for (const t of (isLikelyTeam ? [project] : (childProjects as any[])) as any[]) {
                  if (!t) continue;
                  teamById.set(String((t as any).id), t);
                }

                const periodById = new Map<string, any>();
                for (const p of competitions as any[]) {
                  periodById.set(String(p.id), p);
                }

                const seasonById = new Map<string, any>();
                for (const s of seasons as any[]) {
                  if (!isSeasonPeriod(s)) continue;
                  seasonById.set(String(s.id), s);
                }

                const periodParentIdMap = new Map<string, string>();
                for (const p of competitions as any[]) {
                  const parentId = p.parent_period_id ?? p.parent_period?.id ?? '';
                  if (parentId) periodParentIdMap.set(String(p.id), String(parentId));
                }

                const normalized = matchSearch.trim().toLowerCase();
                const matches = (allMatches as any[]).filter((m: any) => {
                  const teamId = String(m.project?.id ?? m.project_id ?? '').trim();
                  if (matchTeamFilterId && teamId !== String(matchTeamFilterId)) return false;

                  const periodId = String(m.period?.id ?? m.period_id ?? '').trim();

                  if (matchSeasonFilterId) {
                    let seasonId = periodParentIdMap.get(periodId) || '';
                    if (seasonId && periodParentIdMap.get(seasonId)) {
                      seasonId = periodParentIdMap.get(seasonId) || seasonId;
                    }
                    if (seasonId !== String(matchSeasonFilterId)) return false;
                  }

                  if (matchCompetitionFilterId) {
                    if (periodId === String(matchCompetitionFilterId)) {
                      // ok
                    } else {
                      const parentId = periodParentIdMap.get(periodId);
                      if (String(parentId || '') !== String(matchCompetitionFilterId)) return false;
                    }
                  }

                  if (!normalized) return true;
                  return String(m.title || m.name || m.id).toLowerCase().includes(normalized);
                });

                const getMatchTeamName = (m: any) => {
                  const teamId = String(m.project?.id ?? m.project_id ?? '').trim();
                  const team = teamId ? teamById.get(teamId) : null;
                  return String(team?.name || teamId || '');
                };

                const getMatchCompetitionName = (m: any) => {
                  const periodId = String(m.period?.id ?? m.period_id ?? '').trim();
                  const competition = periodId ? periodById.get(periodId) : null;
                  return String(competition?.name || m.period?.name || '');
                };

                const getMatchSeasonName = (m: any) => {
                  const periodId = String(m.period?.id ?? m.period_id ?? '').trim();
                  const competition = periodId ? periodById.get(periodId) : null;
                  const compSeasonId = competition ? String(competition.parent_period_id ?? competition.parent_period?.id ?? '') : '';
                  const season = compSeasonId ? seasonById.get(compSeasonId) : null;
                  return String(season?.name || '');
                };

                const sortedMatches = [...matches].sort((a: any, b: any) => {
                  if (!isLikelyTeam) {
                    const teamCmp = getMatchTeamName(a).localeCompare(getMatchTeamName(b), undefined, { sensitivity: 'base' });
                    if (teamCmp !== 0) return teamCmp;
                  }
                  const seasonCmp = getMatchSeasonName(a).localeCompare(getMatchSeasonName(b), undefined, { sensitivity: 'base' });
                  if (seasonCmp !== 0) return seasonCmp;
                  const compCmp = getMatchCompetitionName(a).localeCompare(getMatchCompetitionName(b), undefined, { sensitivity: 'base' });
                  if (compCmp !== 0) return compCmp;
                  return String(a?.title || a?.name || a?.id || '').localeCompare(
                    String(b?.title || b?.name || b?.id || ''),
                    undefined,
                    { sensitivity: 'base' }
                  );
                });

                if (matches.length === 0) {
                  return <Alert variant="info">No matches found for this club (or current filters).</Alert>;
                }

                return (
                  <Card>
                    <div className="overflow-x-auto">
                      <Table style={compactTableStyle}>
                        <colgroup>
                          {!isLikelyTeam && <col style={{ width: '160px' }} />}
                          <col style={{ width: '160px' }} />
                          <col style={{ width: '160px' }} />
                          <col style={{ width: '220px' }} />
                          <col style={{ width: '140px' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '390px' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            {!isLikelyTeam && <th style={compactThStyle}>Team</th>}
                            <th style={compactThStyle}>Season</th>
                            <th style={compactThStyle}>Competition</th>
                            <th style={compactThStyle}>Match</th>
                            <th style={compactThStyle}>Start</th>
                            <th style={compactThStyle}>Participants</th>
                            <th style={compactThStyle}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMatches.map((m: any) => {
                            const teamId = String(m.project?.id ?? m.project_id ?? '').trim();
                            const team = teamId ? teamById.get(teamId) : null;
                            const teamSlugOrId = team?.slug || team?.id || teamId;

                            const periodId = String(m.period?.id ?? m.period_id ?? '').trim();
                            const competition = periodId ? periodById.get(periodId) : null;
                            const compSeasonId = competition ? String(competition.parent_period_id ?? competition.parent_period?.id ?? '') : '';
                            const season = compSeasonId ? seasonById.get(compSeasonId) : null;
                            const seasonSlugOrId = season?.slug || season?.id || compSeasonId;
                            const compSlugOrId = String((competition as any)?.slug || periodId || '').trim();
                            const matchSlugOrId = String((m as any)?.slug || m.id || '').trim();
                            const matchDetailPath = (currentOrgSlug && currentClubSlugOrId && teamSlugOrId && seasonSlugOrId && compSlugOrId)
                              ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${compSlugOrId}/${matchSlugOrId}`
                              : `/matches/${matchSlugOrId}`;

                            const formattedStart = m.start_time
                              ? new Date(m.start_time).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              : '-';

                            const participantsCount = (() => {
                              const raw = (m as any)?.participations_count ?? (m as any)?.participants_count;
                              const n = Number(raw);
                              if (Number.isFinite(n) && n >= 0) return n;
                              const list = (m as any)?.participations ?? (m as any)?.participants;
                              return Array.isArray(list) ? list.length : 0;
                            })();

                            return (
                              <tr key={m.id}>
                                {!isLikelyTeam && (
                                  <td style={compactTextTdStyle}>
                                    {teamSlugOrId ? (
                                      <Link
                                        to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {team?.name || teamId || '-'}
                                      </Link>
                                    ) : (team?.name || teamId || '-')}
                                  </td>
                                )}
                                <td style={compactTextTdStyle}>
                                  {season && seasonSlugOrId && teamSlugOrId ? (
                                    <Link
                                      to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {season.name}
                                    </Link>
                                  ) : '-'}
                                </td>
                                <td style={compactTextTdStyle}>
                                  {competition && seasonSlugOrId && teamSlugOrId ? (
                                    <Link
                                      to={currentClubSlugOrId ? `/${currentOrgSlug}/${currentClubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${competition.slug || periodId}` : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competition.slug || periodId}`}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {competition.name || m.period?.name}
                                    </Link>
                                  ) : (m.period?.name || '-')}
                                </td>
                                <td style={compactTextTdStyle}>
                                  <Link to={matchDetailPath} className="text-blue-600 hover:underline">
                                    {m.title || m.name || m.id}
                                  </Link>
                                </td>
                                <td style={compactTextTdStyle}>{formattedStart}</td>
                                <td style={compactTdStyle}>
                                  <Badge variant="default">{participantsCount}</Badge>
                                </td>
                                <td style={compactTdStyle}>
                                  <div style={compactActionsStyle}>
                                    <button
                                      type="button"
                                      className="app-action-button"
                                      onClick={() => {
                                        setDetailProject({ id: m.id, name: m.title || m.name, project_type: 'activity' } as any);
                                        setIsDetailModalOpen(true);
                                      }}
                                      style={actionButtonStyle('primary')}
                                    >
                                      View
                                    </button>
                                    {userCanEditProject && (
                                      <button
                                        type="button"
                                        className="app-action-button"
                                        onClick={() => {
                                          setSelectedEditMatch(m);
                                          setIsMatchEditModalOpen(true);
                                        }}
                                        style={actionButtonStyle('warning')}
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {userCanDeleteProject && (
                                      <button
                                        type="button"
                                        className="app-action-button"
                                        onClick={async () => {
                                          if (!window.confirm(`Are you sure you want to delete match "${m.title || m.name}"?`)) return;
                                          try {
                                            const apiV1BaseUrl = getApiV1BaseUrl();
                                            const res = await fetch(`${apiV1BaseUrl}/activities/${m.id}/`, {
                                              method: 'DELETE',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': getCsrfToken() || '',
                                              },
                                              credentials: 'include',
                                            });
                                            if (res.ok) {
                                              setAllMatches((prev) => prev.filter((match: any) => String(match.id) !== String(m.id)));
                                            } else {
                                              alert('Error deleting match');
                                            }
                                          } catch (e) {
                                            console.error(e);
                                            alert('Error deleting match');
                                          }
                                        }}
                                        style={actionButtonStyle('danger')}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  </Card>
                );
              })()}
            </Card>
          )}

          {activeTab === 'audit' && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              {recentEvents.length > 0 ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>User</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <Badge variant="default" data-testid={`event-type-${event.id}`}>
                            {event.event_type}
                          </Badge>
                        </td>
                        <td style={{ fontSize: '0.85rem' }} data-testid={`event-user-${event.id}`}>
                          {event.user?.name || 'System'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }} data-testid={`event-time-${event.id}`}>
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No recent activity</Alert>
              )}
            </Card>
          )}
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

          await fetchChildTeams();
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

          await fetchSeasons();
          await fetchCompetitions();
          await fetchAllMatches();
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

          await fetchCompetitions();
          await fetchAllMatches();
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

          await fetchAllMatches();
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
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;

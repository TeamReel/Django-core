import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import ProjectDetailModal from './ProjectDetailModal';
import ProjectEditModal from './ProjectEditModal';
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
import { fetchAllPages } from '../../utils/fetchAllPages';

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
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organisation | null>(null);
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

  const [orgPeriods, setOrgPeriods] = useState<any[]>([]);
  const [orgPeriodsLoading, setOrgPeriodsLoading] = useState(false);
  const [teamSeasonsCountById, setTeamSeasonsCountById] = useState<Record<string, number>>({});
  const [teamCompetitionsCountById, setTeamCompetitionsCountById] = useState<Record<string, number>>({});

  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);
  const [competitionsCount, setCompetitionsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [teamsCount, setTeamsCount] = useState<number | null>(null);

  const [selectedClub, setSelectedClub] = useState<Project | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [selectedEditProject, setSelectedEditProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview'
    | 'clubs'
    | 'teams'
    | 'seasons'
    | 'competitions'
    | 'matches'
    | 'users'
    | 'governance'
    | 'audit'
    | 'operations'
  >('overview');
  const [memberSearch, setMemberSearch] = useState('');
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

  const [matchSearch, setMatchSearch] = useState('');
  const [matchClubFilterId, setMatchClubFilterId] = useState<string>('');
  const [matchTeamFilterId, setMatchTeamFilterId] = useState<string>('');
  const [matchCompFilterId, setMatchCompFilterId] = useState<string>('');

  const [federationMatches, setFederationMatches] = useState<any[]>([]);
  const [federationMatchesLoading, setFederationMatchesLoading] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<any[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);

  // Inline edit state for Overview
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

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
    navigate(`/organisations/${option.slug || option.id}`);
  };

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'clubs' as const, label: 'Clubs' },
      { id: 'teams' as const, label: 'Teams' },
      { id: 'seasons' as const, label: 'Seasons' },
      { id: 'competitions' as const, label: 'Competitions' },
      { id: 'matches' as const, label: 'Matches' },
      { id: 'users' as const, label: 'Users' },
      { id: 'governance' as const, label: 'Governance' },
      { id: 'audit' as const, label: 'Audit' },
      { id: 'operations' as const, label: 'Operations (Admin)' },
    ],
    []
  );

  const orgSlugOrId = String(org?.slug || org?.id || currentOrgSlug || '');

  const getApiV1BaseUrl = () => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
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
    const type = getPeriodType(p);
    if (type === 'season') return true;

    // Fallback for older/legacy seeders that didn't set metadata.type.
    // Treat a root period named like "Season ..." / "Seizoen ..." as a season.
    const parentId = getPeriodParentId(p);
    if (parentId) return false;

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

  const compactTableStyle: React.CSSProperties = { tableLayout: 'fixed', width: '100%' };
  const compactThStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.8rem' };
  const compactTdStyle: React.CSSProperties = { padding: '6px 8px', fontSize: '0.85rem', verticalAlign: 'middle' };
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

  type ActionTone = 'neutral' | 'primary' | 'danger';
  const actionButtonStyle = (tone: ActionTone): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '4px',
      backgroundColor: 'var(--app-surface)',
      cursor: 'pointer',
      fontSize: '12px',
      lineHeight: 1.2,
    };
    if (tone === 'primary') {
      return { ...base, border: '1px solid #007bff', color: '#007bff' };
    }
    if (tone === 'danger') {
      return { ...base, border: '1px solid #dc3545', color: '#dc3545' };
    }
    return { ...base, border: '1px solid #6c757d', color: '#6c757d' };
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
      params.set('page_size', '100');
      params.set('activity_type', 'match');
      params.set('organisation_id', organisationId);

      const all = await fetchAllPages<any>(`${apiV1BaseUrl}/activities/?${params.toString()}`, {
        credentials: 'include',
      });

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

  const fetchTeamsForOrg = async () => {
    if (!currentOrgSlug) return;
    console.log('[OrganisationDetailPage] fetchTeamsForOrg starting', { currentOrgSlug, orgId: org?.id || currentOrgId });
    setTeamsLoading(true);
    try {
      const apiV1BaseUrl = getApiV1BaseUrl();
      const clubsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;

      console.log('[OrganisationDetailPage] Fetching teams from', teamsUrl);

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

      console.log('[OrganisationDetailPage] Teams loaded:', teamsOnly.length, 'Clubs loaded:', clubsOnly.length);
      setAllClubsForTeams(clubsOnly);
      setTeams(teamsOnly);
    } catch (e) {
      console.error(e);
      setTeams([]);
      setAllClubsForTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const recomputePeriodCounts = (allPeriods: any[]) => {
    const seasonsByProjectId: Record<string, number> = {};
    const competitionsByProjectId: Record<string, number> = {};

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
        }
      }
      return isCompetition;
    });

    setSeasonsCount(seasons.length);
    setCompetitionsCount(competitions.length);
    setTeamSeasonsCountById(seasonsByProjectId);
    setTeamCompetitionsCountById(competitionsByProjectId);
  };

  const ensureOrgPeriodsLoaded = async () => {
    console.log('[OrganisationDetailPage] ensureOrgPeriodsLoaded called', { activeTab, teamsCount: teams.length, orgPeriodsCount: orgPeriods.length, loading: orgPeriodsLoading });
    if (orgPeriodsLoading) return;
    if (orgPeriods.length > 0) return;
    if (!teams || teams.length === 0) return;

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

        console.log(`[OrganisationDetailPage] Fetching periods for ${teams.length} teams in ${teamChunks.length} chunks`);

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

        console.log('[OrganisationDetailPage] Total unique periods fetched via teams:', unique.size);

        const merged = Array.from(unique.values());
        setOrgPeriods(merged);
        recomputePeriodCounts(merged);
      } catch (e) {
        console.warn('[OrganisationDetailPage] Failed to load periods via team scope', e);
      } finally {
        setOrgPeriodsLoading(false);
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
      ensureOrgPeriodsLoaded();
    }
  };

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
        params.set('page_size', '250');
        const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
        const allMembers = await fetchAllPages<any>(membersUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(org?.id || currentOrgId || ''),
          },
          credentials: 'include',
        });
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

  // Lazy load members only when Users tab is active (performance optimization)
  const fetchMembers = async () => {
    if (membersLoading || members.length > 0) return;
    if (!org?.id && !currentOrgId) return;

    setMembersLoading(true);
    const apiV1BaseUrl = getApiV1BaseUrl();
    const orgId = String(org?.id || currentOrgId);

    try {
      const params = new URLSearchParams();
      params.set('include_project_memberships', 'true');
      params.set('include_role_assignments', 'true');
      params.set('page_size', '250');

      const membersUrl = `${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/?${params.toString()}`;
      const allMembers = await fetchAllPages<any>(membersUrl, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': orgId,
        },
        credentials: 'include',
      });
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
        console.log('[OrganisationDetailPage] Org data loaded', orgData);
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
    // Reset paging when switching tabs
    if (activeTab === 'clubs') {
      fetchClubsPage(clubsPage);
    }
    if (activeTab === 'teams' || activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'matches' || activeTab === 'clubs') {
      fetchTeamsForOrg();
    }

    if (activeTab === 'matches') {
      const orgId = String(org?.id || currentOrgId || '');
      if (orgId) fetchFederationMatches(orgId);
    }

    if (activeTab === 'overview') {
       const orgId = String(org?.id || currentOrgId || '');
       if (orgId) {
         fetchScheduledMatches(orgId);
         fetchRecentPlayedMatches(orgId);
       }
    }

    // Lazy load members only when Users tab is active
    if (activeTab === 'users') {
      fetchMembers();
    }
  }, [activeTab, org?.id, currentOrgId]);

  useEffect(() => {
    // When teams are loaded, ensure periods are loaded for tabs that need them.
    // This allows lazy loading of periods only when needed (or when teams are finally available).
    if (activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'clubs') {
       if (teams.length > 0) {
           ensureOrgPeriodsLoaded();
       }
    }
  }, [activeTab, teams]);

  useEffect(() => {
    if (activeTab === 'clubs') {
      fetchClubsPage(clubsPage);
    }
  }, [clubsPage]);

  useEffect(() => {
    setUsersPage(1);
  }, [memberSearch]);

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
      <AppShell>
        <div>
          <PageHeader
            title="Organisation Details"
            breadcrumbs={[
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Federations', onClick: () => navigate('/federations') },
              { label: 'Loading...', current: true },
            ]}
          />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading organisation details...
              </div>
            </Card>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  if (error || !org) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Organisation Details"
            breadcrumbs={[
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Federations', onClick: () => navigate('/federations') },
              { label: 'Error', current: true },
            ]}
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
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
        title={org.name}
        subtitle="Federation overview"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Federations', onClick: () => navigate('/federations') },
          {
            label: (
              <BreadcrumbContextSwitcher
                currentId={String(resolvedOrg?.id || org.id || '')}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={organisationOptions.length > 1}
                type="organisation"
              />
            ),
            current: true,
          },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/federations')}>
              Back
            </Button>
            {userCanEditOrg && (
              <>
                <Button variant="secondary" size="sm" onClick={() => {
                  setActiveTab('overview');
                  setTimeout(() => {
                    handleEdit();
                  }, 100);
                }}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
          </div>
        }
      />

      <PageContent>
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

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('clubs')}>
                  <div className="text-sm font-medium text-gray-500">Clubs</div>
                  <div className="text-2xl font-bold mt-1">{org.clubs_count || clubsCount || 0}</div>
               </Card>
               <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('teams')}>
                  <div className="text-sm font-medium text-gray-500">Teams</div>
                  <div className="text-2xl font-bold mt-1">{org.teams_count || teamsCount || 0}</div>
               </Card>
               <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('users')}>
                  <div className="text-sm font-medium text-gray-500">Users</div>
                  <div className="text-2xl font-bold mt-1">{org.member_count || members.length || 0}</div>
               </Card>
               <Card style={{ padding: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('matches')}>
                  <div className="text-sm font-medium text-gray-500">Active Matches</div>
                  <div className="text-2xl font-bold mt-1">{matchesCount ?? '—'}</div>
               </Card>
            </div>

            {/* Organisation Details Card */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Organisation Details</h3>
                {!isEditMode && canEditOrganisation(permissionContext) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleEdit}
                  >
                    Edit
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Organisation name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <Input
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      placeholder="e.g., League, Federation, Association"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <Input
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      placeholder="e.g., Netherlands, Belgium"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveEdit}
                      loading={saving}
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-base text-gray-900 mt-1">{org?.name || '—'}</div>
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
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recent Activity & Competitions (2/3) */}
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
                                  {/* Placeholder for scores if available in metadata or similar */}
                                  <Badge variant="default">Finished</Badge>
                                </td>
                                <td style={compactTdStyle}>
                                  <button
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={() => navigate(`/matches/${m.id}`)}
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

                 <Card>
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-semibold">Competitions</h3>
                     <Button variant="secondary" size="sm" onClick={() => setActiveTab('competitions')}>Manage Competitions</Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="p-3 bg-gray-50 rounded-lg text-center flex-1">
                       <div className="font-bold text-lg text-gray-900">{seasonsCount ?? 0}</div>
                       <div>Active Seasons</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center flex-1">
                       <div className="font-bold text-lg text-gray-900">{competitionsCount ?? 0}</div>
                       <div>Competitions</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Scheduled & Quick Links (1/3) */}
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
                                className="text-xs text-blue-600 mt-1 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                onClick={() => navigate(`/matches/${m.id}`)}
                              >
                                View Details →
                              </button>
                           </div>
                         ))}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <Button variant="secondary" size="sm" style={{ width: '100%' }} onClick={() => setActiveTab('matches')}>
                        View All Matches
                      </Button>
                    </div>
                 </Card>

                 <Card>
                    <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                       <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('users')}>
                         Manage Users
                       </Button>
                       <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('governance')}>
                         View Policies
                       </Button>
                       <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setActiveTab('operations')}>
                         System Operations
                       </Button>
                    </div>
                 </Card>
              </div>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Users</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '280px', maxWidth: '100%' }}>
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search users (name/email)"
                  />
                </div>
              </div>
            </div>

            {membersLoading ? (
              <Alert variant="info">Loading members...</Alert>
            ) : (
              <>
                {userCanInvite && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-md">
                    <h4 className="text-sm font-medium mb-2">Add user to federation</h4>
                    <form onSubmit={handleInvite} className="flex gap-2 items-end" style={{ flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <label className="block text-xs text-gray-500 mb-1">User Email</label>
                        <Input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="e.g. user@example.com"
                          required
                          type="email"
                        />
                      </div>
                      <div style={{ width: '120px' }}>
                        <label className="block text-xs text-gray-500 mb-1">Role</label>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <Button type="submit" loading={inviteLoading}>
                        Add
                      </Button>
                    </form>
                  </div>
                )}

                {(() => {
                  const normalizedQuery = memberSearch.trim().toLowerCase();
                  const filteredMembers = members.filter((item: any) => {
                    const u = item.user || item;
                    const haystack = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                    return !normalizedQuery || haystack.includes(normalizedQuery);
                  });

                  if (filteredMembers.length === 0) return <Alert variant="info">No users match your search.</Alert>;

                  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / usersPageSize));
                  const safePage = Math.min(usersPage, totalPages);
                  const start = (safePage - 1) * usersPageSize;
                  const pageItems = filteredMembers.slice(start, start + usersPageSize);

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
                      <Card>
                        <Table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.map((item: any) => {
                              const user = item.user || item;
                              const role = item.role || 'member';
                              const membershipId = item.id;
                              const isVirtualMember = item.source === 'assignment' || item.source === 'project_membership' || String(membershipId).startsWith('pm:');

                              return (
                                <tr key={user.id}>
                                  <td>
                                    <Link
                                      to={`/organisations/${currentOrgSlug}/users/${user.id}`}
                                      className="text-blue-600 hover:underline"
                                      style={{ fontSize: '0.85rem' }}
                                    >
                                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                                    </Link>
                                  </td>
                                  <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                                  <td>
                                    <Badge variant="default">{role}</Badge>
                                  </td>
                                  <td>
                                    {userCanManageMembers && !isVirtualMember ? (
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button
                                          onClick={() => navigate(`/organisations/${currentOrgSlug}/members/${membershipId}`)}
                                          style={{
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--app-border)',
                                            backgroundColor: 'var(--app-surface-2)',
                                            color: 'var(--app-text)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 500
                                          }}
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!window.confirm(`Remove ${user.email} from federation?`)) return;
                                            try {
                                              const apiV1BaseUrl = getApiV1BaseUrl();
                                              const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                              const res = await fetch(`${apiV1BaseUrl}/organisations/${currentOrgSlug}/members/${membershipId}/`, {
                                                method: 'DELETE',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'X-CSRFToken': csrfToken || '',
                                                },
                                                credentials: 'include',
                                              });

                                              if (!res.ok) {
                                                alert('Failed to remove user');
                                                return;
                                              }

                                              // Local update (avoid re-fetch storm)
                                              setMembers((prev) => prev.filter((m: any) => String(m.id) !== String(membershipId)));
                                            } catch (e) {
                                              console.error(e);
                                              alert('Error removing user');
                                            }
                                          }}
                                          style={{
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            border: '1px solid #dc3545',
                                            backgroundColor: 'var(--app-surface)',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 500
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </Card>
                    </>
                  );
                })()}
              </>
            )}
          </Card>
        )}

        {/* Clubs */}
        {activeTab === 'clubs' && (
          <Card className="mb-6">
            {(() => {
              const clubsSource = allClubsForTeams.length > 0 ? allClubsForTeams : clubs;
              const totalCount = allClubsForTeams.length > 0 ? allClubsForTeams.length : clubsCount;
              const normalized = clubSearch.trim().toLowerCase();

              const teamById = new Map<string, any>();
              const clubTeamCount: Record<string, number> = {};
              for (const t of teams as any[]) {
                if (!t?.id) continue;
                teamById.set(String(t.id), t);
                const clubId = t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? null;
                if (clubId) {
                  const key = String(clubId);
                  clubTeamCount[key] = (clubTeamCount[key] || 0) + 1;
                }
              }

              const clubSeasonsCount: Record<string, number> = {};
              const clubCompetitionsCount: Record<string, number> = {};
              for (const p of orgPeriods as any[]) {
                const projectId = p.project_id ?? p.project?.id ?? null;
                if (!projectId) continue;
                const team = teamById.get(String(projectId));
                if (!team) continue;
                const clubId = team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? null;
                if (!clubId) continue;

                const isSeason = isSeasonPeriod(p);
                const isCompetition = isCompetitionPeriod(p);
                const key = String(clubId);
                if (isSeason) clubSeasonsCount[key] = (clubSeasonsCount[key] || 0) + 1;
                if (isCompetition) clubCompetitionsCount[key] = (clubCompetitionsCount[key] || 0) + 1;
              }

              const clubMatchesCount: Record<string, number> = {};
              for (const m of federationMatches as any[]) {
                const projectId = m.project_id ?? m.project?.id ?? null;
                if (!projectId) continue;
                const team = teamById.get(String(projectId));
                if (!team) continue;
                const clubId = team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? null;
                if (!clubId) continue;
                const key = String(clubId);
                clubMatchesCount[key] = (clubMatchesCount[key] || 0) + 1;
              }

              const filteredClubs = (clubsSource as any[]).filter((club: any) => {
                const isActive = club.is_active !== false;
                if (clubStatusFilter === 'active' && !isActive) return false;
                if (clubStatusFilter === 'inactive' && isActive) return false;
                if (!normalized) return true;
                return String(club.name || '').toLowerCase().includes(normalized);
              });

              return (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <h3 className="text-lg font-semibold">Clubs</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: '240px', maxWidth: '100%' }}>
                        <Input value={clubSearch} onChange={(e) => setClubSearch(e.target.value)} placeholder="Search clubs" />
                      </div>
                      <select
                        value={clubStatusFilter}
                        onChange={(e) => setClubStatusFilter(e.target.value as any)}
                        style={{
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid var(--app-border)',
                          backgroundColor: 'var(--app-input-bg)',
                          color: 'var(--app-text)',
                        }}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/clubs?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                        Open Clubs List
                      </Button>
                      {allClubsForTeams.length === 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                            Page {clubsPage} of {Math.max(1, Math.ceil((clubsCount || 0) / clubsPageSize))} ({clubsCount || 0} clubs)
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={clubsPage <= 1 || clubsLoading}
                            onClick={() => setClubsPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={clubsLoading || clubsPage >= Math.max(1, Math.ceil((clubsCount || 0) / clubsPageSize))}
                            onClick={() => setClubsPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                        Showing {filteredClubs.length} of {totalCount || 0}
                        {orgPeriodsLoading ? ' • Loading periods…' : ''}
                      </div>
                    </div>
                  </div>

                  {clubsLoading ? (
                    <Alert variant="info">Loading clubs…</Alert>
                  ) : filteredClubs.length > 0 ? (
                    <Card>
                      <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                          <colgroup>
                            <col />
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '95px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '95px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '310px' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={compactThStyle}>Club</th>
                              <th style={compactThStyle}>Teams</th>
                              <th style={compactThStyle}>Seasons</th>
                              <th style={compactThStyle}>Competitions</th>
                              <th style={compactThStyle}>Matches</th>
                              <th style={compactThStyle}>Status</th>
                              <th style={compactThStyle}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClubs.map((club: any) => {
                              const key = String(club.id);
                              const teamsN = clubTeamCount[key] || 0;
                              const seasonsN = clubSeasonsCount[key] || 0;
                              const compsN = clubCompetitionsCount[key] || 0;
                              const matchesN = clubMatchesCount[key] || 0;

                              return (
                                <tr key={club.id}>
                                  <td style={compactTextTdStyle}>
                                    <Link
                                      to={`/organisations/${currentOrgSlug}/projects/${club.slug || club.id}`}
                                      className="text-blue-600 hover:underline"
                                      style={{ ...compactTextTdStyle, display: 'inline-block', maxWidth: '100%' }}
                                    >
                                      {club.name}
                                    </Link>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="info">{teamsN}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="info">{seasonsN}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="info">{compsN}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="info">{matchesN}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant={club.is_active ? 'success' : 'warning'}>
                                      {club.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <div style={compactActionsStyle}>
                                      <button
                                        onClick={() => {
                                          setSelectedClub(club);
                                          setIsClubModalOpen(true);
                                        }}
                                        style={actionButtonStyle('neutral')}
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${club.slug || club.id}`)}
                                        style={actionButtonStyle('primary')}
                                      >
                                        Open
                                      </button>
                                      {userCanEditProject && (
                                        <button
                                          onClick={() => {
                                            setSelectedEditProject(club);
                                            setIsEditModalOpen(true);
                                          }}
                                          style={actionButtonStyle('neutral')}
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {userCanDeleteProject && (
                                        <button
                                          onClick={async () => {
                                            if (!window.confirm(`Are you sure you want to delete project ${club.name}?`)) return;
                                            try {
                                              const apiV1BaseUrl = getApiV1BaseUrl();
                                              const res = await fetch(
                                                `${apiV1BaseUrl}/organisations/${currentOrgSlug}/projects/${club.slug || club.id}/`,
                                                {
                                                  method: 'DELETE',
                                                  headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRFToken': getCsrfToken(),
                                                  },
                                                  credentials: 'include',
                                                }
                                              );

                                              if (res.ok) {
                                                setClubs((prev) => prev.filter((p) => String(p.id) !== String(club.id)));
                                                setAllClubsForTeams((prev) => prev.filter((p) => String(p.id) !== String(club.id)));
                                              } else {
                                                alert('Error deleting project');
                                              }
                                            } catch (e) {
                                              console.error(e);
                                              alert('Error deleting project');
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
                  ) : (
                    <Alert variant="info">No clubs found</Alert>
                  )}
                </>
              );
            })()}
          </Card>
        )}

        {/* Teams */}
        {activeTab === 'teams' && (
          <Card className="mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Teams (grouped by club)</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '240px', maxWidth: '100%' }}>
                  <Input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Search teams" />
                </div>
                <select
                  value={teamClubFilterId}
                  onChange={(e) => setTeamClubFilterId(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                    minWidth: '200px',
                  }}
                >
                  <option value="">All clubs</option>
                  {allClubsForTeams.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={teamStatusFilter}
                  onChange={(e) => setTeamStatusFilter(e.target.value as any)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--app-border)',
                    backgroundColor: 'var(--app-input-bg)',
                    color: 'var(--app-text)',
                  }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/teams?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                  Open Teams List
                </Button>
              </div>
            </div>

            {teamsLoading ? (
              <Alert variant="info">Loading teams…</Alert>
            ) : teams.length === 0 ? (
              <Alert variant="info">No teams found in this federation.</Alert>
            ) : (
              (() => {
                const clubNameById = new Map<string, string>();
                const clubSlugById = new Map<string, string>();
                for (const c of allClubsForTeams as any[]) {
                  clubNameById.set(String(c.id), c.name);
                  clubSlugById.set(String(c.id), (c as any).slug || String(c.id));
                }

                const normalized = teamSearch.trim().toLowerCase();
                const filteredTeams = (teams as any[]).filter((t: any) => {
                  const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                  if (teamClubFilterId && parentId !== String(teamClubFilterId)) return false;

                  const isActive = t.is_active !== false;
                  if (teamStatusFilter === 'active' && !isActive) return false;
                  if (teamStatusFilter === 'inactive' && isActive) return false;

                  if (!normalized) return true;
                  return String(t.name || '').toLowerCase().includes(normalized);
                });

                const byClubId = new Map<string, Project[]>();
                for (const t of filteredTeams) {
                  const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                  if (!parentId) continue;
                  const arr = byClubId.get(parentId) || [];
                  arr.push(t);
                  byClubId.set(parentId, arr);
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Array.from(byClubId.entries()).map(([clubId, clubTeams]) => (
                      <Card key={clubId}>
                        <div className="text-sm font-semibold" style={{ marginBottom: '10px' }}>
                          {clubNameById.get(clubId) || `Club ${clubId}`}
                        </div>
                        <div className="overflow-x-auto">
                          <Table style={compactTableStyle}>
                            <colgroup>
                              <col />
                              <col style={{ width: '90px' }} />
                              <col style={{ width: '95px' }} />
                              <col style={{ width: '120px' }} />
                              <col style={{ width: '120px' }} />
                              <col style={{ width: '330px' }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th style={compactThStyle}>Team</th>
                                <th style={compactThStyle}>Players</th>
                                <th style={compactThStyle}>Seasons</th>
                                <th style={compactThStyle}>Competitions</th>
                                <th style={compactThStyle}>Status</th>
                                <th style={compactThStyle}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(clubTeams || []).map((team: any) => {
                              const teamSlugOrId = team.slug || team.id;
                              const clubSlugOrId = clubSlugById.get(clubId) || clubId;
                              const teamIdKey = String(team.id);
                              const playersCount = team.member_count ?? team.players_count ?? 0;
                              const seasonsCount = teamSeasonsCountById[teamIdKey] ?? 0;
                              const competitionsCount = teamCompetitionsCountById[teamIdKey] ?? 0;
                              return (
                                <tr key={team.id}>
                                  <td style={compactTextTdStyle}>{team.name}</td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{playersCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{seasonsCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant="default">{competitionsCount}</Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <Badge variant={team.is_active ? 'success' : 'warning'}>
                                      {team.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td style={compactTdStyle}>
                                    <div style={compactActionsStyle}>
                                      <button
                                        onClick={() => {
                                          setSelectedClub(team);
                                          setIsClubModalOpen(true);
                                        }}
                                        style={actionButtonStyle('neutral')}
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`)}
                                        style={actionButtonStyle('primary')}
                                      >
                                        Open
                                      </button>
                                      {userCanEditProject && (
                                        <button
                                          onClick={() => {
                                            setSelectedEditProject(team);
                                            setIsEditModalOpen(true);
                                          }}
                                          style={actionButtonStyle('neutral')}
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {userCanDeleteProject && (
                                        <button
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
                                                    'X-CSRFToken': getCsrfToken(),
                                                  },
                                                  credentials: 'include',
                                                }
                                              );
                                              if (res.ok) {
                                                setTeams((prev) => prev.filter((p: any) => String(p.id) !== String(team.id)));
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
                    ))}
                  </div>
                );
              })()
            )}
          </Card>
        )}

        {/* Seasons (high-over) */}
        {activeTab === 'seasons' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Seasons</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/seasons?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all seasons
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ width: '240px', maxWidth: '100%' }}>
                <Input value={seasonSearch} onChange={(e) => setSeasonSearch(e.target.value)} placeholder="Search seasons" />
              </div>
              <select
                value={seasonClubFilterId}
                onChange={(e) => {
                  setSeasonClubFilterId(e.target.value);
                  setSeasonTeamFilterId('');
                }}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  minWidth: '200px',
                }}
              >
                <option value="">All clubs</option>
                {allClubsForTeams.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={seasonTeamFilterId}
                onChange={(e) => setSeasonTeamFilterId(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-input-bg)',
                  color: 'var(--app-text)',
                  minWidth: '220px',
                }}
              >
                <option value="">All teams</option>
                {(teams as any[])
                  .filter((t: any) => {
                    if (!seasonClubFilterId) return true;
                    const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                    return parentId === String(seasonClubFilterId);
                  })
                  .map((t: any) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>

            {(() => {
              const clubNameById = new Map<string, string>();
              const clubSlugById = new Map<string, string>();
              for (const c of allClubsForTeams as any[]) {
                clubNameById.set(String(c.id), c.name);
                clubSlugById.set(String(c.id), (c as any).slug || String(c.id));
              }

              const teamById = new Map<string, any>();
              for (const t of teams as any[]) teamById.set(String(t.id), t);

              const competitionsBySeasonId: Record<string, number> = {};
              for (const p of orgPeriods as any[]) {
                const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
                if (!parentId) continue;
                const key = String(parentId);
                competitionsBySeasonId[key] = (competitionsBySeasonId[key] || 0) + 1;
              }

              const normalized = seasonSearch.trim().toLowerCase();
              const seasons = (orgPeriods as any[])
                .filter((p: any) => {
                  return isSeasonPeriod(p);
                })
                .filter((season: any) => {
                  const teamId = String(season.project_id ?? season.project?.id ?? '');
                  if (seasonTeamFilterId && teamId !== String(seasonTeamFilterId)) return false;

                  const team = teamId ? teamById.get(teamId) : null;
                  const clubId = team
                    ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                    : '';
                  if (seasonClubFilterId && clubId !== String(seasonClubFilterId)) return false;

                  if (!normalized) return true;
                  const name = String(season.name || '').toLowerCase();
                  return name.includes(normalized);
                });

              if (seasons.length === 0) {
                return <Alert variant="info">No seasons found for this federation (or current filters).</Alert>;
              }

              return (
                <Card>
                  <div className="overflow-x-auto">
                    <Table style={compactTableStyle}>
                      <colgroup>
                        <col />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '95px' }} />
                        <col style={{ width: '140px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={compactThStyle}>Season</th>
                          <th style={compactThStyle}>Team</th>
                          <th style={compactThStyle}>Club</th>
                          <th style={compactThStyle}>Competitions</th>
                          <th style={compactThStyle}>Matches</th>
                          <th style={compactThStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seasons.map((season: any) => {
                          const teamId = String(season.project_id ?? season.project?.id ?? '');
                          const team = teamId ? teamById.get(teamId) : null;
                          const teamSlugOrId = team?.slug || team?.id || teamId;
                          const clubId = team
                            ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                            : '';
                          const clubSlugOrId = clubId ? clubSlugById.get(clubId) || clubId : '';

                          const seasonId = season.id;
                          const seasonSlug = season.slug;
                          const competitionsCount = competitionsBySeasonId[String(seasonId)] || 0;
                          const matchesCount = getRecursiveMatchesCount(season);

                          const openHref = clubSlugOrId
                            ? `/organisations/${currentOrgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlug || seasonId}`
                            : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}`;

                          return (
                            <tr key={seasonId}>
                              <td style={compactTextTdStyle}>{season.name}</td>
                              <td style={compactTextTdStyle}>{team?.name || teamId || '—'}</td>
                              <td style={compactTextTdStyle}>{clubId ? clubNameById.get(clubId) || clubId : '—'}</td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{competitionsCount}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{matchesCount}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button onClick={() => navigate(openHref)} style={actionButtonStyle('primary')}>
                                    Open
                                  </button>
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

        {/* Competitions (high-over) */}
        {activeTab === 'competitions' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Competitions</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/competitions?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all competitions
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ width: '240px', maxWidth: '100%' }}>
                <Input value={competitionSearch} onChange={(e) => setCompetitionSearch(e.target.value)} placeholder="Search competitions" />
              </div>
              <select
                value={compClubFilterId}
                onChange={(e) => {
                  setCompClubFilterId(e.target.value);
                  setCompTeamFilterId('');
                  setCompSeasonFilterId('');
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All clubs</option>
                {allClubsForTeams.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <select
                value={compTeamFilterId}
                onChange={(e) => {
                  setCompTeamFilterId(e.target.value);
                  setCompSeasonFilterId('');
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All teams</option>
                {(teams as any[])
                  .filter((t: any) => {
                    if (!compClubFilterId) return true;
                    const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                    return parentId === String(compClubFilterId);
                  })
                  .map((t: any) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
              </select>
              <select
                value={compSeasonFilterId}
                onChange={(e) => setCompSeasonFilterId(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All seasons</option>
                {(orgPeriods as any[])
                  .filter((p: any) => isSeasonPeriod(p))
                  .filter((s: any) => {
                     const teamId = String(s.project_id ?? s.project?.id ?? '');
                     if (compTeamFilterId && teamId !== compTeamFilterId) return false;
                     return true;
                  })
                  .map((s: any) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
              </select>
            </div>

            {(() => {
              const clubNameById = new Map<string, string>();
              const clubSlugById = new Map<string, string>();
              for (const c of allClubsForTeams as any[]) {
                clubNameById.set(String(c.id), c.name);
                clubSlugById.set(String(c.id), (c as any).slug || String(c.id));
              }

              const teamById = new Map<string, any>();
              for (const t of teams as any[]) teamById.set(String(t.id), t);

              const seasonById = new Map<string, any>();
              for (const p of orgPeriods as any[]) {
                const isSeason = isSeasonPeriod(p);
                if (isSeason) seasonById.set(String(p.id), p);
              }

              const normalized = competitionSearch.trim().toLowerCase();
              const competitions = (orgPeriods as any[])
                .filter((p: any) => isCompetitionPeriod(p))
                .filter((comp: any) => {
                  const seasonId = String(comp.parent_period_id ?? comp.parent_period?.id ?? '');
                  if (compSeasonFilterId && seasonId !== compSeasonFilterId) return false;

                  const teamId = String(comp.project_id ?? comp.project?.id ?? '');
                  if (compTeamFilterId && teamId !== compTeamFilterId) return false;

                  const team = teamId ? teamById.get(teamId) : null;
                  const clubId = team
                    ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                    : '';
                  if (compClubFilterId && clubId !== compClubFilterId) return false;

                  if (!normalized) return true;
                  return String(comp.name || '').toLowerCase().includes(normalized);
                });

              if (competitions.length === 0) {
                return <Alert variant="info">No competitions found for this federation.</Alert>;
              }

              return (
                <Card>
                  <div className="overflow-x-auto">
                    <Table style={compactTableStyle}>
                      <colgroup>
                        <col />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '95px' }} />
                        <col style={{ width: '140px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={compactThStyle}>Competition</th>
                          <th style={compactThStyle}>Season</th>
                          <th style={compactThStyle}>Team</th>
                          <th style={compactThStyle}>Club</th>
                          <th style={compactThStyle}>Matches</th>
                          <th style={compactThStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitions.map((comp: any) => {
                          const seasonId = String(comp.parent_period_id ?? comp.parent_period?.id ?? '');
                          const season = seasonId ? seasonById.get(seasonId) : null;

                          const teamId = String(comp.project_id ?? comp.project?.id ?? '');
                          const team = teamId ? teamById.get(teamId) : null;
                          const teamSlugOrId = team?.slug || team?.id || teamId;

                          const clubId = team
                            ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                            : '';
                          const clubSlugOrId = clubId ? clubSlugById.get(clubId) || clubId : '';

                          const seasonSlug = season?.slug || comp.parent_period?.slug;
                          const openHref = clubSlugOrId
                            ? `/organisations/${currentOrgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`
                            : `/organisations/${currentOrgSlug}/projects/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`;

                          const matchesCount = getRecursiveMatchesCount(comp);

                          return (
                            <tr key={comp.id}>
                              <td style={compactTextTdStyle}>{comp.name}</td>
                              <td style={compactTextTdStyle}>{season?.name || comp.parent_period?.name || seasonId || '—'}</td>
                              <td style={compactTextTdStyle}>{team?.name || teamId || '—'}</td>
                              <td style={compactTextTdStyle}>{clubId ? clubNameById.get(clubId) || clubId : '—'}</td>
                              <td style={compactTdStyle}>
                                <Badge variant="default">{matchesCount}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button onClick={() => navigate(openHref)} style={actionButtonStyle('primary')}>
                                    Open
                                  </button>
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

        {/* Matches (high-over) */}
        {activeTab === 'matches' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Matches</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/matches?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all matches
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ width: '240px', maxWidth: '100%' }}>
                <Input value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="Search matches" />
              </div>
              <select
                value={matchClubFilterId}
                onChange={(e) => {
                  setMatchClubFilterId(e.target.value);
                  setMatchTeamFilterId('');
                  setMatchCompFilterId('');
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All clubs</option>
                {allClubsForTeams.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <select
                value={matchTeamFilterId}
                onChange={(e) => {
                  setMatchTeamFilterId(e.target.value);
                  setMatchCompFilterId('');
                }}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All teams</option>
                {(teams as any[])
                  .filter((t: any) => {
                    if (!matchClubFilterId) return true;
                    const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                    return parentId === String(matchClubFilterId);
                  })
                  .map((t: any) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
              </select>
              <select
                value={matchCompFilterId}
                onChange={(e) => setMatchCompFilterId(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-input-bg)', color: 'var(--app-text)', minWidth: '180px' }}
              >
                <option value="">All competitions</option>
                {(orgPeriods as any[])
                  .filter((p: any) => isCompetitionPeriod(p))
                  .filter((c: any) => {
                     const teamId = String(c.project_id ?? c.project?.id ?? '');
                     if (matchTeamFilterId && teamId !== matchTeamFilterId) return false;
                     return true;
                  })
                  .map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
              </select>
            </div>

            {federationMatchesLoading ? (
              <Alert variant="info">Loading matches…</Alert>
            ) : (() => {
              const clubNameById = new Map<string, string>();
              for (const c of allClubsForTeams as any[]) {
                clubNameById.set(String(c.id), c.name);
              }

              const teamById = new Map<string, any>();
              for (const t of teams as any[]) teamById.set(String(t.id), t);

              // Map period ID -> Parent ID for hierarchy checks
              const periodParentIdMap = new Map<string, string>();
              for (const p of orgPeriods) {
                const pid = p.parent_period_id ?? p.parent_period?.id ?? '';
                if (pid) periodParentIdMap.set(String(p.id), String(pid));
              }

              const normalized = matchSearch.trim().toLowerCase();
              const matches = (federationMatches || []).filter((m: any) => {
                const teamId = String(m.project?.id ?? m.project_id ?? '');
                if (matchTeamFilterId && teamId !== matchTeamFilterId) return false;

                const team = teamId ? teamById.get(teamId) : null;
                const clubId = team
                    ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                    : '';
                if (matchClubFilterId && clubId !== matchClubFilterId) return false;

                const periodId = String(m.period?.id ?? m.period_id ?? '');
                if (matchCompFilterId) {
                   if (periodId === matchCompFilterId) {
                       // Direct match
                   } else {
                       // Check parent (Round -> Competition)
                       const parentId = periodParentIdMap.get(periodId);
                       if (parentId !== matchCompFilterId) {
                           // If parent doesn't match, one level deeper?
                           // Assuming 2 levels max (Competition -> [Round? ->] Match)
                           // If parent found, check its parent (grandparent)
                           // But standard structure is Comp -> Round -> Match.
                           // So if Match.period = Round, Round.parent = Comp.
                           // If Comp is selected, we want matches of Round.
                           // So we check if periodId's parent == filterId.
                           if (!parentId || parentId !== matchCompFilterId) {
                               return false;
                           }
                       }
                   }
                }

                if (!normalized) return true;
                return String(m.title || m.name || m.id).toLowerCase().includes(normalized);
              });

              if (matches.length === 0) {
                return <Alert variant="info">No matches found for this federation.</Alert>;
              }

              return (
                <Card>
                  <div className="overflow-x-auto">
                    <Table style={compactTableStyle}>
                      <colgroup>
                        <col />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '220px' }} />
                        <col style={{ width: '190px' }} />
                        <col style={{ width: '140px' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={compactThStyle}>Match</th>
                          <th style={compactThStyle}>Competition</th>
                          <th style={compactThStyle}>Team</th>
                          <th style={compactThStyle}>Start</th>
                          <th style={compactThStyle}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((m: any) => {
                          const teamId = String(m.project?.id ?? m.project_id ?? '');
                          const team = teamId ? teamById.get(teamId) : null;
                          const clubId = team
                            ? String(team.parent_id ?? team.parent ?? team.parent_project ?? team.parent_project_id ?? '')
                            : '';

                          return (
                            <tr key={m.id}>
                              <td style={compactTextTdStyle}>{m.title || m.name || m.id}</td>
                              <td style={compactTextTdStyle}>{m.period?.name || '-'}</td>
                              <td style={compactTextTdStyle}>{team?.name || teamId || '-'}</td>
                              <td style={compactTextTdStyle}>{m.start_time || '-'}</td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  <button onClick={() => navigate(`/matches/${m.id}`)} style={actionButtonStyle('primary')}>
                                    Open
                                  </button>
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

        {/* Governance */}
        {activeTab === 'governance' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Governance & Compliance</h3>
            </div>
            <PolicyList organisationId={org.id || currentOrgId || ''} />
          </Card>
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Audit Trail</h3>
            </div>
            <AuditLogTable organisationId={org.id || currentOrgId || ''} limit={10} />
          </Card>
        )}

        {/* Operations */}
        {activeTab === 'operations' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Operations (Admin)</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/permissions')}>Permissions</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/flags')}>Feature Flags</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/security')}>Security</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/integration-status')}>Integration Status</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/health')}>Health</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/observability')}>Metrics</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/usage-events')}>Usage Events</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/routing-logs')}>Notification Routing</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/api-docs')}>API Docs</Button>
            </div>
          </Card>
        )}

      </PageContent>

      <ProjectDetailModal
        opened={isClubModalOpen}
        onClose={() => setIsClubModalOpen(false)}
        project={selectedClub}
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
      </div>
    </AppShell>
  );
};

export default OrganisationDetailPage;

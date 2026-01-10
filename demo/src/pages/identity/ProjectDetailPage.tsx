import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
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

const fetchAllPages = async <T,>(url: string, options: RequestInit = {}): Promise<T[]> => {
  const results: T[] = [];
  let nextUrl: string | null = url;
  let pageCount = 0;
  const maxPages = 10; // Safety limit

  try {
    while (nextUrl && pageCount < maxPages) {
      const res: Response = await fetch(nextUrl, options);
      if (!res.ok) {
        console.warn(`[fetchAllPages] Request failed for ${nextUrl}: ${res.status}`);
        break;
      }
      const json: any = await res.json();
      const pageResults = getPagedResults(json);
      results.push(...(pageResults as T[]));
      pageCount++;

      nextUrl = getPagedNextUrl(json);
      if (!nextUrl) break;
    }
    return results;
  } catch (err) {
    console.error(`[fetchAllPages] Error fetching ${url}:`, err);
    return results;
  }
};

/**
 * T009 - Project Detail Page
 *
 * Purpose: Display project metadata, members, and recent audit activity
 * - Shows project summary cards (name, description, member count)
 * - Lists team members with roles
 * - Shows recent audit events filtered by project_id
 */

const compactTableStyle: React.CSSProperties = { tableLayout: 'fixed', width: '100%' };
const compactThStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--app-muted-text)',
  borderBottom: '1px solid var(--app-border)',
  whiteSpace: 'nowrap',
};
const compactTdStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--app-border)',
  verticalAlign: 'middle',
  height: '40px',
};
const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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

export const ProjectDetailPage: React.FC = () => {
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

  // Tab Data State
  const [childProjects, setChildProjects] = useState<Project[]>([]);
  const [childProjectsLoading, setChildProjectsLoading] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<any[]>([]);

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

  const [allMatchesLoading, setAllMatchesLoading] = useState(false);

  // Dashboard Data
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<any[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);

  const getParentProjectId = (p: any): string | null => {
    const parent = p?.parent_project || p?.parent || p?.parent_project_id || p?.parent_id;
    if (!parent) return null;
    if (typeof parent === 'object') return String(parent.id || parent.slug || '');
    return String(parent);
  };

  const getOrganisationId = (p: any): string | null => {
    const oid = p?.organisation_id || p?.organisation?.id;
    return oid ? String(oid) : null;
  };

  const ensureChildTeamsLoaded = async (): Promise<Project[]> => {
    if (!project?.id) return [];
    // Don't use cached childProjects - always fetch fresh to avoid stale data
    // (childProjects might be set with partial data from dashboard preview)

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const url = `${apiBaseUrl}/api/v1/projects/?parent_project=${project.id}&page_size=250`;
    const results = await fetchAllPages<Project>(url, { credentials: 'include' });

    const parentId = String(project.id);
    const orgId = String(
      (project as any)?.organisation_id || (project as any)?.organisation?.id || resolvedOrg?.id || ''
    );

    const filteredByOrg = orgId
      ? (results as any[]).filter((p: any) => String(getOrganisationId(p) || '') === orgId)
      : (results as any[]);

    const filteredByParent = filteredByOrg.filter((p: any) => getParentProjectId(p) === parentId);
    // For displaying in Teams tab, use direct children only
    // But for period queries (seasons/competitions), we need ALL nested teams
    const directChildren = filteredByParent.length > 0 ? filteredByParent : filteredByOrg;

    setChildProjects(directChildren as Project[]);
    // Return ALL teams (including grandchildren) for period fetching
    return filteredByOrg as Project[];
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

  const isTeamRoute = Boolean(clubId);
  const clubSlugOrId = clubId || '';

  const orgSlugOrId = resolvedOrg?.slug || resolvedOrg?.id;

  const clubsListPath = orgSlugOrId ? `/clubs?org_id=${encodeURIComponent(String(orgSlugOrId))}` : '/clubs';

  const isSuperAdmin = Boolean((user as any)?.is_superuser) || Boolean((user as any)?.is_staff) || (user as any)?.role === 'Superadmin';

  // Use fetched project.organisation if available (has user_role), fallback to resolvedOrg from context
  const orgForPermissions = (project as any)?.organisation || resolvedOrg;

  // Debug: Log permission context
  console.log('[ProjectDetailPage] Permission Debug:', {
    isSuperAdmin,
    orgForPermissions: orgForPermissions,
    user_role: (orgForPermissions as any)?.user_role,
    projectOrg: (project as any)?.organisation,
    resolvedOrg: resolvedOrg
  });

  const permissionContext = {
    currentOrganisation: orgForPermissions as any,
    isSuperAdmin,
  };
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  console.log('[ProjectDetailPage] Permission Results:', {
    userCanEditProject,
    userCanDeleteProject
  });

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
              setMembers(normalized);

              // Clubs often don't have direct memberships; show people via child teams if needed.
              if (!isTeamRoute && normalized.length === 0 && resolvedOrg?.slug) {
                const teams = await ensureChildTeamsLoaded();
                const teamIds = new Set(teams.map((t: any) => String(t.id)));

                const params = new URLSearchParams();
                params.set('page_size', '250');
                params.set('include_project_memberships', 'true');
                params.set('include_role_assignments', 'true');
                const orgMembersEndpoint = `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/members/?${params.toString()}`;

                const orgMembers = await fetchAllPages<any>(orgMembersEndpoint, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  credentials: 'include',
                });

                const clubId = String(projectIdForApi);
                const filtered = (orgMembers || []).filter((u: any) =>
                  u.project_memberships?.some((m: any) => {
                    const pid = String(m.project_id || m.project?.id || '');
                    if (pid === clubId) return true;
                    if (teamIds.has(pid)) return true;
                    const parentId = String(
                      m.project?.parent_project_id || m.project?.parent_id || m.project?.parent_project?.id || ''
                    );
                    return parentId === clubId;
                  })
                );

                setMembers(Array.isArray(filtered) ? filtered : []);
              }
            } else {
              console.error(
                `[ProjectDetailPage] Project members endpoint failed with status ${membersByIdResponse.status} for ${membersByIdEndpoint}`
              );

              // Fallback: fetch org members with memberships included, then filter client-side.
              // This avoids showing ALL org members by only selecting those linked to this project.
              const orgSlugForMembers = resolvedOrg?.slug;
              if (!orgSlugForMembers) {
                setMembers([]);
              } else {
                const params = new URLSearchParams();
                params.set('page_size', '250');
                params.set('include_project_memberships', 'true');
                params.set('include_role_assignments', 'true');
                const orgMembersEndpoint = `${apiBaseUrl}/api/v1/organisations/${orgSlugForMembers}/members/?${params.toString()}`;

                const orgMembersResponse = await fetch(orgMembersEndpoint, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  credentials: 'include',
                });

                if (orgMembersResponse.ok) {
                  const orgMembersData = await orgMembersResponse.json();
                  let orgMembersList = getPagedResults(orgMembersData);

                  orgMembersList = orgMembersList.filter((u: any) =>
                    u.project_memberships?.some(
                      (m: any) => String(m.project_id || m.project?.id) === String(projectIdForApi)
                    )
                  );

                  setMembers(Array.isArray(orgMembersList) ? orgMembersList : []);
                } else {
                  console.error(
                    `[ProjectDetailPage] Org members fallback failed with status ${orgMembersResponse.status} for ${orgMembersEndpoint}`
                  );
                  setMembers([]);
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
  }, [currentProjectSlug, resolvedOrg, context.isLoading, isTeamRoute, clubSlugOrId, orgSlugOrId, resolvedProject?.id]);

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

  const fetchSeasons = async () => {
    if (!project?.id) return;
    setSeasonsLoading(true);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      // Match OrganisationDetailPage pattern: fetch ALL periods and filter client-side
      if (isLikelyTeam) {
        // For teams: fetch all periods for this team
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('page_size', '250');

        const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
        const results = await fetchAllPages<any>(url, { credentials: 'include' });
        const filteredSeasons = (results || []).filter(isSeasonPeriod);
        setSeasons(filteredSeasons);
      } else {
        // Clubs: enforce hierarchy strictly.
        // 1) Resolve direct child teams for this club (required dependency)
        // 2) Fetch org periods using the same org-wide query as OrganisationDetail
        // 3) Filter to root season periods for those teamIds
        const clubIdValue = String(project.id);
        const teams = await fetchClubTeamsForPeriodScope();
        const teamIds = new Set(
          (teams || []).map((t: any) => String(t?.id || '')).filter(Boolean)
        );

        if (teamIds.size === 0) {
          setSeasons([]);
          return;
        }

        // Fetch root periods only, then filter down to season periods.
        // This avoids relying on pagination/order across all period types.
        const orgPeriods = await fetchOrgPeriodsForFiltering({ parentId: 'null' });
        const filteredSeasons = (orgPeriods || [])
          .filter((p: any) => {
            const teamId = String(p?.project_id ?? p?.project?.id ?? '');
            if (!teamId || !teamIds.has(teamId)) return false;
            const parentId = getPeriodParentId(p);
            if (parentId) return false;
            return isSeasonPeriod(p);
          });

        setSeasons(filteredSeasons);
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
      // Match OrganisationDetailPage pattern: fetch ALL periods and filter client-side
      if (isLikelyTeam) {
        // For teams: fetch all periods for this team and filter competitions
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('page_size', '250');

        const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
        const results = await fetchAllPages<any>(url, { credentials: 'include' });
        const filteredCompetitions = (results || []).filter(isCompetitionPeriod);
        setCompetitions(filteredCompetitions);
      } else {
        const [teams, orgPeriods] = await Promise.all([
          fetchOrgTeamsForPeriodFiltering(),
          fetchOrgPeriodsForFiltering(),
        ]);

        const clubId = String(project.id);
        const teamIdsUnderClub = new Set(
          (teams || [])
            .filter((t: any) => getParentProjectId(t) === clubId)
            .map((t: any) => String(t?.id || ''))
            .filter(Boolean)
        );

        const filteredCompetitions = (orgPeriods || [])
          .filter(isCompetitionPeriod)
          .filter((p: any) => {
            const teamId = String(p?.project_id ?? p?.project?.id ?? '');
            return teamIdsUnderClub.has(teamId);
          });

        setCompetitions(filteredCompetitions);
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
        const results = await fetchAllPages<any>(url, { credentials: 'include' });
        setAllMatches(Array.isArray(results) ? results : []);
      } else {
        // Clubs: avoid per-team fan-out (can overload API and trigger 500s).
        // Fetch org-wide matches and filter down to teams under this club.
        const orgIdValue = String(resolvedOrg?.id || (project as any)?.organisation_id || '').trim();
        if (!orgIdValue) {
          setAllMatches([]);
          return;
        }

        const teams = await fetchOrgTeamsForPeriodFiltering();
        const teamIdsUnderClub = getDescendantTeamIdsUnderClub(teams, String(project.id));
        if (!teamIdsUnderClub.size) {
          setAllMatches([]);
          return;
        }

        const params = new URLSearchParams();
        params.set('organisation_id', orgIdValue);
        params.set('activity_type', 'match');
        params.set('page_size', '250');
        params.set('ordering', '-start_time');

        const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) {
          setAllMatches([]);
          return;
        }
        const json = await res.json();
        const results = getPagedResults(json);
        const filtered = filterActivitiesToClubTeams(results, teamIdsUnderClub);
        const sorted = sortByStartTimeDesc(mergeUniqueById(filtered));
        setAllMatches(sorted.slice(0, 250));
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

  // Trigger data fetch on tab change
  useEffect(() => {
    if (!project) return;
    if (activeTab === 'teams') {
      if (childProjects.length === 0 && !childProjectsLoading) fetchChildTeams();
    } else if (activeTab === 'seasons') {
      if (seasons.length === 0 && !seasonsLoading) fetchSeasons();
    } else if (activeTab === 'competitions') {
      if (competitions.length === 0 && !competitionsLoading) fetchCompetitions();
    } else if (activeTab === 'matches') {
      if (allMatches.length === 0 && !allMatchesLoading) fetchAllMatches();
    }
  }, [activeTab, project?.id, isLikelyTeam]);


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
              { label: 'Federations', onClick: () => navigate('/organisations') },
              { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
              { label: 'Clubs', onClick: () => navigate(clubsListPath) },
              { label: 'Details', current: true },
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
              { label: 'Federations', onClick: () => navigate('/organisations') },
              { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
              { label: 'Clubs', onClick: () => navigate(clubsListPath) },
              { label: 'Details', current: true },
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

  const teamOrProjectDetailPath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
    : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`;

  const seasonsPath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}/seasons`
    : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/seasons`;

  // Tab order: hierarchy first (teams → seasons → competitions → matches), then users/people, then audit.
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(!isLikelyTeam ? [{ id: 'teams', label: 'Teams' }] : []),
    { id: 'seasons', label: 'Seasons' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'people', label: 'Users' },
    { id: 'audit', label: 'Audit' },
  ];

  const backPath = isTeamRoute
    ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`
    : clubsListPath;


  return (
    <AppShell>
      <div>
        <PageHeader
        title={project.name}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Federations', onClick: () => navigate('/organisations') },
          { label: resolvedOrg?.name || 'Federation', onClick: () => navigate(`/organisations/${orgSlugOrId}`) },
          { label: 'Clubs', onClick: () => navigate(clubsListPath) },
          ...(isTeamRoute
            ? [
                {
                   label: club?.name || 'Club',
                   onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`)
                },
                {
                   label: 'Teams',
                   onClick: () => navigate(`/organisations/${orgSlugOrId}/projects/${clubSlugOrId}`)
                },
                { label: project.name, current: true }
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
              onClick={() => navigate(teamOrProjectDetailPath)}
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
              View
            </button>
            {userCanEditProject && (
              <button
                onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/edit`)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #007bff',
                  backgroundColor: 'var(--app-surface)',
                  color: '#007bff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Edit
              </button>
            )}
            {userCanDeleteProject && (
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #dc3545',
                  backgroundColor: 'var(--app-surface)',
                  color: '#dc3545',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        }
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
                                className="text-xs text-blue-600 mt-1 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                onClick={() => navigate(`/matches/${m.id}`)}
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
                      <Button variant="secondary" size="sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${project.slug || project.id}/edit`)}>
                        Edit Project Settings
                      </Button>
                    </div>
                 </Card>
              </div>
            </div>
            </>
          )}

          {activeTab === 'people' && (
            <Card>
                {isLikelyTeam ? (
                  <MemberList projectId={String(project.id)} initialMembers={members as any} />
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-4">People</h3>
                    {members.length === 0 ? (
                      <Alert variant="info">No people found for this club.</Alert>
                    ) : (
                      <Table style={compactTableStyle}>
                        <thead>
                          <tr>
                            <th style={compactThStyle}>Name</th>
                            <th style={compactThStyle}>Email</th>
                            <th style={compactThStyle}>Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((item: any) => {
                            const user = item.user || item;
                            const name =
                              user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '-';
                            const email = user.email || '-';
                            const role = item.role || user.role || 'member';
                            return (
                              <tr key={String(user.id || item.id)}>
                                <td style={compactTextTdStyle}>{name}</td>
                                <td style={compactTextTdStyle}>{email}</td>
                                <td style={compactTextTdStyle}>
                                  <Badge variant="default">{String(role)}</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
            </Card>
          )}

            {activeTab === 'teams' && !isLikelyTeam && (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Teams</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/projects/create`
                      )
                    }
                  >
                    Add Team
                  </Button>
                </div>

                {childProjectsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading teams...</div>
                ) : childProjects.length === 0 ? (
                  <Alert variant="info">No teams found in this club.</Alert>
                ) : (
                  <Table style={compactTableStyle}>
                    <thead>
                      <tr>
                        <th style={compactThStyle}>Team</th>
                        <th style={compactThStyle}>Status</th>
                        <th style={compactThStyle} className="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {childProjects.map((team: any) => (
                        <tr key={team.id}>
                          <td style={compactTextTdStyle}>
                            <Link
                              to={`/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/teams/${
                                team.slug || team.id
                              }`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {team.name}
                            </Link>
                          </td>
                          <td style={compactTdStyle}>
                            <Badge variant={team.is_active ? 'success' : 'warning'}>
                              {team.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td style={compactTdStyle}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/teams/${
                                      team.slug || team.id
                                    }`
                                  )
                                }
                                style={actionButtonStyle('neutral')}
                              >
                                View
                              </button>
                              {userCanEditProject && (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/teams/${
                                        team.slug || team.id
                                      }/edit`
                                    )
                                  }
                                  style={actionButtonStyle('primary')}
                                >
                                  Edit
                                </button>
                              )}
                              {userCanDeleteProject && (
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete team ${team.name}?`)) return;
                                    try {
                                      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                      const res = await fetch(
                                        `${apiBaseUrl}/api/v1/organisations/${orgSlugOrId}/projects/${team.slug || team.id}/`,
                                        {
                                          method: 'DELETE',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'X-CSRFToken': csrfToken || '',
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
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            )}

            {activeTab === 'seasons' && (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Seasons</h3>
                  {isLikelyTeam && (
                    <Button variant="secondary" size="sm" onClick={() => navigate(seasonsPath)}>
                      Manage Seasons
                    </Button>
                  )}
                </div>

                {seasonsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading seasons...</div>
                ) : seasons.length === 0 ? (
                  <Alert variant="info">No seasons found.</Alert>
                ) : (
                  <Table style={compactTableStyle}>
                    <thead>
                      <tr>
                        <th style={compactThStyle}>Season</th>
                        {!isLikelyTeam && <th style={compactThStyle}>Team</th>}
                        <th style={compactThStyle}>Dates</th>
                        <th style={compactThStyle} className="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasons.map((season: any) => {
                        const clubSlug = String(project.slug || project.id);
                        const teamSlugOrId = String(
                          isLikelyTeam ? project.slug || project.id : season.project?.slug || season.project_id || season.project?.id || ''
                        );
                        const seasonHref = isLikelyTeam
                          ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}/seasons/${season.slug || season.id}`
                          : `/organisations/${orgSlugOrId}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${season.slug || season.id}`;

                        return (
                          <tr key={season.id}>
                            <td style={compactTextTdStyle}>
                              <Link to={seasonHref} className="font-medium text-blue-600 hover:underline">
                                {season.name}
                              </Link>
                            </td>
                            {!isLikelyTeam && <td style={compactTextTdStyle}>{season.project?.name || '-'}</td>}
                            <td style={compactTextTdStyle}>
                              {season.start_date || '?'} — {season.end_date || '?'}
                            </td>
                            <td style={compactTdStyle}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => navigate(seasonHref)}
                                  style={actionButtonStyle('neutral')}
                                >
                                  View
                                </button>
                                {userCanEditProject && (
                                  <button
                                    onClick={() => navigate(`${seasonHref}/edit`)}
                                    style={actionButtonStyle('primary')}
                                  >
                                    Edit
                                  </button>
                                )}
                                {userCanDeleteProject && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`Are you sure you want to delete season ${season.name}?`)) return;
                                      try {
                                        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                        const res = await fetch(
                                          `${apiBaseUrl}/api/v1/periods/${season.id}/`,
                                          {
                                            method: 'DELETE',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'X-CSRFToken': csrfToken || '',
                                            },
                                            credentials: 'include',
                                          }
                                        );

                                        if (res.ok) {
                                          setSeasons((prev) => prev.filter((p) => String(p.id) !== String(season.id)));
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
                )}
              </Card>
            )}

            {activeTab === 'competitions' && (
              <Card>
                <h3 className="text-lg font-semibold mb-4">Competitions</h3>
                {competitionsLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading competitions...</div>
                ) : competitions.length === 0 ? (
                  <Alert variant="info">No competitions found.</Alert>
                ) : (
                  <Table style={compactTableStyle}>
                    <thead>
                      <tr>
                        <th style={compactThStyle}>Competition</th>
                        <th style={compactThStyle}>Season</th>
                        {!isLikelyTeam && <th style={compactThStyle}>Team</th>}
                        <th style={compactThStyle} className="text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitions.map((comp: any) => {
                        const seasonId = String(comp.parent_period_id || comp.parent_period?.id || '');
                        const seasonSlug = String(comp.parent_period?.slug || '');
                        const clubSlug = String(project.slug || project.id);
                        const teamSlugOrId = String(
                          isLikelyTeam ? project.slug || project.id : comp.project?.slug || comp.project_id || comp.project?.id || ''
                        );
                        const compHref = isLikelyTeam
                          ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`
                          : `/organisations/${orgSlugOrId}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${seasonSlug || seasonId}/competitions/${comp.slug || comp.id}`;

                        return (
                          <tr key={comp.id}>
                            <td style={compactTextTdStyle}>
                              <Link to={compHref} className="font-medium text-blue-600 hover:underline">
                                {comp.name}
                              </Link>
                            </td>
                            <td style={compactTextTdStyle}>{comp.parent_period?.name || '-'}</td>
                            {!isLikelyTeam && <td style={compactTextTdStyle}>{comp.project?.name || '-'}</td>}
                            <td style={compactTdStyle}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => navigate(compHref)}
                                  style={actionButtonStyle('neutral')}
                                >
                                  View
                                </button>
                                {userCanEditProject && (
                                  <button
                                    onClick={() => navigate(`${compHref}/edit`)}
                                    style={actionButtonStyle('primary')}
                                  >
                                    Edit
                                  </button>
                                )}
                                {userCanDeleteProject && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`Are you sure you want to delete competition ${comp.name}?`)) return;
                                      try {
                                        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                        const res = await fetch(
                                          `${apiBaseUrl}/api/v1/periods/${comp.id}/`,
                                          {
                                            method: 'DELETE',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'X-CSRFToken': csrfToken || '',
                                            },
                                            credentials: 'include',
                                          }
                                        );

                                        if (res.ok) {
                                          setCompetitions((prev) => prev.filter((p) => String(p.id) !== String(comp.id)));
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
              </Card>
            )}

          {activeTab === 'matches' && (
            <Card>
               <h3 className="text-lg font-semibold mb-4">Matches</h3>
               {allMatchesLoading ? (
                   <div className="text-center py-4 text-gray-500">Loading matches...</div>
               ) : allMatches.length === 0 ? (
                   <Alert variant="info">No matches found.</Alert>
               ) : (
                   <Table style={compactTableStyle}>
                      <thead>
                        <tr>
                          <th style={compactThStyle}>Match</th>
                          <th style={compactThStyle}>Competition</th>
                          <th style={compactThStyle}>Date</th>
                          <th style={compactThStyle} className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMatches.map((m: any) => (
                          <tr key={m.id}>
                             <td style={compactTextTdStyle}>
                                <div className="font-medium">{m.title || m.name}</div>
                             </td>
                             <td style={compactTextTdStyle}>{m.period?.name || '-'}</td>
                             <td style={compactTextTdStyle}>
                                {m.start_time ? new Date(m.start_time).toLocaleString() : '-'}
                             </td>
                             <td style={compactTdStyle}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                   <button
                                     onClick={() => navigate(`/matches/${m.id}`)}
                                     style={actionButtonStyle('neutral')}
                                   >
                                     View
                                   </button>
                                   {userCanEditProject && (
                                     <button
                                       onClick={() => navigate(`/matches/${m.id}/edit`)}
                                       style={actionButtonStyle('primary')}
                                     >
                                       Edit
                                     </button>
                                   )}
                                   {userCanDeleteProject && (
                                     <button
                                       onClick={async () => {
                                         if (!window.confirm(`Are you sure you want to delete match ${m.title || m.name}?`)) return;
                                         try {
                                           const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                           const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
                                           const res = await fetch(
                                             `${apiBaseUrl}/api/v1/activities/${m.id}/`,
                                             {
                                               method: 'DELETE',
                                               headers: {
                                                 'Content-Type': 'application/json',
                                                 'X-CSRFToken': csrfToken || '',
                                               },
                                               credentials: 'include',
                                             }
                                           );

                                           if (res.ok) {
                                             setAllMatches((prev) => prev.filter((p) => String(p.id) !== String(m.id)));
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
                        ))}
                      </tbody>
                   </Table>
               )}
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
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;

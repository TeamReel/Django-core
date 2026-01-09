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
import { Project, User, AuditEvent } from '../../types';
import AppShell from '../../components/AppShell';

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
            const pageResults = json.data?.results || json.results || [];
            results.push(...pageResults);
            pageCount++;

            // Check for next page
            nextUrl = json.data?.next || json.next || null;
            if (!nextUrl) break;
        }
        console.log(`[fetchAllPages] Fetched ${results.length} items across ${pageCount} pages from ${url}`);
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

export const ProjectDetailPage: React.FC = () => {
  const { orgId, projectId, clubId } = useParams<{ orgId: string; projectId: string; clubId?: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { context, organisations, projects: contextProjects } = useContextSwitcher();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]); // For switcher
  const [club, setClub] = useState<Project | null>(null);

  // Tab Data State
  const [childProjects, setChildProjects] = useState<Project[]>([]);
  const [childProjectsLoading, setChildProjectsLoading] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<any[]>([]);
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
    if (childProjects.length > 0) return childProjects;

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
    const finalResults = filteredByParent.length > 0 ? filteredByParent : filteredByOrg;

    setChildProjects(finalResults as Project[]);
    return finalResults as Project[];
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
  const resolvedOrg = (orgId
    ? organisations.find(o => o.slug.toLowerCase() === orgId?.toLowerCase() || o.id === orgId)
    : context.organisation) || context.organisation;

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
  const handleOrganisationSwitch = (option: { id: string; label: string; slug: string }) => {
    navigate(`/organisations/${option.slug || option.id}`);
  };

  const handleProjectSwitch = (option: BreadcrumbSwitcherOption) => {
    navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${option.slug || option.id}`);
  };

  // Debug: Log project options
  console.log('[ProjectDetailPage] Debug:', {
    orgProjectsCount: orgProjects.length,
    projectOptionsCount: projectOptions.length,
    currentOrgId: resolvedOrg?.id || project?.organisation_id,
    resolvedOrgId: resolvedOrg?.id,
    projectOrgId: project?.organisation_id,
    sampleOrgProjects: orgProjects.slice(0, 2).map(p => ({
      name: p.name,
      id: p.id,
      organisation_id: p.organisation_id,
    }))
  });

  // Fetch projects for the current organisation (for switcher dropdown)
  useEffect(() => {
    const fetchOrgProjects = async () => {
      const orgId = resolvedOrg?.id || project?.organisation_id;
      if (!orgId) return;

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const orgSlug = resolvedOrg?.slug || organisations.find(o => o.id === orgId)?.slug;
        if (!orgSlug) return;

        const response = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${orgSlug}/projects/?page_size=100`,
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
          console.log('[ProjectDetailPage] Fetched projects:', {
            count: mapped.length,
            orgId,
            sample: mapped[0]
          });
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
              const membersList =
                membersData.data?.results || membersData.results || membersData.data || membersData || [];
              console.log('[ProjectDetailPage] Fetched members:', membersList.length, 'from', membersByIdEndpoint);
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
                console.log('[ProjectDetailPage] Club members fallback via org members:', orgMembersEndpoint);

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

                console.log('[ProjectDetailPage] Club people derived from child teams:', filtered.length);
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
                console.log('[ProjectDetailPage] Falling back to org members endpoint:', orgMembersEndpoint);

                const orgMembersResponse = await fetch(orgMembersEndpoint, {
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                  },
                  credentials: 'include',
                });

                if (orgMembersResponse.ok) {
                  const orgMembersData = await orgMembersResponse.json();
                  let orgMembersList = orgMembersData.data?.results || orgMembersData.results || [];

                  orgMembersList = orgMembersList.filter((u: any) =>
                    u.project_memberships?.some(
                      (m: any) => String(m.project_id || m.project?.id) === String(projectIdForApi)
                    )
                  );

                  console.log(
                    '[ProjectDetailPage] Filtered org members for project:',
                    orgMembersList.length,
                    'members'
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
        // Note: audit API might still expect project ID, not slug
        // If backend supports slug, change this to currentProjectSlug
        const projectIdForAudit = resolvedProject?.id || currentProjectSlug;
        const eventsResponse = await fetch(
          `${apiBaseUrl}/api/v1/audit/?project_id=${projectIdForAudit}&limit=10`,
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
          setRecentEvents(eventsData.results || []);
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
       console.log('[ProjectDetailPage] Fetching child teams with parent_project=', project.id, 'URL:', url);
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

       console.log(
         '[ProjectDetailPage] Fetched child teams (raw):',
         results.length,
         'filtered(org):',
         filteredByOrg.length,
         'filtered(parent):',
         filteredByParent.length
       );
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
      if (isLikelyTeam) {
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('page_size', '250');
        // Root periods = seasons
        params.set('parent_period__isnull', 'true');

        const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
        const results = await fetchAllPages<any>(url, { credentials: 'include' });
        setSeasons(Array.isArray(results) ? results : []);
      } else {
        const teams = await ensureChildTeamsLoaded();
        const teamIds = teams.map((t: any) => String(t.id)).filter(Boolean);
        const fetches = teamIds.map(async (teamId) => {
          const params = new URLSearchParams();
          params.set('project_id', String(teamId));
          params.set('page_size', '100');
          params.set('parent_period__isnull', 'true');
          const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
          return await fetchAllPages<any>(url, { credentials: 'include' });
        });

        const pages = await Promise.all(fetches);
        const combined = mergeUniqueById((pages || []).flat());
        setSeasons(combined);
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
        const params = new URLSearchParams();
        params.set('project_id', String(project.id));
        params.set('page_size', '250');
        // Non-root periods = competitions
        params.set('parent_period__isnull', 'false');
        const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
        const results = await fetchAllPages<any>(url, { credentials: 'include' });
        setCompetitions(Array.isArray(results) ? results : []);
      } else {
        const teams = await ensureChildTeamsLoaded();
        const teamIds = teams.map((t: any) => String(t.id)).filter(Boolean);
        const fetches = teamIds.map(async (teamId) => {
          const params = new URLSearchParams();
          params.set('project_id', String(teamId));
          params.set('page_size', '100');
          params.set('parent_period__isnull', 'false');
          const url = `${apiBaseUrl}/api/v1/periods/?${params.toString()}`;
          return await fetchAllPages<any>(url, { credentials: 'include' });
        });
        const pages = await Promise.all(fetches);
        const combined = mergeUniqueById((pages || []).flat());
        setCompetitions(combined);
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
        const teams = await ensureChildTeamsLoaded();
        const teamIds = teams.map((t: any) => String(t.id)).filter(Boolean);

        const fetches = teamIds.map(async (teamId) => {
          const params = new URLSearchParams();
          params.set('project_id', String(teamId));
          params.set('activity_type', 'match');
          params.set('page_size', '100');
          params.set('ordering', '-start_time');
          const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
          return await fetchAllPages<any>(url, { credentials: 'include' });
        });

        const pages = await Promise.all(fetches);
        const combined = mergeUniqueById((pages || []).flat());
        const sorted = sortByStartTimeDesc(combined);
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
    console.log('[ProjectDetailPage] Tab changed to:', activeTab, 'isLikelyTeam:', isLikelyTeam, 'project:', project.name);
    if (activeTab === 'teams') {
      console.log('[ProjectDetailPage] Club detected, fetching child teams. Current childProjects:', childProjects.length);
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
            const results = json.data?.results || json.results || [];
            setScheduledMatches(results);
          }
        } else {
          const teams = await ensureChildTeamsLoaded();
          const teamIds = teams.map((t: any) => String(t.id)).filter(Boolean);
          const fetches = teamIds.map(async (teamId) => {
            const params = new URLSearchParams();
            params.set('activity_type', 'match');
            params.set('project_id', String(teamId));
            params.set('start_time__gte', new Date().toISOString());
            params.set('ordering', 'start_time');
            params.set('page_size', '5');
            const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
            return await fetchAllPages<any>(url, { credentials: 'include' });
          });
          const pages = await Promise.all(fetches);
          const combined = mergeUniqueById((pages || []).flat());
          const sorted = [...combined].sort((a, b) => {
            const ta = a?.start_time ? new Date(a.start_time).getTime() : 0;
            const tb = b?.start_time ? new Date(b.start_time).getTime() : 0;
            return ta - tb;
          });
          setScheduledMatches(sorted.slice(0, 5));
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
            const results = json.data?.results || json.results || [];
            setRecentPlayedMatches(results);
          }
        } else {
          const teams = await ensureChildTeamsLoaded();
          const teamIds = teams.map((t: any) => String(t.id)).filter(Boolean);
          const fetches = teamIds.map(async (teamId) => {
            const params = new URLSearchParams();
            params.set('activity_type', 'match');
            params.set('project_id', String(teamId));
            params.set('start_time__lt', new Date().toISOString());
            params.set('ordering', '-start_time');
            params.set('page_size', '10');
            const url = `${apiBaseUrl}/api/v1/activities/?${params.toString()}`;
            return await fetchAllPages<any>(url, { credentials: 'include' });
          });
          const pages = await Promise.all(fetches);
          const combined = mergeUniqueById((pages || []).flat());
          const sorted = sortByStartTimeDesc(combined);
          setRecentPlayedMatches(sorted.slice(0, 10));
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
            const count = json.data?.count ?? json.count ?? 0;
            setMatchesCount(count);
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'people', label: 'People' },
    ...(!isLikelyTeam ? [{ id: 'teams', label: 'Teams' }] : []),
    { id: 'seasons', label: 'Seasons' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
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
                { label: project.name, current: true }
              ]
            : [{ label: project.name, current: true }]
          )
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate(backPath)}>
              Back
            </Button>
            {/* Context Switcher for Projects */}
            <BreadcrumbContextSwitcher
                currentId={String(project.id)}
                options={effectiveProjectOptions}
                onSelect={handleProjectSwitch}
                hasDropdown={effectiveProjectOptions.length > 1}
                type="project"
            />
            <button
              onClick={() => navigate(`/organisations/${orgSlugOrId}/projects/${project.slug || project.id}/edit`)}
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
              Edit Project
            </button>
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
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View
                              </button>
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
                          ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}/seasons/${season.id}`
                          : `/organisations/${orgSlugOrId}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${season.id}`;

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
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View
                                </button>
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
                        const clubSlug = String(project.slug || project.id);
                        const teamSlugOrId = String(
                          isLikelyTeam ? project.slug || project.id : comp.project?.slug || comp.project_id || comp.project?.id || ''
                        );
                        const compHref = isLikelyTeam
                          ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}/seasons/${seasonId}/competitions/${comp.id}`
                          : `/organisations/${orgSlugOrId}/projects/${clubSlug}/teams/${teamSlugOrId}/seasons/${seasonId}/competitions/${comp.id}`;

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
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View
                                </button>
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
                                     className="text-xs text-blue-600 hover:underline"
                                   >
                                     View
                                   </button>
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

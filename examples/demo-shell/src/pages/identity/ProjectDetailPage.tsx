import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
} from '@django-core/design-system';
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

/**
 * T009 - Project Detail Page
 *
 * Purpose: Display project metadata, members, and recent audit activity
 * - Shows project summary cards (name, description, member count)
 * - Lists team members with roles
 * - Shows recent audit events filtered by project_id
 */
export const ProjectDetailPage: React.FC = () => {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { context, organisations, projects: contextProjects } = useContextSwitcher();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]); // For switcher

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

        // Fetch project members
        // Use the new 'members' action on the project viewset
        const membersEndpoint = resolvedOrg
          ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${currentProjectSlug}/members/`
          : `${apiBaseUrl}/api/v1/projects/${currentProjectSlug}/members/`;

        const membersResponse = await fetch(
          membersEndpoint,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          // Handle B13 response envelope
          const membersList = membersData.data?.results || membersData.results || membersData.data || membersData || [];
          setMembers(Array.isArray(membersList) ? membersList : []);
        } else {
            // Fallback to org members if endpoint fails (e.g. during transition)
            console.warn("Project members endpoint failed, falling back to org members");
            if (resolvedOrg) {
                const fallbackEndpoint = `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/members/`;
                const fallbackResponse = await fetch(fallbackEndpoint, {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    setMembers(data.results || []);
                }
            }
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
  }, [currentProjectSlug, context.isLoading, resolvedProject]);

  if (loading || context.isLoading) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Project Details"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: resolvedOrg?.name || 'Organisation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}`) },
              { label: 'Projects', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`) },
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
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: resolvedOrg?.name || 'Organisation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}`) },
              { label: 'Projects', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`) },
              { label: 'Details', current: true },
            ]}
          />
          <PageContent>
            <Alert variant="error" data-testid="project-detail-error">
              {error || 'Project not found'}
            </Alert>
            <Button variant="secondary" onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`)}>
              Back to Projects
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

  return (
    <AppShell>
      <div>
        <PageHeader
        title={project.name}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Organisations', onClick: () => navigate('/organisations') },
          { label: resolvedOrg?.name || 'Organisation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}`) },
          { label: 'Projects', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`) },
          {
            label: (
              <select
                value={project.slug || project.id}
                onChange={(e) => {
                  const value = e.target.value;
                  const selectedProject = effectiveProjectOptions.find(p => (p.slug || p.id) === value);
                  if (selectedProject) handleProjectSwitch({
                    id: selectedProject.id,
                    label: selectedProject.label,
                    slug: selectedProject.slug || ''
                  });
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {effectiveProjectOptions.map(proj => (
                  <option key={proj.id} value={proj.slug || proj.id}>{proj.label}</option>
                ))}
              </select>
            ),
            current: true,
          },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`)}
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
              Back
            </button>
            <button
              onClick={() => navigate(`/users?project_id=${project.slug || project.id}&organisation_id=${resolvedOrg?.slug || resolvedOrg?.id}`)}
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
              View Project Users
            </button>
            <button
              onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${project.slug || project.id}/edit`)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #0056b3',
                backgroundColor: 'var(--app-surface)',
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

        {/* Project summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="project-summary-status">
            <div className="text-sm text-gray-600">Status</div>
            <div className="text-lg font-bold">
              <Badge variant={project.is_active ? 'success' : 'warning'}>
                {project.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>
          <Card data-testid="project-summary-members">
            <div className="text-sm text-gray-600">Team Members</div>
            <div className="text-2xl font-bold">{members.length}</div>
          </Card>
          <Card data-testid="project-summary-created">
            <div className="text-sm text-gray-600">Created</div>
            <div className="text-sm font-semibold">
              {new Date(project.created_at || '').toLocaleDateString()}
            </div>
          </Card>
        </div>

        {/* Project description */}
        {project.description && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700" data-testid="project-description">
              {project.description}
            </p>
          </Card>
        )}

        {/* Team members */}
        <Card className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <p className="text-sm text-gray-500">
              Users with explicit roles in this project, plus Organisation Admins.
            </p>
          </div>
          {members.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((item: any) => {
                  // Handle Membership object structure
                  const user = item.user || item;
                  const role = item.role || 'member';

                  return (
                    <tr key={user.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <Badge variant="default" data-testid={`team-role-${user.id}`}>
                          {role}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.85rem' }} data-testid={`team-joined-${user.id}`}>
                        {item.joined_at
                          ? new Date(item.joined_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">No team members yet</Alert>
          )}
        </Card>

        {/* Recent activity */}
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
      </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
  Table,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
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

  // Resolve org and project slugs
  const resolvedOrg = organisations.find(o =>
    o.slug.toLowerCase() === orgId?.toLowerCase() || o.id === orgId
  ) || context.organisation;

  const targetId = projectId || id;

  // Try to find project in context first (if loaded), otherwise use targetId as slug
  const resolvedProject = contextProjects.find(p =>
    p.slug.toLowerCase() === targetId?.toLowerCase() || p.id === targetId
  );
  const currentProjectSlug = resolvedProject?.slug || targetId?.toLowerCase(); // Use slug for API calls

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

        const projectData: Project = await projectResponse.json();
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
          setMembers(membersData.results || []);
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
            <Alert type="error" data-testid="project-detail-error">
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
          { label: project.name, current: true },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects`)}>
              Back
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/users?project_id=${project.slug || project.id}&organisation_id=${resolvedOrg?.slug || resolvedOrg?.id}`)}>
              View Project Users
            </Button>
            <Button variant="primary" onClick={() => navigate(`/organisations/${resolvedOrg?.slug || resolvedOrg?.id}/projects/${project.slug || project.id}/edit`)}>
              Edit Project
            </Button>
          </div>
        }
      />

      <PageContent>
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
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'joined', label: 'Joined' },
              ]}
              rows={members.map((item: any) => {
                // Handle Membership object structure
                const user = item.user || item;
                const role = item.role || 'member';

                return {
                  id: user.id,
                  name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
                  email: user.email,
                  role: (
                    <Badge variant="secondary" data-testid={`team-role-${user.id}`}>
                      {role}
                    </Badge>
                  ),
                  joined: (
                    <span data-testid={`team-joined-${user.id}`}>
                      {item.joined_at
                        ? new Date(item.joined_at).toLocaleDateString()
                        : '-'}
                    </span>
                  ),
                };
              })}
              data-testid="project-members-table"
            />
          ) : (
            <Alert type="info">No team members yet</Alert>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {recentEvents.length > 0 ? (
            <Table
              columns={[
                { key: 'event_type', label: 'Event' },
                { key: 'user', label: 'User' },
                { key: 'timestamp', label: 'Time' },
              ]}
              rows={recentEvents.map((event) => ({
                id: event.id,
                event_type: (
                  <Badge variant="secondary" data-testid={`event-type-${event.id}`}>
                    {event.event_type}
                  </Badge>
                ),
                user: (
                  <span data-testid={`event-user-${event.id}`}>
                    {event.user?.name || 'System'}
                  </span>
                ),
                timestamp: (
                  <span className="text-sm text-gray-600" data-testid={`event-time-${event.id}`}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                ),
              }))}
              data-testid="project-activity-table"
            />
          ) : (
            <Alert type="info">No recent activity</Alert>
          )}
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default ProjectDetailPage;

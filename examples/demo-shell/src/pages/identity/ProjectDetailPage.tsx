import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  Button,
  Card,
  Badge,
  Alert,
  Table,
} from '@django-core/design-system';
import { Project, User, AuditEvent } from '../../types';

/**
 * T009 - Project Detail Page
 *
 * Purpose: Display project metadata, members, and recent audit activity
 * - Shows project summary cards (name, description, member count)
 * - Lists team members with roles
 * - Shows recent audit events filtered by project_id
 */
export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project details
        const projectResponse = await fetch(`/api/projects/${id}/`, {
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
        const membersResponse = await fetch(
          `/api/projects/${id}/members/`,
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
        }

        // Fetch recent audit events for this project
        const eventsResponse = await fetch(
          `/api/audit/?project_id=${id}&limit=10`,
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

    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Project Details"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Projects', href: '/projects' },
            { label: 'Details' },
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
    );
  }

  if (error || !project) {
    return (
      <div>
        <PageHeader
          title="Project Details"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Projects', href: '/projects' },
            { label: 'Details' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="project-detail-error">
            {error || 'Project not found'}
          </Alert>
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </PageContent>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back
          </Button>
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
          <h3 className="text-lg font-semibold mb-4">Team Members</h3>
          {members.length > 0 ? (
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'joined', label: 'Joined' },
              ]}
              rows={members.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                role: (
                  <Badge variant="secondary" data-testid={`team-role-${member.id}`}>
                    {member.role || 'member'}
                  </Badge>
                ),
                joined: (
                  <span data-testid={`team-joined-${member.id}`}>
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : '-'}
                  </span>
                ),
              }))}
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
  );
};

export default ProjectDetailPage;

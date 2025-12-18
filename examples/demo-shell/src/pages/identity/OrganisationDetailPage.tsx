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
import { Organisation, User, Project } from '../../types';
import AppShell from '../../components/AppShell';

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
  const [org, setOrg] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch organisation details
        const orgResponse = await fetch(`/api/organisations/${id}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': id || '',
          },
          credentials: 'include',
        });

        if (!orgResponse.ok) {
          throw new Error(`Failed to fetch organisation (${orgResponse.status})`);
        }

        const orgData: Organisation = await orgResponse.json();
        setOrg(orgData);

        // Fetch members
        const membersResponse = await fetch(
          `/api/organisations/${id}/members/`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': id || '',
            },
            credentials: 'include',
          }
        );

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembers(membersData.results || []);
        }

        // Fetch projects
        const projectsResponse = await fetch(
          `/api/organisations/${id}/projects/?limit=5`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': id || '',
            },
            credentials: 'include',
          }
        );

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData.results || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisation details');
        console.error('Org detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrgDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Organisation Details"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Organisations', href: '/organisations' },
            { label: 'Details' },
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
    );
  }

  if (error || !org) {
    return (
      <div>
        <PageHeader
          title="Organisation Details"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Identity' },
            { label: 'Organisations', href: '/organisations' },
            { label: 'Details' },
          ]}
        />
        <PageContent>
          <Alert type="error" data-testid="org-detail-error">
            {error || 'Organisation not found'}
          </Alert>
          <Button variant="secondary" onClick={() => navigate('/organisations')}>
            Back to Organisations
          </Button>
        </PageContent>
      </div>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
        title={org.name}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Organisations', href: '/organisations' },
          { label: org.name },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate('/organisations')}>
            Back
          </Button>
        }
      />

      <PageContent>
        {/* Organisation summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="org-summary-members">
            <div className="text-sm text-gray-600">Members</div>
            <div className="text-2xl font-bold">{members.length}</div>
          </Card>
          <Card data-testid="org-summary-projects">
            <div className="text-sm text-gray-600">Projects</div>
            <div className="text-2xl font-bold">{org.project_count || 0}</div>
          </Card>
          <Card data-testid="org-summary-credits">
            <div className="text-sm text-gray-600">Credits Available</div>
            <div className="text-2xl font-bold">{org.credit_balance || 0}</div>
          </Card>
        </div>

        {/* Members section */}
        <Card className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Members</h3>
          {members.length > 0 ? (
            <Table
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
              ]}
              rows={members.map((member) => ({
                id: member.id,
                name: member.name,
                email: member.email,
                role: (
                  <Badge variant="secondary" data-testid={`member-role-${member.id}`}>
                    {member.role || 'member'}
                  </Badge>
                ),
              }))}
              data-testid="org-members-table"
            />
          ) : (
            <Alert type="info">No members yet</Alert>
          )}
        </Card>

        {/* Projects section */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
          {projects.length > 0 ? (
            <Table
              columns={[
                { key: 'name', label: 'Project Name' },
                { key: 'member_count', label: 'Team Size' },
                { key: 'status', label: 'Status' },
              ]}
              rows={projects.map((project) => ({
                id: project.id,
                name: (
                  <a
                    href={`/projects/${project.id}`}
                    className="text-blue-600 hover:underline"
                    data-testid={`project-link-${project.id}`}
                  >
                    {project.name}
                  </a>
                ),
                member_count: (
                  <Badge variant="secondary">{project.member_count || 0}</Badge>
                ),
                status: (
                  <Badge
                    variant={project.is_active ? 'success' : 'warning'}
                    data-testid={`project-status-${project.id}`}
                  >
                    {project.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              }))}
              data-testid="org-projects-table"
            />
          ) : (
            <Alert type="info">No projects yet</Alert>
          )}
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default OrganisationDetailPage;

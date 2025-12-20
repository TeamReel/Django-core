import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Badge,
  Card,
  Table,
  Alert,
} from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { useQueryParams } from '../../hooks/useQueryParams';
import { Project, ListResponse } from '../../types';
import AppShell from '../../components/AppShell';
import { canCreateProject, canEditProject, canDeleteProject } from '../../utils/permissions';

/**
 * T008 - Projects List Page
 *
 * Purpose: Display org-scoped projects with pagination and filters
 * - Uses X-Organisation-ID header from context
 * - Supports sort/filter via query params (shareable URLs)
 * - Shows project metadata and member counts
 */
export const ProjectsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');

  // Use orgId from URL if available, otherwise from context
  // If orgId is a slug, we need to resolve it to slug for API calls
  const resolvedOrg = organisations.find(o => o.slug === orgId || o.id === orgId) || context.organisation;
  const currentOrgSlug = resolvedOrg?.slug || orgId; // Use slug for API calls
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  // Permission checks using centralized helper
  const isSuperAdmin = (user as any)?.role === 'superadmin';
  const permissionContext = {
    currentOrganisation: resolvedOrg,
    isSuperAdmin,
  };
  const userCanCreateProject = canCreateProject(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // Query params for sort and filter
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        // Fetch org name if we have orgId from URL
        if (resolvedOrg) {
          setOrgName(resolvedOrg.name);
        } else if (orgId) {
          // Fallback: try to fetch org details directly (if backend supports slug lookup)
          const orgResponse = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgId}/`, {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          });
          if (orgResponse.ok) {
            const orgData = await orgResponse.json();
            setOrgName(orgData.name);
          }
        } else {
          setOrgName(context.organisation?.name || '');
        }

        const params = new URLSearchParams();
        params.append('sort', sort);
        params.append('order', order);
        if (search) {
          params.append('search', search);
        }

        // Determine endpoint: Global vs Org-scoped
        const endpoint = currentOrgSlug
            ? `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?${params.toString()}`
            : `${apiBaseUrl}/api/v1/projects/?${params.toString()}`;

        const response = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ListResponse<Project> = await response.json();
        setProjects(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        console.error('Projects fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [sort, order, search, currentOrgSlug, orgId, context.organisation, resolvedOrg]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    if (newSearch) {
      searchParams.set('search', newSearch);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  const handleSort = (column: string) => {
    if (sort === column) {
      searchParams.set('order', order === 'asc' ? 'desc' : 'asc');
    } else {
      searchParams.set('sort', column);
      searchParams.set('order', 'asc');
    }
    setSearchParams(searchParams);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      // Find project to get its slug
      const projectToDelete = projects.find(p => p.id === projectId);
      const projectSlug = projectToDelete?.slug || projectId;

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const endpoint = resolvedOrg
        ? `${apiBaseUrl}/api/v1/organisations/${resolvedOrg.slug}/projects/${projectSlug}/`
        : `${apiBaseUrl}/api/v1/projects/${projectSlug}/`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert('Failed to delete project');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting project');
    }
  };

  // Always show breadcrumbs with current org info
  const breadcrumbItems = currentOrgId ? [
    { label: 'Home', onClick: () => navigate('/') },
    { label: 'Organisations', onClick: () => navigate('/organisations') },
    { label: orgName || 'Loading...', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}`) },
    { label: 'Projects', current: true },
  ] : [
    { label: 'Home', onClick: () => navigate('/') },
    { label: 'Projects', current: true },
  ];

  console.log('ProjectsPage render:', { orgId, currentOrgId, orgName, contextOrgId: context.organisation?.id, breadcrumbItems });

  // Define columns based on context
  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      sortable: true,
      sorted: sort === 'name' ? order : undefined,
      onSort: () => handleSort('name'),
    },
    // Add Organisation column if in global view
    ...(!currentOrgSlug ? [{
      key: 'organisation',
      label: 'Organisation',
    }] : []),
    {
      key: 'description',
      label: 'Description',
    },
    {
      key: 'member_count',
      label: 'Team Members',
      sortable: true,
      sorted: sort === 'member_count' ? order : undefined,
      onSort: () => handleSort('member_count'),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      sorted: sort === 'created_at' ? order : undefined,
      onSort: () => handleSort('created_at'),
    },
    {
      key: 'status',
      label: 'Status',
    },
    {
      key: 'actions',
      label: 'Actions',
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title={orgName ? `${orgName} - Projects` : 'All Projects'}
        breadcrumbs={breadcrumbItems}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentOrgSlug && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}`)}
              >
                Back to Organisation
              </Button>
            )}
            {currentOrgSlug && userCanCreateProject && (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}/projects/create`)}
              >
                New Project
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        {/* Search */}
        <Card className="mb-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={handleSearch}
              className="flex-1"
              data-testid="project-search-input"
            />
          </div>
        </Card>

        {/* Error state */}
        {error && (
          <Alert type="error" className="mb-4" data-testid="project-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <Alert type="info" data-testid="project-empty-state">
            No projects found. {currentOrgSlug ? 'Create a new project to get started.' : 'Select an organisation to create a project.'}
          </Alert>
        )}

        {/* Projects table */}
        {!loading && projects.length > 0 && (
          <Table
            columns={columns}
            rows={projects.map((project) => {
              const projectOrgSlug = (project as any).organisation?.slug || resolvedOrg?.slug || currentOrgId;

              return {
                id: project.id,
                name: (
                  <a
                    href={`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}`}
                    className="text-blue-600 hover:underline"
                    data-testid={`project-name-${project.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}`);
                    }}
                  >
                    {project.name}
                  </a>
                ),
                organisation: !currentOrgSlug ? (
                  <span className="text-sm text-gray-600">
                    {(project as any).organisation?.name || '-'}
                  </span>
                ) : undefined,
                description: (
                  <span className="text-sm text-gray-600" data-testid={`project-desc-${project.id}`}>
                    {project.description || '-'}
                  </span>
                ),
                member_count: (
                  <Badge variant="secondary" data-testid={`project-members-${project.id}`}>
                    {project.member_count || 0}
                  </Badge>
                ),
                created_at: (
                  <span data-testid={`project-created-${project.id}`}>
                    {new Date(project.created_at || '').toLocaleDateString()}
                  </span>
                ),
                status: (
                  <Badge
                    variant={project.is_active ? 'success' : 'warning'}
                    data-testid={`project-status-${project.id}`}
                  >
                    {project.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
                actions: (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}`)}
                      style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #6c757d',
                          backgroundColor: 'white',
                          color: '#6c757d',
                          cursor: 'pointer',
                          fontSize: '12px'
                      }}
                    >
                      View
                    </button>
                    {userCanEditProject && (
                      <button
                        onClick={() => navigate(`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}/edit`)}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #007bff',
                            backgroundColor: 'white',
                            color: '#007bff',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {userCanDeleteProject && (
                      <button
                        onClick={() => handleDelete(project.id)}
                        style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #dc3545',
                            backgroundColor: 'white',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ),
              };
            })}
            loading={loading}
            data-testid="project-table"
          />
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading projects...
            </div>
          </Card>
        )}
      </PageContent>
    </AppShell>
  );
};

export default ProjectsPage;

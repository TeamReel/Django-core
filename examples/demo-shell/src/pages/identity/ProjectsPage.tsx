import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  Alert,
  Card,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { PageHeader, PageContent, BreadcrumbContextSwitcher, useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { useQueryParams } from '../../hooks/useQueryParams';
import { Project, ListResponse } from '../../types';
import AppShell from '../../components/AppShell';
import { canCreateProject, canEditProject, canDeleteProject } from '../../utils/permissions';
import ProjectEditModal from './ProjectEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import LoadingState from '../../components/LoadingState';

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

  // Use orgId from URL if available.
  // Do NOT fallback to context for the top-level /projects route.
  const resolvedOrg = orgId
    ? organisations.find(o => o.slug === orgId || o.id === orgId)
    : undefined;

  const currentOrgSlug = resolvedOrg?.slug; // Use slug for API calls (no fallback to orgId)
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  const [orgName, setOrgName] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (like UsersPage)
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to 'active'
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>(''); // '' = All Organisations

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  // Org selection modal state (for creating project without org context)
  const [isOrgSelectionModalOpen, setIsOrgSelectionModalOpen] = useState(false);

  // Success notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    organisationOptions,
    handleOrganisationSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: ''
  });

  // Fix: Only show org name in title if we are actually in an org context
  const displayOrgName = currentOrgSlug ? orgName : '';

  // For API calls, ONLY use organisation from URL params.
  // On /projects (no orgId param), apiOrgSlug MUST be undefined for global fetch.
  const apiOrgSlug = orgId ? currentOrgSlug : undefined;

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

  // Extract fetchProjects so it can be reused
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

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
      const isGlobalRoute = !apiOrgSlug;
      const endpoint = apiOrgSlug
          ? `${apiBaseUrl}/api/v1/organisations/${apiOrgSlug}/projects/?${params.toString()}`
          : `${apiBaseUrl}/api/v1/projects/?${params.toString()}`;

      console.log('[ProjectsPage] Fetch:', {
        route: isGlobalRoute ? 'GLOBAL' : 'ORG-SCOPED',
        orgId,
        apiOrgSlug,
        endpoint
      });

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

      const data: any = await response.json();

      // Debug: log full response
      console.log('[ProjectsPage] Full API response:', JSON.stringify(data, null, 2));
      console.log('[ProjectsPage] Response keys:', Object.keys(data));

      // Handle B13 envelope or direct DRF response
      const results = data.data?.results || data.results || [];

      console.log('[ProjectsPage] Has results?', results.length > 0);
      console.log('[ProjectsPage] Results value:', results);

      // Enforce array invariant
      if (!Array.isArray(results)) {
        console.warn('[ProjectsPage] Results is not an array, using empty array');
        setProjects([]);
      } else {
        console.log(`[ProjectsPage] Loaded ${results.length} projects`);
        setProjects(results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      console.error('Projects fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects - ONLY depend on values that should trigger a refetch
  // orgId is from URL params and is the source of truth for org-scoped routes
  useEffect(() => {
    fetchProjects();
  }, [sort, order, search, orgId]);

  // Guard: If we are in an org context (URL param) but context switcher hasn't loaded orgs yet, wait.
  // This prevents "undefined" org context errors during navigation.
  if (orgId && context.isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading organisation context..." />
      </AppShell>
    );
  }

  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!selectedProject) return;

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Get CSRF token
      const getCookie = (name: string) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
              cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
              break;
            }
          }
        }
        return cookieValue;
      };
      const csrfToken = getCookie('csrftoken');

      // Find project's organisation slug - check multiple possible locations
      const project = projects.find(p => p.id === selectedProject.id);

      // Try multiple ways to get the org slug
      let projectOrgSlug: string | undefined;

      // 1. From project.organisation.slug (nested object)
      if ((project as any)?.organisation?.slug) {
        projectOrgSlug = (project as any).organisation.slug;
      }
      // 2. From organisations array using organisation_id
      else if (project?.organisation_id) {
        projectOrgSlug = organisations.find(o => o.id === project.organisation_id)?.slug;
      }
      // 3. From selectedProject if it has the nested organisation
      else if ((selectedProject as any)?.organisation?.slug) {
        projectOrgSlug = (selectedProject as any).organisation.slug;
      }
      // 4. Use current org from URL/context
      else if (currentOrgSlug) {
        projectOrgSlug = currentOrgSlug;
      }

      if (!projectOrgSlug) {
        console.error('Project data:', { project, selectedProject, organisations });
        throw new Error('Could not determine project organisation');
      }

      // Get the project slug (backend expects slug, not id)
      const projectSlug = selectedProject.slug;
      if (!projectSlug) {
        throw new Error('Could not determine project slug');
      }

      console.log('Updating project:', { orgSlug: projectOrgSlug, projectSlug, projectId: selectedProject.id });

      // Try org-nested endpoint first (expects slug)
      let response = await fetch(
        `${apiBaseUrl}/api/v1/organisations/${projectOrgSlug}/projects/${projectSlug}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || '',
          },
          credentials: 'include',
          body: JSON.stringify(projectData),
        }
      );

      // If nested route fails, try direct projects endpoint (also expects slug)
      if (!response.ok && (response.status === 404 || response.status === 403)) {
        console.log(`Nested route failed (${response.status}), trying direct endpoint...`);
        response = await fetch(
          `${apiBaseUrl}/api/v1/projects/projects/${projectSlug}/`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
            body: JSON.stringify(projectData),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update project (${response.status})`);
      }

      const updatedProject = await response.json();

      // Close modal first
      setIsEditModalOpen(false);
      setSelectedProject(null);

      // Show success message
      setSuccessMessage('Project updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh projects list from API to get latest data
      await fetchProjects();
    } catch (err) {
      console.error('Update project error:', err);
      alert(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

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

      // Find project to get its slug and org
      const projectToDelete = projects.find(p => p.id === projectId);
      const projectSlug = projectToDelete?.slug || projectId;

      // Get organisation slug - try multiple sources
      let orgSlug: string | undefined;
      if ((projectToDelete as any)?.organisation?.slug) {
        orgSlug = (projectToDelete as any).organisation.slug;
      } else if (resolvedOrg) {
        orgSlug = resolvedOrg.slug;
      }

      if (!orgSlug) {
        console.error('Cannot delete: missing organisation context', projectToDelete);
        alert('Failed to delete project: missing organisation context');
        return;
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      // Always use nested route for delete (required for permissions)
      const endpoint = `${apiBaseUrl}/api/v1/organisations/${orgSlug}/projects/${projectSlug}/`;

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
        const errorText = await response.text();
        console.error('Delete failed:', response.status, errorText);
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
    { label: orgName || 'Organisation', onClick: () => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}`) },
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
        title={displayOrgName ? `${displayOrgName} - Projects` : 'All Projects'}
        breadcrumbs={breadcrumbItems}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentOrgSlug && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}`)}
              >
                Back to Organisation
              </Button>
            )}

            {/* Filters - show on global view or org-scoped view */}
            <label style={{ fontSize: '14px', fontWeight: 500 }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            {/* Organisation Filter - only on global view */}
            {!currentOrgSlug && (
              <>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>Filter by Org:</label>
                <select
                  value={selectedOrgFilter}
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">All Organisations</option>
                  {organisations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </>
            )}

            {/* Create Project button - show on global view or org-scoped with permission */}
            {(!currentOrgSlug || (currentOrgSlug && userCanCreateProject)) && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (currentOrgSlug) {
                    navigate(`/organisations/${resolvedOrg?.slug || currentOrgId}/projects/create`);
                  } else {
                    // No org context: show org selection modal
                    setIsOrgSelectionModalOpen(true);
                  }
                }}
              >
                Create Project
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        {/* Success message */}
        {successMessage && (
          <Alert variant="success" className="mb-4" data-testid="project-success-alert">
            {successMessage}
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="error" className="mb-4" data-testid="project-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <Alert variant="info" data-testid="project-empty-state">
            No projects found. {currentOrgSlug ? 'Create a new project to get started.' : 'No accessible projects.'}
          </Alert>
        )}

        {/* Projects table */}
        {!loading && projects.length > 0 && (() => {
          // Defensive guard: ensure projects is always an array before .map()
          const safeProjects = Array.isArray(projects) ? projects : [];
          if (safeProjects.length === 0) return null;
          // Apply client-side filters (like UsersPage)
          let filteredProjects = safeProjects;

          // Status filter
          if (statusFilter === 'active') {
            filteredProjects = filteredProjects.filter(p => p.is_active !== false);
          } else if (statusFilter === 'inactive') {
            filteredProjects = filteredProjects.filter(p => p.is_active === false);
          }

          // Organisation filter (only for global view)
          if (!currentOrgSlug && selectedOrgFilter) {
            filteredProjects = filteredProjects.filter(p => {
              const projOrgId = (p as any).organisation?.id || p.organisation_id;
              return projOrgId === selectedOrgFilter;
            });
          }

          if (filteredProjects.length === 0) {
            return (
              <Alert variant="info" data-testid="project-filtered-empty">
                No projects match the current filters.
              </Alert>
            );
          }

          return (
          <Card>
            <div className="overflow-x-auto">
              <Table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Project Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                </th>
                {!currentOrgSlug && <th>Organisation</th>}
                <th>Description</th>
                <th onClick={() => handleSort('member_count')} style={{ cursor: 'pointer' }}>
                  Team Members {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                  Created {sort === 'created_at' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const projectOrgSlug = (project as any).organisation?.slug || resolvedOrg?.slug || currentOrgId;

                // For global view: check permissions per-project based on project's org
                const projectOrg = (project as any).organisation;
                const projectPermissionContext = {
                  currentOrganisation: projectOrg ? {
                    ...projectOrg,
                    user_role: projectOrg.user_role
                  } : resolvedOrg,
                  isSuperAdmin,
                };
                const canEdit = canEditProject(projectPermissionContext);
                const canDelete = canDeleteProject(projectPermissionContext);

                return (
                  <tr key={project.id}>
                    <td>
                      <a
                        href={`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}`}
                        className="text-blue-600 hover:underline"
                        style={{ fontSize: '0.85rem' }}
                        data-testid={`project-name-${project.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/organisations/${projectOrgSlug}/projects/${project.slug || project.id}`);
                        }}
                      >
                        {project.name}
                      </a>
                    </td>
                    {!currentOrgSlug && (
                      <td style={{ fontSize: '0.85rem' }}>
                        {(project as any).organisation?.name || '-'}
                      </td>
                    )}
                    <td style={{ fontSize: '0.85rem' }} data-testid={`project-desc-${project.id}`}>
                      {project.description || '-'}
                    </td>
                    <td>
                      <Badge variant="default" data-testid={`project-members-${project.id}`}>
                        {project.member_count || 0}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.85rem' }} data-testid={`project-created-${project.id}`}>
                      {new Date(project.created_at || '').toLocaleDateString()}
                    </td>
                    <td>
                      <Badge
                        variant={project.is_active ? 'success' : 'warning'}
                        data-testid={`project-status-${project.id}`}
                      >
                        {project.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setDetailProject(project);
                            setIsDetailModalOpen(true);
                          }}
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
                        {canEdit && (
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setIsEditModalOpen(true);
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #007bff',
                                backgroundColor: 'var(--app-surface)',
                                color: '#007bff',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(project.id)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #dc3545',
                                backgroundColor: 'var(--app-surface)',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
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

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-gray-500">
            Loading projects...
          </div>
        )}
      </PageContent>

      {/* Detail Modal */}
      <ProjectDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        project={detailProject}
      />

      {/* Org Selection Modal */}
      {isOrgSelectionModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsOrgSelectionModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--app-surface)',
              borderRadius: '8px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--app-text)' }}>Select Organisation</h2>
            <p style={{ color: 'var(--app-muted-text)', marginBottom: '24px' }}>
              Choose an organisation to create the project in:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {organisations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setIsOrgSelectionModalOpen(false);
                    navigate(`/organisations/${org.slug}/projects/create`);
                  }}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid var(--app-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--app-surface-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    color: 'var(--app-text)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--app-table-row-hover-bg)';
                    e.currentTarget.style.borderColor = '#2196f3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--app-surface-2)';
                    e.currentTarget.style.borderColor = 'var(--app-border)';
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{org.name}</div>
                  {org.description && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {org.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsOrgSelectionModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ProjectEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProject}
        onSave={handleSaveProject}
      />
    </AppShell>
  );
};

export default ProjectsPage;

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PageHeader,
  PageContent,
  Button,
  Input,
  Badge,
  Card,
  Table,
  Alert,
} from '@django-core/design-system';
import { useQueryParams } from '../../hooks/useQueryParams';
import { Project, ListResponse } from '../../types';

/**
 * T008 - Projects List Page
 *
 * Purpose: Display org-scoped projects with pagination and filters
 * - Uses X-Organisation-ID header from context
 * - Supports sort/filter via query params (shareable URLs)
 * - Shows project metadata and member counts
 */
export const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Query params for sort and filter
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  // Fetch current org context
  useEffect(() => {
    const fetchOrgContext = async () => {
      try {
        const response = await fetch('/api/context/', {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setOrgId(data.organisation_id);
        }
      } catch (err) {
        console.error('Failed to fetch context:', err);
      }
    };

    fetchOrgContext();
  }, []);

  // Fetch projects
  useEffect(() => {
    if (!orgId) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('sort', sort);
        params.append('order', order);
        if (search) {
          params.append('search', search);
        }

        const response = await fetch(
          `/api/projects/?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': orgId,
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
  }, [sort, order, search, orgId]);

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

  return (
    <div>
      <PageHeader
        title="Projects"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Identity' },
          { label: 'Projects' },
        ]}
        action={
          <Button variant="primary" size="md">
            New Project
          </Button>
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
            No projects found. Create a new project to get started.
          </Alert>
        )}

        {/* Projects table */}
        {!loading && projects.length > 0 && (
          <Table
            columns={[
              {
                key: 'name',
                label: 'Project Name',
                sortable: true,
                sorted: sort === 'name' ? order : undefined,
                onSort: () => handleSort('name'),
              },
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
            ]}
            rows={projects.map((project) => ({
              id: project.id,
              name: (
                <a
                  href={`/projects/${project.id}`}
                  className="text-blue-600 hover:underline"
                  data-testid={`project-name-${project.id}`}
                >
                  {project.name}
                </a>
              ),
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = `/projects/${project.id}`}
                  data-testid={`project-detail-btn-${project.id}`}
                >
                  View
                </Button>
              ),
            }))}
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
    </div>
  );
};

export default ProjectsPage;

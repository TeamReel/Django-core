import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Badge,
  Card,
  Table,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Organisation,
  ListResponse,
} from '../../types';
import AppShell from '../../components/AppShell';
import { canPerformAction } from '../../utils/permissions';

/**
 * T006 - Organisations List Page
 *
 * Purpose: Show all organisations with counts and credit balances
 * - Supports sort/filter via query params (shareable URLs)
 * - Integrates with F03 context switcher
 * - Real API integration with B06 (organisations module)
 * - Permission-aware: viewer sees read-only view
 */
export const OrganisationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisations: myOrganisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Permission checks - can user create organisations?
  const isSuperAdmin = (user as any)?.role === 'superadmin';
  // Note: Organisation creation is typically a superadmin action
  // Individual org edit/delete uses per-org permissions

  // Query params for sort and filter
  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  // Fetch organisations from API
  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const params = new URLSearchParams();
        params.append('sort', sort);
        params.append('order', order);
        if (search) {
          params.append('search', search);
        }

        const response = await fetch(
          `/api/v1/organisations/?${params.toString()}`,
          {
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

        const data: ListResponse<Organisation> = await response.json();
        setOrganisations(data.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisations');
        console.error('Organisations fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisations();
  }, [sort, order, search, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this organisation?')) {
      return;
    }

    try {
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`/api/v1/organisations/${id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete organisation');
      }

      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete organisation');
    }
  };

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value;
    if (newSearch) {
      searchParams.set('search', newSearch);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  // Handle sort change
  const handleSort = (column: string) => {
    if (sort === column) {
      // Toggle order
      searchParams.set('order', order === 'asc' ? 'desc' : 'asc');
    } else {
      searchParams.set('sort', column);
      searchParams.set('order', 'asc');
    }
    setSearchParams(searchParams);
  };

  return (
    <AppShell>
      <div>
        <PageHeader
        title="Organisations"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Organisations', current: true },
        ]}
        actions={
          isSuperAdmin ? (
            <Button variant="primary" size="md" onClick={() => navigate('/organisations/create')}>
              Create Organisation
            </Button>
          ) : undefined
        }
      />

      <PageContent>
        {/* Search and filters */}
        <Card className="mb-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Search organisations..."
              value={search}
              onChange={handleSearch}
              className="flex-1"
              data-testid="org-search-input"
            />
          </div>
        </Card>

        {/* Error state */}
        {error && (
          <Alert type="error" className="mb-4" data-testid="org-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && organisations.length === 0 && (
          <Alert type="info" data-testid="org-empty-state">
            No organisations found. Try adjusting your search or create a new organisation.
          </Alert>
        )}

        {/* Organisations table */}
        {!loading && organisations.length > 0 && (
          <Table
            columns={[
              {
                key: 'name',
                label: 'Name',
                sortable: true,
                sorted: sort === 'name' ? order : undefined,
                onSort: () => handleSort('name'),
              },
              {
                key: 'member_count',
                label: 'Members',
                sortable: true,
                sorted: sort === 'member_count' ? order : undefined,
                onSort: () => handleSort('member_count'),
              },
              {
                key: 'project_count',
                label: 'Projects',
                sortable: true,
                sorted: sort === 'project_count' ? order : undefined,
                onSort: () => handleSort('project_count'),
              },
              {
                key: 'credit_balance',
                label: 'Credits',
                sortable: true,
                sorted: sort === 'credit_balance' ? order : undefined,
                onSort: () => handleSort('credit_balance'),
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
            rows={organisations.map((org) => {
              // Check if user can edit/delete this specific org
              const orgWithRole = myOrganisations.find(o => o.id === org.id);
              const permissionContext = {
                currentOrganisation: orgWithRole,
                isSuperAdmin,
              };
              const userCanEdit = canPerformAction('update', 'organisation', permissionContext);
              const userCanDelete = canPerformAction('delete', 'organisation', permissionContext);

              return {
              id: org.id,
              name: (
                <span
                  style={{
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={() => navigate(`/organisations/${org.slug || org.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#1d4ed8'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#2563eb'}
                >
                  {org.name}
                </span>
              ),
              member_count: (
                <Badge variant="secondary" data-testid={`org-members-${org.id}`}>
                  {org.member_count || 0}
                </Badge>
              ),
              project_count: (
                <Badge variant="secondary" data-testid={`org-projects-${org.id}`}>
                  {org.project_count || 0}
                </Badge>
              ),
              credit_balance: (
                <span
                  className={
                    (org.credit_balance || 0) < 100 ? 'text-red-600 font-semibold' : ''
                  }
                  data-testid={`org-credits-${org.id}`}
                >
                  {org.credit_balance || 0}
                </span>
              ),
              status: (
                <Badge
                  variant={org.is_active ? 'success' : 'warning'}
                  data-testid={`org-status-${org.id}`}
                >
                  {org.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
              actions: (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate(`/organisations/${org.slug || org.id}`)}
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
                  {userCanEdit && (
                    <button
                      onClick={() => navigate(`/organisations/${org.slug || org.id}/edit`)}
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
                  {userCanDelete && (
                    <button
                      onClick={() => handleDelete(org.id)}
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
            data-testid="org-table"
          />
        )}

        {/* Loading state */}
        {loading && (
          <Card>
            <div className="text-center py-8 text-gray-500">
              Loading organisations...
            </div>
          </Card>
        )}
      </PageContent>
      </div>
    </AppShell>
  );
};

export default OrganisationsPage;

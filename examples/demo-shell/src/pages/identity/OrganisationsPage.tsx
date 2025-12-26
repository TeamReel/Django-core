import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
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
import OrganisationDetailModal from './OrganisationDetailModal';
import OrganisationEditModal from './OrganisationEditModal';

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

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to 'active'

  // Modal state
  const [detailOrganisation, setDetailOrganisation] = useState<Organisation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editOrganisation, setEditOrganisation] = useState<Organisation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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

            {isSuperAdmin && (
              <Button variant="primary" size="md" onClick={() => navigate('/organisations/create')}>
                Create Organisation
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
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
        {!loading && organisations.length > 0 && (() => {
          // Apply client-side status filter
          let filteredOrganisations = organisations;

          if (statusFilter === 'active') {
            filteredOrganisations = filteredOrganisations.filter(org => org.is_active !== false);
          } else if (statusFilter === 'inactive') {
            filteredOrganisations = filteredOrganisations.filter(org => org.is_active === false);
          }
          // 'all' shows everything

          // Show empty state if filters result in no data
          if (filteredOrganisations.length === 0) {
            return (
              <Alert type="info" data-testid="org-filtered-empty">
                No organisations match the current filters.
              </Alert>
            );
          }

          return (
          <div style={{ overflowX: 'auto' }}>
          <Table
            style={{ minWidth: '1000px' }}
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
            rows={filteredOrganisations.map((org) => {
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
                    onClick={() => {
                      setDetailOrganisation(org);
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
                  {userCanEdit && (
                    <button
                      onClick={() => {
                        setEditOrganisation(org);
                        setIsEditModalOpen(true);
                      }}
                      style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #0056b3',
                          backgroundColor: 'var(--app-surface)',
                          color: '#007bff',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {userCanDelete && (
                    <button
                      onClick={() => handleDelete(org.id)}
                      style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #bd2130',
                          backgroundColor: 'var(--app-surface)',
                          color: '#dc3545',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 500
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
          </div>
        );
        })()}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-gray-500">
            Loading organisations...
          </div>
        )}
      </PageContent>

      {/* Modals */}
      <OrganisationDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        organisation={detailOrganisation}
      />

      <OrganisationEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        organisation={editOrganisation}
        onSave={async (orgData) => {
          if (!editOrganisation) return;

          const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];

          const response = await fetch(`/api/v1/organisations/${editOrganisation.slug}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
            body: JSON.stringify(orgData),
          });

          if (!response.ok) {
            throw new Error('Failed to update organisation');
          }

          setRefreshKey(prev => prev + 1);
        }}
      />
      </div>
    </AppShell>
  );
};

export default OrganisationsPage;

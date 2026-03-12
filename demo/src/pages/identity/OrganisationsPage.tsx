import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Badge,
  Alert,
  Card,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import {
  Organisation,
  ListResponse,
} from '../../types';

import { canPerformAction } from '../../utils/permissions';
import styles from './OrganisationsPage.module.css';
import OrganisationDetailModal from './OrganisationDetailModal';
import OrganisationEditModal from './OrganisationEditModal';
import OrganisationCreateModal from './OrganisationCreateModal';
import { api } from '@/api';
import { routes } from '../../routes';
import { logger } from '@/utils/logger';

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
  const confirm = useConfirm();
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Permission checks - can user create organisations?
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
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

        const { results } = await api.list<Organisation>('/organisations/', {
          params: Object.fromEntries(params),
        });
        setOrganisations(results);
      } catch (err) {
        logger.error('Organisations fetch error', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch organisations');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisations();
  }, [sort, order, search, refreshKey]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Organisation',
      message: 'Are you sure you want to delete this organisation?',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      await api.delete(`/organisations/${id}/`);

      setRefreshKey(k => k + 1);
    } catch (err) {
      logger.error('Delete organisation error', err);
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
      <div>
        <PageHeader
        title="Federations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Federations', current: true },
        ]}
        actions={
          <div className={`flex-row flex-wrap ${styles.headerActions}`}>
            <label className="fs-14 fw-500">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`p-8 rounded-4 ${styles.statusSelect}`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>

            {isSuperAdmin && (
              <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
                Create Organisation
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
        {/* Error state */}
        {error && (
          <Alert variant="error" className="mb-4" data-testid="org-error-alert">
            {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && organisations.length === 0 && (
          <Alert variant="info" data-testid="org-empty-state">
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
              <Alert variant="info" data-testid="org-filtered-empty">
                No organisations match the current filters.
              </Alert>
            );
          }

          return (
          <Card>
            <div className="overflow-x-auto">
              <Table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className={`cursor-pointer ${styles.colWide}`}>
                  Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('member_count')} className={`cursor-pointer ${styles.colNarrow}`}>
                  Members {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('project_count')} className={`cursor-pointer ${styles.colNarrow}`}>
                  Projects {sort === 'project_count' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('credit_balance')} className={`cursor-pointer ${styles.colNarrow}`}>
                  Credits {sort === 'credit_balance' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th className={styles.colNarrow}>Status</th>
                <th className={styles.colWide}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganisations.map((org) => {
                // Check if user can edit/delete this specific org
                const orgWithRole = myOrganisations.find(o => o.id === org.id);
                const permissionContext = {
                  currentOrganisation: (orgWithRole || org) as Organisation,
                  isSuperAdmin,
                };
                const userCanEdit = canPerformAction('update', 'organisation', permissionContext);
                const userCanDelete = canPerformAction('delete', 'organisation', permissionContext);

                return (
                  <tr key={org.id}>
                    <td>
                      <span
                        className={`cursor-pointer ${styles.orgNameLink}`}
                        onClick={() => navigate(routes.orgDetailLegacy({ orgId: org.slug || org.id }))}
                      >
                        {org.name}
                      </span>
                    </td>
                    <td>
                      <Badge variant="default" data-testid={`org-members-${org.id}`}>
                        {org.member_count || 0}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant="default" data-testid={`org-projects-${org.id}`}>
                        {org.project_count || 0}
                      </Badge>
                    </td>
                    <td>
                      <span
                        className={`${styles.creditBalance} ${
                          (org.credit_balance || 0) < 100 ? 'text-red-600 font-semibold' : ''
                        }`}
                        data-testid={`org-credits-${org.id}`}
                      >
                        {org.credit_balance || 0}
                      </span>
                    </td>
                    <td>
                      <Badge
                        variant={org.is_active ? 'success' : 'warning'}
                        data-testid={`org-status-${org.id}`}
                      >
                        {org.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex-row gap-8">
                        <button
                          onClick={() => {
                            setDetailOrganisation(org);
                            setIsDetailModalOpen(true);
                          }}
                          className={`rounded-4 cursor-pointer fs-12 fw-500 ${styles.viewBtn}`}
                        >
                          View
                        </button>
                        {userCanEdit && (
                          <button
                            onClick={() => {
                              setEditOrganisation(org);
                              setIsEditModalOpen(true);
                            }}
                            className={`rounded-4 cursor-pointer fs-12 fw-500 ${styles.editBtn}`}
                          >
                            Edit
                          </button>
                        )}
                        {userCanDelete && (
                          <button
                            onClick={() => handleDelete(org.slug || org.id)}
                            className={`rounded-4 cursor-pointer fs-12 fw-500 ${styles.deleteBtn}`}
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

          await api.patch(`/organisations/${editOrganisation.slug}/`, orgData);

          setRefreshKey(prev => prev + 1);
        }}
      />

      <OrganisationCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (orgData) => {
          await api.post('/organisations/', orgData);

          setRefreshKey((k) => k + 1);
        }}
      />
      </div>
  );
};

export default OrganisationsPage;

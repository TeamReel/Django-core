import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Badge,
  Alert,
  Card,
} from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Adjust imports to point to parent directory
import { canPerformAction } from '@/utils/permissions';
import OrganisationDetailModal from '../OrganisationDetailModal';
import OrganisationEditModal from '../OrganisationEditModal';
import OrganisationCreateModal from '../OrganisationCreateModal';
import { api } from '@/api';
import { routes } from '@/routes';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/errorHelpers';
import { useSports } from '@/hooks/useSports';
import { useCrudModals } from '@/hooks/useModalState';
import type { Organisation } from '@/types';
import styles from './FederationsList.module.css';

export const FederationsList: React.FC = () => {
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { organisations: myOrganisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { categories } = useSports();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sportFilter, setSportFilter] = useState<string>('all');

  // Modal state
  const modals = useCrudModals<Organisation>();

  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

  const sort = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    const fetchOrganisations = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append('sort', sort);
        params.append('order', order);
        params.append('page_size', '500');
        if (search) {
          params.append('search', search);
        }

        const { results } = await api.list<Organisation>('/organisations/', {
          params: Object.fromEntries(params),
        });
        setOrganisations(results);
      } catch (err) {
        logger.error('Failed to fetch organisations', err);
        setError(getErrorMessage(err));
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
      logger.error('Delete error', err);
      pushToast({ message: 'Failed to delete organisation', type: 'error' });
    }
  };

  const handleSort = (column: string) => {
    if (sort === column) {
      setSearchParams(prev => {
        prev.set('order', order === 'asc' ? 'desc' : 'asc');
        return prev;
      });
    } else {
       setSearchParams(prev => {
        prev.set('sort', column);
        prev.set('order', 'asc');
        return prev;
      });
    }
  };

  return (
    <div>
      <div className="flex-row gap-12 mb-16 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-8 px-12 border rounded-4 fs-14 bg-surface"
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="py-8 px-12 border rounded-4 fs-14 bg-surface"
        >
          <option value="all">Sport: All</option>
          {categories.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.sport_icon} {sport.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="md"
          onClick={() => { setStatusFilter('all'); setSportFilter('all'); }}
          className="ml-auto"
        >
          Clear
        </Button>
        {isSuperAdmin && (
          <Button variant="primary" size="md" onClick={() => modals.create.open()}>
            Create Organisation
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!loading && organisations.length === 0 && (
        <Alert variant="info">
          No organisations found. Try adjusting your search or create a new organisation.
        </Alert>
      )}

      {!loading && organisations.length > 0 && (() => {
        let filteredOrganisations = organisations;
        if (statusFilter === 'active') {
          filteredOrganisations = filteredOrganisations.filter(org => org.is_active !== false);
        } else if (statusFilter === 'inactive') {
          filteredOrganisations = filteredOrganisations.filter(org => org.is_active === false);
        }
        if (sportFilter !== 'all') {
          filteredOrganisations = filteredOrganisations.filter(org => org.sport?.id === sportFilter);
        }

        if (filteredOrganisations.length === 0) {
          return (
            <Alert variant="info">
              No organisations match the current filters.
            </Alert>
          );
        }

        return (
          <Card>
            <div className="overflow-x-auto">
              <Table className="dir-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className={`dir-th cursor-pointer ${styles.thFederation}`}>
                      Federation {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className={`dir-th ${styles.thSport}`}>Sport</th>
                    <th className={`dir-th ${styles.thVariant}`}>Variant</th>
                    <th onClick={() => handleSort('project_count')} className={`dir-th cursor-pointer ${styles.thClub}`}>
                      Club {sort === 'project_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className={`dir-th ${styles.thSeason}`}>Season</th>
                    <th className={`dir-th ${styles.thCompetition}`}>Competition</th>
                    <th className={`dir-th ${styles.thMatch}`}>Match</th>
                    <th onClick={() => handleSort('member_count')} className={`dir-th cursor-pointer ${styles.thUsers}`}>
                      Users {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className={`dir-th ${styles.thStatus}`}>Status</th>
                    <th className={`dir-th ${styles.thActions}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganisations.map((org) => {
                    const orgWithRole = myOrganisations.find(o => o.id === org.id);
                    const permissionContext = {
                      currentOrganisation: orgWithRole || org,
                      isSuperAdmin,
                    };
                    const userCanEdit = canPerformAction('update', 'organisation', permissionContext);
                    const userCanDelete = canPerformAction('delete', 'organisation', permissionContext);

                    return (
                      <tr key={org.id}>
                        <td className="dir-td-text">
                          <span
                            className={`cursor-pointer ${styles.orgLink}`}
                            onClick={() => navigate(routes.orgDetailLegacy({ orgId: org.slug || org.id }))}
                          >
                            {org.name}
                          </span>
                        </td>
                        <td className="dir-td">
                          {org.sport ? (
                            <span className="flex-row gap-4">
                              <span>{org.sport.sport_icon}</span>
                              <span className="fs-12">{org.sport.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">{org.sport_variants_count || 0}</Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">
                            {org.project_count || 0}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">
                            {org.seasons_count || 0}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">
                            {org.competitions_count || 0}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">
                            {org.matches_count || 0}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant="default">
                            {org.member_count || 0}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <Badge variant={org.is_active ? 'success' : 'warning'}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="dir-td">
                          <div className="dir-actions">
                            <button
                              onClick={() => modals.detail.open(org)}
                              className="action-btn action-btn-primary"
                            >
                              View
                            </button>
                            {userCanEdit && (
                              <button
                                onClick={() => modals.edit.open(org)}
                                className="action-btn action-btn-warning"
                              >
                                Edit
                              </button>
                            )}
                            {userCanDelete && (
                              <button
                                onClick={() => handleDelete(org.slug || org.id)}
                                className="action-btn action-btn-danger"
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

      <OrganisationDetailModal
        opened={modals.detail.isOpen}
        onClose={modals.detail.close}
        organisation={modals.detail.item}
      />

      <OrganisationEditModal
        opened={modals.edit.isOpen}
        onClose={modals.edit.close}
        organisation={modals.edit.item}
        onSave={async (orgData) => {
          if (!modals.edit.item) return;
          await api.patch(`/organisations/${modals.edit.item.slug}/`, orgData);
          setRefreshKey(prev => prev + 1);
        }}
      />

      <OrganisationCreateModal
        opened={modals.create.isOpen}
        onClose={modals.create.close}
        onCreate={async (orgData) => {
          await api.post('/organisations/', orgData);

          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};

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
// Adjust imports to point to parent directory
import { canPerformAction } from '../../../utils/permissions';
import OrganisationDetailModal from '../OrganisationDetailModal';
import OrganisationEditModal from '../OrganisationEditModal';

interface Organisation {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean;
  credit_balance?: number;
  member_count?: number;
  project_count?: number;
}

export const FederationsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisations: myOrganisations } = useContextSwitcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Modal state
  const [detailOrganisation, setDetailOrganisation] = useState<Organisation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editOrganisation, setEditOrganisation] = useState<Organisation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

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
        if (search) {
          params.append('search', search);
        }

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(
          `${baseUrl}/api/v1/organisations/?${params.toString()}`,
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

        const data: any = await response.json();
        const results = data.data?.results || data.results || [];
        setOrganisations(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisations');
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
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/v1/organisations/${id}/`, {
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
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', justifyContent: 'flex-end' }}>
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
          <Button variant="primary" size="md" onClick={() => navigate('/federations/create')}>
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
              <Table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', minWidth: '150px' }}>
                      Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('member_count')} style={{ cursor: 'pointer', minWidth: '100px' }}>
                      Members {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('project_count')} style={{ cursor: 'pointer', minWidth: '100px' }}>
                      Projects {sort === 'project_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('credit_balance')} style={{ cursor: 'pointer', minWidth: '100px' }}>
                      Credits {sort === 'credit_balance' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ minWidth: '100px' }}>Status</th>
                    <th style={{ minWidth: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganisations.map((org) => {
                    const orgWithRole = myOrganisations.find(o => o.id === org.id);
                    const permissionContext = {
                      currentOrganisation: (orgWithRole || org) as any,
                      isSuperAdmin,
                    };
                    const userCanEdit = canPerformAction('update', 'organisation', permissionContext);
                    const userCanDelete = canPerformAction('delete', 'organisation', permissionContext);

                    return (
                      <tr key={org.id}>
                        <td>
                          <span
                            style={{
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              fontSize: '0.85rem'
                            }}
                            onClick={() => navigate(`/federations/${org.slug || org.id}`)}
                          >
                            {org.name}
                          </span>
                        </td>
                        <td>
                          <Badge variant="default">
                            {org.member_count || 0}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant="default">
                            {org.project_count || 0}
                          </Badge>
                        </td>
                        <td>
                          <span
                            className={
                              (org.credit_balance || 0) < 100 ? 'text-red-600 font-semibold' : ''
                            }
                            style={{ fontSize: '0.85rem' }}
                          >
                            {org.credit_balance || 0}
                          </span>
                        </td>
                        <td>
                          <Badge variant={org.is_active ? 'success' : 'warning'}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setDetailOrganisation(org);
                                setIsDetailModalOpen(true);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #6c757d',
                                backgroundColor: 'var(--app-surface)',
                                color: '#6c757d',
                                cursor: 'pointer',
                                fontSize: '12px'
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
                            {userCanDelete && (
                              <button
                                onClick={() => handleDelete(org.slug || org.id)}
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
          const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
          const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const response = await fetch(`${baseUrl}/api/v1/organisations/${editOrganisation.slug}/`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
            body: JSON.stringify(orgData),
          });
          if (!response.ok) throw new Error('Failed to update organisation');
          setRefreshKey(prev => prev + 1);
        }}
      />
    </div>
  );
};

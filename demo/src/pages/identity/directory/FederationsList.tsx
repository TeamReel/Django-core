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
import OrganisationCreateModal from '../OrganisationCreateModal';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { useSports } from '../../../hooks/useSports';

// Table styling constants
const compactTableStyle: React.CSSProperties = {
  tableLayout: 'fixed',
  width: '100%',
  borderCollapse: 'collapse'
};
const compactThStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)'
};
const compactTdStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
  borderBottom: '1px solid #eee'
};
const compactTextTdStyle: React.CSSProperties = {
  ...compactTdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};
const compactActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  flexWrap: 'nowrap'
};

// Button styling function
type ActionTone = 'neutral' | 'primary' | 'warning' | 'danger';
const actionButtonStyle = (tone: ActionTone): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--app-surface)',
    cursor: 'pointer',
    fontSize: '12px',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };
  if (tone === 'primary') {
    return { ...base, border: '1px solid #007bff', color: '#007bff' };
  }
  if (tone === 'warning') {
    return { ...base, border: '1px solid #fd7e14', color: '#fd7e14' };
  }
  if (tone === 'danger') {
    return { ...base, border: '1px solid #dc3545', color: '#dc3545' };
  }
  return { ...base, border: '1px solid #6c757d', color: '#6c757d' };
};

interface Organisation {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean;
  credit_balance?: number;
  member_count?: number;
  project_count?: number;
  sport?: { id: string; name: string; slug: string; sport_icon: string } | null;
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
  const { categories } = useSports();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sportFilter, setSportFilter] = useState<string>('all');

  // Modal state
  const [detailOrganisation, setDetailOrganisation] = useState<Organisation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editOrganisation, setEditOrganisation] = useState<Organisation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        params.append('page_size', '500');
        if (search) {
          params.append('search', search);
        }

        const baseUrl = getApiBaseUrl();
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

      const baseUrl = getApiBaseUrl();
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
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
        >
          <option value="all">Status: All</option>
          <option value="active">Status: Active</option>
          <option value="inactive">Status: Inactive</option>
        </select>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--app-border)',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'var(--app-surface)',
          }}
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
          style={{ marginLeft: 'auto' }}
        >
          Clear
        </Button>
        {isSuperAdmin && (
          <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)}>
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
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} style={{ ...compactThStyle, cursor: 'pointer', width: '18%' }}>
                      Federation {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ ...compactThStyle, width: '10%' }}>Sport</th>
                    <th onClick={() => handleSort('project_count')} style={{ ...compactThStyle, cursor: 'pointer', width: '6%' }}>
                      Club {sort === 'project_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ ...compactThStyle, width: '6%' }}>Season</th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Competition</th>
                    <th style={{ ...compactThStyle, width: '6%' }}>Match</th>
                    <th onClick={() => handleSort('member_count')} style={{ ...compactThStyle, cursor: 'pointer', width: '6%' }}>
                      Users {sort === 'member_count' && (order === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ ...compactThStyle, width: '8%' }}>Status</th>
                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
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
                        <td style={compactTextTdStyle}>
                          <span
                            style={{
                              color: '#2563eb',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                            onClick={() => navigate(`/organisations/${org.slug || org.id}`)}
                          >
                            {org.name}
                          </span>
                        </td>
                        <td style={compactTdStyle}>
                          {org.sport ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{org.sport.sport_icon}</span>
                              <span style={{ fontSize: '12px' }}>{org.sport.name}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                          )}
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">
                            {org.project_count || 0}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">
                            {(org as any).seasons_count || 0}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">
                            {(org as any).competitions_count || 0}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">
                            {(org as any).matches_count || 0}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant="default">
                            {org.member_count || 0}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <Badge variant={org.is_active ? 'success' : 'warning'}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                              onClick={() => {
                                setDetailOrganisation(org);
                                setIsDetailModalOpen(true);
                              }}
                              style={actionButtonStyle('primary')}
                            >
                              View
                            </button>
                            {userCanEdit && (
                              <button
                                onClick={() => {
                                  setEditOrganisation(org);
                                  setIsEditModalOpen(true);
                                }}
                                style={actionButtonStyle('warning')}
                              >
                                Edit
                              </button>
                            )}
                            {userCanDelete && (
                              <button
                                onClick={() => handleDelete(org.slug || org.id)}
                                style={actionButtonStyle('danger')}
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
          const baseUrl = getApiBaseUrl();
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

      <OrganisationCreateModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (orgData) => {
          const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
          const baseUrl = getApiBaseUrl();
          const response = await fetch(`${baseUrl}/api/v1/organisations/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
            credentials: 'include',
            body: JSON.stringify(orgData),
          });

          if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(detail || 'Failed to create organisation');
          }

          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};

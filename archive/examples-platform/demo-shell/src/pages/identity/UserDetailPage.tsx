import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import {
  Button,
  Card,
  Alert,
  Badge,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import AppShell from '../../components/AppShell';
import UserEditModal from './UserEditModal';
import AssignUserToOrgModal from './AssignUserToOrgModal';
import LoadingState from '../../components/LoadingState';

export const UserDetailPage: React.FC = () => {
  const { userId, orgId } = useParams<{ userId: string; orgId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { organisations: contextOrganisations, context } = useContextSwitcher();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgUsers, setOrgUsers] = useState<any[]>([]); // For user switcher

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [organisations, setOrganisations] = useState<any[]>([]);

  // Get current org for context switcher
  const currentOrg = orgId ? contextOrganisations.find(o => o.slug === orgId || o.id === orgId) : null;

  // Breadcrumb context switcher setup
  const {
    userOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: contextOrganisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: orgUsers.map(u => ({
      id: u.id.toString(),
      username: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
      email: u.email,
      slug: u.id.toString(),
    })),
    context: {
      currentOrgId: currentOrg?.id ? String(currentOrg.id) : undefined,
      currentUserId: userId,
    },
    basePath: '',
  });

  // Custom handler for user navigation
  const handleUserSwitch = (option: BreadcrumbSwitcherOption) => {
    if (orgId) {
      navigate(`/organisations/${orgId}/users/${option.slug || option.id}`);
    } else {
      navigate(`/users/${option.slug || option.id}`);
    }
  };

  // Fetch users for the current organisation (for switcher dropdown)
  useEffect(() => {
    let isMounted = true;
    const fetchOrgUsers = async () => {
      if (!orgId) return;

      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const response = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${orgId}/members/`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );

        if (response.ok && isMounted) {
          const rawData = await response.json();
          // Handle B13 envelope and extract user data from members
          const data = rawData.data || rawData;
          const members = Array.isArray(data) ? data : (data.data || data.results || []);
          // Extract user objects from membership objects
          const users = members.map((m: any) => m.user).filter(Boolean);
          setOrgUsers(users);
        }
      } catch (err) {
        console.error('Failed to fetch org users for switcher:', err);
      }
    };

    fetchOrgUsers();
    return () => { isMounted = false; };
  }, [orgId]);

  // Guard: If we are in an org context (URL param) but context switcher hasn't loaded orgs yet, wait.
  // IMPORTANT: We must NOT return early here if it causes hooks (like useEffect below) to be skipped.
  // Instead, we'll render the loading state but keep the hooks execution order consistent.
  const isLoadingContext = orgId && context.isLoading;

  const fetchUser = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Always use admin endpoint for user details
      // (org-scoped user endpoints don't exist, only members endpoints with membership UUIDs)
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/`, {
          credentials: 'include',
      });

      if (!response.ok) {
        const status = response.status;
        let errorMsg = `Failed to fetch user details (${status})`;
        try {
            const errorData = await response.json();
            if (errorData.message) errorMsg = errorData.message;
            else if (errorData.detail) errorMsg = errorData.detail;
        } catch (e) {
            // Ignore JSON parse error
        }
        throw new Error(errorMsg);
      }

      const rawData = await response.json();
      // Handle B13 envelope: {data: {...}} or direct {...}
      const userData = rawData.data || rawData;
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganisations = async () => {
      try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/`, {
              credentials: 'include',
          });
          if (res.ok) {
              const rawData = await res.json();
              // Handle B13 envelope: {data: {results: [...]}} or direct {results: [...]}
              const data = rawData.data || rawData;
              const results = data.results || data.data?.results || [];
              setOrganisations(Array.isArray(results) ? results : []);
          }
      } catch (e) {
          console.error('Failed to fetch organisations', e);
      }
  };

  useEffect(() => {
    let isMounted = true;
    if (userId) {
      // Wrap fetch calls to respect isMounted
      const loadData = async () => {
          if (!isMounted) return;
          await fetchUser();
          if (!isMounted) return;
          await fetchOrganisations();
      };
      loadData();
    }
    return () => { isMounted = false; };
  }, [userId]);

  if (isLoadingContext) {
    return (
      <AppShell>
        <LoadingState message="Loading organisation context..." />
      </AppShell>
    );
  }

  const handleSaveUser = async (updatedUser: any) => {
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

          // Use userId from URL params instead of updatedUser.id (which may be undefined)
          const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken || '',
              },
              body: JSON.stringify(updatedUser),
              credentials: 'include',
          });

          if (res.ok) {
              fetchUser();
              setIsEditModalOpen(false);
          } else {
              const data = await res.json();
              alert(data.message || 'Failed to update user');
              throw new Error(data.message || 'Failed to update user');
          }
      } catch (e) {
          console.error(e);
          alert('Failed to save user changes');
          throw e;
      }
  };

  const handleRemoveFromOrg = async (orgSlug: string, membershipId: string) => {
      if (!window.confirm('Are you sure you want to remove this user from the organisation?')) return;

      try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
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

          const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${membershipId}/`, {
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken || '',
              },
              credentials: 'include',
          });

          if (res.ok) {
              fetchUser();
          } else {
              const data = await res.json();
              alert(data.detail || 'Failed to remove member');
          }
      } catch (e) {
          console.error(e);
          alert('Error removing member');
      }
  };

  if (loading) return <AppShell><div>Loading...</div></AppShell>;
  if (error) return <AppShell><Alert variant="error" title="Error">{error}</Alert></AppShell>;
  if (!user) return <AppShell><div>User not found</div></AppShell>;

  // Determine back path based on whether we're in org context
  const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
  const usersLabel = orgId ? 'Members' : 'Users';

  return (
    <AppShell>
      <PageHeader
        title="User Details"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          ...(orgId ? [{ label: 'Organisations', href: '/organisations' }] : []),
          ...(currentOrg ? [{ label: currentOrg.name, href: `/organisations/${orgId}` }] : []),
          { label: usersLabel, onClick: () => navigate(backPath) },
          ...(orgId && userOptions.length > 1 ? [{
            label: (
              <BreadcrumbContextSwitcher
                currentId={userId || ''}
                options={userOptions.map(u => ({
                  id: u.id,
                  label: u.label || u.id,
                  slug: u.slug
                }))}
                onSelect={handleUserSwitch}
                hasDropdown={true}
                type="user"
              />
            )
          }] : [{ label: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'User', current: true }]),
        ]}
        actions={
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate(backPath)}
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
                  Back to List
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #0056b3',
                    backgroundColor: 'var(--app-surface)',
                    color: 'var(--app-text)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setIsAssignModalOpen(true)}
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
                  Assign
                </button>
            </div>
        }
      />

      <PageContent>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Full Name</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{user.first_name} {user.last_name}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Email</label>
                <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>{user.email}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>System Role</label>
                <Badge variant={user.role === 'superadmin' ? 'primary' : 'default'}>
                  {user.role}
                </Badge>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--app-muted-text)', marginBottom: '4px' }}>Status</label>
                <Badge variant={user.is_active ? 'success' : 'error'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>


          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--app-text)' }}>Organisations</h3>
            {user.organisations && user.organisations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {user.organisations.map((org: any) => {
                        const myOrg = organisations.find(o => o.id === org.id);
                        const isSuperAdmin = (currentUser as any)?.role === 'superadmin';

                        // Check if I can manage this org (admin/owner) OR I am superadmin
                        // AND we have a membership ID to delete
                        const canRemove = org.membership_id && (
                            isSuperAdmin ||
                            (myOrg && (myOrg.user_role === 'admin' || myOrg.user_role === 'owner'))
                        );

                        return (
                        <div key={org.id} style={{
                            padding: '12px',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>{org.name}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{org.slug}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Badge variant="default">{org.role}</Badge>
                                {canRemove && (
                                    <button
                                        onClick={() => handleRemoveFromOrg(org.slug, org.membership_id)}
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
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ color: '#666', fontStyle: 'italic' }}>No organisation memberships</div>
            )}
          </div>
        </div>
      </Card>
      </PageContent>

      <UserEditModal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={handleSaveUser}
      />

      <AssignUserToOrgModal
        opened={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        user={user}
        organisations={organisations}
        onSuccess={() => {
            fetchUser();
            setIsAssignModalOpen(false);
        }}
      />
    </AppShell>
  );
};

export default UserDetailPage;

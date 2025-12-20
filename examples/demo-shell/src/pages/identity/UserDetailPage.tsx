import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import {
  Button,
  Card,
  Alert,
  Badge,
} from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import UserEditModal from './UserEditModal';
import AssignUserToOrgModal from './AssignUserToOrgModal';

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [organisations, setOrganisations] = useState<any[]>([]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

      const data = await response.json();
      setUser(data);
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
              const data = await res.json();
              setOrganisations(data.results || data);
          }
      } catch (e) {
          console.error('Failed to fetch organisations', e);
      }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchOrganisations();
    }
  }, [userId]);

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

          const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${updatedUser.id}/`, {
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

  return (
    <AppShell>
      <div style={{ marginBottom: '16px', fontSize: '14px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#0066cc' }}>Home</Link>
          <span style={{ margin: '0 8px', color: '#999' }}>/</span>
          <Link to="/users" style={{ textDecoration: 'none', color: '#0066cc' }}>Users</Link>
          <span style={{ margin: '0 8px', color: '#999' }}>/</span>
          <span style={{ color: '#333', fontWeight: 500 }}>{user.first_name} {user.last_name}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>User Details</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => navigate('/users')} variant="secondary">Back to List</Button>
            <Button onClick={() => setIsEditModalOpen(true)} variant="primary">Edit</Button>
            <Button onClick={() => setIsAssignModalOpen(true)} variant="secondary">Assign</Button>
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Profile Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Full Name</label>
                <div style={{ fontWeight: 500 }}>{user.first_name} {user.last_name}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</label>
                <div style={{ fontWeight: 500 }}>{user.email}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>System Role</label>
                <Badge variant={user.role === 'superadmin' ? 'primary' : 'neutral'}>
                  {user.role}
                </Badge>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Status</label>
                <Badge variant={user.is_active ? 'success' : 'error'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>


          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Organisations</h3>
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
                                <Badge variant="neutral">{org.role}</Badge>
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

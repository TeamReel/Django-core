import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Button, Card, Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { PageHeader, BreadcrumbContextSwitcher, useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import UserEditModal from './UserEditModal';
import UserDetailModal from './UserDetailModal';
import InviteMemberModal from './InviteMemberModal';
import CreateUserModal from './CreateUserModal';
import AssignUserToOrgModal from './AssignUserToOrgModal';
import LoadingState from '../../components/LoadingState';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  organisations?: { id: string; name: string; slug: string; role: string }[];
}

interface Organisation {
    id: string;
    name: string;
    slug: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const {
    organisationOptions,
    handleOrganisationSwitch,
  } = useBreadcrumbContextSwitcher({
    organisations: myOrganisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: orgId },
    basePath: ''
  });

  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to 'active'
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

  // URL Params
  const projectIdParam = searchParams.get('project_id');
  const orgIdParam = orgId || searchParams.get('organisation_id');

  // Edit Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail Modal
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Create User Modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Assign User Modal
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Check if user is superadmin based on the role returned by /auth/me/
  const isSuperAdmin = (user as any)?.role === 'superadmin';

  // Determine if current user has admin rights in the current context
  const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
  // Use organisations from context switcher which contains user_role from API
  const currentOrg = myOrganisations.find(o => o.slug?.toLowerCase() === currentOrgSlug);
  const isOrgAdmin = (currentOrg as any)?.user_role === 'admin';

  const canManageUsers = isSuperAdmin || isOrgAdmin;

  // Initialize filters on mount with proper defaults
  useEffect(() => {
      if (!hasInitializedFilters) {
          if (orgIdParam) {
              setSelectedOrgId(orgIdParam);
          } else if (context.organisation && !isSuperAdmin) {
              // Default to context organisation for non-superadmin users
              setSelectedOrgId(String(context.organisation.id));
          }
          setHasInitializedFilters(true);
      }
  }, [hasInitializedFilters, orgIdParam, context.organisation, isSuperAdmin]);

  // Fetch organisations for filter (SuperAdmin only)
  useEffect(() => {
      if (isSuperAdmin) {
          const fetchOrgs = async () => {
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
              try {
                  const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, {
                      credentials: 'include'
                  });
                  if (res.ok) {
                      const data = await res.json();
                      setOrganisations(data.results || []);
                  }
              } catch (e) {
                  console.error("Failed to fetch organisations for filter", e);
              }
          };
          fetchOrgs();
      }
  }, [isSuperAdmin]);

  // Guard: If we are in an org context (URL param) but context switcher hasn't loaded orgs yet, wait.
  if (orgIdParam && context.isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading organisation context..." />
      </AppShell>
    );
  }

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      let url = '';

      // Determine context from params or global context
      // If superadmin, ignore context.organisation unless explicitly selected via UI or URL
      const effectiveOrgSlug = (orgIdParam || (!isSuperAdmin ? context.organisation?.slug : null))?.toLowerCase();
      const effectiveProjectId = projectIdParam?.toLowerCase();

      if (effectiveProjectId) {
          // Project members
          // Use the admin endpoint with filters instead of the specific members endpoint
          // because the members endpoint might not be implemented or returns different structure
          url = `${apiBaseUrl}/api/v1/admin/users/?project_id=${effectiveProjectId}`;
          if (effectiveOrgSlug) {
              url += `&organisation_id=${effectiveOrgSlug}`;
          }
      } else if (isSuperAdmin) {
        url = `${apiBaseUrl}/api/v1/admin/users/?`;

        // Use effectiveOrgSlug if available (from URL), otherwise selectedOrgId (from dropdown)
        const filterOrg = effectiveOrgSlug || selectedOrgId;
        if (filterOrg) {
            url += `organisation_id=${filterOrg}&`;
        }

        // Status filter
        if (statusFilter === 'active') {
            url += `is_active=true&`;
        } else if (statusFilter === 'inactive') {
            url += `is_active=false&`;
        }
      } else if (effectiveOrgSlug) {
        // For regular admins, use the admin endpoint but scoped to their org
        // The backend admin_user_list endpoint supports filtering by organisation_id
        // and checks permissions (IsAdmin) which Org Admins have.
        url = `${apiBaseUrl}/api/v1/admin/users/?organisation_id=${effectiveOrgSlug}`;

        // If we are NOT in a specific org route (i.e. /users vs /organisations/:slug/users),
        // and we are an Org Admin, we might want to see unassigned users too (e.g. to invite them).
        // The user requested: "Only when I click Users from the left navbar, I want to see all users."
        // This implies that when orgIdParam is missing (Global context), we should include unassigned.
        if (!orgIdParam) {
            url += '&include_unassigned=true';
        }
      } else {
        // No org selected and not superadmin -> Global View
        // Call admin endpoint without organisation_id (backend now handles filtering)
        url = `${apiBaseUrl}/api/v1/admin/users/?`;

        // Apply Org Filter if selected
        if (selectedOrgId) {
            url += `organisation_id=${selectedOrgId}&`;
        }

        // Status filter
        if (statusFilter === 'active') {
            url += `is_active=true&`;
        } else if (statusFilter === 'inactive') {
            url += `is_active=false&`;
        }
      }

      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!res.ok) {
          if (res.status === 403) {
              throw new Error('Permission denied. You do not have access to view users.');
          }
          throw new Error(`Failed to fetch users (${res.status})`);
      }

      const data = await res.json();
      // Handle B13 envelope or direct DRF response
      const results = data.data?.results || data.results || [];
      setUsers(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
        fetchUsers();
    }
  }, [user, context.organisation, isSuperAdmin, selectedOrgId, projectIdParam, orgIdParam, statusFilter]);

  const handleEditClick = (user: any) => {
      // Normalize user object if it's a membership
      const userData = user.user || user;
      setEditingUser(userData);
      setIsModalOpen(true);
  };

  const handleSaveUser = async (updatedData: Partial<User>) => {
      if (!editingUser) return;

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      try {
          const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${editingUser.id}/`, {
              method: 'PATCH',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCookie('csrftoken') || '',
              },
              body: JSON.stringify(updatedData),
              credentials: 'include',
          });

          if (!res.ok) {
              throw new Error('Failed to update user');
          }

          // Refresh list
          fetchUsers();
      } catch (e) {
          console.error(e);
          alert('Failed to save user changes');
          throw e;
      }
  };

  function getCookie(name: string) {
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
  }

  // Construct breadcrumbs
  const breadcrumbs: any[] = [
    { label: 'Home', href: '/' },
  ];

  if (orgIdParam) {
    breadcrumbs.push({ label: 'Organisations', onClick: () => navigate('/organisations') });
    breadcrumbs.push({ label: (myOrganisations.find(o => o.slug === orgIdParam || o.id === orgIdParam) || context.organisation)?.name || 'Organisation', onClick: () => navigate(`/organisations/${orgIdParam}`) });
    breadcrumbs.push({ label: 'Users', current: true });
  } else {
    breadcrumbs.push({ label: 'Users', current: true });
  }

  return (
    <AppShell>
      <PageHeader
        title={
            isSuperAdmin
                ? 'All Users (System Admin)'
                : orgIdParam
                    ? `Users - ${(myOrganisations.find(o => o.slug === orgIdParam || o.id === orgIdParam) || context.organisation)?.name || 'Organisation'}`
                    : 'All Users'
        }
        subtitle={
            isSuperAdmin
                ? 'Manage all users in the system.'
                : orgIdParam
                    ? 'View members of the current organisation.'
                    : 'View all users associated with your organisations and unassigned users.'
        }
        breadcrumbs={breadcrumbs}
        actions={
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {orgIdParam && (
                    <Button variant="secondary" onClick={() => navigate(`/organisations/${orgIdParam}`)}>
                        Back to Organisation
                    </Button>
                )}

                {/* Filters for everyone (SuperAdmin OR Regular Users in Global View) */}
                {(!orgIdParam || isSuperAdmin) && (
                    <>
                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Filter by Org:</label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">All Organisations</option>
                        {(isSuperAdmin ? organisations : myOrganisations).map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                    </>
                )}

                {isSuperAdmin && (
                    <Button onClick={() => setIsCreateUserModalOpen(true)}>
                        Create User
                    </Button>
                )}

                {/* Add Member Button - Only show if we have a specific organisation context AND permission */}
                {(orgIdParam || context.organisation) && !isSuperAdmin && canManageUsers && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={() => setIsCreateUserModalOpen(true)}>
                            Create User
                        </Button>
                        <Button onClick={() => setIsInviteModalOpen(true)}>
                            Add Member
                        </Button>
                    </div>
                )}
            </div>
        }
      />

      {error && (
        <div style={{ padding: '12px', backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#dc3545', border: '1px solid rgba(220, 53, 69, 0.3)', borderRadius: '4px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div>Loading users...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>User</th>
                <th style={{ minWidth: '200px' }}>Email</th>
                <th style={{ minWidth: '100px' }}>Role</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th style={{ minWidth: '150px' }}>Organisations</th>
                <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--app-muted-text)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((item: any) => {
                  const isMembership = !!item.user;
                  const user = isMembership ? item.user : item;
                  const userOrgs = user.organisations || [];

                  // Determine display role based on context
                  const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
                  const contextOrg = currentOrgSlug ? userOrgs.find((o: any) => o.slug.toLowerCase() === currentOrgSlug) : null;

                  let displayRole = isMembership ? item.role : item.role; // Default to system role
                  let isOrgRole = false;

                  if (contextOrg) {
                      displayRole = contextOrg.role;
                      isOrgRole = true;
                  }

                  const isActive = isMembership ? item.is_active : user.is_active;

                  return (
                    <tr key={item.id || user.id}>
                      <td>
                        <div
                            style={{ fontWeight: 500, color: '#0066cc', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}
                            onClick={() => {
                                if (orgIdParam || context.organisation) {
                                    // Navigate to user detail within org context
                                    navigate(`/organisations/${orgIdParam || context.organisation?.slug}/users/${user.id}`);
                                } else {
                                    navigate(`/users/${user.id}`);
                                }
                            }}
                        >
                            {user.first_name} {user.last_name}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <Badge variant="default">
                          {displayRole}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={isActive ? 'success' : 'error'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {userOrgs.length > 0 ? userOrgs.map((org: any) => (
                                  <span key={org.id} style={{
                                      padding: '2px 6px',
                                      border: '1px solid var(--app-border)',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--app-surface-2)',
                                      color: 'var(--app-text)'
                                  }}>
                                      {org.name} ({org.role})
                                  </span>
                              )) : <span style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>-</span>}
                          </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            {/* View Button - Show for both Memberships and Unassigned Users */}
                            {((isMembership && (orgIdParam || context.organisation)) || (!isMembership)) && (
                                <button
                                    onClick={() => {
                                        setDetailUser(user);
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
                            )}
                            {canManageUsers && (
                            <button
                                onClick={() => {
                                    if (isMembership && (orgIdParam || context.organisation)) {
                                        navigate(`/organisations/${orgIdParam || context.organisation?.slug}/members/${item.id}?action=edit`);
                                    } else {
                                        handleEditClick(item);
                                    }
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

                            {/* Delete Button - Always show with permission check */}
                            {canManageUsers && (
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) return;
                                    try {
                                        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                        const csrfToken = getCookie('csrftoken');

                                        const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${user.id}/`, {
                                            method: 'DELETE',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': csrfToken || '',
                                            },
                                            credentials: 'include',
                                        });

                                        if (res.ok) {
                                            fetchUsers();
                                        } else {
                                            const data = await res.json();
                                            alert(data.message || 'Failed to delete user');
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert('Error deleting user');
                                    }
                                }}
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

                            {/* Assign / Unassign Logic */}
                            {(() => {
                                if (!canManageUsers) return null;

                                const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
                                const isMemberOfCurrentOrg = userOrgs.some((o: any) => o.slug.toLowerCase() === currentOrgSlug);
                                const membershipId = isMemberOfCurrentOrg ? userOrgs.find((o: any) => o.slug.toLowerCase() === currentOrgSlug)?.membership_id : null;

                                if (currentOrgSlug && isMemberOfCurrentOrg && membershipId) {
                                    // Show Unassign
                                    return (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm(`Remove ${user.email} from organisation?`)) return;
                                                try {
                                                    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                                    const csrfToken = getCookie('csrftoken');

                                                    const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/${membershipId}/`, {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'X-CSRFToken': csrfToken || '',
                                                        },
                                                        credentials: 'include',
                                                    });

                                                    if (res.ok) {
                                                        fetchUsers();
                                                    } else {
                                                        alert('Failed to remove member');
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    alert('Error removing member');
                                                }
                                            }}
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
                                            Unassign
                                        </button>
                                    );
                                } else if (currentOrgSlug && !isMemberOfCurrentOrg) {
                                    // Show Assign
                                    return (
                                        <button
                                            onClick={() => {
                                                setAssignUser(user);
                                                setIsAssignModalOpen(true);
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                border: '1px solid #1e7e34',
                                                backgroundColor: 'var(--app-surface)',
                                                color: '#28a745',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500
                                            }}
                                        >
                                            Assign
                                        </button>
                                    );
                                } else if (isSuperAdmin && !isMembership) {
                                    // SuperAdmin fallback - show Assign button
                                    return (
                                        <button
                                            onClick={() => {
                                                setAssignUser(user);
                                                setIsAssignModalOpen(true);
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                border: '1px solid #1e7e34',
                                                backgroundColor: 'var(--app-surface)',
                                                color: '#28a745',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500
                                            }}
                                        >
                                            Assign
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
          </div>
        </Card>
      )}

      <UserEditModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={editingUser}
        onSave={handleSaveUser}
      />

      <InviteMemberModal
        opened={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        orgSlug={orgIdParam || context.organisation?.slug || ''}
        onInviteSuccess={fetchUsers}
      />

      <CreateUserModal
        opened={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={() => {
            fetchUsers();
            setIsCreateUserModalOpen(false);
        }}
      />

      <AssignUserToOrgModal
        opened={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        user={assignUser}
        organisations={isSuperAdmin ? organisations : myOrganisations}
        onSuccess={() => {
            fetchUsers();
            setIsAssignModalOpen(false);
        }}
      />

      <UserDetailModal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={detailUser}
      />
    </AppShell>
  );
}

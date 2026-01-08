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

  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const page = searchParams.get('page') || '1';
  const limit = 50;

  // Filters
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [clubs, setClubs] = useState<any[]>([]); // All clubs
  const [teams, setTeams] = useState<any[]>([]); // All teams
  const [availableRoles, setAvailableRoles] = useState<string[]>([]); // All roles from RBAC
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to 'active'
  const [roleFilter, setRoleFilter] = useState<string>(''); // Client-side role filter
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
  const isSuperAdmin = (user as any)?.role === 'Superadmin';

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
                  console.log('[UsersPage] Fetching organisations from:', `${apiBaseUrl}/api/v1/organisations/?page_size=100`);
                  const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, {
                      credentials: 'include'
                  });
                  if (res.ok) {
                      const data = await res.json();
                      console.log('[UsersPage] Organisations API response:', data);
                      // Handle B13 envelope: {status, data: {results}, meta}
                      const orgs = data.data?.results || data.results || [];
                      console.log('[UsersPage] Parsed organisations:', orgs.length, orgs);
                      setOrganisations(orgs);
                  }
              } catch (e) {
                  console.error("Failed to fetch organisations for filter", e);
              }
          };
          fetchOrgs();
      }
  }, [isSuperAdmin]);

  // Helper to fetch all filter options (clubs/teams) - fetches all pages
  const fetchAllFilterOptions = async (initialUrl: string): Promise<any[]> => {
      const allResults: any[] = [];
      let url: string | null = initialUrl;
      let pageCount = 0;

      while (url) {
          pageCount++;
          const res: Response = await fetch(url, { credentials: 'include' });
          if (!res.ok) break;

          const data: any = await res.json();
          const results = data.data?.results || data.results || [];
          const next: string | null = data.data?.next || data.next || null;
          allResults.push(...results);
          url = next;
      }
      return allResults;
  };

  // Fetch ALL clubs (parent_project=null only) for filter dropdown
  useEffect(() => {
      const fetchClubs = async () => {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          try {
              // Fetch ONLY parent projects (clubs) - backend filter for efficiency
              const initialUrl = `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`;
              console.log('[UsersPage] Fetching clubs (parent_project=null)...');

              const parentProjects = await fetchAllFilterOptions(initialUrl);
              console.log('[UsersPage] Total clubs loaded:', parentProjects.length);
              setClubs(parentProjects);
          } catch (e) {
              console.error("Failed to fetch clubs for filter", e);
          }
      };
      fetchClubs();
  }, []);

  // Fetch ALL teams (parent_project!=null only) for filter dropdown
  useEffect(() => {
      const fetchTeams = async () => {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          try {
              // Fetch ONLY child projects (teams) - backend filter for efficiency
              const initialUrl = `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`;
              console.log('[UsersPage] Fetching teams (parent_project!=null)...');

              const childProjects = await fetchAllFilterOptions(initialUrl);
              console.log('[UsersPage] Total teams loaded:', childProjects.length);
              setTeams(childProjects);
          } catch (e) {
              console.error("Failed to fetch teams for filter", e);
          }
      };
      fetchTeams();
  }, []);

  // Fetch ALL available roles from RBAC system for filter dropdown
  useEffect(() => {
      const fetchRoles = async () => {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          try {
              const response = await fetch(`${apiBaseUrl}/api/v1/permissions/roles/`, {
                  credentials: 'include',
              });

              if (!response.ok) {
                  console.error('[UsersPage] Failed to fetch roles:', response.status);
                  // Fallback to hardcoded roles if API fails (403 Forbidden, etc.)
                  const fallbackRoles = ['Superadmin', 'Land Admin', 'Club Admin', 'Team Admin', 'Team Member', 'Supporter'];
                  console.log('[UsersPage] Using fallback roles:', fallbackRoles);
                  setAvailableRoles(fallbackRoles);
                  return;
              }

              const data = await response.json();
              const results = data.data?.results || data.results || data;

              // Extract role names and add Superadmin (from is_superuser)
              const roleNames = results.map((role: any) => role.name);
              const allRoles = ['Superadmin', ...roleNames].sort();

              console.log('[UsersPage] Available roles loaded:', allRoles);
              setAvailableRoles(allRoles);
          } catch (e) {
              console.error('[UsersPage] Failed to fetch roles for filter:', e);
              // Fallback to hardcoded roles on error
              const fallbackRoles = ['Superadmin', 'Land Admin', 'Club Admin', 'Team Admin', 'Team Member', 'Supporter'];
              console.log('[UsersPage] Using fallback roles after error:', fallbackRoles);
              setAvailableRoles(fallbackRoles);
          }
      };
      fetchRoles();
  }, []);

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

    // Build query params for server-side filtering + pagination
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', ((parseInt(page) - 1) * limit).toString());
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      let url = '';

      // Determine context from params or global context
      // If superadmin, ignore context.organisation unless explicitly selected via UI or URL
      const effectiveOrgSlug = (orgIdParam || (!isSuperAdmin ? context.organisation?.slug : null))?.toLowerCase();
      const effectiveProjectId = projectIdParam?.toLowerCase();

      if (effectiveProjectId) {
          // Project members - add pagination params
          params.append('project_id', effectiveProjectId);
          if (effectiveOrgSlug) {
              params.append('organisation_id', effectiveOrgSlug);
          }
          url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      } else if (isSuperAdmin) {
        // Superadmin view - add filters to params
        const filterOrg = effectiveOrgSlug || selectedOrgId;
        if (filterOrg) {
            params.append('organisation_id', filterOrg);
        }

        // Club/Team filter (server-side) - team takes priority
        if (selectedTeamId) {
            params.append('project_id', selectedTeamId);
            console.log('[UsersPage] 🔍 API Filter - Team:', selectedTeamId);
        } else if (selectedClubId) {
            params.append('project_id', selectedClubId);
            console.log('[UsersPage] 🔍 API Filter - Club:', selectedClubId);
        }

        // Status filter
        if (statusFilter === 'active') {
            params.append('is_active', 'true');
        } else if (statusFilter === 'inactive') {
            params.append('is_active', 'false');
        }

        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
        console.log('[UsersPage] 📡 API Call:', url);
      } else if (effectiveOrgSlug) {
        // Org admin view - scoped to their org
        params.append('organisation_id', effectiveOrgSlug);

        // Include unassigned users in global view
        if (!orgIdParam) {
            params.append('include_unassigned', 'true');
        }

        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
      } else {
        // Global View - apply filters
        if (selectedOrgId) {
            params.append('organisation_id', selectedOrgId);
        }

        // Status filter
        if (statusFilter === 'active') {
            params.append('is_active', 'true');
        } else if (statusFilter === 'inactive') {
            params.append('is_active', 'false');
        }

        url = `${apiBaseUrl}/api/v1/admin/users/?${params.toString()}`;
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
      const count = data.data?.count || data.count || 0;
      setUsers(results);
      setTotal(count);
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
  }, [user, context.organisation, isSuperAdmin, selectedOrgId, selectedClubId, selectedTeamId, projectIdParam, orgIdParam, statusFilter, page]);

  const handlePageChange = (newPage: number) => {
    searchParams.set('page', newPage.toString());
    setSearchParams(searchParams);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = parseInt(page);

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

  // Client-side filtering (alleen voor role, omdat die niet server-side wordt gefilterd)
  const hasActiveFilters = roleFilter;
  if (hasActiveFilters) {
      console.log('[UsersPage] 🔍 Client-side Role Filter:', { roleFilter });
  }

  const filteredUsers = users.filter((item: any) => {
      const isMembership = !!item.user;
      const user = isMembership ? item.user : item;
      const systemRole = user.role || '';

      // Role Filter (client-side only)
      if (roleFilter && systemRole !== roleFilter) {
          return false;
      }

      return true;
  });

  if (hasActiveFilters) {
      console.log(`[UsersPage] 📊 Results: ${filteredUsers.length}/${users.length}`);
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

                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Role:</label>
                    <select
                        value={roleFilter}
                        onChange={(e) => {
                            console.log('[UsersPage] 🎭 Role filter changed to:', e.target.value);
                            setRoleFilter(e.target.value);
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">All Roles</option>
                        {availableRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Organisation:</label>
                    <select
                        value={selectedOrgId}
                        onChange={(e) => {
                            setSelectedOrgId(e.target.value);
                            setSelectedClubId(''); // Reset club filter when org changes
                            setSelectedTeamId(''); // Reset team filter when org changes
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">All Organisations</option>
                        {(isSuperAdmin ? organisations : myOrganisations).map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>

                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Club:</label>
                    <select
                        value={selectedClubId}
                        onChange={(e) => {
                            const clubId = e.target.value;
                            const clubName = clubs.find(c => String(c.id) === clubId)?.name || 'Unknown';
                            console.log('[UsersPage] 🏢 Club filter changed to:', clubId, `(${clubName})`);
                            setSelectedClubId(clubId);
                            setSelectedTeamId(''); // Reset team filter when club changes
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', maxWidth: '150px' }}
                    >
                        <option value="">All Clubs</option>
                        {clubs
                            .filter(club => {
                                // Filter by selected organisation if set - compare UUID strings
                                if (selectedOrgId) {
                                    const clubOrg = typeof club.organisation === 'string' ? club.organisation : club.organisation?.id;
                                    return clubOrg === selectedOrgId || String(clubOrg) === selectedOrgId;
                                }
                                return true;
                            })
                            .map(club => (
                                <option key={club.id} value={club.id}>{club.name}</option>
                            ))}
                    </select>

                    <label style={{ fontSize: '14px', fontWeight: 500 }}>Team:</label>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => {
                            const teamId = e.target.value;
                            const teamName = teams.find(t => String(t.id) === teamId)?.name || 'Unknown';
                            console.log('[UsersPage] ⚽ Team filter changed to:', teamId, `(${teamName})`);
                            setSelectedTeamId(teamId);
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', maxWidth: '150px' }}
                    >
                        <option value="">All Teams</option>
                        {teams
                            .filter(team => {
                                // Filter by selected club if set
                                if (selectedClubId) {
                                    const teamParentId = team.parent_id;
                                    if (teamParentId !== selectedClubId && String(teamParentId) !== String(selectedClubId)) {
                                        return false;
                                    }
                                }
                                // Filter by selected organisation if set (via parent club)
                                if (selectedOrgId) {
                                    const teamParentId = team.parent_id;
                                    const parentClub = clubs.find(c => String(c.id) === String(teamParentId));
                                    if (parentClub) {
                                        const clubOrg = typeof parentClub.organisation === 'string' ? parentClub.organisation : parentClub.organisation?.id;
                                        if (clubOrg !== selectedOrgId && String(clubOrg) !== String(selectedOrgId)) {
                                            return false;
                                        }
                                    } else {
                                        return false;
                                    }
                                }
                                return true;
                            })
                            .map(team => (
                                <option key={team.id} value={team.id}>{team.name}</option>
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
                <th style={{ minWidth: '150px' }}>Club</th>
                <th style={{ minWidth: '150px' }}>Team</th>
                <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--app-muted-text)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item: any) => {
                  const isMembership = !!item.user;
                  const user = isMembership ? item.user : item;
                  const userOrgs = user.organisations || [];
                  const userProjects = user.projects || [];

                  // Use the backend-provided role (TeamReel hierarchy)
                  const displayRole = user.role || 'User';

                  const isActive = isMembership ? item.is_active : user.is_active;

                  // Get parent projects (clubs) - Projects without parent (parent is null or undefined)
                  const directParentProjects = userProjects.filter((p: any) => {
                      const hasNoParent = p.parent === null || p.parent === undefined || !p.parent;
                      return hasNoParent;
                  });

                  // Get child projects (teams) - Projects with parent
                  const childProjects = userProjects.filter((p: any) => {
                      const hasParent = p.parent !== null && p.parent !== undefined && p.parent;
                      return hasParent;
                  });

                  // Get unique parent clubs from child projects (via parent_name)
                  const parentClubsFromTeams = new Map<string, any>();
                  childProjects.forEach((p: any) => {
                      if (p.parent_name && !parentClubsFromTeams.has(p.parent_name)) {
                          parentClubsFromTeams.set(p.parent_name, {
                              id: p.parent,
                              name: p.parent_name
                          });
                      }
                  });

                  // Combine direct parent projects and parent clubs from teams
                  const allParentClubs = [
                      ...directParentProjects,
                      ...Array.from(parentClubsFromTeams.values())
                  ];

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
                                      {org.name}
                                  </span>
                              )) : <span style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>-</span>}
                          </div>
                      </td>
                      <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {allParentClubs.length > 0 ? allParentClubs.map((club: any, idx: number) => (
                                  <span key={club.id || idx} style={{
                                      padding: '2px 6px',
                                      border: '1px solid var(--app-border)',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--app-surface-2)',
                                      color: 'var(--app-text)'
                                  }}>
                                      {club.name}
                                  </span>
                              )) : <span style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>-</span>}
                          </div>
                      </td>
                      <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {childProjects.length > 0 ? childProjects.map((project: any) => (
                                  <span key={project.id} style={{
                                      padding: '2px 6px',
                                      border: '1px solid var(--app-border)',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--app-surface-2)',
                                      color: 'var(--app-text)'
                                  }}>
                                      {project.name}
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

        {/* Pagination */}
        {!isLoading && total > limit && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span style={{ fontSize: '0.875rem', color: 'var(--app-muted-text)' }}>
              Page {currentPage} of {totalPages} ({total} total users)
            </span>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
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

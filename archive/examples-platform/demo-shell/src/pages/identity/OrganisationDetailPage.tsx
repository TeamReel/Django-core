import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  Alert,
  Input,
} from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { Organisation, User, Project } from '../../types';
import AppShell from '../../components/AppShell';
import {
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
  canEditProject,
  canDeleteProject,
} from '../../utils/permissions';

/**
 * T007 - Organisation Detail Page
 *
 * Purpose: Display organisation summary with members, projects, and credits snippet
 * - Shows org metadata, member count, project list
 * - Links to projects and audit log
 * - Permission-aware: viewer sees read-only view
 */
export const OrganisationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Resolve slug from ID if needed
  const resolvedOrg = organisations.find(o =>
    o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase(); // Use slug for API calls
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  // Permission checks using centralized helper
  const isSuperAdmin = (user as any)?.role === 'superadmin';
  const permissionContext = {
    currentOrganisation: (org || resolvedOrg) as any,
    isSuperAdmin,
  };
  const userCanEditOrg = canEditOrganisation(permissionContext);
  const userCanDeleteOrg = canDeleteOrganisation(permissionContext);
  const userCanInvite = canInviteMembers(permissionContext);
  const userCanManageMembers = canManageMembers(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  // Breadcrumb context switcher setup
  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  // Custom handler to navigate to the selected organisation's detail page
  const handleOrganisationSwitch = (option: { id: string; label: string; slug: string }) => {
    navigate(`/organisations/${option.slug || option.id}`);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviteLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // First find user by email (in a real app this would be an invite flow)
      // For this demo, we'll assume we need the user ID.
      // Since we don't have a user search endpoint exposed for this demo,
      // we'll try to use the email directly if the backend supports it,
      // or we might need to mock this part if the backend strictly requires UUID.

      // NOTE: The backend MembershipCreateSerializer expects 'user_id' (UUID).
      // Since we can't easily look up UUIDs by email from the frontend without a search endpoint,
      // we will add a temporary helper to the backend or just ask the user for UUID in this demo.
      // For better UX, let's try to implement a simple lookup or just use the ID input for now.

      // Actually, let's change the input to ask for User ID for this technical demo
      // to avoid complexity of implementing user search right now.

      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.email?.[0] || data.detail || 'Failed to invite member');
      }

      // Refresh members
      const membersResponse = await fetch(
        `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        }
      );

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(Array.isArray(membersData) ? membersData : membersData.results || []);
      }

      setInviteEmail('');
      alert('Member added successfully');
    } catch (err) {
      console.error('Invite error:', err);
      alert(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this organisation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete organisation (${response.status})`);
      }

      navigate('/organisations');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete organisation');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!currentOrgSlug) return;

      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        // Fetch organisation details using slug
        const orgResponse = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        });

        if (!orgResponse.ok) {
          throw new Error(`Failed to fetch organisation (${orgResponse.status})`);
        }

        const rawOrgData = await orgResponse.json();
        // Handle B13 response envelope
        const orgData = rawOrgData.data || rawOrgData;
        setOrg(orgData);

        // Fetch members using slug
        console.log('[OrganisationDetailPage] Fetching members from:', `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/`);
        const membersResponse = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(currentOrgId || ''),
            },
            credentials: 'include',
          }
        );

        console.log('[OrganisationDetailPage] Members response status:', membersResponse.status);

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          console.log('[OrganisationDetailPage] Raw members data:', membersData);
          console.log('[OrganisationDetailPage] membersData.data:', membersData.data);
          console.log('[OrganisationDetailPage] membersData.data?.results:', membersData.data?.results);

          // Handle B13 response envelope
          let membersList = [];
          if (Array.isArray(membersData.data?.results)) {
             membersList = membersData.data.results;
          } else if (Array.isArray(membersData.data?.data)) {
             membersList = membersData.data.data;
          } else if (Array.isArray(membersData.results)) {
             membersList = membersData.results;
          } else if (Array.isArray(membersData.data)) {
             membersList = membersData.data;
          } else if (Array.isArray(membersData)) {
             membersList = membersData;
          }

          console.log('[OrganisationDetailPage] Parsed membersList:', membersList);
          console.log('[OrganisationDetailPage] Is array?', Array.isArray(membersList));
          console.log('[OrganisationDetailPage] Length:', Array.isArray(membersList) ? membersList.length : 'not array');

          setMembers(membersList);
        } else {
          console.error('[OrganisationDetailPage] Members fetch failed:', membersResponse.status);
          // Don't fail the whole page if members fail to load
          setMembers([]);
        }

        // Fetch projects using slug
        const projectsResponse = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?limit=5`,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(currentOrgId || ''),
            },
            credentials: 'include',
          }
        );

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          // Handle B13 response envelope
          const projectsList = projectsData.data?.results || projectsData.results || projectsData.data || projectsData || [];
          setProjects(Array.isArray(projectsList) ? projectsList : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organisation details');
        console.error('Org detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentOrgSlug) {
      fetchOrgDetails();
    }
  }, [currentOrgSlug, currentOrgId]);

  if (loading) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Organisation Details"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: 'Loading...', current: true },
            ]}
          />
          <PageContent>
            <Card>
              <div className="text-center py-8 text-gray-500">
                Loading organisation details...
              </div>
            </Card>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  if (error || !org) {
    return (
      <AppShell>
        <div>
          <PageHeader
            title="Organisation Details"
            breadcrumbs={[
              { label: 'Home', onClick: () => navigate('/') },
              { label: 'Organisations', onClick: () => navigate('/organisations') },
              { label: 'Error', current: true },
            ]}
          />
          <PageContent>
            <Alert variant="error" data-testid="org-detail-error">
              {error || 'Organisation not found'}
            </Alert>
            <Button variant="secondary" onClick={() => navigate('/organisations')}>
              Back to Organisations
            </Button>
          </PageContent>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <PageHeader
        title={org.name}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Organisations', onClick: () => navigate('/organisations') },
          {
            label: (
              <select
                value={org.slug || org.id}
                onChange={(e) => handleOrganisationSwitch({ id: e.target.value, label: '', slug: e.target.value })}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {organisationOptions.map(orgOption => (
                  <option key={orgOption.id} value={orgOption.slug || orgOption.id}>{orgOption.label}</option>
                ))}
              </select>
            ),
            current: true,
          },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/organisations')}
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
              Back
            </button>
            <button
              onClick={() => navigate(`/organisations/${org.slug || org.id}/users`)}
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
              View All Users
            </button>
            {userCanEditOrg && (
              <>
                <button
                  onClick={() => navigate(`/organisations/${org.slug || org.id}/edit`)}
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
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #bd2130',
                    backgroundColor: 'var(--app-surface)',
                    color: 'var(--app-text)',
                    cursor: deleteLoading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    opacity: deleteLoading ? 0.6 : 1
                  }}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        }
      />

      <PageContent>
        {/* Organisation summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card data-testid="org-summary-members">
            <div className="text-sm text-gray-600">Members</div>
            <div className="text-2xl font-bold">{org.member_count || members.length || 0}</div>
          </Card>
          <Card data-testid="org-summary-projects">
            <div className="text-sm text-gray-600">Projects</div>
            <div className="text-2xl font-bold">{org.project_count || projects.length || 0}</div>
          </Card>
          <Card data-testid="org-summary-credits">
            <div className="text-sm text-gray-600">Credits Available</div>
            <div className="text-2xl font-bold">{org.credit_balance || 0}</div>
          </Card>
        </div>

        {/* Members section */}
        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Members</h3>
          </div>

          {userCanInvite && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-2">Add Member</h4>
              <form onSubmit={handleInvite} className="flex gap-2 items-end">
                <div style={{ flex: 1 }}>
                  <label className="block text-xs text-gray-500 mb-1">User Email</label>
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. user@example.com"
                    required
                    type="email"
                  />
                </div>
                <div style={{ width: '120px' }}>
                  <label className="block text-xs text-gray-500 mb-1">Role</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" loading={inviteLoading}>
                  Add
                </Button>
              </form>
            </div>
          )}

          {members.length > 0 ? (
            <Card>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((item: any) => {
                  // Handle Membership object structure
                  const user = item.user || item;
                  const role = item.role || 'member';
                  const membershipId = item.id; // Membership ID needed for delete

                  return (
                    <tr key={user.id}>
                      <td>
                        <Link
                          to={`/organisations/${currentOrgSlug}/users/${user.id}`}
                          className="text-blue-600 hover:underline"
                          style={{ fontSize: '0.85rem' }}
                          data-testid={`user-link-${user.id}`}
                        >
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                        </Link>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                      <td>
                        <Badge variant="default" data-testid={`member-role-${user.id}`}>
                          {role}
                        </Badge>
                      </td>
                      <td>
                        {userCanManageMembers ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['admin', 'member'].includes(role) && (
                              <>
                                <button
                                  onClick={() => navigate(`/organisations/${currentOrgSlug}/members/${membershipId}`)}
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
                                <button
                                  onClick={() => navigate(`/organisations/${currentOrgSlug}/members/${membershipId}?action=edit`)}
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
                              </>
                            )}
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Remove ${user.email} from organisation?`)) return;
                                try {
                                  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

                                  const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/${membershipId}/`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRFToken': csrfToken || '',
                                    },
                                    credentials: 'include',
                                  });

                                  if (res.ok) {
                                    // Refresh members
                                    const membersResponse = await fetch(
                                      `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/`,
                                      {
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'X-Requested-With': 'XMLHttpRequest',
                                          'X-Organisation-ID': String(currentOrgId || ''),
                                        },
                                        credentials: 'include',
                                      }
                                    );
                                    if (membersResponse.ok) {
                                      const membersData = await membersResponse.json();
                                      setMembers(Array.isArray(membersData) ? membersData : membersData.results || []);
                                    }
                                  } else {
                                    alert('Failed to remove member');
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert('Error removing member');
                                }
                              }}
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
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </Table>
            </Card>
          ) : (
            <Alert variant="info">No members yet</Alert>
          )}
        </Card>

        {/* Projects section */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-lg font-semibold">Recent Projects</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/organisations/${currentOrgSlug}/projects`)}
            >
              View All Projects
            </Button>
          </div>
          {projects.length > 0 ? (
            <Card>
            <Table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Team Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link
                        to={`/organisations/${currentOrgSlug}/projects/${project.slug || project.id}`}
                        className="text-blue-600 hover:underline"
                        style={{ fontSize: '0.85rem' }}
                        data-testid={`project-link-${project.id}`}
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td>
                      <Badge variant="default">{project.member_count || 0}</Badge>
                    </td>
                    <td>
                      <Badge
                        variant={project.is_active ? 'success' : 'warning'}
                        data-testid={`project-status-${project.id}`}
                      >
                        {project.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                              onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${project.slug || project.id}`)}
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
                          {userCanEditProject && (
                            <button
                                onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${project.slug || project.id}/edit`)}
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
                          {userCanDeleteProject && (
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete project ${project.name}?`)) return;
                                    try {
                                        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

                                        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/${project.slug || project.id}/`, {
                                            method: 'DELETE',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRFToken': csrfToken || '',
                                            },
                                            credentials: 'include',
                                        });

                                        if (res.ok) {
                                          // Refresh projects
                                          const projectsResponse = await fetch(
                                              `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?limit=5`,
                                              {
                                                  headers: {
                                                      'Content-Type': 'application/json',
                                                      'X-Requested-With': 'XMLHttpRequest',
                                                      'X-Organisation-ID': String(currentOrgId || ''),
                                                  },
                                                  credentials: 'include',
                                              }
                                          );
                                          if (projectsResponse.ok) {
                                              const projectsData = await projectsResponse.json();
                                              setProjects(projectsData.results || []);
                                          }
                                      }
                                  } catch (e) {
                                      console.error(e);
                                      alert('Error deleting project');
                                  }
                              }}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            </Card>
          ) : (
            <Alert variant="info">No projects yet</Alert>
          )}
        </Card>
      </PageContent>
      </div>
    </AppShell>
  );
};

export default OrganisationDetailPage;

import React, { useEffect, useMemo, useState } from 'react';
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
import { AuditLogTable } from '../../components/AuditLog/AuditLogTable';
import { PolicyList } from '../../components/Organisations/PolicyList';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clubs' | 'governance' | 'audit'>('overview');
  const [memberSearch, setMemberSearch] = useState('');

  // Resolve slug from ID if needed
  const resolvedOrg = organisations.find(o =>
    o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase(); // Use slug for API calls
  const currentOrgId = resolvedOrg?.id; // Keep ID for headers if needed

  // Permission checks using centralized helper
  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
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

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'users' as const, label: 'Users' },
      { id: 'clubs' as const, label: 'Clubs' },
      { id: 'governance' as const, label: 'Governance' },
      { id: 'audit' as const, label: 'Audit' },
    ],
    []
  );

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

        // Fetch members (can be large). Keep API call as-is, but UI defaults to overview tab.
        const membersUrl = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/?include_project_memberships=true&include_role_assignments=true`;
        console.log('[OrganisationDetailPage] Fetching members from:', membersUrl);
        const membersResponse = await fetch(
          membersUrl,
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

        // Fetch clubs (root projects) for this organisation (preview)
        const projectsResponse = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?page_size=5&parent_project__isnull=true`,
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
          const list = Array.isArray(projectsList) ? projectsList : [];

          // Defensive client-side filter: some endpoints may still return teams.
          const clubsOnly = list.filter((p: any) => {
            const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
            return !parentId;
          });

          setProjects(clubsOnly);
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
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Federations', onClick: () => navigate('/organisations') },
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
              { label: 'Dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Federations', onClick: () => navigate('/organisations') },
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
        subtitle="Federation overview"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Federations', onClick: () => navigate('/organisations') },
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
            <button
              onClick={() => navigate(`/clubs?org_id=${encodeURIComponent(String(org.slug || org.id))}`)}
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
              Clubs
            </button>
            <button
              onClick={() => navigate(`/teams?org_id=${encodeURIComponent(String(org.slug || org.id))}`)}
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
              Teams
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
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--app-border)', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                borderRadius: '6px 6px 0 0',
                border: '1px solid var(--app-border)',
                borderBottom: activeTab === tab.id ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                backgroundColor: activeTab === tab.id ? 'var(--app-surface)' : 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card data-testid="org-summary-members">
                <div className="text-sm text-gray-600">Users</div>
                <div className="text-2xl font-bold">{org.member_count || members.length || 0}</div>
              </Card>
              <Card data-testid="org-summary-projects">
                <div className="text-sm text-gray-600">Clubs</div>
                <div className="text-2xl font-bold">{org.clubs_count || projects.length || 0}</div>
              </Card>
              <Card data-testid="org-summary-credits">
                <div className="text-sm text-gray-600">Credits</div>
                <div className="text-2xl font-bold">{org.credit_balance || 0}</div>
              </Card>
            </div>

            <Card className="mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div className="text-lg font-semibold">Federation navigation</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                    Use these to explore clubs, teams, seasons and matches under this federation.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/clubs?org_id=${encodeURIComponent(String(org.slug || org.id))}`)}>
                    View clubs
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/teams?org_id=${encodeURIComponent(String(org.slug || org.id))}`)}>
                    View teams
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/organisations/${currentOrgSlug}/users`)}>
                    View users
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/clubs?org_id=${encodeURIComponent(String(org.slug || org.id))}`)}>
                    View clubs
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Users</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '280px', maxWidth: '100%' }}>
                  <Input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search users (name/email)"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/organisations/${currentOrgSlug}/users`)}>
                  View all
                </Button>
              </div>
            </div>

            {userCanInvite && (
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium mb-2">Add user to federation</h4>
                <form onSubmit={handleInvite} className="flex gap-2 items-end" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
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

            {(() => {
              const normalizedQuery = memberSearch.trim().toLowerCase();
              const filteredMembers = members.filter((item: any) => {
                const u = item.user || item;
                const haystack = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                return !normalizedQuery || haystack.includes(normalizedQuery);
              });

              const preview = filteredMembers.slice(0, 50);

              if (filteredMembers.length === 0) return <Alert variant="info">No users match your search.</Alert>;

              return (
                <>
                  {filteredMembers.length > 50 && (
                    <Alert variant="info">Showing first 50 users. Use “View all” for the complete list.</Alert>
                  )}
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
                        {preview.map((item: any) => {
                          const user = item.user || item;
                          const role = item.role || 'member';
                          const membershipId = item.id;
                          const isVirtualMember = item.source === 'assignment' || item.source === 'project_membership' || String(membershipId).startsWith('pm:');

                          return (
                            <tr key={user.id}>
                              <td>
                                <Link
                                  to={`/organisations/${currentOrgSlug}/users/${user.id}`}
                                  className="text-blue-600 hover:underline"
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                                </Link>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{user.email}</td>
                              <td>
                                <Badge variant="default">{role}</Badge>
                              </td>
                              <td>
                                {userCanManageMembers && !isVirtualMember ? (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                      onClick={async () => {
                                        if (!window.confirm(`Remove ${user.email} from federation?`)) return;
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

                                          if (!res.ok) {
                                            alert('Failed to remove user');
                                            return;
                                          }

                                          // Local update (avoid re-fetch storm)
                                          setMembers((prev) => prev.filter((m: any) => String(m.id) !== String(membershipId)));
                                        } catch (e) {
                                          console.error(e);
                                          alert('Error removing user');
                                        }
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #dc3545',
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
                </>
              );
            })()}
          </Card>
        )}

        {/* Clubs */}
        {activeTab === 'clubs' && (
          <Card className="mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Recent Clubs</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (isSuperAdmin && currentOrgSlug) {
                    navigate(`/clubs?org_id=${encodeURIComponent(String(currentOrgSlug))}`);
                    return;
                  }

                  navigate('/clubs');
                }}
              >
                View All Clubs
              </Button>
            </div>
            {projects.length > 0 ? (
              <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Club Name</th>
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
                        >
                          {project.name}
                        </Link>
                      </td>
                      <td>
                        <Badge variant="default">{project.member_count || 0}</Badge>
                      </td>
                      <td>
                        <Badge variant={project.is_active ? 'success' : 'warning'}>
                          {project.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                border: '1px solid #007bff',
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
                                    setProjects((prev) => prev.filter((p) => String(p.id) !== String(project.id)));
                                  } else {
                                    alert('Error deleting project');
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert('Error deleting project');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: '1px solid #dc3545',
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
              <Alert variant="info">No clubs yet</Alert>
            )}
          </Card>
        )}

        {/* Governance */}
        {activeTab === 'governance' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Governance & Compliance</h3>
            </div>
            <PolicyList organisationId={org.id || currentOrgId || ''} />
          </Card>
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Audit Trail</h3>
            </div>
            <AuditLogTable organisationId={org.id || currentOrgId || ''} limit={10} />
          </Card>
        )}

      </PageContent>
      </div>
    </AppShell>
  );
};

export default OrganisationDetailPage;

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
import ProjectDetailModal from './ProjectDetailModal';
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
import { fetchAllPages } from '../../utils/fetchAllPages';

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
  const { organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Project[]>([]);
  const [clubsCount, setClubsCount] = useState(0);
  const [clubsPage, setClubsPage] = useState(1);
  const clubsPageSize = 25;
  const [clubsLoading, setClubsLoading] = useState(false);

  const [teams, setTeams] = useState<Project[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [allClubsForTeams, setAllClubsForTeams] = useState<Project[]>([]);

  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);
  const [competitionsCount, setCompetitionsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [teamsCount, setTeamsCount] = useState<number | null>(null);

  const [selectedClub, setSelectedClub] = useState<Project | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview'
    | 'clubs'
    | 'teams'
    | 'seasons'
    | 'competitions'
    | 'matches'
    | 'users'
    | 'governance'
    | 'audit'
    | 'operations'
  >('overview');
  const [memberSearch, setMemberSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 25;

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
  const handleOrganisationSwitch = (option: { id: string; label: string; slug?: string }) => {
    navigate(`/organisations/${option.slug || option.id}`);
  };

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'clubs' as const, label: 'Clubs' },
      { id: 'teams' as const, label: 'Teams' },
      { id: 'seasons' as const, label: 'Seasons' },
      { id: 'competitions' as const, label: 'Competitions' },
      { id: 'matches' as const, label: 'Matches' },
      { id: 'users' as const, label: 'Users' },
      { id: 'governance' as const, label: 'Governance' },
      { id: 'audit' as const, label: 'Audit' },
      { id: 'operations' as const, label: 'Operations (Admin)' },
    ],
    []
  );

  const orgSlugOrId = String(org?.slug || org?.id || currentOrgSlug || '');

  const parseListEnvelope = (raw: any): { results: any[]; count: number } => {
    const envelope = raw?.data ?? raw;
    const results =
      envelope?.results ??
      envelope?.data ??
      raw?.results ??
      raw?.data ??
      raw ??
      [];

    const list = Array.isArray(results) ? results : [];
    const count =
      typeof envelope?.count === 'number'
        ? envelope.count
        : typeof raw?.count === 'number'
          ? raw.count
          : list.length;
    return { results: list, count };
  };

  const fetchClubsPage = async (page: number) => {
    if (!currentOrgSlug) return;
    setClubsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?page=${page}&page_size=${clubsPageSize}&parent_project__isnull=true`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Organisation-ID': String(currentOrgId || ''),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch clubs (${res.status})`);
      const json = await res.json();
      const { results, count } = parseListEnvelope(json);

      const clubsOnly = results.filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      setClubs(clubsOnly);
      setClubsCount(count);
    } catch (e) {
      console.error(e);
      setClubs([]);
      setClubsCount(0);
    } finally {
      setClubsLoading(false);
    }
  };

  const fetchTeamsForOrg = async () => {
    if (!currentOrgSlug) return;
    setTeamsLoading(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const clubsUrl = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=true`;
      const teamsUrl = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?page_size=250&parent_project__isnull=false`;

      const [clubsAll, teamsAll] = await Promise.all([
        fetchAllPages<Project>(clubsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        }),
        fetchAllPages<Project>(teamsUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        }),
      ]);

      const clubsOnly = (clubsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return !parentId;
      });

      const teamsOnly = (teamsAll || []).filter((p: any) => {
        const parentId = p.parent_id ?? p.parent ?? p.parent_project ?? p.parent_project_id ?? null;
        return Boolean(parentId);
      });

      setAllClubsForTeams(clubsOnly);
      setTeams(teamsOnly);
    } catch (e) {
      console.error(e);
      setTeams([]);
      setAllClubsForTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchFederationCounts = async (organisationId: string) => {
    if (!organisationId) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      // Teams count (child projects)
      if (currentOrgSlug) {
        const teamsRes = await fetch(
          `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/?page_size=1&parent_project__isnull=false`,
          { credentials: 'include' }
        );
        if (teamsRes.ok) {
          const json = await teamsRes.json();
          const { count } = parseListEnvelope(json);
          setTeamsCount(count);
        }
      }

      // Seasons/competitions counts – computed client-side from federation periods
      {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', organisationId);

        const allPeriods = await fetchAllPages<any>(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, {
          credentials: 'include',
        });

        const seasons = allPeriods.filter((p: any) => {
          const type = p.type ?? p.data?.type;
          const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
          return String(type).toLowerCase() === 'season' && !parentId;
        });

        const competitions = allPeriods.filter((p: any) => {
          const parentId = p.parent_period_id ?? p.parent_period?.id ?? null;
          return Boolean(parentId);
        });

        setSeasonsCount(seasons.length);
        setCompetitionsCount(competitions.length);
      }

      // Matches count
      {
        const params = new URLSearchParams();
        params.set('page_size', '1');
        params.set('activity_type', 'match');
        params.set('organisation_id', organisationId);
        const res = await fetch(`${apiBaseUrl}/api/v1/activities/?${params.toString()}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const { count } = parseListEnvelope(json);
          setMatchesCount(count);
        }
      }
    } catch (e) {
      console.warn('[OrganisationDetailPage] Failed to fetch counts', e);
    }
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

      // Refresh members (all pages)
      try {
        const params = new URLSearchParams();
        params.set('include_project_memberships', 'true');
        params.set('include_role_assignments', 'true');
        params.set('page_size', '250');
        const membersUrl = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/?${params.toString()}`;
        const allMembers = await fetchAllPages<any>(membersUrl, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Organisation-ID': String(currentOrgId || ''),
          },
          credentials: 'include',
        });
        setMembers(allMembers);
      } catch {
        // ignore
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

        // Set global context to this federation (helps admin pages & filters)
        try {
          await switchContext(orgData as any);
        } catch {
          // Context switching is optional; ignore errors.
        }

        // Fetch members (can be large). Fetch all pages so "Users" can show everything.
        try {
          const params = new URLSearchParams();
          params.set('include_project_memberships', 'true');
          params.set('include_role_assignments', 'true');
          params.set('page_size', '250');

          const membersUrl = `${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/members/?${params.toString()}`;
          const allMembers = await fetchAllPages<any>(membersUrl, {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Organisation-ID': String(currentOrgId || ''),
            },
            credentials: 'include',
          });
          setMembers(allMembers);
        } catch (e) {
          console.error('[OrganisationDetailPage] Members fetch failed:', e);
          setMembers([]);
        }

        // Federation-wide counts (high-over)
        const organisationIdForCounts = String(orgData.id || currentOrgId || '');
        if (organisationIdForCounts) {
          fetchFederationCounts(organisationIdForCounts);
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

  useEffect(() => {
    // Reset paging when switching tabs
    if (activeTab === 'clubs') {
      fetchClubsPage(clubsPage);
    }
    if (activeTab === 'teams') {
      fetchTeamsForOrg();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'clubs') {
      fetchClubsPage(clubsPage);
    }
  }, [clubsPage]);

  useEffect(() => {
    setUsersPage(1);
  }, [memberSearch]);

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
          { label: 'Federations', onClick: () => navigate('/organisations') },
          {
            label: (
              <BreadcrumbContextSwitcher
                currentId={String(resolvedOrg?.id || org.id || '')}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={organisationOptions.length > 1}
                type="organisation"
              />
            ),
            current: true,
          },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/organisations')}>
              Back
            </Button>
            {userCanEditOrg && (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/organisations/${orgSlugOrId}/edit`)}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card data-testid="org-summary-members">
                <div className="text-sm text-gray-600">Users</div>
                <div className="text-2xl font-bold">{org.member_count || members.length || 0}</div>
              </Card>
              <Card data-testid="org-summary-projects">
                <div className="text-sm text-gray-600">Clubs</div>
                <div className="text-2xl font-bold">{org.clubs_count || clubsCount || 0}</div>
              </Card>
              <Card data-testid="org-summary-teams">
                <div className="text-sm text-gray-600">Teams</div>
                <div className="text-2xl font-bold">{org.teams_count || teamsCount || 0}</div>
              </Card>
              <Card data-testid="org-summary-matches">
                <div className="text-sm text-gray-600">Matches</div>
                <div className="text-2xl font-bold">{org.matches_count || matchesCount || 0}</div>
              </Card>
            </div>
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

              if (filteredMembers.length === 0) return <Alert variant="info">No users match your search.</Alert>;

              const totalPages = Math.max(1, Math.ceil(filteredMembers.length / usersPageSize));
              const safePage = Math.min(usersPage, totalPages);
              const start = (safePage - 1) * usersPageSize;
              const pageItems = filteredMembers.slice(start, start + usersPageSize);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                      Page {safePage} of {totalPages} ({filteredMembers.length} users)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" size="sm" disabled={safePage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
                        Previous
                      </Button>
                      <Button variant="secondary" size="sm" disabled={safePage >= totalPages} onClick={() => setUsersPage((p) => Math.min(totalPages, p + 1))}>
                        Next
                      </Button>
                    </div>
                  </div>
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
                        {pageItems.map((item: any) => {
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
              <h3 className="text-lg font-semibold">Clubs</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--app-muted-text)' }}>
                  Page {clubsPage} of {Math.max(1, Math.ceil((clubsCount || 0) / clubsPageSize))} ({clubsCount || 0} clubs)
                </div>
                <Button variant="secondary" size="sm" disabled={clubsPage <= 1 || clubsLoading} onClick={() => setClubsPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={clubsLoading || clubsPage >= Math.max(1, Math.ceil((clubsCount || 0) / clubsPageSize))}
                  onClick={() => setClubsPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            {clubsLoading ? (
              <Alert variant="info">Loading clubs…</Alert>
            ) : clubs.length > 0 ? (
              <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Club Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map((club) => (
                    <tr key={club.id}>
                      <td>
                        <Link
                          to={`/organisations/${currentOrgSlug}/projects/${club.slug || club.id}`}
                          className="text-blue-600 hover:underline"
                          style={{ fontSize: '0.85rem' }}
                        >
                          {club.name}
                        </Link>
                      </td>
                      <td>
                        <Badge variant={club.is_active ? 'success' : 'warning'}>
                          {club.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedClub(club);
                              setIsClubModalOpen(true);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${club.slug || club.id}`)}
                          >
                            Open
                          </Button>
                          {userCanEditProject && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${club.slug || club.id}/edit`)}
                            >
                              Edit
                            </Button>
                          )}
                          {userCanDeleteProject && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to delete project ${club.name}?`)) return;
                                try {
                                  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                  const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];

                                  const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${currentOrgSlug}/projects/${club.slug || club.id}/`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'X-CSRFToken': csrfToken || '',
                                    },
                                    credentials: 'include',
                                  });

                                  if (res.ok) {
                                    setClubs((prev) => prev.filter((p) => String(p.id) !== String(club.id)));
                                  } else {
                                    alert('Error deleting project');
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert('Error deleting project');
                                }
                              }}
                            >
                              Delete
                            </Button>
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

        {/* Teams */}
        {activeTab === 'teams' && (
          <Card className="mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Teams (grouped by club)</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/teams?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                Open Teams List
              </Button>
            </div>

            {teamsLoading ? (
              <Alert variant="info">Loading teams…</Alert>
            ) : teams.length === 0 ? (
              <Alert variant="info">No teams found in this federation.</Alert>
            ) : (
              (() => {
                const clubNameById = new Map<string, string>();
                const clubSlugById = new Map<string, string>();
                for (const c of allClubsForTeams as any[]) {
                  clubNameById.set(String(c.id), c.name);
                  clubSlugById.set(String(c.id), (c as any).slug || String(c.id));
                }

                const byClubId = new Map<string, Project[]>();
                for (const t of teams as any[]) {
                  const parentId = String(t.parent_id ?? t.parent ?? t.parent_project ?? t.parent_project_id ?? '');
                  if (!parentId) continue;
                  const arr = byClubId.get(parentId) || [];
                  arr.push(t);
                  byClubId.set(parentId, arr);
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Array.from(byClubId.entries()).map(([clubId, clubTeams]) => (
                      <Card key={clubId}>
                        <div className="text-sm font-semibold" style={{ marginBottom: '10px' }}>
                          {clubNameById.get(clubId) || `Club ${clubId}`}
                        </div>
                        <Table>
                          <thead>
                            <tr>
                              <th>Team</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(clubTeams || []).map((team: any) => {
                              const teamSlugOrId = team.slug || team.id;
                              const clubSlugOrId = clubSlugById.get(clubId) || clubId;
                              return (
                                <tr key={team.id}>
                                  <td style={{ fontSize: '0.85rem' }}>{team.name}</td>
                                  <td>
                                    <Badge variant={team.is_active ? 'success' : 'warning'}>
                                      {team.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => navigate(`/organisations/${currentOrgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`)}
                                      >
                                        Open
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </Card>
                    ))}
                  </div>
                );
              })()
            )}
          </Card>
        )}

        {/* Seasons (high-over) */}
        {activeTab === 'seasons' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Seasons (high-over)</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/seasons?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all seasons
              </Button>
            </div>
            <Alert variant="info">
              Total seasons in this federation: {seasonsCount ?? '—'}. Use the seasons list page to filter by club/team.
            </Alert>
          </Card>
        )}

        {/* Competitions (high-over) */}
        {activeTab === 'competitions' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Competitions (high-over)</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/competitions?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all competitions
              </Button>
            </div>
            <Alert variant="info">
              Total competitions in this federation: {competitionsCount ?? '—'}. Use the competitions list page to filter by club/team/season.
            </Alert>
          </Card>
        )}

        {/* Matches (high-over) */}
        {activeTab === 'matches' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
              <h3 className="text-lg font-semibold">Matches (high-over)</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/matches?org_id=${encodeURIComponent(orgSlugOrId)}`)}>
                View all matches
              </Button>
            </div>
            <Alert variant="info">
              Total matches in this federation: {matchesCount ?? '—'}. Use the matches list page to filter by club/team/competition.
            </Alert>
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

        {/* Operations */}
        {activeTab === 'operations' && (
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Operations (Admin)</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/permissions')}>Permissions</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/flags')}>Feature Flags</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/security')}>Security</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/integration-status')}>Integration Status</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/health')}>Health</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/observability')}>Metrics</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/usage-events')}>Usage Events</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/routing-logs')}>Notification Routing</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/api-docs')}>API Docs</Button>
            </div>
          </Card>
        )}

      </PageContent>

      <ProjectDetailModal
        opened={isClubModalOpen}
        onClose={() => setIsClubModalOpen(false)}
        project={selectedClub}
      />
      </div>
    </AppShell>
  );
};

export default OrganisationDetailPage;

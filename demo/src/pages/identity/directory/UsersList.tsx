import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Badge, Button } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import LoadingState from '../../../components/LoadingState';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import UserDetailModal from '../UserDetailModal';

// Reusing existing modals from parent folder
// Note: We might need to adjust imports if they are not exported or move them
// For now, I'll assume standard relative imports work if I'm in directory/UsersList.tsx
// I need to go up one level to access UserDetailModal etc.

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

type ProjectOption = {
    id: string | number;
    slug?: string;
    name: string;
    organisation?: string | { id: string };
    parent_id?: string | number | null;
    parent_project?: any;
};

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
  flexWrap: 'wrap'
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

export const UsersList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { context, organisations: myOrganisations } = useContextSwitcher();
    const [searchParams, setSearchParams] = useSearchParams();

    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [clubs, setClubs] = useState<ProjectOption[]>([]);
    const [teams, setTeams] = useState<ProjectOption[]>([]);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);

    // Filter State
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedClubId, setSelectedClubId] = useState<string>(''); // For filtering logic
    const [selectedTeamId, setSelectedTeamId] = useState<string>(''); // For filtering logic
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [roleFilter, setRoleFilter] = useState<string>('');

    // Modals
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const userRole = String((user as any)?.role || '').toLowerCase();
    const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

    // Initial Filter Setup
    useEffect(() => {
        if (!isSuperAdmin && context.organisation?.id) {
            setSelectedOrgId(String(context.organisation.id));
        }

        const orgParam = searchParams.get('org_id');
        if (orgParam && isSuperAdmin) setSelectedOrgId(orgParam);

    }, [context.organisation?.id, isSuperAdmin, searchParams]);

    // Fetch Orgs (SuperAdmin)
    useEffect(() => {
        if (!isSuperAdmin) {
            setOrganisations(myOrganisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })));
            return;
        }

        const load = async () => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            try {
                const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=100`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    const orgs = data.data?.results || data.results || [];
                    setOrganisations(orgs.map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
                }
            } catch (e) { console.error(e); }
        };
        load();
    }, [isSuperAdmin, myOrganisations]);

    // Fetch Clubs/Teams options
    useEffect(() => {
        const load = async () => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            try {
                const [allClubs, allTeams] = await Promise.all([
                    fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`),
                    fetchAllPages<ProjectOption>(`${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`),
                ]);
                setClubs(allClubs);
                setTeams(allTeams);
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, []);

    // Fetch Roles
    useEffect(() => {
         const load = async () => {
             const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
             try {
                const res = await fetch(`${apiBaseUrl}/api/v1/permissions/roles/`, { credentials: 'include' });
                if (res.ok) {
                     const data = await res.json();
                     const results = data.data?.results || data.results || [];
                     const names = results.map((r: any) => r.name);
                     setAvailableRoles(['Superadmin', ...names].sort());
                } else {
                     setAvailableRoles(['Superadmin', 'Club Admin', 'Team Admin', 'Team Member', 'User']);
                }
             } catch {
                 setAvailableRoles(['Superadmin', 'Club Admin', 'Team Admin', 'Team Member', 'User']);
             }
         };
         load();
    }, []);

    // Fetch Users
    useEffect(() => {
        const loadUsers = async () => {
            setIsLoading(true);
            setError(null);
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

            try {
                // Find the selected organisation to get its slug
                const selectedOrg = selectedOrgId
                    ? organisations.find(o => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
                    : null;

                if (!selectedOrg?.slug && !isSuperAdmin) {
                    setUsers([]);
                    return;
                }

                const params = new URLSearchParams();
                params.set('page_size', '250');
                params.set('include_project_memberships', 'true');
                params.set('include_role_assignments', 'true');

                // Use the organisations/:slug/members/ endpoint
                // Fallback: if no specific org selected, and user is superadmin, we might want to list all users relative to first org or just skip
                let orgSlug = selectedOrg?.slug;

                if (!orgSlug && organisations.length > 0) {
                     // Default to first organisation if available, to avoid 404
                     orgSlug = organisations[0].slug;
                }

                if (!orgSlug && !isSuperAdmin) {
                     // Should have context check earlier, but safety first
                     setUsers([]);
                     setIsLoading(false);
                     return;
                }

                // If superadmin has NO org selected, we can't use the org-scoped endpoint easily without a slug.
                // We'll skip fetching if we can't determine an org context.
                if (!orgSlug) {
                    setUsers([]);
                    setIsLoading(false);
                    return;
                }

                const url = `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/?${params.toString()}`;

                const res = await fetch(url, { credentials: 'include' });

                if (!res.ok) throw new Error('Failed to fetch users');

                const data = await res.json();
                let results = data.data?.results || data.results || [];

                // Client-side filtering for project membership
                if (selectedTeamId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some((m: any) =>
                            String(m.project_id || m.project?.id) === String(selectedTeamId)
                        )
                    );
                } else if (selectedClubId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some((m: any) =>
                            String(m.project_id || m.project?.id) === String(selectedClubId)
                        )
                    );
                }

                // Client side filtering for status
                if (statusFilter === 'active') {
                    results = results.filter((u: any) => u.is_active !== false);
                } else if (statusFilter === 'inactive') {
                     results = results.filter((u: any) => u.is_active === false);
                }

                setUsers(results);

            } catch (e) {
                 setError(e instanceof Error ? e.message : 'Error loading users');
            } finally {
                setIsLoading(false);
            }
        };

        loadUsers();
    }, [selectedOrgId, selectedTeamId, selectedClubId, statusFilter]);

    // Helper for role display logic
    const getUserRoleDisplay = (user: any) => {
        // Simple heuristic for now
        if (user.is_superuser) return 'Superadmin';
        // Try to find context role
        // This is complex without the full membership data structure logic from UsersPage
        // reusing 'role' field if present or falling back
         return user.role || 'User';
    };

    return (
        <div>
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                {isSuperAdmin && (
                    <select
                        value={selectedOrgId}
                        onChange={(e) => {
                            setSelectedOrgId(e.target.value);
                            setSelectedClubId('');
                            setSelectedTeamId('');
                        }}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid var(--app-border)',
                            borderRadius: '4px',
                            fontSize: '14px',
                            backgroundColor: 'var(--app-surface)',
                        }}
                    >
                        <option value="">Federation: All</option>
                        {organisations.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                )}

                <select
                    value={selectedClubId}
                    onChange={(e) => {
                        setSelectedClubId(e.target.value);
                        setSelectedTeamId('');
                    }}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'var(--app-surface)',
                    }}
                >
                    <option value="">Club: All</option>
                    {clubs
                      .filter(c => !selectedOrgId ||
                        (typeof c.organisation === 'string' ? c.organisation === selectedOrgId : String(c.organisation?.id) === selectedOrgId))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    disabled={!selectedClubId && users.length > 500}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'var(--app-surface)',
                    }}
                >
                    <option value="">Team: All</option>
                    {teams
                        .filter(t => {
                            if (selectedClubId) {
                                 const parent = t.parent_id || (typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project);
                                 return String(parent) === String(selectedClubId);
                            }
                            return true;
                        })
                        .filter(t => !selectedOrgId ||
                            (typeof t.organisation === 'string' ? t.organisation === selectedOrgId : String(t.organisation?.id) === selectedOrgId))
                        .map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

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

                 <Button variant="secondary" size="md" onClick={() => {
                     setSelectedClubId('');
                     setSelectedTeamId('');
                     setStatusFilter('active');
                     if(isSuperAdmin) setSelectedOrgId('');
                 }}>
                     Clear
                 </Button>
                 {selectedOrgId && (
                   <Button variant="primary" onClick={() => {
                     const orgSlug = organisations.find(o => String(o.id) === selectedOrgId)?.slug || selectedOrgId;
                     navigate(`/organisations/${orgSlug}/members/invite`);
                   }}>
                     Invite User
                   </Button>
                 )}
            </div>

            {isLoading && <LoadingState message="Loading users..." />}
            {error && <Alert variant="error">{error}</Alert>}

            {!isLoading && !error && users.length === 0 && (
                <Alert variant="info">No users found.</Alert>
            )}

            {!isLoading && !error && users.length > 0 && (
                <Card>
                    <div className="overflow-x-auto">
                        <Table style={compactTableStyle}>
                            <thead>
                                <tr>
                                    <th style={{ ...compactThStyle, width: '28%' }}>User</th>
                                    <th style={{ ...compactThStyle, width: '30%' }}>Email</th>
                                    <th style={{ ...compactThStyle, width: '20%' }}>Role</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td style={compactTextTdStyle} className="font-medium">
                                            {u.first_name} {u.last_name}
                                        </td>
                                        <td style={compactTextTdStyle}>{u.email}</td>
                                        <td style={compactTdStyle}>
                                            <Badge variant="default">
                                                {getUserRoleDisplay(u)}
                                            </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <Badge variant={u.is_active ? 'success' : 'warning'}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <div style={compactActionsStyle}>
                                                <button
                                                    onClick={() => {
                                                        setDetailUser(u);
                                                        setIsDetailModalOpen(true);
                                                    }}
                                                    style={actionButtonStyle('primary')}
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card>
            )}

            <UserDetailModal
                user={detailUser}
                opened={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
            />
        </div>
    );
};

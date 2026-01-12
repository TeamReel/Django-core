import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Alert, Card, Badge, Button } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import LoadingState from '../../../components/LoadingState';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import UserDetailModal from '../UserDetailModal';
import InviteMemberModal from '../InviteMemberModal';

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
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('');

    const [refreshKey, setRefreshKey] = useState(0);

    // Modals
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
                const orgs = await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                );
                setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
            } catch (e) { console.error(e); }
        };
        load();
    }, [isSuperAdmin, myOrganisations, refreshKey]);

    // Fetch Clubs/Teams options
    useEffect(() => {
        const load = async () => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            try {
                const [allClubs, allTeams] = await Promise.all([
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
                        { credentials: 'include' },
                        { ttlMs: 120_000, bypass: refreshKey > 0 },
                    ),
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
                        { credentials: 'include' },
                        { ttlMs: 120_000, bypass: refreshKey > 0 },
                    ),
                ]);
                setClubs(allClubs);
                setTeams(allTeams);
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, [refreshKey]);

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
                // organisations/:slug/members/ returns a slightly different envelope than DRF list.
                // Observed shapes:
                // - { data: { data: [...] }, meta: { pagination: ... } }
                // - { data: { results: [...] } }
                // - { results: [...] }
                const rawList = data?.data?.data || data?.data?.results || data?.results || data?.data || [];

                // Normalize into a user list (table expects flat user fields).
                // Some items represent organisation membership rows and contain a nested `user`.
                // Some items may represent project-membership-derived entries.
                const byKey = new Map<string, any>();
                for (const item of Array.isArray(rawList) ? rawList : []) {
                    const nestedUser = item?.user;
                    const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                    const key = String(u?.id ?? u?.email ?? item?.id ?? '');
                    if (!key) continue;

                    const normalized = {
                        id: String(u?.id ?? item?.id ?? key),
                        email: u?.email,
                        first_name: u?.first_name,
                        last_name: u?.last_name,
                        organisations: u?.organisations,
                        is_active: u?.is_active ?? item?.is_active ?? true,
                        role: item?.role ?? u?.role ?? 'User',
                    };

                    // Prefer richer records when duplicates exist.
                    const existing = byKey.get(key);
                    if (!existing) {
                        byKey.set(key, normalized);
                        continue;
                    }

                    const score = (v: any) =>
                        Number(Boolean(v?.email)) +
                        Number(Boolean(v?.first_name)) +
                        Number(Boolean(v?.last_name)) +
                        Number(Array.isArray(v?.organisations) && v.organisations.length > 0);
                    if (score(normalized) > score(existing)) {
                        byKey.set(key, normalized);
                    }
                }

                let results = Array.from(byKey.values());

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
    }, [selectedOrgId, selectedTeamId, selectedClubId, statusFilter, organisations, isSuperAdmin, refreshKey]);

    // Helper for role display logic
    const getUserRoleDisplay = (user: any) => {
        // Simple heuristic for now
        if (user.is_superuser) return 'Superadmin';
        // Try to find context role
        // This is complex without the full membership data structure logic from UsersPage
        // reusing 'role' field if present or falling back
         return user.role || 'User';
    };

    const sortedUsers = React.useMemo(() => {
        const sortKey = (value: unknown) => {
            const s = String(value ?? '').trim();
            return s ? s.toLocaleLowerCase() : '\uffff';
        };

        const getUserLabel = (u: any) => {
            const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            return label || u.email || '';
        };

        const list = [...users];
        list.sort((a: any, b: any) => {
            const byLabel = sortKey(getUserLabel(a)).localeCompare(sortKey(getUserLabel(b)));
            if (byLabel !== 0) return byLabel;
            return sortKey(a?.email).localeCompare(sortKey(b?.email));
        });
        return list;
    }, [users]);

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
                        {[...organisations].sort((a, b) => a.name.localeCompare(b.name)).map(o => (
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
                                            .sort((a, b) => String(a.name).localeCompare(String(b.name)))
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
                        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
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
                                         setStatusFilter('all');
                     if(isSuperAdmin) setSelectedOrgId('');
                 }}>
                     Clear
                 </Button>
                                 <Button
                                     variant="primary"
                                     onClick={() => {
                                         if (!selectedOrgId) {
                                             alert('Select a federation first to create a user.');
                                             return;
                                         }
                                         setIsInviteModalOpen(true);
                                     }}
                                 >
                                     Create User
                                 </Button>
            </div>

            <InviteMemberModal
              opened={isInviteModalOpen}
              onClose={() => setIsInviteModalOpen(false)}
              orgSlug={organisations.find(o => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)?.slug || selectedOrgId}
              onInviteSuccess={() => setRefreshKey((k) => k + 1)}
            />

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
                                    <th style={{ ...compactThStyle, width: '14%' }}>Federation</th>
                                    <th style={{ ...compactThStyle, width: '14%' }}>Club</th>
                                    <th style={{ ...compactThStyle, width: '14%' }}>Team</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Season</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Competition</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Match</th>
                                    <th style={{ ...compactThStyle, width: '18%' }}>Users</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map(u => {
                                    const orgName = (() => {
                                        if (!selectedOrgId) return '-';
                                        const match = organisations.find(o => String(o.id) === String(selectedOrgId) || (o as any).slug === selectedOrgId);
                                        return match?.name || '-';
                                    })();

                                    const clubName = (() => {
                                        if (!selectedClubId) return '-';
                                        const match = clubs.find(c => String(c.id) === String(selectedClubId));
                                        return match?.name || '-';
                                    })();

                                    const teamName = (() => {
                                        if (!selectedTeamId) return '-';
                                        const match = teams.find(t => String(t.id) === String(selectedTeamId));
                                        return match?.name || '-';
                                    })();

                                    const userLabel = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;

                                    return (
                                    <tr key={u.id}>
                                        <td style={compactTextTdStyle}>{orgName}</td>
                                        <td style={compactTextTdStyle}>{clubName}</td>
                                        <td style={compactTextTdStyle}>{teamName}</td>
                                        <td style={compactTdStyle}>-</td>
                                        <td style={compactTdStyle}>-</td>
                                        <td style={compactTdStyle}>-</td>
                                        <td style={compactTextTdStyle} className="font-medium">
                                            {userLabel}
                                            <div className="text-xs text-gray-500">{u.email}</div>
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
                                  );
                                })}
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

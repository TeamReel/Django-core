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
                const params = new URLSearchParams();
                params.set('page_size', '100');
                if (selectedOrgId) params.set('organisation_id', selectedOrgId);
                // Note: project_id on user endpoint might assume membership.
                // Currently UsersPage fetches all users then filters client side for projects usually,
                // or uses specific API if available.
                // The original UsersPage uses fetchAllPages logic sometimes or just list.
                // We'll reset users and fetch fresh.

                // Construct URL
                // If we want filtering by project at API level:
                // users/?project_id=...
                if (selectedTeamId) {
                    params.set('project_id', selectedTeamId);
                } else if (selectedClubId) {
                    params.set('project_id', selectedClubId);
                }

                const url = `${apiBaseUrl}/api/v1/users/?${params.toString()}`;
                const res = await fetch(url, { credentials: 'include' });

                if (!res.ok) throw new Error('Failed to fetch users');

                const data = await res.json();
                let results = data.data?.results || data.results || [];

                // Client side filtering for status if API doesn't support it or just to be safe
                if (statusFilter === 'active') {
                    results = results.filter((u: any) => u.is_active);
                } else if (statusFilter === 'inactive') {
                     results = results.filter((u: any) => !u.is_active);
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
             <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                {/* Org Filter */}
                {isSuperAdmin && (
                     <div className="w-full md:w-48">
                        <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Federation</label>
                        <select
                            className="w-full border rounded px-2 py-1 text-sm h-[34px]"
                            value={selectedOrgId}
                            onChange={(e) => {
                                setSelectedOrgId(e.target.value);
                                setSelectedClubId('');
                                setSelectedTeamId('');
                            }}
                        >
                            <option value="">All Federations</option>
                            {organisations.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </select>
                     </div>
                )}

                 {/* Club Filter */}
                <div className="w-full md:w-48">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Club</label>
                    <select
                        className="w-full border rounded px-2 py-1 text-sm h-[34px]"
                        value={selectedClubId}
                        onChange={(e) => {
                            setSelectedClubId(e.target.value);
                            setSelectedTeamId('');
                        }}
                    >
                        <option value="">All Clubs</option>
                        {clubs
                          .filter(c => !selectedOrgId ||
                            (typeof c.organisation === 'string' ? c.organisation === selectedOrgId : String(c.organisation?.id) === selectedOrgId))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Team Filter */}
                <div className="w-full md:w-48">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Team</label>
                    <select
                        className="w-full border rounded px-2 py-1 text-sm h-[34px]"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                         disabled={!selectedClubId && users.length > 500} // Opt
                    >
                        <option value="">All Teams</option>
                        {teams
                            .filter(t => {
                                // Filter by club parent
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
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-32">
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Status</label>
                    <select
                        className="w-full border rounded px-2 py-1 text-sm h-[34px]"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                 <Button variant="secondary" onClick={() => {
                     setSelectedClubId('');
                     setSelectedTeamId('');
                     setStatusFilter('active');
                     if(isSuperAdmin) setSelectedOrgId('');
                 }}>
                     Clear
                 </Button>
            </div>

            {isLoading && <LoadingState message="Loading users..." />}
            {error && <Alert variant="error">{error}</Alert>}

            {!isLoading && !error && users.length === 0 && (
                <Alert variant="info">No users found.</Alert>
            )}

            {!isLoading && !error && users.length > 0 && (
                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td className="font-medium">
                                            {u.first_name} {u.last_name}
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <Badge variant="default">
                                                {getUserRoleDisplay(u)}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Badge variant={u.is_active ? 'success' : 'warning'}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => {
                                                    setDetailUser(u);
                                                    setIsDetailModalOpen(true);
                                                }}
                                            >
                                                View
                                            </Button>
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

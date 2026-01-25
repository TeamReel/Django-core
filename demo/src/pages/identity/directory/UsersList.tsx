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
import {
    compactTableStyle,
    compactThStyle,
    compactTdStyle,
    compactTextTdStyle,
    compactActionsStyle,
    actionButtonStyle
} from '../../../utils/directoryStyles';


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

const TEAMREEL_ROLE_RANK: Record<string, number> = {
    superadmin: 100,
    'land admin': 90,
    'club admin': 80,
    'team admin': 70,
    'team member': 60,
    supporter: 50,
    user: 10,
};

const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);

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

const linkButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    color: 'var(--app-link, #0b5ed7)',
    cursor: 'pointer',
    textAlign: 'left',
    font: 'inherit',
    textDecoration: 'underline',
};

const badgeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
};

const badgeNoBorderStyle: React.CSSProperties = {
    border: 'none',
    borderColor: 'transparent',
    boxShadow: 'none',
    outline: 'none',
};

interface UsersListProps {
  preselectedOrgId?: string;
    preselectedClubId?: string;
    preselectedTeamId?: string;
}

export const UsersList: React.FC<UsersListProps> = ({ preselectedOrgId, preselectedClubId, preselectedTeamId }) => {
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
    const [availableRoles] = useState<string[]>([
        'Land Admin',
        'Club Admin',
        'Team Admin',
        'Team Member',
        'Supporter',
    ]);

    // Filter State
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || ''); // For filtering logic
    const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || ''); // For filtering logic
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('');

    const [refreshKey, setRefreshKey] = useState(0);

    // Modals
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const userRole = String((user as any)?.role || '').toLowerCase();
    const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

    const orgLocked = Boolean(preselectedOrgId);
    const clubLocked = Boolean(preselectedClubId);
    const teamLocked = Boolean(preselectedTeamId);

    const scopedLocked = orgLocked || clubLocked || teamLocked;

    const isNumericId = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());

    const getCsrfToken = () =>
        document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';

    const getSelectedOrgSlug = () => {
        const selectedOrg = selectedOrgId
            ? organisations.find(o => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
            : null;
        return selectedOrg?.slug || context.organisation?.slug || selectedOrgId;
    };

    const isUuid = (value: unknown) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

    // Initial Filter Setup
    useEffect(() => {
        if (preselectedOrgId) {
            setSelectedOrgId(preselectedOrgId);
            return;
        }

        const orgParam = searchParams.get('org_id');
        if (orgParam) {
            setSelectedOrgId(orgParam);
            return;
        }

        // Default to the current context org (also for superadmin) so we don't
        // accidentally load the first org in the list.
        if (context.organisation?.id) {
            setSelectedOrgId(String(context.organisation.id));
        }
    }, [preselectedOrgId, context.organisation?.id, searchParams]);

    useEffect(() => {
        if (preselectedClubId) {
            setSelectedClubId(String(preselectedClubId));
        }
    }, [preselectedClubId]);

    useEffect(() => {
        if (preselectedTeamId) {
            setSelectedTeamId(String(preselectedTeamId));
        }
    }, [preselectedTeamId]);

    // Fetch Orgs (SuperAdmin)
    useEffect(() => {
        if (!isSuperAdmin) {
            setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })));
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
            } catch (e) {
                console.error(e);
            }
        };

        void load();
    }, [isSuperAdmin, myOrganisations, refreshKey]);

    // Fetch Clubs/Teams options
    useEffect(() => {
        const load = async () => {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

            // Scope club/team options to a single organisation to avoid fetching
            // every project in the system (which makes this page slow).
            const selectedOrg = selectedOrgId
                ? organisations.find(o => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
                : null;
            const orgSlugForApi =
                selectedOrg?.slug ||
                (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
                context.organisation?.slug ||
                '';

            if (!orgSlugForApi) {
                setClubs([]);
                setTeams([]);
                return;
            }
            try {
                const [allClubs, allTeams] = await Promise.all([
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=500&parent_project__isnull=true`,
                        { credentials: 'include' },
                        { ttlMs: 120_000, bypass: refreshKey > 0 },
                    ),
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/organisations/${orgSlugForApi}/projects/?page_size=2000&parent_project__isnull=false`,
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
    }, [context.organisation?.slug, organisations, refreshKey, selectedOrgId]);

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
                params.set('include_project_membership_details', 'true');

                // Use the organisations/:slug/members/ endpoint.
                // Prefer the selected org; fall back to the active context org.
                let orgSlug =
                    selectedOrg?.slug ||
                    (!isNumericId(selectedOrgId) && !isUuid(selectedOrgId) ? selectedOrgId : '') ||
                    context.organisation?.slug ||
                    (organisations.length > 0 ? organisations[0].slug : undefined);

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
                        is_superuser: Boolean((u as any)?.is_superuser),
                        is_active: u?.is_active ?? item?.is_active ?? true,
                        // IMPORTANT: item.role is typically the *membership role* (member/viewer/admin),
                        // not the TeamReel RBAC role (Club Admin/Team Admin/etc). Don't use it as the user role.
                        role: (u as any)?.role ?? 'User',
                        role_label: (u as any)?.role_label ?? (item as any)?.role_label,
                        role_assignments:
                            (u as any)?.role_assignments ||
                            (item as any)?.role_assignments ||
                            (u as any)?.rbac_role_assignments ||
                            (item as any)?.rbac_role_assignments ||
                            [],
                        // Preserve context for table columns + filters.
                        membership: {
                            id: item?.id,
                            organisation: item?.organisation,
                            role: item?.role,
                            source: item?.source,
                            joined_at: item?.joined_at,
                            invited_by: item?.invited_by,
                        },
                        organisation: item?.organisation,
                        source: item?.source,
                        joined_at: item?.joined_at,
                        invited_by: item?.invited_by,
                        project_memberships: item?.project_memberships || u?.project_memberships || [],
                    };

                    // Prefer richer records when duplicates exist.
                    const existing = byKey.get(key);
                    if (!existing) {
                        byKey.set(key, normalized);
                        continue;
                    }

                    // Merge project memberships when duplicates exist.
                    const mergedMemberships = [
                        ...(Array.isArray(existing?.project_memberships) ? existing.project_memberships : []),
                        ...(Array.isArray(normalized?.project_memberships) ? normalized.project_memberships : []),
                    ];
                    const merged = { ...existing, ...normalized, project_memberships: mergedMemberships };

                    const score = (v: any) =>
                        Number(Boolean(v?.email)) +
                        Number(Boolean(v?.first_name)) +
                        Number(Boolean(v?.last_name)) +
                        Number(Array.isArray(v?.organisations) && v.organisations.length > 0);
                    if (score(merged) > score(existing)) {
                        byKey.set(key, merged);
                    }
                }

                let results = Array.from(byKey.values());

                // Client-side filtering for project membership
                if (selectedTeamId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some((m: any) =>
                            String(m.project_id ?? m.project?.id ?? m.project?.project_id ?? '') ===
                                String(selectedTeamId)
                        )
                    );
                } else if (selectedClubId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some((m: any) =>
                            // Match either a direct club membership, or a team whose parent is the selected club.
                            String(m.project_id ?? m.project?.id ?? '') === String(selectedClubId) ||
                            String(m.project?.parent_id ?? m.project?.parent_project_id ?? '') === String(selectedClubId)
                        )
                    );
                }

                // Client side filtering for status
                if (statusFilter === 'active') {
                    results = results.filter((u: any) => u.is_active !== false);
                } else if (statusFilter === 'inactive') {
                     results = results.filter((u: any) => u.is_active === false);
                }

                // Client-side filtering for RBAC role (label)
                if (roleFilter) {
                    const wanted = normalizeRoleName(roleFilter);
                    results = results.filter((u: any) => {
                        const roleNames = getUserTeamreelRoleNames(u);
                        return roleNames.some((r) => normalizeRoleName(r) === wanted);
                    });
                }

                setUsers(results);

            } catch (e) {
                 setError(e instanceof Error ? e.message : 'Error loading users');
            } finally {
                setIsLoading(false);
            }
        };

        loadUsers();
    }, [selectedOrgId, selectedTeamId, selectedClubId, statusFilter, roleFilter, organisations, isSuperAdmin, refreshKey]);

    const normalizeRoleName = (value: unknown) => String(value ?? '').trim().toLowerCase();

    const parseAssignmentRoleLabel = (raw: unknown) => {
        const s = String(raw ?? '').trim();
        if (!s) return '';
        // When include_role_assignments=true, membership entries can look like:
        // "Team Admin (Ajax 1)".
        const beforeParen = s.split('(')[0]?.trim();
        return beforeParen || s;
    };

    const mapMembershipToTeamreelRole = (membershipRoleRaw: unknown, hasParentProject: boolean) => {
        const membershipRole = normalizeRoleName(membershipRoleRaw);
        const isAdminLike = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole);
        if (isAdminLike) return hasParentProject ? 'Team Admin' : 'Club Admin';
        // Treat everything else as non-admin (viewer/player/member/etc)
        return hasParentProject ? 'Team Member' : 'Supporter';
    };

    const getUserTeamreelRoleNames = (user: any): string[] => {
        if (!user) return [];

        const roles: string[] = [];

        // Superuser is the highest priority.
        const isSuper = Boolean(user?.is_superuser) || normalizeRoleName(user?.role) === 'superadmin';
        if (isSuper) {
            roles.push('Superadmin');
            return roles;
        }

        // Organisation membership role: admin == Land Admin in TeamReel.
        // Note: when include_role_assignments=true, this can also be an assignment label.
        const membershipSource = normalizeRoleName(user?.membership?.source);
        const membershipRoleRaw = user?.membership?.role;
        if (membershipSource === 'assignment') {
            const assignmentLabel = parseAssignmentRoleLabel(membershipRoleRaw);
            if (assignmentLabel) roles.push(assignmentLabel);
        } else {
            const orgMembershipRole = normalizeRoleName(membershipRoleRaw);
            if (orgMembershipRole === 'admin') roles.push('Land Admin');
        }

        const memberships = Array.isArray(user?.project_memberships) ? user.project_memberships : [];
        const scopedMemberships = memberships.filter((m: any) => {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
            if (!projectId) return false;

            if (selectedTeamId) return projectId === String(selectedTeamId);

            if (selectedClubId) {
                if (projectId === String(selectedClubId)) return true;
                const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
                const parentId = parentIdRaw === null || parentIdRaw === undefined ? '' : String(parentIdRaw).trim();
                return parentId === String(selectedClubId);
            }

            return true;
        });

        for (const m of scopedMemberships) {
            const roleRaw = String(m?.role ?? '').trim();
            if (!roleRaw) continue;
            const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
            const hasParentProject = Boolean(parentIdRaw);
            roles.push(mapMembershipToTeamreelRole(roleRaw, hasParentProject));
        }

        // Normalize and de-duplicate (case-insensitive)
        const uniqueByKey = new Map<string, string>();
        for (const r of roles) {
            const key = normalizeRoleName(r);
            if (!key) continue;
            if (!uniqueByKey.has(key)) uniqueByKey.set(key, r);
        }
        return Array.from(uniqueByKey.values());
    };

    // Helper for role display logic
    const getUserRoleDisplay = (user: any): { label: string; title: string } => {
        if (!user) return { label: '-', title: '' };

        const roles = getUserTeamreelRoleNames(user);
        if (roles.length > 0) {
            const best = [...roles].sort(
                (a, b) => (TEAMREEL_ROLE_RANK[normalizeRoleName(b)] ?? 0) - (TEAMREEL_ROLE_RANK[normalizeRoleName(a)] ?? 0)
            )[0];
            const title = [...roles].sort((a, b) => a.localeCompare(b)).join(', ');
            const label = roles.length === 1 ? best : `${best} +${roles.length - 1}`;
            return { label, title };
        }

        return { label: 'User', title: 'User' };
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

    const clubsById = useMemo(() => {
        const map = new Map<string, ProjectOption>();
        for (const c of clubs) map.set(String(c.id), c);
        return map;
    }, [clubs]);

    const teamsById = useMemo(() => {
        const map = new Map<string, ProjectOption>();
        for (const t of teams) map.set(String(t.id), t);
        return map;
    }, [teams]);

    const teamIdsByClubId = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const t of teams) {
            const teamId = String(t?.id ?? '').trim();
            if (!teamId) continue;
            const clubId = String((t as any)?.parent_id ?? (t as any)?.parent_project?.id ?? (t as any)?.parent_project_id ?? '').trim();
            if (!clubId) continue;
            const existing = map.get(clubId);
            if (existing) {
                if (!existing.includes(teamId)) existing.push(teamId);
            } else {
                map.set(clubId, [teamId]);
            }
        }
        return map;
    }, [teams]);

    const getUserSeasonCompetitionMatchCounts = (u: any) => {
        const allowedTeamIds = new Set<string>();

        // Respect active filters first.
        if (selectedTeamId) {
            allowedTeamIds.add(String(selectedTeamId));
        } else if (selectedClubId) {
            for (const tid of teamIdsByClubId.get(String(selectedClubId)) || []) {
                allowedTeamIds.add(String(tid));
            }
        }

        // Otherwise, derive scope from memberships.
        if (allowedTeamIds.size === 0) {
            const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
            for (const m of memberships) {
                const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
                if (!projectId) continue;
                if (teamsById.has(projectId)) {
                    allowedTeamIds.add(projectId);
                    continue;
                }
                if (clubsById.has(projectId)) {
                    for (const tid of teamIdsByClubId.get(projectId) || []) {
                        allowedTeamIds.add(String(tid));
                    }
                }
            }
        }

        let seasonsCount = 0;
        let competitionsCount = 0;
        let matchesCount = 0;
        for (const teamId of allowedTeamIds) {
            const t = teamsById.get(String(teamId));
            seasonsCount += Number((t as any)?.seasons_count ?? 0) || 0;
            competitionsCount += Number((t as any)?.competitions_count ?? 0) || 0;
            matchesCount += Number((t as any)?.matches_count ?? 0) || 0;
        }

        return { seasonsCount, competitionsCount, matchesCount };
    };

    const getPreferredScopeIdsForRow = (u: any): { clubId: string; teamId: string } => {
        // Respect active filters first.
        if (selectedTeamId) {
            const team = teamsById.get(String(selectedTeamId));
            const clubId = String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? (team as any)?.parent_project_id ?? '').trim();
            return { clubId, teamId: String(selectedTeamId) };
        }

        if (selectedClubId) {
            return { clubId: String(selectedClubId), teamId: '' };
        }

        // Otherwise derive from memberships.
        const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
        const teamIds: string[] = [];
        const clubIds: string[] = [];

        for (const m of memberships) {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
            if (!projectId) continue;
            if (teamsById.has(projectId)) {
                teamIds.push(projectId);
                continue;
            }
            if (clubsById.has(projectId)) {
                clubIds.push(projectId);
            }
        }

        // Prefer a team id if we have one.
        const pickedTeamId = teamIds.find(Boolean) || '';
        if (pickedTeamId) {
            const team = teamsById.get(String(pickedTeamId));
            const clubId = String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? (team as any)?.parent_project_id ?? '').trim();
            return { clubId, teamId: pickedTeamId };
        }

        // Else fall back to a club id.
        const pickedClubId = clubIds.find(Boolean) || '';
        return { clubId: pickedClubId, teamId: '' };
    };

    const buildOrgScopedDirectoryHref = (section: 'seasons' | 'competitions' | 'matches', u: any): string | null => {
        const orgSlug = String(getSelectedOrgSlug() || '').trim();
        if (!orgSlug) return null;

        const { clubId, teamId } = getPreferredScopeIdsForRow(u);
        const params = new URLSearchParams();
        if (clubId) params.set('club_id', String(clubId));
        if (teamId) params.set('team_id', String(teamId));
        const qs = params.toString();
        return qs ? `/${orgSlug}/${section}?${qs}` : `/${orgSlug}/${section}`;
    };

    const getFederationNameForRow = (u: any) => {
        // Prefer per-row membership organisation (from /organisations/:slug/members/)
        if (u?.membership?.organisation?.name) return String(u.membership.organisation.name);
        if (u?.organisation?.name) return String(u.organisation.name);
        // Fallback: user's orgs array
        const org0 = Array.isArray(u?.organisations) ? u.organisations[0] : null;
        if (org0?.name) return String(org0.name);
        // Fallback: selected org
        const selectedOrg = selectedOrgId
            ? organisations.find(o => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId)
            : null;
        return selectedOrg?.name || '-';
    };

    const summarizeNames = (names: string[]) => {
        const cleaned = names.map(n => String(n || '').trim()).filter(Boolean);
        if (cleaned.length === 0) return { label: '-', title: '' };
        const unique = Array.from(new Set(cleaned));
        if (unique.length === 1) return { label: unique[0], title: unique[0] };
        return { label: `${unique[0]} +${unique.length - 1}`, title: unique.join(', ') };
    };

    const getOrganisationLinkForRow = (u: any) => {
        const fromMembership = u?.membership?.organisation;
        const fromRow = u?.organisation;
        const slugOrId =
            fromMembership?.slug ??
            fromMembership?.id ??
            fromRow?.slug ??
            fromRow?.id ??
            getSelectedOrgSlug();
        if (!slugOrId) return null;
        return `/organisations/${slugOrId}`;
    };

    const getUserDetailHrefForRow = (u: any): string | null => {
        const userId = u?.id ? String(u.id).trim() : '';
        if (!userId) return null;
        return `/users/${userId}`;
    };

    const getClubAndTeamLinksForRow = (u: any) => {
        const orgSlug = getSelectedOrgSlug();
        if (!orgSlug) return { clubHref: null as string | null, teamHref: null as string | null };

        const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];

        const clubIds: string[] = [];
        const teamTuples: Array<{ teamId: string; clubId?: string }> = [];

        // Respect active filters (makes link targets predictable).
        if (selectedTeamId) {
            const team = teamsById.get(String(selectedTeamId));
            const clubId = String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '') || undefined;
            teamTuples.push({ teamId: String(selectedTeamId), clubId });
        }

        if (selectedClubId) {
            clubIds.push(String(selectedClubId));
        }

        // Otherwise derive from enriched membership details.
        if (!selectedClubId || !selectedTeamId) {
            for (const m of memberships) {
                const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
                if (!projectId) continue;

                const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
                const parentId = parentIdRaw === null || parentIdRaw === undefined ? '' : String(parentIdRaw).trim();

                if (parentId) {
                    // Team membership with a parent club.
                    teamTuples.push({ teamId: projectId, clubId: parentId });
                    clubIds.push(parentId);
                    continue;
                }

                // Might be a direct club membership.
                if (clubsById.has(projectId)) {
                    clubIds.push(projectId);
                }
            }
        }

        const clubId = clubIds.find(Boolean) || null;
        const teamTuple = teamTuples.find(t => Boolean(t?.teamId)) || null;

        const clubHref = clubId ? `/organisations/${orgSlug}/projects/${clubId}` : null;

        const teamHref = teamTuple?.teamId
            ? (teamTuple?.clubId
                ? `/organisations/${orgSlug}/projects/${teamTuple.clubId}/teams/${teamTuple.teamId}`
                : `/organisations/${orgSlug}/projects/${teamTuple.teamId}`)
            : null;

        return { clubHref, teamHref };
    };

    const getClubAndTeamForRow = (u: any) => {
        // If user is filtering by club/team, we can always show those.
        if (selectedTeamId) {
            const team = teamsById.get(String(selectedTeamId));
            const clubId = String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '');
            const club = clubId ? clubsById.get(clubId) : undefined;
            return {
                club: { label: club?.name || '-', title: club?.name || '' },
                team: { label: team?.name || '-', title: team?.name || '' },
            };
        }

        if (selectedClubId) {
            const club = clubsById.get(String(selectedClubId));
            // If we have memberships, try to pick a team under this club.
            const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
            const teamIds = memberships
                .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
                .filter(Boolean);
            const teamUnderClub = teamIds
                .map((id: string) => teamsById.get(id))
                .find((t: ProjectOption | undefined) => {
                    const parentId = String((t as any)?.parent_id ?? (t as any)?.parent_project?.id ?? '');
                    return parentId && club && String(parentId) === String(club.id);
                });

            return {
                club: { label: club?.name || '-', title: club?.name || '' },
                team: { label: teamUnderClub?.name || '-', title: teamUnderClub?.name || '' },
            };
        }

        // Otherwise, derive from memberships.
        const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
        const projectIds = memberships
            .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
            .filter(Boolean);

        const teamNames: string[] = [];
        const clubNames: string[] = [];

        for (const id of projectIds) {
            const team = teamsById.get(id);
            if (team?.name) {
                teamNames.push(String(team.name));
                const clubId = String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '');
                const club = clubId ? clubsById.get(clubId) : undefined;
                if (club?.name) clubNames.push(String(club.name));
                continue;
            }

            const club = clubsById.get(id);
            if (club?.name) {
                clubNames.push(String(club.name));
            }
        }

        return {
            club: summarizeNames(clubNames),
            team: summarizeNames(teamNames),
        };
    };

    return (
        <div>
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                {isSuperAdmin && !orgLocked && (
                    <select
                        value={selectedOrgId}
                        onChange={(e) => {
                            const next = e.target.value;
                            setSelectedOrgId(next);
                            if (!clubLocked) setSelectedClubId('');
                            if (!teamLocked) setSelectedTeamId('');

                            if (next) {
                                setSearchParams({ org_id: next });
                            } else {
                                setSearchParams({});
                            }
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

                {!clubLocked && (
                    <select
                        value={selectedClubId}
                        onChange={(e) => {
                            if (clubLocked) return;
                            setSelectedClubId(e.target.value);
                            if (!teamLocked) setSelectedTeamId('');
                        }}
                        disabled={clubLocked}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid var(--app-border)',
                            borderRadius: '4px',
                            fontSize: '14px',
                            backgroundColor: 'var(--app-surface)',
                        }}
                    >
                        {!clubLocked && <option value="">Club: All</option>}
                        {clubs
                                                                                            .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                {!teamLocked && (
                    <select
                        value={selectedTeamId}
                        onChange={(e) => {
                            if (teamLocked) return;
                            setSelectedTeamId(e.target.value);
                        }}
                        disabled={teamLocked}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid var(--app-border)',
                            borderRadius: '4px',
                            fontSize: '14px',
                            backgroundColor: 'var(--app-surface)',
                        }}
                    >
                        {!teamLocked && <option value="">Team: All</option>}
                        {teams
                            .filter(t => {
                                if (selectedClubId) {
                                     const parent = t.parent_id || (typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project);
                                     return String(parent) === String(selectedClubId);
                                }
                                return true;
                            })
                            .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                            .map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}

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

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid var(--app-border)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'var(--app-surface)',
                    }}
                >
                    <option value="">Role: All</option>
                    {availableRoles.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>

                 <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                     <Button
                         variant="secondary"
                         size="md"
                         onClick={() => {
                             if (!clubLocked) setSelectedClubId('');
                             if (!teamLocked) setSelectedTeamId('');
                             setStatusFilter('all');
                             setRoleFilter('');
                             if (isSuperAdmin && !orgLocked) {
                                 setSelectedOrgId('');
                                 setSearchParams({});
                             }
                         }}
                     >
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
                                    {!orgLocked && (
                                      <th style={{ ...compactThStyle, width: '14%' }}>Federation</th>
                                    )}
                                                                        {!clubLocked && (
                                                                            <th style={{ ...compactThStyle, width: '14%' }}>Club</th>
                                                                        )}
                                    <th style={{ ...compactThStyle, width: '10%' }}>Season</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Competition</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Match</th>
                                    <th style={{ ...compactThStyle, width: '12%' }}>Username</th>
                                    <th style={{ ...compactThStyle, width: '14%' }}>Email</th>
                                    <th style={{ ...compactThStyle, width: '8%' }}>Role</th>
                                    <th style={{ ...compactThStyle, width: '10%' }}>Status</th>
                                    <th style={{ ...compactThStyle, width: '12%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map(u => {
                                    const orgName = getFederationNameForRow(u);
                                    const scoped = getClubAndTeamForRow(u);

                                    const orgHref = getOrganisationLinkForRow(u);
                                    const { clubHref } = getClubAndTeamLinksForRow(u);

                                    const membershipId = u?.membership?.id ?? u?.membership_id ?? u?.member_id ?? null;
                                    const source = String(u?.membership?.source ?? u?.source ?? '').toLowerCase();
                                    const isDirectMembership = Boolean(membershipId) && isUuid(membershipId) && !source;

                                                                        const usernameLabel =
                                                                            String((u as any)?.username || '').trim() ||
                                                                            `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                                                                            (String(u.email || '').includes('@') ? String(u.email || '').split('@')[0] : String(u.email || ''));
                                    const roleDisplay = getUserRoleDisplay(u);
                                                                        const counts = getUserSeasonCompetitionMatchCounts(u);

                                    return (
                                    <tr key={u.id}>
                                        {!orgLocked && (
                                          <td style={compactTextTdStyle} title={orgName}>
                                              {orgHref && orgName !== '-' ? (
                                                  <button style={linkButtonStyle} onClick={() => navigate(orgHref)}>
                                                      {orgName}
                                                  </button>
                                              ) : (
                                                  orgName
                                              )}
                                          </td>
                                        )}
                                        {!clubLocked && (
                                          <td style={compactTextTdStyle} title={scoped.club.title}>
                                              {clubHref && scoped.club.label !== '-' ? (
                                                  <button style={linkButtonStyle} onClick={() => navigate(clubHref)}>
                                                      {scoped.club.label}
                                                  </button>
                                              ) : (
                                                  scoped.club.label
                                              )}
                                          </td>
                                        )}
                                        <td style={compactTdStyle}>
                                            <button
                                                type="button"
                                                style={badgeButtonStyle}
                                                title="View seasons"
                                                onClick={() => {
                                                    const href = buildOrgScopedDirectoryHref('seasons', u);
                                                    if (href) navigate(href);
                                                }}
                                            >
                                                <Badge variant="default" style={scopedLocked ? badgeNoBorderStyle : undefined}>
                                                    {counts.seasonsCount}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <button
                                                type="button"
                                                style={badgeButtonStyle}
                                                title="View competitions"
                                                onClick={() => {
                                                    const href = buildOrgScopedDirectoryHref('competitions', u);
                                                    if (href) navigate(href);
                                                }}
                                            >
                                                <Badge variant="default" style={scopedLocked ? badgeNoBorderStyle : undefined}>
                                                    {counts.competitionsCount}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <button
                                                type="button"
                                                style={badgeButtonStyle}
                                                title="View matches"
                                                onClick={() => {
                                                    const href = buildOrgScopedDirectoryHref('matches', u);
                                                    if (href) navigate(href);
                                                }}
                                            >
                                                <Badge variant="default" style={scopedLocked ? badgeNoBorderStyle : undefined}>
                                                    {counts.matchesCount}
                                                </Badge>
                                            </button>
                                        </td>
                                        <td style={compactTextTdStyle} className="font-medium">
                                            {u?.id ? (
                                                <button
                                                    style={linkButtonStyle}
                                                    onClick={() => {
                                                        const href = getUserDetailHrefForRow(u);
                                                        if (href) navigate(href);
                                                    }}
                                                    title="Open user"
                                                >
                                                    {usernameLabel}
                                                </button>
                                            ) : (
                                                usernameLabel
                                            )}
                                        </td>
                                        <td style={compactTextTdStyle} title={String(u.email || '')}>
                                            {u.email}
                                        </td>
                                        <td style={compactTdStyle} title={roleDisplay.title}>
                                            <Badge variant="default" style={scopedLocked ? badgeNoBorderStyle : undefined}>
                                                {roleDisplay.label}
                                            </Badge>
                                        </td>
                                        <td style={compactTdStyle}>
                                            <Badge variant={u.is_active ? 'success' : 'warning'} style={scopedLocked ? badgeNoBorderStyle : undefined}>
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

                                                {isDirectMembership && (
                                                    <button
                                                        onClick={() => {
                                                            const orgSlug = getSelectedOrgSlug();
                                                            if (!orgSlug) {
                                                                alert('Select a federation first.');
                                                                return;
                                                            }
                                                            navigate(`/organisations/${orgSlug}/members/${membershipId}?action=edit`);
                                                        }}
                                                        style={actionButtonStyle('warning')}
                                                    >
                                                        Edit
                                                    </button>
                                                )}

                                                {isDirectMembership && (
                                                    <button
                                                        onClick={async () => {
                                                            const orgSlug = getSelectedOrgSlug();
                                                            if (!orgSlug) {
                                                                alert('Select a federation first.');
                                                                return;
                                                            }
                                                            if (!window.confirm(`Remove ${usernameLabel} from ${orgName}?`)) return;

                                                            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                                                            const csrfToken = getCsrfToken();

                                                            const res = await fetch(
                                                                `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${membershipId}/`,
                                                                {
                                                                    method: 'DELETE',
                                                                    headers: {
                                                                        'X-CSRFToken': csrfToken,
                                                                        'X-Requested-With': 'XMLHttpRequest',
                                                                    },
                                                                    credentials: 'include',
                                                                }
                                                            );

                                                            if (!res.ok) {
                                                                const text = await res.text().catch(() => '');
                                                                alert(text || `Failed to delete member (${res.status})`);
                                                                return;
                                                            }

                                                            // Update local table without full reload.
                                                            setUsers((prev) => prev.filter((row: any) => {
                                                                const rowMembershipId = row?.membership?.id ?? row?.membership_id ?? row?.member_id;
                                                                return String(rowMembershipId) !== String(membershipId);
                                                            }));
                                                        }}
                                                        style={actionButtonStyle('danger')}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
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

/**
 * UsersListData — Data fetching sub-hook
 *
 * Owns the fetch effects for organisations, clubs/teams, and users.
 * Returns the fetched data + loading/error state + refresh trigger.
 */
import { useEffect, useState } from 'react';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { OrganisationOption, ProjectOption } from './usersListTypes';
import { normalizeRoleName, getUserTeamreelRoleNames } from './usersListHelpers';

/* ------------------------------------------------------------------ */
/*  Params                                                             */
/* ------------------------------------------------------------------ */

export interface UsersListFetcherParams {
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    statusFilter: string;
    roleFilter: string;
    isSuperAdmin: boolean;
    myOrganisations: any[];
    contextOrgSlug: string | undefined;
    teamLocked: boolean;
    preselectedTeamId: string | undefined;
    preselectedClubId: string | undefined;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUsersListFetchers(params: UsersListFetcherParams) {
    const {
        selectedOrgId, selectedClubId, selectedTeamId,
        statusFilter, roleFilter,
        isSuperAdmin, myOrganisations, contextOrgSlug,
        teamLocked, preselectedTeamId, preselectedClubId,
    } = params;

    const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
    const [clubs, setClubs] = useState<ProjectOption[]>([]);
    const [teams, setTeams] = useState<ProjectOption[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    /* ── Fetch organisations ──────────────────────────────────── */

    useEffect(() => {
        if (!isSuperAdmin) {
            setOrganisations(
                myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
            );
            return;
        }
        const load = async () => {
            const apiBaseUrl = getApiBaseUrl();
            try {
                const orgs = await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
                    { credentials: 'include' },
                    { ttlMs: 120_000, bypass: refreshKey > 0 },
                );
                setOrganisations(
                    (orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })),
                );
            } catch (e) {
                console.error(e);
            }
        };
        void load();
    }, [isSuperAdmin, myOrganisations, refreshKey]);

    /* ── Fetch clubs & teams ──────────────────────────────────── */

    useEffect(() => {
        const load = async () => {
            const apiBaseUrl = getApiBaseUrl();
            const selectedOrg = selectedOrgId
                ? organisations.find(
                    (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
                )
                : null;

            if (selectedOrgId && !selectedOrg) {
                setClubs([]);
                setTeams([]);
                return;
            }

            const orgSlugForApi =
                selectedOrg?.slug || (!selectedOrgId ? contextOrgSlug : '') || '';

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
    }, [contextOrgSlug, organisations, refreshKey, selectedOrgId]);

    /* ── Fetch users ──────────────────────────────────────────── */

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoading(true);
            setError(null);
            const apiBaseUrl = getApiBaseUrl();

            try {
                // Team-locked path: fetch from /projects/:id/members/
                if (teamLocked && preselectedTeamId) {
                    const teamMembersUrl = `${apiBaseUrl}/api/v1/projects/${preselectedTeamId}/members/?page_size=500`;
                    const res = await fetch(teamMembersUrl, { credentials: 'include' });
                    if (!res.ok) throw new Error('Failed to fetch team members');

                    const data = await res.json();
                    const rawList =
                        data?.data?.data ||
                        data?.data?.results ||
                        data?.results ||
                        (Array.isArray(data?.data) ? data.data : []);

                    const allEntries = (Array.isArray(rawList) ? rawList : []).map((item: any) => {
                        const nestedUser = item?.user;
                        const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                        return {
                            id: String(u?.id ?? ''),
                            email: u?.email,
                            first_name: u?.first_name,
                            last_name: u?.last_name,
                            avatar_url: u?.avatar_url ?? null,
                            is_active: u?.is_active ?? item?.is_active ?? true,
                            role: item?.role ?? 'viewer',
                            functional_roles: item?.functional_roles ?? [],
                            project_membership_id: String(item?.id ?? ''),
                            membership: {
                                id: item?.id,
                                role: item?.role,
                                source: item?.source,
                                joined_at: item?.joined_at,
                            },
                            source: item?.source,
                            joined_at: item?.joined_at,
                            project_memberships: [
                                {
                                    id: item?.id,
                                    role: item?.role ?? 'viewer',
                                    project_id: preselectedTeamId,
                                    project: {
                                        id: preselectedTeamId,
                                        parent_id: preselectedClubId || 'parent',
                                    },
                                },
                            ],
                            _period: item?.period ?? null,
                            _metadata: item?.metadata ?? {},
                            _created_at: item?.created_at ?? '',
                        };
                    });

                    // Dedup by user id — prefer entry with period / richer metadata
                    const byUserId = new Map<string, any>();
                    for (const entry of allEntries) {
                        const key = entry.id;
                        if (!key) continue;
                        const existing = byUserId.get(key);
                        if (!existing) {
                            byUserId.set(key, entry);
                            continue;
                        }
                        const score = (e: any) => {
                            let s = 0;
                            if (e._period) s += 100;
                            if (e._metadata && Object.keys(e._metadata).length > 0) s += 10;
                            if (e.functional_roles?.length > 0) s += 5;
                            return s;
                        };
                        if (score(entry) > score(existing)) byUserId.set(key, entry);
                    }

                    let results = Array.from(byUserId.values());
                    if (statusFilter === 'active') {
                        results = results.filter((u: any) => u.is_active !== false);
                    } else if (statusFilter === 'inactive') {
                        results = results.filter((u: any) => u.is_active === false);
                    }
                    setUsers(results);
                    return;
                }

                // Org-scoped path
                const selectedOrg = selectedOrgId
                    ? organisations.find(
                        (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
                    )
                    : null;

                if (!selectedOrg?.slug && !isSuperAdmin) {
                    setUsers([]);
                    return;
                }

                const urlParams = new URLSearchParams();
                urlParams.set('page_size', '250');
                urlParams.set('include_project_memberships', 'true');
                urlParams.set('include_project_membership_details', 'true');
                if (selectedClubId) urlParams.set('project_id', String(selectedClubId));

                const orgSlug =
                    selectedOrg?.slug || (!selectedOrgId ? contextOrgSlug : '') || '';

                if (selectedOrgId && !selectedOrg) {
                    setUsers([]);
                    setIsLoading(false);
                    return;
                }
                if (!orgSlug) {
                    setUsers([]);
                    setIsLoading(false);
                    return;
                }

                const url = `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/?${urlParams.toString()}`;
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to fetch users');

                const data = await res.json();
                const rawList =
                    data?.data?.data || data?.data?.results || data?.results || data?.data || [];

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
                        role: (u as any)?.role ?? 'User',
                        role_label: (u as any)?.role_label ?? (item as any)?.role_label,
                        role_assignments:
                            (u as any)?.role_assignments ||
                            (item as any)?.role_assignments ||
                            (u as any)?.rbac_role_assignments ||
                            (item as any)?.rbac_role_assignments ||
                            [],
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

                    const existing = byKey.get(key);
                    if (!existing) {
                        byKey.set(key, normalized);
                        continue;
                    }

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

                // Client-side project membership filtering
                if (selectedTeamId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some(
                            (m: any) =>
                                String(m.project_id ?? m.project?.id ?? m.project?.project_id ?? '') ===
                                String(selectedTeamId),
                        ),
                    );
                } else if (selectedClubId) {
                    results = results.filter((u: any) =>
                        u.project_memberships?.some(
                            (m: any) =>
                                String(m.project_id ?? m.project?.id ?? '') === String(selectedClubId),
                        ),
                    );
                }

                if (statusFilter === 'active') {
                    results = results.filter((u: any) => u.is_active !== false);
                } else if (statusFilter === 'inactive') {
                    results = results.filter((u: any) => u.is_active === false);
                }

                if (roleFilter) {
                    const wanted = normalizeRoleName(roleFilter);
                    results = results.filter((u: any) => {
                        const roleNames = getUserTeamreelRoleNames(u, selectedTeamId, selectedClubId);
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
    }, [
        selectedOrgId,
        selectedTeamId,
        selectedClubId,
        statusFilter,
        roleFilter,
        organisations,
        isSuperAdmin,
        refreshKey,
        teamLocked,
        preselectedTeamId,
    ]);

    /* ── Return ───────────────────────────────────────────────── */

    return {
        organisations,
        clubs,
        teams,
        users,
        setUsers,
        isLoading,
        error,
        refreshData: () => setRefreshKey((k) => k + 1),
    };
}

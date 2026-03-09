/**
 * UsersListData — Data fetching sub-hook
 *
 * Owns the fetch effects for organisations, clubs/teams, and users.
 * Returns the fetched data + loading/error state + refresh trigger.
 */
import { useEffect, useState } from 'react';
import { api } from '../../../api/client';
import { organisationsApi } from '../../../api';
import type { OrganisationOption, ProjectOption } from './usersListTypes';
import { normalizeRoleName, getUserTeamreelRoleNames } from './usersListHelpers';

/** Normalized user record stored in state */
interface UserRecord {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: string;
  is_superuser?: boolean;
  organisations?: { id: string; name: string; slug: string; role: string }[];
  role_label?: string;
  role_assignments?: unknown[];
  functional_roles?: string[];
  project_membership_id?: string;
  membership?: Record<string, unknown>;
  organisation?: unknown;
  source?: string;
  joined_at?: string;
  invited_by?: unknown;
  project_memberships?: Array<{
    project_id?: string;
    project?: { id?: string; parent_id?: string; project_id?: string };
    [key: string]: unknown;
  }>;
  _period?: unknown;
  _metadata?: Record<string, unknown>;
  _created_at?: string;
  [key: string]: unknown;
}

/** Raw member item from the API before normalization */
interface RawMemberItem {
  id?: string;
  user?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    is_active?: boolean;
    is_superuser?: boolean;
    role?: string;
    role_label?: string;
    role_assignments?: unknown[];
    rbac_role_assignments?: unknown[];
    organisations?: unknown[];
    project_memberships?: unknown[];
    [key: string]: unknown;
  };
  role?: string;
  role_label?: string;
  role_assignments?: unknown[];
  rbac_role_assignments?: unknown[];
  source?: string;
  joined_at?: string;
  invited_by?: unknown;
  organisation?: unknown;
  functional_roles?: string[];
  period?: unknown;
  metadata?: Record<string, unknown>;
  created_at?: string;
  is_active?: boolean;
  project_memberships?: unknown[];
  [key: string]: unknown;
}

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
    myOrganisations: Array<{ id: string | number; name: string; slug?: string }>;
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
    const [users, setUsers] = useState<UserRecord[]>([]);
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
            try {
                const orgs = await api.listAll<any>('/organisations/', {
                    pageSize: 100,
                });
                setOrganisations(
                    (orgs || []).map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
                );
            } catch (e) {
              console.error(e);
                console.error(e);
            }
        };
        void load();
    }, [isSuperAdmin, myOrganisations, refreshKey]);

    /* ── Fetch clubs & teams ──────────────────────────────────── */

    useEffect(() => {
        const load = async () => {
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
                    organisationsApi.listAllProjects(orgSlugForApi, { parent_project__isnull: 'true' }, { pageSize: 500 }),
                    organisationsApi.listAllProjects(orgSlugForApi, { parent_project__isnull: 'false' }, { pageSize: 2000 }),
                ]);
                setClubs(allClubs as unknown as ProjectOption[]);
                setTeams(allTeams as unknown as ProjectOption[]);
            } catch (e) {
              console.error(e);
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

            try {
                // Team-locked path: fetch from /projects/:id/members/
                if (teamLocked && preselectedTeamId) {
                    const { results: rawList } = await api.list<RawMemberItem>(`/projects/${preselectedTeamId}/members/`, { pageSize: 500 });

                    const allEntries = (Array.isArray(rawList) ? rawList : []).map((item: RawMemberItem) => {
                        const nestedUser = item?.user;
                        const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                        return {
                            id: String(u?.id ?? ''),
                            email: String(u?.email ?? ''),
                            first_name: String(u?.first_name ?? ''),
                            last_name: String(u?.last_name ?? ''),
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
                        const score = (e: UserRecord) => {
                            let s = 0;
                            if (e._period) s += 100;
                            if (e._metadata && Object.keys(e._metadata).length > 0) s += 10;
                            if ((e.functional_roles?.length ?? 0) > 0) s += 5;
                            return s;
                        };
                        if (score(entry) > score(existing)) byUserId.set(key, entry);
                    }

                    let results = Array.from(byUserId.values());
                    if (statusFilter === 'active') {
                        results = results.filter((u: UserRecord) => u.is_active !== false);
                    } else if (statusFilter === 'inactive') {
                        results = results.filter((u: UserRecord) => u.is_active === false);
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

                const url = `/organisations/${orgSlug}/members/`;
                const { results: rawList } = await api.list<any>(url, {
                    params: {
                        include_project_memberships: 'true',
                        include_project_membership_details: 'true',
                        ...(selectedClubId ? { project_id: String(selectedClubId) } : {}),
                    },
                    pageSize: 250,
                });

                const byKey = new Map<string, any>();
                for (const item of Array.isArray(rawList) ? rawList : []) {
                    const nestedUser = item?.user;
                    const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                    const key = String(u?.id ?? u?.email ?? item?.id ?? '');
                    if (!key) continue;

                    const normalized = {
                        id: String(u?.id ?? item?.id ?? key),
                        email: String(u?.email ?? ''),
                        first_name: String(u?.first_name ?? ''),
                        last_name: String(u?.last_name ?? ''),
                        organisations: u?.organisations,
                        is_superuser: Boolean(u?.is_superuser),
                        is_active: u?.is_active ?? item?.is_active ?? true,
                        role: u?.role ?? 'User',
                        role_label: u?.role_label ?? item?.role_label,
                        role_assignments:
                            u?.role_assignments ||
                            item?.role_assignments ||
                            u?.rbac_role_assignments ||
                            item?.rbac_role_assignments ||
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
                    results = results.filter((u: UserRecord) =>
                        u.project_memberships?.some(
                            (m) =>
                                String(m.project_id ?? m.project?.id ?? m.project?.project_id ?? '') ===
                                String(selectedTeamId),
                        ),
                    );
                } else if (selectedClubId) {
                    results = results.filter((u: UserRecord) =>
                        u.project_memberships?.some(
                            (m) =>
                                String(m.project_id ?? m.project?.id ?? '') === String(selectedClubId),
                        ),
                    );
                }

                if (statusFilter === 'active') {
                    results = results.filter((u: UserRecord) => u.is_active !== false);
                } else if (statusFilter === 'inactive') {
                    results = results.filter((u: UserRecord) => u.is_active === false);
                }

                if (roleFilter) {
                    const wanted = normalizeRoleName(roleFilter);
                    results = results.filter((u: UserRecord) => {
                        const roleNames = getUserTeamreelRoleNames(u, selectedTeamId, selectedClubId);
                        return roleNames.some((r) => normalizeRoleName(r) === wanted);
                    });
                }

                setUsers(results);
            } catch (e) {
              console.error(e);
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

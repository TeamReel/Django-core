/**
 * useUserDetailApi — Sub-hook owning all API / CRUD operations for UserDetailPage.
 *
 * Manages: user + loading + error state, link-modal options, and every mutation
 * (save, delete, membership CRUD, match CRUD).
 *
 * Relations (clubs, competitions, matches) live in the orchestrator because
 * they depend on derived data that uses api.user.
 *
 * Extracted from useUserDetailData.tsx during Phase 26 refactoring.
 */
import { useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getCsrfToken } from '../../utils/csrf';
import type { Organisation, Project } from '../../types';

/* ------------------------------------------------------------------ */
/*  Params                                                             */
/* ------------------------------------------------------------------ */

export interface UserDetailApiParams {
    apiBaseUrl: string;
    userId: string | undefined;
    orgId: string | undefined;
    navigate: NavigateFunction;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUserDetailApi(params: UserDetailApiParams) {
    const { apiBaseUrl, userId, orgId, navigate } = params;

    /* ---------- core state --------------------------------------- */
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ---------- link-modal options state ------------------------- */
    const [linkOrgs, setLinkOrgs] = useState<Organisation[]>([]);
    const [linkClubs, setLinkClubs] = useState<Project[]>([]);
    const [linkTeams, setLinkTeams] = useState<Project[]>([]);
    const [linkOptionsLoading, setLinkOptionsLoading] = useState(false);
    const [linkOptionsError, setLinkOptionsError] = useState<string | null>(null);

    /* ============================================================== */
    /*  User CRUD                                                      */
    /* ============================================================== */

    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`,
                { credentials: 'include' },
            );

            if (!response.ok) {
                const status = response.status;
                let errorMsg = `Failed to fetch user details (${status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) errorMsg = errorData.message;
                    else if (errorData.detail) errorMsg = errorData.detail;
                } catch {
                    // Ignore JSON parse error
                }
                throw new Error(errorMsg);
            }

            const rawData = await response.json();
            const userData = rawData.data || rawData;
            setUser(userData);
        } catch (err) {
          console.error(err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (updatedUser: Record<string, unknown>) => {
        try {
            const res = await fetch(
                `${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken(),
                    },
                    body: JSON.stringify(updatedUser),
                    credentials: 'include',
                },
            );

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                alert(data?.message || 'Failed to update user');
                throw new Error(data?.message || 'Failed to update user');
            }
        } catch (e) {
          console.error(e);
            console.error(e);
            alert('Failed to save user changes');
            throw e;
        }
    };

    const handleDeleteUser = async () => {
        if (!userId) return;
        if (!window.confirm('Delete this user? This cannot be undone.')) return;
        try {
            const res = await fetch(
                `${apiBaseUrl}/api/v1/admin/users/${encodeURIComponent(String(userId))}/`,
                {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': getCsrfToken() },
                    credentials: 'include',
                },
            );
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || 'Failed to delete user');
            }
            navigate(orgId ? `/organisations/${orgId}/users` : '/users');
        } catch (e) {
          console.error(e);
            alert(e instanceof Error ? e.message : 'Failed to delete user');
        }
    };

    /* ============================================================== */
    /*  Organisation membership helpers                                */
    /* ============================================================== */

    const findOrganisationMembershipId = async (orgSlugOrId: string): Promise<string> => {
        if (!user) throw new Error('User missing');
        const slugOrId = String(orgSlugOrId || '').trim();
        if (!slugOrId) throw new Error('Missing federation');

        const orgs = Array.isArray(user?.organisations) ? user.organisations : [];
        const direct = orgs.find(
            (o: any) =>
                String(o?.slug || o?.id || '') === slugOrId || String(o?.id || '') === slugOrId,
        );
        const directMembershipId = String(direct?.membership_id ?? '').trim();
        if (directMembershipId) return directMembershipId;

        const members = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/?page_size=500`,
            { credentials: 'include' },
            {
                ttlMs: 5_000,
                cacheKey: `user-detail:org:${slugOrId}:members:${String(user.id)}`,
                maxPages: 50,
                maxItems: 10_000,
            },
        );

        const email = String(user.email || '').trim().toLowerCase();
        const uid = String(user.id);
        const found = (members || []).find((m) => {
            const memberId = String(m?.id ?? '').trim();
            if (!memberId) return false;
            const mu = m?.user || m;
            const mid = String(mu?.id ?? '').trim();
            const memail = String(mu?.email ?? m?.email ?? '').trim().toLowerCase();
            return (uid && mid && uid === mid) || (email && memail && email === memail);
        });

        const membershipId = String(found?.id ?? '').trim();
        if (!membershipId) throw new Error('Could not find federation membership for this user');
        return membershipId;
    };

    const updateOrganisationMembershipRole = async (orgSlugOrId: string, role: string) => {
        if (!user) return;
        const slugOrId = String(orgSlugOrId || '').trim();
        if (!slugOrId) return;

        const membershipId = await findOrganisationMembershipId(slugOrId);
        const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ role }),
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to update federation role');
        }

        const data = await res.json().catch(() => ({}));
        if (data?.data?.detail && String(data.data.detail).includes('Promotion requested')) {
            alert(
                'Role change requested. The user must accept the promotion before it takes effect.',
            );
        }

        await fetchUser();
    };

    const removeOrganisationMembership = async (orgSlugOrId: string) => {
        if (!user) return;
        const slugOrId = String(orgSlugOrId || '').trim();
        if (!slugOrId) return;

        const membershipId = await findOrganisationMembershipId(slugOrId);
        const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
            {
                method: 'DELETE',
                headers: { 'X-CSRFToken': getCsrfToken() },
                credentials: 'include',
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to unlink federation');
        }

        await fetchUser();
    };

    /* ============================================================== */
    /*  Project membership helpers                                     */
    /* ============================================================== */

    const findProjectMembershipId = async (
        projectId: string,
        directMembershipId?: any,
    ): Promise<string> => {
        const direct = String(directMembershipId || '').trim();
        if (direct) return direct;
        if (!user) throw new Error('User missing');

        const members = await fetchAllPages<any>(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(projectId))}/members/?page_size=500`,
            { credentials: 'include' },
            {
                ttlMs: 5_000,
                cacheKey: `user-detail:project:${String(projectId)}:members:${String(user.id)}`,
                maxPages: 50,
                maxItems: 10_000,
            },
        );

        const email = String(user.email || '').trim().toLowerCase();
        const uid = String(user.id);
        const found = (members || []).find((m) => {
            const memberId = String(m?.id ?? '').trim();
            if (!memberId) return false;
            const mu = m?.user || m;
            const mid = String(mu?.id ?? '').trim();
            const memail = String(mu?.email ?? m?.email ?? '').trim().toLowerCase();
            return (uid && mid && uid === mid) || (email && memail && email === memail);
        });

        const membershipId = String(found?.id ?? '').trim();
        if (!membershipId) throw new Error('Could not find project membership for this user');
        return membershipId;
    };

    const removeProjectMembership = async (projectId: string, directMembershipId?: any) => {
        if (!user) return;
        const pid = String(projectId || '').trim();
        if (!pid) return;

        const membershipId = await findProjectMembershipId(pid, directMembershipId);
        const res = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
            {
                method: 'DELETE',
                headers: { 'X-CSRFToken': getCsrfToken() },
                credentials: 'include',
            },
        );
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to remove membership');
        }

        await fetchUser();
    };

    const updateProjectMembershipRole = async (
        projectId: string,
        directMembershipId: any,
        role: string,
    ) => {
        if (!user) return;
        const pid = String(projectId || '').trim();
        if (!pid) return;

        const membershipId = await findProjectMembershipId(pid, directMembershipId);
        const res = await fetch(
            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ role }),
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to update role');
        }

        const data = await res.json().catch(() => ({}));
        if (data?.data?.detail && String(data.data.detail).includes('Promotion requested')) {
            alert(
                'Role change requested. The user must accept the promotion before it takes effect.',
            );
        }

        await fetchUser();
    };

    /* ============================================================== */
    /*  Match CRUD                                                     */
    /* ============================================================== */

    const [relationsReloadToken, setRelationsReloadToken] = useState(0);

    const saveMatchEdits = async (matchToEdit: Record<string, unknown>, patch: Record<string, unknown>) => {
        const matchIdValue = String(matchToEdit?.id || '').trim();
        if (!matchIdValue) throw new Error('Missing match id');

        const res = await fetch(
            `${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify(patch || {}),
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to update match');
        }

        setRelationsReloadToken((t) => t + 1);
    };

    const deleteMatch = async (matchToDelete: Record<string, unknown>) => {
        const matchIdValue = String(matchToDelete?.id || '').trim();
        if (!matchIdValue) throw new Error('Missing match id');

        const res = await fetch(
            `${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchIdValue)}/`,
            {
                method: 'DELETE',
                headers: { 'X-CSRFToken': getCsrfToken() },
                credentials: 'include',
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || 'Failed to delete match');
        }

        setRelationsReloadToken((t) => t + 1);
    };

    /* ============================================================== */
    /*  Link options                                                   */
    /* ============================================================== */

    const ensureLinkOptionsLoaded = async () => {
        if (linkOptionsLoading) return;
        if (linkOrgs.length && linkClubs.length && linkTeams.length) return;
        try {
            setLinkOptionsLoading(true);
            setLinkOptionsError(null);

            const [orgs, clubs, teams] = await Promise.all([
                fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/organisations/?page_size=200`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:orgs', maxItems: 5000 },
                ),
                fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=true`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:clubs', maxItems: 20_000 },
                ),
                fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/projects/?page_size=200&parent_project__isnull=false`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:teams', maxItems: 50_000 },
                ),
            ]);

            setLinkOrgs(Array.isArray(orgs) ? orgs : []);
            setLinkClubs(Array.isArray(clubs) ? clubs : []);
            setLinkTeams(Array.isArray(teams) ? teams : []);
        } catch (e) {
          console.error(e);
            setLinkOptionsError(e instanceof Error ? e.message : 'Failed to load link options');
            setLinkOrgs([]);
            setLinkClubs([]);
            setLinkTeams([]);
        } finally {
            setLinkOptionsLoading(false);
        }
    };

    /* ============================================================== */
    /*  Return                                                         */
    /* ============================================================== */

    return {
        // Core state
        user,
        setUser,
        loading,
        error,
        // CRUD
        fetchUser,
        handleSaveUser,
        handleDeleteUser,
        // Org membership
        updateOrganisationMembershipRole,
        removeOrganisationMembership,
        // Project membership
        updateProjectMembershipRole,
        removeProjectMembership,
        // Match
        saveMatchEdits,
        deleteMatch,
        relationsReloadToken,
        // Link options
        ensureLinkOptionsLoaded,
        linkOrgs,
        linkClubs,
        linkTeams,
        linkOptionsLoading,
        linkOptionsError,
    };
}

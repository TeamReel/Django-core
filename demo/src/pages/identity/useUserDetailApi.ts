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
import { api, trashApi } from '@/api';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { fetchAllPages } from '../../utils/fetchAllPages';
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

    const { pushToast } = useToast();
    const confirm = useConfirm();

    /* ---------- core state --------------------------------------- */
    const [user, setUser] = useState<Record<string, unknown> | null>(null);
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
            const userData = await api.get<Record<string, unknown>>(
                `/admin/users/${encodeURIComponent(String(userId))}/`,
            );
            setUser(userData);
        } catch (err) {
          logger.error('Failed to fetch user', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (updatedUser: Record<string, unknown>) => {
        try {
            await api.patch(
                `/admin/users/${encodeURIComponent(String(userId))}/`,
                updatedUser,
            );
        } catch (e) {
          logger.error('Failed to save user changes', e);
            pushToast({ message: 'Failed to save user changes', type: 'error' });
            throw e;
        }
    };

    const handleDeleteUser = async () => {
        if (!userId) return;
        const ok = await confirm({ title: 'Gebruiker verwijderen', message: 'Gebruiker verwijderen? Dit kan niet ongedaan worden gemaakt.', confirmLabel: 'Verwijderen', variant: 'danger' });
        if (!ok) return;
        try {
            await api.delete(
                `/admin/users/${encodeURIComponent(String(userId))}/`,
            );
            navigate(orgId ? `/organisations/${orgId}/users` : '/users');
        } catch (e) {
          logger.error('Failed to delete user', e);
            pushToast({ message: e instanceof Error ? e.message : 'Gebruiker verwijderen mislukt', type: 'error' });
        }
    };

    /* ============================================================== */
    /*  Organisation membership helpers                                */
    /* ============================================================== */

    const findOrganisationMembershipId = async (orgSlugOrId: string): Promise<string> => {
        if (!user) throw new Error('User missing');
        const slugOrId = String(orgSlugOrId || '').trim();
        if (!slugOrId) throw new Error('Missing federation');

        const orgs = Array.isArray((user as Record<string, unknown>)?.organisations) ? (user as Record<string, unknown>).organisations as Record<string, unknown>[] : [];
        const direct = orgs.find(
            (o: Record<string, unknown>) =>
                String(o?.slug || o?.id || '') === slugOrId || String(o?.id || '') === slugOrId,
        );
        const directMembershipId = String(direct?.membership_id ?? '').trim();
        if (directMembershipId) return directMembershipId;

        const members = await fetchAllPages<Record<string, unknown>>(
            `${apiBaseUrl}/organisations/${encodeURIComponent(slugOrId)}/members/?page_size=500`,
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
            const mu = (m?.user || m) as Record<string, unknown>;
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
        const res = await api.patch<Record<string, unknown>>(
            `/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
            { role },
        );

        if ((res as Record<string, unknown>)?.data && String(((res as Record<string, unknown>).data as Record<string, unknown>)?.detail).includes('Promotion requested')) {
            pushToast({
                message: 'Role change requested. The user must accept the promotion before it takes effect.',
                type: 'info',
            });
        }

        await fetchUser();
    };

    const removeOrganisationMembership = async (orgSlugOrId: string) => {
        if (!user) return;
        const slugOrId = String(orgSlugOrId || '').trim();
        if (!slugOrId) return;

        const membershipId = await findOrganisationMembershipId(slugOrId);
        await api.delete(
            `/organisations/${encodeURIComponent(slugOrId)}/members/${encodeURIComponent(membershipId)}/`,
        );

        await fetchUser();
    };

    /* ============================================================== */
    /*  Project membership helpers                                     */
    /* ============================================================== */

    const findProjectMembershipId = async (
        projectId: string,
        directMembershipId?: string | undefined,
    ): Promise<string> => {
        const direct = String(directMembershipId || '').trim();
        if (direct) return direct;
        if (!user) throw new Error('User missing');

        const members = await fetchAllPages<Record<string, unknown>>(
            `${apiBaseUrl}/projects/${encodeURIComponent(String(projectId))}/members/?page_size=500`,
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
            const mu = (m?.user || m) as Record<string, unknown>;
            const mid = String(mu?.id ?? '').trim();
            const memail = String(mu?.email ?? m?.email ?? '').trim().toLowerCase();
            return (uid && mid && uid === mid) || (email && memail && email === memail);
        });

        const membershipId = String(found?.id ?? '').trim();
        if (!membershipId) throw new Error('Could not find project membership for this user');
        return membershipId;
    };

    const removeProjectMembership = async (projectId: string, directMembershipId?: string | undefined) => {
        if (!user) return;
        const pid = String(projectId || '').trim();
        if (!pid) return;

        const membershipId = await findProjectMembershipId(pid, directMembershipId);
        await api.delete(
            `/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
        );

        await fetchUser();
    };

    const updateProjectMembershipRole = async (
        projectId: string,
        directMembershipId: string | undefined,
        role: string,
    ) => {
        if (!user) return;
        const pid = String(projectId || '').trim();
        if (!pid) return;

        const membershipId = await findProjectMembershipId(pid, directMembershipId);
        const res = await api.patch<Record<string, unknown>>(
            `/projects/${encodeURIComponent(pid)}/members/${encodeURIComponent(membershipId)}/`,
            { role },
        );

        if ((res as Record<string, unknown>)?.data && String(((res as Record<string, unknown>).data as Record<string, unknown>)?.detail).includes('Promotion requested')) {
            pushToast({
                message: 'Role change requested. The user must accept the promotion before it takes effect.',
                type: 'info',
            });
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

        await api.patch(
            `/activities/${encodeURIComponent(matchIdValue)}/`,
            patch || {},
        );

        setRelationsReloadToken((t) => t + 1);
    };

    const deleteMatch = async (matchToDelete: Record<string, unknown>) => {
        const matchIdValue = String(matchToDelete?.id || '').trim();
        const matchTitle = String(matchToDelete?.title || matchToDelete?.name || 'Wedstrijd').trim();
        if (!matchIdValue) throw new Error('Missing match id');

        await api.delete(
            `/activities/${encodeURIComponent(matchIdValue)}/`,
        );

        // Show toast with undo action
        pushToast({
            message: `"${matchTitle}" verplaatst naar prullenbak`,
            type: 'info',
            actions: [{
                label: 'Ongedaan maken',
                onClick: async () => {
                    try {
                        const trashItem = await trashApi.findByObjectId(matchIdValue);
                        if (trashItem) {
                            await trashApi.restore(trashItem.id);
                            setRelationsReloadToken((t) => t + 1);
                            pushToast({ message: `"${matchTitle}" hersteld`, type: 'success' });
                        }
                    } catch (err) {
                        logger.error('Failed to restore match', err);
                        pushToast({ message: 'Herstellen mislukt', type: 'error' });
                    }
                },
            }],
        });

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
                fetchAllPages<Organisation>(
                    `${apiBaseUrl}/organisations/?page_size=200`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:orgs', maxItems: 5000 },
                ),
                fetchAllPages<Project>(
                    `${apiBaseUrl}/projects/?page_size=200&parent_project__isnull=true`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:clubs', maxItems: 20_000 },
                ),
                fetchAllPages<Project>(
                    `${apiBaseUrl}/projects/?page_size=200&parent_project__isnull=false`,
                    { credentials: 'include' },
                    { ttlMs: 60_000, cacheKey: 'user-detail:link:teams', maxItems: 50_000 },
                ),
            ]);

            setLinkOrgs(Array.isArray(orgs) ? orgs : []);
            setLinkClubs(Array.isArray(clubs) ? clubs : []);
            setLinkTeams(Array.isArray(teams) ? teams : []);
        } catch (e) {
          logger.error('Failed to load link options', e);
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

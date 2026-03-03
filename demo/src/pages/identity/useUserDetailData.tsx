/**
 * useUserDetailData — Orchestrator hook for the UserDetailPage.
 *
 * Composes useUserDetailApi (CRUD + link options) with local UI state
 * (modals, tabs, identity editing, balance), derived membership data,
 * and the relations loading effect.
 *
 * Extracted during Phase 26 refactoring.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import type { UserDetailDataReturn } from './userDetailTypes';
import { useUserDetailApi } from './useUserDetailApi';

// Re-export so consumers keep the same import path
export type { UserDetailDataReturn } from './userDetailTypes';

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useUserDetailData(): UserDetailDataReturn {
    const { userId, orgId } = useParams<{ userId: string; orgId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser } = useAuth();
    const apiBaseUrl = getApiBaseUrl();

    /* ---------- API sub-hook (CRUD + link options) ---------------- */
    const api = useUserDetailApi({ apiBaseUrl, userId, orgId, navigate });

    /* ---------- modal state --------------------------------------- */
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);
    const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
    const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);
    const [editingMembership, setEditingMembership] = useState<{
        projectId: string;
        projectName: string;
        currentRole: string;
        membershipId?: string;
    } | null>(null);
    const [isEditMembershipModalOpen, setIsEditMembershipModalOpen] = useState(false);

    /* ---------- identity tab state -------------------------------- */
    const [identityEditing, setIdentityEditing] = useState(false);
    const [identityFirstName, setIdentityFirstName] = useState('');
    const [identityLastName, setIdentityLastName] = useState('');
    const [identitySaving, setIdentitySaving] = useState(false);
    const [identitySaveError, setIdentitySaveError] = useState<string | null>(null);
    const [identitySaveSuccess, setIdentitySaveSuccess] = useState(false);

    /* ---------- balance state ------------------------------------- */
    const [userBalance, setUserBalance] = useState<string | null>(null);
    const [userBalanceLoading, setUserBalanceLoading] = useState(false);
    const [userBalanceError, setUserBalanceError] = useState<string | null>(null);
    const [userBalanceReloadToken, setUserBalanceReloadToken] = useState(0);

    /* ---------- relations state ----------------------------------- */
    const [clubsById, setClubsById] = useState<Map<string, any>>(new Map());
    const [linkedCompetitions, setLinkedCompetitions] = useState<any[]>([]);
    const [linkedMatches, setLinkedMatches] = useState<any[]>([]);
    const [loadingRelations, setLoadingRelations] = useState(false);

    /* ---------- hierarchy search ---------------------------------- */
    const [hierarchySearch, setHierarchySearch] = useState('');

    /* ---------- transaction helpers -------------------------------- */
    const currentUserIdForTxn = Number((currentUser as any)?.id);
    const targetUserIdForTxn = Number((api.user as any)?.id || userId);
    const userWalletOptions = useMemo<WalletOption[]>(
        () => [
            { kind: 'default', label: 'Default (charge this user)' },
            { kind: 'organization', label: 'Organisation wallet' },
            { kind: 'me', label: 'My user wallet' },
        ],
        [],
    );

    /* ---------- tabs ---------------------------------------------- */
    const allowedTabs = useMemo(
        () =>
            new Set([
                'overview', 'identity', 'balance', 'hierarchy', 'federations',
                'clubs', 'teams', 'seasons', 'competitions', 'matches', 'transactions',
            ]),
        [],
    );
    const basePath = `/users/${userId}`;
    const activeTab = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
        return allowedTabs.has(tab) ? tab : 'overview';
    }, [allowedTabs, location.search]);
    const setTab = (tab: string) => {
        if (!allowedTabs.has(tab)) return;
        const params = new URLSearchParams(location.search);
        if (tab === 'overview') params.delete('tab');
        else params.set('tab', tab);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        navigate(`${basePath}${suffix}`);
    };

    /* ---------- helpers ------------------------------------------- */
    const getPreferredOrganisationId = (): string => {
        const fromStorage = String(localStorage.getItem('django-core:currentOrgId') || '').trim();
        if (fromStorage) return fromStorage;
        const memberships =
            (api.user as any)?.memberships ||
            (api.user as any)?.organisation_memberships ||
            (api.user as any)?.organization_memberships;
        if (Array.isArray(memberships) && memberships.length > 0) {
            const first = memberships[0];
            const oid =
                first?.organisation?.id || first?.organization?.id || first?.org?.id ||
                first?.organisation_id || first?.organization_id;
            if (oid) return String(oid);
        }
        return '';
    };

    const renderNavLink = (label: string, href?: string) => {
        const safe = String(label || '').trim();
        if (!href) return <span>{safe || '—'}</span>;
        return (
            <a
                href={href}
                onClick={(e: any) => { e.preventDefault(); navigate(href); }}
                className="fw-600"
                style={{ color: '#007bff', textDecoration: 'none' }}
            >
                {safe || '—'}
            </a>
        );
    };

    /* ---------- derived data -------------------------------------- */
    const userOrgs = useMemo(() => {
        const orgs = api.user?.organisations;
        return Array.isArray(orgs) ? orgs : [];
    }, [api.user]);

    const userProjects = useMemo(() => {
        const projects = api.user?.projects;
        return Array.isArray(projects) ? projects : [];
    }, [api.user]);

    const primaryOrgSlug = useMemo(() => {
        if (orgId) return String(orgId);
        const first = userOrgs.find((o: any) => o?.slug) || userOrgs[0];
        return String(first?.slug || first?.id || '').trim();
    }, [orgId, userOrgs]);

    const clubMemberships = useMemo(() => userProjects.filter((p: any) => !p?.parent), [userProjects]);

    const directClubMembershipById = useMemo(() => {
        const m = new Map<string, any>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) m.set(id, c);
        }
        return m;
    }, [clubMemberships]);

    const teamMemberships = useMemo(() => userProjects.filter((p: any) => Boolean(p?.parent)), [userProjects]);

    const clubsForTab = useMemo(() => {
        const merged = new Map<string, any>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) merged.set(id, c);
        }
        for (const t of teamMemberships) {
            const clubId = String(t?.parent || '').trim();
            if (!clubId || merged.has(clubId)) continue;
            const apiClub = clubsById.get(clubId);
            merged.set(clubId, {
                id: clubId,
                name: String(apiClub?.name || t?.parent_name || '').trim(),
                slug: String(apiClub?.slug || '').trim(),
                role: '', membership_id: null,
            });
        }
        return Array.from(merged.values());
    }, [clubMemberships, teamMemberships, clubsById]);

    const clubSlugById = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            const slug = String(c?.slug || '').trim();
            if (id && slug) m.set(id, slug);
        }
        for (const [id, club] of clubsById.entries()) {
            const slug = String(club?.slug || '').trim();
            if (id && slug && !m.has(id)) m.set(id, slug);
        }
        return m;
    }, [clubMemberships, clubsById]);

    const teamSeasonPairs = useMemo(() => {
        const pairs: Array<{
            teamId: string; teamName: string; teamSlug: string;
            clubId: string; clubName: string; seasonId: string; seasonName: string;
        }> = [];
        for (const t of teamMemberships) {
            const teamId = String(t?.id || '').trim();
            const teamSlug = String(t?.slug || '').trim();
            const teamName = String(t?.name || '').trim();
            const clubId = String(t?.parent || '').trim();
            const clubName = String(t?.parent_name || '').trim();
            const seasonId = String(t?.period?.id || '').trim();
            const seasonName = String(t?.period?.name || '').trim();
            if (!teamId || !clubId || !seasonId) continue;
            pairs.push({ teamId, teamName, teamSlug, clubId, clubName, seasonId, seasonName });
        }
        const seen = new Set<string>();
        return pairs.filter((p) => {
            const k = `${p.teamId}::${p.seasonId}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [teamMemberships]);

    const hierarchyRows = useMemo(() => {
        const q = hierarchySearch.trim().toLowerCase();
        const rows = teamSeasonPairs.map((p) => {
            const clubSlug = clubSlugById.get(p.clubId) || '';
            const teamPath = clubSlug
                ? `/${primaryOrgSlug}/${clubSlug}/${p.teamSlug || p.teamId}` : '';
            const seasonPath = clubSlug
                ? `/${primaryOrgSlug}/${clubSlug}/${p.teamSlug || p.teamId}/${p.seasonId}` : '';
            return { ...p, clubSlug, teamPath, seasonPath };
        });
        if (!q) return rows;
        return rows.filter((r) =>
            r.teamName.toLowerCase().includes(q) ||
            r.clubName.toLowerCase().includes(q) ||
            r.seasonName.toLowerCase().includes(q),
        );
    }, [teamSeasonPairs, hierarchySearch, clubSlugById, primaryOrgSlug]);

    const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
    const userDisplayName = api.user
        ? `${api.user.first_name || ''} ${api.user.last_name || ''}`.trim() ||
          api.user.email || `User ${userId}`
        : `User ${userId}`;

    /* ----------------------------------------------------------------
     *  Effects
     * -------------------------------------------------------------- */

    // Fetch user on mount
    useEffect(() => {
        let isMounted = true;
        if (userId) {
            const loadData = async () => {
                if (!isMounted) return;
                await api.fetchUser();
            };
            loadData();
        }
        return () => { isMounted = false; };
    }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Link modal options
    useEffect(() => {
        if (!isLinkModalOpen) return;
        void api.ensureLinkOptionsLoaded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLinkModalOpen]);

    // Balance
    useEffect(() => {
        if (activeTab !== 'balance') return;
        const orgIdForBalance = getPreferredOrganisationId();
        const isSelf =
            Number.isFinite(currentUserIdForTxn) &&
            Number.isFinite(targetUserIdForTxn) &&
            Number(currentUserIdForTxn) === Number(targetUserIdForTxn);
        if (!isSelf) {
            setUserBalance(null);
            setUserBalanceError('Balance is only available on your own user page.');
            setUserBalanceLoading(false);
            return;
        }
        if (!orgIdForBalance) {
            setUserBalance(null);
            setUserBalanceError('Select an organisation first (context switcher).');
            setUserBalanceLoading(false);
            return;
        }
        let cancelled = false;
        const controller = new AbortController();
        const run = async () => {
            try {
                setUserBalanceLoading(true);
                setUserBalanceError(null);
                const response = await fetch(
                    `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(orgIdForBalance)}/balance/me/`,
                    { credentials: 'include', signal: controller.signal },
                );
                if (!response.ok) throw new Error(`Failed to fetch balance (${response.status})`);
                const raw = await response.json();
                const data = (raw as any)?.data ?? raw;
                const v = (data as any)?.current_balance;
                if (!cancelled) setUserBalance(v != null ? String(v) : null);
            } catch (e: any) {
                if (!cancelled) setUserBalanceError(e?.message || 'Failed to fetch balance');
            } finally {
                if (!cancelled) setUserBalanceLoading(false);
            }
        };
        run();
        return () => { cancelled = true; controller.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, apiBaseUrl, userBalanceReloadToken]);

    // Relations (clubs, competitions, matches)
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!userId || !primaryOrgSlug || !api.user) return;
            setLoadingRelations(true);
            try {
                const clubs = await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/projects/?organisation_id=${encodeURIComponent(primaryOrgSlug)}&parent_project__isnull=true&page_size=200`,
                    { credentials: 'include' },
                    { ttlMs: 30_000, cacheKey: `user:${userId}:clubs:${primaryOrgSlug}`, maxItems: 2000 },
                );
                if (!cancelled) {
                    const map = new Map<string, any>();
                    for (const c of clubs || []) {
                        const id = String(c?.id || '').trim();
                        if (id) map.set(id, c);
                    }
                    setClubsById(map);
                }
                const competitionsAll: any[] = [];
                const matchesAll: any[] = [];
                for (const pair of teamSeasonPairs) {
                    const competitions = await fetchAllPages<any>(
                        `${apiBaseUrl}/api/v1/periods/?parent_id=${encodeURIComponent(pair.seasonId)}&project_id=${encodeURIComponent(pair.teamId)}&page_size=250`,
                        { credentials: 'include' },
                        { ttlMs: 30_000, cacheKey: `user:${userId}:competitions:${pair.teamId}:${pair.seasonId}`, maxItems: 2000 },
                    );
                    competitionsAll.push(...(competitions || []));
                    const matches = await fetchAllPages<any>(
                        `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(pair.teamId)}&period_id=${encodeURIComponent(pair.seasonId)}&include_descendants=true&activity_type=match&ordering=-start_time&page_size=250`,
                        { credentials: 'include' },
                        { ttlMs: 30_000, cacheKey: `user:${userId}:matches:${pair.teamId}:${pair.seasonId}`, maxItems: 250 },
                    );
                    matchesAll.push(...(matches || []));
                }
                if (!cancelled) {
                    setLinkedCompetitions([...new Map(competitionsAll.map((c: any) => [String(c?.id || ''), c])).values()].filter(Boolean));
                    setLinkedMatches([...new Map(matchesAll.map((m: any) => [String(m?.id || ''), m])).values()].filter(Boolean));
                }
            } catch {
                if (!cancelled) { setLinkedCompetitions([]); setLinkedMatches([]); }
            } finally {
                if (!cancelled) setLoadingRelations(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [apiBaseUrl, primaryOrgSlug, teamSeasonPairs, api.user, userId, api.relationsReloadToken]);

    /* ----------------------------------------------------------------
     *  Return
     * -------------------------------------------------------------- */

    return {
        userId, orgId, navigate, location, basePath, backPath,
        user: api.user, setUser: api.setUser, loading: api.loading, error: api.error,
        apiBaseUrl, userDisplayName, activeTab, setTab,
        userOrgs, userProjects, primaryOrgSlug,
        clubMemberships, directClubMembershipById, teamMemberships,
        clubsForTab, clubSlugById, teamSeasonPairs,
        hierarchySearch, setHierarchySearch, hierarchyRows,
        clubsById, linkedCompetitions, linkedMatches, loadingRelations,
        saveMatchEdits: api.saveMatchEdits, deleteMatch: api.deleteMatch,
        identityEditing, setIdentityEditing,
        identityFirstName, setIdentityFirstName,
        identityLastName, setIdentityLastName,
        identitySaving, setIdentitySaving,
        identitySaveError, setIdentitySaveError,
        identitySaveSuccess, setIdentitySaveSuccess,
        userBalance, userBalanceLoading, userBalanceError,
        userBalanceReloadToken, setUserBalanceReloadToken,
        fetchUser: api.fetchUser, handleSaveUser: api.handleSaveUser,
        handleDeleteUser: api.handleDeleteUser,
        getCsrfToken, getPreferredOrganisationId, renderNavLink,
        updateOrganisationMembershipRole: api.updateOrganisationMembershipRole,
        removeOrganisationMembership: api.removeOrganisationMembership,
        updateProjectMembershipRole: api.updateProjectMembershipRole,
        removeProjectMembership: api.removeProjectMembership,
        isViewModalOpen, setIsViewModalOpen,
        isEditModalOpen, setIsEditModalOpen,
        isLinkModalOpen, setIsLinkModalOpen,
        isCreateTxnModalOpen, setIsCreateTxnModalOpen,
        isMatchEditModalOpen, setIsMatchEditModalOpen,
        selectedEditMatch, setSelectedEditMatch,
        isEditMembershipModalOpen, setIsEditMembershipModalOpen,
        editingMembership, setEditingMembership,
        linkOrgs: api.linkOrgs, linkClubs: api.linkClubs, linkTeams: api.linkTeams,
        linkOptionsLoading: api.linkOptionsLoading, linkOptionsError: api.linkOptionsError,
        currentUserIdForTxn, targetUserIdForTxn, userWalletOptions,
    };
}

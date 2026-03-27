/**
 * useUserDetailData — Orchestrator hook for the UserDetailPage.
 *
 * Composes useUserDetailApi (CRUD + link options) with local UI state
 * (modals, tabs, identity editing, balance), derived membership data,
 * and the relations loading effect.
 *
 * Extracted during Phase 26 refactoring.
 */
import { useEffect, useMemo, useReducer } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { logger } from '@/utils/logger';
import { api as apiClient } from '@/api/client';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { getCsrfToken } from '../../utils/csrf';
import { formReducer, makeSetter } from '@/utils/formReducer';
import type { Activity, Period, Project } from '../../types';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import type { UserDetailDataReturn } from './userDetailTypes';
import { useUserDetailApi } from './useUserDetailApi';
import udStyles from './useUserDetailData.module.css';

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
    const apiBaseUrl = getApiV1BaseUrl();

    /* ---------- API sub-hook (CRUD + link options) ---------------- */
    const api = useUserDetailApi({ apiBaseUrl, userId, orgId, navigate });

    /* ---------- reducer state -------------------------------------- */
    interface UserDetailLocalState {
      isViewModalOpen: boolean;
      isEditModalOpen: boolean;
      isLinkModalOpen: boolean;
      isCreateTxnModalOpen: boolean;
      isMatchEditModalOpen: boolean;
      selectedEditMatch: Activity | null;
      editingMembership: { projectId: string; projectName: string; currentRole: string; membershipId?: string } | null;
      isEditMembershipModalOpen: boolean;
      identityEditing: boolean;
      identityFirstName: string;
      identityLastName: string;
      identitySaving: boolean;
      identitySaveError: string | null;
      identitySaveSuccess: boolean;
      userBalance: string | null;
      userBalanceLoading: boolean;
      userBalanceError: string | null;
      userBalanceReloadToken: number;
      clubsById: Map<string, Project>;
      linkedCompetitions: Period[];
      linkedMatches: Activity[];
      loadingRelations: boolean;
      hierarchySearch: string;
    }
    const initialState: UserDetailLocalState = {
      isViewModalOpen: false, isEditModalOpen: false, isLinkModalOpen: false,
      isCreateTxnModalOpen: false, isMatchEditModalOpen: false,
      selectedEditMatch: null, editingMembership: null, isEditMembershipModalOpen: false,
      identityEditing: false, identityFirstName: '', identityLastName: '',
      identitySaving: false, identitySaveError: null, identitySaveSuccess: false,
      userBalance: null, userBalanceLoading: false, userBalanceError: null, userBalanceReloadToken: 0,
      clubsById: new Map(), linkedCompetitions: [], linkedMatches: [], loadingRelations: false,
      hierarchySearch: '',
    };
    const [s, dispatch] = useReducer(formReducer<UserDetailLocalState>, initialState);

    const setIsViewModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isViewModalOpen'>(dispatch, 'isViewModalOpen'), [dispatch]);
    const setIsEditModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isEditModalOpen'>(dispatch, 'isEditModalOpen'), [dispatch]);
    const setIsLinkModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isLinkModalOpen'>(dispatch, 'isLinkModalOpen'), [dispatch]);
    const setIsCreateTxnModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isCreateTxnModalOpen'>(dispatch, 'isCreateTxnModalOpen'), [dispatch]);
    const setIsMatchEditModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isMatchEditModalOpen'>(dispatch, 'isMatchEditModalOpen'), [dispatch]);
    const setSelectedEditMatch = useMemo(() => makeSetter<UserDetailLocalState, 'selectedEditMatch'>(dispatch, 'selectedEditMatch'), [dispatch]);
    const setEditingMembership = useMemo(() => makeSetter<UserDetailLocalState, 'editingMembership'>(dispatch, 'editingMembership'), [dispatch]);
    const setIsEditMembershipModalOpen = useMemo(() => makeSetter<UserDetailLocalState, 'isEditMembershipModalOpen'>(dispatch, 'isEditMembershipModalOpen'), [dispatch]);
    const setIdentityEditing = useMemo(() => makeSetter<UserDetailLocalState, 'identityEditing'>(dispatch, 'identityEditing'), [dispatch]);
    const setIdentityFirstName = useMemo(() => makeSetter<UserDetailLocalState, 'identityFirstName'>(dispatch, 'identityFirstName'), [dispatch]);
    const setIdentityLastName = useMemo(() => makeSetter<UserDetailLocalState, 'identityLastName'>(dispatch, 'identityLastName'), [dispatch]);
    const setIdentitySaving = useMemo(() => makeSetter<UserDetailLocalState, 'identitySaving'>(dispatch, 'identitySaving'), [dispatch]);
    const setIdentitySaveError = useMemo(() => makeSetter<UserDetailLocalState, 'identitySaveError'>(dispatch, 'identitySaveError'), [dispatch]);
    const setIdentitySaveSuccess = useMemo(() => makeSetter<UserDetailLocalState, 'identitySaveSuccess'>(dispatch, 'identitySaveSuccess'), [dispatch]);
    const setUserBalance = useMemo(() => makeSetter<UserDetailLocalState, 'userBalance'>(dispatch, 'userBalance'), [dispatch]);
    const setUserBalanceLoading = useMemo(() => makeSetter<UserDetailLocalState, 'userBalanceLoading'>(dispatch, 'userBalanceLoading'), [dispatch]);
    const setUserBalanceError = useMemo(() => makeSetter<UserDetailLocalState, 'userBalanceError'>(dispatch, 'userBalanceError'), [dispatch]);
    const setUserBalanceReloadToken = useMemo(() => makeSetter<UserDetailLocalState, 'userBalanceReloadToken'>(dispatch, 'userBalanceReloadToken'), [dispatch]);
    const setClubsById = useMemo(() => makeSetter<UserDetailLocalState, 'clubsById'>(dispatch, 'clubsById'), [dispatch]);
    const setLinkedCompetitions = useMemo(() => makeSetter<UserDetailLocalState, 'linkedCompetitions'>(dispatch, 'linkedCompetitions'), [dispatch]);
    const setLinkedMatches = useMemo(() => makeSetter<UserDetailLocalState, 'linkedMatches'>(dispatch, 'linkedMatches'), [dispatch]);
    const setLoadingRelations = useMemo(() => makeSetter<UserDetailLocalState, 'loadingRelations'>(dispatch, 'loadingRelations'), [dispatch]);
    const setHierarchySearch = useMemo(() => makeSetter<UserDetailLocalState, 'hierarchySearch'>(dispatch, 'hierarchySearch'), [dispatch]);

    /* ---------- transaction helpers -------------------------------- */
    const currentUserIdForTxn = Number(currentUser?.id);
    const targetUserIdForTxn = Number(api.user?.id || userId);
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
            api.user?.memberships ||
            api.user?.organisation_memberships ||
            api.user?.organization_memberships;
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
                onClick={(e: React.MouseEvent) => { e.preventDefault(); navigate(href); }}
                className={`fw-600 ${udStyles.navLink}`}
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
        const first = userOrgs.find((o) => o?.slug) || userOrgs[0];
        return String(first?.slug || first?.id || '').trim();
    }, [orgId, userOrgs]);

    const clubMemberships = useMemo(() => userProjects.filter((p) => !p?.parent), [userProjects]);

    const directClubMembershipById = useMemo(() => {
        const m = new Map<string, Project>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) m.set(id, c);
        }
        return m;
    }, [clubMemberships]);

    const teamMemberships = useMemo(() => userProjects.filter((p) => Boolean(p?.parent)), [userProjects]);

    const clubsForTab = useMemo(() => {
        const merged = new Map<string, Project>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) merged.set(id, c);
        }
        for (const t of teamMemberships) {
            const clubId = String(t?.parent || '').trim();
            if (!clubId || merged.has(clubId)) continue;
            const apiClub = s.clubsById.get(clubId);
            merged.set(clubId, {
                id: clubId,
                name: String(apiClub?.name || t?.parent_name || '').trim(),
                slug: String(apiClub?.slug || '').trim(),
                role: '', membership_id: null,
            } as unknown as Project);
        }
        return Array.from(merged.values());
    }, [clubMemberships, teamMemberships, s.clubsById]);

    const clubSlugById = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            const slug = String(c?.slug || '').trim();
            if (id && slug) m.set(id, slug);
        }
        for (const [id, club] of s.clubsById.entries()) {
            const slug = String(club?.slug || '').trim();
            if (id && slug && !m.has(id)) m.set(id, slug);
        }
        return m;
    }, [clubMemberships, s.clubsById]);

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
        const q = s.hierarchySearch.trim().toLowerCase();
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
    }, [teamSeasonPairs, s.hierarchySearch, clubSlugById, primaryOrgSlug]);

    const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
    const userDisplayName = api.user
        ? `${api.user.first_name || ''} ${api.user.last_name || ''}`.trim() ||
          String(api.user.email || '') || `User ${userId}`
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
    }, [userId]);

    // Link modal options
    useEffect(() => {
        if (!s.isLinkModalOpen) return;
        void api.ensureLinkOptionsLoaded();
    }, [s.isLinkModalOpen]);

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
                const data = await apiClient.get<{ current_balance?: number }>(
                    `/transactions/organizations/${encodeURIComponent(orgIdForBalance)}/balance/me/`,
                    controller.signal,
                );
                const v = data?.current_balance;
                if (!cancelled) setUserBalance(v != null ? String(v) : null);
            } catch (e: unknown) {
              logger.error('Failed to fetch balance', e);
                if (!cancelled) setUserBalanceError(e instanceof Error ? e.message : 'Failed to fetch balance');
            } finally {
                if (!cancelled) setUserBalanceLoading(false);
            }
        };
        run();
        return () => { cancelled = true; controller.abort(); };
    }, [activeTab, apiBaseUrl, s.userBalanceReloadToken]);

    // Relations (clubs, competitions, matches)
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!userId || !primaryOrgSlug || !api.user) return;
            setLoadingRelations(true);
            try {
                const clubs = await apiClient.listAll<Project>('/projects/', {
                    params: { organisation_id: primaryOrgSlug, parent_project__isnull: 'true' },
                    pageSize: 200, maxItems: 2000,
                });
                if (!cancelled) {
                    const map = new Map<string, Project>();
                    for (const c of clubs || []) {
                        const id = String(c?.id || '').trim();
                        if (id) map.set(id, c);
                    }
                    setClubsById(map);
                }
                const competitionsAll: Period[] = [];
                const matchesAll: Activity[] = [];
                for (const pair of teamSeasonPairs) {
                    const competitions = await apiClient.listAll<Period>('/periods/', {
                        params: { parent_id: pair.seasonId, project_id: pair.teamId },
                        pageSize: 250, maxItems: 2000,
                    });
                    competitionsAll.push(...(competitions || []));
                    const matches = await apiClient.listAll<Activity>('/activities/', {
                        params: {
                            project_id: pair.teamId,
                            period_id: pair.seasonId,
                            include_descendants: 'true',
                            activity_type: 'match',
                            ordering: '-start_time',
                        },
                        pageSize: 250, maxItems: 250,
                    });
                    matchesAll.push(...(matches || []));
                }
                if (!cancelled) {
                    setLinkedCompetitions([...new Map(competitionsAll.map((c) => [String(c?.id || ''), c])).values()].filter(Boolean));
                    setLinkedMatches([...new Map(matchesAll.map((m) => [String(m?.id || ''), m])).values()].filter(Boolean));
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
        hierarchySearch: s.hierarchySearch, setHierarchySearch, hierarchyRows,
        clubsById: s.clubsById, linkedCompetitions: s.linkedCompetitions, linkedMatches: s.linkedMatches, loadingRelations: s.loadingRelations,
        saveMatchEdits: api.saveMatchEdits, deleteMatch: api.deleteMatch,
        identityEditing: s.identityEditing, setIdentityEditing,
        identityFirstName: s.identityFirstName, setIdentityFirstName,
        identityLastName: s.identityLastName, setIdentityLastName,
        identitySaving: s.identitySaving, setIdentitySaving,
        identitySaveError: s.identitySaveError, setIdentitySaveError,
        identitySaveSuccess: s.identitySaveSuccess, setIdentitySaveSuccess,
        userBalance: s.userBalance, userBalanceLoading: s.userBalanceLoading, userBalanceError: s.userBalanceError,
        userBalanceReloadToken: s.userBalanceReloadToken, setUserBalanceReloadToken,
        fetchUser: api.fetchUser, handleSaveUser: api.handleSaveUser,
        handleDeleteUser: api.handleDeleteUser,
        getCsrfToken, getPreferredOrganisationId, renderNavLink,
        updateOrganisationMembershipRole: api.updateOrganisationMembershipRole,
        removeOrganisationMembership: api.removeOrganisationMembership,
        updateProjectMembershipRole: api.updateProjectMembershipRole,
        removeProjectMembership: api.removeProjectMembership,
        isViewModalOpen: s.isViewModalOpen, setIsViewModalOpen,
        isEditModalOpen: s.isEditModalOpen, setIsEditModalOpen,
        isLinkModalOpen: s.isLinkModalOpen, setIsLinkModalOpen,
        isCreateTxnModalOpen: s.isCreateTxnModalOpen, setIsCreateTxnModalOpen,
        isMatchEditModalOpen: s.isMatchEditModalOpen, setIsMatchEditModalOpen,
        selectedEditMatch: s.selectedEditMatch, setSelectedEditMatch,
        isEditMembershipModalOpen: s.isEditMembershipModalOpen, setIsEditMembershipModalOpen,
        editingMembership: s.editingMembership, setEditingMembership,
        linkOrgs: api.linkOrgs, linkClubs: api.linkClubs, linkTeams: api.linkTeams,
        linkOptionsLoading: api.linkOptionsLoading, linkOptionsError: api.linkOptionsError,
        currentUserIdForTxn, targetUserIdForTxn, userWalletOptions,
    };
}

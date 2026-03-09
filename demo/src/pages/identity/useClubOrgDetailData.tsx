import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { api } from '@/api';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import { isSeasonPeriod } from './orgDetailUtils';
import {
    unwrapEnvelope, extractList, extractCount, looksLikeIdentifier,
    getTeamParentId, mergeUniqueById,
    type Organisation, type Project, type Period, type OverviewMember,
} from './clubOrgDetailHelpers';
import { useClubOrgHierarchy } from './useClubOrgHierarchy';

/** Raw member item from the organisation members API (overview tab). */
type RawMemberApiItem = {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    user?: RawMemberApiItem;
    project_memberships?: Array<{
        project_id?: string;
        project?: { id?: string; parent_id?: string; parent_project_id?: string };
    }>;
};

/* ═══════════════════════════════════════════════════════════════
   useClubOrgDetailData
   All state, data-loading effects & computed values for
   ClubOrganisationDetailPage.
   ═══════════════════════════════════════════════════════════════ */

export interface UseClubOrgDetailDataReturn {
    // Core
    org: Organisation | null;
    club: Project | null;
    loading: boolean;
    error: string | null;
    navigate: NavigateFunction;
    apiBaseUrl: string;
    activeContext: Record<string, unknown> | null;
    setActiveContextState: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    activatingContext: boolean;
    setActivatingContext: Dispatch<SetStateAction<boolean>>;
    // Modals
    isProjectEditModalOpen: boolean;
    setIsProjectEditModalOpen: Dispatch<SetStateAction<boolean>>;
    isProjectDetailModalOpen: boolean;
    setIsProjectDetailModalOpen: Dispatch<SetStateAction<boolean>>;
    // Tabs
    activeTabFromUrl: string;
    makeTabHref: (tabId: string) => string;
    // IDs / keys
    orgIdForDirectoryLists: string;
    orgSlugForDirectoryLists: string;
    clubIdForDirectoryLists: string;
    orgKeyForRoutes: string;
    clubKeyForRoutes: string;
    backToOrgHref: string;
    // Club switcher
    clubBreadcrumbOptions: BreadcrumbSwitcherOption[];
    orgClubsForSwitcherLoading: boolean;
    handleClubSwitch: (option: BreadcrumbSwitcherOption) => void;
    // Overview
    overviewLoading: boolean;
    overviewError: string | null;
    overviewTeams: Project[];
    overviewSeasons: Period[];
    overviewMembers: OverviewMember[];
    overviewCounts: { teams: number; seasons: number; members: number } | null;
    // Hierarchy (spread from useClubOrgHierarchy)
    hierarchySearch: string;
    setHierarchySearch: Dispatch<SetStateAction<string>>;
    hierarchyTeams: Project[];
    hierarchySeasonsByTeamId: Record<string, Period[]>;
    hierarchyCompetitionsCountByTeamId: Record<string, number>;
    hierarchyMatchesCountByTeamId: Record<string, number>;
    hierarchyCompetitionsCountBySeasonId: Record<string, number>;
    hierarchyMatchesCountBySeasonId: Record<string, number>;
    hierarchyMembersCountByTeamId: Record<string, number>;
    hierarchyMembersCountForClub: number | null;
    hierarchyLoading: boolean;
    hierarchyError: string | null;
    // Brand
    brandLogoUrl: string | null;
    brandProfileId: string | null;
}

export function useClubOrgDetailData(): UseClubOrgDetailDataReturn {
    const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const apiBaseUrl = getApiBaseUrl();

    const orgSlugOrId = String(orgId || '').trim();
    const clubSlugOrId = String(projectId || '').trim();

    // ── Slug resolution ──
    const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');
    const effectiveOrgSlug = useMemo(() => {
        const explicit = String(resolvedOrgSlug || '').trim();
        if (explicit) return explicit;
        const raw = String(orgSlugOrId || '').trim();
        return looksLikeIdentifier(raw) ? '' : raw;
    }, [orgSlugOrId, resolvedOrgSlug]);

    // ── Core entities ──
    const [org, setOrg] = useState<Organisation | null>(null);
    const [club, setClub] = useState<Project | null>(null);
    const [activeContext, setActiveContextState] = useState<Record<string, unknown> | null>(null);
    const [activatingContext, setActivatingContext] = useState(false);
    const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
    const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Overview tab ──
    const [overviewLoading, setOverviewLoading] = useState(false);
    const [overviewError, setOverviewError] = useState<string | null>(null);
    const [overviewTeams, setOverviewTeams] = useState<Project[]>([]);
    const [overviewSeasons, setOverviewSeasons] = useState<Period[]>([]);
    const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
    const [overviewCounts, setOverviewCounts] = useState<{ teams: number; seasons: number; members: number } | null>(null);

    // ── Brand ──
    const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
    const [brandProfileId, setBrandProfileId] = useState<string | null>(null);

    // ── Club switcher ──
    const [orgClubsForSwitcher, setOrgClubsForSwitcher] = useState<Project[]>([]);
    const [orgClubsForSwitcherLoading, setOrgClubsForSwitcherLoading] = useState(false);

    // ── Active tab (compact 5-tab layout) ──
    const activeTabFromUrl = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
        // Normalize legacy tab names
        const normalized =
            tab === 'people' || tab === 'users' ? 'members'
            : tab === 'hierarchy' || tab === 'seasons' || tab === 'competitions' || tab === 'matches' ? 'teams'
            : tab === 'assets' || tab === 'kits' || tab === 'settings' ? 'identity'
            : tab === 'balance' || tab === 'transactions' ? 'overview'
            : tab;
        const allowed = new Set(['overview', 'teams', 'members', 'media', 'identity']);
        return allowed.has(normalized) ? normalized : 'overview';
    }, [location.search]);

    const makeTabHref = (tabId: string): string => {
        const params = new URLSearchParams(location.search);
        const t = String(tabId || '').trim().toLowerCase();
        const normalized = t === 'people' || t === 'users' ? 'members' : t;
        if (!normalized || normalized === 'overview') params.delete('tab');
        else params.set('tab', normalized);
        const qs = params.toString();
        return qs ? `${location.pathname}?${qs}` : location.pathname;
    };

    // ── Computed IDs ──
    const orgIdForDirectoryLists = useMemo(() => String(org?.id || '').trim(), [org?.id]);
    const orgSlugForDirectoryLists = useMemo(() => String(org?.slug || resolvedOrgSlug || '').trim(), [org?.slug, resolvedOrgSlug]);
    const clubIdForDirectoryLists = useMemo(() => String(club?.id || '').trim(), [club?.id]);
    const orgKeyForRoutes = useMemo(() => {
        const slug = String(org?.slug || resolvedOrgSlug || '').trim();
        return slug || String(orgSlugOrId || '').trim();
    }, [org?.slug, orgSlugOrId, resolvedOrgSlug]);
    const clubKeyForRoutes = useMemo(() => String(club?.slug || clubSlugOrId || '').trim(), [club?.slug, clubSlugOrId]);

    // ── Hierarchy tab (sub-hook) ──
    const hierarchy = useClubOrgHierarchy({ activeTabFromUrl, apiBaseUrl, orgSlugForDirectoryLists, clubIdForDirectoryLists });

    const backToOrgHref = useMemo(() => {
        const orgKey = String(org?.slug || orgSlugOrId || '').trim();
        if (!orgKey) return '/federations';
        const params = new URLSearchParams(location.search || '');
        params.set('tab', 'clubs');
        return `/${encodeURIComponent(orgKey)}?${params.toString()}`;
    }, [location.search, org?.slug, orgSlugOrId]);

    const clubBreadcrumbOptions: BreadcrumbSwitcherOption[] = useMemo(() => {
        const base = (orgClubsForSwitcher || []).map((c: Project) => ({
            id: String(c.id),
            label: String(c.name || c.slug || c.id),
            slug: String(c.slug || c.id),
        }));
        if (club && !base.some((c) => String(c.id) === String(club.id))) {
            base.push({ id: String(club.id), label: String(club.name || club.slug || club.id), slug: String(club.slug || club.id) });
        }
        return base;
    }, [club, orgClubsForSwitcher]);

    const handleClubSwitch = (option: BreadcrumbSwitcherOption) => {
        const orgKey = String(org?.slug || orgSlugOrId || '').trim();
        if (!orgKey) return;
        navigate(`/${encodeURIComponent(orgKey)}/${encodeURIComponent(String(option.slug || option.id))}${location.search || ''}`);
    };

    // ═══════  EFFECTS  ═══════

    // Load active context
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const context = await getActiveContext();
                if (!cancelled) setActiveContextState(context);
            } catch (error) { console.error('Failed to load active context:', error); }
        };
        void run();
        return () => { cancelled = true; };
    }, []);

    // Load org + club
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!orgSlugOrId || !clubSlugOrId) throw new Error('Missing organisation or club identifier.');
                if (!effectiveOrgSlug) {
                    const { results: list } = await api.list<{ id?: string; slug?: string }>('/organisations/', { pageSize: 250 });
                    const match = list.find((o) => String(o?.id || '') === String(orgSlugOrId));
                    const slug = String(match?.slug || '').trim();
                    if (!slug) throw new Error('Organisation not found');
                    if (cancelled) return;
                    setResolvedOrgSlug(slug);
                    return;
                }
                const [loadedOrg, loadedClub] = await Promise.all([
                    api.get<Organisation>(`/organisations/${encodeURIComponent(effectiveOrgSlug)}/`),
                    api.get<Project>(`/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`),
                ]);
                if (cancelled) return;
                setOrg(loadedOrg);
                setClub(loadedClub);
            } catch (e) {
              console.error(e);
                if (cancelled) return;
                setError(e instanceof Error ? e.message : 'Failed to load club');
                setOrg(null);
                setClub(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [apiBaseUrl, orgSlugOrId, clubSlugOrId, effectiveOrgSlug]);

    // Overview tab data
    useEffect(() => {
        let cancelled = false;
        const loadOverview = async () => {
            if (activeTabFromUrl !== 'overview') return;
            const orgSlug = String(orgSlugForDirectoryLists || '').trim();
            const clubId = String(clubIdForDirectoryLists || '').trim();
            if (!orgSlug || !clubId) return;
            setOverviewLoading(true);
            setOverviewError(null);
            try {
                const { results: teamsList } = await api.list<any>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
                    pageSize: 2000,
                    params: { include_archived: 'true', parent_project__isnull: 'false' },
                });
                const clubTeams: Project[] = (teamsList || [])
                    .filter((t) => String(getTeamParentId(t) || '') === String(clubId))
                    .map((t) => ({ id: String(t?.id || '').trim(), name: String(t?.name || 'Team'), slug: t?.slug ? String(t.slug) : undefined, organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined, organisation: t?.organisation }))
                    .filter((t) => Boolean(t.id));

                const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
                let mergedSeasons: Period[] = [];
                if (teamIds.length > 0) {
                    const chunkSize = 50;
                    const chunks: string[][] = [];
                    for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));
                    const seasonsChunks = await Promise.all(
                        chunks.map(async (chunk) => {
                            const { results: typedList } = await api.list<Period>('/periods/', {
                                pageSize: 500,
                                params: { project_id__in: chunk.join(','), type: 'season' },
                            });
                            if (typedList.length > 0) return typedList;
                            const { results: untypedList } = await api.list<Period>('/periods/', {
                                pageSize: 500,
                                params: { project_id__in: chunk.join(',') },
                            });
                            return untypedList.filter(isSeasonPeriod);
                        }),
                    );
                    mergedSeasons = mergeUniqueById(seasonsChunks.flat());
                }

                const { results: membersList } = await api.list<RawMemberApiItem>(`/organisations/${encodeURIComponent(orgSlug)}/members/`, {
                    pageSize: 250,
                    params: { include_project_memberships: 'true', include_project_membership_details: 'true' },
                });
                const isMemberInClub = (item: RawMemberApiItem): boolean => {
                    const nestedUser = item?.user;
                    const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                    const memberships = item?.project_memberships || u?.project_memberships || [];
                    if (!Array.isArray(memberships) || memberships.length === 0) return false;
                    return memberships.some((m) => {
                        const pid = String(m?.project_id ?? m?.project?.id ?? '');
                        const parentId = String(m?.project?.parent_id ?? m?.project?.parent_project_id ?? '');
                        return pid === String(clubId) || parentId === String(clubId);
                    });
                };
                const normalizedMembers: OverviewMember[] = membersList.filter(isMemberInClub).map((item) => {
                    const nestedUser = item?.user;
                    const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                    return { id: String(u?.id ?? item?.id ?? '').trim(), email: u?.email, first_name: u?.first_name, last_name: u?.last_name };
                }).filter((u) => Boolean(u.id));

                if (cancelled) return;
                const sortedTeams = [...clubTeams].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
                const sortedSeasons = [...(mergedSeasons as Period[])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
                const sortedMembers = [...normalizedMembers].sort((a, b) => {
                    const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
                    const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
                    return an.localeCompare(bn);
                });
                setOverviewTeams(sortedTeams.slice(0, 6));
                setOverviewSeasons(sortedSeasons.slice(0, 6));
                setOverviewMembers(sortedMembers.slice(0, 6));
                setOverviewCounts({ teams: clubTeams.length, seasons: sortedSeasons.length, members: sortedMembers.length });
            } catch (e) {
              console.error(e);
                if (cancelled) return;
                setOverviewError(e instanceof Error ? e.message : 'Failed to load overview');
                setOverviewTeams([]); setOverviewSeasons([]); setOverviewMembers([]); setOverviewCounts(null);
            } finally {
                if (!cancelled) setOverviewLoading(false);
            }
        };
        void loadOverview();
        return () => { cancelled = true; };
    }, [activeTabFromUrl, apiBaseUrl, clubIdForDirectoryLists, orgSlugForDirectoryLists]);

    // Brand profile + logo
    useEffect(() => {
        let cancelled = false;
        const loadBrandLogo = async () => {
            if (activeTabFromUrl !== 'identity' && activeTabFromUrl !== 'kits') return;
            const pid = club?.id;
            if (!pid) return;
            try {
                const { results: profileList } = await api.list<any>('/branding/profiles/', { params: { project: String(pid) } });
                let profileId: string | null = profileList.length > 0 ? String(profileList[0]?.id || '') : null;
                if (!profileId) return;
                if (!cancelled) setBrandProfileId(profileId);
                const profile = await api.get<any>(`/branding/profiles/${profileId}/`);
                const assetList = profile?.assets || [];
                const logoAsset = assetList.find((a: { asset_type?: string; url?: string }) => a.asset_type === 'logo' || String(a.asset_type || '').includes('logo'));
                if (logoAsset?.url && !cancelled) {
                    const url = logoAsset.url;
                    if (url.startsWith('http')) setBrandLogoUrl(url);
                    else setBrandLogoUrl(`https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${url}`);
                }
            } catch (e) { console.error('Failed to load brand logo:', e); }
        };
        void loadBrandLogo();
        return () => { cancelled = true; };
    }, [activeTabFromUrl, apiBaseUrl, club]);

    // Load org clubs for switcher
    useEffect(() => {
        let cancelled = false;
        const loadOrgClubs = async () => {
            const orgSlug = String(orgSlugForDirectoryLists || effectiveOrgSlug || '').trim();
            if (!orgSlug) return;
            setOrgClubsForSwitcherLoading(true);
            try {
                const { results: list } = await api.list<{ id?: string; name?: string; slug?: string }>(`/organisations/${encodeURIComponent(orgSlug)}/projects/`, {
                    pageSize: 500,
                    params: { include_archived: 'true', parent_project__isnull: 'true' },
                });
                const normalized = mergeUniqueById(
                    (list || []).map((p) => ({ id: String(p?.id || '').trim(), name: String(p?.name || 'Club'), slug: p?.slug ? String(p.slug) : undefined })).filter((p) => Boolean(p.id)),
                );
                if (cancelled) return;
                setOrgClubsForSwitcher(normalized);
            } catch { if (cancelled) return; setOrgClubsForSwitcher([]); }
            finally { if (!cancelled) setOrgClubsForSwitcherLoading(false); }
        };
        void loadOrgClubs();
        return () => { cancelled = true; };
    }, [apiBaseUrl, effectiveOrgSlug, orgSlugForDirectoryLists]);

    // Resolve org UUID -> slug URL
    const shouldResolveOrg = useMemo(() => looksLikeIdentifier(orgSlugOrId), [orgSlugOrId]);
    useEffect(() => {
        if (!shouldResolveOrg) return;
        const slug = String(org?.slug || resolvedOrgSlug || '').trim();
        if (!slug || slug === orgSlugOrId) return;
        const clubKey = String(club?.slug || clubSlugOrId || '').trim();
        if (!clubKey) return;
        navigate(`/${encodeURIComponent(slug)}/${encodeURIComponent(clubKey)}${location.search || ''}`, { replace: true });
    }, [club, clubSlugOrId, location.search, navigate, org?.slug, orgSlugOrId, resolvedOrgSlug, shouldResolveOrg]);

    // Resolve club UUID -> slug URL
    const shouldResolveClub = useMemo(() => looksLikeIdentifier(clubSlugOrId), [clubSlugOrId]);
    useEffect(() => {
        if (!org || !club) return;
        if (!shouldResolveClub) return;
        const slug = String(club?.slug || '').trim();
        if (!slug || slug === clubSlugOrId) return;
        navigate(`/${encodeURIComponent(String(org?.slug || orgSlugOrId))}/${encodeURIComponent(slug)}${location.search || ''}`, { replace: true });
    }, [club, clubSlugOrId, location.search, navigate, org, orgSlugOrId, shouldResolveClub]);

    return {
        // Core
        org, club, loading, error, navigate, apiBaseUrl,
        activeContext, setActiveContextState, activatingContext, setActivatingContext,

        // Modals
        isProjectEditModalOpen, setIsProjectEditModalOpen,
        isProjectDetailModalOpen, setIsProjectDetailModalOpen,

        // Tabs
        activeTabFromUrl, makeTabHref,

        // IDs / keys
        orgIdForDirectoryLists, orgSlugForDirectoryLists,
        clubIdForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes,
        backToOrgHref,

        // Club switcher
        clubBreadcrumbOptions, orgClubsForSwitcherLoading, handleClubSwitch,

        // Overview
        overviewLoading, overviewError, overviewTeams, overviewSeasons, overviewMembers, overviewCounts,

        // Hierarchy
        ...hierarchy,

        // Brand
        brandLogoUrl, brandProfileId,
    };
}

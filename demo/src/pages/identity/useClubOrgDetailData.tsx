import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import { isSeasonPeriod } from './orgDetailUtils';
import {
    unwrapEnvelope, extractList, extractCount, looksLikeIdentifier,
    getTeamParentId, mergeUniqueById,
    type Organisation, type Project, type Period, type OverviewMember,
} from './clubOrgDetailHelpers';
import { useClubOrgHierarchy } from './useClubOrgHierarchy';

/* ═══════════════════════════════════════════════════════════════
   useClubOrgDetailData
   All state, data-loading effects & computed values for
   ClubOrganisationDetailPage.
   ═══════════════════════════════════════════════════════════════ */

export function useClubOrgDetailData() {
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
    const [activeContext, setActiveContextState] = useState<any | null>(null);
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

    // ── Active tab ──
    const activeTabFromUrl = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        const tab = String(params.get('tab') || 'overview').trim().toLowerCase();
        const normalized = tab === 'people' || tab === 'users' ? 'members' : tab;
        const allowed = new Set([
            'overview', 'hierarchy', 'teams', 'seasons', 'competitions',
            'matches', 'members', 'media', 'assets', 'balance',
            'transactions', 'identity', 'kits', 'settings',
        ]);
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
        const base = (orgClubsForSwitcher || []).map((c: any) => ({
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
                    const res = await fetch(`${apiBaseUrl}/api/v1/organisations/?page_size=250`, { credentials: 'include' });
                    if (!res.ok) throw new Error(`Failed to resolve organisation (${res.status})`);
                    const json = await res.json().catch(() => null);
                    const raw = unwrapEnvelope<any>(json);
                    const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
                    const match = list.find((o: any) => String(o?.id || '') === String(orgSlugOrId));
                    const slug = String(match?.slug || '').trim();
                    if (!slug) throw new Error('Organisation not found');
                    if (cancelled) return;
                    setResolvedOrgSlug(slug);
                    return;
                }
                const [orgRes, clubRes] = await Promise.all([
                    fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/`, { credentials: 'include' }),
                    fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(effectiveOrgSlug)}/projects/${encodeURIComponent(clubSlugOrId)}/`, { credentials: 'include' }),
                ]);
                if (!orgRes.ok) throw new Error(`Failed to load organisation (${orgRes.status})`);
                if (!clubRes.ok) throw new Error(`Failed to load club (${clubRes.status})`);
                const loadedOrg = unwrapEnvelope<Organisation>(await orgRes.json().catch(() => null));
                const loadedClub = unwrapEnvelope<Project>(await clubRes.json().catch(() => null));
                if (cancelled) return;
                setOrg(loadedOrg);
                setClub(loadedClub);
            } catch (e) {
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
                const teamsRes = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000&include_archived=true&parent_project__isnull=false`, { credentials: 'include' });
                if (!teamsRes.ok) throw new Error(`Failed to load teams (${teamsRes.status})`);
                const teamsJson = await teamsRes.json().catch(() => null);
                const teamsRaw = unwrapEnvelope<any>(teamsJson);
                const teamsList: any[] = Array.isArray(teamsRaw?.results) ? teamsRaw.results : Array.isArray(teamsRaw) ? teamsRaw : [];
                const clubTeams: Project[] = (teamsList || [])
                    .filter((t: any) => String(getTeamParentId(t) || '') === String(clubId))
                    .map((t: any) => ({ id: String(t?.id || '').trim(), name: String(t?.name || 'Team'), slug: t?.slug ? String(t.slug) : undefined, organisation_id: t?.organisation_id ? String(t.organisation_id) : undefined, organisation: t?.organisation }))
                    .filter((t) => Boolean(t.id));

                const teamIds = clubTeams.map((t) => String(t.id)).filter(Boolean);
                let mergedSeasons: any[] = [];
                if (teamIds.length > 0) {
                    const chunkSize = 50;
                    const chunks: string[][] = [];
                    for (let i = 0; i < teamIds.length; i += chunkSize) chunks.push(teamIds.slice(i, i + chunkSize));
                    const seasonsChunks = await Promise.all(
                        chunks.map(async (chunk) => {
                            const params = new URLSearchParams();
                            params.set('project_id__in', chunk.join(','));
                            params.set('page_size', '500');
                            const typed = new URLSearchParams(params);
                            typed.set('type', 'season');
                            const typedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${typed.toString()}`, { credentials: 'include' });
                            if (!typedRes.ok) throw new Error(`Failed to load seasons (${typedRes.status})`);
                            const typedJson = await typedRes.json().catch(() => null);
                            const typedList: any[] = extractList(unwrapEnvelope<any>(typedJson));
                            if (typedList.length > 0) return typedList;
                            const untypedRes = await fetch(`${apiBaseUrl}/api/v1/periods/?${params.toString()}`, { credentials: 'include' });
                            if (!untypedRes.ok) throw new Error(`Failed to load seasons (${untypedRes.status})`);
                            const untypedJson = await untypedRes.json().catch(() => null);
                            return extractList(unwrapEnvelope<any>(untypedJson)).filter(isSeasonPeriod);
                        }),
                    );
                    mergedSeasons = mergeUniqueById(seasonsChunks.flat() as any[]);
                }

                const memberParams = new URLSearchParams();
                memberParams.set('page_size', '250');
                memberParams.set('include_project_memberships', 'true');
                memberParams.set('include_project_membership_details', 'true');
                const membersRes = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${memberParams.toString()}`, { credentials: 'include' });
                if (!membersRes.ok) throw new Error(`Failed to load members (${membersRes.status})`);
                const membersJson = await membersRes.json().catch(() => null);
                const membersRawList = membersJson?.data?.data || membersJson?.data?.results || membersJson?.results || membersJson?.data || [];
                const membersList: any[] = Array.isArray(membersRawList) ? membersRawList : [];
                const isMemberInClub = (item: any): boolean => {
                    const nestedUser = item?.user;
                    const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
                    const memberships = item?.project_memberships || u?.project_memberships || [];
                    if (!Array.isArray(memberships) || memberships.length === 0) return false;
                    return memberships.some((m: any) => {
                        const pid = String(m?.project_id ?? m?.project?.id ?? '');
                        const parentId = String(m?.project?.parent_id ?? m?.project?.parent_project_id ?? '');
                        return pid === String(clubId) || parentId === String(clubId);
                    });
                };
                const normalizedMembers: OverviewMember[] = membersList.filter(isMemberInClub).map((item: any) => {
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
                const profileListRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?project=${pid}`, { credentials: 'include' });
                if (!profileListRes.ok) return;
                const profileListJson = await profileListRes.json().catch(() => null);
                const profileListData = profileListJson?.data;
                let profileId: string | null = null;
                if (profileListData?.results && Array.isArray(profileListData.results) && profileListData.results.length > 0) profileId = profileListData.results[0]?.id;
                else if (profileListData?.id) profileId = profileListData.id;
                else if (Array.isArray(profileListData) && profileListData.length > 0) profileId = profileListData[0]?.id;
                if (!profileId) return;
                if (!cancelled) setBrandProfileId(profileId);
                const profileDetailRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${profileId}/`, { credentials: 'include' });
                if (!profileDetailRes.ok) return;
                const profileDetailJson = await profileDetailRes.json().catch(() => null);
                const profile = profileDetailJson?.data || profileDetailJson;
                const assetList = profile?.assets || [];
                const logoAsset = assetList.find((a: any) => a.asset_type === 'logo' || String(a.asset_type || '').includes('logo'));
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
                const params = new URLSearchParams();
                params.set('page_size', '500');
                params.set('include_archived', 'true');
                params.set('parent_project__isnull', 'true');
                const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?${params.toString()}`, { credentials: 'include' });
                if (!res.ok) throw new Error(`Failed to load clubs (${res.status})`);
                const json = await res.json().catch(() => null);
                const raw = unwrapEnvelope<any>(json);
                const list: any[] = Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
                const normalized = mergeUniqueById(
                    (list || []).map((p: any) => ({ id: String(p?.id || '').trim(), name: String(p?.name || 'Club'), slug: p?.slug ? String(p.slug) : undefined })).filter((p: any) => Boolean(p.id)),
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

/**
 * useMediaLibData — Orchestrator hook for the Media Library page.
 *
 * Composes useMediaLibFetchers (brand assets + member media) with
 * filter/UI state, file-asset hook, and all derived filtered data.
 *
 * Extracted during Phase 26 refactoring.
 */
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getContentType } from '../../hooks/useBrandAssets';
import { useFileAssets, getFileTypeFilter, type FileTypeFilter } from '../../hooks/useFileAssets';
import type {
    HierarchyTab,
    OrganisationOption,
    ProjectOption,
    PreviewItem,
} from './medialibHelpers';
import { friendlyAssetLabel, getMemberContentType } from './medialibHelpers';
import { useMediaLibFetchers } from './useMediaLibFetchers';

export function useMediaLibData() {
    const location = useLocation();
    const { context, organisations: myOrganisations } = useContextSwitcher();
    const { user } = useAuth();
    const orgId = context.organisation?.id as string | undefined;
    const orgSlug = context.organisation?.slug as string | undefined;

    const userRole = String(user?.role || '').toLowerCase();
    const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';

    const rawTab = new URLSearchParams(location.search).get('tab') || 'organisation';
    const activeLevel = (
        ['organisation', 'club', 'team', 'member', 'files'].includes(rawTab)
            ? rawTab
            : 'organisation'
    ) as HierarchyTab;

    /* ---------- sub-hooks ----------------------------------------- */
    const fetchers = useMediaLibFetchers({ orgId, orgSlug });
    const { brandAssets, brandLoading, brandError, memberMedia, memberMediaLoading } = fetchers;

    const {
        files,
        loading: filesLoading,
        error: filesError,
        fetchFiles,
        getDownloadUrl,
    } = useFileAssets();

    /* ---------- filter state -------------------------------------- */
    const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
    const [clubs, setClubs] = useState<ProjectOption[]>([]);
    const [teams, setTeams] = useState<ProjectOption[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [subFilter, setSubFilter] = useState<string>('all');
    const [kitFilter, setKitFilter] = useState<string>('all');
    const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

    /* ---------- effects ------------------------------------------- */

    // Reset kit filter when sub-filter changes
    useEffect(() => { setKitFilter('all'); }, [subFilter]);

    // Load organisations
    useEffect(() => {
        if (!isSuperAdmin) {
            setOrganisations(
                myOrganisations.map((o) => ({
                    id: String(o.id),
                    name: o.name,
                    slug: o.slug,
                })),
            );
            return;
        }
        const load = async () => {
            const apiBaseUrl = getApiBaseUrl();
            try {
                const orgs = await fetchAllPages<any>(
                    `${apiBaseUrl}/api/v1/organisations/?page_size=100`,
                    { credentials: 'include' },
                    { ttlMs: 120_000 },
                );
                setOrganisations(
                    (orgs || []).map((o: any) => ({
                        id: String(o.id),
                        name: o.name,
                        slug: o.slug,
                    })),
                );
            } catch {
                // ignore
            }
        };
        load();
    }, [isSuperAdmin, myOrganisations]);

    // Load clubs and teams when org changes
    useEffect(() => {
        const load = async () => {
            const apiBaseUrl = getApiBaseUrl();
            const selectedOrg = selectedOrgId
                ? organisations.find((o) => String(o.id) === String(selectedOrgId))
                : null;
            const orgSlugForApi = selectedOrg?.slug || context.organisation?.slug || '';
            if (!orgSlugForApi) { setClubs([]); setTeams([]); return; }
            try {
                const [allClubs, allTeams] = await Promise.all([
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&parent_project__isnull=true`,
                        { credentials: 'include' },
                        { ttlMs: 120_000 },
                    ),
                    fetchAllPages<ProjectOption>(
                        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&parent_project__isnull=false`,
                        { credentials: 'include' },
                        { ttlMs: 120_000 },
                    ),
                ]);
                setClubs(allClubs);
                setTeams(allTeams);
            } catch {
                // ignore
            }
        };
        load();
    }, [selectedOrgId, organisations, context.organisation?.slug]);

    // Reset sub-filters when level changes
    useEffect(() => {
        setSubFilter('all');
        setFileTypeFilter('all');
        setSearchQuery('');
    }, [activeLevel]);

    // Fetch assets on mount
    useEffect(() => {
        if (orgId) {
            fetchers.fetchAllBrandAssets();
            fetchers.fetchMemberMediaItems();
            fetchFiles(orgId);
        }
    }, [orgId, fetchers.fetchAllBrandAssets, fetchers.fetchMemberMediaItems, fetchFiles]);

    /* ---------- derived data -------------------------------------- */

    const filteredTeams = useMemo(() => {
        if (!selectedClubId) return teams;
        return teams.filter((t) => String(t.parent_id) === String(selectedClubId));
    }, [teams, selectedClubId]);

    const filteredBrandAssets = useMemo(() => {
        let result = brandAssets;
        if (activeLevel === 'organisation') {
            result = result.filter((a) => {
                const pt = a.project_type;
                return (pt === null || pt === undefined) && !a.asset_type.startsWith('member_');
            });
        } else if (activeLevel === 'club') {
            result = result.filter(
                (a) => a.project_type === 'club' && !a.asset_type.startsWith('member_'),
            );
        } else if (activeLevel === 'team') {
            result = result.filter(
                (a) => a.project_type === 'team' && !a.asset_type.startsWith('member_'),
            );
        } else if (activeLevel === 'member') {
            result = [];
        }
        if (selectedClubId) {
            result = result.filter((a) => {
                const pid = a.project_id;
                const ppid = a.parent_project_id;
                if (activeLevel === 'club') return String(pid) === String(selectedClubId);
                if (activeLevel === 'team') return String(ppid) === String(selectedClubId);
                return true;
            });
        }
        if (selectedTeamId) {
            result = result.filter((a) => String(a.project_id) === String(selectedTeamId));
        }
        if (subFilter !== 'all') {
            if (activeLevel === 'member') {
                result = result.filter((a) => getMemberContentType(a.asset_type) === subFilter);
            } else if (activeLevel === 'organisation') {
                if (subFilter === 'logo') result = result.filter((a) => a.asset_type.startsWith('logo'));
                else if (subFilter === 'watermark') result = result.filter((a) => a.asset_type === 'watermark');
                else if (subFilter === 'favicon') result = result.filter((a) => a.asset_type === 'favicon');
                else if (subFilter === 'font') result = result.filter((a) => a.asset_type === 'font_file');
                else if (subFilter === 'location') result = result.filter((a) => a.asset_type === 'location_photo');
            } else {
                result = result.filter((a) => getContentType(a.asset_type) === subFilter);
            }
        }
        if (kitFilter !== 'all' && subFilter === 'kit') {
            result = result.filter((a) => a.asset_type.includes(`kit_${kitFilter}`));
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (a) =>
                    friendlyAssetLabel(a).toLowerCase().includes(q) ||
                    a.profile_name?.toLowerCase().includes(q) ||
                    a.project_name?.toLowerCase().includes(q) ||
                    a.asset_type.toLowerCase().includes(q) ||
                    a.file_details?.name?.toLowerCase().includes(q),
            );
        }
        return result;
    }, [brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, searchQuery]);

    const filteredFiles = useMemo(() => {
        let result = files;
        if (fileTypeFilter !== 'all') {
            result = result.filter((f) => getFileTypeFilter(f.mime_type) === fileTypeFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (f) =>
                    f.original_name?.toLowerCase().includes(q) ||
                    f.mime_type?.toLowerCase().includes(q),
            );
        }
        return result;
    }, [files, fileTypeFilter, searchQuery]);

    const filteredMemberMedia = useMemo(() => {
        if (activeLevel !== 'member') return [];
        let result = memberMedia;
        if (result.length === 0) {
            result = brandAssets
                .filter((a) => a.asset_type.startsWith('member_'))
                .map((a) => ({
                    id: a.id,
                    name: friendlyAssetLabel(a),
                    url: a.url || '',
                    asset_type: a.asset_type,
                    member_id: '',
                    member_name: '',
                    project_id: a.project_id || '',
                    project_name: a.project_name || '',
                    parent_project_id: a.parent_project_id || null,
                    kit_type: undefined,
                    created_at: a.created_at,
                }));
        }
        if (selectedTeamId) {
            result = result.filter((item) => String(item.project_id) === String(selectedTeamId));
        }
        if (selectedClubId && !selectedTeamId) {
            const teamIds = teams
                .filter((t) => String(t.parent_id) === String(selectedClubId))
                .map((t) => String(t.id));
            result = result.filter((item) => teamIds.includes(String(item.project_id)));
        }
        if (subFilter !== 'all') {
            result = result.filter((item) => {
                const at = item.asset_type || '';
                if (subFilter === 'member_profile' && at.includes('profile')) return true;
                if (subFilter === 'member_fullbody' && at.includes('fullbody')) return true;
                if (subFilter === 'member_closeup' && at.includes('closeup')) return true;
                if (subFilter === 'member_intro' && at.includes('intro')) return true;
                if (subFilter === 'member_celebration' && at.includes('celebration')) return true;
                return false;
            });
        }
        if (kitFilter !== 'all' && (subFilter === 'member_fullbody' || subFilter === 'member_closeup')) {
            result = result.filter((item) => item.kit_type === kitFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.name?.toLowerCase().includes(q) ||
                    item.member_name?.toLowerCase().includes(q) ||
                    item.project_name?.toLowerCase().includes(q) ||
                    item.asset_type?.toLowerCase().includes(q),
            );
        }
        return result;
    }, [memberMedia, brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, teams, searchQuery]);

    const subTabCounts = useMemo(() => {
        if (activeLevel === 'member') {
            let relevantItems: { asset_type: string; project_id: string }[] = memberMedia.map(
                (m) => ({ asset_type: m.asset_type, project_id: m.project_id }),
            );
            if (relevantItems.length === 0) {
                relevantItems = brandAssets
                    .filter((a) => a.asset_type.startsWith('member_'))
                    .map((a) => ({
                        asset_type: a.asset_type,
                        project_id: a.project_id || '',
                    }));
            }
            if (selectedTeamId) {
                relevantItems = relevantItems.filter(
                    (item) => String(item.project_id) === String(selectedTeamId),
                );
            } else if (selectedClubId) {
                const teamIds = teams
                    .filter((t) => String(t.parent_id) === String(selectedClubId))
                    .map((t) => String(t.id));
                relevantItems = relevantItems.filter((item) =>
                    teamIds.includes(String(item.project_id)),
                );
            }
            const counts: Record<string, number> = { all: relevantItems.length };
            relevantItems.forEach((item) => {
                const at = item.asset_type || '';
                if (at.includes('profile')) counts.member_profile = (counts.member_profile || 0) + 1;
                else if (at.includes('fullbody')) counts.member_fullbody = (counts.member_fullbody || 0) + 1;
                else if (at.includes('closeup')) counts.member_closeup = (counts.member_closeup || 0) + 1;
                else if (at.includes('intro')) counts.member_intro = (counts.member_intro || 0) + 1;
                else if (at.includes('celebration')) counts.member_celebration = (counts.member_celebration || 0) + 1;
            });
            return counts;
        }
        const levelAssets =
            activeLevel === 'files'
                ? []
                : brandAssets.filter((a) => {
                      if (activeLevel === 'organisation') return a.project_type === null;
                      if (activeLevel === 'club') return a.project_type === 'club';
                      if (activeLevel === 'team') return a.project_type === 'team';
                      return false;
                  });
        const counts: Record<string, number> = { all: levelAssets.length };
        if (activeLevel === 'organisation') {
            levelAssets.forEach((a) => {
                if (a.asset_type.startsWith('logo')) counts.logo = (counts.logo || 0) + 1;
                else if (a.asset_type === 'watermark') counts.watermark = (counts.watermark || 0) + 1;
                else if (a.asset_type === 'favicon') counts.favicon = (counts.favicon || 0) + 1;
                else if (a.asset_type === 'font_file') counts.font = (counts.font || 0) + 1;
                else if (a.asset_type === 'location_photo') counts.location = (counts.location || 0) + 1;
            });
        } else {
            levelAssets.forEach((a) => {
                const ct = getContentType(a.asset_type);
                counts[ct] = (counts[ct] || 0) + 1;
            });
        }
        return counts;
    }, [brandAssets, memberMedia, activeLevel, selectedClubId, selectedTeamId, teams]);

    const fileTypeCounts = useMemo(
        () => ({
            all: files.length,
            image: files.filter((f) => getFileTypeFilter(f.mime_type) === 'image').length,
            video: files.filter((f) => getFileTypeFilter(f.mime_type) === 'video').length,
            document: files.filter((f) => getFileTypeFilter(f.mime_type) === 'document').length,
            font: files.filter((f) => getFileTypeFilter(f.mime_type) === 'font').length,
        }),
        [files],
    );

    /* ---------- derived scalars ----------------------------------- */
    const loading =
        brandLoading ||
        (activeLevel === 'files' && filesLoading) ||
        (activeLevel === 'member' && memberMediaLoading);
    const error = activeLevel === 'files' ? filesError : brandError;

    const handleDownload = async (fileId: string) => {
        const url = await getDownloadUrl(fileId);
        if (url) window.open(url, '_blank');
    };

    const clearFilters = () => {
        setSelectedOrgId('');
        setSelectedClubId('');
        setSelectedTeamId('');
        setSubFilter('all');
        setKitFilter('all');
        setSearchQuery('');
    };

    /* ---------- return -------------------------------------------- */
    return {
        orgId, orgSlug, isSuperAdmin, activeLevel,
        brandAssets, memberMedia, files,
        filteredBrandAssets, filteredFiles, filteredMemberMedia, filteredTeams,
        subTabCounts, fileTypeCounts,
        organisations, clubs, teams,
        selectedOrgId, setSelectedOrgId,
        selectedClubId, setSelectedClubId,
        selectedTeamId, setSelectedTeamId,
        subFilter, setSubFilter,
        kitFilter, setKitFilter,
        fileTypeFilter, setFileTypeFilter,
        searchQuery, setSearchQuery,
        previewItem, setPreviewItem,
        loading, error,
        handleDownload, clearFilters,
    };
}

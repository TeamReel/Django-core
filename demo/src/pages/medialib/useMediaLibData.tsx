import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import { fetchAllPages } from '../../utils/fetchAllPages';
import {
  getContentType,
  type BrandAsset,
} from '../../hooks/useBrandAssets';
import {
  useFileAssets,
  getFileTypeFilter,
  type FileTypeFilter,
} from '../../hooks/useFileAssets';
import type {
  HierarchyTab,
  OrganisationOption,
  ProjectOption,
  MemberMediaItem,
  PreviewItem,
} from './medialibHelpers';
import { friendlyAssetLabel, getMemberContentType } from './medialibHelpers';

export function useMediaLibData() {
  const location = useLocation();
  const { context, organisations: myOrganisations } = useContextSwitcher();
  const { user } = useAuth();
  const orgId = (context as any)?.organisation?.id as string | undefined;
  const orgSlug = (context as any)?.organisation?.slug as string | undefined;

  const userRole = String((user as any)?.role || '').toLowerCase();
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';

  // Read level from URL (set by Panel B sidebar)
  const rawTab = new URLSearchParams(location.search).get('tab') || 'organisation';
  const activeLevel = (['organisation', 'club', 'team', 'member', 'files'].includes(rawTab) ? rawTab : 'organisation') as HierarchyTab;

  // Brand assets state
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Member media items state
  const [memberMedia, setMemberMedia] = useState<MemberMediaItem[]>([]);
  const [memberMediaLoading, setMemberMediaLoading] = useState(false);

  // File assets hook
  const { files, loading: filesLoading, error: filesError, fetchFiles, getDownloadUrl } = useFileAssets();

  // Filter state
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Sub-filter state
  const [subFilter, setSubFilter] = useState<string>('all');
  const [kitFilter, setKitFilter] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);

  // Reset kit filter when sub-filter changes
  useEffect(() => {
    setKitFilter('all');
  }, [subFilter]);

  // Load organisations
  useEffect(() => {
    if (!isSuperAdmin) {
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: (o as any).slug })));
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
        setOrganisations((orgs || []).map((o: any) => ({ id: String(o.id), name: o.name, slug: o.slug })));
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

      if (!orgSlugForApi) {
        setClubs([]);
        setTeams([]);
        return;
      }

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

  // Comprehensive asset fetching
  const fetchAllBrandAssets = useCallback(async () => {
    if (!orgId || !orgSlug) return;

    setBrandLoading(true);
    setBrandError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();

      const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
        const all: T[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const res = await fetch(nextUrl, { credentials: 'include' });
          if (!res.ok) {
            console.warn('[MediaLib] Fetch failed:', url, res.status);
            break;
          }
          const json = await res.json();
          const items: T[] = Array.isArray(json.data?.results) ? json.data.results
            : Array.isArray(json.data) ? json.data
            : Array.isArray(json.results) ? json.results
            : Array.isArray(json) ? json : [];
          all.push(...items);
          nextUrl = json.data?.next || json.meta?.pagination?.next || json.next || null;
        }
        return all;
      };

      const allProfiles = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/branding/profiles/?organisation_scope=${orgId}&page_size=500`,
      );

      console.log('[MediaLib] All brand profiles (organisation_scope):', allProfiles.length);

      const orgProfiles = allProfiles.filter((p: any) => !p.project);
      const clubProfiles = allProfiles.filter((p: any) => p.project_type === 'club');
      const teamProfiles = allProfiles.filter((p: any) => p.project_type === 'team');

      console.log('[MediaLib] Profiles by type:', {
        org: orgProfiles.length,
        club: clubProfiles.length,
        team: teamProfiles.length,
      });

      let allAssets: BrandAsset[] = [];
      try {
        const bulkUrl = `${apiBaseUrl}/api/v1/branding/assets/?organisation_scope=${orgId}&page_size=500`;
        console.log('[MediaLib] Fetching bulk assets from:', bulkUrl);
        const bulkRes = await fetch(bulkUrl, { credentials: 'include' });
        console.log('[MediaLib] Bulk assets response status:', bulkRes.status);

        if (bulkRes.ok) {
          const bulkJson = await bulkRes.json();
          console.log('[MediaLib] Bulk assets raw response keys:', Object.keys(bulkJson));
          allAssets = Array.isArray(bulkJson.data?.results) ? bulkJson.data.results
            : Array.isArray(bulkJson.data) ? bulkJson.data
            : Array.isArray(bulkJson.results) ? bulkJson.results
            : Array.isArray(bulkJson) ? bulkJson : [];
          console.log('[MediaLib] Bulk assets parsed count:', allAssets.length);
        }
      } catch (bulkErr) {
        console.warn('[MediaLib] Bulk assets fetch failed, using fallback:', bulkErr);
      }

      // Fallback: if bulk endpoint returned 0 assets, fetch per-profile
      if (allAssets.length === 0 && allProfiles.length > 0) {
        console.log('[MediaLib] Using fallback: fetching assets per profile');
        const BATCH_SIZE = 10;
        for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
          const batch = allProfiles.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (profile: any) => {
              try {
                const res = await fetch(
                  `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/assets/?page_size=100`,
                  { credentials: 'include' }
                );
                if (!res.ok) return [];
                const json = await res.json();
                const assets: BrandAsset[] = Array.isArray(json.data?.results) ? json.data.results
                  : Array.isArray(json.data) ? json.data
                  : Array.isArray(json.results) ? json.results
                  : Array.isArray(json) ? json : [];
                return assets.map((a: BrandAsset) => ({
                  ...a,
                  profile_name: profile.name,
                  project_id: profile.project ? String(profile.project) : null,
                  project_name: profile.project_name ?? null,
                  project_type: profile.project_type ?? null,
                  parent_project_id: profile.parent_project_id ? String(profile.parent_project_id) : null,
                  organisation_name: profile.organisation_name ?? null,
                }));
              } catch {
                return [];
              }
            })
          );
          allAssets.push(...batchResults.flat());
        }
        console.log('[MediaLib] Fallback fetched:', allAssets.length, 'assets');
      }

      const orgAssets = allAssets.filter((a: any) => a.project_type === null || a.project_type === undefined);
      const clubAssets = allAssets.filter((a: any) => a.project_type === 'club');
      const teamAssets = allAssets.filter((a: any) => a.project_type === 'team');
      console.log('[MediaLib] Brand assets by level:', {
        organisation: orgAssets.length,
        club: clubAssets.length,
        team: teamAssets.length,
        total: allAssets.length,
      });

      setBrandAssets(allAssets);
    } catch (err: any) {
      setBrandError(err.message || 'Failed to load brand assets');
    } finally {
      setBrandLoading(false);
    }
  }, [orgId, orgSlug]);

  // Member media items
  const fetchMemberMediaItems = useCallback(async () => {
    if (!orgSlug) return;

    setMemberMediaLoading(true);

    try {
      const apiBaseUrl = getApiBaseUrl();

      const fetchPaginated = async <T,>(url: string): Promise<T[]> => {
        const all: T[] = [];
        let nextUrl: string | null = url;
        while (nextUrl) {
          const res = await fetch(nextUrl, { credentials: 'include' });
          if (!res.ok) break;
          const json = await res.json();
          const items: T[] = Array.isArray(json.data?.results) ? json.data.results
            : Array.isArray(json.data) ? json.data
            : Array.isArray(json.results) ? json.results
            : Array.isArray(json) ? json : [];
          all.push(...items);
          nextUrl = json.data?.next || json.meta?.pagination?.next || json.next || null;
        }
        return all;
      };

      const allProjects = await fetchPaginated<any>(
        `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?page_size=2000`,
      );
      const teamProjects = allProjects.filter((p: any) => !!p.parent_id);

      console.log('[MediaLib] Fetching member assets from', teamProjects.length, 'teams');

      const memberAssets: MemberMediaItem[] = [];

      const BATCH_SIZE = 5;
      let failedTeamCount = 0;
      const allMembershipData: { membership: any; team: any }[] = [];

      for (let i = 0; i < teamProjects.length; i += BATCH_SIZE) {
        const batch = teamProjects.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (team: any) => {
            try {
              const res = await fetch(
                `${apiBaseUrl}/api/v1/projects/${team.id}/members/?page_size=200`,
                { credentials: 'include' }
              );
              if (!res.ok) {
                failedTeamCount++;
                return [];
              }
              const json = await res.json();
              const memberships: any[] = Array.isArray(json.data?.results) ? json.data.results
                : Array.isArray(json.data) ? json.data
                : Array.isArray(json.results) ? json.results
                : Array.isArray(json) ? json : [];
              return memberships.map((m: any) => ({ membership: m, team }));
            } catch {
              failedTeamCount++;
              return [];
            }
          })
        );
        allMembershipData.push(...batchResults.flat());
      }

      console.log('[MediaLib] Total memberships fetched:', allMembershipData.length,
        failedTeamCount > 0 ? `(${failedTeamCount} teams failed)` : '');

      if (allMembershipData.length > 0) {
        const sample = allMembershipData[0].membership;
        console.log('[MediaLib] Sample membership:', {
          id: sample.id,
          hasMetadata: !!sample.metadata,
          metadataKeys: sample.metadata ? Object.keys(sample.metadata) : [],
          hasTeamreelAssets: !!sample.metadata?.teamreel_assets,
          teamreelAssetsKeys: sample.metadata?.teamreel_assets ? Object.keys(sample.metadata.teamreel_assets) : [],
        });
      }

      for (const { membership, team } of allMembershipData) {
        const tr = membership.metadata?.teamreel_assets || {};
        const memberUser = membership.user || {};
        const memberName = memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email || 'Unknown';

        const addAsset = (assetType: string, url: string, kitType?: string) => {
          if (!url) return;
          memberAssets.push({
            id: `${membership.id}-${assetType}${kitType ? `-${kitType}` : ''}`,
            name: `${memberName} - ${assetType}${kitType ? ` (${kitType})` : ''}`,
            url,
            asset_type: `member_${assetType}`,
            member_id: membership.id,
            member_name: memberName,
            project_id: String(team.id),
            project_name: team.name,
            parent_project_id: team.parent_id ? String(team.parent_id) : null,
            kit_type: kitType,
            created_at: membership.joined_at || membership.created_at,
          });
        };

        if (tr?.media?.profile?.url) {
          addAsset('profile', tr.media.profile.url);
        }

        const fullbodyImages = tr?.images?.fullbody || {};
        for (const [kitType, url] of Object.entries(fullbodyImages)) {
          if (url) addAsset('fullbody', url as string, kitType);
        }
        if (tr?.media?.kit?.url && !fullbodyImages['home']) {
          addAsset('fullbody', tr.media.kit.url, 'home');
        }

        const closeupImages = tr?.images?.closeup || {};
        for (const [kitType, url] of Object.entries(closeupImages)) {
          if (url) addAsset('closeup', url as string, kitType);
        }
        if (tr?.media?.closeup?.url && !closeupImages['home']) {
          addAsset('closeup', tr.media.closeup.url, 'home');
        }

        const introVideos = tr?.videos?.intro || {};
        for (const [variant, url] of Object.entries(introVideos)) {
          if (url) addAsset('intro_video', url as string, variant);
        }

        const celebrationVideos = tr?.videos?.celebration || {};
        for (const [variant, url] of Object.entries(celebrationVideos)) {
          if (url) addAsset('celebration_video', url as string, variant);
        }
      }

      console.log('[MediaLib] Member assets extracted:', memberAssets.length);

      const pathsToConvert = Array.from(
        new Set(
          memberAssets
            .map((a) => a.url)
            .filter(
              (url): url is string =>
                Boolean(url) &&
                !url.startsWith('http://') &&
                !url.startsWith('https://')
            )
        )
      );

      if (pathsToConvert.length > 0) {
        console.log('[MediaLib] Converting', pathsToConvert.length, 'storage paths to presigned URLs');
        try {
          const csrfToken = getCsrfToken();

          const chunks: string[][] = [];
          for (let i = 0; i < pathsToConvert.length; i += 100) {
            chunks.push(pathsToConvert.slice(i, i + 100));
          }

          const urlMap: Record<string, string | null> = {};
          for (const chunk of chunks) {
            const presignedRes = await fetch(`${apiBaseUrl}/api/v1/files/presigned-urls/`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
              },
              body: JSON.stringify({ paths: chunk }),
            });

            if (!presignedRes.ok) {
              console.warn('[MediaLib] Presigned URL fetch failed:', presignedRes.status);
              continue;
            }

            const presignedJson = await presignedRes.json();
            const chunkMap = presignedJson.data?.urls || presignedJson.urls || {};
            Object.assign(urlMap, chunkMap);
          }

          for (const asset of memberAssets) {
            if (!asset.url) continue;
            const maybeUrl = urlMap[asset.url];
            if (maybeUrl) asset.url = maybeUrl;
          }

          console.log('[MediaLib] Converted paths to presigned URLs');
        } catch (presignErr) {
          console.warn('[MediaLib] Presigned URL conversion error:', presignErr);
        }
      }

      setMemberMedia(memberAssets);
    } catch (err) {
      console.error('[MediaLib] Failed to fetch member assets:', err);
      setMemberMedia([]);
    } finally {
      setMemberMediaLoading(false);
    }
  }, [orgSlug]);

  // Fetch assets on mount
  useEffect(() => {
    if (orgId) {
      fetchAllBrandAssets();
      fetchMemberMediaItems();
      fetchFiles(orgId);
    }
  }, [orgId, fetchAllBrandAssets, fetchMemberMediaItems, fetchFiles]);

  // Filter teams by selected club
  const filteredTeams = useMemo(() => {
    if (!selectedClubId) return teams;
    return teams.filter((t) => String(t.parent_id) === String(selectedClubId));
  }, [teams, selectedClubId]);

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredBrandAssets = useMemo(() => {
    let result = brandAssets;

    const uniqueTypes = [...new Set(brandAssets.map(a => (a as any).project_type))];
    console.log('[MediaLib] Filtering - unique project_types:', uniqueTypes, 'activeLevel:', activeLevel);

    if (activeLevel === 'organisation') {
      result = result.filter(a => {
        const pt = (a as any).project_type;
        const isOrgLevel = pt === null || pt === undefined;
        const isMemberAsset = a.asset_type.startsWith('member_');
        return isOrgLevel && !isMemberAsset;
      });
      console.log('[MediaLib] Org filter result:', result.length, 'assets');
    } else if (activeLevel === 'club') {
      result = result.filter(a => (a as any).project_type === 'club' && !a.asset_type.startsWith('member_'));
      console.log('[MediaLib] Club filter result:', result.length, 'assets');
    } else if (activeLevel === 'team') {
      result = result.filter(a => (a as any).project_type === 'team' && !a.asset_type.startsWith('member_'));
      console.log('[MediaLib] Team filter result:', result.length, 'assets');
    } else if (activeLevel === 'member') {
      result = [];
    }

    if (selectedClubId) {
      result = result.filter(a => {
        const assetProjectId = (a as any).project_id;
        const assetParentProjectId = (a as any).parent_project_id;

        if (activeLevel === 'club') {
          return String(assetProjectId) === String(selectedClubId);
        } else if (activeLevel === 'team') {
          return String(assetParentProjectId) === String(selectedClubId);
        }
        return true;
      });
    }

    if (selectedTeamId) {
      result = result.filter(a => {
        const assetProjectId = (a as any).project_id;
        return String(assetProjectId) === String(selectedTeamId);
      });
    }

    if (subFilter !== 'all') {
      if (activeLevel === 'member') {
        result = result.filter(a => getMemberContentType(a.asset_type) === subFilter);
      } else if (activeLevel === 'organisation') {
        if (subFilter === 'logo') {
          result = result.filter(a => a.asset_type.startsWith('logo'));
        } else if (subFilter === 'watermark') {
          result = result.filter(a => a.asset_type === 'watermark');
        } else if (subFilter === 'favicon') {
          result = result.filter(a => a.asset_type === 'favicon');
        } else if (subFilter === 'font') {
          result = result.filter(a => a.asset_type === 'font_file');
        } else if (subFilter === 'location') {
          result = result.filter(a => a.asset_type === 'location_photo');
        }
      } else {
        result = result.filter(a => {
          const ct = getContentType(a.asset_type);
          return ct === subFilter;
        });
      }
    }

    if (kitFilter !== 'all' && subFilter === 'kit') {
      result = result.filter(a => a.asset_type.includes(`kit_${kitFilter}`));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        friendlyAssetLabel(a).toLowerCase().includes(q) ||
        a.profile_name?.toLowerCase().includes(q) ||
        a.project_name?.toLowerCase().includes(q) ||
        a.asset_type.toLowerCase().includes(q) ||
        a.file_details?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, clubs, teams, searchQuery]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (fileTypeFilter !== 'all') {
      result = result.filter(f => getFileTypeFilter(f.mime_type) === fileTypeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.original_name?.toLowerCase().includes(q) ||
        f.mime_type?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [files, fileTypeFilter, searchQuery]);

  const filteredMemberMedia = useMemo(() => {
    if (activeLevel !== 'member') return [];

    let result = memberMedia;

    console.log('[MediaLib] Member assets from memberships:', result.length);

    if (result.length === 0) {
      const memberBrandAssets = brandAssets
        .filter(a => a.asset_type.startsWith('member_'))
        .map(a => ({
          id: a.id,
          name: friendlyAssetLabel(a),
          url: a.url || '',
          asset_type: a.asset_type,
          member_id: '',
          member_name: '',
          project_id: (a as any).project_id || '',
          project_name: (a as any).project_name || '',
          parent_project_id: (a as any).parent_project_id || null,
          kit_type: undefined,
          created_at: a.created_at,
        }));
      result = memberBrandAssets;
      console.log('[MediaLib] Member fallback: using', memberBrandAssets.length, 'BrandAssets with member_* types');
    }

    if (selectedTeamId) {
      result = result.filter(item => String(item.project_id) === String(selectedTeamId));
    }

    if (selectedClubId && !selectedTeamId) {
      const teamIds = teams
        .filter(t => String(t.parent_id) === String(selectedClubId))
        .map(t => String(t.id));
      result = result.filter(item => teamIds.includes(String(item.project_id)));
    }

    if (subFilter !== 'all') {
      result = result.filter(item => {
        const assetType = item.asset_type || '';
        if (subFilter === 'member_profile' && assetType.includes('profile')) return true;
        if (subFilter === 'member_fullbody' && assetType.includes('fullbody')) return true;
        if (subFilter === 'member_closeup' && assetType.includes('closeup')) return true;
        if (subFilter === 'member_intro' && assetType.includes('intro')) return true;
        if (subFilter === 'member_celebration' && assetType.includes('celebration')) return true;
        return false;
      });
    }

    if (kitFilter !== 'all' && (subFilter === 'member_fullbody' || subFilter === 'member_closeup')) {
      result = result.filter(item => item.kit_type === kitFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.member_name?.toLowerCase().includes(q) ||
        item.project_name?.toLowerCase().includes(q) ||
        item.asset_type?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [memberMedia, brandAssets, activeLevel, subFilter, kitFilter, selectedClubId, selectedTeamId, teams, searchQuery]);

  const subTabCounts = useMemo(() => {
    if (activeLevel === 'member') {
      let relevantItems: { asset_type: string; project_id: string }[] = memberMedia.map(m => ({
        asset_type: m.asset_type,
        project_id: m.project_id,
      }));
      if (relevantItems.length === 0) {
        relevantItems = brandAssets
          .filter(a => a.asset_type.startsWith('member_'))
          .map(a => ({
            asset_type: a.asset_type,
            project_id: (a as any).project_id || '',
          }));
      }

      if (selectedTeamId) {
        relevantItems = relevantItems.filter(item => String(item.project_id) === String(selectedTeamId));
      } else if (selectedClubId) {
        const teamIds = teams
          .filter(t => String(t.parent_id) === String(selectedClubId))
          .map(t => String(t.id));
        relevantItems = relevantItems.filter(item => teamIds.includes(String(item.project_id)));
      }

      const counts: Record<string, number> = { all: relevantItems.length };
      relevantItems.forEach(item => {
        const assetType = item.asset_type || '';
        if (assetType.includes('profile')) counts.member_profile = (counts.member_profile || 0) + 1;
        else if (assetType.includes('fullbody')) counts.member_fullbody = (counts.member_fullbody || 0) + 1;
        else if (assetType.includes('closeup')) counts.member_closeup = (counts.member_closeup || 0) + 1;
        else if (assetType.includes('intro')) counts.member_intro = (counts.member_intro || 0) + 1;
        else if (assetType.includes('celebration')) counts.member_celebration = (counts.member_celebration || 0) + 1;
      });
      return counts;
    }

    const levelAssets = activeLevel === 'files'
      ? []
      : brandAssets.filter(a => {
          if (activeLevel === 'organisation') return (a as any).project_type === null;
          if (activeLevel === 'club') return (a as any).project_type === 'club';
          if (activeLevel === 'team') return (a as any).project_type === 'team';
          return false;
        });

    const counts: Record<string, number> = { all: levelAssets.length };

    if (activeLevel === 'organisation') {
      levelAssets.forEach(a => {
        if (a.asset_type.startsWith('logo')) counts.logo = (counts.logo || 0) + 1;
        else if (a.asset_type === 'watermark') counts.watermark = (counts.watermark || 0) + 1;
        else if (a.asset_type === 'favicon') counts.favicon = (counts.favicon || 0) + 1;
        else if (a.asset_type === 'font_file') counts.font = (counts.font || 0) + 1;
        else if (a.asset_type === 'location_photo') counts.location = (counts.location || 0) + 1;
      });
    } else {
      levelAssets.forEach(a => {
        const ct = getContentType(a.asset_type);
        counts[ct] = (counts[ct] || 0) + 1;
      });
    }

    return counts;
  }, [brandAssets, memberMedia, activeLevel, selectedClubId, selectedTeamId, teams]);

  const fileTypeCounts = useMemo(() => ({
    all: files.length,
    image: files.filter(f => getFileTypeFilter(f.mime_type) === 'image').length,
    video: files.filter(f => getFileTypeFilter(f.mime_type) === 'video').length,
    document: files.filter(f => getFileTypeFilter(f.mime_type) === 'document').length,
    font: files.filter(f => getFileTypeFilter(f.mime_type) === 'font').length,
  }), [files]);

  const loading = brandLoading || (activeLevel === 'files' && filesLoading) || (activeLevel === 'member' && memberMediaLoading);
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

  return {
    // Context
    orgId, orgSlug, isSuperAdmin, activeLevel,

    // Assets data
    brandAssets, memberMedia, files,
    filteredBrandAssets, filteredFiles, filteredMemberMedia, filteredTeams,

    // Counts
    subTabCounts, fileTypeCounts,

    // Filter state
    organisations, clubs, teams,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    subFilter, setSubFilter,
    kitFilter, setKitFilter,
    fileTypeFilter, setFileTypeFilter,
    searchQuery, setSearchQuery,

    // UI state
    previewItem, setPreviewItem,
    loading, error,

    // Handlers
    handleDownload, clearFilters,
  };
}

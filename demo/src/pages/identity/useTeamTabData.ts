import { useEffect, useMemo, useState } from 'react';

import { fetchAllPages } from '../../utils/fetchAllPages';
import { getMediaProcessingState } from '../../utils/mediaHelpers';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import useBrandProfile from '../../hooks/useBrandProfile';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import {
  type Period,
  type OverviewMember,
  mergeUniqueById,
  isSeasonPeriod,
  getParentPeriodId,
} from './teamDetailTypes';

/** Kit roles used for brand asset checklist */
const KIT_ROLES = [
  { id: 'home', label: 'Thuis tenue' },
  { id: 'away', label: 'Uit tenue' },
  { id: 'third', label: 'Derde tenue' },
  { id: 'keeper', label: 'Keeper tenue' },
];

/** Slots tracked on the overview */
const TRACKED_SLOTS = MEDIA_SLOTS.filter(
  (s) => ['profile', 'kit', 'closeup', 'intro', 'celebration'].includes(s.id),
);

interface UseTeamTabDataParams {
  activeTabFromUrl: string;
  apiBaseUrl: string;
  teamIdForDirectoryLists: string;
  clubIdForDirectoryLists: string;
  orgSlugForDirectoryLists: string;
  orgId: string;
  clubId: string;
}

export function useTeamTabData({
  activeTabFromUrl,
  apiBaseUrl,
  teamIdForDirectoryLists,
  clubIdForDirectoryLists,
  orgSlugForDirectoryLists,
  orgId,
  clubId,
}: UseTeamTabDataParams) {
  // ── Hierarchy state ──
  const [hierarchySeasons, setHierarchySeasons] = useState<Period[]>([]);
  const [hierarchyCompetitionsBySeasonId, setHierarchyCompetitionsBySeasonId] = useState<Record<string, Period[]>>({});
  const [hierarchyMatchesCountBySeasonId, setHierarchyMatchesCountBySeasonId] = useState<Record<string, number>>({});
  const [hierarchyMatchesCountByCompetitionId, setHierarchyMatchesCountByCompetitionId] = useState<Record<string, number>>({});
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);
  const [hierarchySearch, setHierarchySearch] = useState('');

  // ── Overview members state ──
  const [overviewMembers, setOverviewMembers] = useState<OverviewMember[]>([]);
  const [overviewMembersCount, setOverviewMembersCount] = useState<number | null>(null);
  const [overviewMembersLoading, setOverviewMembersLoading] = useState(false);
  const [overviewMembersError, setOverviewMembersError] = useState<string | null>(null);

  // ── Full members with media (for progress bars) ──
  const [fullMembers, setFullMembers] = useState<any[]>([]);
  const [fullMembersLoading, setFullMembersLoading] = useState(false);
  const [fullMembersRefreshKey, setFullMembersRefreshKey] = useState(0);
  const refreshFullMembers = () => setFullMembersRefreshKey((k) => k + 1);

  // ── Content count ──
  const [contentCount, setContentCount] = useState<number | null>(null);
  const [contentCountLoading, setContentCountLoading] = useState(false);

  // ── Team matches (for hierarchy expansion + overview recent matches) ──
  const [teamMatches, setTeamMatches] = useState<any[]>([]);
  const [teamMatchesLoading, setTeamMatchesLoading] = useState(false);

  // ── Brand profiles ──
  const clubBrand = useBrandProfile({
    projectId: clubId || undefined,
    organisationId: orgId || undefined,
    autoFetch: !!(clubId && (activeTabFromUrl === 'overview')),
  });

  const teamBrand = useBrandProfile({
    projectId: teamIdForDirectoryLists || undefined,
    organisationId: orgId || undefined,
    autoFetch: !!(teamIdForDirectoryLists && (activeTabFromUrl === 'overview')),
  });

  /** Pre-built kit URLs (team takes priority over club) */
  const batchBrandKits = useMemo(() => {
    const kits: Record<string, string | null> = {};
    for (const role of KIT_ROLES) {
      const teamAsset =
        teamBrand.getAsset?.(`kit_${role.id}_combined`) ||
        teamBrand.getAsset?.(`kit_${role.id}`);
      const clubAsset =
        clubBrand.getAsset?.(`kit_${role.id}_combined`) ||
        clubBrand.getAsset?.(`kit_${role.id}`);
      const asset = teamAsset || clubAsset;
      kits[role.id] = asset ? getAssetUrl(asset.url) : null;
    }
    return kits;
  }, [clubBrand, teamBrand]);

  const brandLogoUrl = useMemo(
    () =>
      clubBrand.getAsset?.('logo_upload')
        ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
        : null,
    [clubBrand],
  );

  const brandSponsorUrl = useMemo(
    () =>
      clubBrand.getAsset?.('sponsor_logo_upload')
        ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
        : null,
    [clubBrand],
  );

  /** Brand assets checklist */
  const brandAssets = useMemo(() => {
    const items: { label: string; present: boolean }[] = [
      { label: 'Logo', present: !!brandLogoUrl },
      { label: 'Sponsor', present: !!brandSponsorUrl },
    ];
    for (const role of KIT_ROLES) {
      if (batchBrandKits[role.id] !== undefined) {
        items.push({ label: role.label, present: !!batchBrandKits[role.id] });
      }
    }
    return items;
  }, [brandLogoUrl, brandSponsorUrl, batchBrandKits]);

  /** Media asset stats (per slot completion) */
  const assetStats = useMemo(() => {
    const total = fullMembers.length;
    return TRACKED_SLOTS.map((slot) => {
      const done = fullMembers.filter((m) => {
        const state = getMediaProcessingState(m, slot.id);
        return state === 'processed' || state === 'raw';
      }).length;
      return { ...slot, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [fullMembers]);

  // ── Load hierarchy (seasons → competitions → match counts) ──
  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      if (activeTabFromUrl !== 'hierarchy' && activeTabFromUrl !== 'overview') return;
      if (!teamIdForDirectoryLists) return;

      setHierarchyLoading(true);
      setHierarchyError(null);

      try {
        // 1) Seasons for this team (typed query first; fallback to untyped + competition parent seasons)
        const baseSeasonParams = new URLSearchParams();
        baseSeasonParams.set('page_size', '2000');

        const seasonProjectIds = [teamIdForDirectoryLists, clubIdForDirectoryLists].filter(Boolean);
        if (seasonProjectIds.length === 1) {
          baseSeasonParams.set('project_id', seasonProjectIds[0]);
        } else if (seasonProjectIds.length > 1) {
          baseSeasonParams.set('project_id__in', seasonProjectIds.join(','));
        }

        const typedParams = new URLSearchParams(baseSeasonParams);
        typedParams.set('type', 'season');

        const typedUrl = `${apiBaseUrl}/api/v1/periods/?${typedParams.toString()}`;
        const typedList: any[] = await fetchAllPages<any>(typedUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        const untypedUrl = `${apiBaseUrl}/api/v1/periods/?${baseSeasonParams.toString()}`;
        const untypedList: any[] = await fetchAllPages<any>(untypedUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        // Pull season parents from competitions as a last-resort source of truth.
        const competitionsParams = new URLSearchParams();
        competitionsParams.set('project_id', teamIdForDirectoryLists);
        competitionsParams.set('page_size', '2000');
        competitionsParams.set('type', 'competition');
        const competitionsUrl = `${apiBaseUrl}/api/v1/periods/?${competitionsParams.toString()}`;
        const competitionsList: any[] = await fetchAllPages<any>(
          competitionsUrl,
          { credentials: 'include' },
          { bypass: true, maxItems: 5000 },
        );
        const parentSeasonsFromCompetitions = (competitionsList || [])
          .map((c: any) => c?.parent_period)
          .filter((p: any) => p && (p?.id || p?.slug));

        const seasons = mergeUniqueById(
          [...(typedList || []), ...(untypedList || []), ...parentSeasonsFromCompetitions]
            .filter(isSeasonPeriod)
            .filter((p: any) => !getParentPeriodId(p)),
        );
        seasons.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

        if (cancelled) return;
        setHierarchySeasons(seasons);

        // 2) Competitions for this team (fetch all periods and group by season parent id)
        const periodsParams = new URLSearchParams();
        periodsParams.set('project_id', teamIdForDirectoryLists);
        periodsParams.set('page_size', '1000');

        const periodsUrl = `${apiBaseUrl}/api/v1/periods/?${periodsParams.toString()}`;
        const periodsList: any[] = await fetchAllPages<any>(periodsUrl, { credentials: 'include' }, { bypass: true, maxItems: 5000 });

        const seasonIds = new Set(seasons.map((s) => String(s.id)));
        const competitions = (periodsList || []).filter((p: any) => {
          const parentId = getParentPeriodId(p);
          if (!parentId) return false;
          return seasonIds.has(parentId);
        });

        const bySeason: Record<string, Period[]> = {};
        for (const c of competitions) {
          const parentId = getParentPeriodId(c);
          if (!parentId) continue;
          (bySeason[parentId] ||= []).push(c);
        }

        for (const key of Object.keys(bySeason)) {
          bySeason[key] = mergeUniqueById(bySeason[key]).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        }

        // Build children map for recursive activity counts.
        const childrenMap = new Map<string, any[]>();
        for (const p of periodsList || []) {
          const parentId = p?.parent_period_id ?? p?.parent_period?.id ?? null;
          if (!parentId) continue;
          const key = String(parentId);
          const arr = childrenMap.get(key) || [];
          arr.push(p);
          childrenMap.set(key, arr);
        }

        const getRecursiveActivitiesCount = (p: any): number => {
          let count = (p?.activities_count ?? 0);
          const children = childrenMap.get(String(p?.id));
          if (children) {
            for (const child of children) {
              count += getRecursiveActivitiesCount(child);
            }
          }
          return count;
        };

        const matchesCountByCompetitionId: Record<string, number> = {};
        for (const list of Object.values(bySeason)) {
          for (const c of list || []) {
            const cid = String(c?.id ?? '').trim();
            if (!cid) continue;
            matchesCountByCompetitionId[cid] = getRecursiveActivitiesCount(c);
          }
        }

        const matchesCountBySeasonId: Record<string, number> = {};
        for (const season of seasons) {
          const sid = String(season?.id ?? '').trim();
          if (!sid) continue;
          const comps = bySeason[sid] || [];
          matchesCountBySeasonId[sid] = comps.reduce((sum, c) => {
            const cid = String(c?.id ?? '').trim();
            return sum + (matchesCountByCompetitionId[cid] ?? 0);
          }, 0);
        }

        if (cancelled) return;
        setHierarchyCompetitionsBySeasonId(bySeason);
        setHierarchyMatchesCountByCompetitionId(matchesCountByCompetitionId);
        setHierarchyMatchesCountBySeasonId(matchesCountBySeasonId);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setHierarchyError(e instanceof Error ? e.message : 'Failed to load hierarchy');
        setHierarchySeasons([]);
        setHierarchyCompetitionsBySeasonId({});
        setHierarchyMatchesCountBySeasonId({});
        setHierarchyMatchesCountByCompetitionId({});
      } finally {
        if (!cancelled) setHierarchyLoading(false);
      }
    };

    void loadHierarchy();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  // ── Load overview members ──
  useEffect(() => {
    let cancelled = false;

    const extractMembersCount = (raw: any, list: any[]): number => {
      const metaTotal = raw?.meta?.pagination?.total;
      if (typeof metaTotal === 'number') return metaTotal;
      const dataCount = raw?.data?.count ?? raw?.count;
      if (typeof dataCount === 'number') return dataCount;
      return Array.isArray(list) ? list.length : 0;
    };

    const loadOverviewMembers = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const orgSlug = String(orgSlugForDirectoryLists || '').trim();
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!orgSlug || !teamId) return;

      setOverviewMembersLoading(true);
      setOverviewMembersError(null);

      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('include_project_memberships', 'true');
        params.set('include_project_membership_details', 'true');

        const url = `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/members/?${params.toString()}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        const json = await res.json().catch(() => null);

        const rawList = json?.data?.data || json?.data?.results || json?.results || json?.data || [];
        const list: any[] = Array.isArray(rawList) ? rawList : [];

        const isMemberInTeam = (item: any): boolean => {
          const nestedUser = item?.user;
          const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
          const memberships = item?.project_memberships || u?.project_memberships || [];
          if (!Array.isArray(memberships) || memberships.length === 0) return false;
          return memberships.some((m: any) => String(m?.project_id ?? m?.project?.id ?? '') === String(teamId));
        };

        const normalized: OverviewMember[] = list
          .filter(isMemberInTeam)
          .map((item: any) => {
            const nestedUser = item?.user;
            const u = nestedUser && typeof nestedUser === 'object' ? nestedUser : item;
            return {
              id: String(u?.id ?? item?.id ?? '').trim(),
              email: u?.email,
              first_name: u?.first_name,
              last_name: u?.last_name,
            };
          })
          .filter((u) => Boolean(u.id));

        const sorted = [...normalized].sort((a, b) => {
          const an = `${a?.last_name || ''} ${a?.first_name || ''} ${a?.email || ''}`.trim();
          const bn = `${b?.last_name || ''} ${b?.first_name || ''} ${b?.email || ''}`.trim();
          return an.localeCompare(bn);
        });

        if (cancelled) return;
        setOverviewMembers(sorted.slice(0, 6));
        setOverviewMembersCount(extractMembersCount(json, normalized));
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setOverviewMembers([]);
        setOverviewMembersCount(null);
        setOverviewMembersError(e instanceof Error ? e.message : 'Failed to load members');
      } finally {
        if (!cancelled) setOverviewMembersLoading(false);
      }
    };

    void loadOverviewMembers();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, orgSlugForDirectoryLists, teamIdForDirectoryLists]);

  // ── Load full members with media metadata (for asset progress) ──
  useEffect(() => {
    let cancelled = false;

    const loadFullMembers = async () => {
      if (!['overview', 'members', 'media'].includes(activeTabFromUrl)) return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setFullMembersLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(teamId)}/members/?page_size=200`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();
        const data = json?.data || json;
        const results = data?.results || (Array.isArray(data) ? data : []);

        // ── Deduplicate by user id (same player may appear with different periods) ──
        const byUserId = new Map<string, any>();
        for (const m of results) {
          const uid = String(m?.user?.id ?? m?.id ?? '').trim();
          if (!uid) continue;
          const existing = byUserId.get(uid);
          if (existing) {
            // Merge functional_roles arrays
            const existingRoles: string[] = existing.functional_roles || [];
            const newRoles: string[] = m.functional_roles || [];
            existing.functional_roles = [...new Set([...existingRoles, ...newRoles])];
            // Keep the entry with the most complete metadata (teamreel_assets)
            const existingAssets = Object.keys(existing?.metadata?.teamreel_assets || {}).length;
            const newAssets = Object.keys(m?.metadata?.teamreel_assets || {}).length;
            if (newAssets > existingAssets) {
              existing.metadata = m.metadata;
            }
          } else {
            byUserId.set(uid, { ...m });
          }
        }
        const deduped = Array.from(byUserId.values());

        // ── Sort alphabetically by name ──
        deduped.sort((a: any, b: any) => {
          const au = a?.user || a;
          const bu = b?.user || b;
          const aName = `${au?.last_name || ''} ${au?.first_name || ''} ${au?.email || ''}`.trim().toLowerCase();
          const bName = `${bu?.last_name || ''} ${bu?.first_name || ''} ${bu?.email || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName);
        });

        if (!cancelled) setFullMembers(deduped);
      } catch {
        if (!cancelled) setFullMembers([]);
      } finally {
        if (!cancelled) setFullMembersLoading(false);
      }
    };

    void loadFullMembers();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists, fullMembersRefreshKey]);

  // ── Load content count (generation requests for this team) ──
  useEffect(() => {
    let cancelled = false;

    const loadContentCount = async () => {
      if (activeTabFromUrl !== 'overview') return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setContentCountLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/generation-requests/?project=${encodeURIComponent(teamId)}&page_size=1`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) { if (!cancelled) setContentCount(0); return; }
        const json = await res.json();
        const data = json?.data || json;
        const count = data?.count ?? data?.meta?.pagination?.total ?? (Array.isArray(data?.results) ? data.results.length : 0);
        if (!cancelled) setContentCount(typeof count === 'number' ? count : 0);
      } catch {
        if (!cancelled) setContentCount(0);
      } finally {
        if (!cancelled) setContentCountLoading(false);
      }
    };

    void loadContentCount();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  // ── Load team matches (for hierarchy drill-down and overview recent matches) ──
  useEffect(() => {
    let cancelled = false;

    const loadTeamMatches = async () => {
      if (activeTabFromUrl !== 'overview' && activeTabFromUrl !== 'hierarchy') return;
      const teamId = String(teamIdForDirectoryLists || '').trim();
      if (!teamId) return;

      setTeamMatchesLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(teamId)}&activity_type=match&ordering=-start_time&page_size=250`;
        const list = await fetchAllPages<any>(url, { credentials: 'include' }, { bypass: true, maxItems: 500 });
        if (!cancelled) setTeamMatches(list || []);
      } catch {
        if (!cancelled) setTeamMatches([]);
      } finally {
        if (!cancelled) setTeamMatchesLoading(false);
      }
    };

    void loadTeamMatches();
    return () => { cancelled = true; };
  }, [activeTabFromUrl, apiBaseUrl, teamIdForDirectoryLists]);

  /** Matches grouped by period (competition) id */
  const teamMatchesByPeriodId = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const m of teamMatches) {
      const pid = String(m?.period_id || m?.period?.id || m?.period || '').trim();
      if (!pid) continue;
      (map[pid] ||= []).push(m);
    }
    return map;
  }, [teamMatches]);

  return {
    hierarchySeasons,
    hierarchyCompetitionsBySeasonId,
    hierarchyMatchesCountBySeasonId,
    hierarchyMatchesCountByCompetitionId,
    hierarchyLoading,
    hierarchyError,
    hierarchySearch,
    setHierarchySearch,
    overviewMembers,
    overviewMembersCount,
    overviewMembersLoading,
    overviewMembersError,
    // Brand
    brandAssets,
    brandLogoUrl,
    brandSponsorUrl,
    batchBrandKits,
    // Media progress
    fullMembers,
    fullMembersLoading,
    refreshFullMembers,
    assetStats,
    // Content
    contentCount,
    contentCountLoading,
    // Team matches
    teamMatches,
    teamMatchesLoading,
    teamMatchesByPeriodId,
  };
}

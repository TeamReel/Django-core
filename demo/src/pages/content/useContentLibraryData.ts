/**
 * useContentLibraryData — Data-fetching hook for Content Library
 *
 * Manages all data state, directory filter state, data-loading effects,
 * and derived filter memos. Extracted from ContentLibraryPage.tsx.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getAssetTypeLabel } from './contentLibraryTypes';
import {
  CONTENT_CATEGORIES,
  CONTENT_TYPE_FILTERS,
  type HierarchyTab,
  type ContentCategory,
  type OrganisationOption,
  type ProjectOption,
  type SeasonOption,
  type MatchOption,
  type ContentItem,
} from './contentLibraryTypes';

// ============================================================================
// Hook
// ============================================================================

interface Params {
  isSuperAdmin: boolean;
  myOrganisations: any[];
  orgSlug: string | undefined;
  activeLevel: HierarchyTab;
  urlCategory: ContentCategory | null;
  /** Pre-selected team ID from useAppSelection — auto-scopes gallery to user's team */
  autoTeamId?: string | null;
}

export function useContentLibraryData({ isSuperAdmin, myOrganisations, orgSlug, activeLevel, urlCategory, autoTeamId }: Params) {
  // ── Data state ──
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Directory filter state ──
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [matches, setMatches] = useState<MatchOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [autoScopeApplied, setAutoScopeApplied] = useState(false);

  // ── Auto-scope to user's team if available ──
  useEffect(() => {
    if (autoTeamId && !autoScopeApplied && !selectedTeamId) {
      setSelectedTeamId(autoTeamId);
      setAutoScopeApplied(true);
    }
  }, [autoTeamId, autoScopeApplied, selectedTeamId]);

  // ── Content filter state ──
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory>(urlCategory || 'all');
  const [subtypeFilter, setSubtypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  type SortOption = 'newest' | 'oldest' | 'title' | 'type';
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // ── Sync category from URL ──
  useEffect(() => {
    if (urlCategory && ['all', 'pre_match', 'during_match', 'post_match', 'season', 'member'].includes(urlCategory)) {
      setCategoryFilter(urlCategory);
      setSubtypeFilter('all');
    }
  }, [urlCategory]);

  // ── Load organisations ──
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
      } catch { /* ignore */ }
    };
    load();
  }, [isSuperAdmin, myOrganisations]);

  // ── Load clubs/teams when org changes ──
  useEffect(() => {
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      const selectedOrg = selectedOrgId ? organisations.find((o) => String(o.id) === String(selectedOrgId)) : null;
      const orgSlugForApi = selectedOrg?.slug || orgSlug || '';
      if (!orgSlugForApi) { setClubs([]); setTeams([]); return; }
      try {
        const [allClubs, allTeams] = await Promise.all([
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=500&parent_project__isnull=true`,
            { credentials: 'include' }, { ttlMs: 120_000 },
          ),
          fetchAllPages<ProjectOption>(
            `${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(orgSlugForApi)}/projects/?page_size=2000&parent_project__isnull=false`,
            { credentials: 'include' }, { ttlMs: 120_000 },
          ),
        ]);
        setClubs(allClubs);
        setTeams(allTeams);
      } catch { /* ignore */ }
    };
    load();
  }, [selectedOrgId, organisations, orgSlug]);

  // ── Filter teams by selected club ──
  const filteredTeams = useMemo(() => {
    if (!selectedClubId) return teams;
    return teams.filter((t) => {
      const parentId = typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project;
      return String(parentId) === String(selectedClubId);
    });
  }, [teams, selectedClubId]);

  // ── Load seasons when team changes ──
  useEffect(() => {
    if (!selectedTeamId) { setSeasons([]); return; }
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/periods/?project=${selectedTeamId}&period_type=season&page_size=100`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const items = data?.results || data?.data?.results || [];
          setSeasons(items.map((s: any) => ({ id: String(s.id), name: s.name, key: s.key || s.slug })));
        }
      } catch { /* ignore */ }
    };
    load();
  }, [selectedTeamId]);

  // ── Load matches when season changes ──
  useEffect(() => {
    if (!selectedSeasonId) { setMatches([]); return; }
    const load = async () => {
      const apiBaseUrl = getApiBaseUrl();
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/activities/?period=${selectedSeasonId}&activity_type=match&page_size=100&ordering=-activity_date`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
        );
        if (response.ok) {
          const data = await response.json();
          const items = data?.results || data?.data?.results || [];
          setMatches(items.map((m: any) => ({ id: String(m.id), title: m.title || m.name, slug: m.slug, activity_date: m.activity_date })));
        }
      } catch { /* ignore */ }
    };
    load();
  }, [selectedSeasonId]);

  // ── Fetch content items ──
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiBaseUrl();
      let url = `${apiBaseUrl}/api/v1/media/items/?page_size=200`;
      if (selectedMatchId) url += `&activity=${selectedMatchId}`;
      else if (selectedTeamId) url += `&project=${selectedTeamId}`;
      else if (selectedClubId) url += `&project=${selectedClubId}`;
      const response = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        const items = data?.results || data?.data?.results || [];
        setContentItems(Array.isArray(items) ? items : []);
      } else {
        setError('Kon content niet laden');
      }
    } catch (err) {
      console.error(err);
      setError('Fout bij laden van content');
      console.error('[ContentLibrary] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMatchId, selectedTeamId, selectedClubId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // ── Reset on level change ──
  useEffect(() => {
    setCategoryFilter('all');
    setSubtypeFilter('all');
    setSearchQuery('');
  }, [activeLevel]);

  // ── Filtered content ──
  const filteredContent = useMemo(() => {
    let result = contentItems;

    if (categoryFilter !== 'all') {
      const category = CONTENT_CATEGORIES.find(c => c.key === categoryFilter);
      if (category && category.subtypes.length > 0) {
        result = result.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return category.subtypes.includes(normalizedType);
        });
      }
    }

    if (subtypeFilter !== 'all') {
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
        const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
        return normalizedType === subtypeFilter;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || '';
        const clubName = (item.extraction_metadata?.club_name as string) || '';
        const teamName = (item.extraction_metadata?.team_name as string) || '';
        return (
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          assetType.toLowerCase().includes(q) ||
          getAssetTypeLabel(assetType).toLowerCase().includes(q) ||
          clubName.toLowerCase().includes(q) ||
          teamName.toLowerCase().includes(q)
        );
      });
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'newest': {
          const dateA = a.extraction_metadata?.activity_date || a.created_at;
          const dateB = b.extraction_metadata?.activity_date || b.created_at;
          cmp = new Date(dateB as string).getTime() - new Date(dateA as string).getTime();
          break;
        }
        case 'oldest': {
          const dateA = a.extraction_metadata?.activity_date || a.created_at;
          const dateB = b.extraction_metadata?.activity_date || b.created_at;
          cmp = new Date(dateA as string).getTime() - new Date(dateB as string).getTime();
          break;
        }
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '');
          break;
        case 'type': {
          const typeA = (a.extraction_metadata?.asset_type as string) || '';
          const typeB = (b.extraction_metadata?.asset_type as string) || '';
          cmp = typeA.localeCompare(typeB);
          break;
        }
      }
      return cmp === 0 ? String(a.id).localeCompare(String(b.id)) : cmp;
    });

    return result;
  }, [contentItems, categoryFilter, subtypeFilter, searchQuery, sortBy]);

  // ── Category & subtype counts ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contentItems.length };
    CONTENT_CATEGORIES.forEach(cat => {
      if (cat.key !== 'all') {
        counts[cat.key] = contentItems.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return cat.subtypes.includes(normalizedType);
        }).length;
      }
    });
    return counts;
  }, [contentItems]);

  const subtypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    const category = CONTENT_CATEGORIES.find(c => c.key === categoryFilter);
    const subtypes = category?.subtypes || [];
    if (categoryFilter === 'all') {
      CONTENT_TYPE_FILTERS.forEach(f => { counts[f.key] = 0; });
    } else {
      subtypes.forEach(st => { counts[st] = 0; });
    }
    contentItems.forEach(item => {
      const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
      const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
      if (categoryFilter === 'all' || subtypes.includes(normalizedType)) {
        counts[normalizedType] = (counts[normalizedType] || 0) + 1;
        counts.all = (counts.all || 0) + 1;
      }
    });
    return counts;
  }, [contentItems, categoryFilter]);

  // ── Clear all filters ──
  const clearFilters = useCallback(() => {
    setSelectedOrgId('');
    setSelectedClubId('');
    setSelectedTeamId('');
    setSelectedSeasonId('');
    setSelectedMatchId('');
    setCategoryFilter('all');
    setSubtypeFilter('all');
    setSearchQuery('');
  }, []);

  return {
    // Data
    contentItems, setContentItems, filteredContent,
    loading, error, fetchContent,
    // Directory filters
    organisations, clubs, filteredTeams, seasons, matches,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    selectedSeasonId, setSelectedSeasonId,
    selectedMatchId, setSelectedMatchId,
    // Content filters
    categoryFilter, setCategoryFilter,
    subtypeFilter, setSubtypeFilter,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    // Counts
    categoryCounts, subtypeCounts,
    // Actions
    clearFilters,
  };
}

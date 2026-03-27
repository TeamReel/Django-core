/**
 * useContentLibraryData — Data-fetching hook for Content Library
 *
 * Manages all data state, directory filter state, data-loading effects,
 * and derived filter memos. Extracted from ContentLibraryPage.tsx.
 */

import { useEffect, useReducer, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
import { api } from '@/api/client';
import { organisationsApi } from '@/api';
import { logger } from '@/utils/logger';
import { formReducer, makeSetter } from '@/utils/formReducer';
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
  myOrganisations: Array<{ id: string | number; name: string; slug?: string }>;
  orgSlug: string | undefined;
  activeLevel: HierarchyTab;
  urlCategory: ContentCategory | null;
  /** Pre-selected team ID from useAppSelection — auto-scopes gallery to user's team */
  autoTeamId?: string | null;
}

type SortOption = 'newest' | 'oldest' | 'title' | 'type';

export interface UseContentLibraryDataReturn {
  // Data
  contentItems: ContentItem[];
  setContentItems: Dispatch<SetStateAction<ContentItem[]>>;
  filteredContent: ContentItem[];
  loading: boolean;
  error: string | null;
  fetchContent: () => Promise<void>;
  // Directory filters
  organisations: OrganisationOption[];
  clubs: ProjectOption[];
  filteredTeams: ProjectOption[];
  seasons: SeasonOption[];
  matches: MatchOption[];
  selectedOrgId: string;
  setSelectedOrgId: Dispatch<SetStateAction<string>>;
  selectedClubId: string;
  setSelectedClubId: Dispatch<SetStateAction<string>>;
  selectedTeamId: string;
  setSelectedTeamId: Dispatch<SetStateAction<string>>;
  selectedSeasonId: string;
  setSelectedSeasonId: Dispatch<SetStateAction<string>>;
  selectedMatchId: string;
  setSelectedMatchId: Dispatch<SetStateAction<string>>;
  // Content filters
  categoryFilter: ContentCategory;
  setCategoryFilter: Dispatch<SetStateAction<ContentCategory>>;
  subtypeFilter: string;
  setSubtypeFilter: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sortBy: SortOption;
  setSortBy: Dispatch<SetStateAction<SortOption>>;
  // Counts
  categoryCounts: Record<string, number>;
  subtypeCounts: Record<string, number>;
  // Actions
  clearFilters: () => void;
}

export function useContentLibraryData({ isSuperAdmin, myOrganisations, orgSlug, activeLevel, urlCategory, autoTeamId }: Params): UseContentLibraryDataReturn {
  // ── Reducer state ──
  interface ContentLibState {
    contentItems: ContentItem[];
    loading: boolean;
    error: string | null;
    organisations: OrganisationOption[];
    clubs: ProjectOption[];
    teams: ProjectOption[];
    seasons: SeasonOption[];
    matches: MatchOption[];
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    selectedSeasonId: string;
    selectedMatchId: string;
    autoScopeApplied: boolean;
    categoryFilter: ContentCategory;
    subtypeFilter: string;
    searchQuery: string;
    sortBy: SortOption;
  }
  const [s, dispatch] = useReducer(formReducer<ContentLibState>, {
    contentItems: [], loading: false, error: null,
    organisations: [], clubs: [], teams: [], seasons: [], matches: [],
    selectedOrgId: '', selectedClubId: '', selectedTeamId: '',
    selectedSeasonId: '', selectedMatchId: '', autoScopeApplied: false,
    categoryFilter: urlCategory || 'all', subtypeFilter: 'all', searchQuery: '', sortBy: 'newest',
  });

  const setContentItems = useMemo(() => makeSetter<ContentLibState, 'contentItems'>(dispatch, 'contentItems'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<ContentLibState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<ContentLibState, 'error'>(dispatch, 'error'), [dispatch]);
  const setOrganisations = useMemo(() => makeSetter<ContentLibState, 'organisations'>(dispatch, 'organisations'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<ContentLibState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<ContentLibState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setSeasons = useMemo(() => makeSetter<ContentLibState, 'seasons'>(dispatch, 'seasons'), [dispatch]);
  const setMatches = useMemo(() => makeSetter<ContentLibState, 'matches'>(dispatch, 'matches'), [dispatch]);
  const setSelectedOrgId = useMemo(() => makeSetter<ContentLibState, 'selectedOrgId'>(dispatch, 'selectedOrgId'), [dispatch]);
  const setSelectedClubId = useMemo(() => makeSetter<ContentLibState, 'selectedClubId'>(dispatch, 'selectedClubId'), [dispatch]);
  const setSelectedTeamId = useMemo(() => makeSetter<ContentLibState, 'selectedTeamId'>(dispatch, 'selectedTeamId'), [dispatch]);
  const setSelectedSeasonId = useMemo(() => makeSetter<ContentLibState, 'selectedSeasonId'>(dispatch, 'selectedSeasonId'), [dispatch]);
  const setSelectedMatchId = useMemo(() => makeSetter<ContentLibState, 'selectedMatchId'>(dispatch, 'selectedMatchId'), [dispatch]);
  const setCategoryFilter = useMemo(() => makeSetter<ContentLibState, 'categoryFilter'>(dispatch, 'categoryFilter'), [dispatch]);
  const setSubtypeFilter = useMemo(() => makeSetter<ContentLibState, 'subtypeFilter'>(dispatch, 'subtypeFilter'), [dispatch]);
  const setSearchQuery = useMemo(() => makeSetter<ContentLibState, 'searchQuery'>(dispatch, 'searchQuery'), [dispatch]);
  const setSortBy = useMemo(() => makeSetter<ContentLibState, 'sortBy'>(dispatch, 'sortBy'), [dispatch]);
  const setAutoScopeApplied = useMemo(() => makeSetter<ContentLibState, 'autoScopeApplied'>(dispatch, 'autoScopeApplied'), [dispatch]);

  // ── Auto-scope to user's team if available ──
  useEffect(() => {
    if (autoTeamId && !s.autoScopeApplied && !s.selectedTeamId) {
      setSelectedTeamId(autoTeamId);
      setAutoScopeApplied(true);
    }
  }, [autoTeamId, s.autoScopeApplied, s.selectedTeamId]);

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
      setOrganisations(myOrganisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug || '' })));
      return;
    }
    const load = async () => {
      try {
        const orgs = await api.listAll<OrganisationOption>('/organisations/', { pageSize: 100 });
        setOrganisations((orgs || []).map((o) => ({ id: String(o.id), name: o.name, slug: o.slug || '' })));
      } catch { /* ignore */ }
    };
    load();
  }, [isSuperAdmin, myOrganisations]);

  // ── Load clubs/teams when org changes ──
  useEffect(() => {
    const load = async () => {
      const selectedOrg = s.selectedOrgId ? s.organisations.find((o) => String(o.id) === String(s.selectedOrgId)) : null;
      const orgSlugForApi = selectedOrg?.slug || orgSlug || '';
      if (!orgSlugForApi) { setClubs([]); setTeams([]); return; }
      try {
        const [allClubs, allTeams] = await Promise.all([
          organisationsApi.listAllProjects(orgSlugForApi, { parent_project__isnull: 'true' }, { pageSize: 500 }),
          organisationsApi.listAllProjects(orgSlugForApi, { parent_project__isnull: 'false' }, { pageSize: 2000 }),
        ]);
        setClubs(allClubs as unknown as ProjectOption[]);
        setTeams(allTeams as unknown as ProjectOption[]);
      } catch { /* ignore */ }
    };
    load();
  }, [s.selectedOrgId, s.organisations, orgSlug]);

  // ── Filter teams by selected club ──
  const filteredTeams = useMemo(() => {
    if (!s.selectedClubId) return s.teams;
    return s.teams.filter((t) => {
      const parentId = typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project;
      return String(parentId) === String(s.selectedClubId);
    });
  }, [s.teams, s.selectedClubId]);

  // ── Load seasons when team changes ──
  useEffect(() => {
    if (!s.selectedTeamId) { setSeasons([]); return; }
    const load = async () => {
      try {
        const { results: items } = await api.list<SeasonOption>('/periods/', {
          params: { project: s.selectedTeamId, period_type: 'season' },
          pageSize: 100,
        });
        setSeasons(items.map((s) => ({ id: String(s.id), name: s.name, key: s.key || s.slug || '' })));
      } catch { /* ignore */ }
    };
    load();
  }, [s.selectedTeamId]);

  // ── Load matches when season changes ──
  useEffect(() => {
    if (!s.selectedSeasonId) { setMatches([]); return; }
    const load = async () => {
      try {
        const { results: items } = await api.list<MatchOption>('/activities/', {
          params: { period: s.selectedSeasonId, activity_type: 'match', ordering: '-activity_date' },
          pageSize: 100,
        });
        setMatches(items.map((m) => ({ id: String(m.id), title: m.title || m.name || '', slug: m.slug, activity_date: m.activity_date })));
      } catch { /* ignore */ }
    };
    load();
  }, [s.selectedSeasonId]);

  // ── Fetch content items ──
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (s.selectedMatchId) params.activity = s.selectedMatchId;
      else if (s.selectedTeamId) params.project = s.selectedTeamId;
      else if (s.selectedClubId) params.project = s.selectedClubId;
      const { results: items } = await api.list<ContentItem>('/media/items/', { params, pageSize: 200 });
      setContentItems(Array.isArray(items) ? items : []);
    } catch (err) {
      logger.error('[ContentLibrary] Error', err);
      setError('Fout bij laden van content');
    } finally {
      setLoading(false);
    }
  }, [s.selectedMatchId, s.selectedTeamId, s.selectedClubId]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // ── Reset on level change ──
  useEffect(() => {
    setCategoryFilter('all');
    setSubtypeFilter('all');
    setSearchQuery('');
  }, [activeLevel]);

  // ── Filtered content ──
  const filteredContent = useMemo(() => {
    let result = s.contentItems;

    if (s.categoryFilter !== 'all') {
      const category = CONTENT_CATEGORIES.find(c => c.key === s.categoryFilter);
      if (category && category.subtypes.length > 0) {
        result = result.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return category.subtypes.includes(normalizedType);
        });
      }
    }

    if (s.subtypeFilter !== 'all') {
      result = result.filter(item => {
        const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
        const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
        return normalizedType === s.subtypeFilter;
      });
    }

    if (s.searchQuery) {
      const q = s.searchQuery.toLowerCase();
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
      switch (s.sortBy) {
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
  }, [s.contentItems, s.categoryFilter, s.subtypeFilter, s.searchQuery, s.sortBy]);

  // ── Category & subtype counts ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: s.contentItems.length };
    CONTENT_CATEGORIES.forEach(cat => {
      if (cat.key !== 'all') {
        counts[cat.key] = s.contentItems.filter(item => {
          const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
          const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
          return cat.subtypes.includes(normalizedType);
        }).length;
      }
    });
    return counts;
  }, [s.contentItems]);

  const subtypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    const category = CONTENT_CATEGORIES.find(c => c.key === s.categoryFilter);
    const subtypes = category?.subtypes || [];
    if (s.categoryFilter === 'all') {
      CONTENT_TYPE_FILTERS.forEach(f => { counts[f.key] = 0; });
    } else {
      subtypes.forEach(st => { counts[st] = 0; });
    }
    s.contentItems.forEach(item => {
      const assetType = (item.extraction_metadata?.asset_type as string) || 'other';
      const normalizedType = assetType.replace(/_[a-f0-9]{8}$/i, '');
      if (s.categoryFilter === 'all' || subtypes.includes(normalizedType)) {
        counts[normalizedType] = (counts[normalizedType] || 0) + 1;
        counts.all = (counts.all || 0) + 1;
      }
    });
    return counts;
  }, [s.contentItems, s.categoryFilter]);

  // ── Clear all filters ──
  const clearFilters = useCallback(() => {
    dispatch({ type: 'patch', payload: {
      selectedOrgId: '', selectedClubId: '', selectedTeamId: '',
      selectedSeasonId: '', selectedMatchId: '',
      categoryFilter: 'all' as ContentCategory, subtypeFilter: 'all', searchQuery: '',
    } });
  }, []);

  return {
    // Data
    contentItems: s.contentItems, setContentItems, filteredContent,
    loading: s.loading, error: s.error, fetchContent,
    // Directory filters
    organisations: s.organisations, clubs: s.clubs, filteredTeams, seasons: s.seasons, matches: s.matches,
    selectedOrgId: s.selectedOrgId, setSelectedOrgId,
    selectedClubId: s.selectedClubId, setSelectedClubId,
    selectedTeamId: s.selectedTeamId, setSelectedTeamId,
    selectedSeasonId: s.selectedSeasonId, setSelectedSeasonId,
    selectedMatchId: s.selectedMatchId, setSelectedMatchId,
    // Content filters
    categoryFilter: s.categoryFilter, setCategoryFilter,
    subtypeFilter: s.subtypeFilter, setSubtypeFilter,
    searchQuery: s.searchQuery, setSearchQuery,
    sortBy: s.sortBy, setSortBy,
    // Counts
    categoryCounts, subtypeCounts,
    // Actions
    clearFilters,
  };
}

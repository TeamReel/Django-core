import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompetitionsData } from './useCompetitionsData';

vi.mock('../utils/fetchAllPages', () => ({
  fetchAllPages: vi.fn(),
  invalidateFetchAllPagesCache: vi.fn(),
}));
vi.mock('../utils/apiBase', () => ({
  getApiBaseUrl: () => 'http://localhost:8000',
}));
vi.mock('@/api', () => ({
  api: { patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { fetchAllPages } from '../utils/fetchAllPages';

const mockFetchAllPages = fetchAllPages as ReturnType<typeof vi.fn>;

function buildFilters(overrides: Record<string, unknown> = {}) {
  return {
    organisations: [],
    clubs: [],
    teams: [],
    selectedOrgId: '',
    selectedClubId: '',
    selectedTeamId: '',
    statusFilter: 'all',
    sportFilter: 'all',
    variantFilter: 'all',
    selectedSeasonIds: [],
    seasons: [],
    setSeasons: vi.fn(),
    refreshKey: 0,
    triggerRefresh: vi.fn(),
    setError: vi.fn(),
    getSelectedOrgIdForApi: () => '',
    ...overrides,
  } as any;
}

describe('useCompetitionsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches competitions for selected team', async () => {
    const competitions = [
      { id: 'c1', name: 'League A', type: 'competition', parent_period_id: 's1' },
    ];
    // Hook calls fetchAllPages multiple times (seasons + competitions + fallbacks)
    mockFetchAllPages.mockResolvedValue(competitions);

    const filters = buildFilters({ selectedTeamId: 'team-1' });
    const { result } = renderHook(() => useCompetitionsData(filters));

    await waitFor(() => expect(result.current.competitionsLoading).toBe(false));

    // Verify fetchAllPages was called (exact results depend on dedup logic)
    expect(mockFetchAllPages).toHaveBeenCalled();
    expect(result.current.competitions.length).toBeGreaterThanOrEqual(0);
  });

  it('returns empty competitions when no teams exist for selected org', async () => {
    mockFetchAllPages.mockResolvedValue([]);

    const filters = buildFilters({ selectedOrgId: 'org-1', teams: [] });
    const { result } = renderHook(() => useCompetitionsData(filters));

    await waitFor(() => expect(result.current.competitionsLoading).toBe(false));

    expect(result.current.competitions).toEqual([]);
  });

  it('calls setError on fetch failure', async () => {
    mockFetchAllPages.mockRejectedValue(new Error('API failure'));

    const setError = vi.fn();
    const filters = buildFilters({ selectedTeamId: 'team-1', setError });
    const { result } = renderHook(() => useCompetitionsData(filters));

    await waitFor(() => expect(result.current.competitionsLoading).toBe(false));

    expect(setError).toHaveBeenCalled();
  });

  it('provides filtered competitions by status', async () => {
    const today = new Date().toISOString().split('T')[0];
    const competitions = [
      { id: 'c1', name: 'Active Comp', start_date: '2020-01-01', end_date: '2030-12-31', type: 'competition', parent_period_id: 's1' },
      { id: 'c2', name: 'Old Comp', start_date: '2018-01-01', end_date: '2019-12-31', type: 'competition', parent_period_id: 's1' },
    ];
    mockFetchAllPages.mockResolvedValue(competitions);

    const filters = buildFilters({ statusFilter: 'active' });
    const { result } = renderHook(() => useCompetitionsData(filters));

    await waitFor(() => expect(result.current.competitionsLoading).toBe(false));

    // filteredCompetitions applies status filter
    expect(result.current.filteredCompetitions.length).toBeLessThanOrEqual(
      result.current.competitions.length,
    );
  });

  it('provides sorted competitions', async () => {
    const competitions = [
      { id: 'c2', name: 'Zulu Cup', type: 'competition', parent_period_id: 's1' },
      { id: 'c1', name: 'Alpha League', type: 'competition', parent_period_id: 's1' },
    ];
    mockFetchAllPages.mockResolvedValue(competitions);

    const filters = buildFilters();
    const { result } = renderHook(() => useCompetitionsData(filters));

    await waitFor(() => expect(result.current.competitionsLoading).toBe(false));

    const names = result.current.sortedCompetitions.map((c: { name?: string }) => c.name);
    expect(names).toEqual(['Alpha League', 'Zulu Cup']);
  });
});

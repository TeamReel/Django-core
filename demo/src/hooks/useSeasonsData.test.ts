import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSeasonsData } from './useSeasonsData';

// Mock dependencies
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
    refreshKey: 0,
    triggerRefresh: vi.fn(),
    setError: vi.fn(),
    getSelectedOrgIdForApi: () => '',
    ...overrides,
  } as any;
}

describe('useSeasonsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches seasons for a selected team', async () => {
    const seasons = [
      { id: 's1', name: '2024/25', type: 'season', parent_period_id: null },
    ];
    // The hook calls fetchAllPages 3 times for team scope (typed, untyped, competitions)
    mockFetchAllPages
      .mockResolvedValueOnce(seasons)   // typed
      .mockResolvedValueOnce([])         // untyped
      .mockResolvedValueOnce([]);        // competitions

    const filters = buildFilters({ selectedTeamId: 'team-1', selectedClubId: 'club-1' });
    const { result } = renderHook(() => useSeasonsData(filters));

    await waitFor(() => expect(result.current.seasonsLoading).toBe(false));

    expect(result.current.seasons).toEqual(seasons);
  });

  it('returns empty seasons when no org or team selected and no results', async () => {
    mockFetchAllPages.mockResolvedValue([]);

    const filters = buildFilters();
    const { result } = renderHook(() => useSeasonsData(filters));

    await waitFor(() => expect(result.current.seasonsLoading).toBe(false));

    expect(result.current.seasons).toEqual([]);
  });

  it('calls setError on fetch failure', async () => {
    mockFetchAllPages.mockRejectedValueOnce(new Error('Network error'));

    const setError = vi.fn();
    const filters = buildFilters({ selectedTeamId: 'team-1', setError });
    const { result } = renderHook(() => useSeasonsData(filters));

    await waitFor(() => expect(result.current.seasonsLoading).toBe(false));

    expect(setError).toHaveBeenCalledWith('Network error');
  });

  it('filters by status when statusFilter is active', async () => {
    const today = new Date().toISOString().split('T')[0];
    const seasons = [
      { id: 's1', name: 'Current', start_date: '2020-01-01', end_date: '2030-12-31', type: 'season', parent_period_id: null },
      { id: 's2', name: 'Old', start_date: '2018-01-01', end_date: '2019-12-31', type: 'season', parent_period_id: null },
    ];
    mockFetchAllPages.mockResolvedValue(seasons);

    const filters = buildFilters({ statusFilter: 'active' });
    const { result } = renderHook(() => useSeasonsData(filters));

    await waitFor(() => expect(result.current.seasonsLoading).toBe(false));

    expect(result.current.filteredSeasons).toHaveLength(1);
    expect(result.current.filteredSeasons[0].id).toBe('s1');
  });

  it('provides sorted seasons', async () => {
    const seasons = [
      { id: 's2', name: 'Beta', type: 'season', parent_period_id: null },
      { id: 's1', name: 'Alpha', type: 'season', parent_period_id: null },
    ];
    mockFetchAllPages.mockResolvedValue(seasons);

    const filters = buildFilters();
    const { result } = renderHook(() => useSeasonsData(filters));

    await waitFor(() => expect(result.current.seasonsLoading).toBe(false));

    expect(result.current.sortedSeasons.map((s: any) => s.name)).toEqual(['Alpha', 'Beta']);
  });
});

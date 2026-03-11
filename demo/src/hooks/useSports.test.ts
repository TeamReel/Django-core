import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api', () => ({
  api: { list: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

import { useSports } from './useSports';
import { api } from '@/api';

const mockList = vi.mocked(api.list);

const MOCK_SPORTS = [
  { id: 's1', name: 'Football', slug: 'football', sport_icon: '⚽', parent_sport_id: null, is_category: true, is_variant: false, category_name: null, is_active: true, configuration: null, federation_metadata: {}, created_at: '', updated_at: '' },
  { id: 's2', name: 'Football 11v11', slug: 'football-11v11', sport_icon: '⚽', parent_sport_id: 's1', is_category: false, is_variant: true, category_name: 'Football', is_active: true, configuration: null, federation_metadata: {}, created_at: '', updated_at: '' },
  { id: 's3', name: 'Football 7v7', slug: 'football-7v7', sport_icon: '⚽', parent_sport_id: 's1', is_category: false, is_variant: true, category_name: 'Football', is_active: true, configuration: null, federation_metadata: {}, created_at: '', updated_at: '' },
  { id: 's4', name: 'Hockey', slug: 'hockey', sport_icon: '🏑', parent_sport_id: null, is_category: true, is_variant: false, category_name: null, is_active: true, configuration: null, federation_metadata: {}, created_at: '', updated_at: '' },
];

describe('useSports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ results: MOCK_SPORTS });
  });

  it('fetches sports on mount', async () => {
    const { result } = renderHook(() => useSports());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockList).toHaveBeenCalledWith('/sports/', expect.objectContaining({ pageSize: 1000 }));
    expect(result.current.sports).toHaveLength(4);
    expect(result.current.error).toBeNull();
  });

  it('separates categories from variants', async () => {
    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toHaveLength(2); // Football, Hockey
    expect(result.current.variants).toHaveLength(2);   // 11v11, 7v7
    expect(result.current.categories.map((c) => c.name)).toContain('Football');
    expect(result.current.categories.map((c) => c.name)).toContain('Hockey');
  });

  it('getVariantsForCategory returns correct variants', async () => {
    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const footballVariants = result.current.getVariantsForCategory('s1');
    expect(footballVariants).toHaveLength(2);
    expect(footballVariants.map((v) => v.name)).toContain('Football 11v11');

    const hockeyVariants = result.current.getVariantsForCategory('s4');
    expect(hockeyVariants).toHaveLength(0);
  });

  it('getSportById returns correct sport', async () => {
    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getSportById('s1')?.name).toBe('Football');
    expect(result.current.getSportById('unknown')).toBeUndefined();
  });

  it('handles API error', async () => {
    mockList.mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Fetch failed');
    expect(result.current.sports).toHaveLength(0);
  });

  it('refetch reloads data', async () => {
    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockList).toHaveBeenCalledTimes(1);

    mockList.mockResolvedValue({ results: [MOCK_SPORTS[0]] });
    await result.current.refetch();

    await waitFor(() => expect(result.current.sports).toHaveLength(1));
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('getVariantsForCategory returns empty for empty categoryId', async () => {
    const { result } = renderHook(() => useSports());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getVariantsForCategory('')).toHaveLength(0);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivities } from './useActivities';

const mockList = vi.fn();
vi.mock('@/api', () => ({
  api: { list: (...args: unknown[]) => mockList(...args) },
}));

describe('useActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches activities on mount and returns them', async () => {
    const activities = [
      { id: '1', title: 'Match A', activity_type: 'match', start_time: '2025-01-01', end_time: '2025-01-01', location: '', description: '', project: { id: '10', name: 'Team' } },
      { id: '2', title: 'Training B', activity_type: 'training', start_time: '2025-01-02', end_time: '2025-01-02', location: '', description: '', project: { id: '10', name: 'Team' } },
    ];
    mockList.mockResolvedValueOnce({ results: activities, count: 2, next: null });

    const { result } = renderHook(() => useActivities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activities).toEqual(activities);
    expect(result.current.error).toBeNull();
    expect(mockList).toHaveBeenCalledWith('/activities/', expect.objectContaining({
      params: expect.objectContaining({ page_size: 10, ordering: '-start_time' }),
    }));
  });

  it('respects limit and project_id params', async () => {
    mockList.mockResolvedValueOnce({ results: [], count: 0, next: null });

    const { result } = renderHook(() =>
      useActivities({ limit: 5, project_id: 'proj-1' }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockList).toHaveBeenCalledWith('/activities/', expect.objectContaining({
      params: expect.objectContaining({ page_size: 5, project_id: 'proj-1' }),
    }));
  });

  it('returns empty array when API returns no results', async () => {
    mockList.mockResolvedValueOnce({ results: [], count: 0, next: null });

    const { result } = renderHook(() => useActivities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activities).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    mockList.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useActivities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.activities).toEqual([]);
  });

  it('sets error string for non-Error throws', async () => {
    mockList.mockRejectedValueOnce('something bad');

    const { result } = renderHook(() => useActivities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unknown error');
  });
});

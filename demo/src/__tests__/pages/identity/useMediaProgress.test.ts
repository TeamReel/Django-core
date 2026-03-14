import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/api/client', () => ({
  api: { list: vi.fn() },
}));
vi.mock('@/utils/mediaHelpers', () => ({
  getMediaProcessingState: vi.fn(() => 'processed'),
}));

import { useMediaProgress } from '@/pages/identity/useMediaProgress';

const base = () => ({
  activeTabFromUrl: 'overview' as string,
  apiBaseUrl: '/api/v1',
  teamIdForDirectoryLists: 'team-1',
});

describe('useMediaProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips fetch for irrelevant tabs', () => {
    const { result } = renderHook(() => useMediaProgress({ ...base(), activeTabFromUrl: 'settings' }));
    expect(result.current.fullMembers).toEqual([]);
    expect(result.current.fullMembersLoading).toBe(false);
  });

  it('fetches, deduplicates and sorts members', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({
      results: [
        { user: { id: 'u1', first_name: 'Zoe', last_name: 'Z' }, metadata: {} },
        { user: { id: 'u2', first_name: 'Alice', last_name: 'A' }, metadata: {} },
        { user: { id: 'u1', first_name: 'Zoe', last_name: 'Z' }, metadata: {} }, // duplicate
      ],
      count: 3,
    } as any);
    const { result } = renderHook(() => useMediaProgress(base()));
    await waitFor(() => expect(result.current.fullMembersLoading).toBe(false));
    expect(result.current.fullMembers).toHaveLength(2); // deduped
    expect(result.current.fullMembers[0].user.first_name).toBe('Alice'); // sorted A-Z
  });

  it('computes assetStats from fullMembers', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({
      results: [
        { user: { id: 'u1', first_name: 'A', last_name: 'B' }, metadata: {} },
      ],
      count: 1,
    } as any);
    const { result } = renderHook(() => useMediaProgress(base()));
    await waitFor(() => expect(result.current.fullMembersLoading).toBe(false));
    expect(result.current.assetStats.length).toBeGreaterThan(0);
    // All members have 'processed' state (mocked) → each slot.done = 1
    for (const stat of result.current.assetStats) {
      expect(stat.done).toBe(1);
      expect(stat.total).toBe(1);
      expect(stat.pct).toBe(100);
    }
  });

  it('refreshFullMembers triggers re-fetch', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({ results: [], count: 0 } as any);
    const { result } = renderHook(() => useMediaProgress(base()));
    await waitFor(() => expect(result.current.fullMembersLoading).toBe(false));
    const callCount = vi.mocked(api.list).mock.calls.length;
    act(() => result.current.refreshFullMembers());
    await waitFor(() => expect(vi.mocked(api.list).mock.calls.length).toBeGreaterThan(callCount));
  });
});

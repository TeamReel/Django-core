import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api/client', () => ({
  api: { list: vi.fn(), listAll: vi.fn() },
}));

import { useTeamMatches } from '@/pages/identity/useTeamMatches';

const base = () => ({
  activeTabFromUrl: 'overview' as string,
  apiBaseUrl: '/api/v1',
  teamIdForDirectoryLists: 'team-1',
});

describe('useTeamMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips fetches when tab is not overview or hierarchy', () => {
    const { result } = renderHook(() => useTeamMatches({ ...base(), activeTabFromUrl: 'members' }));
    expect(result.current.teamMatches).toEqual([]);
    expect(result.current.contentCount).toBeNull();
  });

  it('skips fetches when teamId is empty', () => {
    const { result } = renderHook(() => useTeamMatches({ ...base(), teamIdForDirectoryLists: '' }));
    expect(result.current.teamMatches).toEqual([]);
  });

  it('loads content count for overview tab', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({ results: [], count: 15 } as any);
    vi.mocked(api.listAll).mockResolvedValue([]);
    const { result } = renderHook(() => useTeamMatches(base()));
    await waitFor(() => expect(result.current.contentCountLoading).toBe(false));
    expect(result.current.contentCount).toBe(15);
  });

  it('groups matches by period id', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({ results: [], count: 0 } as any);
    vi.mocked(api.listAll).mockResolvedValue([
      { id: 'm1', period_id: 'p1' },
      { id: 'm2', period_id: 'p1' },
      { id: 'm3', period_id: 'p2' },
    ]);
    const { result } = renderHook(() => useTeamMatches(base()));
    await waitFor(() => expect(result.current.teamMatchesLoading).toBe(false));
    expect(result.current.teamMatchesByPeriodId['p1']).toHaveLength(2);
    expect(result.current.teamMatchesByPeriodId['p2']).toHaveLength(1);
  });

  it('handles content count API error gracefully', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockRejectedValue(new Error('fail'));
    vi.mocked(api.listAll).mockResolvedValue([]);
    const { result } = renderHook(() => useTeamMatches(base()));
    await waitFor(() => expect(result.current.contentCountLoading).toBe(false));
    expect(result.current.contentCount).toBe(0);
  });
});

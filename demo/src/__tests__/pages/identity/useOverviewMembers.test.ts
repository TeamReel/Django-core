import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api/client', () => ({
  api: { list: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useOverviewMembers } from '@/pages/identity/useOverviewMembers';

const base = () => ({
  activeTabFromUrl: 'overview',
  apiBaseUrl: '/api/v1',
  orgSlugForDirectoryLists: 'my-org',
  teamIdForDirectoryLists: 'team-1',
});

describe('useOverviewMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips fetch when tab is not overview', () => {
    const { result } = renderHook(() => useOverviewMembers({ ...base(), activeTabFromUrl: 'members' }));
    expect(result.current.overviewMembers).toEqual([]);
    expect(result.current.overviewMembersLoading).toBe(false);
  });

  it('skips fetch when orgSlug is empty', () => {
    const { result } = renderHook(() => useOverviewMembers({ ...base(), orgSlugForDirectoryLists: '' }));
    expect(result.current.overviewMembers).toEqual([]);
  });

  it('fetches and filters members by team', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({
      results: [
        { id: '1', user: { id: '1', first_name: 'Alice', last_name: 'Smith', email: 'a@t.com' }, project_memberships: [{ project_id: 'team-1' }] },
        { id: '2', user: { id: '2', first_name: 'Bob', last_name: 'Jones', email: 'b@t.com' }, project_memberships: [{ project_id: 'team-2' }] },
      ],
      count: 2,
    } as any);
    const { result } = renderHook(() => useOverviewMembers(base()));
    await waitFor(() => expect(result.current.overviewMembersLoading).toBe(false));
    expect(result.current.overviewMembers).toHaveLength(1);
    expect(result.current.overviewMembers[0].id).toBe('1');
  });

  it('sorts members alphabetically by last name', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockResolvedValue({
      results: [
        { id: '1', user: { id: '1', first_name: 'Zara', last_name: 'Young' }, project_memberships: [{ project_id: 'team-1' }] },
        { id: '2', user: { id: '2', first_name: 'Alice', last_name: 'Adams' }, project_memberships: [{ project_id: 'team-1' }] },
      ],
      count: 2,
    } as any);
    const { result } = renderHook(() => useOverviewMembers(base()));
    await waitFor(() => expect(result.current.overviewMembersLoading).toBe(false));
    expect(result.current.overviewMembers[0].last_name).toBe('Adams');
  });

  it('sets error on fetch failure', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.list).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useOverviewMembers(base()));
    await waitFor(() => expect(result.current.overviewMembersLoading).toBe(false));
    expect(result.current.overviewMembersError).toBe('Network error');
    expect(result.current.overviewMembers).toEqual([]);
  });
});

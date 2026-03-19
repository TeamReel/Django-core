import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

/* ── Mocks ─────────────────────────────────────────────────────── */

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { useActivityFeed, type UseActivityFeedOptions } from './useActivityFeed';
import type { ActivityLogItem, ActivityFeedResponse } from '@/types/api';

/* ── Helpers ───────────────────────────────────────────────────── */

function buildItem(overrides: Partial<ActivityLogItem> = {}): ActivityLogItem {
  return {
    id: 'evt-1',
    verb: 'content.created',
    actor_id: 'u-1',
    actor_email: 'coach@club.nl',
    organisation_id: 'org-1',
    target_type: 'content',
    target_object_id: 'c-1',
    created_at: '2025-06-01T10:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function buildResponse(items: ActivityLogItem[], next: string | null = null): ActivityFeedResponse {
  return { next, previous: null, results: items };
}

const defaultOpts: UseActivityFeedOptions = {
  organisationId: 'org-1',
  enabled: true,
  pageSize: 20,
};

/* ── Tests ─────────────────────────────────────────────────────── */

describe('useActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  it('fetches items on mount when enabled', async () => {
    const items = [buildItem({ id: 'evt-1' }), buildItem({ id: 'evt-2' })];
    mockGet.mockResolvedValueOnce(buildResponse(items)); // feed
    mockGet.mockResolvedValueOnce({ unread_count: 3 }); // unread count

    const { result } = renderHook(() => useActivityFeed(defaultOpts));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(result.current.unreadCount).toBe(3);
    expect(mockGet).toHaveBeenCalledWith('/activity-feed/', expect.objectContaining({
      params: expect.objectContaining({ organisation_id: 'org-1', page_size: 20 }),
    }));
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useActivityFeed({ ...defaultOpts, enabled: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });

  it('does not fetch when organisationId is missing', async () => {
    const { result } = renderHook(() =>
      useActivityFeed({ ...defaultOpts, organisationId: undefined }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('sets error on fetch failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    mockGet.mockResolvedValueOnce({ unread_count: 0 });

    const { result } = renderHook(() => useActivityFeed(defaultOpts));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('supports loadMore with cursor pagination', async () => {
    const page1 = [buildItem({ id: 'evt-1' })];
    const page2 = [buildItem({ id: 'evt-2' })];

    mockGet.mockResolvedValueOnce(buildResponse(page1, 'http://api/activity-feed/?cursor=abc123')); // page 1
    mockGet.mockResolvedValueOnce({ unread_count: 0 }); // unread count

    const { result } = renderHook(() => useActivityFeed(defaultOpts));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Load next page
    mockGet.mockResolvedValueOnce(buildResponse(page2, null));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);

    // Verify cursor was passed
    expect(mockGet).toHaveBeenCalledWith('/activity-feed/', expect.objectContaining({
      params: expect.objectContaining({ cursor: 'abc123' }),
    }));
  });

  it('refresh resets to first page', async () => {
    mockGet.mockResolvedValueOnce(buildResponse([buildItem({ id: 'evt-1' })])); // initial
    mockGet.mockResolvedValueOnce({ unread_count: 1 }); // unread

    const { result } = renderHook(() => useActivityFeed(defaultOpts));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Refresh
    const refreshedItem = buildItem({ id: 'evt-new' });
    mockGet.mockResolvedValueOnce(buildResponse([refreshedItem])); // refresh
    mockGet.mockResolvedValueOnce({ unread_count: 0 }); // refresh unread

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('evt-new');
    expect(result.current.unreadCount).toBe(0);
  });

  it('passes verb filter to API', async () => {
    mockGet.mockResolvedValueOnce(buildResponse([]));
    mockGet.mockResolvedValueOnce({ unread_count: 0 });

    renderHook(() =>
      useActivityFeed({ ...defaultOpts, filters: { verb: 'member.added' } }),
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/activity-feed/', expect.objectContaining({
        params: expect.objectContaining({ verb: 'member.added' }),
      }));
    });
  });

  it('markRead calls correct endpoint with org id in query string', async () => {
    mockGet.mockResolvedValueOnce(buildResponse([]));
    mockGet.mockResolvedValueOnce({ unread_count: 2 });
    mockPost.mockResolvedValueOnce({ marked_count: 2 });

    const { result } = renderHook(() => useActivityFeed(defaultOpts));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.markRead();
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/activity-feed/mark-read/?organisation_id=org-1',
      undefined,
    );
    expect(result.current.unreadCount).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockList = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();

vi.mock('@/api', () => ({
  api: {
    list: (...args: unknown[]) => mockList(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { useNotifications, type UserNotification } from './useNotifications';

function buildNotification(overrides: Partial<UserNotification> = {}): UserNotification {
  return {
    id: 'n-1',
    title: 'Test notification',
    message: 'Something happened',
    level: 'info',
    is_read: false,
    created_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  it('fetches notifications on mount', async () => {
    const items = [
      buildNotification({ id: 'n-1', is_read: false }),
      buildNotification({ id: 'n-2', is_read: true }),
    ];
    mockList.mockResolvedValue({ results: items });

    const { result } = renderHook(() => useNotifications({ pollInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.unreadNotifications).toHaveLength(1);
    expect(result.current.readNotifications).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error on fetch failure', async () => {
    mockList.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useNotifications({ pollInterval: 0 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load');
    expect(result.current.notifications).toEqual([]);
  });

  it('markRead calls patch endpoint with correct params', async () => {
    const items = [buildNotification({ id: 'n-1', is_read: false })];
    mockList.mockResolvedValue({ results: items });
    mockPatch.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications({ pollInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Update mock so the re-fetch (triggered by dispatchChange) returns read item
    mockList.mockResolvedValue({ results: [buildNotification({ id: 'n-1', is_read: true })] });

    await act(async () => {
      await result.current.markRead('n-1');
    });

    expect(mockPatch).toHaveBeenCalledWith('/user-notifications/n-1/', { is_read: true });
  });

  it('markAllRead calls post endpoint', async () => {
    const items = [
      buildNotification({ id: 'n-1', is_read: false }),
      buildNotification({ id: 'n-2', is_read: false }),
    ];
    mockList.mockResolvedValue({ results: items });
    mockPost.mockResolvedValue({});

    const { result } = renderHook(() => useNotifications({ pollInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Update mock so re-fetch returns all-read
    mockList.mockResolvedValue({
      results: [
        buildNotification({ id: 'n-1', is_read: true }),
        buildNotification({ id: 'n-2', is_read: true }),
      ],
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockPost).toHaveBeenCalledWith('/user-notifications/mark-all-read/', undefined);
    await waitFor(() => {
      expect(result.current.unreadCount).toBe(0);
    });
  });

  it('refresh re-fetches notifications', async () => {
    mockList.mockResolvedValue({ results: [] });

    const { result } = renderHook(() => useNotifications({ pollInterval: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fresh = [buildNotification({ id: 'n-3' })];
    mockList.mockResolvedValue({ results: fresh });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].id).toBe('n-3');
  });
});

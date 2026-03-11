import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockGet = vi.fn();

vi.mock('@/api', () => ({
  api: { get: mockGet },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

// The module has a module-level cache. We need to reset modules between tests
// to get a clean cache for each test.
describe('useContentTypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetches content types on mount and becomes ready', async () => {
    mockGet.mockResolvedValue({
      activity: 1,
      period: 2,
      projectmembership: 3,
    });

    const { useContentTypes } = await import('./useContentTypes');
    const { result } = renderHook(() => useContentTypes());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/workflows/content-types/?models='),
    );
  });

  it('resolveContentType returns cached id after fetch', async () => {
    mockGet.mockResolvedValue({
      activity: 10,
      period: 20,
    });

    const { useContentTypes } = await import('./useContentTypes');
    const { result } = renderHook(() => useContentTypes());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.resolveContentType('activity')).toBe(10);
    expect(result.current.resolveContentType('period')).toBe(20);
  });

  it('resolveContentType returns null for unknown model', async () => {
    mockGet.mockResolvedValue({ activity: 1 });

    const { useContentTypes } = await import('./useContentTypes');
    const { result } = renderHook(() => useContentTypes());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.resolveContentType('videojob')).toBeNull();
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const { useContentTypes } = await import('./useContentTypes');
    const { result } = renderHook(() => useContentTypes());

    // Should not crash — cache remains empty
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.resolveContentType('activity')).toBeNull();
  });
});

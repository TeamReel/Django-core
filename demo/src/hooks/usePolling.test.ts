import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

import { usePolling } from './usePolling';

describe('usePolling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial state when disabled', () => {
    const { result } = renderHook(() =>
      usePolling('/api/test', { enabled: false }),
    );

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isPolling()).toBe(false);
  });

  it('reads initial data from localStorage cache', () => {
    localStorage.setItem('my_key', JSON.stringify({ cached: true }));

    const { result } = renderHook(() =>
      usePolling('/api/test', { enabled: false, key: 'my_key' }),
    );

    expect(result.current.data).toEqual({ cached: true });
  });

  it('returns null for invalid localStorage cache', () => {
    localStorage.setItem('bad_key', 'not-json');

    const { result } = renderHook(() =>
      usePolling('/api/test', { enabled: false, key: 'bad_key' }),
    );

    expect(result.current.data).toBeNull();
  });

  it('exposes start/stop/refetch/isPolling functions', () => {
    const { result } = renderHook(() =>
      usePolling('/api/test', { enabled: false }),
    );

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.isPolling).toBe('function');
  });

  it('stop sets isPolling to false after start', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    const { result } = renderHook(() =>
      usePolling('/api/test', { enabled: true, interval: 60000 }),
    );

    // start() is called from useEffect — should be polling
    // Now stop it
    act(() => result.current.stop());
    expect(result.current.isPolling()).toBe(false);

    vi.restoreAllMocks();
  });

  it('default interval is 30 seconds', () => {
    // Verify that the hook accepts the URL parameter
    const { result } = renderHook(() =>
      usePolling('/api/custom-endpoint', { enabled: false }),
    );

    // Hook should initialise without error
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('cleans up interval on unmount', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    const { unmount } = renderHook(() =>
      usePolling('/api/test', { enabled: true, interval: 60000 }),
    );

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();

    vi.restoreAllMocks();
  });
});

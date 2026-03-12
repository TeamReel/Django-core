/**
 * Tests for usePreloadRoutes hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreloadRoutes, usePreloadRoute, usePreloadRoutesOnIdle } from './usePreloadRoutes';

describe('usePreloadRoutes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should preload routes after delay', async () => {
    const mockImport1 = vi.fn().mockResolvedValue({ default: {} });
    const mockImport2 = vi.fn().mockResolvedValue({ default: {} });

    renderHook(() => usePreloadRoutes([mockImport1, mockImport2], 1000));

    // Before delay
    expect(mockImport1).not.toHaveBeenCalled();
    expect(mockImport2).not.toHaveBeenCalled();

    // After delay
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockImport1).toHaveBeenCalledTimes(1);
    expect(mockImport2).toHaveBeenCalledTimes(1);
  });

  it('should use default delay of 2000ms', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: {} });

    renderHook(() => usePreloadRoutes([mockImport]));

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    expect(mockImport).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mockImport).toHaveBeenCalledTimes(1);
  });

  it('should only preload once per mount', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: {} });

    const { rerender } = renderHook(() => usePreloadRoutes([mockImport], 500));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(mockImport).toHaveBeenCalledTimes(1);

    // Rerender shouldn't trigger another preload
    rerender();
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(mockImport).toHaveBeenCalledTimes(1);
  });

  it('should silently handle import errors', async () => {
    const mockImport = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => usePreloadRoutes([mockImport], 100));

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Should not throw, just silently fail
    expect(mockImport).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should cleanup timer on unmount', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: {} });

    const { unmount } = renderHook(() => usePreloadRoutes([mockImport], 1000));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockImport).not.toHaveBeenCalled();
  });
});

describe('usePreloadRoute', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should preload single route', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: {} });

    renderHook(() => usePreloadRoute(mockImport, 500));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(mockImport).toHaveBeenCalledTimes(1);
  });
});

describe('usePreloadRoutesOnIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use setTimeout fallback when requestIdleCallback not available', async () => {
    const mockImport = vi.fn().mockResolvedValue({ default: {} });

    // Ensure requestIdleCallback is not available for this test
    const originalRIC = window.requestIdleCallback;
    // @ts-expect-error - temporarily removing for test
    delete window.requestIdleCallback;

    renderHook(() => usePreloadRoutesOnIdle([mockImport]));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockImport).toHaveBeenCalledTimes(1);

    // Restore
    if (originalRIC) window.requestIdleCallback = originalRIC;
  });
});

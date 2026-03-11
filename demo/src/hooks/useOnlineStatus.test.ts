import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports online by default', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it('detects offline event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it('detects online event after offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it('clears wasOffline after grace period', () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.wasOffline).toBe(false);

    vi.useRealTimers();
  });

  it('cleans up listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();

    const addedOnline = addSpy.mock.calls.filter(([e]) => e === 'online');
    const removedOnline = removeSpy.mock.calls.filter(([e]) => e === 'online');
    expect(removedOnline.length).toBeGreaterThanOrEqual(addedOnline.length);
  });
});

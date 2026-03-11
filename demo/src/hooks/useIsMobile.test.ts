import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  let listeners: Record<string, ((e: MediaQueryListEvent) => void)[]>;
  let matches: boolean;

  beforeEach(() => {
    listeners = { change: [] };
    matches = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: (event: string, cb: (e: MediaQueryListEvent) => void) => {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(cb);
        },
        removeEventListener: (event: string, cb: (e: MediaQueryListEvent) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((l) => l !== cb);
          }
        },
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for desktop viewport', () => {
    matches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when matches is true', () => {
    matches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    matches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      listeners.change.forEach((cb) =>
        cb({ matches: true } as MediaQueryListEvent),
      );
    });
    expect(result.current).toBe(true);
  });

  it('accepts custom breakpoint', () => {
    matches = false;
    renderHook(() => useIsMobile(768));
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('cleans up listener on unmount', () => {
    matches = false;
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.change).toHaveLength(1);
    unmount();
    expect(listeners.change).toHaveLength(0);
  });
});

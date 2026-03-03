import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertDismissal } from '../../src/hooks/useAlertDismissal';

describe('useAlertDismissal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts with visible alert by default', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    expect(result.current.isVisible).toBe(true);
    expect(result.current.state.isDismissed).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(false);
  });

  it('respects defaultDismissed option', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert', defaultDismissed: true })
    );

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isDismissed).toBe(true);
  });

  it('temporary dismiss hides alert', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isDismissed).toBe(true);
    expect(result.current.state.isPermanentlyDismissed).toBe(false);
  });

  it('temporary dismiss does not persist to localStorage', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismiss();
    });

    expect(localStorage.getItem('django_core_alert_test-alert')).toBeNull();
  });

  it('permanent dismiss persists to localStorage', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isDismissed).toBe(true);
    expect(result.current.state.isPermanentlyDismissed).toBe(true);

    const stored = localStorage.getItem('django_core_alert_test-alert');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual({ permanent: true });
  });

  it('loads permanent dismissal from localStorage', () => {
    localStorage.setItem(
      'django_core_alert_test-alert',
      JSON.stringify({ permanent: true })
    );

    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isDismissed).toBe(true);
    expect(result.current.state.isPermanentlyDismissed).toBe(true);
  });

  it('reset makes alert visible again', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.isVisible).toBe(false);
    expect(localStorage.getItem('django_core_alert_test-alert')).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.state.isDismissed).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(false);
    expect(localStorage.getItem('django_core_alert_test-alert')).toBeNull();
  });

  it('handles localStorage unavailable gracefully on init', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage disabled');
    });

    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    // Should still initialize with default state
    expect(result.current.isVisible).toBe(true);
    expect(result.current.state.isDismissed).toBe(false);

    getItemSpy.mockRestore();
  });

  it('handles localStorage unavailable gracefully on dismiss', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage disabled');
    });

    // dismissForever should still work, just no persistence
    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(true);

    setItemSpy.mockRestore();
  });

  it('multiple dismiss calls are idempotent', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismiss();
      result.current.dismiss();
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isDismissed).toBe(true);
  });

  it('can dismiss temporarily after permanent dismiss', () => {
    const { result } = renderHook(() =>
      useAlertDismissal({ alertId: 'test-alert' })
    );

    act(() => {
      result.current.dismissForever();
    });

    expect(result.current.state.isPermanentlyDismissed).toBe(true);

    act(() => {
      result.current.reset();
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.isPermanentlyDismissed).toBe(false);
  });
});

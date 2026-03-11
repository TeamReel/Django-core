import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHapticFeedback } from './useHapticFeedback';

describe('useHapticFeedback', () => {
  const vibrateSpy = vi.fn();

  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateSpy,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all expected methods', () => {
    const { result } = renderHook(() => useHapticFeedback());
    expect(result.current).toHaveProperty('light');
    expect(result.current).toHaveProperty('medium');
    expect(result.current).toHaveProperty('heavy');
    expect(result.current).toHaveProperty('success');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('vibrate');
  });

  it('light() calls vibrate(10)', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.light();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
  });

  it('medium() calls vibrate(25)', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.medium();
    expect(vibrateSpy).toHaveBeenCalledWith(25);
  });

  it('heavy() calls vibrate(50)', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.heavy();
    expect(vibrateSpy).toHaveBeenCalledWith(50);
  });

  it('success() calls vibrate with double-tap pattern', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.success();
    expect(vibrateSpy).toHaveBeenCalledWith([10, 50, 10]);
  });

  it('error() calls vibrate with triple-buzz pattern', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.error();
    expect(vibrateSpy).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
  });

  it('vibrate() passes custom pattern through', () => {
    const { result } = renderHook(() => useHapticFeedback());
    result.current.vibrate([100, 200]);
    expect(vibrateSpy).toHaveBeenCalledWith([100, 200]);
  });

  it('does not throw when vibrate is not supported', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useHapticFeedback());
    expect(() => result.current.light()).not.toThrow();
  });
});

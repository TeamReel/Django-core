import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('persists new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42));

    act(() => result.current[1](99));

    expect(result.current[0]).toBe(99);
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(99);
  });

  it('supports updater function', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 10));

    act(() => result.current[1]((prev) => prev + 5));

    expect(result.current[0]).toBe(15);
  });

  it('handles objects', () => {
    const { result } = renderHook(() =>
      useLocalStorage('obj', { name: 'test', count: 0 }),
    );

    act(() => result.current[1]({ name: 'updated', count: 1 }));

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({
      name: 'updated',
      count: 1,
    });
  });

  it('falls back to initialValue on corrupt JSON', () => {
    localStorage.setItem('bad-key', '{{not valid json');
    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});

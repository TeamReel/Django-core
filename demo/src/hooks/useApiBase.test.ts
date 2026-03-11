import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../utils/apiBase', () => ({
  getApiBaseUrl: () => 'https://api.teamreel.test',
}));

import { useApiBase } from './useApiBase';

describe('useApiBase', () => {
  it('returns the API base URL', () => {
    const { result } = renderHook(() => useApiBase());
    expect(result.current).toBe('https://api.teamreel.test');
  });

  it('returns same reference on re-render (memoized)', () => {
    const { result, rerender } = renderHook(() => useApiBase());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

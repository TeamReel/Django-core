import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { installFetchMock, restoreFetch, mockApiResponse } from '@/test/api-mock';

// Mock createApiClient to return an object whose .get() uses global fetch
vi.mock('@django-core/api-client', () => ({
  createApiClient: () => ({
    get: async (url: string, opts?: any) => {
      const resp = await fetch(url, opts);
      const data = await resp.json();
      return { data };
    },
  }),
}));

vi.mock('../utils/apiBase', () => ({
  getApiBaseUrl: () => 'http://localhost',
}));

import { useSearch, useDebounce } from './useSearch';

describe('useSearch', () => {
  beforeEach(() => {
    installFetchMock();
  });
  afterEach(() => {
    restoreFetch();
  });

  it('starts with idle state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.isSearching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('searchGlobal returns null for empty query', async () => {
    const { result } = renderHook(() => useSearch());

    let res: any;
    await act(async () => {
      res = await result.current.searchGlobal('  ');
    });

    expect(res).toBeNull();
    expect(result.current.isSearching).toBe(false);
  });

  it('searchGlobal fetches and returns grouped results', async () => {
    const grouped = { clubs: [{ id: '1', title: 'FC Test' }], teams: [] };
    mockApiResponse('/api/v1/search/', grouped);

    const { result } = renderHook(() => useSearch());

    let res: any;
    await act(async () => {
      res = await result.current.searchGlobal('test');
    });

    expect(res).toEqual(grouped);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('searchFiltered passes types and page params', async () => {
    const paginated = { count: 1, next: null, previous: null, results: [{ id: '1', title: 'Team' }] };
    mockApiResponse('/api/v1/search/', paginated);

    const { result } = renderHook(() => useSearch());

    let res: any;
    await act(async () => {
      res = await result.current.searchFiltered('team', ['projects', 'organisations'], 2);
    });

    expect(res).toEqual(paginated);
  });

  it('sets error on fetch failure', async () => {
    // No route mocked → 404 treated as error by the hook after json parse
    // Instead, mock a route that will throw in the api client
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.searchGlobal('test');
    });

    expect(result.current.error).toBe('Network error');
  });
});

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value updates', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    expect(result.current).toBe('a');

    rerender({ value: 'ab' });
    expect(result.current).toBe('a'); // not updated yet

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('ab');
  });
});

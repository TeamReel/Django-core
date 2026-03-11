import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockGetRecents = vi.fn<[], import('../utils/navStorage').NavStoredItem[]>().mockReturnValue([]);
const mockGetFavorites = vi.fn<[], import('../utils/navStorage').NavStoredItem[]>().mockReturnValue([]);

vi.mock('../utils/navStorage', () => ({
  getRecents: () => mockGetRecents(),
  getFavorites: () => mockGetFavorites(),
}));

import { useNavRecents, useNavFavorites } from './useNavItems';

describe('useNavRecents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecents.mockReturnValue([]);
  });

  it('returns empty array initially', () => {
    const { result } = renderHook(() => useNavRecents());
    expect(result.current).toEqual([]);
  });

  it('returns items from navStorage', () => {
    const items = [
      { path: '/team/1', label: 'Team A', kind: 'team' as const, ts: Date.now() },
    ];
    mockGetRecents.mockReturnValue(items);
    const { result } = renderHook(() => useNavRecents());
    expect(result.current).toEqual(items);
  });

  it('refreshes on nav:recents event', () => {
    mockGetRecents.mockReturnValue([]);
    const { result } = renderHook(() => useNavRecents());
    expect(result.current).toEqual([]);

    const updated = [
      { path: '/club/1', label: 'Club B', kind: 'club' as const, ts: Date.now() },
    ];
    mockGetRecents.mockReturnValue(updated);

    act(() => {
      window.dispatchEvent(new Event('nav:recents'));
    });

    expect(result.current).toEqual(updated);
  });

  it('refreshes on storage event', () => {
    mockGetRecents.mockReturnValue([]);
    const { result } = renderHook(() => useNavRecents());

    const updated = [
      { path: '/org/1', label: 'Org C', kind: 'organisation' as const, ts: Date.now() },
    ];
    mockGetRecents.mockReturnValue(updated);

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current).toEqual(updated);
  });
});

describe('useNavFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFavorites.mockReturnValue([]);
  });

  it('returns favorites from navStorage', () => {
    const items = [
      { path: '/team/2', label: 'Fav Team', kind: 'team' as const, ts: Date.now() },
    ];
    mockGetFavorites.mockReturnValue(items);
    const { result } = renderHook(() => useNavFavorites());
    expect(result.current).toEqual(items);
  });

  it('refreshes on nav:favorites event', () => {
    mockGetFavorites.mockReturnValue([]);
    const { result } = renderHook(() => useNavFavorites());

    const updated = [
      { path: '/match/1', label: 'Fav Match', kind: 'match' as const, ts: Date.now() },
    ];
    mockGetFavorites.mockReturnValue(updated);

    act(() => {
      window.dispatchEvent(new Event('nav:favorites'));
    });

    expect(result.current).toEqual(updated);
  });
});

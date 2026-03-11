import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { useContentOptions } from '../../../../pages/identity/ContentGenerationModal/useContentOptions';

describe('useContentOptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('initialises with default formation and styles', () => {
    const { result } = renderHook(() => useContentOptions({ isOpen: false, matchData: null }));
    expect(result.current.lineupFormation).toBe('4-3-3');
    expect(result.current.lineupCloseupStyle).toBe('popout');
    expect(result.current.lineupAnimationStyle).toBe('slide_up');
    expect(result.current.matchFlyerVariant).toBe('modern');
    expect(result.current.goalScoreHome).toBe(0);
    expect(result.current.goalScoreAway).toBe(0);
  });

  it('reads formation from matchData metadata', () => {
    const matchData = { metadata: { formation: '3-5-2' } };
    const { result } = renderHook(() => useContentOptions({ isOpen: false, matchData }));
    expect(result.current.lineupFormation).toBe('3-5-2');
  });

  it('fetches app backgrounds when opened', async () => {
    const { api } = await import('@/api/client');
    vi.mocked(api.get).mockResolvedValue({ results: [{ id: 'bg1', url: 'https://example.com/bg.jpg', label: 'Pitch' }] });
    const { result } = renderHook(() => useContentOptions({ isOpen: true, matchData: null }));
    await waitFor(() => expect(result.current.appBackgrounds.length).toBe(1));
    expect(result.current.appBackgrounds[0].id).toBe('bg1');
  });

  it('does not fetch backgrounds when closed', () => {
    renderHook(() => useContentOptions({ isOpen: false, matchData: null }));
    // api.get should not be called for backgrounds
    return import('@/api/client').then(({ api }) => {
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  it('updates lineup options via setters', () => {
    const { result } = renderHook(() => useContentOptions({ isOpen: false, matchData: null }));
    act(() => result.current.setLineupFormation('4-4-2'));
    expect(result.current.lineupFormation).toBe('4-4-2');
    act(() => result.current.setLineupCloseupStyle('badge'));
    expect(result.current.lineupCloseupStyle).toBe('badge');
  });

  it('updates flyer options via setters', () => {
    const { result } = renderHook(() => useContentOptions({ isOpen: false, matchData: null }));
    act(() => result.current.setMatchFlyerVariant('action'));
    expect(result.current.matchFlyerVariant).toBe('action');
    act(() => result.current.setFlyerPhotoLayout('triple'));
    expect(result.current.flyerPhotoLayout).toBe('triple');
  });

  it('updates goal options via setters', () => {
    const { result } = renderHook(() => useContentOptions({ isOpen: false, matchData: null }));
    act(() => result.current.setGoalScoreHome(3));
    act(() => result.current.setGoalScoreAway(1));
    expect(result.current.goalScoreHome).toBe(3);
    expect(result.current.goalScoreAway).toBe(1);
  });
});

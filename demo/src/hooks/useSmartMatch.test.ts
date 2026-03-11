import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('./useActivities', () => ({
  useActivities: vi.fn(),
}));

import { useSmartMatch } from './useSmartMatch';
import { useActivities } from './useActivities';

const mockUseActivities = vi.mocked(useActivities);

const now = Date.now();
const hoursFromNow = (h: number) => new Date(now + h * 3600_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

const MOCK_ACTIVITIES = [
  // Within 48h (highlighted)
  { id: 'm1', title: 'Match A', activity_type: 'match', start_time: hoursFromNow(2), end_time: hoursFromNow(4) },
  { id: 'm2', title: 'Match B', activity_type: 'match', start_time: hoursFromNow(24), end_time: hoursFromNow(26) },
  // Beyond 48h (upcoming)
  { id: 'm3', title: 'Match C', activity_type: 'match', start_time: hoursFromNow(72), end_time: hoursFromNow(74) },
  { id: 'm4', title: 'Match D', activity_type: 'match', start_time: hoursFromNow(120), end_time: hoursFromNow(122) },
  // Past (recent)
  { id: 'm5', title: 'Match E', activity_type: 'match', start_time: hoursAgo(24), end_time: hoursAgo(22) },
  { id: 'm6', title: 'Match F', activity_type: 'match', start_time: hoursAgo(72), end_time: hoursAgo(70) },
  // Non-match activity (should be excluded)
  { id: 'a7', title: 'Training', activity_type: 'training', start_time: hoursFromNow(1), end_time: hoursFromNow(3) },
];

describe('useSmartMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActivities.mockReturnValue({
      activities: MOCK_ACTIVITIES as any,
      loading: false,
      error: null,
    });
  });

  it('partitions matches into highlighted, upcoming, and recent', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));

    expect(result.current.highlighted).toHaveLength(2);
    expect(result.current.upcoming).toHaveLength(2);
    expect(result.current.recent).toHaveLength(2);
  });

  it('excludes non-match activities', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));
    const allIds = result.current.all.map((m) => m.id);
    expect(allIds).not.toContain('a7');
  });

  it('sorts highlighted by soonest first', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));
    const ids = result.current.highlighted.map((m) => m.id);
    expect(ids).toEqual(['m1', 'm2']); // 2h, 24h
  });

  it('sorts upcoming by soonest first', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));
    const ids = result.current.upcoming.map((m) => m.id);
    expect(ids).toEqual(['m3', 'm4']); // 72h, 120h
  });

  it('sorts recent by most recent first', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));
    const ids = result.current.recent.map((m) => m.id);
    expect(ids).toEqual(['m5', 'm6']); // -24h, -72h
  });

  it('combines all matches correctly', () => {
    const { result } = renderHook(() => useSmartMatch('team-1'));
    expect(result.current.all).toHaveLength(6);
  });

  it('passes loading/error through', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: true,
      error: null,
    });

    const { result } = renderHook(() => useSmartMatch());
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns Dutch error message on error', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: false,
      error: 'API failed',
    });

    const { result } = renderHook(() => useSmartMatch());
    expect(result.current.error).toBe('Kon wedstrijden niet laden.');
  });

  it('handles empty activity list', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      loading: false,
      error: null,
    });

    const { result } = renderHook(() => useSmartMatch());
    expect(result.current.highlighted).toHaveLength(0);
    expect(result.current.upcoming).toHaveLength(0);
    expect(result.current.recent).toHaveLength(0);
    expect(result.current.all).toHaveLength(0);
  });

  it('passes teamProjectId to useActivities', () => {
    renderHook(() => useSmartMatch('team-xyz'));
    expect(mockUseActivities).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'team-xyz', limit: 50 }),
    );
  });
});

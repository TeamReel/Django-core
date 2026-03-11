import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../utils/directoryHelpers', () => ({
  sortKey: (s: string) => s.toLowerCase().trim(),
  getFederationName: (m: any, orgs: any[]) => {
    const orgId = m?.organisation?.id || m?.organisation;
    const org = orgs?.find((o: any) => String(o.id) === String(orgId));
    return org?.name || '';
  },
  getTeamName: (m: any, teams: any[]) => {
    const team = teams?.find((t: any) => String(t.id) === String(m?.project?.id));
    return team?.name || '';
  },
  getClubName: (m: any, clubs: any[], teams: any[]) => {
    return '';
  },
  getTeamParentId: (t: any) => String(t.parent_id || ''),
}));

import { useDerivedMatches } from './derived';

const makeMatch = (overrides: Record<string, any>) => ({
  id: overrides.id || 'default',
  title: overrides.title || 'Match',
  activity_type: 'match',
  start_time: overrides.start_time || '2025-06-15T14:00:00Z',
  end_time: '2025-06-15T16:00:00Z',
  location: '',
  description: '',
  project: overrides.project || { id: 'team-1', name: 'Heren 1' },
  organisation: overrides.organisation || { id: 'org-1', name: 'KNVB' },
  period: overrides.period || { name: 'Eredivisie', sport: null, parent_period: { name: 'Season 24/25' } },
  ...overrides,
});

const ORGS = [{ id: 'org-1', name: 'KNVB' }];
const CLUBS = [{ id: 'club-1', name: 'FC Example' }];
const TEAMS = [
  { id: 'team-1', name: 'Heren 1', parent_id: 'club-1' },
  { id: 'team-2', name: 'Dames 1', parent_id: 'club-1' },
];

const DEFAULT_PARAMS = {
  statusFilter: 'all',
  sportFilter: 'all',
  variantFilter: 'all',
  organisations: ORGS as any[],
  clubs: CLUBS as any[],
  teams: TEAMS as any[],
  selectedTeamId: null,
  selectedClubId: null,
};

describe('useDerivedMatches', () => {
  const matches = [
    makeMatch({ id: 'm1', title: 'Match 1', project: { id: 'team-1' }, start_time: '2025-06-10T14:00:00Z' }),
    makeMatch({ id: 'm2', title: 'Match 2', project: { id: 'team-1' }, start_time: '2025-06-20T14:00:00Z' }),
    makeMatch({ id: 'm3', title: 'Match 3', project: { id: 'team-2' }, start_time: '2025-06-15T14:00:00Z' }),
  ] as any[];

  it('returns all matches when no filters applied', () => {
    const { result } = renderHook(() =>
      useDerivedMatches({ ...DEFAULT_PARAMS, matches }),
    );
    expect(result.current.filteredMatches).toHaveLength(3);
    expect(result.current.sortedMatches).toHaveLength(3);
  });

  it('filters by selectedTeamId', () => {
    const { result } = renderHook(() =>
      useDerivedMatches({ ...DEFAULT_PARAMS, matches, selectedTeamId: 'team-1' }),
    );
    expect(result.current.filteredMatches).toHaveLength(2);
    expect(result.current.filteredMatches.every((m: any) => m.project?.id === 'team-1')).toBe(true);
  });

  it('filters by selectedClubId', () => {
    const { result } = renderHook(() =>
      useDerivedMatches({ ...DEFAULT_PARAMS, matches, selectedClubId: 'club-1' }),
    );
    // Both team-1 and team-2 belong to club-1
    expect(result.current.filteredMatches).toHaveLength(3);
  });

  it('filters upcoming matches with status filter', () => {
    const pastMatch = makeMatch({ id: 'mp', start_time: '2020-01-01T14:00:00Z', project: { id: 'team-1' } });
    const futureMatch = makeMatch({ id: 'mf', start_time: '2099-01-01T14:00:00Z', project: { id: 'team-1' } });

    const { result } = renderHook(() =>
      useDerivedMatches({
        ...DEFAULT_PARAMS,
        matches: [pastMatch, futureMatch] as any[],
        statusFilter: 'active',
      }),
    );
    expect(result.current.filteredMatches).toHaveLength(1);
    expect(result.current.filteredMatches[0].id).toBe('mf');
  });

  it('filters past matches with status filter', () => {
    const pastMatch = makeMatch({ id: 'mp', start_time: '2020-01-01T14:00:00Z', project: { id: 'team-1' } });
    const futureMatch = makeMatch({ id: 'mf', start_time: '2099-01-01T14:00:00Z', project: { id: 'team-1' } });

    const { result } = renderHook(() =>
      useDerivedMatches({
        ...DEFAULT_PARAMS,
        matches: [pastMatch, futureMatch] as any[],
        statusFilter: 'past',
      }),
    );
    // Past = anything NOT upcoming
    expect(result.current.filteredMatches).toHaveLength(1);
    expect(result.current.filteredMatches[0].id).toBe('mp');
  });

  it('sorts matches consistently', () => {
    const { result } = renderHook(() =>
      useDerivedMatches({ ...DEFAULT_PARAMS, matches }),
    );
    // Should have sorted output
    expect(result.current.sortedMatches).toHaveLength(3);
  });

  it('handles empty matches list', () => {
    const { result } = renderHook(() =>
      useDerivedMatches({ ...DEFAULT_PARAMS, matches: [] }),
    );
    expect(result.current.filteredMatches).toHaveLength(0);
    expect(result.current.sortedMatches).toHaveLength(0);
  });
});

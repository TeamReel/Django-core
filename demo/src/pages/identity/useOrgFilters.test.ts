import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgFilters } from './useOrgFilters';

describe('useOrgFilters', () => {
  it('returns default filter values', () => {
    const { result } = renderHook(() => useOrgFilters());
    expect(result.current.memberSearch).toBe('');
    expect(result.current.userRoleFilter).toBe('');
    expect(result.current.userClubFilterId).toBe('');
    expect(result.current.userTeamFilterId).toBe('');
    expect(result.current.usersPage).toBe(1);
    expect(result.current.usersPageSize).toBe(25);
    expect(result.current.teamSearch).toBe('');
    expect(result.current.teamStatusFilter).toBe('all');
    expect(result.current.clubSearch).toBe('');
    expect(result.current.clubStatusFilter).toBe('all');
    expect(result.current.seasonSearch).toBe('');
    expect(result.current.competitionSearch).toBe('');
    expect(result.current.matchSearch).toBe('');
    expect(result.current.hierarchySearch).toBe('');
  });

  it('updates member search', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setMemberSearch('John'));
    expect(result.current.memberSearch).toBe('John');
  });

  it('updates team status filter', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setTeamStatusFilter('active'));
    expect(result.current.teamStatusFilter).toBe('active');
    act(() => result.current.setTeamStatusFilter('inactive'));
    expect(result.current.teamStatusFilter).toBe('inactive');
  });

  it('updates club status filter', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setClubStatusFilter('inactive'));
    expect(result.current.clubStatusFilter).toBe('inactive');
  });

  it('updates users page', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setUsersPage(3));
    expect(result.current.usersPage).toBe(3);
  });

  it('updates competition filters', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setCompClubFilterId('club-1'));
    act(() => result.current.setCompTeamFilterId('team-1'));
    act(() => result.current.setCompSeasonFilterId('season-1'));
    act(() => result.current.setCompMatchesFilter('with'));
    expect(result.current.compClubFilterId).toBe('club-1');
    expect(result.current.compTeamFilterId).toBe('team-1');
    expect(result.current.compSeasonFilterId).toBe('season-1');
    expect(result.current.compMatchesFilter).toBe('with');
  });

  it('updates match filters independently', () => {
    const { result } = renderHook(() => useOrgFilters());
    act(() => result.current.setMatchClubFilterId('mc-1'));
    act(() => result.current.setMatchTeamFilterId('mt-1'));
    act(() => result.current.setMatchSeasonFilterId('ms-1'));
    act(() => result.current.setMatchCompFilterId('mcomp-1'));
    expect(result.current.matchClubFilterId).toBe('mc-1');
    expect(result.current.matchTeamFilterId).toBe('mt-1');
    expect(result.current.matchSeasonFilterId).toBe('ms-1');
    expect(result.current.matchCompFilterId).toBe('mcomp-1');
  });
});

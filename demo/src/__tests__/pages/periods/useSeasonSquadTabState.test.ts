import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: vi.fn(() => false) }));

import { useSeasonSquadTabState } from '@/pages/periods/useSeasonSquadTabState';

const m = (id: string, firstName: string, lastName: string, email = '') =>
  ({ id, user: { id, first_name: firstName, last_name: lastName, email }, metadata: {}, role: 'viewer' }) as any;

describe('useSeasonSquadTabState', () => {
  it('initial search is empty', () => {
    const { result } = renderHook(() => useSeasonSquadTabState({ members: [], isTeamRoute: true }));
    expect(result.current.squadSearch).toBe('');
  });

  it('returns all members when no search', () => {
    const members = [m('1', 'Alice', 'Smith'), m('2', 'Bob', 'Jones')];
    const { result } = renderHook(() => useSeasonSquadTabState({ members, isTeamRoute: true }));
    expect(result.current.visibleSquadMembers).toHaveLength(2);
  });

  it('filters members by search query', () => {
    const members = [m('1', 'Alice', 'Smith'), m('2', 'Bob', 'Jones')];
    const { result } = renderHook(() => useSeasonSquadTabState({ members, isTeamRoute: true }));
    act(() => result.current.setSquadSearch('alice'));
    expect(result.current.visibleSquadMembers).toHaveLength(1);
  });

  it('toggleSquadMembership adds and removes', () => {
    const { result } = renderHook(() => useSeasonSquadTabState({ members: [], isTeamRoute: true }));
    act(() => result.current.toggleSquadMembership('pm-1'));
    expect(result.current.selectedSquadMembershipIds.has('pm-1')).toBe(true);
    act(() => result.current.toggleSquadMembership('pm-1'));
    expect(result.current.selectedSquadMembershipIds.has('pm-1')).toBe(false);
  });

  it('toggleExpandedCard expands and collapses', () => {
    const { result } = renderHook(() => useSeasonSquadTabState({ members: [], isTeamRoute: true }));
    act(() => result.current.toggleExpandedCard('c1'));
    expect(result.current.expandedCards.has('c1')).toBe(true);
    act(() => result.current.toggleExpandedCard('c1'));
    expect(result.current.expandedCards.has('c1')).toBe(false);
  });

  it('squadUserIdSet holds unique user IDs', () => {
    const members = [m('u1', 'Alice', 'A'), m('u2', 'Bob', 'B')];
    const { result } = renderHook(() => useSeasonSquadTabState({ members, isTeamRoute: true }));
    expect(result.current.squadUserIdSet.size).toBe(2);
    expect(result.current.squadUserIdSet.has('u1')).toBe(true);
  });

  it('returns team role options for team route', () => {
    const { result } = renderHook(() => useSeasonSquadTabState({ members: [], isTeamRoute: true }));
    expect(result.current.accessRoleOptions[0].label).toBe('Team Admin');
  });

  it('returns club role options for non-team route', () => {
    const { result } = renderHook(() => useSeasonSquadTabState({ members: [], isTeamRoute: false }));
    expect(result.current.accessRoleOptions[0].label).toBe('Club Admin');
  });
});

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeamSelectieData } from './useTeamSelectieData';
import type { MemberRecord } from './teamSelectieHelpers';

const MEMBERS: MemberRecord[] = [
  { id: '1', user: { first_name: 'Jan', last_name: 'de Vries', name: 'Jan de Vries' }, role: 'player', functional_roles: ['player'] },
  { id: '2', user: { first_name: 'Piet', last_name: 'Bakker', name: 'Piet Bakker' }, role: 'coach', functional_roles: ['coach'] },
  { id: '3', user: { first_name: 'Kees', last_name: 'Jansen', name: 'Kees Jansen' }, role: 'player', functional_roles: ['player', 'captain'] },
  { id: '4', user: { first_name: 'Anna', last_name: 'Zwart', name: 'Anna Zwart' }, role: 'staff', functional_roles: ['manager'] },
  { id: '5', user: { first_name: 'Johan', last_name: 'Berg', name: 'Johan Berg' }, role: 'player', functional_roles: ['player'] },
];

describe('useTeamSelectieData', () => {
  it('returns all members unfiltered by default', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    expect(result.current.filtered).toHaveLength(5);
    expect(result.current.search).toBe('');
    expect(result.current.activeRoleFilter).toBeNull();
  });

  it('collects unique roles sorted with coach first', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    const roles = result.current.allRoles;
    expect(roles[0]).toBe('coach');
    expect(roles).toContain('player');
    expect(roles).toContain('captain');
    expect(roles).toContain('manager');
  });

  it('filters members by search term', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    act(() => result.current.setSearch('Jan'));
    expect(result.current.filtered.length).toBeGreaterThanOrEqual(1);
    expect(result.current.filtered.some((m) => m.id === '1')).toBe(true);
  });

  it('filters members by role', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    act(() => result.current.setActiveRoleFilter('coach'));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('2');
  });

  it('combines search and role filter', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    act(() => {
      result.current.setActiveRoleFilter('player');
      result.current.setSearch('Berg');
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('5');
  });

  it('groups filtered members by first letter', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    const groups = result.current.letterGroups;
    const letters = groups.map((g) => g.letter);
    expect(letters).toContain('J');
    expect(letters).toContain('P');
    expect(letters).toContain('K');
    expect(letters).toContain('A');
  });

  it('tracks expanded member and edit state', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    expect(result.current.expandedId).toBeNull();
    expect(result.current.editMember).toBeNull();

    act(() => result.current.setExpandedId('3'));
    expect(result.current.expandedId).toBe('3');

    act(() => result.current.setEditMember(MEMBERS[2]));
    expect(result.current.editMember).toBe(MEMBERS[2]);
  });

  it('returns empty when no members match search', () => {
    const { result } = renderHook(() => useTeamSelectieData(MEMBERS));
    act(() => result.current.setSearch('zzzzzzzzz'));
    expect(result.current.filtered).toHaveLength(0);
    expect(result.current.letterGroups).toHaveLength(0);
  });
});

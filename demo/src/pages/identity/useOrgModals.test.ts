import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgModals } from './useOrgModals';

describe('useOrgModals', () => {
  it('initialises all modals as closed', () => {
    const { result } = renderHook(() => useOrgModals());
    expect(result.current.isClubModalOpen).toBe(false);
    expect(result.current.isDetailModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isCreateClubModalOpen).toBe(false);
    expect(result.current.isCreateTeamModalOpen).toBe(false);
    expect(result.current.isAddMemberModalOpen).toBe(false);
    expect(result.current.isCreateSeasonModalOpen).toBe(false);
    expect(result.current.isCreateCompetitionModalOpen).toBe(false);
    expect(result.current.isCreateMatchModalOpen).toBe(false);
    expect(result.current.isEditMemberRoleModalOpen).toBe(false);
    expect(result.current.isOrgDetailModalOpen).toBe(false);
    expect(result.current.isOrgEditModalOpen).toBe(false);
    expect(result.current.isUserDetailModalOpen).toBe(false);
  });

  it('initialises selections as null', () => {
    const { result } = renderHook(() => useOrgModals());
    expect(result.current.selectedClub).toBeNull();
    expect(result.current.detailProject).toBeNull();
    expect(result.current.selectedEditProject).toBeNull();
    expect(result.current.editingMember).toBeNull();
    expect(result.current.detailUser).toBeNull();
  });

  it('can open and close club modal', () => {
    const { result } = renderHook(() => useOrgModals());

    act(() => result.current.setIsClubModalOpen(true));
    expect(result.current.isClubModalOpen).toBe(true);

    act(() => result.current.setIsClubModalOpen(false));
    expect(result.current.isClubModalOpen).toBe(false);
  });

  it('can set selected club', () => {
    const { result } = renderHook(() => useOrgModals());
    const club = { id: 'c-1', name: 'FC Test' } as any;

    act(() => result.current.setSelectedClub(club));
    expect(result.current.selectedClub).toEqual(club);
  });

  it('can toggle multiple modals independently', () => {
    const { result } = renderHook(() => useOrgModals());

    act(() => {
      result.current.setIsCreateClubModalOpen(true);
      result.current.setIsAddMemberModalOpen(true);
    });

    expect(result.current.isCreateClubModalOpen).toBe(true);
    expect(result.current.isAddMemberModalOpen).toBe(true);
    expect(result.current.isCreateTeamModalOpen).toBe(false);
  });

  it('can set editing member', () => {
    const { result } = renderHook(() => useOrgModals());
    const member = { id: 'm-1', name: 'Jan' };

    act(() => result.current.setEditingMember(member));
    expect(result.current.editingMember).toEqual(member);
  });

  it('can set detail user', () => {
    const { result } = renderHook(() => useOrgModals());
    const user = { id: 'u-1', email: 'test@test.com' };

    act(() => {
      result.current.setDetailUser(user);
      result.current.setIsUserDetailModalOpen(true);
    });

    expect(result.current.detailUser).toEqual(user);
    expect(result.current.isUserDetailModalOpen).toBe(true);
  });
});

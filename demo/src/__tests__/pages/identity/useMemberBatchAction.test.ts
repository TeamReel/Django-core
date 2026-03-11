import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/api', () => ({
  api: { patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } },
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useMemberBatchAction } from '../../../pages/identity/useMemberBatchAction';
import type { BatchMemberEntry, TeamOption } from '../../../pages/identity/memberBatchAction.types';

const member = (id: string, name = 'User'): BatchMemberEntry => ({
  id,
  first_name: name,
  last_name: '',
  project_membership_id: `pm-${id}`,
});

const team = (id: string, name: string): TeamOption => ({ id, name });

const base = () => ({
  isOpen: true,
  members: [member('1'), member('2')],
  contextLevel: 'team' as const,
  teamProjectId: 'tp-1',
  orgSlug: 'org-1',
  teams: [team('t1', 'Team A')] as TeamOption[],
});

describe('useMemberBatchAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts in configure step with role action', () => {
    const { result } = renderHook(() => useMemberBatchAction(base()));
    expect(result.current.step).toBe('configure');
    expect(result.current.selectedAction).toBe('role');
  });

  it('resets state when modal opens', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useMemberBatchAction({ ...base(), isOpen }),
      { initialProps: { isOpen: false } },
    );
    act(() => result.current.setSelectedAction('delete'));
    rerender({ isOpen: true });
    expect(result.current.selectedAction).toBe('role');
  });

  it('returns role and delete actions for team context', () => {
    const { result } = renderHook(() => useMemberBatchAction(base()));
    const keys = result.current.actions.map(a => a.key);
    expect(keys).toContain('role');
    expect(keys).toContain('delete');
    expect(keys).not.toContain('assign_team'); // not available in team context
  });

  it('includes assign_team action for club context with teams', () => {
    const { result } = renderHook(() => useMemberBatchAction({
      ...base(),
      contextLevel: 'club',
      teams: [team('t1', 'Team A')],
    }));
    const keys = result.current.actions.map(a => a.key);
    expect(keys).toContain('assign_team');
  });

  it('returns team role options for team context', () => {
    const { result } = renderHook(() => useMemberBatchAction(base()));
    expect(result.current.roleOptions[0].label).toContain('Team Admin');
  });

  it('canProceed is true for role action with members', () => {
    const { result } = renderHook(() => useMemberBatchAction(base()));
    expect(result.current.canProceed).toBe(true);
  });

  it('canProceed is false for assign_team without selected team', () => {
    const { result } = renderHook(() => useMemberBatchAction({
      ...base(),
      contextLevel: 'club',
    }));
    act(() => result.current.setSelectedAction('assign_team'));
    expect(result.current.canProceed).toBe(false);
  });

  it('getSummaryText describes role change', () => {
    const { result } = renderHook(() => useMemberBatchAction(base()));
    const text = result.current.getSummaryText();
    expect(text).toContain('2 member(s)');
  });

  it('executeBatch runs role change for each member', async () => {
    const { api } = await import('@/api');
    vi.mocked(api.patch).mockResolvedValue({});
    const { result } = renderHook(() => useMemberBatchAction(base()));
    await act(async () => { await result.current.executeBatch(); });
    expect(result.current.step).toBe('done');
    expect(result.current.progress.success).toBe(2);
    expect(api.patch).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/api', () => ({
  api: { post: vi.fn(), patch: vi.fn(), delete: vi.fn(), get: vi.fn() },
}));
vi.mock('../../../utils/fetchAllPages', () => ({
  fetchAllPages: vi.fn(),
  invalidateFetchAllPagesCache: vi.fn(),
}));
vi.mock('../../../utils/activeContext', () => ({
  setActiveContext: vi.fn(),
  getActiveContext: vi.fn(),
}));
vi.mock('../../../pages/identity/orgDataHelpers', () => ({
  getApiV1BaseUrl: vi.fn(() => '/api/v1'),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useOrgActions } from '@/pages/identity/useOrgActions';
import type { Organisation } from '@/types';

const makeParams = (overrides: Record<string, unknown> = {}) => ({
  org: { id: '1', name: 'Test Org', slug: 'test-org', metadata: { type: 'federation', country: 'NL' } } as Organisation & Record<string, any>,
  currentOrgSlug: 'test-org',
  currentOrgId: '1',
  navigate: vi.fn(),
  setOrg: vi.fn(),
  setActivatingContext: vi.fn(),
  setActiveContextState: vi.fn(),
  setDeleteLoading: vi.fn(),
  setInviteLoading: vi.fn(),
  setInviteEmail: vi.fn(),
  setIsEditMode: vi.fn(),
  setEditName: vi.fn(),
  setEditType: vi.fn(),
  setEditCountry: vi.fn(),
  setSaving: vi.fn(),
  setMembers: vi.fn(),
  setClubs: vi.fn(),
  setTeams: vi.fn(),
  setAllClubsForTeams: vi.fn(),
  inviteEmail: 'test@example.com',
  inviteRole: 'member' as const,
  editName: 'Updated Name',
  editType: 'federation',
  editCountry: 'NL',
  ...overrides,
});

describe('useOrgActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleEdit sets edit mode with current values', () => {
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    act(() => result.current.handleEdit());
    expect(params.setEditName).toHaveBeenCalledWith('Test Org');
    expect(params.setEditType).toHaveBeenCalledWith('federation');
    expect(params.setIsEditMode).toHaveBeenCalledWith(true);
  });

  it('handleCancelEdit clears edit mode', () => {
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    act(() => result.current.handleCancelEdit());
    expect(params.setIsEditMode).toHaveBeenCalledWith(false);
    expect(params.setEditName).toHaveBeenCalledWith('');
  });

  it('handleSaveEdit patches organisation', async () => {
    const { api } = await import('@/api');
    vi.mocked(api.patch).mockResolvedValue({ id: '1', name: 'Updated Name' });
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    await act(async () => { await result.current.handleSaveEdit(); });
    expect(api.patch).toHaveBeenCalledWith('/organisations/test-org/', expect.objectContaining({ name: 'Updated Name' }));
    expect(params.setOrg).toHaveBeenCalled();
    expect(params.setIsEditMode).toHaveBeenCalledWith(false);
  });

  it('handleDelete calls API and navigates', async () => {
    const { api } = await import('@/api');
    vi.mocked(api.delete).mockResolvedValue(undefined as any);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    await act(async () => { await result.current.handleDelete(); });
    expect(api.delete).toHaveBeenCalledWith('/organisations/test-org/');
    expect(params.navigate).toHaveBeenCalledWith('/federations');
    vi.mocked(window.confirm).mockRestore();
  });

  it('handleDelete aborts when user cancels confirm', async () => {
    const { api } = await import('@/api');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    await act(async () => { await result.current.handleDelete(); });
    expect(api.delete).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockRestore();
  });

  it('handleInvite posts member and resets email', async () => {
    const { api } = await import('@/api');
    vi.mocked(api.post).mockResolvedValue({ id: 'new-member' });
    const { fetchAllPages } = await import('../../../utils/fetchAllPages');
    vi.mocked(fetchAllPages).mockResolvedValue([]);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const params = makeParams();
    const { result } = renderHook(() => useOrgActions(params));
    await act(async () => { await result.current.handleInvite({ preventDefault: vi.fn() } as any); });
    expect(api.post).toHaveBeenCalledWith('/organisations/test-org/members/', { email: 'test@example.com', role: 'member' });
    expect(params.setInviteEmail).toHaveBeenCalledWith('');
    vi.mocked(window.alert).mockRestore();
  });
});

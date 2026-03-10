import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
const mockUpload = vi.fn();

vi.mock('@/api', () => ({
  api: {
    list: (...args: any[]) => mockList(...args),
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
    upload: (...args: any[]) => mockUpload(...args),
  },
}));

import { useBrandProfile } from './useBrandProfile';

const PROFILE = {
  id: 'bp-1',
  name: 'Club Brand',
  organisation: 'org-1',
  project: 1,
  assets: [
    { id: 'a1', asset_type: 'club_logo', url: '/logos/logo.png', is_active: true },
    { id: 'a2', asset_type: 'club_background', url: '/bg/bg1.jpg', is_active: true },
  ],
  design_tokens: [],
};

describe('useBrandProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches profile and assets on mount', async () => {
    mockList.mockResolvedValue([PROFILE]);
    mockGet.mockResolvedValue(PROFILE);

    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: 'org-1', projectId: 1 }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile?.id).toBe('bp-1');
    expect(result.current.assets).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns null profile when no profiles exist', async () => {
    mockList.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: 'org-1', projectId: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toBeNull();
    expect(result.current.assets).toEqual([]);
  });

  it('sets error on fetch failure', async () => {
    mockList.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: 'org-1', projectId: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.profile).toBeNull();
  });

  it('getAsset returns first active asset by type', async () => {
    mockList.mockResolvedValue([PROFILE]);
    mockGet.mockResolvedValue(PROFILE);

    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: 'org-1', projectId: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getAsset('club_logo')?.id).toBe('a1');
    expect(result.current.getAsset('nonexistent')).toBeUndefined();
  });

  it('does not fetch when organisationId and projectId are both missing', async () => {
    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: null, projectId: null }),
    );

    // Should remain in initial state, no loading ever triggers
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockList).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  it('deleteAsset calls api.delete and refreshes', async () => {
    mockList.mockResolvedValue([PROFILE]);
    mockGet.mockResolvedValue(PROFILE);
    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useBrandProfile({ organisationId: 'org-1', projectId: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const ok = await result.current.deleteAsset('club_logo');
    expect(ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('/branding/profiles/bp-1/assets/a1/');
  });
});

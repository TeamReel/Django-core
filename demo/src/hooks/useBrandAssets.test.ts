import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockListAllProfiles = vi.fn();
const mockListAllProfileAssets = vi.fn();

vi.mock('@/api', () => ({
  brandingApi: {
    listAllProfiles: (...args: any[]) => mockListAllProfiles(...args),
    listAllProfileAssets: (...args: any[]) => mockListAllProfileAssets(...args),
  },
}));

import { useBrandAssets } from './useBrandAssets';

describe('useBrandAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const { result } = renderHook(() => useBrandAssets());

    expect(result.current.assets).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches profiles then assets and flattens results', async () => {
    const profiles = [
      { id: 'p1', name: 'Club Brand', project_name: 'FC Test', project_type: 'club', organisation_name: 'Org' },
    ];
    const assets = [
      { id: 'a1', asset_type: 'logo', alt_text: 'Logo', file: '/logo.png', is_active: true },
      { id: 'a2', asset_type: 'kit_home', alt_text: 'Home kit', file: '/kit.png', is_active: true },
    ];
    mockListAllProfiles.mockResolvedValue(profiles);
    mockListAllProfileAssets.mockResolvedValue(assets);

    const { result } = renderHook(() => useBrandAssets());

    await act(async () => {
      await result.current.fetchAssets('org-1');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.assets).toHaveLength(2);
    expect(result.current.assets[0]).toMatchObject({ id: 'a1', profile_name: 'Club Brand' });
    expect(mockListAllProfiles).toHaveBeenCalledWith(
      { organisation: 'org-1' },
      expect.objectContaining({ pageSize: 100 }),
    );
  });

  it('returns empty assets when no profiles exist', async () => {
    mockListAllProfiles.mockResolvedValue([]);

    const { result } = renderHook(() => useBrandAssets());

    await act(async () => {
      await result.current.fetchAssets('org-1');
    });

    expect(result.current.assets).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(mockListAllProfileAssets).not.toHaveBeenCalled();
  });

  it('applies client-side category filter', async () => {
    mockListAllProfiles.mockResolvedValue([{ id: 'p1', name: 'Brand' }]);
    mockListAllProfileAssets.mockResolvedValue([
      { id: 'a1', asset_type: 'logo', alt_text: '', file: '', is_active: true },
      { id: 'a2', asset_type: 'kit_home', alt_text: '', file: '', is_active: true },
      { id: 'a3', asset_type: 'sponsor_logo', alt_text: '', file: '', is_active: true },
    ]);

    const { result } = renderHook(() => useBrandAssets());

    await act(async () => {
      await result.current.fetchAssets('org-1', 'logo');
    });

    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0].id).toBe('a1');
  });

  it('sets error on fetch failure', async () => {
    mockListAllProfiles.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useBrandAssets());

    await act(async () => {
      await result.current.fetchAssets('org-1');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.assets).toEqual([]);
  });

  it('computes category counts from current assets', async () => {
    mockListAllProfiles.mockResolvedValue([{ id: 'p1', name: 'Brand' }]);
    mockListAllProfileAssets.mockResolvedValue([
      { id: 'a1', asset_type: 'logo', alt_text: '', file: '', is_active: true },
      { id: 'a2', asset_type: 'kit_home', alt_text: '', file: '', is_active: true },
      { id: 'a3', asset_type: 'kit_away', alt_text: '', file: '', is_active: true },
    ]);

    const { result } = renderHook(() => useBrandAssets());

    await act(async () => {
      await result.current.fetchAssets('org-1');
    });

    const cats = result.current.categories;
    expect(cats.find((c) => c.key === 'all')?.count).toBe(3);
    expect(cats.find((c) => c.key === 'logo')?.count).toBe(1);
    expect(cats.find((c) => c.key === 'kit')?.count).toBe(2);
  });
});

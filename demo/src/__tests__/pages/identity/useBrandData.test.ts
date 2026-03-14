import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useBrandProfile', () => ({
  default: vi.fn(() => ({ getAsset: vi.fn(() => null) })),
  getAssetUrl: vi.fn((url: string) => url),
}));

import { useBrandData } from '@/pages/identity/useBrandData';
import useBrandProfile from '@/hooks/useBrandProfile';
import { getAssetUrl } from '@/hooks/useBrandProfile';

const base = () => ({
  activeTabFromUrl: 'overview' as string,
  orgId: 'org-1',
  clubId: 'club-1',
  teamIdForDirectoryLists: 'team-1',
});

describe('useBrandData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty brand assets when no assets found', () => {
    const { result } = renderHook(() => useBrandData(base()));
    expect(result.current.brandLogoUrl).toBeNull();
    expect(result.current.brandSponsorUrl).toBeNull();
    expect(result.current.brandAssets.find(a => a.label === 'Logo')?.present).toBe(false);
  });

  it('detects present logo', () => {
    vi.mocked(useBrandProfile).mockReturnValue({
      getAsset: vi.fn((key: string) =>
        key === 'logo_upload' ? { url: 'https://cdn.example.com/logo.png' } : null,
      ),
    } as any);
    const { result } = renderHook(() => useBrandData(base()));
    expect(result.current.brandLogoUrl).toBe('https://cdn.example.com/logo.png');
    expect(result.current.brandAssets.find(a => a.label === 'Logo')?.present).toBe(true);
  });

  it('detects present sponsor', () => {
    vi.mocked(useBrandProfile).mockReturnValue({
      getAsset: vi.fn((key: string) =>
        key === 'sponsor_logo_upload' ? { url: 'https://cdn.example.com/sponsor.png' } : null,
      ),
    } as any);
    const { result } = renderHook(() => useBrandData(base()));
    expect(result.current.brandSponsorUrl).toBe('https://cdn.example.com/sponsor.png');
  });

  it('resolves kit URLs from brand profile', () => {
    vi.mocked(useBrandProfile).mockReturnValue({
      getAsset: vi.fn((key: string) =>
        key === 'kit_home_combined' ? { url: 'https://cdn.example.com/home.png' } : null,
      ),
    } as any);
    const { result } = renderHook(() => useBrandData(base()));
    expect(result.current.batchBrandKits['home']).toBe('https://cdn.example.com/home.png');
  });

  it('calls useBrandProfile with correct project IDs', () => {
    renderHook(() => useBrandData(base()));
    expect(useBrandProfile).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'club-1' }));
    expect(useBrandProfile).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'team-1' }));
  });
});

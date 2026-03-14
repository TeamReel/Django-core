import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api', () => ({
  organisationsApi: { get: vi.fn() },
}));
vi.mock('@/utils/periodPath', () => ({
  looksLikeUuid: vi.fn((v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)),
  periodPathKey: vi.fn(),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

import { useResolvedOrgId } from '@/pages/identity/org-context/useResolvedOrgId';

describe('useResolvedOrgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns numeric ID immediately without loading', () => {
    const { result } = renderHook(() => useResolvedOrgId('42'));
    expect(result.current.orgId).toBe('42');
    expect(result.current.loading).toBe(false);
  });

  it('returns UUID immediately without loading', () => {
    const { result } = renderHook(() => useResolvedOrgId('a1b2c3d4-e5f6-7890-abcd-ef1234567890'));
    expect(result.current.orgId).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result.current.loading).toBe(false);
  });

  it('returns empty orgId for empty input', () => {
    const { result } = renderHook(() => useResolvedOrgId(''));
    expect(result.current.orgId).toBe('');
    expect(result.current.loading).toBe(false);
  });

  it('resolves slug via API call', async () => {
    const { organisationsApi } = await import('@/api');
    vi.mocked(organisationsApi.get).mockResolvedValue({ id: '99', name: 'Resolved Org' });
    const { result } = renderHook(() => useResolvedOrgId('my-org-slug'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.orgId).toBe('99');
    expect(organisationsApi.get).toHaveBeenCalledWith('my-org-slug');
  });

  it('sets error on API failure', async () => {
    const { organisationsApi } = await import('@/api');
    vi.mocked(organisationsApi.get).mockRejectedValue(new Error('Not found'));
    const { result } = renderHook(() => useResolvedOrgId('bad-slug'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Not found');
    expect(result.current.orgId).toBe('bad-slug');
  });
});

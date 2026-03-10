import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreditBalance } from './useCreditBalance';

const mockOrgGet = vi.fn();
const mockListPolicies = vi.fn();

vi.mock('@/api', () => ({
  organisationsApi: { get: (...args: any[]) => mockOrgGet(...args) },
  transactionsApi: { listBalancePolicies: (...args: any[]) => mockListPolicies(...args) },
}));

describe('useCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches balance and policies when orgSlug and orgId are provided', async () => {
    mockOrgGet.mockResolvedValueOnce({ credit_balance: 500 });
    mockListPolicies.mockResolvedValueOnce({
      results: [{ id: '1', min_threshold: 100, action: 'alert', is_active: true }],
    });

    const { result } = renderHook(() => useCreditBalance('my-org', 'org-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.balance).toBe(500);
    expect(result.current.lowBalanceAlert).toBe(false);
    expect(result.current.threshold).toBe(100);
    expect(result.current.error).toBeNull();
    expect(mockOrgGet).toHaveBeenCalledWith('my-org');
  });

  it('sets lowBalanceAlert when balance is below threshold', async () => {
    mockOrgGet.mockResolvedValueOnce({ credit_balance: 50 });
    mockListPolicies.mockResolvedValueOnce({
      results: [{ id: '1', min_threshold: 100, action: 'alert', is_active: true }],
    });

    const { result } = renderHook(() => useCreditBalance('my-org', 'org-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.balance).toBe(50);
    expect(result.current.lowBalanceAlert).toBe(true);
    expect(result.current.threshold).toBe(100);
  });

  it('does not fetch when orgSlug is missing', async () => {
    const { result } = renderHook(() => useCreditBalance(undefined, 'org-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.balance).toBeNull();
    expect(mockOrgGet).not.toHaveBeenCalled();
  });

  it('does not fetch when orgId is missing', async () => {
    const { result } = renderHook(() => useCreditBalance('my-org', undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.balance).toBeNull();
    expect(mockOrgGet).not.toHaveBeenCalled();
  });

  it('sets error on org fetch failure', async () => {
    mockOrgGet.mockRejectedValueOnce(new Error('Org not found'));

    const { result } = renderHook(() => useCreditBalance('my-org', 'org-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Org not found');
    expect(result.current.balance).toBeNull();
  });

  it('still returns balance when policy fetch fails', async () => {
    mockOrgGet.mockResolvedValueOnce({ credit_balance: 200 });
    mockListPolicies.mockRejectedValueOnce(new Error('Policy fetch failed'));

    const { result } = renderHook(() => useCreditBalance('my-org', 'org-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.balance).toBe(200);
    expect(result.current.error).toBeNull();
    expect(result.current.threshold).toBeNull();
  });
});

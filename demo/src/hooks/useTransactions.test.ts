import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/api', () => ({
  transactionsApi: { list: vi.fn() },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn() },
}));

import { useTransactions } from './useTransactions';
import { transactionsApi } from '@/api';

const mockList = vi.mocked(transactionsApi.list);

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state when organisation_id is provided', () => {
    mockList.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useTransactions({ organisation_id: 'org-1' }),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when organisation_id is missing', () => {
    const { result } = renderHook(() => useTransactions({}));
    expect(result.current.loading).toBe(false);
    expect(result.current.transactions).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('loads transactions on success', async () => {
    const mockTxs = [
      { id: 'tx-1', amount: '10', timestamp: '2025-01-01', source_type: 'purchase' },
      { id: 'tx-2', amount: '-3', timestamp: '2025-01-02', source_type: 'usage' },
    ];
    mockList.mockResolvedValue({ results: mockTxs });

    const { result } = renderHook(() =>
      useTransactions({ organisation_id: 'org-1', limit: 5 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.transactions[0].id).toBe('tx-1');
    expect(result.current.error).toBeNull();
  });

  it('passes correct params to API', async () => {
    mockList.mockResolvedValue({ results: [] });

    renderHook(() =>
      useTransactions({ organisation_id: 'org-42', limit: 10 }),
    );

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(mockList).toHaveBeenCalledWith(
      { organizationId: 'org-42' },
      expect.objectContaining({ pageSize: 10 }),
    );
  });

  it('handles API error', async () => {
    mockList.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() =>
      useTransactions({ organisation_id: 'org-1' }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Server error');
  });

  it('defaults limit to 5', async () => {
    mockList.mockResolvedValue({ results: [] });

    renderHook(() => useTransactions({ organisation_id: 'org-1' }));

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(mockList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pageSize: 5 }),
    );
  });
});

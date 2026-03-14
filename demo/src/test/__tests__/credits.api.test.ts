/**
 * Tests for creditsApi and transactionsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { creditsApi, transactionsApi } from '@/api';
import { buildCreditsBalance } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('creditsApi', () => {
  it('getBalance() returns organisation balance', async () => {
    const balance = buildCreditsBalance({ total_credits: 100, remaining_credits: 75 });
    mockApiResponse('/api/v1/credits/', balance);

    const result = await creditsApi.getBalance({ organisationId: 'org-123' });
    expect(result.total_credits).toBe(100);
    expect(result.remaining_credits).toBe(75);
  });

  it('getMyBalance() returns user balance', async () => {
    mockApiResponse('/api/v1/credits/me/', { user_id: 1, username: 'test', used_credits: 50 });

    const result = await creditsApi.getMyBalance({ organisationId: 'org-123' });
    expect(result.used_credits).toBe(50);
  });

  it('getProjectBalance() returns project balance', async () => {
    mockApiResponse('/api/v1/credits/projects/42/', { project_id: 42, allocated: 30 });

    const result = await creditsApi.getProjectBalance(42);
    expect(result.project_id).toBe(42);
  });
});

describe('transactionsApi', () => {
  it('list() returns paginated transactions', async () => {
    mockApiList('/api/v1/transactions/transactions/', [
      { id: 't-1', amount: 10, direction: 'debit' },
    ]);

    const result = await transactionsApi.list();
    expect(result.results).toHaveLength(1);
  });

  it('create() posts new transaction', async () => {
    mockApiResponse('/api/v1/transactions/transactions/', { id: 2, amount: '5' }, 'POST');

    const result = await transactionsApi.create({ amount: '5' });
    expect(result.amount).toBe('5');
  });
});

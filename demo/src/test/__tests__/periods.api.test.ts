/**
 * Tests for periodsApi.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installFetchMock, restoreFetch, mockApiResponse, mockApiList, mockApiError } from '../api-mock';
import { periodsApi } from '../../api';
import { buildPeriod } from '../factories';

beforeEach(() => installFetchMock());
afterEach(() => restoreFetch());

describe('periodsApi', () => {
  it('list() returns paginated periods', async () => {
    const items = [buildPeriod(), buildPeriod()];
    mockApiList('/api/v1/periods/', items);

    const result = await periodsApi.list();
    expect(result.results).toHaveLength(2);
  });

  it('list() filters by project and type', async () => {
    mockApiList('/api/v1/periods/', [buildPeriod({ period_type: 'season' })]);

    const result = await periodsApi.list({ projectId: 5, periodType: 'season' });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].period_type).toBe('season');
  });

  it('get() returns single period', async () => {
    const { data: _, ...period } = buildPeriod({ name: 'Season 2024/25' });
    mockApiResponse(`/api/v1/periods/${period.id}/`, period);

    const result = await periodsApi.get(period.id);
    expect(result.id).toBe(period.id);
    expect(result.name).toBe('Season 2024/25');
  });

  it('create() posts new period', async () => {
    const { data: _, ...created } = buildPeriod({ name: 'Competition A' });
    mockApiResponse(/\/api\/v1\/periods\//, created, 'POST');

    const result = await periodsApi.create({ name: 'Competition A', period_type: 'competition' });
    expect(result.name).toBe('Competition A');
  });

  it('listChildren() returns child periods', async () => {
    const children = [buildPeriod({ period_type: 'competition' })];
    mockApiList('/api/v1/periods/p-123/children/', children);

    const result = await periodsApi.listChildren('p-123');
    expect(result.results).toHaveLength(1);
  });
});
